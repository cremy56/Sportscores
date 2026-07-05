// src/components/sportbuddy/tools/ClutchShot.jsx
// "Clutch Shot"-simulator voor de Mentaal-module: de beslissende vrije worp.
// Interactie: druk op de BAL en HOUD vast. Zolang je vasthoudt, loopt de
// ademhaling en zakt je spanning. Laat je te vroeg los → je mist (je hand was
// nog niet stil). Hou je vol tot beide ademcycli klaar zijn → swish.
//
// Eén centrale variabele `stress` (0-100) stuurt beeldtrilling, hartslag,
// vizier-wiebel, Yerkes-Dodson-marker en of de worp lukt.
//
// Datavrij + graad-differentiatie (prop `graad`): vaktermen (sympathisch/
// parasympathisch zenuwstelsel, nervus vagus) verschijnen vanaf graad 3.

import { useState, useEffect, useRef } from 'react';

const FASES = [
  { id: 'in', label: 'Adem in', duur: 4, kleur: '#3b82f6' },
  { id: 'vast1', label: 'Houd vast', duur: 4, kleur: '#8b5cf6' },
  { id: 'uit', label: 'Adem uit', duur: 4, kleur: '#22c55e' },
  { id: 'vast2', label: 'Houd vast', duur: 4, kleur: '#8b5cf6' },
];
const START_STRESS = 90;
const NODIG_CYCLI = 2;

const bpmVan = (stress) => Math.round(85 + (stress / 100) * 80);
const prestatieVan = (arousal) => 100 * Math.exp(-Math.pow(arousal - 50, 2) / (2 * 26 * 26));

export default function ClutchShot({ graad = 2 }) {
  // klaar | ademen | mis | swish
  const [status, setStatus] = useState('klaar');
  const [stress, setStress] = useState(START_STRESS);
  const [faseIndex, setFaseIndex] = useState(0);
  const [faseSec, setFaseSec] = useState(0);
  const [cycli, setCycli] = useState(0);
  const [tick, setTick] = useState(0);
  const ademRef = useRef(null);
  const wiebelRef = useRef(null);
  const vasthoudenRef = useRef(false);
  const statusRef = useRef('klaar');
  const cycliRef = useRef(0);

  // Houd refs synchroon met de state zodat event-handlers de actuele waarde zien
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { cycliRef.current = cycli; }, [cycli]);

  const gevorderd = graad >= 3;

  // Vizier-wiebel-animatie zolang scenario loopt
  useEffect(() => {
    if (status !== 'ademen') return undefined;
    wiebelRef.current = setInterval(() => setTick((t) => t + 1), 60);
    return () => clearInterval(wiebelRef.current);
  }, [status]);

  // Ademhalingslus — draait zolang status 'ademen' is (= bal ingedrukt)
  useEffect(() => {
    if (status !== 'ademen') return undefined;
    ademRef.current = setInterval(() => {
      setStress((s) => Math.max(0, s - 2));
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

  // Genoeg cycli volgehouden → klaar om te werpen (vizier stil, bal gloeit).
  // De bal vliegt pas als de speler LOSLAAT.
  useEffect(() => {
    if (status === 'ademen' && cycli >= NODIG_CYCLI) {
      clearInterval(ademRef.current);
      clearInterval(wiebelRef.current);
      statusRef.current = 'klaar-om-te-werpen'; // meteen, zodat loslaten het ziet
      setStatus('klaar-om-te-werpen');
    }
  }, [cycli, status]);

  // Globale loslaat-listener: vangt muisknop/vinger loslaten óók buiten het
  // speelveld op, en werkt betrouwbaar ongeacht welk element het event kreeg.
  useEffect(() => {
    const opLos = () => laatLos();
    window.addEventListener('mouseup', opLos);
    window.addEventListener('touchend', opLos);
    return () => {
      window.removeEventListener('mouseup', opLos);
      window.removeEventListener('touchend', opLos);
    };
  }, []);

  // Worp-animatie: raak reist ~950ms naar de ring, daarna swish
  useEffect(() => {
    if (status !== 'werpen') return undefined;
    const id = setTimeout(() => setStatus('swish'), 950);
    return () => clearTimeout(id);
  }, [status]);

  // Misworp-animatie: bal vertrekt, ketst af, daarna de mis-boodschap
  useEffect(() => {
    if (status !== 'mis-worp') return undefined;
    const id = setTimeout(() => setStatus('mis'), 1050);
    return () => clearTimeout(id);
  }, [status]);

  // Bal ingedrukt → start of hervat de ademhaling
  const grijpBal = (e) => {
    e.preventDefault();
    if (statusRef.current === 'swish' || statusRef.current === 'werpen') return;
    if (statusRef.current === 'klaar' || statusRef.current === 'mis') {
      setStress(START_STRESS); setFaseIndex(0); setFaseSec(0); setCycli(0);
      cycliRef.current = 0;
    }
    vasthoudenRef.current = true;
    statusRef.current = 'ademen'; // meteen, vóór de re-render
    setStatus('ademen');
  };

  // Loslaten — leest de actuele status/cycli uit refs (geen stale closure)
  const laatLos = () => {
    if (!vasthoudenRef.current) return;
    vasthoudenRef.current = false;
    const huidigeStatus = statusRef.current;
    // Klaar om te werpen → de bal vliegt raak!
    if (huidigeStatus === 'klaar-om-te-werpen') {
      statusRef.current = 'werpen';
      setStatus('werpen');
      return;
    }
    // Nog bezig met ademen → te vroeg → de bal vertrekt maar mist
    if (huidigeStatus === 'ademen' && cycliRef.current < NODIG_CYCLI) {
      clearInterval(ademRef.current);
      clearInterval(wiebelRef.current);
      statusRef.current = 'mis-worp';
      setStatus('mis-worp');
    }
  };

  const reset = () => {
    vasthoudenRef.current = false;
    setStress(START_STRESS); setStatus('klaar'); setFaseIndex(0); setFaseSec(0); setCycli(0);
  };

  // Afgeleide visuele waarden
  const klaarOmTeWerpen = status === 'klaar-om-te-werpen';
  const bpm = (status === 'swish' || status === 'werpen' || klaarOmTeWerpen) ? 85 : bpmVan(stress);
  const bezig = status === 'ademen';
  const shake = bezig ? (stress / 100) * 6 : 0;
  const blur = status === 'mis' ? 0 : bezig ? (stress / 100) * 2.5 : status === 'klaar' ? 2.5 : 0;
  const wiebelAmp = bezig ? (stress / 100) * 26 : status === 'klaar' ? 22 : 0;
  const wiebelX = Math.sin(tick * 0.9) * wiebelAmp;
  const wiebelY = Math.cos(tick * 1.3) * wiebelAmp * 0.7;
  const vizierStil = status === 'swish' || status === 'werpen' || klaarOmTeWerpen;
  // Afketsrichting bij een misworp: de kant waar het vizier het laatst heen wees
  const misNaarLinks = wiebelX < 0;

  const zone = stress > 70 ? { kleur: '#ef4444', label: gevorderd ? 'Sympathisch dominant' : 'Overprikkeld' }
    : stress > 40 ? { kleur: '#f59e0b', label: 'Overgangsfase' }
    : { kleur: '#22c55e', label: gevorderd ? 'Parasympathisch actief' : 'Rustig & scherp' };

  // Mini Yerkes-Dodson-curve
  const CW = 120, CH = 70;
  const curve = Array.from({ length: 31 }, (_, i) => {
    const a = i * (100 / 30);
    return `${(6 + (a / 100) * (CW - 12)).toFixed(1)},${(6 + (1 - prestatieVan(a) / 100) * (CH - 18)).toFixed(1)}`;
  }).join(' ');
  const markerX = 6 + (stress / 100) * (CW - 12);
  const markerY = 6 + (1 - prestatieVan(stress) / 100) * (CH - 18);

  const fase = FASES[faseIndex];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <style>{`
        @keyframes clutchRaak {
          0%   { bottom: 12px; transform: translateX(-50%) scale(1);    }
          55%  { bottom: 60%;  transform: translateX(-50%) scale(0.82); }
          78%  { bottom: 50%;  transform: translateX(-50%) scale(0.72); }
          100% { bottom: 44%;  transform: translateX(-50%) scale(0.68); }
        }
        .clutch-raak { animation: clutchRaak 0.95s cubic-bezier(0.25,0.6,0.4,1) forwards; }

        @keyframes clutchMisLinks {
          0%   { bottom: 12px; left: 50%; transform: translateX(-50%) scale(1) rotate(0deg);    }
          50%  { bottom: 58%;  left: 46%; transform: translateX(-50%) scale(0.8) rotate(120deg); }
          62%  { bottom: 52%;  left: 40%; transform: translateX(-50%) scale(0.76) rotate(180deg); }
          100% { bottom: 4%;   left: 24%; transform: translateX(-50%) scale(0.9) rotate(400deg); }
        }
        .clutch-mis-links { animation: clutchMisLinks 1.05s cubic-bezier(0.3,0.5,0.6,1) forwards; }

        @keyframes clutchMisRechts {
          0%   { bottom: 12px; left: 50%; transform: translateX(-50%) scale(1) rotate(0deg);     }
          50%  { bottom: 58%;  left: 54%; transform: translateX(-50%) scale(0.8) rotate(-120deg); }
          62%  { bottom: 52%;  left: 60%; transform: translateX(-50%) scale(0.76) rotate(-180deg); }
          100% { bottom: 4%;   left: 76%; transform: translateX(-50%) scale(0.9) rotate(-400deg); }
        }
        .clutch-mis-rechts { animation: clutchMisRechts 1.05s cubic-bezier(0.3,0.5,0.6,1) forwards; }
      `}</style>
      <h3 className="font-bold text-gray-800 mb-1">De "clutch shot"</h3>
      <p className="text-xs text-gray-500 mb-4">Laatste seconden, gelijkspel, jij mag de beslissende vrije worp nemen. Druk op de bal en <strong>houd vast</strong> tot je ademhaling je gekalmeerd heeft. Laat je te vroeg los, dan trilt je hand nog — en mis je.</p>

      {/* Het speelveld */}
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden select-none"
        style={{
          background: 'linear-gradient(180deg,#1e293b 0%,#3b4a63 60%,#5a4632 60%,#6b5340 100%)',
          transform: `translate(${(Math.random() - 0.5) * shake}px, ${(Math.random() - 0.5) * shake}px)`,
        }}
      >
        {/* Tribune-stippen */}
        <div className="absolute inset-x-0 top-0 h-1/4 opacity-30"
          style={{ backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)', backgroundSize: '11px 11px' }} />

        {/* Wazige laag (tunnelvisie) — apart zodat de bal scherp blijft */}
        <div className="absolute inset-0 pointer-events-none" style={{ backdropFilter: blur ? `blur(${blur}px)` : 'none', WebkitBackdropFilter: blur ? `blur(${blur}px)` : 'none', transition: status === 'swish' ? 'backdrop-filter 1.2s ease' : 'none' }} />

        {/* Basketbalring + bord (realistischer SVG) */}
        <div className="absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2 w-[55%]">
          <BasketRing highlight={vizierStil} />
        </div>

        {/* Vizier op de ring */}
        <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ transform: `translate(calc(-50% + ${wiebelX}px), calc(-50% + ${wiebelY}px))`, transition: vizierStil ? 'transform 0.6s ease' : 'none' }}>
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: vizierStil ? '#22c55e' : '#ef4444' }} />
            <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2" style={{ backgroundColor: vizierStil ? '#22c55e' : '#ef4444' }} />
            <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2" style={{ backgroundColor: vizierStil ? '#22c55e' : '#ef4444' }} />
          </div>
        </div>

        {/* HUD: hartslag */}
        <div className="absolute top-2 left-2 bg-black/50 rounded-lg px-2.5 py-1 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <span className={bezig ? 'animate-pulse' : ''} style={{ color: zone.kleur }}>♥</span>
            <span className="text-white font-bold text-sm tabular-nums">{bpm}</span>
            <span className="text-white/50 text-[10px]">bpm</span>
          </div>
        </div>

        {/* HUD: mini Yerkes-Dodson */}
        <div className="absolute top-2 right-2 bg-black/50 rounded-lg p-1 backdrop-blur-sm">
          <svg width={CW} height={CH}>
            <polyline points={curve} fill="none" stroke="#a78bfa" strokeWidth="1.5" />
            <circle cx={markerX} cy={markerY} r="4" fill={zone.kleur} stroke="#fff" strokeWidth="1.5" />
            <text x={CW / 2} y={CH - 2} textAnchor="middle" fontSize="7" fill="#cbd5e1">spanning → prestatie</text>
          </svg>
        </div>

        {/* Ademhalings-box (tijdens vasthouden) */}
        {bezig && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-40 h-40">
              <div className="absolute inset-0 border-2 border-white/30 rounded-lg" />
              <div className="absolute w-3 h-3 rounded-full bg-white shadow-[0_0_12px_#fff] transition-all duration-1000 ease-linear"
                style={boxKogelPositie(faseIndex, faseSec)} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white font-bold" style={{ color: fase.kleur }}>{fase.label}</span>
                <span className="text-white text-2xl font-bold tabular-nums">{fase.duur - faseSec}</span>
                <span className="text-white/60 text-[10px] mt-1">cyclus {Math.min(cycli + 1, NODIG_CYCLI)}/{NODIG_CYCLI} · blijf vasthouden</span>
              </div>
            </div>
          </div>
        )}

        {/* De bal — ingedrukt houden. Tijdens 'werpen' verdwijnt hij (vliegt). */}
        {(status === 'klaar' || status === 'ademen' || status === 'mis' || klaarOmTeWerpen) && (
          <button
            type="button"
            onMouseDown={grijpBal}
            onTouchStart={grijpBal}
            className="absolute left-1/2 bottom-3 -translate-x-1/2 w-20 h-20 rounded-full touch-none cursor-pointer active:scale-95 transition-transform"
            style={{ filter: (bezig || klaarOmTeWerpen) ? 'drop-shadow(0 0 10px rgba(255,255,255,0.4))' : 'none' }}
            aria-label="Houd de bal vast"
          >
            <Basketbal />
            {status === 'klaar' && (
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-bold text-white bg-black/60 rounded-full px-2 py-0.5">
                druk & houd vast
              </span>
            )}
            {klaarOmTeWerpen && (
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-bold text-white bg-green-600/80 rounded-full px-2 py-0.5">
                laat los om te werpen!
              </span>
            )}
          </button>
        )}

        {/* Vliegende bal: raak (naar de ring) of mis (afketsen) */}
        {(status === 'werpen' || status === 'mis-worp') && (
          <div
            className={`absolute left-1/2 w-20 h-20 -translate-x-1/2 ${
              status === 'werpen' ? 'clutch-raak' : (misNaarLinks ? 'clutch-mis-links' : 'clutch-mis-rechts')
            }`}
            style={{ bottom: 12 }}
            aria-hidden="true"
          >
            <Basketbal />
          </div>
        )}

        {/* Swish */}
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

      {/* Feedback per status */}
      {status === 'klaar' && (
        <p className="text-center text-xs text-gray-500">Druk op de bal en houd de knop (of je vinger) ingedrukt.</p>
      )}
      {status === 'ademen' && (
        <p className="text-center text-xs text-gray-500">Blijf vasthouden en adem mee met de lichtkogel. Je spanning zakt met elke seconde.</p>
      )}
      {klaarOmTeWerpen && (
        <p className="text-center text-sm font-semibold text-green-700">Je bent kalm en scherp — <strong>laat nu los</strong> om te werpen!</p>
      )}
      {status === 'werpen' && (
        <p className="text-center text-xs text-gray-500">De bal is onderweg…</p>
      )}
      {status === 'mis-worp' && (
        <p className="text-center text-xs text-gray-500">De bal wankelt op de ring…</p>
      )}
      {status === 'mis' && (
        <div className="bg-red-50 text-red-800 rounded-xl p-3 text-sm">
          <strong>Te vroeg losgelaten — mis!</strong> {gevorderd
            ? 'Je sympathisch zenuwstelsel stond nog in overdrive; door de adrenaline was je fijne motoriek nog niet hersteld. Pak de bal opnieuw en hou vol tot het einde.'
            : 'Je hand trilde nog van de spanning. Pak de bal opnieuw en hou vol tot je ademhaling helemaal klaar is.'}
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

// Lichtkogel langs de rand van de box, per fase + seconde.
function boxKogelPositie(faseIndex, sec) {
  const t = sec / 4;
  switch (faseIndex) {
    case 0: return { top: '-6px', left: `calc(${t * 100}% - 6px)` };
    case 1: return { left: 'calc(100% - 6px)', top: `calc(${t * 100}% - 6px)` };
    case 2: return { top: 'calc(100% - 6px)', left: `calc(${(1 - t) * 100}% - 6px)` };
    case 3: return { left: '-6px', top: `calc(${(1 - t) * 100}% - 6px)` };
    default: return { top: '-6px', left: '-6px' };
  }
}

// ─── Realistische basketbalring met bord + net (SVG) ──────────────────────────
function BasketRing({ highlight }) {
  return (
    <svg viewBox="0 0 200 170" className="w-full" xmlns="http://www.w3.org/2000/svg">
      {/* Bord */}
      <rect x="18" y="6" width="164" height="104" rx="8" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="3" />
      <rect x="70" y="40" width="60" height="44" rx="3" fill="none" stroke="#e2603a" strokeWidth="3" />
      {/* Ophangplaatje */}
      <rect x="92" y="108" width="16" height="10" fill="#e2603a" />
      {/* Ring (ellips) */}
      <ellipse cx="100" cy="120" rx="46" ry="11" fill="none" stroke="#e2603a" strokeWidth="5"
        style={{ filter: highlight ? 'drop-shadow(0 0 8px #f97316)' : 'none' }} />
      {/* Net — verticale en gekruiste lijnen die naar onder toelopen */}
      <g stroke="#f1a58c" strokeWidth="1.6" fill="none" opacity="0.9">
        {Array.from({ length: 9 }).map((_, i) => {
          const a = (i / 8) * Math.PI;
          const x1 = 100 + Math.cos(a) * 46;
          const x2 = 100 + Math.cos(a) * 20;
          return <line key={`v${i}`} x1={x1.toFixed(1)} y1="126" x2={x2.toFixed(1)} y2="164" />;
        })}
        {/* Kruisdraden */}
        <path d="M58,140 L100,150 L142,140" />
        <path d="M64,152 L100,160 L136,152" />
        <path d="M80,128 L100,138 L120,128" />
      </g>
    </svg>
  );
}

// ─── Realistische basketbal (SVG met lijnen + glans) ──────────────────────────
function Basketbal() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="balGlans" cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#f0a868" />
          <stop offset="45%" stopColor="#d9772e" />
          <stop offset="100%" stopColor="#a84e18" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#balGlans)" stroke="#7c3a12" strokeWidth="1.5" />
      {/* Lijnen */}
      <g stroke="#4a2410" strokeWidth="2" fill="none">
        <line x1="50" y1="4" x2="50" y2="96" />
        <path d="M8,32 Q50,50 92,32" />
        <path d="M8,68 Q50,50 92,68" />
        <path d="M24,7 Q40,50 24,93" />
        <path d="M76,7 Q60,50 76,93" />
      </g>
      {/* Glanshighlight */}
      <ellipse cx="36" cy="30" rx="12" ry="8" fill="#ffffff" opacity="0.22" />
    </svg>
  );
}
