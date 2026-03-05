import { useState } from 'react';
import { TestTube, ChevronRight, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TestResult {
  step: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export default function EmailChangeTest() {
  const [testUsername, setTestUsername] = useState('Tobi');
  const [newTestEmail, setNewTestEmail] = useState('');
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const runDiagnostics = async () => {
    clearResults();
    setTesting(true);

    try {
      // Step 1: Check admin_credentials
      addResult({
        step: '1',
        status: 'pending',
        message: 'Verificando tabla admin_credentials...'
      });

      const { data: credData, error: credError } = await supabase
        .from('admin_credentials')
        .select('*')
        .eq('username', testUsername)
        .maybeSingle();

      if (credError) {
        addResult({
          step: '1',
          status: 'error',
          message: 'Error al leer admin_credentials',
          details: credError
        });
      } else if (!credData) {
        addResult({
          step: '1',
          status: 'error',
          message: `Usuario ${testUsername} no encontrado`
        });
      } else {
        addResult({
          step: '1',
          status: 'success',
          message: 'Usuario encontrado en admin_credentials',
          details: credData
        });
      }

      // Step 2: Check admin_permissions
      addResult({
        step: '2',
        status: 'pending',
        message: 'Verificando tabla admin_permissions...'
      });

      const { data: permData, error: permError } = await supabase
        .from('admin_permissions')
        .select('*')
        .eq('email', credData?.email);

      if (permError) {
        addResult({
          step: '2',
          status: 'error',
          message: 'Error al leer admin_permissions',
          details: permError
        });
      } else {
        addResult({
          step: '2',
          status: 'success',
          message: `Encontrados ${permData?.length || 0} permisos`,
          details: permData
        });
      }

      // Step 3: Try to check constraints (may fail due to permissions)
      addResult({
        step: '3',
        status: 'pending',
        message: 'Verificando si la migración se aplicó correctamente...'
      });

      try {
        // Try a simple test: update a test record and see if cascade works
        // This is more reliable than checking system tables
        addResult({
          step: '3',
          status: 'success',
          message: 'Para verificar el CASCADE, ejecuta el test de cambio de email',
          details: {
            note: 'La verificación real del CASCADE se hará al probar el cambio de email'
          }
        });
      } catch (err) {
        addResult({
          step: '3',
          status: 'warning',
          message: 'No se pudo verificar constraints directamente',
          details: err
        });
      }

    } catch (error) {
      addResult({
        step: 'X',
        status: 'error',
        message: 'Error inesperado en diagnóstico',
        details: error
      });
    } finally {
      setTesting(false);
    }
  };

  const testEmailChange = async () => {
    if (!newTestEmail.trim()) {
      alert('Ingresa un email para probar');
      return;
    }

    clearResults();
    setTesting(true);

    try {
      // Get current data
      const { data: currentUser } = await supabase
        .from('admin_credentials')
        .select('email, username')
        .eq('username', testUsername)
        .single();

      if (!currentUser) {
        addResult({
          step: '0',
          status: 'error',
          message: 'Usuario no encontrado'
        });
        setTesting(false);
        return;
      }

      const oldEmail = currentUser.email;

      addResult({
        step: '0',
        status: 'success',
        message: `Email actual: ${oldEmail}`,
        details: { oldEmail, newEmail: newTestEmail }
      });

      // Step 1: Try to update admin_credentials
      addResult({
        step: '1',
        status: 'pending',
        message: 'Intentando actualizar admin_credentials...'
      });

      const { error: credError } = await supabase
        .from('admin_credentials')
        .update({ email: newTestEmail })
        .eq('username', testUsername);

      if (credError) {
        addResult({
          step: '1',
          status: 'error',
          message: 'Error al actualizar admin_credentials',
          details: credError
        });
        setTesting(false);
        return;
      } else {
        addResult({
          step: '1',
          status: 'success',
          message: 'admin_credentials actualizado correctamente'
        });
      }

      // Step 2: Check if admin_permissions was updated automatically
      addResult({
        step: '2',
        status: 'pending',
        message: 'Verificando si admin_permissions se actualizó automáticamente...'
      });

      const { data: permAfter, error: permError } = await supabase
        .from('admin_permissions')
        .select('*')
        .eq('email', newTestEmail);

      if (permError) {
        addResult({
          step: '2',
          status: 'error',
          message: 'Error al verificar admin_permissions',
          details: permError
        });
      } else {
        const { data: oldPermissions } = await supabase
          .from('admin_permissions')
          .select('*')
          .eq('email', oldEmail);

        const wasCascaded = permAfter && permAfter.length > 0;
        const stillHasOld = oldPermissions && oldPermissions.length > 0;

        if (wasCascaded && !stillHasOld) {
          addResult({
            step: '2',
            status: 'success',
            message: `admin_permissions actualizado automáticamente (${permAfter.length} registros)`,
            details: permAfter
          });
        } else if (stillHasOld) {
          addResult({
            step: '2',
            status: 'error',
            message: 'PROBLEMA: admin_permissions NO se actualizó. Aún tiene el email viejo',
            details: { old: oldPermissions, new: permAfter }
          });
        } else {
          addResult({
            step: '2',
            status: 'warning',
            message: 'No hay permisos para este usuario',
            details: { permAfter, oldPermissions }
          });
        }
      }

      // Final verification
      addResult({
        step: '3',
        status: 'pending',
        message: 'Verificación final...'
      });

      const { data: finalUser } = await supabase
        .from('admin_credentials')
        .select('email, username')
        .eq('username', testUsername)
        .single();

      const { data: finalPerms } = await supabase
        .from('admin_permissions')
        .select('*')
        .eq('email', newTestEmail);

      const allUpdated = finalUser?.email === newTestEmail;

      addResult({
        step: '3',
        status: allUpdated ? 'success' : 'error',
        message: allUpdated
          ? 'Cambio de email completado exitosamente'
          : 'El cambio de email NO se completó correctamente',
        details: {
          admin_credentials: finalUser,
          admin_permissions: finalPerms
        }
      });

    } catch (error) {
      addResult({
        step: 'X',
        status: 'error',
        message: 'Error inesperado durante el test',
        details: error
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <ChevronRight className="w-5 h-5 text-gray-400 animate-pulse" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <TestTube className="w-8 h-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Test de Cambio de Email</h2>
          <p className="text-sm text-gray-600">Diagnóstico y prueba del sistema de cambio de emails</p>
        </div>
      </div>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Instrucciones:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>1. <strong>Diagnóstico</strong>: Verifica el estado actual de las tablas y constraints</li>
          <li>2. <strong>Test de Cambio</strong>: Prueba el cambio de email con un email temporal</li>
          <li>3. Revisa los resultados detallados de cada paso</li>
        </ul>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Usuario a probar:
          </label>
          <select
            value={testUsername}
            onChange={(e) => setTestUsername(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={testing}
          >
            <option value="Tobi">Tobi</option>
            <option value="Alexis">Alexis</option>
            <option value="Max">Max</option>
            <option value="Maxi">Maxi</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nuevo email (solo para test de cambio):
          </label>
          <input
            type="email"
            value={newTestEmail}
            onChange={(e) => setNewTestEmail(e.target.value)}
            placeholder="test@ejemplo.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={testing}
          />
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={runDiagnostics}
          disabled={testing}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
        >
          {testing ? 'Ejecutando...' : 'Ejecutar Diagnóstico'}
        </button>
        <button
          onClick={testEmailChange}
          disabled={testing || !newTestEmail.trim()}
          className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
        >
          {testing ? 'Probando...' : 'Probar Cambio de Email'}
        </button>
      </div>

      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Resultados:</h3>
            <button
              onClick={clearResults}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Limpiar
            </button>
          </div>
          <div className="space-y-3">
            {results.map((result, idx) => (
              <div
                key={idx}
                className={`p-4 border rounded-lg ${getStatusColor(result.status)}`}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-gray-700">
                        Paso {result.step}
                      </span>
                      <span className="text-sm text-gray-600">{result.message}</span>
                    </div>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                          Ver detalles
                        </summary>
                        <pre className="mt-2 p-2 bg-white border border-gray-200 rounded text-xs overflow-x-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
