// src/components/sportbuddy/tools/HartslagLab.jsx
// Interactieve tool voor de Hart-module (eindterm I.8).
// Datavrij: de leeftijd is een SCHUIF (geen invoer van de leerling zelf), en de
// oefening gaat over gesimuleerde situaties, niet over de eigen hartslag.
// Twee delen:
//   1. Zonecalculator — schuif leeftijd + rustpols → zones (Karvonen), live.
//   2. "Lees de hartslag" — geanimeerde bpm-teller bij een situatie; de leerling
//      kiest de juiste zone en krijgt uitleg. Puur oefenen, niets opgeslagen.

import { useState, useEffect, useRef } from 'react';

const ZONES = [
  { naam: 'Rust', kleur: '#22c55e', min: 0.0, max: 0.5, uitleg: 'Rustig — herstel en dagdagelijkse activiteit.' },
  { naam: 'Licht', kleur: '#3b82f6', min: 0.5, max: 0.6, uitleg: 'Opwarmen, actief herstel, vetverbranding.' },
  { naam: 'Matig', kleur: '#f59e0b', min: 0.6, max: 0.7, uitleg: 'Basisconditie opbouwen — je kunt nog praten.' },
  { naam: 'Intensief', kleur: '#ef4444', min: 0.7, max: 0.85, uitleg: 'Conditie verbeteren — praten wordt lastig.' },
  { naam: 'Maximaal', kleur: '#b91c1c', min: 0.85, max: 1.01, uitleg: 'Korte pieken — niet lang vol te houden.' },
];

// Karvonen: doelhartslag = rustpols + intensiteit × (max − rustpols)
function zoneVanBpm(bpm, leeftijd, rustpols) {
  const max = 220 - leeftijd;
  const reserve = max - rustpols;
  const intensiteit = reserve > 0 ? (bpm - rustpols) / reserve : 0;
  for (const z of ZONES) {
    if (intensiteit < z.max) return z;
  }
  return ZONES[ZONES.length - 1];
}

const OEFENINGEN = [
  { situatie: 'Je buddy zit rustig op de bank een film te kijken.', bpm: 70, verwacht: 'Rust' },
  { situatie: 'Je buddy jogt op een tempo waarbij hij nog kan babbelen.', bpm: 155, verwacht: 'Matig' },
  { situatie: 'Je buddy sprint de laatste 100 meter voluit naar de finish.', bpm: 195, verwacht: 'Maximaal' },
  { situatie: 'Je buddy fietst stevig door, praten lukt nog net met moeite.', bpm: 175, verwacht: 'Intensief' },
  { situatie: 'Je buddy wandelt stevig door om op te warmen.', bpm: 140, verwacht: 'Licht' },
];

// Geanimeerd hartje + bpm-teller
function HartMonitor({ bpm }) {
  const [klop, setKlop] = useState(false);
  useEffect(() => {
    const interval = 60000 / bpm;
    const id = setInterval(() => setKlop((k) => !k), interval / 2);
    return () => clearInterval(id);
  }, [bpm]);
  return (
    <div className="flex items-center justify-center gap-3">
      <span className={`text-4xl transition-transform duration-100 ${klop ? 'scale-125' : 'scale-100'}`}>❤️</span>
      <div className="text-center">
        <div className="text-3xl font-bold text-gray-800 tabular-nums">{bpm}</div>
        <div className="text-xs text-gray-400 -mt-1">bpm</div>
      </div>
    </div>
  );
}

function Zonecalculator() {
  const [leeftijd, setLeeftijd] = useState(15);
  const [rustpols, setRustpols] = useState(65);
  const max = 220 - leeftijd;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="font-bold text-gray-800 mb-1">Zonecalculator</h3>
      <p className="text-xs text-gray-500 mb-4">Schuif en zie hoe de trainingszones verschuiven. Formule: maximale hartslag = 220 − leeftijd.</p>

      <div className="space-y-4 mb-5">
        <div>
          <div className="flex justify-between text-sm font-semibold text-gray-600 mb-1">
            <span>Leeftijd</span><span>{leeftijd} jaar</span>
          </div>
          <input type="range" min="10" max="18" value={leeftijd} onChange={(e) => setLeeftijd(+e.target.value)} className="w-full accent-purple-600" />
        </div>
        <div>
          <div className="flex justify-between text-sm font-semibold text-gray-600 mb-1">
            <span>Rustpols</span><span>{rustpols} bpm</span>
          </div>
          <input type="range" min="40" max="90" value={rustpols} onChange={(e) => setRustpols(+e.target.value)} className="w-full accent-purple-600" />
        </div>
      </div>

      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2 mb-4">
        <span className="text-sm text-gray-600">Maximale hartslag</span>
        <span className="text-lg font-bold text-gray-800">{max} bpm</span>
      </div>

      <div className="space-y-1.5">
        {ZONES.map((z) => {
          const van = Math.round(rustpols + z.min * (max - rustpols));
          const tot = Math.round(rustpols + Math.min(z.max, 1) * (max - rustpols));
          return (
            <div key={z.naam} className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: z.kleur }} />
              <span className="text-sm font-semibold text-gray-700 w-20 shrink-0">{z.naam}</span>
              <span className="text-sm text-gray-500 tabular-nums w-24 shrink-0">{van}–{tot} bpm</span>
              <span className="text-xs text-gray-400 hidden sm:block truncate">{z.uitleg}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeesDeHartslag() {
  const [index, setIndex] = useState(0);
  const [gekozen, setGekozen] = useState(null);
  const [score, setScore] = useState(0);
  const [klaar, setKlaar] = useState(false);
  const oef = OEFENINGEN[index];
  const juisteZone = zoneVanBpm(oef.bpm, 15, 65);

  const kies = (zoneNaam) => {
    if (gekozen) return;
    setGekozen(zoneNaam);
    if (zoneNaam === oef.verwacht) setScore((s) => s + 1);
  };
  const volgende = () => {
    if (index < OEFENINGEN.length - 1) {
      setIndex(index + 1); setGekozen(null);
    } else {
      setKlaar(true);
    }
  };
  const opnieuw = () => { setIndex(0); setGekozen(null); setScore(0); setKlaar(false); };

  if (klaar) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
        <div className="text-5xl mb-3">{score >= 4 ? '🎉' : '💪'}</div>
        <p className="text-lg font-bold text-gray-800 mb-1">{score} / {OEFENINGEN.length} juist</p>
        <p className="text-sm text-gray-500 mb-5">Hartslag lezen is een vaardigheid — hoe vaker je oefent, hoe beter je aanvoelt in welke zone je zit.</p>
        <button type="button" onClick={opnieuw} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">Opnieuw oefenen</button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">Lees de hartslag</h3>
        <span className="text-xs text-gray-400">{index + 1} / {OEFENINGEN.length}</span>
      </div>

      <div className="bg-gray-50 rounded-xl p-5 mb-4">
        <p className="text-sm text-gray-600 mb-4">{oef.situatie}</p>
        <HartMonitor bpm={oef.bpm} />
      </div>

      <p className="text-sm font-semibold text-gray-600 mb-2">In welke zone zit je buddy?</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ZONES.map((z) => {
          const isJuist = z.naam === oef.verwacht;
          const isGekozen = gekozen === z.naam;
          let stijl = 'border-gray-200 text-gray-700 hover:border-purple-300';
          if (gekozen) {
            if (isJuist) stijl = 'border-green-500 bg-green-50 text-green-800';
            else if (isGekozen) stijl = 'border-red-500 bg-red-50 text-red-800';
            else stijl = 'border-gray-200 text-gray-400';
          }
          return (
            <button key={z.naam} type="button" disabled={!!gekozen} onClick={() => kies(z.naam)}
              className={`px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${stijl}`}>
              {z.naam}
            </button>
          );
        })}
      </div>

      {gekozen && (
        <div className="mt-4">
          <div className={`rounded-xl p-3 text-sm ${gekozen === oef.verwacht ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
            {gekozen === oef.verwacht ? '✅ Juist! ' : `❌ Het was "${oef.verwacht}". `}
            Bij {oef.bpm} bpm zit je buddy in de zone <strong>{juisteZone.naam}</strong>: {juisteZone.uitleg}
          </div>
          <div className="flex justify-end mt-3">
            <button type="button" onClick={volgende} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">
              {index < OEFENINGEN.length - 1 ? 'Volgende' : 'Bekijk resultaat'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HartslagLab() {
  return (
    <div className="space-y-6">
      <Zonecalculator />
      <LeesDeHartslag />
    </div>
  );
}
