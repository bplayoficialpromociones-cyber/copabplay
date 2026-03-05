import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, X, CheckCircle, AlertCircle, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TaskUser {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

export default function TaskUsersManagement() {
  const [usuarios, setUsuarios] = useState<TaskUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<TaskUser | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    clave: '',
    activo: true
  });

  useEffect(() => {
    fetchUsuarios();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setUsuarios(data || []);
    } catch (error) {
      console.error('Error fetching usuarios:', error);
      showNotification('error', 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
  };

  const openModal = (user?: TaskUser) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        nombre: user.nombre,
        email: user.email || '',
        clave: '', // No mostrar la clave por seguridad
        activo: user.activo
      });
    } else {
      setEditingUser(null);
      setFormData({
        nombre: '',
        email: '',
        clave: '',
        activo: true
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      nombre: '',
      email: '',
      clave: '',
      activo: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      showNotification('error', 'El nombre es requerido');
      return;
    }

    if (!formData.email.trim()) {
      showNotification('error', 'El email es requerido');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showNotification('error', 'El formato del email no es válido');
      return;
    }

    // Validar clave solo al crear o si se está cambiando
    if (!editingUser && !formData.clave.trim()) {
      showNotification('error', 'La clave es requerida');
      return;
    }

    if (formData.clave && formData.clave.length < 6) {
      showNotification('error', 'La clave debe tener al menos 6 caracteres');
      return;
    }

    try {
      if (editingUser) {
        // Preparar datos de actualización
        const updateData: any = {
          nombre: formData.nombre.trim(),
          email: formData.email.trim().toLowerCase(),
          activo: formData.activo
        };

        // Solo actualizar la clave si se ingresó una nueva
        if (formData.clave.trim()) {
          updateData.clave = formData.clave;
        }

        const { error } = await supabase
          .from('usuarios')
          .update(updateData)
          .eq('id', editingUser.id);

        if (error) throw error;

        // Si cambió el nombre, actualizar usuarios_emails
        if (formData.nombre !== editingUser.nombre) {
          await supabase
            .from('usuarios_emails')
            .update({ usuario: formData.nombre.trim() })
            .eq('usuario', editingUser.nombre);
        }

        showNotification('success', 'Usuario actualizado correctamente');
      } else {
        const { error } = await supabase
          .from('usuarios')
          .insert([{
            nombre: formData.nombre.trim(),
            email: formData.email.trim().toLowerCase(),
            clave: formData.clave,
            activo: formData.activo
          }]);

        if (error) throw error;
        showNotification('success', 'Usuario creado correctamente');
      }

      await fetchUsuarios();
      closeModal();
    } catch (error: any) {
      console.error('Error saving usuario:', error);
      if (error.code === '23505') {
        if (error.message.includes('email')) {
          showNotification('error', 'Ya existe un usuario con ese email');
        } else {
          showNotification('error', 'Ya existe un usuario con ese nombre');
        }
      } else {
        showNotification('error', 'Error al guardar el usuario');
      }
    }
  };

  const handleDelete = async (user: TaskUser) => {
    if (!window.confirm(`¿Estás seguro de eliminar al usuario "${user.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', user.id);

      if (error) throw error;

      showNotification('success', 'Usuario eliminado correctamente');
      await fetchUsuarios();
    } catch (error: any) {
      console.error('Error deleting usuario:', error);
      if (error.code === '23503') {
        showNotification('error', 'No se puede eliminar el usuario porque tiene tareas o comentarios asociados');
      } else {
        showNotification('error', 'Error al eliminar el usuario');
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Cargando usuarios...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios de Tareas</h2>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Usuario
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Fecha Creación</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {usuarios.map((usuario) => (
                <tr key={usuario.id} className={usuario.activo ? '' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{usuario.nombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{usuario.email || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      usuario.activo ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'
                    }`}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {new Date(usuario.created_at).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal(usuario)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(usuario)}
                        className="text-red-600 hover:text-red-800"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {usuarios.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No hay usuarios registrados
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nombre del usuario"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clave {editingUser ? '(dejar en blanco para mantener la actual)' : '*'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.clave}
                  onChange={(e) => setFormData({ ...formData, clave: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={editingUser ? 'Nueva clave (opcional)' : 'Mínimo 6 caracteres'}
                  minLength={6}
                />
                <p className="mt-1 text-xs text-gray-500">
                  La clave debe tener al menos 6 caracteres
                </p>
              </div>

              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Usuario activo
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Save className="w-4 h-4" />
                  {editingUser ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 hover:opacity-80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
