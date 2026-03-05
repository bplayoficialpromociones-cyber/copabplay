import React, { useState, useEffect } from 'react';
import { Users, Search, ChevronLeft, ChevronRight, Upload, Download, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface Jugador {
  id: string;
  numero: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  celular: string;
  afiliador: string;
  ciudad: string;
  provincia: string;
  estado: string;
  alias_bplay: string;
  clave_bplay: string;
}

export function GiroGanadorManagement() {
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [filteredJugadores, setFilteredJugadores] = useState<Jugador[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    email: '',
    celular: '',
    afiliador: '',
    ciudad: '',
    provincia: '',
    estado: '',
    alias_bplay: '',
  });
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  const ITEMS_PER_PAGE = 100;

  useEffect(() => {
    loadJugadores();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [jugadores, searchTerm, filters]);

  const loadJugadores = async () => {
    try {
      // Fetch all records using pagination to bypass the 1000 record limit
      const allJugadores: Jugador[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('jugadores_giro_ganador')
          .select('*')
          .order('numero', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allJugadores.push(...data);
          page++;

          // If we got less than pageSize records, we've reached the end
          if (data.length < pageSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      setJugadores(allJugadores);
    } catch (error) {
      console.error('Error loading jugadores:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...jugadores];

    // Apply search term (searches across all fields)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(j =>
        Object.values(j).some(val =>
          String(val).toLowerCase().includes(term)
        )
      );
    }

    // Apply column filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(j =>
          String(j[key as keyof Jugador] || '').toLowerCase().includes(value.toLowerCase())
        );
      }
    });

    setFilteredJugadores(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportProgress(0);
    setImportMessage(null);

    try {
      setImportMessage({ type: 'info', text: 'Leyendo archivo...' });

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      const rawData: any[][] = [];

      for (let R = range.s.r; R <= range.e.r; R++) {
        const row: any[] = [];
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];
          row.push(cell ? cell.v : '');
        }
        rawData.push(row);
      }

      let headerRow = 0;
      let headers: string[] = [];

      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i];
        const nonEmptyCount = row.filter(cell => cell && String(cell).trim() !== '').length;

        if (nonEmptyCount >= 5) {
          headers = row.map(cell => String(cell || '').trim());
          headerRow = i;
          break;
        }
      }

      if (headers.length === 0 || headers.filter(h => h !== '').length < 3) {
        setImportMessage({
          type: 'error',
          text: 'No se pudieron identificar las columnas en el archivo. Verifica que el archivo tenga encabezados válidos.'
        });
        setImporting(false);
        return;
      }

      console.log('Encabezados encontrados en fila', headerRow, ':', headers);
      setImportMessage({ type: 'info', text: 'Procesando datos...' });

      const getValue = (row: any[], header: string, possibleKeys: string[]): string => {
        for (const searchKey of possibleKeys) {
          for (let i = 0; i < headers.length; i++) {
            const h = headers[i].toLowerCase().trim();
            const sk = searchKey.toLowerCase();

            if (h === sk || h.includes(sk) || sk.includes(h)) {
              const value = String(row[i] || '').trim();
              if (value !== '') return value;
            }
          }
        }
        return '';
      };

      const jugadoresData = [];

      for (let i = headerRow + 1; i < rawData.length; i++) {
        const row = rawData[i];
        const jugador = {
          numero: i - headerRow,
          nombre: getValue(row, 'nombre', ['nombre', 'name']),
          apellido: getValue(row, 'apellido', ['apellido', 'surname', 'last name']),
          dni: getValue(row, 'dni', ['dni', 'd.n.i.', 'documento']),
          email: getValue(row, 'email', ['email', 'e-mail', 'correo', 'mail']),
          celular: getValue(row, 'celular', ['celular', 'telefono', 'teléfono', 'phone', 'tel']),
          afiliador: getValue(row, 'afiliador', ['afiliador', 'referido']),
          ciudad: getValue(row, 'ciudad', ['ciudad', 'city', 'localidad']),
          provincia: getValue(row, 'provincia', ['provincia', 'province']),
          estado: getValue(row, 'estado', ['estado', 'status', 'state']),
          alias_bplay: getValue(row, 'alias', ['alias', 'usuario', 'user']),
          clave_bplay: getValue(row, 'clave', ['clave', 'password', 'contraseña', 'pass']),
        };

        if (jugador.nombre || jugador.apellido || jugador.dni || jugador.email || jugador.celular) {
          jugadoresData.push(jugador);
        }
      }

      console.log('Datos transformados:', jugadoresData.slice(0, 3));

      if (jugadoresData.length === 0) {
        setImportMessage({
          type: 'error',
          text: 'No se encontraron datos válidos. Verifica que el archivo contenga información después de los encabezados.'
        });
        setImporting(false);
        return;
      }

      setImportMessage({ type: 'info', text: `Importando ${jugadoresData.length} jugadores...` });

      const batchSize = 500;
      let totalInserted = 0;

      for (let i = 0; i < jugadoresData.length; i += batchSize) {
        const batch = jugadoresData.slice(i, i + batchSize);
        const { error } = await supabase
          .from('jugadores_giro_ganador')
          .insert(batch);

        if (error) throw error;
        totalInserted += batch.length;

        const progress = Math.round((totalInserted / jugadoresData.length) * 100);
        setImportProgress(progress);
        setImportMessage({
          type: 'info',
          text: `Importando: ${totalInserted} de ${jugadoresData.length} jugadores (${progress}%)`
        });

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setImportProgress(100);
      setImportMessage({
        type: 'success',
        text: `${totalInserted} jugadores importados exitosamente`
      });

      await loadJugadores();

      setTimeout(() => {
        setImporting(false);
        setImportProgress(0);
      }, 2000);
    } catch (error) {
      console.error('Error importing CSV:', error);
      setImportMessage({
        type: 'error',
        text: `Error al importar: ${error instanceof Error ? error.message : 'Error desconocido'}`
      });
      setImporting(false);
      setImportProgress(0);
    }

    event.target.value = '';
  };

  const handleExportCSV = () => {
    const dataToExport = filteredJugadores.map(j => ({
      'N°': j.numero,
      'Nombre': j.nombre,
      'Apellido': j.apellido,
      'DNI': j.dni,
      'Email': j.email,
      'Celular': j.celular,
      'Afiliador': j.afiliador,
      'Ciudad': j.ciudad,
      'Provincia': j.provincia,
      'Estado': j.estado,
      'Alias bplay': j.alias_bplay,
      'Clave bplay': j.clave_bplay,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jugadores');
    XLSX.writeFile(wb, `jugadores-giro-ganador-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDeleteAll = async () => {
    if (!confirm('¿Estás seguro de eliminar TODOS los registros? Esta acción no se puede deshacer.')) return;

    try {
      const { error } = await supabase
        .from('jugadores_giro_ganador')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;
      alert('Todos los registros han sido eliminados');
      loadJugadores();
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
      dni: '',
      email: '',
      celular: '',
      afiliador: '',
      ciudad: '',
      provincia: '',
      estado: '',
      alias_bplay: '',
    });
    setSearchTerm('');
  };

  // Pagination
  const totalPages = Math.ceil(filteredJugadores.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentJugadores = filteredJugadores.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
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
          <h2 className="text-2xl font-bold text-white">Jugadores Giro Ganador</h2>
        </div>
        <div className="flex gap-2">
          <label className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
            importing ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
          } text-white`}>
            <Upload size={20} />
            Importar CSV
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleImportCSV}
              className="hidden"
              disabled={importing}
            />
          </label>
          <button
            onClick={handleExportCSV}
            disabled={importing}
            className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            <Download size={20} />
            Exportar Excel
          </button>
          <button
            onClick={handleDeleteAll}
            disabled={importing}
            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            <Trash2 size={20} />
            Eliminar Todos
          </button>
        </div>
      </div>

      {/* Import Progress and Messages */}
      {(importing || importMessage) && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          {importing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">Progreso de importación</span>
                <span className="text-white font-semibold">{importProgress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300 ease-out flex items-center justify-center text-xs font-semibold text-white"
                  style={{ width: `${importProgress}%` }}
                >
                  {importProgress > 10 && `${importProgress}%`}
                </div>
              </div>
            </div>
          )}
          {importMessage && (
            <div className={`mt-3 p-4 rounded-lg ${
              importMessage.type === 'success' ? 'bg-green-500/20 border border-green-500/50 text-green-300' :
              importMessage.type === 'error' ? 'bg-red-500/20 border border-red-500/50 text-red-300' :
              'bg-blue-500/20 border border-blue-500/50 text-blue-300'
            }`}>
              <p className="text-sm font-medium">{importMessage.text}</p>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 border border-green-500/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Total de Jugadores</p>
            <p className="text-3xl font-bold text-white mt-1">{filteredJugadores.length}</p>
            {filteredJugadores.length !== jugadores.length && (
              <p className="text-sm text-gray-400 mt-1">
                (de {jugadores.length} total)
              </p>
            )}
          </div>
          <Users className="text-green-500" size={40} />
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
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700">N°</th>
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
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700 min-w-[120px]">
                  <div className="space-y-2">
                    <div>DNI</div>
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={filters.dni}
                      onChange={(e) => handleFilterChange('dni', e.target.value)}
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
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700 min-w-[120px]">
                  <div className="space-y-2">
                    <div>Afiliador</div>
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={filters.afiliador}
                      onChange={(e) => handleFilterChange('afiliador', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700 min-w-[150px]">
                  <div className="space-y-2">
                    <div>Ciudad</div>
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={filters.ciudad}
                      onChange={(e) => handleFilterChange('ciudad', e.target.value)}
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
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700 min-w-[180px]">
                  <div className="space-y-2">
                    <div>Estado</div>
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={filters.estado}
                      onChange={(e) => handleFilterChange('estado', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700 min-w-[180px]">
                  <div className="space-y-2">
                    <div>Alias bplay</div>
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={filters.alias_bplay}
                      onChange={(e) => handleFilterChange('alias_bplay', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-700 min-w-[150px]">
                  Clave bplay
                </th>
              </tr>
            </thead>
            <tbody>
              {currentJugadores.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-gray-400">
                    No se encontraron jugadores
                  </td>
                </tr>
              ) : (
                currentJugadores.map((jugador) => (
                  <tr key={jugador.id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3 text-white font-semibold">{jugador.numero}</td>
                    <td className="px-4 py-3 text-gray-300">{jugador.nombre}</td>
                    <td className="px-4 py-3 text-gray-300">{jugador.apellido}</td>
                    <td className="px-4 py-3 text-gray-300">{jugador.dni}</td>
                    <td className="px-4 py-3 text-gray-300">{jugador.email}</td>
                    <td className="px-4 py-3 text-gray-300">{jugador.celular}</td>
                    <td className="px-4 py-3 text-gray-300">{jugador.afiliador}</td>
                    <td className="px-4 py-3 text-gray-300">{jugador.ciudad}</td>
                    <td className="px-4 py-3 text-gray-300">{jugador.provincia}</td>
                    <td className="px-4 py-3 text-gray-300">{jugador.estado}</td>
                    <td className="px-4 py-3 text-gray-300">{jugador.alias_bplay}</td>
                    <td className="px-4 py-3 text-gray-300">{jugador.clave_bplay}</td>
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
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredJugadores.length)} de {filteredJugadores.length} jugadores
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
