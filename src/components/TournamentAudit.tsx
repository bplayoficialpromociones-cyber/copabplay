import { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, Calendar, Eye, Trash2, Download, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface AuditImport {
  id: string;
  month: number;
  year: number;
  original_filename: string;
  storage_path: string;
  total_records: number;
  bplay_users_count: number;
  uploaded_at: string;
}

interface AuditRecord {
  id: string;
  import_id: string;
  jurisdiccion: string;
  usuario_bplay: string | null;
  fecha_registro: string;
  estado: string;
  afiliador: string;
  subafiliador: string;
  genero: string;
  edad: number;
  dias_antiguedad: number;
  dias_ultima_apuesta: number;
  dias_ultima_conexion: number;
  num_depositos: number;
  depositos: number;
  num_retiros: number;
  retiros: number;
  depositos_netos: number;
  apuestas_efectivo: number;
  premios_efectivo: number;
  ggr: number;
  conversion_efectivo: number;
  ajuste_efectivo: number;
  beneficio: number;
  balance_efectivo: number;
  balance_bono: number;
  balance_total: number;
  apuestas_ef_casino: number;
  porcentaje_casino: number;
  apuestas_ef_deportes: number;
  aadd: number;
  tgm: number;
  rlt: number;
  pun: number;
  poc: number;
  blj: number;
  dias_con_apuestas: number;
  dias_con_depositos: number;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const YEARS = Array.from({ length: 10 }, (_, i) => 2020 + i);

function parseMoneyValue(value: any): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  const cleanValue = String(value).replace(/[$.\s]/g, '').replace(',', '.');
  return parseFloat(cleanValue) || 0;
}

function parsePercentValue(value: any): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  const cleanValue = String(value).replace(/[%\s]/g, '').replace(',', '.');
  return parseFloat(cleanValue) || 0;
}

function parseDate(value: any): string | null {
  if (!value) return null;
  try {
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    const parts = String(value).split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return null;
  } catch {
    return null;
  }
}

export default function TournamentAudit() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [imports, setImports] = useState<AuditImport[]>([]);
  const [selectedImport, setSelectedImport] = useState<AuditImport | null>(null);
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [fileProcessed, setFileProcessed] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterFilename, setFilterFilename] = useState<string>('');

  useEffect(() => {
    fetchImports();
  }, []);

  const fetchImports = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_audit_imports')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      setImports(data || []);
    } catch (error) {
      console.error('Error fetching imports:', error);
      setMessage({ type: 'error', text: 'Error al cargar los archivos' });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xls') && !file.name.endsWith('.xlsx')) {
      setMessage({ type: 'error', text: 'Formato incorrecto. Solo se permiten archivos .xls o .xlsx' });
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setFileProcessed(false);
    setProcessedData([]);
    setMessage({ type: 'success', text: `Archivo "${file.name}" cargado correctamente` });
  };

  const processFile = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Debes seleccionar un archivo primero' });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, {
        type: 'array',
        cellDates: true,
        cellNF: false,
        cellText: false
      });

      let jsonData: any[] = [];
      let sheetUsed = '';

      for (let i = 0; i < workbook.SheetNames.length; i++) {
        const sheetName = workbook.SheetNames[i];
        const sheet = workbook.Sheets[sheetName];
        const tempData = XLSX.utils.sheet_to_json(sheet, {
          raw: false,
          defval: '',
          blankrows: false
        });

        console.log(`Hoja "${sheetName}":`, tempData.length, 'filas antes de filtrar');
        if (tempData.length > 0) {
          console.log('Primera fila sin filtrar:', tempData[0]);
          console.log('Columnas encontradas:', Object.keys(tempData[0]));
        }

        if (tempData.length > 0) {
          jsonData = tempData.filter(row => {
            const values = Object.values(row);
            const hasData = values.some(v => v && String(v).trim() !== '');

            const jurisdiccion = (row['Jurisdicción'] || row['Jurisdiccion'] || '').toString().toLowerCase().trim();

            if (jurisdiccion === 'total') return false;

            if (jurisdiccion.includes('filtros aplicados')) return false;

            const firstValue = String(values[0] || '').toLowerCase().trim();
            if (firstValue.includes('filtros aplicados') || firstValue.includes('switch es')) return false;

            if (!jurisdiccion || jurisdiccion === '' || jurisdiccion === '-') return false;

            return hasData;
          });
          sheetUsed = sheetName;
          console.log(`Después de filtrar: ${jsonData.length} registros válidos`);
          break;
        }
      }

      if (jsonData.length === 0) {
        setMessage({
          type: 'error',
          text: `El archivo no contiene datos válidos. Total de hojas: ${workbook.SheetNames.length}. Verifica que el archivo tenga datos.`
        });
        return;
      }

      console.log('Datos procesados:', jsonData.length, 'registros');
      console.log('Primera fila:', jsonData[0]);
      console.log('Columnas:', Object.keys(jsonData[0]).join(', '));

      setProcessedData(jsonData);
      setFileProcessed(true);
      setMessage({
        type: 'success',
        text: `Archivo procesado exitosamente. ${jsonData.length} registros encontrados en la hoja "${sheetUsed}".`
      });
    } catch (error: any) {
      console.error('Error processing file:', error);
      setMessage({
        type: 'error',
        text: `Error al procesar el archivo: ${error.message || 'Error desconocido'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const saveToDatabase = async () => {
    if (!selectedFile || !selectedMonth || !selectedYear || !fileProcessed) {
      setMessage({ type: 'error', text: 'Debes cargar un archivo, procesarlo y seleccionar mes y año' });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      const { data: existingFile } = await supabase
        .from('tournament_audit_imports')
        .select('id')
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .maybeSingle();

      if (existingFile) {
        setMessage({
          type: 'error',
          text: `Ya existe un archivo para ${MONTHS[selectedMonth - 1]} ${selectedYear}. No se pueden duplicar registros.`
        });
        setLoading(false);
        return;
      }

      const bucket = 'audit-files';
      const fileName = `${selectedYear}-${selectedMonth}-${Date.now()}.${selectedFile.name.split('.').pop()}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      const { data: historicalPlayers, error: playersError } = await supabase
        .from('historical_players')
        .select('player_name, usuario_bplay');

      if (playersError) {
        console.error('Error fetching historical players:', playersError);
      }

      const bplayUsernames = historicalPlayers
        ? historicalPlayers.flatMap((player: any) => {
            const names = [];
            if (player.player_name) {
              names.push(player.player_name.toLowerCase().trim());
            }
            if (player.usuario_bplay && player.usuario_bplay !== 'sin definir') {
              names.push(player.usuario_bplay.toLowerCase().trim());
            }
            return names;
          }).filter(Boolean)
        : [];

      console.log('Jugadores Copa Bplay históricos:', bplayUsernames);

      const mappedRecords = processedData.map(row => {
        const usuario = (row['Usuario'] || '').toString().toLowerCase().trim();
        const isInCopa = bplayUsernames.includes(usuario);

        return {
          jurisdiccion: row['Jurisdicción'] || row['Jurisdiccion'] || '',
          usuario_bplay: isInCopa ? (row['Usuario'] || null) : null,
          fecha_registro: parseDate(row['Fecha registro'] || row['Fecha Registro']),
          estado: row['Estado'] || '',
          afiliador: row['Afiliador'] || '',
          subafiliador: row['Subafiliador'] || '',
          genero: row['Género'] || row['Genero'] || '',
          edad: parseInt(row['Edad']) || 0,
          dias_antiguedad: parseInt(row['Días de Antigüedad'] || row['Dias de Antiguedad']) || 0,
          dias_ultima_apuesta: parseInt(row['Días desde última Apuesta'] || row['Dias desde ultima Apuesta']) || 0,
          dias_ultima_conexion: parseInt(row['Días desde última Conexion'] || row['Dias desde ultima Conexion']) || 0,
          num_depositos: parseInt(row['#Depósitos'] || row['#Depositos']) || 0,
          depositos: parseMoneyValue(row['Depósitos'] || row['Depositos']),
          num_retiros: parseInt(row['#Retiros']) || 0,
          retiros: parseMoneyValue(row['Retiros']),
          depositos_netos: parseMoneyValue(row['Depósitos Netos'] || row['Depositos Netos']),
          apuestas_efectivo: parseMoneyValue(row['Apuestas Efectivo']),
          premios_efectivo: parseMoneyValue(row['Premios Efectivo']),
          ggr: parseMoneyValue(row['GGR']),
          conversion_efectivo: parseMoneyValue(row['Conversión Efectivo'] || row['Conversion Efectivo']),
          ajuste_efectivo: parseMoneyValue(row['Ajuste Efectivo']),
          beneficio: parseMoneyValue(row['Beneficio']),
          balance_efectivo: parseMoneyValue(row['Balance Efectivo']),
          balance_bono: parseMoneyValue(row['Balance Bono']),
          balance_total: parseMoneyValue(row['Balance Total']),
          apuestas_ef_casino: parseMoneyValue(row['Apuestas Ef. Casino']),
          porcentaje_casino: parsePercentValue(row['% Casino']),
          apuestas_ef_deportes: parseMoneyValue(row['Apuestas Ef. Deportes']),
          aadd: parsePercentValue(row['AADD']),
          tgm: parsePercentValue(row['TGM']),
          rlt: parsePercentValue(row['RLT']),
          pun: parsePercentValue(row['PUN']),
          poc: parsePercentValue(row['POC']),
          blj: parsePercentValue(row['BLJ']),
          dias_con_apuestas: parseInt(row['Días con Apuestas'] || row['Dias con Apuestas']) || 0,
          dias_con_depositos: parseInt(row['Días con Depósitos'] || row['Dias con Depositos']) || 0
        };
      });

      const bplayUsersCount = mappedRecords.filter(r => r.usuario_bplay && r.usuario_bplay.trim() !== '').length;

      const { data: importRecord, error: importError } = await supabase
        .from('tournament_audit_imports')
        .insert({
          month: selectedMonth,
          year: selectedYear,
          original_filename: selectedFile.name,
          storage_path: fileName,
          total_records: mappedRecords.length,
          bplay_users_count: bplayUsersCount
        })
        .select()
        .single();

      if (importError) throw importError;

      const recordsWithImportId = mappedRecords.map(r => ({
        ...r,
        import_id: importRecord.id
      }));

      const batchSize = 100;
      for (let i = 0; i < recordsWithImportId.length; i += batchSize) {
        const batch = recordsWithImportId.slice(i, i + batchSize);
        const { error: recordsError } = await supabase
          .from('tournament_audit_records')
          .insert(batch);

        if (recordsError) throw recordsError;
      }

      setMessage({
        type: 'success',
        text: `Archivo guardado exitosamente. ${mappedRecords.length} registros procesados, ${bplayUsersCount} jugadores de Copa Bplay identificados.`
      });

      setSelectedFile(null);
      setFileProcessed(false);
      setProcessedData([]);
      setSelectedMonth(0);
      await fetchImports();

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      console.error('Error saving to database:', error);
      setMessage({ type: 'error', text: error.message || 'Error al guardar en la base de datos' });
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = async (importRecord: AuditImport) => {
    try {
      setSelectedImport(importRecord);
      setShowDetailModal(true);
      setLoading(true);

      const { data, error } = await supabase
        .from('tournament_audit_records')
        .select('*')
        .eq('import_id', importRecord.id)
        .order('usuario_bplay', { ascending: false, nullsFirst: false })
        .order('ggr', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching records:', error);
      setMessage({ type: 'error', text: 'Error al cargar los registros' });
    } finally {
      setLoading(false);
    }
  };

  const deleteImport = async (id: string, month: number, year: number) => {
    if (!confirm(`¿Estás seguro de eliminar el archivo de ${MONTHS[month - 1]} ${year}?`)) return;

    try {
      const { error } = await supabase
        .from('tournament_audit_imports')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Archivo eliminado exitosamente' });
      await fetchImports();
    } catch (error) {
      console.error('Error deleting import:', error);
      setMessage({ type: 'error', text: 'Error al eliminar el archivo' });
    }
  };

  const downloadFile = async (storagePath: string, filename: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('audit-files')
        .download(storagePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      setMessage({ type: 'error', text: 'Error al descargar el archivo' });
    }
  };

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const filteredImports = imports.filter(imp => {
    const matchesMonth = !filterMonth || MONTHS[imp.month - 1].toLowerCase().includes(filterMonth.toLowerCase());
    const matchesYear = !filterYear || imp.year.toString().includes(filterYear);
    const matchesFilename = !filterFilename || imp.original_filename.toLowerCase().includes(filterFilename.toLowerCase());
    return matchesMonth && matchesYear && matchesFilename;
  });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-2xl border-4 border-green-600 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <FileSpreadsheet className="w-8 h-8 text-white" />
          <h2 className="text-3xl font-black text-white" style={{ fontFamily: "'Bungee', sans-serif" }}>
            AUDITORÍA DE TORNEO
          </h2>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-500/20 border-2 border-green-500' : 'bg-red-500/20 border-2 border-red-500'}`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
              <p className={`${message.type === 'success' ? 'text-green-500' : 'text-red-500'} font-semibold`}>
                {message.text}
              </p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-black/30 p-6 rounded-xl border-2 border-green-600/30">
            <label className="block text-white font-bold mb-3">1. Cargar Archivo Excel</label>
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={handleFileSelect}
              className="block w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-600 file:text-white hover:file:bg-green-700 file:cursor-pointer"
            />
            {selectedFile && (
              <p className="mt-2 text-gray-300 text-sm">
                Archivo: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <div className="bg-black/30 p-6 rounded-xl border-2 border-green-600/30">
            <label className="block text-white font-bold mb-3">2. Procesar Archivo</label>
            <button
              onClick={processFile}
              disabled={!selectedFile || loading || fileProcessed}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl font-bold hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload size={20} />
              {loading ? 'Procesando...' : fileProcessed ? 'Archivo Procesado' : 'Procesar Archivo'}
            </button>
            {processedData.length > 0 && (
              <p className="mt-2 text-green-400 text-sm">
                ✓ {processedData.length} registros procesados
              </p>
            )}
          </div>
        </div>

        {fileProcessed && (
          <div className="bg-green-600/10 p-6 rounded-xl border-2 border-green-600/30 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">3. Seleccionar Período y Guardar</h3>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-white font-semibold mb-2">Mes *</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full bg-black/50 border-2 border-green-600/30 rounded-lg px-4 py-3 text-white focus:border-green-600 focus:outline-none"
                >
                  <option value="0">Seleccionar mes</option>
                  {MONTHS.map((month, index) => (
                    <option key={month} value={index + 1}>{month}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Año *</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full bg-black/50 border-2 border-green-600/30 rounded-lg px-4 py-3 text-white focus:border-green-600 focus:outline-none"
                >
                  {YEARS.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={saveToDatabase}
              disabled={!selectedMonth || !selectedYear || !fileProcessed || loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 rounded-xl font-bold text-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <Calendar size={24} />
              {loading ? 'Guardando...' : 'Guardar en Base de Datos'}
            </button>
          </div>
        )}
      </div>

      {imports.length > 0 && (
        <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-2xl border-4 border-green-600 shadow-2xl">
          <h3 className="text-2xl font-black text-white mb-6" style={{ fontFamily: "'Bungee', sans-serif" }}>
            ARCHIVOS IMPORTADOS
          </h3>

          <div className="mb-6 grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-white font-semibold mb-2">Filtrar por Mes</label>
              <input
                type="text"
                placeholder="Buscar mes..."
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full bg-black/50 border-2 border-green-600/30 rounded-lg px-4 py-2 text-white focus:border-green-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-white font-semibold mb-2">Filtrar por Año</label>
              <input
                type="text"
                placeholder="Buscar año..."
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full bg-black/50 border-2 border-green-600/30 rounded-lg px-4 py-2 text-white focus:border-green-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-white font-semibold mb-2">Filtrar por Archivo</label>
              <input
                type="text"
                placeholder="Buscar archivo..."
                value={filterFilename}
                onChange={(e) => setFilterFilename(e.target.value)}
                className="w-full bg-black/50 border-2 border-green-600/30 rounded-lg px-4 py-2 text-white focus:border-green-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-green-600/20 border-b-2 border-green-600">
                  <th className="px-4 py-3 text-left text-white font-bold">Mes</th>
                  <th className="px-4 py-3 text-left text-white font-bold">Año</th>
                  <th className="px-4 py-3 text-left text-white font-bold">Archivo</th>
                  <th className="px-4 py-3 text-center text-white font-bold">Jugadores Copa</th>
                  <th className="px-4 py-3 text-center text-white font-bold">Ver más</th>
                </tr>
              </thead>
              <tbody>
                {filteredImports.map((imp) => (
                  <tr key={imp.id} className="border-b border-gray-700 hover:bg-green-600/5 transition-colors">
                    <td className="px-4 py-4 text-white font-semibold">{MONTHS[imp.month - 1]}</td>
                    <td className="px-4 py-4 text-white font-semibold">{imp.year}</td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => downloadFile(imp.storage_path, imp.original_filename)}
                        className="text-white hover:text-gray-300 underline flex items-center gap-2"
                      >
                        <Download size={16} />
                        {imp.original_filename}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-block bg-green-500/20 text-green-400 px-3 py-1 rounded-full font-bold">
                        {imp.bplay_users_count}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => viewDetails(imp)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                          title="Ver más"
                        >
                          <Eye size={18} />
                          Ver más
                        </button>
                        <button
                          onClick={() => deleteImport(imp.id, imp.month, imp.year)}
                          className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showDetailModal && selectedImport && (
        <div className="fixed inset-0 bg-black/90 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl border-4 border-green-600 p-8 max-w-[95vw] w-full shadow-2xl my-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-black text-white" style={{ fontFamily: "'Bungee', sans-serif" }}>
                  REGISTROS: {MONTHS[selectedImport.month - 1].toUpperCase()} {selectedImport.year}
                </h3>
                <p className="text-gray-400 mt-2">
                  Total: {selectedImport.total_records} registros |
                  Jugadores Copa Bplay: <span className="text-green-400 font-bold">{selectedImport.bplay_users_count}</span>
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="bg-gray-700 text-white p-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="overflow-x-auto max-h-[70vh] border border-gray-700 rounded-lg">
              <table className="text-xs" style={{ minWidth: 'max-content' }}>
                <thead className="sticky top-0 bg-gray-900 z-10">
                  <tr className="bg-green-600/20 border-b-2 border-green-600">
                    <th className="px-2 py-2 text-left text-white font-bold whitespace-nowrap" style={{ width: '70px', minWidth: '70px', maxWidth: '70px' }}>Jurisd.</th>
                    <th className="px-2 py-2 text-left text-white font-bold whitespace-nowrap" style={{ minWidth: '150px' }}>Usuario</th>
                    <th className="px-2 py-2 text-left text-white font-bold whitespace-nowrap" style={{ minWidth: '80px' }}>Fecha Reg.</th>
                    <th className="px-2 py-2 text-left text-white font-bold whitespace-nowrap" style={{ minWidth: '70px' }}>Estado</th>
                    <th className="px-2 py-2 text-left text-white font-bold whitespace-nowrap" style={{ minWidth: '100px' }}>Afiliador</th>
                    <th className="px-2 py-2 text-left text-white font-bold whitespace-nowrap" style={{ minWidth: '100px' }}>Subafil.</th>
                    <th className="px-2 py-2 text-center text-white font-bold whitespace-nowrap" style={{ minWidth: '60px' }}>Género</th>
                    <th className="px-2 py-2 text-center text-white font-bold whitespace-nowrap" style={{ minWidth: '50px' }}>Edad</th>
                    <th className="px-2 py-2 text-center text-white font-bold whitespace-nowrap" style={{ minWidth: '70px' }}>Días Ant.</th>
                    <th className="px-2 py-2 text-center text-white font-bold whitespace-nowrap" style={{ minWidth: '80px' }}>Últ. Apuesta</th>
                    <th className="px-2 py-2 text-center text-white font-bold whitespace-nowrap" style={{ minWidth: '80px' }}>Últ. Conex.</th>
                    <th className="px-2 py-2 text-center text-white font-bold whitespace-nowrap" style={{ minWidth: '60px' }}># Dep.</th>
                    <th className="px-2 py-2 text-right text-white font-bold whitespace-nowrap" style={{ minWidth: '100px' }}>Depósitos</th>
                    <th className="px-2 py-2 text-center text-white font-bold whitespace-nowrap" style={{ minWidth: '60px' }}># Ret.</th>
                    <th className="px-2 py-2 text-right text-white font-bold whitespace-nowrap" style={{ minWidth: '100px' }}>Retiros</th>
                    <th className="px-2 py-2 text-right text-white font-bold whitespace-nowrap" style={{ minWidth: '100px' }}>Dep. Netos</th>
                    <th className="px-2 py-2 text-right text-white font-bold whitespace-nowrap" style={{ minWidth: '100px' }}>Apuestas Ef.</th>
                    <th className="px-2 py-2 text-right text-white font-bold whitespace-nowrap" style={{ minWidth: '100px' }}>Premios Ef.</th>
                    <th className="px-2 py-2 text-right text-white font-bold whitespace-nowrap" style={{ minWidth: '100px' }}>GGR</th>
                    <th className="px-2 py-2 text-right text-white font-bold whitespace-nowrap" style={{ minWidth: '100px' }}>Conv. Ef.</th>
                    <th className="px-2 py-2 text-right text-white font-bold whitespace-nowrap" style={{ minWidth: '100px' }}>Ajuste Ef.</th>
                    <th className="px-2 py-2 text-right text-white font-bold whitespace-nowrap" style={{ minWidth: '100px' }}>Beneficio</th>
                    <th className="px-2 py-2 text-right text-white font-bold whitespace-nowrap" style={{ minWidth: '100px' }}>Bal. Ef.</th>
                    <th className="px-2 py-2 text-right text-white font-bold whitespace-nowrap" style={{ minWidth: '100px' }}>Bal. Bono</th>
                    <th className="px-2 py-2 text-right text-white font-bold whitespace-nowrap" style={{ minWidth: '100px' }}>Bal. Total</th>
                    <th className="px-2 py-2 text-right text-white font-bold whitespace-nowrap" style={{ minWidth: '100px' }}>Ap. Casino</th>
                    <th className="px-2 py-2 text-center text-white font-bold whitespace-nowrap" style={{ minWidth: '70px' }}>% Casino</th>
                    <th className="px-2 py-2 text-right text-white font-bold whitespace-nowrap" style={{ minWidth: '100px' }}>Ap. Deportes</th>
                    <th className="px-2 py-2 text-center text-white font-bold whitespace-nowrap" style={{ minWidth: '60px' }}>AADD</th>
                    <th className="px-2 py-2 text-center text-white font-bold whitespace-nowrap" style={{ minWidth: '60px' }}>TGM</th>
                    <th className="px-2 py-2 text-center text-white font-bold whitespace-nowrap" style={{ minWidth: '60px' }}>RLT</th>
                    <th className="px-2 py-2 text-center text-white font-bold whitespace-nowrap" style={{ minWidth: '60px' }}>PUN</th>
                    <th className="px-2 py-2 text-center text-white font-bold whitespace-nowrap" style={{ minWidth: '60px' }}>POC</th>
                    <th className="px-2 py-2 text-center text-white font-bold whitespace-nowrap" style={{ minWidth: '60px' }}>BLJ</th>
                    <th className="px-2 py-2 text-center text-white font-bold whitespace-nowrap" style={{ minWidth: '80px' }}>Días Ap.</th>
                    <th className="px-2 py-2 text-center text-white font-bold whitespace-nowrap" style={{ minWidth: '80px' }}>Días Dep.</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => {
                    const isBplayUser = record.usuario_bplay && record.usuario_bplay.trim() !== '';
                    const cellClass = isBplayUser ? 'text-white' : 'text-gray-300';
                    const rowClass = isBplayUser ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-gray-800';

                    return (
                      <tr key={record.id} className={`border-b border-gray-700 transition-colors ${rowClass}`}>
                        <td className={`px-2 py-2 ${cellClass}`} style={{ width: '70px', minWidth: '70px', maxWidth: '70px' }}>{record.jurisdiccion || '-'}</td>
                        <td className={`px-2 py-2 font-bold ${isBplayUser ? 'text-white' : 'text-gray-400'}`}>{record.usuario_bplay || '-'}</td>
                        <td className={`px-2 py-2 ${cellClass}`}>{record.fecha_registro ? new Date(record.fecha_registro).toLocaleDateString('es-AR') : '-'}</td>
                        <td className={`px-2 py-2 ${cellClass}`}>{record.estado || '-'}</td>
                        <td className={`px-2 py-2 ${cellClass}`}>{record.afiliador || '-'}</td>
                        <td className={`px-2 py-2 ${cellClass}`}>{record.subafiliador || '-'}</td>
                        <td className={`px-2 py-2 text-center ${cellClass}`}>{record.genero || '-'}</td>
                        <td className={`px-2 py-2 text-center ${cellClass}`}>{record.edad || '-'}</td>
                        <td className={`px-2 py-2 text-center ${cellClass}`}>{record.dias_antiguedad || '0'}</td>
                        <td className={`px-2 py-2 text-center ${cellClass}`}>{record.dias_ultima_apuesta || '0'}</td>
                        <td className={`px-2 py-2 text-center ${cellClass}`}>{record.dias_ultima_conexion || '0'}</td>
                        <td className={`px-2 py-2 text-center ${cellClass}`}>{record.num_depositos || '0'}</td>
                        <td className={`px-2 py-2 text-right font-mono ${cellClass}`}>{formatMoney(record.depositos || 0)}</td>
                        <td className={`px-2 py-2 text-center ${cellClass}`}>{record.num_retiros || '0'}</td>
                        <td className={`px-2 py-2 text-right font-mono ${cellClass}`}>{formatMoney(record.retiros || 0)}</td>
                        <td className={`px-2 py-2 text-right font-mono ${cellClass}`}>{formatMoney(record.depositos_netos || 0)}</td>
                        <td className={`px-2 py-2 text-right font-mono ${cellClass}`}>{formatMoney(record.apuestas_efectivo || 0)}</td>
                        <td className={`px-2 py-2 text-right font-mono ${cellClass}`}>{formatMoney(record.premios_efectivo || 0)}</td>
                        <td className={`px-2 py-2 text-right font-mono ${isBplayUser ? 'text-white font-bold' : 'text-green-400'}`}>{formatMoney(record.ggr || 0)}</td>
                        <td className={`px-2 py-2 text-right font-mono ${cellClass}`}>{formatMoney(record.conversion_efectivo || 0)}</td>
                        <td className={`px-2 py-2 text-right font-mono ${cellClass}`}>{formatMoney(record.ajuste_efectivo || 0)}</td>
                        <td className={`px-2 py-2 text-right font-mono ${isBplayUser ? 'text-white font-bold' : 'text-yellow-400'}`}>{formatMoney(record.beneficio || 0)}</td>
                        <td className={`px-2 py-2 text-right font-mono ${cellClass}`}>{formatMoney(record.balance_efectivo || 0)}</td>
                        <td className={`px-2 py-2 text-right font-mono ${cellClass}`}>{formatMoney(record.balance_bono || 0)}</td>
                        <td className={`px-2 py-2 text-right font-mono ${cellClass}`}>{formatMoney(record.balance_total || 0)}</td>
                        <td className={`px-2 py-2 text-right font-mono ${cellClass}`}>{formatMoney(record.apuestas_ef_casino || 0)}</td>
                        <td className={`px-2 py-2 text-center ${cellClass}`}>{formatPercent(record.porcentaje_casino)}</td>
                        <td className={`px-2 py-2 text-right font-mono ${cellClass}`}>{formatMoney(record.apuestas_ef_deportes || 0)}</td>
                        <td className={`px-2 py-2 text-center ${cellClass}`}>{formatPercent(record.aadd)}</td>
                        <td className={`px-2 py-2 text-center ${cellClass}`}>{formatPercent(record.tgm)}</td>
                        <td className={`px-2 py-2 text-center ${cellClass}`}>{formatPercent(record.rlt)}</td>
                        <td className={`px-2 py-2 text-center ${cellClass}`}>{formatPercent(record.pun)}</td>
                        <td className={`px-2 py-2 text-center ${cellClass}`}>{formatPercent(record.poc)}</td>
                        <td className={`px-2 py-2 text-center ${cellClass}`}>{formatPercent(record.blj)}</td>
                        <td className={`px-2 py-2 text-center ${cellClass}`}>{record.dias_con_apuestas || '0'}</td>
                        <td className={`px-2 py-2 text-center ${cellClass}`}>{record.dias_con_depositos || '0'}</td>
                      </tr>
                    );
                  })}

                  {records.length > 0 && (() => {
                    const totals = records.reduce((acc, record) => ({
                      num_depositos: acc.num_depositos + (record.num_depositos || 0),
                      depositos: acc.depositos + (record.depositos || 0),
                      num_retiros: acc.num_retiros + (record.num_retiros || 0),
                      retiros: acc.retiros + (record.retiros || 0),
                      depositos_netos: acc.depositos_netos + (record.depositos_netos || 0),
                      apuestas_efectivo: acc.apuestas_efectivo + (record.apuestas_efectivo || 0),
                      premios_efectivo: acc.premios_efectivo + (record.premios_efectivo || 0),
                      ggr: acc.ggr + (record.ggr || 0),
                      conversion_efectivo: acc.conversion_efectivo + (record.conversion_efectivo || 0),
                      ajuste_efectivo: acc.ajuste_efectivo + (record.ajuste_efectivo || 0),
                      beneficio: acc.beneficio + (record.beneficio || 0),
                      balance_efectivo: acc.balance_efectivo + (record.balance_efectivo || 0),
                      balance_bono: acc.balance_bono + (record.balance_bono || 0),
                      balance_total: acc.balance_total + (record.balance_total || 0),
                      apuestas_ef_casino: acc.apuestas_ef_casino + (record.apuestas_ef_casino || 0),
                      apuestas_ef_deportes: acc.apuestas_ef_deportes + (record.apuestas_ef_deportes || 0)
                    }), {
                      num_depositos: 0,
                      depositos: 0,
                      num_retiros: 0,
                      retiros: 0,
                      depositos_netos: 0,
                      apuestas_efectivo: 0,
                      premios_efectivo: 0,
                      ggr: 0,
                      conversion_efectivo: 0,
                      ajuste_efectivo: 0,
                      beneficio: 0,
                      balance_efectivo: 0,
                      balance_bono: 0,
                      balance_total: 0,
                      apuestas_ef_casino: 0,
                      apuestas_ef_deportes: 0
                    });

                    return (
                      <tr className="bg-green-600/20 border-t-4 border-green-600 sticky bottom-0">
                        <td className="px-2 py-3 text-white font-bold" style={{ width: '70px', minWidth: '70px', maxWidth: '70px' }}>Total</td>
                        <td className="px-2 py-3 text-white font-bold" colSpan={10}>-</td>
                        <td className="px-2 py-3 text-center text-white font-bold">{totals.num_depositos}</td>
                        <td className="px-2 py-3 text-right font-mono text-yellow-400 font-bold">{formatMoney(totals.depositos)}</td>
                        <td className="px-2 py-3 text-center text-white font-bold">{totals.num_retiros}</td>
                        <td className="px-2 py-3 text-right font-mono text-yellow-400 font-bold">{formatMoney(totals.retiros)}</td>
                        <td className="px-2 py-3 text-right font-mono text-yellow-400 font-bold">{formatMoney(totals.depositos_netos)}</td>
                        <td className="px-2 py-3 text-right font-mono text-yellow-400 font-bold">{formatMoney(totals.apuestas_efectivo)}</td>
                        <td className="px-2 py-3 text-right font-mono text-yellow-400 font-bold">{formatMoney(totals.premios_efectivo)}</td>
                        <td className="px-2 py-3 text-right font-mono text-green-400 font-bold">{formatMoney(totals.ggr)}</td>
                        <td className="px-2 py-3 text-right font-mono text-yellow-400 font-bold">{formatMoney(totals.conversion_efectivo)}</td>
                        <td className="px-2 py-3 text-right font-mono text-yellow-400 font-bold">{formatMoney(totals.ajuste_efectivo)}</td>
                        <td className="px-2 py-3 text-right font-mono text-green-400 font-bold">{formatMoney(totals.beneficio)}</td>
                        <td className="px-2 py-3 text-right font-mono text-yellow-400 font-bold">{formatMoney(totals.balance_efectivo)}</td>
                        <td className="px-2 py-3 text-right font-mono text-yellow-400 font-bold">{formatMoney(totals.balance_bono)}</td>
                        <td className="px-2 py-3 text-right font-mono text-yellow-400 font-bold">{formatMoney(totals.balance_total)}</td>
                        <td className="px-2 py-3 text-right font-mono text-yellow-400 font-bold">{formatMoney(totals.apuestas_ef_casino)}</td>
                        <td className="px-2 py-3 text-center text-white font-bold">-</td>
                        <td className="px-2 py-3 text-right font-mono text-yellow-400 font-bold">{formatMoney(totals.apuestas_ef_deportes)}</td>
                        <td className="px-2 py-3 text-center text-white font-bold" colSpan={7}>-</td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
