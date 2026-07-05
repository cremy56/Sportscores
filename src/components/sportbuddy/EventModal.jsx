// src/components/sportbuddy/EventModal.jsx
// Event-flow: situatie → keuze → gevolg + "wat zegt de wetenschap"-kaart (+10 XP).
// De client kent de gevolgen NIET vooraf (server stuurt alleen id+tekst per
// keuze); de server valideert en rekent. Bij het hulpzoek-event verschijnt
// de Hulpwijzer: "en als het over jóú gaat — hier vind je echte hulp."

import { useState } from 'react';
import toast from 'react-hot-toast';
import { sportbuddyApi } from '../../data/sportbuddy/api';

const HULPLIJNEN = [
  { naam: 'CLB van je school', info: 'via het secretariaat of je klastitularis' },
  { naam: 'Awel', info: 'bel 102 of chat via awel.be — voor álle vragen' },
  { naam: '1712', info: 'bij geweld of misbruik' },
  { naam: 'Zelfmoordlijn', info: 'bel 1813 — 24/7 bij acute nood' },
];

export default function EventModal({ event, profile, onResolved, onClose }) {
  const [resultaat, setResultaat] = useState(null);
  const [bezig, setBezig] = useState(false);

  const kies = async (keuzeId) => {
    setBezig(true);
    try {
      const result = await sportbuddyApi({ action: 'resolve_event', event_id: event.id, keuze_id: keuzeId });
      toast.success(`+${result.beloning.xp} XP!`);
      setResultaat(result);
      onResolved(result);
    } catch (error) {
      console.error('resolve_event mislukt:', error.message);
      toast.error(error.message);
    } finally {
      setBezig(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6">
        {!resultaat ? (
          <>
            <div className="text-4xl text-center mb-2">{event.emoji}</div>
            <h3 className="text-xl font-bold text-gray-800 text-center mb-3">{event.titel}</h3>
            <p className="text-sm text-gray-600 mb-6">{event.situatie}</p>
            <p className="text-xs font-semibold text-gray-500 mb-2">Wat doet je buddy?</p>
            <div className="space-y-2">
              {event.keuzes.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  disabled={bezig}
                  onClick={() => kies(k.id)}
                  className="w-full text-left px-4 py-3 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-700 hover:border-purple-400 hover:bg-purple-50 transition-all disabled:opacity-40"
                >
                  {k.tekst}
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-gray-400 mt-4">Elke keuze heeft een écht gevolg · +10 XP</p>
          </>
        ) : (
          <>
            <div className="text-4xl text-center mb-2">{event.emoji}</div>
            <h3 className="text-xl font-bold text-gray-800 text-center mb-4">{event.titel}</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-700">{resultaat.gevolgTekst}</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
              <p className="text-xs font-bold text-indigo-700 mb-1">🔬 Wat zegt de wetenschap?</p>
              <p className="text-sm text-indigo-900">{resultaat.wetenschap}</p>
              {resultaat.eindtermen && (
                <p className="text-xs text-indigo-400 mt-2">Leerplandoel: {resultaat.eindtermen}</p>
              )}
            </div>
            {resultaat.hulpwijzer && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
                <p className="text-xs font-bold text-emerald-700 mb-2">🧭 En als het over jóú gaat — hier vind je echte hulp:</p>
                <ul className="space-y-1">
                  {HULPLIJNEN.map((h) => (
                    <li key={h.naam} className="text-sm text-emerald-900">
                      <span className="font-semibold">{h.naam}</span> — {h.info}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold"
              >
                Begrepen!
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
