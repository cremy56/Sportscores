// src/components/sportbuddy/tools/ClutchShot.jsx
// "Clutch Shot"-simulator voor de Mentaal-module: de beslissende vrije worp.
// Toont hoe het zenuwstelsel de fijne motoriek stuurt, en hoe box breathing de
// controle terugbrengt. Eén centrale variabele `stress` (0-100) stuurt alles:
// beeldtrilling, hartslag, vizier-wiebel, Yerkes-Dodson-marker en of de worp lukt.
//
// Datavrij: alles gaat over de fictieve speler en algemene fysiologie, niets over
// de leerling. Graad-differentiatie (prop `graad`): vanaf graad 3 verschijnen de
// vaktermen (sympathisch/parasympathisch zenuwstelsel, nervus vagus); daaronder
// dezelfde ervaring in eenvoudiger taal.

import { useState, useEffect, useRef } from 'react';

const FASES = [
  { id: 'in', label: 'Adem in', duur: 4, kleur: '#3b82f6' },
  { id: 'vast1', label: 'Houd vast', duur: 4, kleur: '#8b5cf6' },
  { id: 'uit', label: 'Adem uit', duur: 4, kleur: '#22c55e' },
  { id: 'vast2', label: 'Houd vast', duur: 4, kleur: '#8b5cf6' },
];
const START_STRESS = 90;
const NODIG_CYCLI = 2;

// Hartslag afgeleid van stress: ~85 bpm (rust) tot ~165 bpm (paniek)
const bpmVan = (stress) => Math.round(85 + (stress / 100) * 80);

// Yerkes-Dodson-prestatie voor de mini-curve (omgekeerde U rond 50% arousal)
const prestatieVan = (arousal) => 100 * Math.exp(-Math.pow(arousal - 50, 2) / (2 * 26 * 26));

export default function ClutchShot({ graad = 2 }) {
  const [status, setStatus] = useState('klaar'); // klaar | stress | ademen | flow | mis | swish
  const [stress, setStress] = useState(START_STRESS);
  const [faseIndex, setFaseIndex] = useState(0);
  const [faseSec, setFaseSec] = useState(0);
  const [cycli, setCycli] = useState(0);
  const [tick, setTick] = useState(0); // voor de vizier-wiebel-animatie
  const ademRef = useRef(null);
  const wiebelRef = useRef(null);

  const gevorderd = graad >= 3;

  // Vizier-wiebel: een sinus-animatie met amplitude ~ stress (jouw spec)
  useEffect(() => {
    if (status === 'klaar' || status === 'swish') return undefined;
    wiebelRef.current = setInterval(() => setTick((t) => t + 1), 60);
    return () => clearInterval(wiebelRef.current);
  }, [status]);

  // Box breathing-lus: elke seconde zakt de stress, na elke seconde van een fase
  useEffect(() => {
    if (status !== 'ademen') return undefined;
    ademRef.current = setInterval(() => {
      setStress((s) => Math.max(0, s - 2)); // −2 per seconde (jouw spec)
      setFaseSec((sec) => {
        const fase = FASES[faseIndex];
        if (sec + 1 >= fase.duur) {
          setFaseIndex((fi) => {
            const volgende = (fi + 1) % FASES.length;
            if (volgende === 0) setCycli((c) => c + 1);
            return volgende;
          });
          return 0;
        }
        return sec + 1;
      });
    }, 1000);
    return () => clearInterval(ademRef.current);
  }, [status, faseIndex]);

  // Na genoeg cycli → flow
  useEffect(() => {
    if (status === 'ademen' && cycli >= NODIG_CYCLI) {
      clearInterval(ademRef.current);
      setStatus('flow');
    }
  }, [cycli, status]);

  const startScenario = () => {
    setStress(START_STRESS); setFaseIndex(0); setFaseSec(0); setCycli(0);
    setStatus('stress');
  };
  const startAdem = () => { setFaseIndex(0); setFaseSec(0); setCycli(0); setStatus('ademen'); };
  const probeerWorp = () => {
    // Onder stress 40 lukt de worp (jouw spec); anders mis
    if (stress < 40) setStatus('swish');
    else setStatus('mis');
  };
  const reset = () => { setStress(START_STRESS); setStatus('klaar'); setFaseIndex(0); setFaseSec(0); setCycli(0); };

  // Afgeleide visuele waarden
  const bpm = status === 'flow' || status === 'swish' ? 85 : bpmVan(stress);
  const shake = status === 'ademen' || status === 'stress' ? (stress / 100) * 6 : 0;
  const blur = status === 'stress' ? 3 : status === 'ademen' ? (stress / 100) * 2.5 : 0;
  const wiebelAmp = (stress / 100) * 26; // px afwijking van het vizier
  const wiebelX = Math.sin(tick * 0.9) * wiebelAmp;
  const wiebelY = Math.cos(tick * 1.3) * wiebelAmp * 0.7;
  const vizierStil = status === 'flow' || status === 'swish';

  // Zone-tekst (met/zonder vaktermen)
  const zone = stress > 70 ? { kleur: '#ef4444', label: gevorderd ? 'Sympathisch dominant' : 'Overprikkeld' }
    : stress > 40 ? { kleur: '#f59e0b', label: 'Overgangsfase' }
    : { kleur: '#22c55e', label: gevorderd ? 'Parasympathisch actief' : 'Rustig & scherp' };

  // Mini Yerkes-Dodson-curve
  const W = 120, H = 70;
  const curve = Array.from({ length: 31 }, (_, i) => {
    const a = i * (100 / 30);
    return `${(6 + (a / 100) * (W - 12)).toFixed(1)},${(6 + (1 - prestatieVan(a) / 100) * (H - 18)).toFixed(1)}`;
  }).join(' ');
  const markerX = 6 + (stress / 100) * (W - 12);
  const markerY = 6 + (1 - prestatieVan(stress) / 100) * (H - 18);

  const fase = FASES[faseIndex];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="font-bold text-gray-800 mb-1">De "clutch shot"</h3>
      <p className="text-xs text-gray-500 mb-4">Laatste seconden, gelijkspel, jij mag de beslissende vrije worp nemen. Voel hoe spanning je richten saboteert — en hoe ademhaling de controle teruggeeft.</p>

      {/* Het speelveld */}
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden select-none"
        style={{
          background: 'linear-gradient(180deg,#1e293b 0%,#334155 55%,#7c5a3a 55%,#8b6844 100%)',
          transform: `translate(${(Math.random() - 0.5) * shake}px, ${(Math.random() - 0.5) * shake}px)`,
          filter: blur ? `blur(${blur}px)` : 'none',
          transition: status === 'flow' ? 'filter 1.2s ease' : 'none',
        }}>

        {/* Tribune-stippen (publiek) */}
        <div className="absolute inset-x-0 top-0 h-1/3 opacity-40"
          style={{ backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)', backgroundSize: '10px 10px' }} />

        {/* Basketbalring */}
        <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2">
          <div className="w-28 h-28 rounded-full border-4 border-orange-500/40" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-4 rounded-full border-4 border-orange-500"
            style={{ boxShadow: vizierStil ? '0 0 16px #f97316' : 'none' }} />
        </div>

        {/* Vizier (crosshair) — wiebelt met de stress */}
        <div className="absolute left-1/2 top-[36%] -translate-x-1/2 -translate-y-1/2"
          style={{ transform: `translate(calc(-50% + ${vizierStil ? 0 : wiebelX}px), calc(-50% + ${vizierStil ? 0 : wiebelY}px))`, transition: vizierStil ? 'transform 0.6s ease' : 'none' }}>
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: vizierStil ? '#22c55e' : '#ef4444' }} />
            <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2" style={{ backgroundColor: vizierStil ? '#22c55e' : '#ef4444' }} />
            <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2" style={{ backgroundColor: vizierStil ? '#22c55e' : '#ef4444' }} />
          </div>
        </div>

        {/* HUD: hartslag linksboven */}
        <div className="absolute top-2 left-2 bg-black/50 rounded-lg px-2.5 py-1 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <span className={status !== 'flow' && status !== 'swish' && status !== 'klaar' ? 'animate-pulse' : ''} style={{ color: zone.kleur }}>♥</span>
            <span className="text-white font-bold text-sm tabular-nums">{bpm}</span>
            <span className="text-white/50 text-[10px]">bpm</span>
          </div>
        </div>

        {/* HUD: mini Yerkes-Dodson rechtsboven */}
        <div className="absolute top-2 right-2 bg-black/50 rounded-lg p-1 backdrop-blur-sm">
          <svg width={W} height={H}>
            <polyline points={curve} fill="none" stroke="#a78bfa" strokeWidth="1.5" />
            <circle cx={markerX} cy={markerY} r="4" fill={zone.kleur} stroke="#fff" strokeWidth="1.5" />
            <text x={W / 2} y={H - 2} textAnchor="middle" fontSize="7" fill="#cbd5e1">spanning → prestatie</text>
          </svg>
        </div>

        {/* De ademhalings-box (alleen tijdens ademen) */}
        {status === 'ademen' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-40 h-40">
              <div className="absolute inset-0 border-2 border-white/30 rounded-lg" />
              {/* Lichtkogel langs de rand */}
              <div className="absolute w-3 h-3 rounded-full bg-white shadow-[0_0_12px_#fff] transition-all duration-1000 ease-linear"
                style={boxKogelPositie(faseIndex, faseSec)} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white font-bold" style={{ color: fase.kleur }}>{fase.label}</span>
                <span className="text-white text-2xl font-bold tabular-nums">{fase.duur - faseSec}</span>
                <span className="text-white/60 text-[10px] mt-1">cyclus {Math.min(cycli + 1, NODIG_CYCLI)}/{NODIG_CYCLI}</span>
              </div>
            </div>
          </div>
        )}

        {/* Flow-swish overlay */}
        {status === 'swish' && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-500/10">
            <span className="text-4xl font-black text-green-300 drop-shadow-lg">SWISH ✓</span>
          </div>
        )}
      </div>

      {/* Statusbalk stress */}
      <div className="mt-4 mb-3">
        <div className="flex justify-between text-xs font-semibold mb-1">
          <span className="text-gray-600">Spanningsniveau</span>
          <span style={{ color: zone.kleur }}>{Math.round(stress)}% · {zone.label}</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: `${stress}%`, backgroundColor: zone.kleur }} />
        </div>
      </div>

      {/* Interactie per fase */}
      {status === 'klaar' && (
        <button type="button" onClick={startScenario} className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-xl font-bold">
          🏀 Neem de vrije worp
        </button>
      )}

      {status === 'stress' && (
        <div className="space-y-2">
          <button type="button" onClick={probeerWorp} className="w-full border-2 border-gray-300 text-gray-600 py-2.5 rounded-xl font-semibold">
            Werp nu (probeer maar…)
          </button>
          <button type="button" onClick={startAdem} className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-bold">
            {gevorderd ? 'Activeer parasympathisch zenuwstelsel' : 'Word rustig met ademhaling'}
          </button>
        </div>
      )}

      {status === 'mis' && (
        <div className="space-y-3">
          <div className="bg-red-50 text-red-800 rounded-xl p-3 text-sm">
            <strong>Mis!</strong> {gevorderd
              ? 'Je sympathisch zenuwstelsel staat in overdrive. Door te veel adrenaline faalt je fijne motoriek. Neem de controle terug via je ademhaling.'
              : 'Je lichaam staat in overdrive: te gespannen om precies te richten. Word eerst rustig via je ademhaling.'}
          </div>
          <button type="button" onClick={startAdem} className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-bold">
            {gevorderd ? 'Activeer parasympathisch zenuwstelsel' : 'Word rustig met ademhaling'}
          </button>
        </div>
      )}

      {status === 'ademen' && (
        <p className="text-center text-xs text-gray-500">Volg de box: adem mee met de lichtkogel. Je spanning zakt met elke seconde.</p>
      )}

      {status === 'flow' && (
        <div className="space-y-3">
          <div className="bg-green-50 text-green-800 rounded-xl p-3 text-sm">
            Je bent in de <strong>optimale zone</strong>. Het vizier staat stil op de ring. Nu is het moment.
          </div>
          <button type="button" onClick={probeerWorp} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-bold">
            🎯 Werp nu
          </button>
        </div>
      )}

      {status === 'swish' && (
        <div className="space-y-3">
          <div className="bg-emerald-50 text-emerald-900 rounded-xl p-3 text-sm">
            {gevorderd
              ? 'Door gecontroleerde ademhaling stimuleerde je de nervus vagus, verlaagde je je hartslag en herstelde je je fijne motoriek. Dit is de brug tussen biologie en sportprestatie.'
              : 'Door rustig te ademen zakte je hartslag en kreeg je de controle over je bewegingen terug. Zo werkt de brug tussen je lichaam en je prestatie.'}
          </div>
          <button type="button" onClick={reset} className="w-full border-2 border-gray-300 text-gray-600 py-2.5 rounded-xl font-semibold">
            Opnieuw
          </button>
        </div>
      )}
    </div>
  );
}

// Positie van de lichtkogel langs de rand van de box, per fase + seconde.
// in = bovenrand (L→R), vast1 = rechterrand (T→B), uit = onderrand (R→L),
// vast2 = linkerrand (B→T). Waarden in % van de box.
function boxKogelPositie(faseIndex, sec) {
  const t = sec / 4; // 0..1 binnen de fase
  switch (faseIndex) {
    case 0: return { top: '-6px', left: `calc(${t * 100}% - 6px)` };
    case 1: return { left: 'calc(100% - 6px)', top: `calc(${t * 100}% - 6px)` };
    case 2: return { top: 'calc(100% - 6px)', left: `calc(${(1 - t) * 100}% - 6px)` };
    case 3: return { left: '-6px', top: `calc(${(1 - t) * 100}% - 6px)` };
    default: return { top: '-6px', left: '-6px' };
  }
}
