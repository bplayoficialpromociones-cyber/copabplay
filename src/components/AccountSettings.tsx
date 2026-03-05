import { useState, useEffect } from 'react';
import { Save, Lock, Eye, EyeOff, Mail, User, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AccountSettings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loggedInUser = localStorage.getItem('admin_username') || '';

  useEffect(() => {
    if (!loggedInUser) return;
    supabase
      .from('admin_credentials')
      .select('email')
      .eq('username', loggedInUser)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setUserEmail(data.email || '');
        }
      });
  }, [loggedInUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setProgress(0);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (userEmail && !emailRegex.test(userEmail)) {
      setError('El email no es válido');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Las nuevas contraseñas no coinciden');
        return;
      }
      if (!currentPassword) {
        setError('Ingresá tu contraseña actual para cambiarla');
        return;
      }
    }

    setLoading(true);
    setProgress(10);

    try {
      if (newPassword && currentPassword) {
        setProgress(30);

        const { data: updateResult, error: updateError } = await supabase.rpc('update_admin_password', {
          input_username: loggedInUser,
          old_password: currentPassword,
          new_password: newPassword
        });

        if (updateError) throw updateError;

        if (!updateResult) {
          setError('La contraseña actual es incorrecta');
          setLoading(false);
          setProgress(0);
          return;
        }

        setProgress(60);
      } else {
        setProgress(50);
      }

      const { error: emailError } = await supabase
        .from('admin_credentials')
        .update({ email: userEmail.trim() })
        .eq('username', loggedInUser);

      if (emailError) throw emailError;

      setProgress(100);

      setTimeout(() => {
        setSuccess('Cambios guardados exitosamente.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setLoading(false);
        setTimeout(() => setProgress(0), 1500);
      }, 400);

    } catch (err: any) {
      console.error('Error saving account settings:', err);
      setError(err?.message || 'Error al guardar los cambios');
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Configuración de Cuenta</h2>
        <p className="text-gray-600 mt-1">Actualizá tu contraseña y email de notificaciones</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            Usuario
          </label>
          <input
            type="text"
            value={loggedInUser}
            disabled
            className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">El nombre de usuario no se puede modificar</p>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-400" />
            Cambiar contraseña
            <span className="text-xs font-normal text-gray-400">(opcional)</span>
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña Actual
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pr-12"
                  placeholder="Ingresá tu contraseña actual"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pr-12"
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pr-12"
                  placeholder="Confirmá la nueva contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-400" />
            Email de notificaciones
          </label>
          <input
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="usuario@ejemplo.com"
          />
        </div>

        {loading && progress > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Guardando cambios...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 font-semibold"
        >
          <Save className="w-5 h-5" />
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-900 mb-1">Importante:</p>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• La contraseña debe tener al menos 8 caracteres</li>
            <li>• Guarda tus nuevas credenciales en un lugar seguro</li>
            <li>• El email se usa para recibir notificaciones de tareas asignadas</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
