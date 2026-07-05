// src/components/sportbuddy/VerzorgPaneel.jsx
// De dagelijkse verzorging: training / voeding / water / slaap / mentaal.
// Alle input = gesloten keuze (IDs uit verzorging.js); effecten rekent de
// server uit (lib/sportbuddy/engine.js). Beloning: 5 XP + 1 coin, 1×/dag.

import { useState } from 'react';
import toast from 'react-hot-toast';
import { VERZORGING_SECTIES } from '../../data/sportbuddy/verzorging';

export default function VerzorgPaneel({ profile, vandaagVerzorgd, laatsteKeuzes, onVerzorgd }) {
  const [keuzes, setKeuzes] = useState({
    training: 'rust', voeding: 'gewoon', water: 'voldoende', slaap: 'normaal', mentaal: 'geen',
  });
  const [bezig, setBezig] = useState(false);

  const handleVerzorg = async () => {
    setBezig(true);
    try {
      const response = await fetch('/api/sportbuddy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${profile?._token}`,
        },
        body: JSON.stringify({ action: 'verzorg_dag', keuzes }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Verzorging mislukt');
      }
      toast.success(`+${result.beloning.xp} XP en +${result.beloning.coins} coin!`);
      onVerzorgd(result);
    } catch (error) {
      console.error('verzorg_dag mislukt:', error.message);
      toast.error(error.message);
    } finally {
      setBezig(false);
    }
  };

  if (vandaagVerzorgd) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="font-bold text-gray-800 mb-2">Dagelijkse verzorging</h3>
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-semibold text-green-800 text-sm">Vandaag al verzorgd!</p>
            <p className="text-xs text-green-700 mt-0.5">
              Kom morgen terug — of ontdek intussen de kamers van je buddy.
            </p>
          </div>
        </div>
        {laatsteKeuzes && (
          <p className="text-xs text-gray-400 mt-3">
            Vandaag gekozen: {VERZORGING_SECTIES.map((s) => {
              const optie = s.opties.find((o) => o.id === laatsteKeuzes[s.key]);
              return optie ? `${optie.emoji} ${optie.label}` : null;
            }).filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="font-bold text-gray-800">Dagelijkse verzorging</h3>
        <span className="text-xs font-semibold text-purple-600">+5 XP · +1 coin</span>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Plan de dag van je buddy. Elke keuze heeft een écht fysiologisch effect — je ziet het meteen in de dagstaat.
      </p>

      <div className="space-y-4">
        {VERZORGING_SECTIES.map((sectie) => (
          <div key={sectie.key}>
            <p className="text-sm font-semibold text-gray-600 mb-2">{sectie.titel}</p>
            <div className="flex flex-wrap gap-2">
              {sectie.opties.map((optie) => (
                <button
                  key={optie.id}
                  type="button"
                  title={optie.uitleg}
                  onClick={() => setKeuzes((k) => ({ ...k, [sectie.key]: optie.id }))}
                  className={`px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                    keuzes[sectie.key] === optie.id
                      ? 'border-purple-600 bg-purple-50 text-purple-800'
                      : 'border-gray-200 text-gray-600 hover:border-purple-300'
                  }`}
                >
                  <span className="mr-1">{optie.emoji}</span>{optie.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {sectie.opties.find((o) => o.id === keuzes[sectie.key])?.uitleg}
            </p>
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-6">
        <button
          type="button"
          disabled={bezig}
          onClick={handleVerzorg}
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl font-bold disabled:opacity-40"
        >
          {bezig ? 'Bezig...' : 'Verzorg je buddy'}
        </button>
      </div>
    </div>
  );
}
