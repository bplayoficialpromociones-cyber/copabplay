import { useState, useEffect } from 'react';
import { Search, RefreshCw, CheckCircle, XCircle, Clock, Mail, FileText, X, Settings, Save, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BotSubmission {
  id: string;
  potential_client_id: string;
  nombre: string;
  apellido: string;
  dni: string;
  provincia: string;
  email: string;
  cuenta_bplay: string;
  status: 'pending' | 'success' | 'error';
  error_message: string | null;
  ticket_subject: string;
  ticket_description: string;
  notification_sent: boolean;
  created_at: string;
  processed_at: string | null;
}

interface BotConfig {
  id: string;
  config_key: string;
  config_value: string;
  description: string;
  step_number: number;
  is_active: boolean;
  updated_at: string;
}

export function BotSubmissionsManagement() {
  const [submissions, setSubmissions] = useState<BotSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<BotSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<BotSubmission | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [botConfig, setBotConfig] = useState<BotConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<{ [key: string]: string }>({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [showConfigSection, setShowConfigSection] = useState(true);

  const ITEMS_PER_PAGE = 20;

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bot_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setSubmissions(data);
        setFilteredSubmissions(data);
      }
    } catch (error) {
      console.error('Error fetching bot submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBotConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('bot_configuration')
        .select('*')
        .order('step_number', { ascending: true });

      if (error) throw error;
      if (data) {
        setBotConfig(data);
        const initialEditing: { [key: string]: string } = {};
        data.forEach(config => {
          initialEditing[config.config_key] = config.config_value;
        });
        setEditingConfig(initialEditing);
      }
    } catch (error) {
      console.error('Error fetching bot config:', error);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    fetchBotConfig();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredSubmissions(submissions);
    } else {
      const filtered = submissions.filter((sub) =>
        sub.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.dni.includes(searchTerm) ||
        sub.provincia.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.cuenta_bplay.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSubmissions(filtered);
    }
    setCurrentPage(1);
  }, [searchTerm, submissions]);

  const handleConfigChange = (key: string, value: string) => {
    setEditingConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveConfiguration = async () => {
    try {
      setSavingConfig(true);

      for (const config of botConfig) {
        const newValue = editingConfig[config.config_key];
        if (newValue !== config.config_value) {
          const { error } = await supabase
            .from('bot_configuration')
            .update({ config_value: newValue })
            .eq('config_key', config.config_key);

          if (error) throw error;
        }
      }

      await fetchBotConfig();
      alert('✓ Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSavingConfig(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
            <CheckCircle size={16} />
            Enviado con éxito
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
            <XCircle size={16} />
            Error de Envío
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold">
            <Clock size={16} />
            Pendiente
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openDetailsModal = (submission: BotSubmission) => {
    setSelectedSubmission(submission);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedSubmission(null);
  };

  const groupedConfig = botConfig.reduce((acc, config) => {
    if (!acc[config.step_number]) {
      acc[config.step_number] = [];
    }
    acc[config.step_number].push(config);
    return acc;
  }, {} as { [key: number]: BotConfig[] });

  const stepTitles: { [key: number]: string } = {
    1: 'Paso 1: Acceso al Formulario de Bplay',
    2: 'Paso 2: Selección del Tipo de Problema',
    3: 'Paso 3: Email de Notificaciones',
    4: 'Paso 4: Dato a Solicitar',
    5: 'Paso 5: Afiliador',
    6: 'Paso 6: Formato del Asunto del Ticket',
    7: 'Paso 7: Formato de la Descripción del Ticket',
    9: 'Paso 9: Configuración de Emails de Notificación'
  };

  const totalPages = Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentSubmissions = filteredSubmissions.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Envíos del Bot a Bplay</h2>
          <p className="text-gray-600 mt-1">Registro de todos los tickets enviados automáticamente</p>
        </div>
        <button
          onClick={fetchSubmissions}
          disabled={loading}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <Search className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-700">Filtrar Envíos</h3>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-12 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
            placeholder="Buscar por nombre, apellido, DNI, provincia, email, cuenta Bplay o estado..."
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-100 rounded-r-lg transition-colors"
              title="Limpiar búsqueda"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        {searchTerm && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <p className="text-sm text-green-700 font-medium">
                ✓ Mostrando {filteredSubmissions.length} de {submissions.length} envíos
              </p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando envíos...</p>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {searchTerm ? 'No se encontraron envíos que coincidan con la búsqueda' : 'No hay envíos registrados'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left p-3 font-semibold text-gray-700">Fecha/Hora</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Nombre</th>
                  <th className="text-left p-3 font-semibold text-gray-700">DNI</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Provincia</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Email</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Cuenta Bplay</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Estado</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentSubmissions.map((submission) => (
                  <tr key={submission.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 text-sm text-gray-600">
                      {formatDate(submission.created_at)}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-gray-900">
                        {submission.nombre} {submission.apellido}
                      </div>
                    </td>
                    <td className="p-3 text-sm text-gray-600 font-mono">{submission.dni}</td>
                    <td className="p-3 text-sm text-gray-600">{submission.provincia}</td>
                    <td className="p-3 text-sm text-gray-600">{submission.email}</td>
                    <td className="p-3 text-sm text-gray-600">{submission.cuenta_bplay}</td>
                    <td className="p-3">{getStatusBadge(submission.status)}</td>
                    <td className="p-3">
                      <button
                        onClick={() => openDetailsModal(submission)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        <FileText size={16} />
                        Ver Detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t-2 border-gray-200">
              <div className="text-sm text-gray-600">
                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredSubmissions.length)} de {filteredSubmissions.length} envíos
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded bg-white border-2 border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-3 py-1 rounded ${
                          currentPage === pageNum
                            ? 'bg-green-600 text-white'
                            : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-100'
                        } transition-colors`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded bg-white border-2 border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-xl font-bold text-gray-800">Configuración del Bot</h3>
              <p className="text-sm text-gray-600">Edita los pasos y plantillas que el bot utiliza para enviar los tickets</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowConfigSection(!showConfigSection)}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              {showConfigSection ? 'Ocultar' : 'Mostrar'}
            </button>
            <button
              onClick={saveConfiguration}
              disabled={savingConfig}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingConfig ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>

        {showConfigSection && (
          <div className="space-y-6">
            {Object.entries(groupedConfig).map(([stepNum, configs]) => (
              <div key={stepNum} className="bg-white rounded-lg border border-blue-200 p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-blue-100">
                  <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                    {stepNum}
                  </div>
                  <h4 className="text-lg font-bold text-gray-800">{stepTitles[parseInt(stepNum)]}</h4>
                </div>

                <div className="space-y-4">
                  {configs.map((config) => (
                    <div key={config.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start gap-3 mb-3">
                        <Edit2 className="w-5 h-5 text-gray-500 mt-1" />
                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {config.description}
                          </label>

                          {config.config_key.includes('template') ? (
                            <textarea
                              value={editingConfig[config.config_key] || ''}
                              onChange={(e) => handleConfigChange(config.config_key, e.target.value)}
                              rows={8}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono text-sm"
                            />
                          ) : (
                            <input
                              type="text"
                              value={editingConfig[config.config_key] || ''}
                              onChange={(e) => handleConfigChange(config.config_key, e.target.value)}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                          )}

                          <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-xs text-blue-700">
                              <strong>Campo técnico:</strong> <code className="bg-blue-100 px-2 py-1 rounded">{config.config_key}</code>
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              <strong>Última actualización:</strong> {formatDate(config.updated_at)}
                            </p>
                          </div>

                          {config.config_key.includes('template') && (
                            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded p-3">
                              <p className="text-xs text-yellow-800 font-semibold mb-1">💡 Variables disponibles:</p>
                              <p className="text-xs text-yellow-700">
                                Las variables se reemplazan automáticamente con los datos del cliente.
                                Escribe las variables exactamente como se muestran: <code className="bg-yellow-100 px-1 rounded">{'{'}nombre{'}'}</code>, <code className="bg-yellow-100 px-1 rounded">{'{'}apellido{'}'}</code>, <code className="bg-yellow-100 px-1 rounded">{'{'}dni{'}'}</code>, <code className="bg-yellow-100 px-1 rounded">{'{'}provincia{'}'}</code>, <code className="bg-yellow-100 px-1 rounded">{'{'}email{'}'}</code>, <code className="bg-yellow-100 px-1 rounded">{'{'}cuenta_bplay{'}'}</code>, <code className="bg-yellow-100 px-1 rounded">{'{'}celular{'}'}</code>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <h4 className="font-bold text-yellow-800 mb-2">⚠️ Importante sobre el Paso 8</h4>
              <p className="text-sm text-yellow-700">
                <strong>Paso 8 (Envío del ticket):</strong> Este paso se ejecuta automáticamente. El bot toma toda la información configurada en los pasos anteriores y realiza el envío. No requiere configuración manual adicional.
              </p>
            </div>

            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
              <h4 className="font-bold text-green-800 mb-2">✓ Paso 10: Panel de Administración</h4>
              <p className="text-sm text-green-700">
                El panel que estás viendo ahora (la grilla de envíos arriba) es el Paso 10. Muestra todos los registros enviados por el bot con capacidad de búsqueda y vista de detalles.
              </p>
            </div>
          </div>
        )}
      </div>

      {showDetailsModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">Detalles del Envío</h3>
                <button
                  onClick={closeDetailsModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Nombre Completo</label>
                  <p className="text-gray-900">{selectedSubmission.nombre} {selectedSubmission.apellido}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">DNI</label>
                  <p className="text-gray-900 font-mono">{selectedSubmission.dni}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Provincia</label>
                  <p className="text-gray-900">{selectedSubmission.provincia}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Email</label>
                  <p className="text-gray-900">{selectedSubmission.email}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Cuenta Bplay</label>
                  <p className="text-gray-900">{selectedSubmission.cuenta_bplay}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Estado</label>
                  <div className="mt-1">{getStatusBadge(selectedSubmission.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Fecha de Creación</label>
                  <p className="text-gray-900">{formatDate(selectedSubmission.created_at)}</p>
                </div>
                {selectedSubmission.processed_at && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Fecha de Procesamiento</label>
                    <p className="text-gray-900">{formatDate(selectedSubmission.processed_at)}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                  <Mail size={16} />
                  Notificación Enviada
                </label>
                <p className="text-gray-900">
                  {selectedSubmission.notification_sent ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle size={16} />
                      Sí
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center gap-1">
                      <XCircle size={16} />
                      No
                    </span>
                  )}
                </p>
              </div>

              {selectedSubmission.error_message && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <label className="text-sm font-semibold text-red-700 flex items-center gap-2">
                    <XCircle size={16} />
                    Mensaje de Error
                  </label>
                  <p className="text-red-600 mt-2">{selectedSubmission.error_message}</p>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <label className="text-sm font-semibold text-gray-600 mb-2 block">Asunto del Ticket</label>
                <p className="text-gray-900 font-medium">{selectedSubmission.ticket_subject}</p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <label className="text-sm font-semibold text-gray-600 mb-2 block">Descripción del Ticket</label>
                <pre className="text-gray-900 whitespace-pre-wrap text-sm font-mono bg-white p-3 rounded border border-gray-200">
                  {selectedSubmission.ticket_description}
                </pre>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={closeDetailsModal}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
