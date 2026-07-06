// src/components/sportbuddy/tools/HartslagLab.jsx
// Interactieve tool voor de module Hartfrequentie (BV2_01.04.01 · BV3_01.04). Vier delen,
// elk met een infokader ernaast (PC) of eronder (smartphone):
//   1. Hartslagsimulator (live grafiek: inspanning/leeftijd/rustpols) + info: meetmethoden
//   2. Tel de hartslag (manueel meten: 15 s tellen × 4)
//   3. Lees de hartslag (zones interpreteren) + info: de praattest
//   4. De RPE-schaal (Borg 1-10): info + inschattingsoefening
// Datavrij: alles gaat over de buddy of gesimuleerde situaties — de leerling
// meet of registreert niets van zichzelf.

import { useState, useEffect, useRef } from 'react';

const ZONES = [
  { naam: 'Rust', kleur: '#22c55e', min: 0.0, max: 0.5, uitleg: 'Rustig — herstel en dagdagelijkse activiteit.' },
  { naam: 'Licht', kleur: '#3b82f6', min: 0.5, max: 0.6, uitleg: 'Opwarmen, actief herstel, vetverbranding.' },
  { naam: 'Matig', kleur: '#f59e0b', min: 0.6, max: 0.7, uitleg: 'Basisconditie opbouwen — je kunt nog praten.' },
  { naam: 'Intensief', kleur: '#ef4444', min: 0.7, max: 0.85, uitleg: 'Conditie verbeteren — praten wordt lastig.' },
  { naam: 'Maximaal', kleur: '#b91c1c', min: 0.85, max: 1.01, uitleg: 'Korte pieken — niet lang vol te houden.' },
];

function zoneVanBpm(bpm, leeftijd, rustpols) {
  const max = 220 - leeftijd;
  const reserve = max - rustpols;
  const intensiteit = reserve > 0 ? (bpm - rustpols) / reserve : 0;
  for (const z of ZONES) {
    if (intensiteit < z.max) return z;
  }
  return ZONES[ZONES.length - 1];
}

// ─── Bouwstenen ───────────────────────────────────────────────────────────────
function InfoKader({ titel, children }) {
  return (
    <aside className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 h-full">
      <p className="text-xs font-bold text-indigo-700 mb-2">ℹ️ {titel}</p>
      <div className="text-xs text-indigo-900 space-y-2 leading-relaxed">{children}</div>
    </aside>
  );
}

function Sectie({ tool, info }) {
  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-stretch">
      {tool}
      {info}
    </div>
  );
}

function HartMonitor({ bpm, actief = true }) {
  const [klop, setKlop] = useState(false);
  useEffect(() => {
    if (!actief) return undefined;
    const interval = 60000 / bpm;
    const id = setInterval(() => setKlop((k) => !k), interval / 2);
    return () => clearInterval(id);
  }, [bpm, actief]);
  return (
    <span className={`inline-block text-4xl transition-transform duration-100 ${klop && actief ? 'scale-125' : 'scale-100'}`}>❤️</span>
  );
}

// ─── 1. Hartslagsimulator (live grafiek) ──────────────────────────────────────
const NIVEAUS = [
  { id: 'rust', label: 'Rust', f: 0.05 },
  { id: 'licht', label: 'Licht', f: 0.55 },
  { id: 'matig', label: 'Matig', f: 0.65 },
  { id: 'intensief', label: 'Intensief', f: 0.78 },
  { id: 'maximaal', label: 'Maximaal', f: 0.93 },
];
const BUFFER = 140;   // aantal punten in beeld (~14 s geschiedenis)
const TICK_MS = 100;

function HartslagSimulator() {
  const [leeftijd, setLeeftijd] = useState(15);
  const [rustpols, setRustpols] = useState(65);
  const [niveau, setNiveau] = useState(0);
  const [actief, setActief] = useState(true);
  const [buffer, setBuffer] = useState(() => Array(BUFFER).fill(65));
  // "Piek-energie" voor grillige uitschieters (hartslagvariabiliteit):
  // een piek ontstaat plots en ebt over enkele punten weg — zo krijgt de lijn
  // het grillige karakter van een echte hartslagmeting.
  const piekRef = useRef(0);
  const faseRef = useRef(0);

  const max = 220 - leeftijd;

  useEffect(() => {
    if (!actief) return undefined;
    const id = setInterval(() => {
      setBuffer((b) => {
        const reserve = max - rustpols;
        // Doelhartslag volgens Karvonen bij het gekozen inspanningsniveau
        const doel = rustpols + NIVEAUS[niveau].f * reserve;
        const laatst = b[b.length - 1];

        // Grillige dynamiek: trage golf + ruis + sporadische pieken die uitdoven
        faseRef.current += 0.25;
        const golf = Math.sin(faseRef.current) * 1.1;
        const ruis = (Math.random() - 0.5) * 2.6;
        piekRef.current *= 0.72;
        if (Math.random() < 0.10) {
          piekRef.current += (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 4);
        }

        let volgend = laatst + (doel - laatst) * 0.05 + golf + ruis + piekRef.current * 0.4;
        volgend = Math.max(38, Math.min(max + 3, volgend));
        return [...b.slice(1), volgend];
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [actief, niveau, leeftijd, rustpols, max]);

  const reset = () => {
    setBuffer(Array(BUFFER).fill(rustpols));
    setNiveau(0);
    setActief(true);
  };

  const huidig = Math.round(buffer[buffer.length - 1]);
  const zone = zoneVanBpm(huidig, leeftijd, rustpols);

  // ── SVG-grafiek ──
  const W = 620, H = 260, LINKS = 40, BOVEN = 12, ONDER = 8;
  const yVan = (bpm) => BOVEN + (1 - (bpm - 30) / (225 - 30)) * (H - BOVEN - ONDER);
  const xVan = (i) => LINKS + (i / (BUFFER - 1)) * (W - LINKS - 6);
  const lijn = buffer.map((bpm, i) => `${xVan(i).toFixed(1)},${yVan(bpm).toFixed(1)}`).join(' ');
  const vlak = `${LINKS},${yVan(30)} ${lijn} ${xVan(BUFFER - 1)},${yVan(30)}`;
  const yTicks = [40, 80, 120, 160, 200];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-gray-800">Hartslagsimulator</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActief(!actief)}
            className="text-sm font-bold bg-gray-100 hover:bg-gray-200 rounded-full w-9 h-9"
            aria-label={actief ? 'Pauzeer' : 'Speel af'}
          >
            {actief ? '⏸' : '▶'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="text-sm font-bold bg-gray-100 hover:bg-gray-200 rounded-full w-9 h-9"
            aria-label="Reset"
          >
            ↺
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-4">Verhoog de inspanning en zie de hartslag klimmen. Verander leeftijd of rustpols en zie de lijnen mee verschuiven.</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Raster */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={LINKS} y1={yVan(t)} x2={W - 6} y2={yVan(t)} stroke="#f1f5f9" strokeWidth="1" />
            <text x={LINKS - 6} y={yVan(t)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#94a3b8">{t}</text>
          </g>
        ))}
        {/* Theoretisch maximum (220 − leeftijd) */}
        <line x1={LINKS} y1={yVan(max)} x2={W - 6} y2={yVan(max)} stroke="#22c55e" strokeWidth="1.5" strokeDasharray="6 4" />
        <text x={W - 10} y={yVan(max) - 5} textAnchor="end" fontSize="10" fontWeight="700" fill="#16a34a">Theoretisch max · {max} bpm</text>
        {/* Rustpols */}
        <line x1={LINKS} y1={yVan(rustpols)} x2={W - 6} y2={yVan(rustpols)} stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="3 4" />
        <text x={W - 10} y={yVan(rustpols) + 12} textAnchor="end" fontSize="10" fill="#64748b">Rustpols · {rustpols} bpm</text>
        {/* Hartslaglijn */}
        <polygon points={vlak} fill="#7c3aed" opacity="0.08" />
        <polyline points={lijn} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx={xVan(BUFFER - 1)} cy={yVan(buffer[BUFFER - 1])} r="5" fill={zone.kleur} stroke="#fff" strokeWidth="2" />
      </svg>

      {/* Live-cijfers */}
      <div className="grid grid-cols-3 gap-3 mt-3 mb-4 text-center">
        <div className="bg-gray-50 rounded-xl py-2">
          <div className="text-xl font-bold text-gray-800 tabular-nums">{huidig}</div>
          <div className="text-[10px] text-gray-400">huidige hartslag</div>
        </div>
        <div className="bg-gray-50 rounded-xl py-2">
          <div className="text-xl font-bold" style={{ color: zone.kleur }}>{zone.naam}</div>
          <div className="text-[10px] text-gray-400">huidige zone</div>
        </div>
        <div className="bg-gray-50 rounded-xl py-2">
          <div className="text-xl font-bold text-gray-800 tabular-nums">{max}</div>
          <div className="text-[10px] text-gray-400">max hartslag</div>
        </div>
      </div>

      {/* Inspanningsniveau */}
      <p className="text-sm font-semibold text-gray-600 mb-2">Inspanningsniveau</p>
      <div className="grid grid-cols-5 gap-1.5 mb-5">
        {NIVEAUS.map((n, i) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setNiveau(i)}
            className={`px-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
              niveau === i ? 'border-purple-600 bg-purple-50 text-purple-800' : 'border-gray-200 text-gray-600 hover:border-purple-300'
            }`}
          >
            {n.label}
          </button>
        ))}
      </div>

      {/* Schuiven */}
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <div className="flex justify-between text-sm font-semibold text-gray-600 mb-1">
            <span>Leeftijd</span><span>{leeftijd} jaar</span>
          </div>
          <input type="range" min="10" max="60" value={leeftijd} onChange={(e) => setLeeftijd(+e.target.value)} className="w-full accent-purple-600" />
        </div>
        <div>
          <div className="flex justify-between text-sm font-semibold text-gray-600 mb-1">
            <span>Rustpols</span><span>{rustpols} bpm</span>
          </div>
          <input type="range" min="40" max="90" value={rustpols} onChange={(e) => setRustpols(+e.target.value)} className="w-full accent-purple-600" />
        </div>
      </div>
    </div>
  );
}

// ─── 2. Tel de hartslag (manueel meten) ───────────────────────────────────────
const TEL_BPMS = [72, 96, 120, 144, 168];
const TEL_DUUR = 15;

function TelDeHartslag() {
  const [fase, setFase] = useState('idle'); // idle | tellen | invullen | resultaat
  const [bpm, setBpm] = useState(null);
  const [seconden, setSeconden] = useState(TEL_DUUR);
  const [geteld, setGeteld] = useState('');
  const timerRef = useRef(null);

  const start = () => {
    const nieuweBpm = TEL_BPMS[Math.floor(Math.random() * TEL_BPMS.length)];
    setBpm(nieuweBpm);
    setSeconden(TEL_DUUR);
    setGeteld('');
    setFase('tellen');
  };

  useEffect(() => {
    if (fase !== 'tellen') return undefined;
    timerRef.current = setInterval(() => {
      setSeconden((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          setFase('invullen');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [fase]);

  const werkelijk = bpm;
  const geraden = parseInt(geteld, 10) * 4;
  const verschil = Number.isFinite(geraden) ? Math.abs(geraden - werkelijk) : null;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="font-bold text-gray-800 mb-1">Tel de hartslag</h3>
      <p className="text-xs text-gray-500 mb-4">Zo meet je manueel: tel de slagen gedurende 15 seconden en vermenigvuldig met 4. Oefen het hier op het hart van je buddy.</p>

      {fase === 'idle' && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-600 mb-4">Straks klopt het hart 15 seconden lang. Tel de kloppen — de teller staat verborgen!</p>
          <button type="button" onClick={start} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl font-bold">Start de meting</button>
        </div>
      )}

      {fase === 'tellen' && (
        <div className="text-center py-4">
          <HartMonitor bpm={bpm} />
          <div className="text-3xl font-bold text-gray-800 tabular-nums mt-3">{seconden}<span className="text-sm font-normal text-gray-400"> s</span></div>
          <p className="text-xs text-gray-400 mt-1">Tellen maar!</p>
        </div>
      )}

      {fase === 'invullen' && (
        <div className="text-center py-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Hoeveel kloppen telde je in 15 seconden?</p>
          <input
            type="number" min="5" max="60" value={geteld}
            onChange={(e) => setGeteld(e.target.value)}
            className="w-24 text-center text-xl font-bold border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-purple-500 focus:outline-none"
          />
          <div className="mt-4">
            <button
              type="button"
              disabled={!geteld}
              onClick={() => setFase('resultaat')}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold disabled:opacity-40"
            >
              Bereken (× 4)
            </button>
          </div>
        </div>
      )}

      {fase === 'resultaat' && (
        <div className="text-center py-4">
          <div className="text-4xl mb-2">{verschil <= 8 ? '🎯' : '🔁'}</div>
          <p className="text-sm text-gray-700 mb-1">Jij telde <strong>{geteld}</strong> kloppen → {geteld} × 4 = <strong>{geraden} bpm</strong></p>
          <p className="text-sm text-gray-700 mb-3">Het hart klopte werkelijk op <strong>{werkelijk} bpm</strong>.</p>
          <p className={`text-sm font-semibold mb-4 ${verschil <= 8 ? 'text-green-600' : 'text-amber-600'}`}>
            {verschil <= 8
              ? 'Uitstekend gemeten — minder dan 2 kloppen ernaast!'
              : `Er zat ${verschil} bpm verschil op. Manueel meten vraagt oefening — probeer nog eens.`}
          </p>
          <button type="button" onClick={start} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">Nog een meting</button>
        </div>
      )}
    </div>
  );
}

// ─── 3. Lees de hartslag ──────────────────────────────────────────────────────
const OEFENINGEN = [
  { situatie: 'Je buddy zit rustig op de bank een film te kijken.', bpm: 70, verwacht: 'Rust' },
  { situatie: 'Je buddy jogt op een tempo waarbij hij nog kan babbelen.', bpm: 155, verwacht: 'Matig' },
  { situatie: 'Je buddy sprint de laatste 100 meter voluit naar de finish.', bpm: 195, verwacht: 'Maximaal' },
  { situatie: 'Je buddy fietst stevig door, praten lukt nog net met moeite.', bpm: 175, verwacht: 'Intensief' },
  { situatie: 'Je buddy wandelt stevig door om op te warmen.', bpm: 140, verwacht: 'Licht' },
];

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
        <div className="flex items-center justify-center gap-3">
          <HartMonitor bpm={oef.bpm} />
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-800 tabular-nums">{oef.bpm}</div>
            <div className="text-xs text-gray-400 -mt-1">bpm</div>
          </div>
        </div>
      </div>

      <p className="text-sm font-semibold text-gray-600 mb-2">In welke zone zit je buddy? (15 jaar, rustpols 65)</p>
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

// ─── 4. De RPE-schaal (Borg 1-10) ─────────────────────────────────────────────
const RPE_SCHAAL = [
  { rpe: '1-2', label: 'Heel licht', omschrijving: 'Moeiteloos — je kunt zingen.' },
  { rpe: '3-4', label: 'Licht', omschrijving: 'Vlot praten lukt makkelijk.' },
  { rpe: '5-6', label: 'Matig', omschrijving: 'Praten in korte zinnen.' },
  { rpe: '7-8', label: 'Zwaar', omschrijving: 'Hooguit enkele woorden.' },
  { rpe: '9-10', label: 'Maximaal', omschrijving: 'Praten onmogelijk — alles geven.' },
];

const RPE_OEFENINGEN = [
  { situatie: 'Je buddy jogt heel rustig uit na de training en kan er vlot bij vertellen.', min: 3, max: 4 },
  { situatie: 'Stevige duurloop: je buddy antwoordt nog, maar enkel in korte zinnen.', min: 5, max: 6 },
  { situatie: 'Intervalsprints: na elke sprint hangt je buddy over zijn knieën, praten lukt niet.', min: 9, max: 10 },
  { situatie: 'Zware heuvelloop: je buddy perst er hooguit "ja" of "nee" uit.', min: 7, max: 8 },
];

function RpeOefening() {
  const [index, setIndex] = useState(0);
  const [waarde, setWaarde] = useState(5);
  const [beoordeeld, setBeoordeeld] = useState(false);
  const [score, setScore] = useState(0);
  const [klaar, setKlaar] = useState(false);
  const oef = RPE_OEFENINGEN[index];
  const juist = waarde >= oef.min && waarde <= oef.max;

  const beoordeel = () => {
    setBeoordeeld(true);
    if (juist) setScore((s) => s + 1);
  };
  const volgende = () => {
    if (index < RPE_OEFENINGEN.length - 1) {
      setIndex(index + 1); setWaarde(5); setBeoordeeld(false);
    } else {
      setKlaar(true);
    }
  };
  const opnieuw = () => { setIndex(0); setWaarde(5); setBeoordeeld(false); setScore(0); setKlaar(false); };

  if (klaar) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
        <div className="text-5xl mb-3">{score >= 3 ? '🎉' : '💪'}</div>
        <p className="text-lg font-bold text-gray-800 mb-1">{score} / {RPE_OEFENINGEN.length} juist ingeschat</p>
        <p className="text-sm text-gray-500 mb-5">Met de RPE-schaal kun je élke training doseren — ook zonder hartslagmeter.</p>
        <button type="button" onClick={opnieuw} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">Opnieuw oefenen</button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">Schat de RPE in</h3>
        <span className="text-xs text-gray-400">{index + 1} / {RPE_OEFENINGEN.length}</span>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 mb-4">
        <p className="text-sm text-gray-600">{oef.situatie}</p>
      </div>

      <div className="flex justify-between text-sm font-semibold text-gray-600 mb-1">
        <span>Hoe zwaar voelt dit? (RPE)</span>
        <span className="text-purple-700 text-lg tabular-nums">{waarde}</span>
      </div>
      <input
        type="range" min="1" max="10" value={waarde}
        disabled={beoordeeld}
        onChange={(e) => setWaarde(+e.target.value)}
        className="w-full accent-purple-600"
      />
      <div className="flex justify-between text-[10px] text-gray-400 mb-4">
        <span>1 · heel licht</span><span>5 · matig</span><span>10 · maximaal</span>
      </div>

      {!beoordeeld ? (
        <div className="flex justify-end">
          <button type="button" onClick={beoordeel} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">Controleer</button>
        </div>
      ) : (
        <div>
          <div className={`rounded-xl p-3 text-sm ${juist ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
            {juist ? '✅ Goed ingeschat! ' : `❌ Deze inspanning hoort bij RPE ${oef.min}-${oef.max}. `}
            Het praatgevoel is je kompas: hoe minder woorden er nog uit kunnen, hoe hoger de RPE.
          </div>
          <div className="flex justify-end mt-3">
            <button type="button" onClick={volgende} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">
              {index < RPE_OEFENINGEN.length - 1 ? 'Volgende' : 'Bekijk resultaat'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Samenstelling ────────────────────────────────────────────────────────────
export default function HartslagLab() {
  return (
    <div className="space-y-6">
      <Sectie
        tool={<HartslagSimulator />}
        info={(
          <div className="flex flex-col gap-4 h-full">
            <InfoKader titel="Hoe meet je je hartslag?">
              <p><strong>Manueel:</strong> leg wijs- en middelvinger op de binnenkant van je pols (of naast je strottenhoofd), tel 15 seconden en doe × 4. Nooit met je duim — die heeft een eigen polsslag.</p>
              <p><strong>Hartslagmeters:</strong> een borstband meet elektrisch en is het nauwkeurigst; horloges meten optisch aan de pols — handig, maar iets minder precies bij intensieve sport.</p>
              <p><strong>Rustpols meten?</strong> Doe het 's ochtends vóór het opstaan — dan is hij het betrouwbaarst.</p>
            </InfoKader>
            <InfoKader titel="De Karvonen-formule">
              <p>De simulator rekent zoals trainers: <strong>doelhartslag = rustpols + intensiteit% × (max − rustpols)</strong>. Dat verschil (max − rustpols) heet je <strong>hartslagreserve</strong>.</p>
              <p>Voorbeeld (15 jaar, rustpols 65): bij 70% is het doel 65 + 0,70 × (205 − 65) = <strong>163 bpm</strong>.</p>
              <p>Waarom beter dan gewoon %-van-max? Omdat je rustpols — dus je conditie — meetelt.</p>
              <p>Probeer maar in de simulator: op <em>Rust</em> zie je de lijn duidelijk mee verschuiven met je rustpols, op <em>Maximaal</em> amper. Hoe dichter bij je maximum, hoe kleiner de rol van je rustpols — dat is exact wat de formule zegt.</p>
            </InfoKader>
          </div>
        )}
      />
      <Sectie
        tool={<TelDeHartslag />}
        info={(
          <InfoKader titel="Waarom 15 seconden × 4?">
            <p>Een volle minuut tellen is nauwkeuriger, maar duurt lang en je verliest snel de tel. 15 seconden tellen en × 4 is de klassieke sportmethode: snel én betrouwbaar genoeg.</p>
            <p>Eén klop verkeerd geteld = 4 bpm verschil in je resultaat. Daarom: goed focussen!</p>
          </InfoKader>
        )}
      />
      <Sectie
        tool={<LeesDeHartslag />}
        info={(
          <InfoKader titel="De praattest">
            <p>Geen meter bij de hand? Je stem verraadt je zone: kun je vlot praten → licht. Korte zinnen → matig. Enkele woorden → intensief. Geen woord meer → maximaal.</p>
            <p>Zo koppel je wat je <em>voelt</em> aan wat de cijfers zeggen.</p>
          </InfoKader>
        )}
      />
      <Sectie
        tool={<RpeOefening />}
        info={(
          <InfoKader titel="De RPE-schaal (Borg)">
            <p>RPE = Rate of Perceived Exertion: hoe zwaar een inspanning <em>voelt</em>, op een schaal van 1 tot 10. Trainers gebruiken RPE om trainingen te doseren — het werkt overal, zonder apparaat.</p>
            <div className="space-y-1 pt-1">
              {RPE_SCHAAL.map((r) => (
                <div key={r.rpe} className="flex gap-2">
                  <span className="font-bold w-8 shrink-0">{r.rpe}</span>
                  <span><strong>{r.label}</strong> — {r.omschrijving}</span>
                </div>
              ))}
            </div>
          </InfoKader>
        )}
      />
    </div>
  );
}
