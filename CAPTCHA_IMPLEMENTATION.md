# Implementación del CAPTCHA - Copa bplay Admin

## Resumen General

El CAPTCHA utilizado en https://copabplay.com.ar/admin es un **CAPTCHA generado completamente en el cliente (frontend)** usando Canvas API. No requiere backend ni base de datos.

---

## Tarea 1: Código Completo del CAPTCHA

### Características del CAPTCHA:
- Genera un código alfanumérico de 6 caracteres
- Utiliza Canvas API para dibujar el CAPTCHA con efectos visuales
- Incluye líneas de ruido, puntos aleatorios y caracteres rotados
- Botón de regeneración para obtener un nuevo código
- Validación case-insensitive (no distingue mayúsculas/minúsculas)

---

## Tarea 2: Componente React que muestra el CAPTCHA

**Archivo:** `src/components/Login.tsx`

**Código del componente:**

```tsx
import { useState, useEffect, useRef } from 'react';
import { Lock, User, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaValue, setCaptchaValue] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let captcha = '';
    for (let i = 0; i < 6; i++) {
      captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaValue(captcha);
    setCaptchaInput('');
    setCaptchaError(false);
    setTimeout(() => drawCaptcha(captcha), 10);
  };

  const drawCaptcha = (text: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Líneas de ruido
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(${Math.random() * 100}, ${Math.random() * 100}, ${Math.random() * 100}, 0.3)`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // Puntos aleatorios
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.2)`;
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
    }

    // Texto del CAPTCHA
    ctx.font = 'bold 40px Arial';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const x = 20 + i * 35;
      const y = canvas.height / 2;
      const rotation = (Math.random() - 0.5) * 0.4;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);

      const gradient = ctx.createLinearGradient(0, -20, 0, 20);
      gradient.addColorStop(0, `rgb(${Math.random() * 100}, ${Math.random() * 100}, ${Math.random() * 100})`);
      gradient.addColorStop(1, `rgb(${Math.random() * 100}, ${Math.random() * 100}, ${Math.random() * 100})`);
      ctx.fillStyle = gradient;

      ctx.fillText(char, 0, 0);
      ctx.restore();
    }

    // Líneas onduladas
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(${Math.random() * 100}, ${Math.random() * 100}, ${Math.random() * 100}, 0.4)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const startY = Math.random() * canvas.height;
      ctx.moveTo(0, startY);
      for (let x = 0; x < canvas.width; x += 5) {
        ctx.lineTo(x, startY + Math.sin(x / 20) * 10);
      }
      ctx.stroke();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCaptchaError(false);

    // Validar CAPTCHA
    if (captchaInput.toLowerCase() !== captchaValue.toLowerCase()) {
      setCaptchaError(true);
      setError('Código de seguridad incorrecto');
      generateCaptcha();
      return;
    }

    setLoading(true);

    try {
      const { data: validationData, error: validationError } = await supabase
        .rpc('verify_admin_password', {
          input_username: username,
          input_password: password
        });

      if (validationError) {
        console.error('Validation error:', validationError);
        setError('Error al verificar credenciales. Por favor intente nuevamente.');
        generateCaptcha();
      } else if (validationData === true) {
        localStorage.setItem('admin_logged_in', 'true');
        localStorage.setItem('admin_username', username);
        onLoginSuccess();
      } else {
        setError('Usuario o contraseña incorrectos');
        generateCaptcha();
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Error al iniciar sesión. Por favor intente nuevamente.');
      generateCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Lock className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Panel de Administración</h1>
          <p className="text-gray-600">Copa bplay - Iniciar Sesión</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Usuario
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ingrese su usuario"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ingrese su contraseña"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-50 rounded-r-lg transition-colors"
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="captcha" className="block text-sm font-medium text-gray-700 mb-2">
              Código de Seguridad
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <canvas
                  ref={canvasRef}
                  width="240"
                  height="80"
                  className={`border-2 rounded-lg ${captchaError ? 'border-red-300' : 'border-gray-300'}`}
                />
                <button
                  type="button"
                  onClick={generateCaptcha}
                  className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Generar nuevo código"
                >
                  <RefreshCw className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <input
                id="captcha"
                type="text"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                className={`block w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  captchaError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Ingrese el código de seguridad"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Volver al ranking
          </a>
        </div>
      </div>
    </div>
  );
}
```

---

## Tarea 3: Función Backend que genera el CAPTCHA

**IMPORTANTE:** Este CAPTCHA **NO utiliza función backend**. La generación del CAPTCHA es completamente del lado del cliente (frontend).

### Cómo funciona:

1. **Generación del código:**
   - Se ejecuta en el navegador usando JavaScript
   - Función: `generateCaptcha()` (líneas 24-34 del componente Login.tsx)
   - Genera un string aleatorio de 6 caracteres

2. **Renderizado visual:**
   - Se usa Canvas API del navegador
   - Función: `drawCaptcha(text: string)` (líneas 36-94 del componente Login.tsx)
   - Dibuja el texto con efectos visuales (rotación, gradientes, ruido)

3. **Validación:**
   - Se valida en el cliente antes de enviar las credenciales al servidor
   - Comparación case-insensitive del input del usuario con el valor generado
   - Si el CAPTCHA es incorrecto, no se envía la petición de login al backend

**No hay Edge Function ni función RPC de Supabase para el CAPTCHA.**

---

## Tarea 4: Estructura de la tabla en la base de datos

**IMPORTANTE:** Este CAPTCHA **NO utiliza base de datos**.

### Por qué no hay tabla:

- El CAPTCHA es generado y validado completamente en el cliente
- No se almacena ninguna sesión de CAPTCHA en la base de datos
- La validación ocurre antes de la autenticación del usuario
- No existe tabla `captcha_sessions` ni ninguna tabla relacionada

### Ventajas de este enfoque:

✅ No requiere llamadas al backend para generar el CAPTCHA
✅ Respuesta instantánea al usuario
✅ No consume recursos del servidor
✅ Más simple de implementar y mantener

### Desventajas:

❌ La validación del CAPTCHA ocurre en el cliente (puede ser manipulada)
❌ No es tan seguro como un CAPTCHA validado en el servidor
❌ No protege contra bots sofisticados

---

## Dependencias necesarias:

### React:
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1"
}
```

### Iconos (lucide-react):
```json
{
  "lucide-react": "^0.344.0"
}
```

### TypeScript:
```json
{
  "typescript": "^5.5.3",
  "@types/react": "^18.3.5",
  "@types/react-dom": "^18.3.0"
}
```

---

## Cómo implementar en otro proyecto:

1. Copiar el código del componente Login.tsx
2. Ajustar las importaciones según tu estructura de proyecto
3. Instalar las dependencias necesarias (react, lucide-react)
4. Personalizar los estilos según tu diseño
5. Ajustar la lógica de autenticación (la parte del `handleLogin`)

---

## Notas adicionales:

- El CAPTCHA se regenera automáticamente después de cada intento fallido
- Los caracteres excluidos son: I, O, 0, 1, l (para evitar confusión)
- El canvas tiene dimensiones fijas: 240x80 píxeles
- La validación es case-insensitive para mejor UX

---

## Si necesitas un CAPTCHA con validación del servidor:

Si en tu otro proyecto necesitas un CAPTCHA más seguro con validación del servidor, necesitarías:

1. **Tabla en la base de datos:**
```sql
CREATE TABLE captcha_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  captcha_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '5 minutes'),
  used BOOLEAN DEFAULT false
);

-- Índice para limpieza automática
CREATE INDEX idx_captcha_expires ON captcha_sessions(expires_at);
```

2. **Edge Function para generar CAPTCHA:**
   - Generar el código aleatorio en el servidor
   - Crear una imagen del CAPTCHA
   - Guardar el valor en la tabla con un token de sesión
   - Retornar la imagen y el token al cliente

3. **Edge Function para validar CAPTCHA:**
   - Recibir el token de sesión y el valor ingresado
   - Validar contra la base de datos
   - Marcar como usado o eliminar la sesión

Pero el sistema actual de Copa bplay NO usa este enfoque.
