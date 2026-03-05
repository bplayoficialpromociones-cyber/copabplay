import React, { useState, useEffect } from 'react';
import { Building2, Search, ChevronLeft, ChevronRight, Download, Trash2, CheckCircle, Circle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string;
  company_type: string;
  country: string;
  email: string;
  phone: string;
  comment: string | null;
  created_at: string;
  read: boolean;
}

export function ManufacturerLandingAdmin() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    first_name: '',
    last_name: '',
    company_name: '',
    company_type: '',
    country: '',
    email: '',
    phone: '',
  });

  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [contacts, searchTerm, filters]);

  const loadContacts = async () => {
    try {
      // Fetch all records using pagination to bypass the 1000 record limit
      const allContacts: Contact[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('manufacturer_contacts')
          .select('*')
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allContacts.push(...data);
          page++;

          if (data.length < pageSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      setContacts(allContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...contacts];

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
          String(c[key as keyof Contact] || '').toLowerCase().includes(value.toLowerCase())
        );
      }
    });

    setFilteredContacts(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const toggleReadStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('manufacturer_contacts')
        .update({ read: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setContacts(prevContacts =>
        prevContacts.map(contact =>
          contact.id === id ? { ...contact, read: !currentStatus } : contact
        )
      );
    } catch (error) {
      console.error('Error updating contact status:', error);
      alert('Error al actualizar el estado');
    }
  };

  const handleExportCSV = () => {
    const dataToExport = filteredContacts.map(contact => ({
      'Nombre': contact.first_name,
      'Apellido': contact.last_name,
      'Empresa': contact.company_name,
      'Tipo de Empresa': contact.company_type,
      'País': contact.country,
      'Email': contact.email,
      'Teléfono': contact.phone,
      'Comentario': contact.comment || '',
      'Leído': contact.read ? 'Sí' : 'No',
      'Fecha de Registro': new Date(contact.created_at).toLocaleString('es-AR')
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Landing Fabricantes');
    XLSX.writeFile(wb, `landing-fabricantes-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDeleteAll = async () => {
    if (!confirm('¿Estás seguro de eliminar TODOS los registros? Esta acción no se puede deshacer.')) return;

    try {
      const { error } = await supabase
        .from('manufacturer_contacts')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;
      alert('Todos los registros han sido eliminados');
      loadContacts();
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
      first_name: '',
      last_name: '',
      company_name: '',
      company_type: '',
      country: '',
      email: '',
      phone: '',
    });
    setSearchTerm('');
  };

  // Pagination
  const totalPages = Math.ceil(filteredContacts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentContacts = filteredContacts.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Stats
  const stats = {
    total: contacts.length,
    read: contacts.filter(c => c.read).length,
    unread: contacts.filter(c => !c.read).length,
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
          <Building2 className="text-green-500" size={32} />
          <h2 className="text-2xl font-bold text-white">Landing Fabricantes</h2>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 border border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total de Contactos</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
            </div>
            <Building2 className="text-green-500" size={40} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 border border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Sin Leer</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.unread}</p>
            </div>
            <Circle className="text-yellow-500" size={40} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 border border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Leídos</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.read}</p>
            </div>
            <CheckCircle className="text-green-500" size={40} />
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
                <th className="px-4 py-3 text-center text-white font-semibold border-b border-gray-700 w-[80px]">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700 min-w-[150px]">
                  <div className="space-y-2">
                    <div>Nombre</div>
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={filters.first_name}
                      onChange={(e) => handleFilterChange('first_name', e.target.value)}
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
                      value={filters.last_name}
                      onChange={(e) => handleFilterChange('last_name', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700 min-w-[200px]">
                  <div className="space-y-2">
                    <div>Empresa</div>
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={filters.company_name}
                      onChange={(e) => handleFilterChange('company_name', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700 min-w-[150px]">
                  <div className="space-y-2">
                    <div>Tipo Empresa</div>
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={filters.company_type}
                      onChange={(e) => handleFilterChange('company_type', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700 min-w-[120px]">
                  <div className="space-y-2">
                    <div>País</div>
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={filters.country}
                      onChange={(e) => handleFilterChange('country', e.target.value)}
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
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700 min-w-[150px]">
                  <div className="space-y-2">
                    <div>Teléfono</div>
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={filters.phone}
                      onChange={(e) => handleFilterChange('phone', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700 min-w-[200px]">
                  Comentario
                </th>
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700 min-w-[180px]">
                  Fecha de Registro
                </th>
              </tr>
            </thead>
            <tbody>
              {currentContacts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    No se encontraron contactos
                  </td>
                </tr>
              ) : (
                currentContacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleReadStatus(contact.id, contact.read)}
                        className="inline-flex items-center justify-center"
                        title={contact.read ? 'Marcar como no leído' : 'Marcar como leído'}
                      >
                        {contact.read ? (
                          <CheckCircle size={20} className="text-green-500" />
                        ) : (
                          <Circle size={20} className="text-yellow-500" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{contact.first_name}</td>
                    <td className="px-4 py-3 text-gray-300">{contact.last_name}</td>
                    <td className="px-4 py-3 text-gray-300">{contact.company_name}</td>
                    <td className="px-4 py-3 text-gray-300">{contact.company_type}</td>
                    <td className="px-4 py-3 text-gray-300">{contact.country}</td>
                    <td className="px-4 py-3 text-gray-300">{contact.email}</td>
                    <td className="px-4 py-3 text-gray-300">{contact.phone}</td>
                    <td className="px-4 py-3 text-gray-300">
                      {contact.comment ? (
                        <span className="text-xs">{contact.comment.length > 50 ? `${contact.comment.substring(0, 50)}...` : contact.comment}</span>
                      ) : (
                        <span className="text-gray-500 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {new Date(contact.created_at).toLocaleString('es-AR')}
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
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredContacts.length)} de {filteredContacts.length} contactos
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
