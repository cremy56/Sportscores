// src/components/sportbuddy/SuperadminTestpaneel.jsx
// Alleen zichtbaar voor super-administrators. Laat toe om de graad/leeftijd én
// alle statussen van de eigen buddy TIJDELIJK te overschrijven, zodat je live
// ziet hoe de pagina en de avatar zich aanpassen (evolutie, conditie, blessure).
//
// Belangrijk: dit schrijft NIETS naar de server. Het is een puur visuele
// preview-laag bovenop de buddy-state in de browser. Sluiten of verversen zet
// alles terug naar de echte waarden. Zo blijft het datavrije, server-gezaghebbende
// model intact — dit is enkel een ontwikkel/demonstratie-hulpmiddel.

import { useState } from 'react';

const START = {
  graad: null, K: null, fitheid: null, vermoeidheid: null, stress: null, blessure: null,
};

function Schuif({ label, waarde, min, max, onChange, suffix = '' }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
        <span>{label}</span><span>{waarde}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} value={waarde} onChange={(e) => onChange(+e.target.value)} className="w-full accent-fuchsia-600" />
    </div>
  );
}

export default function SuperadminTestpaneel({ buddy, onOverride }) {
  const [open, setOpen] = useState(false);
  const [ov, setOv] = useState(START);

  // Huidige effectieve waarde (override of echte buddy-waarde)
  const graad = ov.graad ?? (buddy.weergave?.graad ?? 1);
  const K = ov.K ?? Math.round(buddy.stats?.K ?? 10);
  const fitheid = ov.fitheid ?? Math.round(buddy.fitheid ?? 0);
  const vermoeidheid = ov.vermoeidheid ?? Math.round(buddy.vermoeidheid ?? 0);
  const stress = ov.stress ?? Math.round(buddy.stress ?? 10);
  const blessure = ov.blessure ?? !!buddy.gezondheid?.blessure;

  // Override naar boven doorgeven (Sportbuddy past de getoonde buddy aan)
  const pas = (nieuw) => {
    const volgende = { ...ov, ...nieuw };
    setOv(volgende);
    const g = volgende.graad ?? (buddy.weergave?.graad ?? 1);
    onOverride({
      weergave: { ...buddy.weergave, graad: g, lichaam: buddy.weergave?.lichaam ?? 'neutraal' },
      stats: { ...buddy.stats, K: volgende.K ?? buddy.stats?.K ?? 10 },
      fitheid: volgende.fitheid ?? buddy.fitheid ?? 0,
      vermoeidheid: volgende.vermoeidheid ?? buddy.vermoeidheid ?? 0,
      stress: volgende.stress ?? buddy.stress ?? 10,
      gezondheid: {
        ...buddy.gezondheid,
        blessure: (volgende.blessure ?? !!buddy.gezondheid?.blessure)
          ? (buddy.gezondheid?.blessure || { type: 'test', tot: '2099-01-01' })
          : null,
      },
    });
  };

  const herstel = () => { setOv(START); onOverride(null); };

  if (!open) {
    return (
      <div className="max-w-5xl mx-auto mt-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs font-semibold text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-200 rounded-full px-4 py-2 hover:bg-fuchsia-100"
        >
          🛠️ Testpaneel (superadmin)
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto mt-6 bg-white rounded-2xl shadow-lg border-2 border-fuchsia-200 p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-fuchsia-800">🛠️ Testpaneel — superadmin</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>
      <p className="text-xs text-gray-500 mb-4">Overschrijf tijdelijk graad en statussen om te zien hoe de pagina en avatar reageren. Dit wordt <strong>niet opgeslagen</strong> — verversen herstelt alles.</p>

      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
            <span>Graad (leeftijd-lichaam)</span>
            <span>{graad}e graad · {['','12-13','14-15','16-17'][graad]} j</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[1, 2, 3].map((g) => (
              <button key={g} type="button" onClick={() => pas({ graad: g })}
                className={`px-2 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${graad === g ? 'border-fuchsia-600 bg-fuchsia-50 text-fuchsia-800' : 'border-gray-200 text-gray-600'}`}>
                {g}e graad
              </button>
            ))}
          </div>
        </div>
        <Schuif label="Kracht (spiergroei avatar)" waarde={K} min={0} max={100} onChange={(v) => pas({ K: v })} />
        <Schuif label="Fitheid" waarde={fitheid} min={0} max={100} onChange={(v) => pas({ fitheid: v })} />
        <Schuif label="Vermoeidheid (→ conditie/houding)" waarde={vermoeidheid} min={0} max={100} onChange={(v) => pas({ vermoeidheid: v })} />
        <Schuif label="Stress" waarde={stress} min={0} max={100} onChange={(v) => pas({ stress: v })} />
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Blessure (verbandje avatar)</div>
          <button type="button" onClick={() => pas({ blessure: !blessure })}
            className={`w-full px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${blessure ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600'}`}>
            {blessure ? '🩹 Geblesseerd (aan)' : 'Niet geblesseerd'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button type="button" onClick={herstel} className="text-xs font-semibold text-gray-600 border border-gray-300 rounded-full px-4 py-2 hover:border-fuchsia-400">
          ↺ Herstel echte waarden
        </button>
        <span className="text-xs text-gray-400">Tip: zet de graad op 3 en Kracht op 90 om de spierdefinitie te zien.</span>
      </div>
    </div>
  );
}
