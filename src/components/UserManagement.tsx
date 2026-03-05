import { useState, useEffect } from 'react';
import { Users, Save, Key, Shield, CheckSquare, X, Mail, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface User {
  username: string;
  email: string;
  role: 'super_admin' | 'editor';
  activo: boolean;
}

interface UserPermission {
  email: string;
  seccion: string;
}

const AVAILABLE_SECTIONS = [
  { id: 'overview', label: 'Dashboard' },
  { id: 'rankings', label: 'Ranking' },
  { id: 'history', label: 'Historial Rankings' },
  { id: 'historical', label: 'Jugadores Históricos' },
  { id: 'giro', label: 'Jugadores Giro Ganador' },
  { id: 'audit', label: 'Fiscalizar Torneo' },
  { id: 'prizes', label: 'Premios' },
  { id: 'games', label: 'Juegos y Puntos' },
  { id: 'winner', label: 'Ganador del Mes' },
  { id: 'exchange', label: 'Tipo de Cambio' },
  { id: 'footer', label: 'Footer' },
  { id: 'content', label: 'Contenido' },
  { id: 'manufacturers', label: 'Landing Fabricantes' },
  { id: 'clients', label: 'Clientes Potenciales' },
  { id: 'bot', label: 'Envíos del Bot' },
  { id: 'tareas', label: 'Tareas' },
  { id: 'account', label: 'Configuración de Cuenta' },
];

interface UserManagementProps {
  currentUser: string;
}

export default function UserManagement({ currentUser }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [passwordModal, setPasswordModal] = useState<{ email: string; username: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [emailModal, setEmailModal] = useState<{ email: string; username: string } | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [createUserModal, setCreateUserModal] = useState(false);
  const [deleteUserModal, setDeleteUserModal] = useState<{ email: string; username: string } | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'editor' as 'super_admin' | 'editor',
    activo: true
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [currentUserRole, setCurrentUserRole] = useState<'super_admin' | 'editor' | null>(null);

  useEffect(() => {
    fetchUsersAndPermissions();
  }, [currentUser]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchUsersAndPermissions = async () => {
    try {
      setLoading(true);

      const { data: usersData, error: usersError } = await supabase
        .from('admin_credentials')
        .select('username, email, role, activo')
        .order('username');

      if (usersError) throw usersError;

      const { data: permissionsData, error: permissionsError } = await supabase
        .from('admin_permissions')
        .select('email, seccion');

      if (permissionsError) throw permissionsError;

      const currentUserData = usersData?.find(u => u.username === currentUser);
      if (currentUserData) {
        setCurrentUserRole(currentUserData.role);
      }

      setUsers(usersData || []);
      setPermissions(permissionsData || []);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching users:', error);
      setNotification({ type: 'error', message: 'Error al cargar usuarios' });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (email: string, newRole: 'super_admin' | 'editor') => {
    try {
      const { error } = await supabase
        .from('admin_credentials')
        .update({ role: newRole })
        .eq('email', email);

      if (error) throw error;

      setUsers(users.map(u => u.email === email ? { ...u, role: newRole } : u));
      setNotification({ type: 'success', message: 'Rol actualizado exitosamente' });
    } catch (error) {
      console.error('Error updating role:', error);
      setNotification({ type: 'error', message: 'Error al actualizar rol' });
    }
  };

  const toggleUserActive = async (username: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_credentials')
        .update({ activo: !currentStatus })
        .eq('username', username);

      if (error) throw error;

      setUsers(users.map(u => u.username === username ? { ...u, activo: !currentStatus } : u));
      setNotification({
        type: 'success',
        message: `Usuario ${!currentStatus ? 'activado' : 'desactivado'} exitosamente`
      });
    } catch (error) {
      console.error('Error toggling user active status:', error);
      setNotification({ type: 'error', message: 'Error al actualizar estado del usuario' });
    }
  };

  const togglePermission = async (email: string, seccionId: string) => {
    try {
      const hasPermission = permissions.some(
        p => p.email === email && p.seccion === seccionId
      );

      if (hasPermission) {
        const { error } = await supabase
          .from('admin_permissions')
          .delete()
          .eq('email', email)
          .eq('seccion', seccionId);

        if (error) throw error;

        setPermissions(permissions.filter(
          p => !(p.email === email && p.seccion === seccionId)
        ));
      } else {
        const { error } = await supabase
          .from('admin_permissions')
          .insert({ email, seccion: seccionId });

        if (error) throw error;

        setPermissions([...permissions, { email, seccion: seccionId }]);
      }
    } catch (error) {
      console.error('Error toggling permission:', error);
      setNotification({ type: 'error', message: 'Error al actualizar permiso' });
    }
  };

  const changePassword = async () => {
    if (!passwordModal || !newPassword.trim()) {
      setNotification({ type: 'error', message: 'La contraseña no puede estar vacía' });
      return;
    }

    if (newPassword.length < 6) {
      setNotification({ type: 'error', message: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase.rpc('admin_change_user_password', {
        p_username: passwordModal.username,
        p_new_password: newPassword
      });

      if (error) throw error;

      if (!data) {
        throw new Error('No se pudo actualizar la contraseña. Usuario no encontrado.');
      }

      setNotification({ type: 'success', message: 'Contraseña actualizada exitosamente' });
      setPasswordModal(null);
      setNewPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      setNotification({ type: 'error', message: error.message || 'Error al cambiar contraseña' });
    } finally {
      setSaving(false);
    }
  };

  const changeEmail = async () => {
    if (!emailModal || !newEmail.trim()) {
      setNotification({ type: 'error', message: 'El email no puede estar vacío' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setNotification({ type: 'error', message: 'Por favor ingresa un email válido' });
      return;
    }

    try {
      setSaving(true);

      const oldEmail = emailModal.email;

      const { error: credentialsError } = await supabase
        .from('admin_credentials')
        .update({ email: newEmail })
        .eq('username', emailModal.username);

      if (credentialsError) throw credentialsError;

      setUsers(users.map(u => u.username === emailModal.username ? { ...u, email: newEmail } : u));
      setPermissions(permissions.map(p => p.email === oldEmail ? { ...p, email: newEmail } : p));

      setNotification({ type: 'success', message: 'Email actualizado exitosamente' });
      setEmailModal(null);
      setNewEmail('');
    } catch (error) {
      console.error('Error changing email:', error);
      setNotification({ type: 'error', message: 'Error al cambiar email' });
    } finally {
      setSaving(false);
    }
  };

  const getUserPermissions = (email: string): string[] => {
    return permissions
      .filter(p => p.email === email)
      .map(p => p.seccion);
  };

  const handleCreateUser = async () => {
    if (!newUser.username.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      setNotification({ type: 'error', message: 'Todos los campos son requeridos' });
      return;
    }

    if (newUser.password.length < 6) {
      setNotification({ type: 'error', message: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email)) {
      setNotification({ type: 'error', message: 'El email no es válido' });
      return;
    }

    try {
      setSaving(true);

      const { data, error } = await supabase.rpc('create_admin_user', {
        input_username: newUser.username.trim(),
        input_email: newUser.email.trim().toLowerCase(),
        input_password: newUser.password,
        input_role: newUser.role,
        input_activo: newUser.activo
      });

      if (error) throw error;

      setNotification({ type: 'success', message: 'Usuario creado exitosamente' });
      setCreateUserModal(false);
      setNewUser({
        username: '',
        email: '',
        password: '',
        role: 'editor',
        activo: true
      });
      await fetchUsersAndPermissions();
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.message && error.message.includes('ya existe')) {
        setNotification({ type: 'error', message: 'Ya existe un usuario con ese nombre o email' });
      } else {
        setNotification({ type: 'error', message: 'Error al crear usuario: ' + (error.message || 'Error desconocido') });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserModal) return;

    try {
      setSaving(true);

      const { data, error } = await supabase
        .from('admin_credentials')
        .delete()
        .eq('email', deleteUserModal.email)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('No se pudo eliminar el usuario. Verifique los permisos.');
      }

      setNotification({ type: 'success', message: 'Usuario eliminado exitosamente' });
      setDeleteUserModal(null);
      await fetchUsersAndPermissions();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setNotification({ type: 'error', message: 'Error al eliminar usuario: ' + (error.message || 'Error desconocido') });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando usuarios...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-green-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h2>
            <p className="text-sm text-gray-600">Administra roles y permisos de usuarios</p>
          </div>
        </div>
        <button
          onClick={() => setCreateUserModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Usuario
        </button>
      </div>

      {notification && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            notification.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <p className="flex-1 font-medium">{notification.message}</p>
          <button
            onClick={() => setNotification(null)}
            className="text-current hover:opacity-70 transition-opacity"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {users.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No hay usuarios registrados</p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {users
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((user) => (
          <div key={user.email} className={`border border-gray-200 rounded-lg p-6 shadow-sm ${!user.activo ? 'bg-gray-50' : 'bg-white'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-bold text-gray-800">{user.username}</h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.activo ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'
                  }`}>
                    {user.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gray-600" />
                  <select
                    value={user.role}
                    onChange={(e) => updateUserRole(user.email, e.target.value as 'super_admin' | 'editor')}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="editor">Editor</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setEmailModal({ email: user.email, username: user.username });
                    setNewEmail(user.email);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  title="Cambiar email"
                >
                  <Mail className="w-4 h-4" />
                  Cambiar email
                </button>

                <button
                  onClick={() => setPasswordModal({ email: user.email, username: user.username })}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  title="Cambiar contraseña"
                >
                  <Key className="w-4 h-4" />
                  Cambiar contraseña
                </button>

                <button
                  onClick={() => toggleUserActive(user.username, user.activo)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    user.activo
                      ? 'bg-gray-600 text-white hover:bg-gray-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                  title={user.activo ? 'Desactivar usuario' : 'Activar usuario'}
                >
                  {user.activo ? (
                    <>
                      <XCircle className="w-4 h-4" />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Activar
                    </>
                  )}
                </button>

                {currentUserRole === 'super_admin' && user.username !== currentUser && (
                  <button
                    onClick={() => setDeleteUserModal({ email: user.email, username: user.username })}
                    className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    title="Eliminar usuario"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </button>
                )}
              </div>
            </div>

            {user.role === 'super_admin' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Super Admin: Acceso completo a todas las secciones
                </p>
              </div>
            )}

            {user.role === 'editor' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">
                    Permisos de Secciones:
                  </p>
                  <button
                    onClick={() => setSelectedUser(selectedUser === user.email ? null : user.email)}
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    {selectedUser === user.email ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>

                {selectedUser === user.email && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-3">
                      {AVAILABLE_SECTIONS.map((section) => {
                        const hasPermission = getUserPermissions(user.email).includes(section.id);
                        return (
                          <label
                            key={section.id}
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={hasPermission}
                              onChange={() => togglePermission(user.email, section.id)}
                              className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-700">{section.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedUser !== user.email && (
                  <div className="text-sm text-gray-600">
                    {getUserPermissions(user.email).length} sección(es) permitida(s)
                  </div>
                )}
              </div>
            )}
          </div>
            ))}
          </div>

          {users.length > itemsPerPage && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-gray-700">
                Página {currentPage} de {Math.ceil(users.length / itemsPerPage)}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(users.length / itemsPerPage), prev + 1))}
                disabled={currentPage === Math.ceil(users.length / itemsPerPage)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {emailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Cambiar Email</h2>
              <button
                onClick={() => {
                  setEmailModal(null);
                  setNewEmail('');
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Cambiar email para: <span className="font-bold">{emailModal.username}</span>
                </p>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nuevo Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="ejemplo@correo.com"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  Este email se usará para las notificaciones del sistema de alertas
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setEmailModal(null);
                  setNewEmail('');
                }}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={changeEmail}
                disabled={saving}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {passwordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Cambiar Contraseña</h2>
              <button
                onClick={() => {
                  setPasswordModal(null);
                  setNewPassword('');
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Cambiar contraseña para: <span className="font-bold">{passwordModal.username}</span>
                </p>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nueva Contraseña <span className="text-red-600">*</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Mínimo 6 caracteres"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setPasswordModal(null);
                  setNewPassword('');
                }}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={changePassword}
                disabled={saving}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {createUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Crear Nuevo Usuario</h2>
              <button
                onClick={() => {
                  setCreateUserModal(false);
                  setNewUser({
                    username: '',
                    email: '',
                    password: '',
                    role: 'editor',
                    activo: true
                  });
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre de usuario <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Nombre de usuario"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contraseña <span className="text-red-600">*</span>
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rol <span className="text-red-600">*</span>
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'super_admin' | 'editor' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="editor">Editor</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUser.activo}
                    onChange={(e) => setNewUser({ ...newUser, activo: e.target.checked })}
                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Usuario activo</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setCreateUserModal(false);
                  setNewUser({
                    username: '',
                    email: '',
                    password: '',
                    role: 'editor',
                    activo: true
                  });
                }}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateUser}
                disabled={saving}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
              >
                {saving ? 'Creando...' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Confirmar Eliminación</h2>
              <button
                onClick={() => setDeleteUserModal(null)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800">
                  <strong>¡Atención!</strong> Esta acción no se puede deshacer.
                </p>
              </div>

              <p className="text-gray-700 mb-4">
                ¿Estás seguro de que deseas eliminar al usuario <strong>"{deleteUserModal.username}"</strong>?
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> El usuario perderá acceso al panel de administración, pero todas sus tareas y comentarios permanecerán en el sistema.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteUserModal(null)}
                disabled={saving}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={saving}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50"
              >
                {saving ? 'Eliminando...' : 'Eliminar Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
