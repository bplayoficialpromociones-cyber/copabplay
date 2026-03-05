import { useState, useEffect } from 'react';
import { Save, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Prize {
  id: string;
  position: number;
  amount: string;
  currency: string;
}

export default function PrizesManagement() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPrizes = async () => {
    try {
      const { data, error } = await supabase
        .from('prizes_config')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;
      if (data) {
        setPrizes(data);
      }
    } catch (error) {
      console.error('Error al obtener premios:', error);
      alert('Error al cargar premios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrizes();
  }, []);

  const updatePrize = (id: string, field: keyof Prize, value: string | number) => {
    setPrizes(prizes.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const prize of prizes) {
        const { error } = await supabase
          .from('prizes_config')
          .update({
            amount: prize.amount,
            currency: prize.currency,
            updated_at: new Date().toISOString()
          })
          .eq('id', prize.id);

        if (error) throw error;
      }
      alert('Premios guardados exitosamente');
    } catch (error) {
      console.error('Error al guardar premios:', error);
      alert('Error al guardar premios');
    } finally {
      setSaving(false);
    }
  };

  const getPositionLabel = (position: number) => {
    switch (position) {
      case 1: return '1ER LUGAR';
      case 2: return '2DO LUGAR';
      case 3: return '3ER LUGAR';
      default: return `${position}° LUGAR`;
    }
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1: return 'from-[#FFD700] to-[#FFA500]';
      case 2: return 'from-[#C0C0C0] to-[#808080]';
      case 3: return 'from-[#CD7F32] to-[#8B4513]';
      default: return 'from-gray-600 to-gray-800';
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando premios...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestión de Premios</h2>
          <p className="text-gray-600">Configura los montos de los premios del ranking</p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {prizes.map((prize) => (
          <div
            key={prize.id}
            className={`bg-gradient-to-br ${getPositionColor(prize.position)} rounded-2xl p-6 shadow-xl`}
          >
            <div className="text-center mb-4">
              <Trophy className="w-12 h-12 text-white mx-auto mb-2" />
              <h3 className="text-white font-bold text-xl">
                {getPositionLabel(prize.position)}
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm font-semibold mb-2">
                  Monto del Premio
                </label>
                <input
                  type="text"
                  value={prize.amount}
                  onChange={(e) => updatePrize(prize.id, 'amount', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-white/30 rounded-lg bg-white/10 text-white placeholder-white/50 focus:ring-2 focus:ring-white focus:border-transparent backdrop-blur-sm font-bold text-xl text-center"
                  placeholder="$250.000"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-semibold mb-2">
                  Moneda
                </label>
                <input
                  type="text"
                  value={prize.currency}
                  onChange={(e) => updatePrize(prize.id, 'currency', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-white/30 rounded-lg bg-white/10 text-white placeholder-white/50 focus:ring-2 focus:ring-white focus:border-transparent backdrop-blur-sm font-semibold text-center"
                  placeholder="PESOS"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Información:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Los cambios se reflejarán inmediatamente en la página pública del ranking</li>
          <li>• Usa el formato que prefieras para los montos (ej: $250.000 o 250000)</li>
          <li>• La moneda puede ser PESOS, USD, o cualquier texto que necesites</li>
        </ul>
      </div>
    </div>
  );
}
