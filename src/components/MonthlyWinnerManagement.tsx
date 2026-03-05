import { useState, useEffect } from 'react';
import { Trophy, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MonthlyWinnerData {
  id: string;
  language: string;
  image_url: string;
}

const languageNames: Record<string, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  zh: '中文'
};

export default function MonthlyWinnerManagement() {
  const [winnersData, setWinnersData] = useState<MonthlyWinnerData[]>([]);
  const [editingLanguage, setEditingLanguage] = useState<string | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchWinnersData();
  }, []);

  const fetchWinnersData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('monthly_winner_content')
        .select('*')
        .order('language', { ascending: true });

      if (error) throw error;
      if (data) {
        setWinnersData(data);
      }
    } catch (error) {
      console.error('Error fetching winners data:', error);
      setMessage({ type: 'error', text: 'Error al cargar los datos' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (language: string, currentImageUrl: string) => {
    setEditingLanguage(language);
    setEditingImageUrl(currentImageUrl);
    setMessage(null);
  };

  const handleCancel = () => {
    setEditingLanguage(null);
    setEditingImageUrl('');
    setMessage(null);
  };

  const handleSave = async () => {
    if (!editingLanguage) return;

    try {
      setSaving(true);
      setMessage(null);

      const { error } = await supabase
        .from('monthly_winner_content')
        .update({ image_url: editingImageUrl })
        .eq('language', editingLanguage);

      if (error) throw error;

      setMessage({ type: 'success', text: `Imagen actualizada exitosamente para ${languageNames[editingLanguage]}` });
      setEditingLanguage(null);
      setEditingImageUrl('');
      await fetchWinnersData();
    } catch (error) {
      console.error('Error saving winner data:', error);
      setMessage({ type: 'error', text: 'Error al guardar la imagen' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-2xl border-4 border-[#00FF87] shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-8 h-8 text-[#00FF87]" />
          <h2 className="text-3xl font-black text-[#00FF87]" style={{ fontFamily: "'Bungee', sans-serif" }}>
            GANADOR DEL MES
          </h2>
        </div>
        <p className="text-white">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-2xl border-4 border-[#00FF87] shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-8 h-8 text-[#00FF87]" />
        <h2 className="text-3xl font-black text-[#00FF87]" style={{ fontFamily: "'Bungee', sans-serif" }}>
          GANADOR DEL MES
        </h2>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-500/20 border-2 border-green-500' : 'bg-red-500/20 border-2 border-red-500'}`}>
          <p className={`${message.type === 'success' ? 'text-green-500' : 'text-red-500'} font-semibold`}>
            {message.text}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {winnersData.map((winner) => (
          <div key={winner.id} className="bg-black/50 p-6 rounded-xl border-2 border-[#00FF87]/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                {languageNames[winner.language] || winner.language}
              </h3>
              {editingLanguage !== winner.language && (
                <button
                  onClick={() => handleEdit(winner.language, winner.image_url)}
                  className="bg-gradient-to-r from-[#00FF87] to-[#00CC6A] text-black px-4 py-2 rounded-lg font-bold hover:from-green-600 hover:to-emerald-700 transition-all"
                >
                  Editar
                </button>
              )}
            </div>

            {editingLanguage === winner.language ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-white font-semibold mb-2">URL de la Imagen:</label>
                  <input
                    type="text"
                    value={editingImageUrl}
                    onChange={(e) => setEditingImageUrl(e.target.value)}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border-2 border-[#00FF87]/50 focus:border-[#00FF87] focus:outline-none"
                    placeholder="/ruta/a/imagen.png"
                  />
                  <p className="text-gray-400 text-sm mt-2">
                    Ingresa la ruta de la imagen (ej: /imagen.png) o una URL completa
                  </p>
                </div>

                {editingImageUrl && (
                  <div>
                    <p className="text-white font-semibold mb-2">Vista previa:</p>
                    <img
                      src={editingImageUrl}
                      alt="Vista previa"
                      className="w-full max-w-2xl h-auto rounded-lg border-2 border-[#00FF87]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#00FF87] to-[#00CC6A] text-black px-6 py-3 rounded-lg font-bold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50"
                  >
                    <Save size={20} />
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="flex items-center gap-2 bg-gray-700 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-600 transition-all disabled:opacity-50"
                  >
                    <X size={20} />
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-400 mb-2">URL actual:</p>
                <p className="text-white font-mono bg-gray-800 p-3 rounded-lg mb-4 break-all">
                  {winner.image_url}
                </p>
                {winner.image_url && (
                  <div>
                    <p className="text-gray-400 mb-2">Imagen actual:</p>
                    <img
                      src={winner.image_url}
                      alt={`Winner ${winner.language}`}
                      className="w-full max-w-2xl h-auto rounded-lg border-2 border-[#00FF87]/50"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
