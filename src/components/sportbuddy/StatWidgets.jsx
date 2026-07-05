// src/components/sportbuddy/StatWidgets.jsx
// Herbruikbare weergave-onderdelen: dagstaat als balkjes + KLUSCE-hexagon.
// Gedeeld door de hoofdpagina en (later) de modulepagina's.

import { STATS } from '../../data/sportbuddy/sporten';

// ─── Eén meterbalk ────────────────────────────────────────────────────────────
export function MeterBalk({ label, waarde, kleur = 'from-purple-500 to-blue-500', suffix = '' }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
        <span>{label}</span>
        <span>{Math.round(waarde)}{suffix}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5">
        <div
          className={`bg-gradient-to-r ${kleur} h-2.5 rounded-full transition-all duration-500`}
          style={{ width: `${Math.max(2, Math.min(100, waarde))}%` }}
        />
      </div>
    </div>
  );
}

// ─── Vormmeter (−50..+50, wijzer op kleurverloop) ─────────────────────────────
export function VormMeter({ vorm }) {
  const positie = ((vorm + 50) / 100) * 100;
  const kleur = vorm >= 10 ? 'text-green-600' : vorm <= -10 ? 'text-red-600' : 'text-amber-600';
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
        <span>Vorm</span>
        <span className={kleur}>{vorm > 0 ? `+${vorm}` : vorm}</span>
      </div>
      <div className="relative w-full bg-gradient-to-r from-red-200 via-amber-100 to-green-200 rounded-full h-2.5">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-gray-800 rounded-full border-2 border-white shadow"
          style={{ left: `calc(${Math.max(2, Math.min(98, positie))}% - 7px)` }}
        />
      </div>
    </div>
  );
}

// ─── Dagstaat: alle balkjes samen ─────────────────────────────────────────────
export function DagstaatBalken({ buddy, dagstaat }) {
  return (
    <div className="space-y-3">
      <VormMeter vorm={dagstaat?.vorm ?? 0} />
      <MeterBalk label="Fitheid" waarde={buddy.fitheid ?? 0} kleur="from-green-400 to-green-600" />
      <MeterBalk label="Vermoeidheid" waarde={buddy.vermoeidheid ?? 0} kleur="from-amber-400 to-red-500" />
      <MeterBalk label="Stress" waarde={buddy.stress ?? 0} kleur="from-blue-400 to-indigo-600" />
      <div className="flex items-center justify-between bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5">
        <span className="text-xs font-semibold text-rose-700">❤️ Rustpols buddy</span>
        <span className="text-lg font-bold text-rose-800">{dagstaat?.rustpols ?? 52}<span className="text-xs font-normal text-rose-400"> bpm</span></span>
      </div>
    </div>
  );
}

// ─── KLUSCE-hexagon (radar) ───────────────────────────────────────────────────
export function KlusceHexagon({ stats, size = 150, onClick }) {
  const keys = STATS.map((s) => s.key);
  const cx = 60, cy = 60, r = 44;
  const punt = (i, straal) => {
    const hoek = (Math.PI / 3) * i - Math.PI / 2;
    return [cx + straal * Math.cos(hoek), cy + straal * Math.sin(hoek)];
  };
  const raster = [0.33, 0.66, 1].map((f) => keys.map((_, i) => punt(i, r * f).join(',')).join(' '));
  const dataPunten = keys.map((k, i) => {
    const waarde = Math.max(4, Math.min(100, stats?.[k] ?? 0)) / 100;
    return punt(i, r * waarde).join(',');
  }).join(' ');

  const Svg = (
    <svg viewBox="0 0 120 120" width={size} height={size}>
      {raster.map((pts, i) => <polygon key={i} points={pts} fill="none" stroke="#e5e7eb" strokeWidth="1" />)}
      {keys.map((_, i) => {
        const [x, y] = punt(i, r);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e5e7eb" strokeWidth="1" />;
      })}
      <polygon points={dataPunten} fill="#7c3aed" fillOpacity="0.35" stroke="#7c3aed" strokeWidth="2" />
      {keys.map((k, i) => {
        const [x, y] = punt(i, r + 10);
        return <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="700" fill="#6b7280">{k}</text>;
      })}
    </svg>
  );

  if (onClick) {
    return <button type="button" onClick={onClick} className="shrink-0" aria-label="Toon fysieke kenmerken">{Svg}</button>;
  }
  return <div className="shrink-0">{Svg}</div>;
}
