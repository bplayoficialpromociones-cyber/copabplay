import React, { useState, useEffect } from 'react';
import { Users, Search, ChevronLeft, ChevronRight, Download, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface PotentialClient {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  email: string;
  provincia: string;
  celular: string;
  tiene_cuenta_bplay: string;
  numero_documento: string;
  created_at: string;
}

export function PotentialClientsManagement() {
  const [clients, setClients] = useState<PotentialClient[]>([]);
  const [filteredClients, setFilteredClients] = useState<PotentialClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    nombre: '',
    apellido: '',
    email: '',
    provincia: '',
    celular: '',
    tiene_cuenta_bplay: '',
    numero_documento: '',
  });

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [clients, searchTerm, filters]);

  const loadClients = async () => {
    try {
      // Fetch all records using pagination to bypass the 1000 record limit
      const allClients: PotentialClient[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('potential_clients')
          .select('*')
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allClients.push(...data);
          page++;

          if (data.length < pageSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      setClients(allClients);
    } catch (error) {
      console.error('Error loading potential clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...clients];

    // Apply search term (searches across all fields)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        Object.values(c).some(val =>
          String(val).toLowerCase().includes(term)
        )
      );
    }

    // Apply column filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(c =>
          String(c[key as keyof PotentialClient] || '').toLowerCase().includes(value.toLowerCase())
        );
      }
    });

    setFilteredClients(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleExportCSV = () => {
    const dataToExport = filteredClients.map(client => ({
      'Nombre': client.nombre,
      'Apellido': client.apellido,
      'DNI': client.numero_documento,
      'Fecha de Nacimiento': new Date(client.fecha_nacimiento).toLocaleDateString('es-AR'),
      'Email': client.email,
      'Provincia': client.provincia,
      'Celular': client.celular,
      'Tiene Cuenta bplay': client.tiene_cuenta_bplay === 'si' ? 'Sí' : client.tiene_cuenta_bplay === 'no' ? 'No' : 'No recuerdo',
      'Fecha de Registro': new Date(client.created_at).toLocaleString('es-AR')
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes Potenciales');
    XLSX.writeFile(wb, `clientes-potenciales-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDeleteAll = async () => {
    if (!confirm('¿Estás seguro de eliminar TODOS los registros? Esta acción no se puede deshacer.')) return;

    try {
      const { error } = await supabase
        .from('potential_clients')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;
      alert('Todos los registros han sido eliminados');
      loadClients();
    } catch (error) {
      console.error('Error deleting records:', error);
      alert('Error al eliminar los registros');
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      nombre: '',
      apellido: '',
      email: '',
      provincia: '',
      celular: '',
      tiene_cuenta_bplay: '',
      numero_documento: '',
    });
    setSearchTerm('');
  };

  const formatCuentaBplay = (value: string) => {
    if (value === 'si') return 'Sí';
    if (value === 'no') return 'No';
    if (value === 'no_recuerdo') return 'No recuerdo';
    return value;
  };

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentClients = filteredClients.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Stats
  const stats = {
    total: clients.length,
    conCuenta: clients.filter(c => c.tiene_cuenta_bplay === 'si').length,
    sinCuenta: clients.filter(c => c.tiene_cuenta_bplay === 'no').length,
    noRecuerda: clients.filter(c => c.tiene_cuenta_bplay === 'no_recuerdo').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="text-green-500" size={32} />
          <h2 className="text-2xl font-bold text-white">Clientes Potenciales</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            <Download size={20} />
            Exportar Excel
          </button>
          <button
            onClick={handleDeleteAll}
            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            <Trash2 size={20} />
            Eliminar Todos
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 border border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total de Clientes</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
            </div>
            <Users className="text-green-500" size={40} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 border border-blue-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Con Cuenta bplay</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.conCuenta}</p>
            </div>
            <Users className="text-blue-500" size={40} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 border border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Sin Cuenta bplay</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.sinCuenta}</p>
            </div>
            <Users className="text-yellow-500" size={40} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 border border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">No Recuerda</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.noRecuerda}</p>
            </div>
            <Users className="text-purple-500" size={40} />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar en todos los campos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-green-500 focus:outline-none"
            />
          </div>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700 min-w-[150px]">
                  <div className="space-y-2">
                    <div>Nombre</div>
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={filters.nombre}
                      onChange={(e) => handleFilterChange('nombre', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700 min-w-[150px]">
                  <div className="space-y-2">
                    <div>Apellido</div>
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={filters.apellido}
                      onChange={(e) => handleFilterChange('apellido', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700 min-w-[150px]">
                  <div className="space-y-2">
                    <div>DNI</div>
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={filters.numero_documento}
                      onChange={(e) => handleFilterChange('numero_documento', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700 min-w-[200px]">
                  <div className="space-y-2">
                    <div>Email</div>
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={filters.email}
                      onChange={(e) => handleFilterChange('email', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700 min-w-[120px]">
                  <div className="space-y-2">
                    <div>Provincia</div>
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={filters.provincia}
                      onChange={(e) => handleFilterChange('provincia', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700 min-w-[150px]">
                  <div className="space-y-2">
                    <div>Celular</div>
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={filters.celular}
                      onChange={(e) => handleFilterChange('celular', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700 min-w-[150px]">
                  Fecha Nacimiento
                </th>
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700 min-w-[150px]">
                  <div className="space-y-2">
                    <div>Cuenta bplay</div>
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={filters.tiene_cuenta_bplay}
                      onChange={(e) => handleFilterChange('tiene_cuenta_bplay', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700 min-w-[180px]">
                  Fecha de Registro
                </th>
              </tr>
            </thead>
            <tbody>
              {currentClients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    No se encontraron clientes potenciales
                  </td>
                </tr>
              ) : (
                currentClients.map((client) => (
                  <tr key={client.id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3 text-gray-300">{client.nombre}</td>
                    <td className="px-4 py-3 text-gray-300">{client.apellido}</td>
                    <td className="px-4 py-3 text-gray-300">{client.numero_documento}</td>
                    <td className="px-4 py-3 text-gray-300">{client.email}</td>
                    <td className="px-4 py-3 text-gray-300">{client.provincia}</td>
                    <td className="px-4 py-3 text-gray-300">{client.celular}</td>
                    <td className="px-4 py-3 text-gray-300">
                      {new Date(client.fecha_nacimiento).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        client.tiene_cuenta_bplay === 'si'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : client.tiene_cuenta_bplay === 'no'
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      }`}>
                        {formatCuentaBplay(client.tiene_cuenta_bplay)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {new Date(client.created_at).toLocaleString('es-AR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-t border-gray-700">
            <div className="text-sm text-gray-400">
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredClients.length)} de {filteredClients.length} clientes
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
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
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
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
                className="p-2 rounded bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
