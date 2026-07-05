// src/components/sportbuddy/StatusBalk.jsx
// Compacte statusweergave in game-stijl (zoals FIFA-kaarten / Pokémon-stathex):
// KLUSCE als mini-radar (tik → detailpopup) + dagstaat als tikbare chips.
// Detail-op-aanvraag houdt de pagina kort op mobiel; alles past boven de vouw.

import { useState } from 'react';
import { STATS } from '../../data/sportbuddy/sporten';

// ─── KLUSCE-radar (zeshoek) ───────────────────────────────────────────────────
function Hexagon({ stats, onClick }) {
  const keys = STATS.map((s) => s.key);
  const cx = 60, cy = 60, r = 46;
  const punt = (i, straal) => {
    const hoek = (Math.PI / 3) * i - Math.PI / 2;
    return [cx + straal * Math.cos(hoek), cy + straal * Math.sin(hoek)];
  };
  const raster = [0.33, 0.66, 1].map((f) =>
    keys.map((_, i) => punt(i, r * f).join(',')).join(' ')
  );
  const dataPunten = keys.map((k, i) => {
    const waarde = Math.max(4, Math.min(100, stats?.[k] ?? 0)) / 100;
    return punt(i, r * waarde).join(',');
  }).join(' ');

  return (
    <button type="button" onClick={onClick} className="relative shrink-0" aria-label="Toon fysieke kenmerken">
      <svg viewBox="0 0 120 120" className="w-28 h-28">
        {raster.map((pts, i) => (
          <polygon key={i} points={pts} fill="none" stroke="#e5e7eb" strokeWidth="1" />
        ))}
        {keys.map((_, i) => {
          const [x, y] = punt(i, r);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e5e7eb" strokeWidth="1" />;
        })}
        <polygon points={dataPunten} fill="#7c3aed" fillOpacity="0.35" stroke="#7c3aed" strokeWidth="2" />
        {keys.map((k, i) => {
          const [x, y] = punt(i, r + 9);
          return <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="700" fill="#6b7280">{k}</text>;
        })}
      </svg>
    </button>
  );
}

// ─── Dagstaat-chip ────────────────────────────────────────────────────────────
function Chip({ emoji, label, waarde, kleur, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-all hover:shadow ${kleur}`}
    >
      <span>{emoji}</span>
      <span className="hidden sm:inline text-gray-600">{label}</span>
      <span>{waarde}</span>
    </button>
  );
}

const POPUP_UITLEG = {
  klusce: {
    titel: 'Fysieke kenmerken (KLUSCE)',
    tekst: 'De zes bouwstenen van elke atleet: Kracht, Lenigheid, Uithouding, Snelheid, Coördinatie en Evenwicht. Ze groeien traag — door de juiste training, dag na dag. Je sport bepaalt welke het zwaarst doorwegen.',
  },
  vorm: {
    titel: 'Vorm',
    tekst: 'Vorm = fitheid − vermoeidheid. Positief en groen? Je buddy piekt. Diep negatief? Overtraining: eerst rusten. Vorm pieken vlak vóór een wedstrijd heet "taperen".',
  },
  vermoeidheid: {
    titel: 'Vermoeidheid',
    tekst: 'Stijgt snel bij zware training en zakt snel bij rust. Wat vandaag vermoeidheid is, wordt na goed herstel morgen fitheid — dat heet supercompensatie.',
  },
  stress: {
    titel: 'Stress',
    tekst: 'Examens, wedstrijddruk en slaaptekort duwen de stress omhoog. Hoge stress vreet aan je herstel en slaapkwaliteit. Een ademhalingsroutine of rustdag helpt.',
  },
  rustpols: {
    titel: 'Rustpols van je buddy',
    tekst: 'Hoe vermoeider of gestrester je buddy, hoe hoger zijn rustpols in rust — precies zoals bij echte sporters. Na een zware dag blijft hij 12 tot 24 uur verhoogd (herstel van het zenuwstelsel).',
  },
};

export default function StatusBalk({ buddy, dagstaat }) {
  const [popup, setPopup] = useState(null);

  const vorm = dagstaat?.vorm ?? 0;
  const vormKleur = vorm >= 10 ? 'bg-green-50 text-green-700 border-green-200'
    : vorm <= -10 ? 'bg-red-50 text-red-700 border-red-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 md:p-5">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Hexagon stats={buddy.stats} onClick={() => setPopup('klusce')} />
        <div className="flex-grow w-full">
          <p className="text-xs font-semibold text-gray-400 mb-2">Dagstaat — tik voor uitleg</p>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <Chip emoji="🎯" label="Vorm" waarde={vorm > 0 ? `+${vorm}` : vorm} kleur={vormKleur} onClick={() => setPopup('vorm')} />
            <Chip emoji="🔋" label="Vermoeidheid" waarde={Math.round(buddy.vermoeidheid ?? 0)} kleur="bg-orange-50 text-orange-700 border-orange-200" onClick={() => setPopup('vermoeidheid')} />
            <Chip emoji="😰" label="Stress" waarde={Math.round(buddy.stress ?? 0)} kleur="bg-blue-50 text-blue-700 border-blue-200" onClick={() => setPopup('stress')} />
            <Chip emoji="❤️" label="Rustpols" waarde={`${dagstaat?.rustpols ?? 52}`} kleur="bg-rose-50 text-rose-700 border-rose-200" onClick={() => setPopup('rustpols')} />
          </div>
        </div>
      </div>

      {popup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setPopup(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-bold text-gray-800 mb-2">{POPUP_UITLEG[popup].titel}</h4>
            {popup === 'klusce' && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
                {STATS.map((s) => (
                  <div key={s.key} className="flex justify-between text-sm">
                    <span className="text-gray-600">{s.label}</span>
                    <span className="font-bold text-purple-700">{Math.round(buddy.stats?.[s.key] ?? 0)}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-sm text-gray-600">{POPUP_UITLEG[popup].tekst}</p>
            <div className="flex justify-end mt-4">
              <button type="button" onClick={() => setPopup(null)} className="text-sm font-semibold text-purple-600 px-4 py-2">Sluiten</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
