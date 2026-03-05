import { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Edit2, Search, X, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StreamContent {
  id: string;
  stream_date: string;
  stream_time: string;
  platform: 'Twitch' | 'Kick' | 'Youtube';
  description: string;
  status: 'Publicado' | 'Pendiente de Publicar' | 'No Publicado';
  share_platforms: string[];
  manufacturer: string;
  created_at?: string;
  updated_at?: string;
}

interface StreamContentForm {
  stream_date: string;
  stream_time: string;
  platform: 'Twitch' | 'Kick' | 'Youtube';
  description: string;
  status: 'Publicado' | 'Pendiente de Publicar' | 'No Publicado';
  share_platforms: string[];
  manufacturer: string;
}

const PLATFORMS = ['Twitch', 'Kick', 'Youtube'] as const;
const STATUS_OPTIONS = ['Publicado', 'Pendiente de Publicar', 'No Publicado'] as const;
const SHARE_PLATFORMS = ['Instagram', 'Youtube', 'Facebook', 'Tik Tok'] as const;
const MANUFACTURERS = [
  'Ainsworth',
  'Belatra',
  'Big Time Gaming',
  'Evolution',
  'Ezugi',
  'Games Global',
  'Hacksaw',
  'Live888',
  'Neko Games',
  'NetEnt',
  'Nolimit City',
  'One Touch',
  'Playtech',
  'Pragmatic',
  'Red Tiger',
  'Sneaky',
  'Zitro'
] as const;

type SortField = 'stream_date' | 'stream_time' | 'platform' | 'status' | 'description' | 'manufacturer';
type SortDirection = 'asc' | 'desc' | null;

interface FormErrors {
  stream_date?: string;
  stream_time?: string;
  platform?: string;
  description?: string;
  status?: string;
  share_platforms?: string;
  manufacturer?: string;
}

export default function StreamContentManagement() {
  const [contents, setContents] = useState<StreamContent[]>([]);
  const [filteredContents, setFilteredContents] = useState<StreamContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterManufacturer, setFilterManufacturer] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const itemsPerPage = 10;

  const [formData, setFormData] = useState<StreamContentForm>({
    stream_date: new Date().toISOString().split('T')[0],
    stream_time: '00:00',
    platform: 'Twitch',
    description: '',
    status: 'Pendiente de Publicar',
    share_platforms: [],
    manufacturer: 'Pragmatic'
  });

  const fetchContents = async () => {
    try {
      const { data, error } = await supabase
        .from('stream_content')
        .select('*')
        .order('stream_date', { ascending: false })
        .order('stream_time', { ascending: false });

      if (error) throw error;
      if (data) {
        setContents(data);
        setFilteredContents(data);
      }
    } catch (error) {
      console.error('Error al obtener contenido:', error);
      alert('Error al cargar contenido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContents();
  }, []);

  useEffect(() => {
    let filtered = [...contents];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(content =>
        content.description.toLowerCase().includes(term) ||
        content.platform.toLowerCase().includes(term) ||
        content.status.toLowerCase().includes(term) ||
        content.manufacturer.toLowerCase().includes(term) ||
        content.stream_date.includes(term) ||
        content.stream_time.includes(term) ||
        content.share_platforms.some(p => p.toLowerCase().includes(term))
      );
    }

    if (filterDate) {
      filtered = filtered.filter(content => content.stream_date === filterDate);
    }

    if (filterPlatform) {
      filtered = filtered.filter(content => content.platform === filterPlatform);
    }

    if (filterStatus) {
      filtered = filtered.filter(content => content.status === filterStatus);
    }

    if (filterManufacturer) {
      filtered = filtered.filter(content => content.manufacturer === filterManufacturer);
    }

    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        if (sortField === 'share_platforms') {
          return 0;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return sortDirection === 'asc' ? comparison : -comparison;
        }

        return 0;
      });
    }

    setFilteredContents(filtered);
    setCurrentPage(1);
  }, [searchTerm, filterDate, filterPlatform, filterStatus, filterManufacturer, contents, sortField, sortDirection]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.stream_date) {
      newErrors.stream_date = 'La fecha del stream es obligatoria';
    }

    if (!formData.stream_time) {
      newErrors.stream_time = 'La hora del momento es obligatoria';
    }

    if (!formData.platform) {
      newErrors.platform = 'La plataforma es obligatoria';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es obligatoria';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'La descripción debe tener al menos 10 caracteres';
    } else if (formData.description.length > 500) {
      newErrors.description = 'La descripción no puede exceder 500 caracteres';
    }

    if (!formData.status) {
      newErrors.status = 'El estado es obligatorio';
    }

    if (formData.share_platforms.length === 0) {
      newErrors.share_platforms = 'Debes seleccionar al menos una red social para compartir';
    }

    if (!formData.manufacturer) {
      newErrors.manufacturer = 'El fabricante es obligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('stream_content')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
        alert('Contenido actualizado exitosamente');
      } else {
        const { error } = await supabase
          .from('stream_content')
          .insert(formData);

        if (error) throw error;
        alert('Contenido creado exitosamente');
      }

      resetForm();
      fetchContents();
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar contenido');
    }
  };

  const handleEdit = (content: StreamContent) => {
    setFormData({
      stream_date: content.stream_date,
      stream_time: content.stream_time,
      platform: content.platform,
      description: content.description,
      status: content.status,
      share_platforms: content.share_platforms,
      manufacturer: content.manufacturer
    });
    setEditingId(content.id);
    setShowForm(true);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro que desea eliminar este contenido?')) return;

    try {
      const { error } = await supabase
        .from('stream_content')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Contenido eliminado exitosamente');
      fetchContents();
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('Error al eliminar contenido');
    }
  };

  const resetForm = () => {
    setFormData({
      stream_date: new Date().toISOString().split('T')[0],
      stream_time: '00:00',
      platform: 'Twitch',
      description: '',
      status: 'Pendiente de Publicar',
      share_platforms: [],
      manufacturer: 'Pragmatic'
    });
    setEditingId(null);
    setShowForm(false);
    setErrors({});
  };

  const toggleSharePlatform = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      share_platforms: prev.share_platforms.includes(platform)
        ? prev.share_platforms.filter(p => p !== platform)
        : [...prev.share_platforms, platform]
    }));
    if (errors.share_platforms) {
      setErrors({ ...errors, share_platforms: undefined });
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="w-4 h-4 text-green-600" />;
    }
    if (sortDirection === 'desc') {
      return <ArrowDown className="w-4 h-4 text-green-600" />;
    }
    return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
  };

  const totalPages = Math.ceil(filteredContents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentContents = filteredContents.slice(startIndex, endIndex);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Publicado': return 'bg-green-100 text-green-800';
      case 'Pendiente de Publicar': return 'bg-yellow-100 text-yellow-800';
      case 'No Publicado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'Twitch': return 'bg-purple-100 text-purple-800';
      case 'Kick': return 'bg-green-100 text-green-800';
      case 'Youtube': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando contenido...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestión de Contenido de Streams</h2>
          <p className="text-gray-600">Administra los momentos importantes de tus transmisiones</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showForm ? 'Cancelar' : 'Nuevo Contenido'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-green-500">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {editingId ? 'Editar Contenido' : 'Nuevo Contenido'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha del Stream *
                </label>
                <input
                  type="date"
                  value={formData.stream_date}
                  onChange={(e) => {
                    setFormData({ ...formData, stream_date: e.target.value });
                    if (errors.stream_date) setErrors({ ...errors, stream_date: undefined });
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.stream_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.stream_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.stream_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hora del Momento *
                </label>
                <input
                  type="time"
                  value={formData.stream_time}
                  onChange={(e) => {
                    setFormData({ ...formData, stream_time: e.target.value });
                    if (errors.stream_time) setErrors({ ...errors, stream_time: undefined });
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.stream_time ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.stream_time && (
                  <p className="mt-1 text-sm text-red-600">{errors.stream_time}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plataforma de Stream *
                </label>
                <select
                  value={formData.platform}
                  onChange={(e) => {
                    setFormData({ ...formData, platform: e.target.value as any });
                    if (errors.platform) setErrors({ ...errors, platform: undefined });
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.platform ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  {PLATFORMS.map(platform => (
                    <option key={platform} value={platform}>{platform}</option>
                  ))}
                </select>
                {errors.platform && (
                  <p className="mt-1 text-sm text-red-600">{errors.platform}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => {
                    setFormData({ ...formData, status: e.target.value as any });
                    if (errors.status) setErrors({ ...errors, status: undefined });
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.status ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  {STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                {errors.status && (
                  <p className="mt-1 text-sm text-red-600">{errors.status}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fabricante *
                </label>
                <select
                  value={formData.manufacturer}
                  onChange={(e) => {
                    setFormData({ ...formData, manufacturer: e.target.value });
                    if (errors.manufacturer) setErrors({ ...errors, manufacturer: undefined });
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.manufacturer ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  {MANUFACTURERS.map(manufacturer => (
                    <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
                  ))}
                </select>
                {errors.manufacturer && (
                  <p className="mt-1 text-sm text-red-600">{errors.manufacturer}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ¿Qué pasó en el Stream? * ({formData.description.length}/500)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (errors.description) setErrors({ ...errors, description: undefined });
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                rows={4}
                maxLength={500}
                placeholder="Describe lo que sucedió en este momento del stream..."
                required
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Compartir en Redes Sociales *
              </label>
              <div className="flex flex-wrap gap-2">
                {SHARE_PLATFORMS.map(platform => (
                  <label
                    key={platform}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-colors ${
                      formData.share_platforms.includes(platform)
                        ? 'bg-green-100 border-green-500 text-green-800'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    } ${errors.share_platforms ? 'border-red-500' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.share_platforms.includes(platform)}
                      onChange={() => {
                        toggleSharePlatform(platform);
                        if (errors.share_platforms) setErrors({ ...errors, share_platforms: undefined });
                      }}
                      className="w-4 h-4"
                    />
                    {platform}
                  </label>
                ))}
              </div>
              {errors.share_platforms && (
                <p className="mt-1 text-sm text-red-600">{errors.share_platforms}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                <Save className="w-5 h-5" />
                {editingId ? 'Actualizar' : 'Guardar'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex items-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                >
                  <X className="w-5 h-5" />
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6 space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Buscar por fecha, hora, plataforma, fabricante, estado, descripción o redes sociales..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Fecha
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Plataforma
              </label>
              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Todas las plataformas</option>
                {PLATFORMS.map(platform => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Fabricante
              </label>
              <select
                value={filterManufacturer}
                onChange={(e) => setFilterManufacturer(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Todos los fabricantes</option>
                {MANUFACTURERS.map(manufacturer => (
                  <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Estado
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Todos los estados</option>
                {STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          {(searchTerm || filterDate || filterPlatform || filterStatus || filterManufacturer) && (
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                Mostrando {filteredContents.length} de {contents.length} resultados
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterDate('');
                  setFilterPlatform('');
                  setFilterStatus('');
                  setFilterManufacturer('');
                }}
                className="text-sm text-red-600 hover:text-red-800 font-semibold"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th
                  className="text-left p-3 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('stream_date')}
                >
                  <div className="flex items-center gap-2">
                    Fecha
                    {getSortIcon('stream_date')}
                  </div>
                </th>
                <th
                  className="text-left p-3 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('stream_time')}
                >
                  <div className="flex items-center gap-2">
                    Hora
                    {getSortIcon('stream_time')}
                  </div>
                </th>
                <th
                  className="text-left p-3 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('platform')}
                >
                  <div className="flex items-center gap-2">
                    Plataforma
                    {getSortIcon('platform')}
                  </div>
                </th>
                <th
                  className="text-left p-3 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('manufacturer')}
                >
                  <div className="flex items-center gap-2">
                    Fabricante
                    {getSortIcon('manufacturer')}
                  </div>
                </th>
                <th
                  className="text-left p-3 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('description')}
                >
                  <div className="flex items-center gap-2">
                    Descripción
                    {getSortIcon('description')}
                  </div>
                </th>
                <th
                  className="text-left p-3 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Estado
                    {getSortIcon('status')}
                  </div>
                </th>
                <th className="text-left p-3 font-semibold text-gray-700">Compartir en</th>
                <th className="text-left p-3 font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currentContents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    No se encontraron resultados
                  </td>
                </tr>
              ) : (
                currentContents.map((content) => (
                  <tr key={content.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3">
                      <span className="font-medium">
                        {new Date(content.stream_date).toLocaleDateString('es-ES')}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-mono">{content.stream_time}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getPlatformColor(content.platform)}`}>
                        {content.platform}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
                        {content.manufacturer}
                      </span>
                    </td>
                    <td className="p-3 max-w-md">
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {content.description}
                      </p>
                    </td>
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(content.status)}`}>
                        {content.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {content.share_platforms.length > 0 ? (
                          content.share_platforms.map(platform => (
                            <span key={platform} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                              {platform}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(content)}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(content.id)}
                          className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Página {currentPage} de {totalPages} • Mostrando {currentContents.length} de {filteredContents.length} resultados
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                  currentPage === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
                Anterior
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
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-lg font-semibold transition-colors ${
                        currentPage === pageNum
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                  currentPage === totalPages
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                Siguiente
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Información:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• La descripción tiene un límite de 500 caracteres</li>
          <li>• Puedes filtrar los resultados por fecha, plataforma o estado</li>
          <li>• Los contenidos marcados como "Publicado" son visibles públicamente</li>
          <li>• Selecciona múltiples redes sociales donde quieres compartir el contenido</li>
        </ul>
      </div>
    </div>
  );
}
