import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowLeftIcon, PlayIcon, PauseIcon, CheckIcon, XMarkIcon, ClockIcon, PhoneIcon, MapPinIcon, ExclamationTriangleIcon, AcademicCapIcon, TrophyIcon, StarIcon } from '@heroicons/react/24/outline';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { getGraadFromKlas } from '../utils/klasUtils';
import { scenarios, scenarioChains } from '../data/ehboScenarios.js';
import { useEnhancedScenario, useAdaptiveAnalysis, useAccessibilityFeatures } from '../hooks/useEnhancedEHBO';
import { EnhancedUIComponents } from '../utils/enhancedEHBO.jsx';
import { RoleBasedScenarios, ComplicationSystem, ScenarioChainSystem } from '../utils/advancedEnhancedEHBO';
import { Phase3UIComponents } from '../components/EHBO/EnhancedScenarioManager';
import { useNavigate } from 'react-router-dom';


function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ─── Scène-afbeeldingen ──────────────────────────────────────────────────────
// Bestanden staan in public/ehbo/ en worden via een absoluut pad geladen
// (Vite serveert de public-map vanaf de root). Heeft een scène géén src, dan
// valt SceneWeergave terug op de getekende SVG hieronder.
const EHBO_SCENES = {
  sporthal_ongeval: {
    src: '/ehbo/sporthal-ongeval.png',
    alt: 'Sporthal met een slachtoffer op de grond. Op de vloer liggen onder meer een omgevallen horde, een basketbal, plassen water, een open sporttas, sleutels, een badmintonracket, een omgevallen drinkfles, een losse stang, een omgevallen kegel en een stopcontactblok met kabels.'
  },
  // Nog geen foto voor de close-up: valt terug op de SVG-tekening.
  slachtoffer: {
    alt: 'Close-up van het bewusteloze slachtoffer, van opzij gezien.'
  }
};

// ─── SVG-scènes voor de interactieve basisstappen ────────────────────────────
// Inline SVG i.p.v. externe afbeeldingen: schaalt mee, geen assets nodig, en
// weggeklikte gevaren kunnen echt uit beeld verdwijnen.
// Tekenvlak: 800 x 500.
function EhboScene({ scene, opgeruimd = [] }) {
  const weg = (id) => opgeruimd.includes(id);

  if (scene === 'sporthal_ongeval') {
    return (
      <g>
        {/* ── ACHTERGROND: muur ───────────────────────────────────────────── */}
        <rect x="0" y="0" width="800" height="300" fill="#eef2f7" />
        <rect x="0" y="252" width="800" height="48" fill="#c8d4e3" />
        <rect x="0" y="248" width="800" height="6" fill="#9fb3c8" />

        {/* Ramen */}
        {[210, 400, 590].map(x => (
          <g key={x}>
            <rect x={x} y="34" width="130" height="82" rx="4" fill="#cfe6f7" stroke="#8fa9bf" strokeWidth="4" />
            <line x1={x + 65} y1="34" x2={x + 65} y2="116" stroke="#8fa9bf" strokeWidth="4" />
            <line x1={x} y1="75" x2={x + 130} y2="75" stroke="#8fa9bf" strokeWidth="4" />
            <path d={`M${x + 6} 110 L${x + 40} 40`} stroke="#ffffff" strokeWidth="7" opacity="0.55" />
          </g>
        ))}

        {/* Basketbalring */}
        <g>
          <rect x="638" y="140" width="96" height="62" rx="4" fill="#fdfdfd" stroke="#64748b" strokeWidth="4" />
          <rect x="666" y="164" width="40" height="28" fill="none" stroke="#64748b" strokeWidth="4" />
          <rect x="676" y="202" width="20" height="7" fill="#94a3b8" />
          <ellipse cx="686" cy="212" rx="26" ry="7" fill="none" stroke="#ea580c" strokeWidth="5" />
          <path d="M662 214 L668 240 M672 216 L676 242 M686 217 L686 244 M700 216 L696 242 M710 214 L704 240"
            stroke="#e2e8f0" strokeWidth="2.5" fill="none" />
          <path d="M668 240 Q 686 248, 704 240" stroke="#e2e8f0" strokeWidth="2.5" fill="none" />
        </g>

        {/* Wandrek (ribstok) links */}
        <g>
          <rect x="26" y="60" width="14" height="240" rx="3" fill="#d9ab6a" />
          <rect x="120" y="60" width="14" height="240" rx="3" fill="#d9ab6a" />
          <rect x="26" y="60" width="5" height="240" fill="#b98d4f" />
          <rect x="120" y="60" width="5" height="240" fill="#b98d4f" />
          {[86, 116, 146, 176, 206, 236, 266].map(y => (
            <g key={y}>
              <rect x="34" y={y} width="92" height="9" rx="4.5" fill="#e8c38a" />
              <rect x="34" y={y + 6} width="92" height="3" rx="1.5" fill="#c49a5c" />
            </g>
          ))}
        </g>

        {/* Gymbank tegen de muur */}
        <g>
          <rect x="470" y="256" width="150" height="12" rx="3" fill="#e0b578" />
          <rect x="470" y="266" width="150" height="4" fill="#bb9155" />
          <rect x="484" y="270" width="9" height="28" fill="#9a7a49" />
          <rect x="598" y="270" width="9" height="28" fill="#9a7a49" />
        </g>

        {/* ── VLOER ───────────────────────────────────────────────────────── */}
        <rect x="0" y="300" width="800" height="200" fill="#e6c79a" />
        {[0, 100, 200, 300, 400, 500, 600, 700].map(x => (
          <line key={x} x1={x} y1="300" x2={x - 30} y2="500" stroke="#d3ae7c" strokeWidth="2" />
        ))}
        <line x1="0" y1="300" x2="800" y2="300" stroke="#b8935f" strokeWidth="4" />
        {/* Speelveldbelijning */}
        <line x1="0" y1="356" x2="800" y2="356" stroke="#2563eb" strokeWidth="4" opacity="0.55" />
        <path d="M200 500 Q 330 372, 470 500" fill="none" stroke="#dc2626" strokeWidth="4" opacity="0.45" />

        {/* ── SLACHTOFFER (bovenaanzicht, liggend op de rug) ──────────────── */}
        <g>
          <ellipse cx="410" cy="432" rx="150" ry="30" fill="#1e293b" opacity="0.12" />

          {/* Linkerarm omhoog */}
          <path d="M340 378 Q 322 348, 306 330" stroke="#f4cba4" strokeWidth="23" strokeLinecap="round" fill="none" />
          <circle cx="302" cy="325" r="14" fill="#f4cba4" />
          <path d="M294 318 L299 312 M301 315 L306 309 M308 314 L313 309" stroke="#dda87c" strokeWidth="2.5" strokeLinecap="round" />

          {/* Rechterarm opzij */}
          <path d="M342 424 Q 332 452, 322 470" stroke="#f4cba4" strokeWidth="23" strokeLinecap="round" fill="none" />
          <circle cx="319" cy="475" r="14" fill="#f4cba4" />

          {/* Benen */}
          <path d="M470 386 L556 380" stroke="#f4cba4" strokeWidth="26" strokeLinecap="round" />
          <path d="M470 414 L556 420" stroke="#f4cba4" strokeWidth="26" strokeLinecap="round" />
          {/* Sokken */}
          <rect x="548" y="368" width="20" height="24" rx="5" fill="#f8fafc" transform="rotate(-4 558 380)" />
          <rect x="548" y="408" width="20" height="24" rx="5" fill="#f8fafc" transform="rotate(4 558 420)" />
          {/* Sportschoenen */}
          <g>
            <path d="M566 368 q 32 -4 34 12 q 2 14 -30 12 z" fill="#ef4444" />
            <path d="M566 388 q 32 2 34 4 q -2 6 -34 0 z" fill="#f8fafc" />
            <path d="M574 372 l 12 3 M578 366 l 10 4" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <g>
            <path d="M566 432 q 32 4 34 -12 q 2 -14 -30 -12 z" fill="#ef4444" />
            <path d="M566 412 q 32 -2 34 -4 q -2 -6 -34 0 z" fill="#f8fafc" />
            <path d="M574 428 l 12 -3 M578 434 l 10 -4" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" />
          </g>

          {/* Sportbroek */}
          <path d="M432 368 h 46 a 8 8 0 0 1 8 8 v 48 a 8 8 0 0 1 -8 8 h -46 z" fill="#1d4ed8" />
          <line x1="478" y1="400" x2="432" y2="400" stroke="#1e40af" strokeWidth="3" />

          {/* T-shirt */}
          <path d="M322 370 h 112 a 10 10 0 0 1 10 10 v 40 a 10 10 0 0 1 -10 10 h -112 a 12 12 0 0 1 -12 -12 v -36 a 12 12 0 0 1 12 -12 z" fill="#22c55e" />
          <rect x="352" y="370" width="52" height="7" fill="#16a34a" />
          {/* Mouwranden */}
          <path d="M334 370 v 60" stroke="#16a34a" strokeWidth="3" />
          {/* Halsopening */}
          <path d="M310 388 q 12 12 0 24" fill="#0f7a37" />

          {/* Nek */}
          <rect x="296" y="386" width="20" height="28" rx="8" fill="#e8b98d" />

          {/* Hoofd */}
          <circle cx="284" cy="400" r="34" fill="#f4cba4" />
          {/* Haar */}
          <path d="M284 366 a 34 34 0 0 0 -30 50 q -14 -30 8 -46 q 12 -9 22 -4 z" fill="#6b4423" />
          <path d="M284 366 a 34 34 0 0 1 30 50 q 14 -30 -8 -46 q -12 -9 -22 -4 z" fill="#5a3719" />
          {/* Oor */}
          <ellipse cx="288" cy="432" rx="6" ry="8" fill="#e8b98d" />
          {/* Gesloten ogen (bewusteloos) */}
          <path d="M266 388 q 7 -6 14 -1" stroke="#3f2d20" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M266 414 q 7 6 14 1" stroke="#3f2d20" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Wenkbrauwen */}
          <path d="M264 380 q 8 -4 16 -1" stroke="#6b4423" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M264 422 q 8 4 16 1" stroke="#6b4423" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Neus */}
          <path d="M256 401 q -8 -1 -1 -8" stroke="#dda87c" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Mond, licht open */}
          <ellipse cx="258" cy="410" rx="5" ry="7" fill="#b96b6b" transform="rotate(-12 258 410)" />
        </g>

        {/* ── GEVAAR 1: omgevallen ladder ─────────────────────────────────── */}
        {!weg('g_ladder') && (
          <g>
            <path d="M628 476 L764 330 L776 342 L640 488 Z" fill="#c98b3a" stroke="#8a5c22" strokeWidth="2.5" />
            <path d="M660 500 L796 354 L808 366 L672 512 Z" fill="#c98b3a" stroke="#8a5c22" strokeWidth="2.5" />
            {[0, 1, 2, 3].map(i => (
              <rect key={i}
                x={640 + i * 34} y={452 - i * 36} width="42" height="11" rx="4"
                fill="#dda75c" stroke="#8a5c22" strokeWidth="2"
                transform={`rotate(-47 ${661 + i * 34} ${458 - i * 36})`} />
            ))}
            <circle cx="770" cy="336" r="8" fill="#4b5563" />
            <circle cx="802" cy="360" r="8" fill="#4b5563" />
          </g>
        )}

        {/* ── GEVAAR 2: plas water + omgevallen fles ──────────────────────── */}
        {!weg('g_plas') && (
          <g>
            <path d="M104 452 q 22 -30 62 -24 q 44 6 56 26 q 12 22 -22 34 q -40 14 -76 4 q -30 -8 -20 -40 z"
              fill="#5eb3f0" opacity="0.72" />
            <path d="M124 452 q 20 -18 52 -14 q 30 4 40 16"
              fill="none" stroke="#cbe9ff" strokeWidth="4" opacity="0.9" />
            <ellipse cx="150" cy="470" rx="16" ry="5" fill="#cbe9ff" opacity="0.7" />
            {/* Omgevallen drinkfles */}
            <g transform="rotate(-72 196 424)">
              <rect x="180" y="404" width="32" height="62" rx="12" fill="#e2f0fb" stroke="#93b8d4" strokeWidth="2.5" />
              <rect x="186" y="418" width="20" height="24" rx="3" fill="#38bdf8" opacity="0.55" />
              <rect x="188" y="392" width="16" height="14" rx="3" fill="#2563eb" />
            </g>
          </g>
        )}

        {/* ── GEVAAR 3: losse kabel met stekker ───────────────────────────── */}
        {!weg('g_kabel') && (
          <g>
            <path d="M36 336 q 44 -22 80 6 q 32 26 68 8 q 22 -10 34 4"
              stroke="#111827" strokeWidth="9" fill="none" strokeLinecap="round" />
            <path d="M36 336 q 44 -22 80 6 q 32 26 68 8 q 22 -10 34 4"
              stroke="#374151" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <g transform="rotate(18 224 356)">
              <rect x="210" y="342" width="34" height="26" rx="5" fill="#1f2937" />
              <rect x="244" y="348" width="10" height="5" rx="2.5" fill="#9ca3af" />
              <rect x="244" y="358" width="10" height="5" rx="2.5" fill="#9ca3af" />
            </g>
          </g>
        )}

        {/* ── GEVAAR 4: gebroken fles + scherven ──────────────────────────── */}
        {!weg('g_glas') && (
          <g>
            <g fill="#86d6ac" stroke="#15803d" strokeWidth="2" opacity="0.92">
              <path d="M556 468 q 28 -6 46 2 l -4 18 q -22 8 -44 0 z" />
              <path d="M596 452 l 16 -22 l 12 6 l -14 24 z" />
            </g>
            <g fill="#a7e8c6" stroke="#15803d" strokeWidth="1.8">
              <polygon points="614,472 632,452 642,476" />
              <polygon points="636,486 654,466 664,490" />
              <polygon points="596,490 610,474 620,494" />
              <polygon points="566,492 578,478 588,496" />
              <polygon points="650,458 660,446 668,462" />
            </g>
            <path d="M620 458 l 5 8 M640 470 l 6 7" stroke="#ffffff" strokeWidth="2.5" opacity="0.8" strokeLinecap="round" />
          </g>
        )}
      </g>
    );
  }

  if (scene === 'slachtoffer') {
    return (
      <g>
        <rect x="0" y="0" width="800" height="500" fill="#eef2f7" />
        <rect x="0" y="330" width="800" height="170" fill="#e6c79a" />
        <line x1="0" y1="330" x2="800" y2="330" stroke="#b8935f" strokeWidth="4" />
        <ellipse cx="400" cy="330" rx="300" ry="52" fill="#1e293b" opacity="0.1" />

        {/* Slachtoffer, close-up */}
        <g>
          {/* Arm */}
          <path d="M330 300 Q 320 360, 300 396" stroke="#f4cba4" strokeWidth="40" strokeLinecap="round" fill="none" />
          <circle cx="296" cy="404" r="24" fill="#f4cba4" />

          {/* Romp / T-shirt */}
          <path d="M300 190 h 250 a 18 18 0 0 1 18 18 v 104 a 18 18 0 0 1 -18 18 h -250 a 22 22 0 0 1 -22 -22 v -96 a 22 22 0 0 1 22 -22 z" fill="#22c55e" />
          <rect x="352" y="190" width="86" height="12" fill="#16a34a" />
          <path d="M330 190 v 140" stroke="#16a34a" strokeWidth="5" />
          <path d="M278 236 q 22 24 0 48" fill="#0f7a37" />
          {/* Borstkas-markering (subtiel) */}
          <path d="M400 230 q 44 30 0 62" fill="none" stroke="#16a34a" strokeWidth="3" opacity="0.6" />

          {/* Nek */}
          <rect x="248" y="228" width="42" height="62" rx="18" fill="#e8b98d" />

          {/* Hoofd */}
          <circle cx="212" cy="260" r="72" fill="#f4cba4" />
          <path d="M212 188 a 72 72 0 0 0 -64 106 q -30 -64 18 -98 q 26 -18 46 -8 z" fill="#6b4423" />
          <path d="M212 188 a 72 72 0 0 1 64 106 q 30 -64 -18 -98 q -26 -18 -46 -8 z" fill="#5a3719" />
          <ellipse cx="222" cy="326" rx="13" ry="18" fill="#e8b98d" />
          {/* Gesloten ogen */}
          <path d="M172 232 q 16 -13 32 -2" stroke="#3f2d20" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M172 288 q 16 13 32 2" stroke="#3f2d20" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M168 216 q 18 -9 34 -2" stroke="#6b4423" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M168 304 q 18 9 34 2" stroke="#6b4423" strokeWidth="5" fill="none" strokeLinecap="round" />
          {/* Neus */}
          <path d="M152 262 q -18 -2 -2 -18" stroke="#dda87c" strokeWidth="5" fill="none" strokeLinecap="round" />
          {/* Mond, licht open */}
          <ellipse cx="156" cy="282" rx="11" ry="15" fill="#b96b6b" transform="rotate(-12 156 282)" />
        </g>
      </g>
    );
  }

  return null;
}

// ─── Scèneweergave ───────────────────────────────────────────────────────────
// Toont de foto (als die er is) of anders de getekende SVG, met daarover de
// klikzones. Posities staan in PROCENTEN van de afbeelding, zodat ze op elk
// schermformaat op de juiste plek blijven liggen.
function SceneWeergave({ scene, opgeruimd = [], hotspots = [], gedaan = [], foutId = null, onKlik = null, onMis = null, verbergZones = false, maxHoogte = '55dvh' }) {
  const def = EHBO_SCENES[scene] || {};
  const klikbaar = typeof onKlik === 'function';

  // De wrapper is inline-block en krimpt exact om de afbeelding heen. Dat is
  // essentieel: de klikzones staan in procenten van deze container, dus als
  // die breder zou zijn dan de foto (letterboxing) verschuiven alle zones.
  // De hoogtebeperking staat daarom op het beeld zelf, niet op de wrapper.
  return (
    <div className="w-full flex justify-center">
      <div
        className="relative inline-block rounded-xl overflow-hidden border-2 border-gray-200 bg-white"
        onClick={klikbaar && onMis ? onMis : undefined}
        style={{ cursor: klikbaar ? 'crosshair' : 'default' }}
      >
      {def.src ? (
        <img
          src={def.src}
          alt={def.alt || 'Situatietekening'}
          className="block w-auto max-w-full h-auto"
          style={{ maxHeight: maxHoogte }}
        />
      ) : (
        <svg
          viewBox="0 0 800 500"
          className="block w-auto max-w-full h-auto"
          style={{ maxHeight: maxHoogte }}
          role="img"
          aria-label={def.alt || 'Situatietekening'}
        >
          <EhboScene scene={scene} opgeruimd={opgeruimd} />
        </svg>
      )}

      {hotspots.map(hs => {
        const isGedaan = gedaan.includes(hs.id);
        const isFout = foutId === hs.id;
        // Bij verbergZones is de zone onzichtbaar tot hij gevonden is: de
        // leerling moet de gevaren zelf herkennen. De cursor blijft daarom
        // ook een crosshair (een pointer zou de plek verraden).
        const onzichtbaar = verbergZones && !isGedaan && !isFout;
        return (
          <button
            key={hs.id}
            type="button"
            onClick={klikbaar ? (e) => { e.stopPropagation(); onKlik(hs); } : undefined}
            disabled={!klikbaar || isGedaan}
            aria-label={hs.naam || 'Gevaar'}
            title={klikbaar && !verbergZones ? (hs.naam || 'Gevaar') : undefined}
            className="absolute rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              left: `${hs.x}%`,
              top: `${hs.y}%`,
              width: `${hs.r * 2}%`,
              aspectRatio: '1',
              transform: 'translate(-50%, -50%)',
              borderWidth: onzichtbaar ? '0' : '3px',
              borderStyle: isGedaan ? 'solid' : 'dashed',
              borderColor: isFout ? '#dc2626' : isGedaan ? '#16a34a' : '#eab308',
              backgroundColor: onzichtbaar
                ? 'transparent'
                : isFout
                  ? 'rgba(239,68,68,0.35)'
                  : isGedaan
                    ? 'rgba(34,197,94,0.45)'
                    : 'rgba(250,204,21,0.22)',
              cursor: klikbaar && !isGedaan ? (verbergZones ? 'crosshair' : 'pointer') : 'default'
            }}
          >
            {isGedaan && (
              <span className="text-white font-black text-lg md:text-2xl drop-shadow-md leading-none">✓</span>
            )}
          </button>
        );
      })}
      </div>
    </div>
  );
}

// ─── Hotspot-oefening ────────────────────────────────────────────────────────
// Klik de aangeduide plekken aan. Twee modi:
//   volgordeVerplicht=false -> alle klikzones, willekeurige volgorde
//   volgordeVerplicht=true  -> exact in de opgegeven volgorde
// Staat op modulescope zodat de interne state bewaard blijft bij re-renders.
function HotspotOefening({ step, onVoltooid }) {
  const [gedaan, setGedaan] = useState([]);
  const [foutId, setFoutId] = useState(null);
  const [laatsteUitleg, setLaatsteUitleg] = useState(null);
  const [klaar, setKlaar] = useState(false);

  const [mis, setMis] = useState(false);

  const hotspots = step.hotspots || [];
  const volgordeVerplicht = step.volgordeVerplicht === true;
  const verbergZones = step.verbergZones === true;

  // Klik naast een gevaar: korte feedback, zodat het zoeken betekenis heeft.
  const klikMis = () => {
    if (klaar) return;
    setMis(true);
    setLaatsteUitleg(null);
    setTimeout(() => setMis(false), 1200);
  };

  const klik = (hs) => {
    if (klaar || gedaan.includes(hs.id)) return;

    if (volgordeVerplicht) {
      const verwacht = hotspots[gedaan.length]?.id;
      if (hs.id !== verwacht) {
        setFoutId(hs.id);
        setLaatsteUitleg(hs.foutUitleg || 'Nog niet — welke controle komt hiervóór?');
        setTimeout(() => setFoutId(null), 1500);
        return;
      }
    }

    const nieuw = [...gedaan, hs.id];
    setGedaan(nieuw);
    setFoutId(null);
    setMis(false);
    setLaatsteUitleg(hs.uitleg || null);

    if (nieuw.length === hotspots.length) {
      setKlaar(true);
      setTimeout(() => onVoltooid(), 1600);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {hotspots.map((hs, i) => (
          <div key={hs.id}
            className={`h-2 flex-1 rounded-full transition-colors ${
              i < gedaan.length ? 'bg-green-500' : 'bg-gray-200'
            }`} />
        ))}
      </div>

      <p className="text-xs md:text-sm text-gray-500 -mt-1">
        {klaar
          ? 'Alles in orde — je kunt verder.'
          : `${gedaan.length} van ${hotspots.length} ${volgordeVerplicht ? 'controles uitgevoerd' : 'gevaren aangepakt'}`}
      </p>

      <SceneWeergave
        scene={step.scene}
        hotspots={hotspots}
        gedaan={gedaan}
        foutId={foutId}
        onKlik={klik}
        onMis={verbergZones ? klikMis : null}
        verbergZones={verbergZones}
        maxHoogte="min(68dvh, calc(100dvh - 19rem))"
      />

      {mis && !laatsteUitleg && (
        <div className="rounded-xl p-3 text-sm border-2 bg-amber-50 border-amber-300 text-amber-900">
          Daar zie ik geen gevaar. Kijk nog eens goed rond.
        </div>
      )}

      {laatsteUitleg && (
        <div className={`rounded-xl p-3 text-sm border-2 ${
          foutId ? 'bg-red-50 border-red-400 text-red-800' : 'bg-blue-50 border-blue-300 text-blue-900'
        }`}>
          {laatsteUitleg}
        </div>
      )}

      {klaar && (
        <div className="bg-green-50 border-2 border-green-500 rounded-xl p-4 text-green-800 font-semibold text-center">
          {step.klaarTekst || 'Goed gedaan!'}
        </div>
      )}
    </div>
  );
}

// ─── Interactieve volgorde-oefening ──────────────────────────────────────────
// De leerling klikt de stappen in de juiste volgorde aan. Staat BEWUST op
// modulescope (niet binnen EHBODetail): een component die binnen de ouder
// gedefinieerd wordt, remount bij elke re-render en verliest dan zijn state.
// step.items = array in de JUISTE volgorde; de weergave wordt geschud.
function VolgordeOefening({ step, onVoltooid }) {
  const [geplaatst, setGeplaatst] = useState([]);
  const [foutItem, setFoutItem] = useState(null);
  const [klaar, setKlaar] = useState(false);

  // Eenmalig schudden bij mount (lazy initializer, niet bij elke render).
  const [geschud] = useState(() => {
    const kopie = [...step.items];
    for (let i = kopie.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
    }
    return kopie;
  });

  const klikItem = (item) => {
    if (klaar) return;
    const verwachtId = step.items[geplaatst.length]?.id;
    if (item.id === verwachtId) {
      const nieuw = [...geplaatst, item];
      setGeplaatst(nieuw);
      setFoutItem(null);
      if (nieuw.length === step.items.length) {
        setKlaar(true);
        setTimeout(() => onVoltooid(), 1200);
      }
    } else {
      setFoutItem(item.id);
      setTimeout(() => setFoutItem(null), 1200);
    }
  };

  const isGeplaatst = (id) => geplaatst.some(g => g.id === id);

  return (
    <div className="space-y-4">
      {/* Voortgangsbalk */}
      <div className="flex items-center gap-2">
        {step.items.map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-colors ${
              i < geplaatst.length ? 'bg-green-500' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Al geplaatste stappen, in volgorde */}
      {geplaatst.length > 0 && (
        <ol className="space-y-2">
          {geplaatst.map((item, i) => (
            <li
              key={item.id}
              className="flex items-start gap-3 bg-green-50 border-2 border-green-500 rounded-xl p-3"
            >
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500 text-white font-bold flex items-center justify-center text-sm">
                {i + 1}
              </span>
              <span className="text-green-900 font-medium">{item.text}</span>
            </li>
          ))}
        </ol>
      )}

      {/* Nog te plaatsen (geschud) */}
      {!klaar && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            Klik de volgende stap aan ({geplaatst.length + 1} van {step.items.length})
          </p>
          {geschud.filter(item => !isGeplaatst(item.id)).map(item => (
            <button
              key={item.id}
              onClick={() => klikItem(item)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                foutItem === item.id
                  ? 'border-red-500 bg-red-50 text-red-800 animate-pulse'
                  : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
              }`}
            >
              {item.text}
              {foutItem === item.id && (
                <span className="block text-sm mt-1 font-medium">
                  Nog niet — welke stap komt hiervóór?
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {klaar && (
        <div className="bg-green-50 border-2 border-green-500 rounded-xl p-4 text-green-800 font-semibold text-center">
          Volgorde correct! Je kent de basisstappen.
        </div>
      )}
    </div>
  );
}

const EHBODetail = () => {
  const { profile } = useOutletContext();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeScenario, setActiveScenario] = useState(null);
 const navigate = useNavigate();

  // Leerplandoel-filtering (EHBO GO! — BV1/2/3_01.01, cumulatief).
  // Leerkracht/admin ziet alles + labels + graadfilter; leerling ziet enkel
  // zijn eigen graad en alle lagere. De filter is didactisch, niet een
  // toegangsgrens: scenario's zijn oefeningen, geen persoonsgegevens.
  const isLeerkrachtOfAdmin =
    profile?.rol === 'leerkracht' ||
    profile?.rol === 'administrator' ||
    profile?.rol === 'super-administrator';
  const leerlingGraad = getGraadFromKlas(profile?.klas);
  const [graadFilter, setGraadFilter] = useState('alle'); // enkel voor leerkracht/admin

  const zichtbareScenarios = scenarios.filter(scenario => {
    // Scenario's zonder graad-tag altijd tonen (voorzichtige default).
    if (!scenario.graad) return true;
    if (isLeerkrachtOfAdmin) {
      return graadFilter === 'alle' || scenario.graad === Number(graadFilter);
    }
    // Leerling: cumulatief t/m de eigen graad. Onbekende graad -> alles tonen
    // (dan kan de leerling tenminste oefenen i.p.v. een leeg scherm te zien).
    if (!leerlingGraad) return true;
    return scenario.graad <= leerlingGraad;
  });

  // Kettingreacties horen bij de 3de graad (ze combineren meerdere scenario's
  // tot een reeks). Leerling: enkel wie in graad 3 zit (of onbekende graad ->
  // tonen i.p.v. verbergen). Leerkracht/admin: volgt de graadfilter.
  const mogenChainsGetoond = isLeerkrachtOfAdmin
    ? (graadFilter === 'alle' || graadFilter === '3')
    : (!leerlingGraad || leerlingGraad === 3);

  // Variant B — gegroepeerde weergave voor de LEERLING: eigen graad bovenaan
  // als grote tiles, lagere graden elk in een eigen kader met hun scenario's.
  // De leerkracht/admin houdt de platte lijst (zichtbareScenarios) + filter.
  const eigenGraadScenarios = leerlingGraad
    ? scenarios.filter(sc => sc.graad === leerlingGraad)
    : [];
  const lagereGraden = leerlingGraad
    ? [1, 2].filter(g => g < leerlingGraad).map(g => ({
        graad: g,
        label: ['', '1ste graad', '2de graad', '3de graad'][g],
        scenarios: scenarios.filter(sc => sc.graad === g),
      }))
    : [];

  const [userProgress, setUserProgress] = useState({
    completedScenarios: [],
    certificates: [],
    totalScore: 0,
    streak: 0
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [scenarioResults, setScenarioResults] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);

  const [gameState, setGameState] = useState({
  role: null,
  complications: [],
  resources: { time: 100, stress: 0, effectiveness: 100 }
});
const [showRoleIntro, setShowRoleIntro] = useState(false);
const [showComplication, setShowComplication] = useState(null);
const [activeChain, setActiveChain] = useState(null);
const [chainProgress, setChainProgress] = useState(null);
const [isLastStep, setIsLastStep] = useState(false);
const [showIntermediateFeedback, setShowIntermediateFeedback] = useState(false);
const [chainQuestionOffset, setChainQuestionOffset] = useState(0);

// NIEUW: Enhanced hooks toevoegen
  const {
    enhancedMode,
    setEnhancedMode,
    enhancedScenario,
    startEnhancedScenario,
    completeEnhancedScenario,
    toggleHint,
    showHints,
    insights,
    isEnhanced
  } = useEnhancedScenario(profile);

  const {
    userAnalysis,
    shouldShowTimeAdjustment,
    shouldShowHints
  } = useAdaptiveAnalysis(profile);

  const {
    accessibilityMode,
    setAccessibilityMode,
    features: accessibilityFeatures
  } = useAccessibilityFeatures(profile);

  // Dit blok laadt de opgeslagen voortgang wanneer de component laadt
   useEffect(() => {
    if (!profile?.id) return;

    // Luister direct naar wijzigingen in het gebruikersdocument
    const userRef = doc(db, 'users', profile.id);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setUserProgress({
          completedScenarios: userData.completed_ehbo_scenarios || [],
          certificates: [], // Logica voor certificaten nog te implementeren
          totalScore: userData.ehbo_total_score || 0,
          streak: userData.ehbo_streak || 0
        });
      }
    });

    // Stop de listener wanneer de component wordt verlaten
    return () => unsubscribe();
    
  }, [profile?.id]);
  
  // Scenario data - Uitgebreid met meer leerplandoel-relevante scenario's
  // De scenario-arrays (scenarios + scenarioChains) staan sinds de
  // opsplitsing in src/data/ehboScenarios.js. Zie de import bovenaan.

  // Emergency contacts data
  const emergencyContacts = [
    { number: '112', description: 'Algemeen noodnummer (ambulance, brandweer, politie)', icon: '🚨' },
    { number: '101', description: 'Niet-dringende hulp politie', icon: '👮' },
    { number: '1733', description: 'Huisartsenpost (buiten kantooruren)', icon: '👨‍⚕️' },
    { number: '070-245 245', description: 'Vergiftigingen informatie', icon: '☠️' }
  ];

  // Calculate progress
  const totalScenarios = scenarios.length;
  const completedCount = userProgress.completedScenarios.length;
  const progressPercentage = (completedCount / totalScenarios) * 100;

  // Timer effect
useEffect(() => {
    let interval;
    // ALLEEN timer starten als accessibility mode UIT staat
    if (timeRemaining > 0 && activeScenario && !showResults && !accessibilityMode) {
      interval = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && activeScenario && !accessibilityMode) {
      handleTimeUp();
    }
    return () => clearInterval(interval);
  }, [timeRemaining, activeScenario, showResults, accessibilityMode]);


 const handleTimeUp = () => {
  const currentStepData = activeScenario.steps[currentStep];

  // Zoek de weg die een fout antwoord normaal zou nemen om de 'nextStepId' te bepalen.
  const incorrectPath = currentStepData.options.find(opt => !opt.correct);
  const nextStepIdForConsequence = incorrectPath ? incorrectPath.nextStepId : null;

  // Creëer een "virtueel" antwoord voor de time-out.
  const timeoutAnswer = {
    id: 'timeout',
    correct: false,
    feedback: 'Je was te laat. In een noodgeval telt elke seconde.',
    nextStepId: nextStepIdForConsequence
  };

  // Geef dit virtuele antwoord door aan de handleAnswer functie, met een extra 'isTimeout' vlag.
  handleAnswer(timeoutAnswer, currentStepData, true);
};


 

const startScenario = async (scenario, chain = null) => {
    setActiveChain(chain);
    const scenarioCopy = JSON.parse(JSON.stringify(scenario));
    scenarioCopy.steps.forEach(step => {
      if (step.options) {
        step.options = shuffleArray(step.options);
      }
    });
  
    setCurrentStep(0);
    setScenarioResults({});
    setShowResults(false);
    setShowNextButton(false);
  
    if (enhancedMode) {
      const enhanced = await startEnhancedScenario(scenarioCopy);
      if (enhanced) {
        // Controleer of we in een doorlopende keten zitten (rol is al toegewezen)
        const isOngoingChain = chain && gameState.role;
  
        if (isOngoingChain) {
          // Rol bestaat al, sla de introductie over
          setActiveScenario(enhanced);
          setTimeRemaining(accessibilityMode ? null : enhanced.steps[0].timeLimit);
          setShowRoleIntro(false);
        } else {
          // Nieuwe keten of los scenario: reset de offset en wijs een rol toe
          setChainQuestionOffset(0);
          const role = RoleBasedScenarios.assignRole(enhanced, profile);
          const roleEnhanced = RoleBasedScenarios.adaptScenarioForRole(enhanced, role);
          const complications = ComplicationSystem.generateComplications(enhanced, profile, {});
          
          setGameState({
            role: role,
            complications: complications,
            resources: { time: 100, stress: role.stressLevel, effectiveness: 100 }
          });
          
          if (role) {
            setShowRoleIntro(true); // Toon de rol-introductie
          }
          setActiveScenario(roleEnhanced);
          setTimeRemaining(accessibilityMode ? null : roleEnhanced.steps[0].timeLimit);
        }
      }
    } else {
      // Standaard modus, reset altijd de offset
      setChainQuestionOffset(0);
      setActiveScenario(scenarioCopy);
      setTimeRemaining(accessibilityMode ? null : scenarioCopy.steps[0].timeLimit);
    }
  };


 

const handleAnswer = (selectedOption, step, isTimeout = false) => {
  setTimeRemaining(null);
  const newResults = {
    ...scenarioResults,
    [step.id]: {
      selected: selectedOption,
      correct: selectedOption.correct,
      timeUsed: isTimeout ? step.timeLimit : (step.timeLimit - timeRemaining),
      stepId: step.id,
      timedOut: isTimeout
    }
  };
  setScenarioResults(newResults);

  // Bepaal of we op een normale vraag of een vervolgvraag zitten
  const isCurrentStepConsequence = String(step.id).includes('_consequence');

  // Reset de 'tussenfase' en knoppen
  setShowIntermediateFeedback(false);
  setShowNextButton(false);

  if (selectedOption.correct) {
    // ---- CORRECT ANTWOORD ----
    // Toon de "Volgende" knop zoals voorheen.
    setShowNextButton(true);
    setIsLastStep(selectedOption.nextStepId === null);
  } else {
    // ---- FOUT ANTWOORD ----
    if (!isCurrentStepConsequence) {
      // Dit is de EERSTE fout op een normale vraag.
      // Activeer de 'tussenfase' met de "Verder" knop.
      setShowIntermediateFeedback(true);
    } else {
      // Dit is de TWEEDE fout, op een vervolgvraag.
      // Toon direct de "Volgende Vraag" knop, de JSX zorgt voor de oplichtende antwoorden.
      setShowNextButton(true);
      setIsLastStep(selectedOption.nextStepId === null);
    }
  }
};

// Nieuwe functie voor volgende stap

const goToNextStep = (selectedOption) => {
  setShowNextButton(false);

  // Als er geen 'selectedOption' is meegegeven, haal het als fallback uit de state.
  // Dit zorgt ervoor dat de "Volgende" knop ook blijft werken.
  if (!selectedOption) {
    const currentStepData = activeScenario.steps[currentStep];
    const resultForCurrentStep = scenarioResults[currentStepData.id];
    if (!resultForCurrentStep) {
      console.error("Kon het resultaat voor de huidige stap niet vinden bij fallback.");
      resetScenario();
      return;
    }
    selectedOption = resultForCurrentStep.selected;
  }

  const nextStepId = selectedOption.nextStepId;

  if (nextStepId) {
    const nextStepIndex = activeScenario.steps.findIndex(step => step.id === nextStepId);

    if (nextStepIndex !== -1) {
      setCurrentStep(nextStepIndex);
      const nextStep = activeScenario.steps[nextStepIndex];
      setTimeRemaining(accessibilityMode ? null : nextStep.timeLimit);
    } else {
      completeScenario(scenarioResults);
    }
  } else {
    completeScenario(scenarioResults);
  }
};

// Role intro completion handler (voeg toe na je goToNextStep functie)
const handleRoleIntroComplete = () => {
  setShowRoleIntro(false);
  if (activeScenario) {
    setCurrentStep(0);
    setScenarioResults({});
    setShowResults(false);
    
    const firstStep = activeScenario.steps[0];
    setTimeRemaining(accessibilityMode ? null : firstStep.timeLimit);
  }
};

  // in EHBODetail.jsx

const completeScenario = async (results) => {
    if (activeChain) {
      const scenarioResult = { score: Math.round((Object.values(results).filter(r => r.correct).length / activeScenario.steps.length) * 100) };
      const nextChainStep = ScenarioChainSystem.getNextScenario(activeChain, activeScenario.id);
  
      if (nextChainStep && nextChainStep.nextScenarioId) {
        const nextScenario = scenarios.find(s => s.id === nextChainStep.nextScenarioId);
        if (nextScenario) {
          // Update de vraag-offset met het aantal vragen in het voltooide scenario
          const answeredQuestionsInStep = Object.keys(results).filter(key => !key.includes('_consequence')).length;
          setChainQuestionOffset(prevOffset => prevOffset + answeredQuestionsInStep);
          
          setChainProgress(nextChainStep.chainProgress);
          startScenario(nextScenario, activeChain);
          return;
        }
      }
    }

    // Als er geen actieve keten is, of de keten is voorbij, toon de resultaten
    const correctAnswers = Object.values(results).filter(r => r.correct).length;
    const totalQuestions = activeScenario.steps.length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    
    // Bestaande logica voor normale scenarios
    if (!userProgress.completedScenarios.includes(activeScenario.id)) {
      setUserProgress(prev => ({
        ...prev,
        completedScenarios: [...prev.completedScenarios, activeScenario.id],
        totalScore: prev.totalScore + score,
        streak: prev.streak + 1
      }));
      
      handleScenarioCompletion(activeScenario.id);
      
      try {
        const saveProgress = httpsCallable(functions, 'saveEHBOProgress');
        await saveProgress({
          userId: profile.id,
          scenarioId: activeScenario.id,
          score: score,
          isEnhanced: isEnhanced // NIEUW: Track enhanced scenarios
        });
      } catch (error) {
        console.error("Opslaan EHBO voortgang mislukt:", error);
      }
    }

    // NIEUW: Enhanced scenario completion
    if (isEnhanced) {
      const enhancedCompletion = await completeEnhancedScenario(Object.values(results));
      if (enhancedCompletion?.insights) {
        // Enhanced insights worden later getoond in ScenarioResults
      }
    }
    
    setShowResults(true);
  };

  const resetScenario = () => {
  setActiveScenario(null);
  setCurrentStep(0);
  setScenarioResults({});
  setShowResults(false);
  setTimeRemaining(null);
  // NIEUW: Reset enhanced state
  setGameState({
    role: null,
    complications: [],
    resources: { time: 100, stress: 0, effectiveness: 100 }
  });
  setShowRoleIntro(false);
  setShowComplication(null);
};
// Header met toegankelijkheidsopties
 const AccessibilityControls = () => (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
      <h3 className="font-semibold text-blue-800 mb-3">Leer Modi & Toegankelijkheid</h3>
      
      {/* Bestaande accessibility toggle */}
      <label className="flex items-center gap-3 cursor-pointer mb-3">
        <input
          type="checkbox"
          checked={accessibilityMode}
          onChange={(e) => setAccessibilityMode(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
        />
        <div>
          <span className="font-medium text-blue-700">Basis Toegankelijkheid</span>
          <p className="text-sm text-blue-600">
            Geen tijdsdruk + aangepaste interface
          </p>
        </div>
      </label>

      {/* NIEUW: Enhanced mode toggle */}
      <label className="flex items-center gap-3 cursor-pointer mb-3">
        <input
          type="checkbox"
          checked={enhancedMode}
          onChange={(e) => setEnhancedMode(e.target.checked)}
          className="w-4 h-4 text-purple-600 border-purple-300 rounded focus:ring-purple-500"
        />
        <div>
          <span className="font-medium text-purple-700">Enhanced Leren</span>
          <p className="text-sm text-purple-600">
            Adaptieve scenarios met realistische complicaties
          </p>
        </div>
      </label>

      {/* NIEUW: Toon welke adaptaties actief zijn */}
      {(enhancedMode || accessibilityMode) && (
        <div className="mt-3 p-3 bg-white/50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Actieve Aanpassingen:</h4>
          <div className="flex flex-wrap gap-2">
            {accessibilityMode && (
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                Uitgebreide tijd
              </span>
            )}
            {enhancedMode && shouldShowTimeAdjustment && (
              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded">
                Slim tijdsbeheer
              </span>
            )}
            {enhancedMode && shouldShowHints && (
              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">
                Hint systeem
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );

const startChain = (chain) => {
    setChainQuestionOffset(0); // Reset de teller bij het starten van een nieuwe keten
    if (!chain || !chain.scenarios || chain.scenarios.length === 0) {
      console.error("Ongeldige keten geselecteerd", chain);
      return;
    }
    const firstScenarioId = chain.scenarios[0].id;
    const firstScenario = scenarios.find(s => s.id === firstScenarioId);
    if (firstScenario) {
      startScenario(firstScenario, chain);
    } else {
      console.error("Eerste scenario in de keten niet gevonden:", firstScenarioId);
    }
  };

  // Herbruikbare scenario-kaart. Gebruikt in de eigen-graad-grid én in de
  // kaders van de lagere graden (variant B). Leest userProgress,
  // isLeerkrachtOfAdmin en startScenario uit de closure.
  const ScenarioKaart = ({ scenario, mini = false }) => {
    const isCompleted = userProgress.completedScenarios.includes(scenario.id);

    const colorClass = {
      red: 'from-red-500 to-pink-500',
      orange: 'from-orange-500 to-amber-500',
      blue: 'from-blue-500 to-indigo-500',
      green: 'from-green-500 to-emerald-500',
      purple: 'from-purple-500 to-violet-500'
    }[scenario.color];

    // Mini-variant voor lagere graden: enkel de titel als compacte klikbare
    // pill. Behoudt de kleur van de tile (zelfde gradient als de volle kaart),
    // geen emoji, geen beschrijving, geen startknop.
    if (mini) {
      return (
        <button
          key={scenario.id}
          onClick={() => startScenario(scenario)}
          className={`text-left text-sm font-semibold text-white px-3 py-2 rounded-lg bg-gradient-to-br ${colorClass} transform transition-all hover:scale-105 ${
            isCompleted ? 'ring-2 ring-yellow-400' : ''
          }`}
        >
          {scenario.title}
        </button>
      );
    }

    return (
      <div
        key={scenario.id}
        className={`relative bg-gradient-to-br ${colorClass} rounded-xl p-4 text-white cursor-pointer transform transition-all hover:scale-105 ${isCompleted ? 'ring-2 ring-yellow-400' : ''}`}
        onClick={() => startScenario(scenario)}
      >
        {isCompleted && (
          <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full p-1">
            <CheckIcon className="w-4 h-4" />
          </div>
        )}

        <div className="flex items-start justify-between mb-3">
          <div className="text-4xl">{scenario.image}</div>
          <div className="text-right text-xs opacity-90">
            <div>{scenario.difficulty}</div>
            <div>{scenario.duration}</div>
          </div>
        </div>

        <h4 className="text-lg font-bold mb-2">{scenario.title}</h4>

        {scenario.type === 'symptomen' && (
          <div className="inline-flex items-center gap-1.5 bg-white/25 backdrop-blur-sm rounded-full px-2.5 py-1 mb-2 text-xs font-semibold">
            <span>🔍 Herkennen</span>
          </div>
        )}

        {isLeerkrachtOfAdmin && scenario.graad && (
          <div className="inline-flex items-center gap-1.5 bg-white/25 backdrop-blur-sm rounded-full px-2.5 py-1 mb-2 text-xs font-semibold">
            <AcademicCapIcon className="w-3.5 h-3.5" />
            <span>{['', '1ste', '2de', '3de'][scenario.graad]} graad · {scenario.leerplandoel}</span>
          </div>
        )}

        <p className="text-sm opacity-90 mb-3 line-clamp-2">{scenario.description}</p>

        <button className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-white/30 transition-colors text-sm">
          <PlayIcon className="w-4 h-4" />
          {isCompleted ? 'Opnieuw' : 'Start'}
        </button>
      </div>
    );
  };

  const Dashboard = () => (
    <div className="space-y-6">
      {/* OPTIMALISATIE: Status en controls samengevoegd in één compacte balk */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Linkergedeelte: Voortgang */}
        <div className="flex-grow min-w-[250px]">
          <h2 className="text-base font-bold text-slate-800">EHBO Voortgang ({completedCount}/{totalScenarios})</h2>
          <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
            <div 
              className="bg-emerald-500 rounded-full h-2 transition-all duration-1000"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        
        {/* Rechtergedeelte: Stats en Knoppen */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Stats */}
          <div className="flex gap-4 text-center">
            <div>
              <div className="text-base font-bold text-slate-700">{userProgress.totalScore}</div>
              <div className="text-xs text-slate-500">Score</div>
            </div>
            <div>
              <div className="text-base font-bold text-slate-700">{userProgress.streak}</div>
              <div className="text-xs text-slate-500">Streak</div>
            </div>
          </div>
          
          {/* Leer Modi */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
            <h3 className="font-semibold text-blue-800 text-xs mb-2">Leer Modi</h3>
            <div className="flex gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accessibilityMode}
                  onChange={(e) => setAccessibilityMode(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
                />
                <span className="text-xs text-blue-700">Geen tijdsdruk</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enhancedMode}
                  onChange={(e) => setEnhancedMode(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-purple-300 rounded focus:ring-purple-500"
                />
                <span className="text-xs text-purple-700">Enhanced</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    {/* --- START WIJZIGING: Toon dit blok alleen als enhancedMode aan staat --- */}
{enhancedMode && mogenChainsGetoond && (
<div className="mb-8">
      <h2 className="text-xl font-bold text-slate-800 mb-4">Kettingreacties</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenarioChains.map(chain => {
          const colorClass = {
            red: 'from-red-500 to-pink-500',
            blue: 'from-blue-500 to-indigo-500',
            orange: 'from-orange-500 to-amber-500',
            purple: 'from-purple-500 to-violet-500'
          }[chain.color];

          return (
            <div
              key={chain.id}
              className={`relative bg-gradient-to-br ${colorClass} rounded-xl p-4 text-white cursor-pointer transform transition-all hover:scale-105`}
              onClick={() => startChain(chain)} // Gebruik de nieuwe startChain functie
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-4xl">{chain.image}</div>
                <div className="text-right text-xs opacity-90">
                  <div>{chain.scenarios.length} Scenario's</div>
                </div>
              </div>
              <h4 className="text-lg font-bold mb-2">{chain.title}</h4>
              <p className="text-sm opacity-90 mb-3 line-clamp-2">{chain.description}</p>
              <button className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-white/30 transition-colors text-sm">
                <PlayIcon className="w-4 h-4" />
                Start Keten
              </button>
            </div>
          );
        })}
      </div>
    </div>
    )}
    {/* Graadfilter — enkel voor leerkracht/admin */}
    {isLeerkrachtOfAdmin && (
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm font-medium text-gray-600 mr-1">Filter op graad:</span>
        {[
          { waarde: 'alle', label: 'Alle graden' },
          { waarde: '1', label: '1ste graad' },
          { waarde: '2', label: '2de graad' },
          { waarde: '3', label: '3de graad' },
        ].map(optie => (
          <button
            key={optie.waarde}
            onClick={() => setGraadFilter(optie.waarde)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              graadFilter === optie.waarde
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {optie.label}
          </button>
        ))}
      </div>
    )}

    {/* Scenario-weergave. Leerkracht/admin: platte lijst met alle (gefilterde)
        scenario's + labels. Leerling (variant B): eigen graad bovenaan, lagere
        graden elk in een eigen kader met hun scenario's er direct in. */}
    {isLeerkrachtOfAdmin ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {zichtbareScenarios.map(scenario => (
          <ScenarioKaart key={scenario.id} scenario={scenario} />
        ))}
      </div>
    ) : (
      <div className="space-y-8">
        {/* Eigen graad */}
        {eigenGraadScenarios.length > 0 && (
          <div>
            {leerlingGraad && (
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Jouw graad — {['', '1ste', '2de', '3de'][leerlingGraad]} graad
              </h3>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {eigenGraadScenarios.map(scenario => (
                <ScenarioKaart key={scenario.id} scenario={scenario} />
              ))}
            </div>
          </div>
        )}

        {/* Onbekende graad: toon alles plat (fallback, geen leeg scherm) */}
        {!leerlingGraad && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zichtbareScenarios.map(scenario => (
              <ScenarioKaart key={scenario.id} scenario={scenario} />
            ))}
          </div>
        )}

        {/* Lagere graden, elk in een eigen kader. Mini-tiles: enkel titel,
            compact naast elkaar i.p.v. een 3-koloms grid met volle kaarten. */}
        {lagereGraden.map(groep => (
          <div key={groep.graad} className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {groep.label}
            </h3>
            <div className="flex flex-wrap gap-2">
              {groep.scenarios.map(scenario => (
                <ScenarioKaart key={scenario.id} scenario={scenario} mini />
              ))}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

  const ScenarioView = () => {
    if (!activeScenario) return null;
    
    const currentStepData = activeScenario.steps[currentStep];
    const selectedAnswer = scenarioResults[currentStepData.id]?.selected;
    const isCurrentStepConsequence = String(currentStepData.id).includes('_consequence');

    return (
      // Vult de beschikbare schermhoogte en verdeelt die: vaste header,
      // meeschalende inhoud. dvh i.p.v. vh zodat de browserbalk op mobiel
      // meegerekend wordt.
      <div className="max-w-4xl mx-auto flex flex-col" style={{ height: 'calc(100dvh - 6rem)' }}>
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col flex-1 min-h-0">
          {/* Header */}
          {/* OPTIMALISATIE: Minder padding (p-4), kleinere titel op mobiel (text-xl) */}
          <div className={`flex-shrink-0 bg-gradient-to-r from-${activeScenario.color}-500 to-${activeScenario.color}-600 p-4 text-white`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl md:text-2xl font-bold">{activeScenario.title}</h2>
              <button onClick={resetScenario} className="p-1 rounded-full hover:bg-white/20"><XMarkIcon className="w-6 h-6" /></button>
            </div>
            
            {/* --- START WIJZIGING --- */}
            <div className="flex items-center justify-between">
             <div className="flex items-center gap-4 flex-1 min-w-0 pr-3">
                {/* De vraag staat in de gekleurde kop (zwart), zodat de
                    inhoud eronder alle ruimte krijgt voor de foto. */}
                <p className="text-base md:text-lg font-semibold text-slate-900 leading-snug">
                  {currentStepData.question}
                </p>
              </div>
              
              {/* TIMER ALLEEN TONEN ALS ACCESSIBILITY MODE UIT STAAT */}
              {timeRemaining && !accessibilityMode && (
                <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1">
                  <ClockIcon className="w-4 h-4" />
                  <span className="font-mono">{timeRemaining}s</span>
                </div>
              )}

              {/* ALTERNATIEVE INDICATOR BIJ ACCESSIBILITY MODE */}
              {accessibilityMode && (
                <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1">
                  <span className="text-sm">Geen tijdsdruk</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Question Content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
            {!showResults ? (
              <>
                <div className="mb-6">

                  {/* Tekening bij een gewone vraag. Bij interactie 'hotspots'
                      tekent HotspotOefening de scène zelf (met klikzones).
                      sceneOpgeruimd laat gevaren die al weggewerkt zijn weg,
                      zodat de leerling het resultaat van zijn werk ziet. */}
                  {/* Bij een vraag MET foto staan de keuzes op een breed scherm
                      naast de foto (lg:grid-cols-2), zodat de foto de volle
                      hoogte krijgt. Op smalle schermen stapelen ze. */}
                  <div className={currentStepData.scene && currentStepData.interactie !== 'hotspots'
                    ? 'grid grid-cols-1 lg:grid-cols-2 gap-4 lg:items-start'
                    : ''}>
                  {currentStepData.scene && currentStepData.interactie !== 'hotspots' && (
                    <div className="mb-2 lg:mb-0">
                      <SceneWeergave
                        scene={currentStepData.scene}
                        opgeruimd={currentStepData.sceneOpgeruimd || []}
                        hotspots={currentStepData.toonGedaan ? (currentStepData.hotspots || []) : []}
                        gedaan={currentStepData.toonGedaan ? (currentStepData.hotspots || []).map(h => h.id) : []}
                        maxHoogte="min(58dvh, calc(100dvh - 22rem))"
                      />
                    </div>
                  )}
                  <div>
                  {/* Role considerations */}
                  {isEnhanced && currentStepData.roleConsiderations && currentStepData.roleConsiderations.length > 0 && (
                    <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <h4 className="font-semibold text-purple-800 mb-2">Denk hierbij aan:</h4>
                      <ul className="text-sm text-purple-700 space-y-1">
                        {currentStepData.roleConsiderations.map((consideration, index) => (
                          <li key={index}>• {consideration}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                 {/* Volgorde-oefening krijgt een eigen interactie; de rest
                     blijft de klassieke meerkeuzeknoppen. De oefening geeft
                     bij voltooiing het (enige, correcte) antwoord door aan
                     handleAnswer, zodat scoring en nextStepId ongewijzigd werken. */}
                 {currentStepData.interactie === 'hotspots' ? (
                   <HotspotOefening
                     key={currentStepData.id}
                     step={currentStepData}
                     onVoltooid={() => handleAnswer(currentStepData.options[0], currentStepData)}
                   />
                 ) : currentStepData.interactie === 'volgorde' ? (
                   <VolgordeOefening
                     key={currentStepData.id}
                     step={currentStepData}
                     onVoltooid={() => handleAnswer(currentStepData.options[0], currentStepData)}
                   />
                 ) : (
                 <div className="space-y-3">
                    {currentStepData.options.map(option => (
                      <button
                        key={option.id}
                        onClick={() => handleAnswer(option, currentStepData)}
                        disabled={selectedAnswer}
                     className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                      (() => {
                        // Geen antwoord geselecteerd: standaard hover-stijl
                        if (!selectedAnswer) {
                          return 'border-gray-200 hover:border-blue-500 hover:bg-blue-50';
                        }

                        // Is deze optie de geselecteerde optie?
                        if (selectedAnswer.id === option.id) {
                          return option.correct
                            ? 'border-green-500 bg-green-50 text-green-800 scale-105 shadow-lg' // Geselecteerd & correct
                            : 'border-red-500 bg-red-50 text-red-800 scale-105 shadow-lg';    // Geselecteerd & incorrect
                        }
                        
                        // Deze optie is NIET geselecteerd
                        // Als we op een consequentie-vraag zitten, het foute antwoord is gekozen, EN deze optie de juiste is...
                        if (isCurrentStepConsequence && !selectedAnswer.correct && option.correct) {
                          // ... maak deze dan groen om het juiste antwoord te tonen.
                          return 'border-green-500 bg-green-50 text-green-800';
                        }

                        // In alle andere gevallen (niet-geselecteerde opties)
                        return 'border-gray-200 bg-gray-50 text-gray-500 opacity-70';
                      })()
                    }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{option.text}</span>
                          {selectedAnswer && selectedAnswer.id === option.id && (
                            <div className="ml-4">
                              {option.correct ? (
                                <CheckIcon className="w-6 h-6 text-green-600" />
                              ) : (
                                <XMarkIcon className="w-6 h-6 text-red-600" />
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                 )}
                  </div>
                  </div>
                {/* NIEUW: Hint systeem voor enhanced scenarios */}
                  {isEnhanced && currentStepData.hint && shouldShowHints && (
                    <EnhancedUIComponents.HintDisplay
                      hint={currentStepData.hint}
                      showHint={showHints[currentStepData.id]}
                      onToggleHint={() => toggleHint(currentStepData.id)}
                    />
                  )}
                </div>
                
                {selectedAnswer && (
                    <div className={`p-4 rounded-xl ${
                      selectedAnswer.timedOut
                        ? 'bg-yellow-50 border border-yellow-200'
                        : showIntermediateFeedback 
                          ? 'bg-orange-50 border border-orange-200' 
                          : selectedAnswer.correct 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-red-50 border border-red-200'
                    }`}>

                      {/* --- AANGEPASTE CONDITIONELE FEEDBACK --- */}
                      {selectedAnswer.timedOut ? (
                        // Speciale melding voor time-out
                        <p className="font-medium text-yellow-800">
                          Je kon de vraag niet op tijd beantwoorden.
                        </p>
                      ) : showIntermediateFeedback ? (
                        // Melding voor een 'normaal' fout antwoord
                        <p className="font-medium text-orange-800">
                          Dat antwoord is helaas niet correct. Denk goed na over wat de gevolgen zijn.
                        </p>
                      ) : (
                        // Volledige feedback bij een correct antwoord of 2e foute antwoord
                        <>
                          <p className={`font-medium ${selectedAnswer.correct ? 'text-green-800' : 'text-red-800'}`}>
                            {selectedAnswer.feedback}
                          </p>
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="font-semibold text-blue-800 mb-1">Uitleg:</h4>
                            <p className="text-blue-700 text-sm">{currentStepData.explanation}</p>
                          </div>
                        </>
                      )}

                      {/* --- AANGEPASTE CONDITIONELE KNOPPEN --- */}
                      <div className="mt-4 text-center">
                        {/* Toon "Verder" knop bij time-out OF bij een eerste foute antwoord */}
                        {(selectedAnswer.timedOut || showIntermediateFeedback) ? (
                          <button
                            onClick={() => goToNextStep(selectedAnswer)}
                            className={`text-white px-6 py-2 rounded-lg ${selectedAnswer.timedOut ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-orange-500 hover:bg-orange-600'}`}
                          >
                            Verder
                          </button>
                        ) : showNextButton ? (
                          // Toon de "Volgende Vraag" / "Resultaten" knop
                          <button
                            onClick={() => goToNextStep(selectedAnswer)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
                          >
                            {isLastStep ? 'Toon Resultaten' : 'Volgende Vraag'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )}
              </>
            ) : (
              <ScenarioResults />
            )}
          </div>
        </div>
        {/* Role Introduction Modal */}
{showRoleIntro && gameState.role && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl p-8 max-w-lg mx-4">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🎭</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Je Rol in dit Scenario</h2>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold text-purple-700 mb-2">{gameState.role.name}</h3>
        <p className="text-gray-600 mb-4">{gameState.role.description}</p>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <h4 className="font-semibold text-purple-800 mb-2">Je Verantwoordelijkheden:</h4>
          <ul className="text-sm text-purple-700 space-y-1">
            {gameState.role.responsibilities.map((resp, index) => (
              <li key={index}>• {resp}</li>
            ))}
          </ul>
        </div>

        {gameState.role.challenges.length > 0 && (
          <div className="bg-orange-50 rounded-lg p-4 mt-3">
            <h4 className="font-semibold text-orange-800 mb-2">Extra Uitdagingen:</h4>
            <ul className="text-sm text-orange-700 space-y-1">
              {gameState.role.challenges.map((challenge, index) => (
                <li key={index}>• {challenge}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleRoleIntroComplete}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
        >
          Start Scenario
        </button>
        <button
          onClick={() => setShowRoleIntro(false)}
          className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Overslaan
        </button>
      </div>
    </div>
  </div>
)}
      </div>
    );
  };


  const ScenarioResults = () => {
    // --- START WIJZIGING ---
    const correctAnswers = Object.values(scenarioResults).filter(r => r.correct).length;
    // Gebruik het aantal opgeslagen resultaten als het totaal, niet de lengte van de steps-array
    const totalAnswered = Object.keys(scenarioResults).length;
    
    const score = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
    // --- EINDE WIJZIGING ---
    
    return (
      <div className="text-center">
        <div className="mb-8">
          <div className="text-6xl mb-4">
            {score >= 80 ? '🏆' : score >= 60 ? '🥉' : '📚'}
          </div>
          <h3 className="text-2xl font-bold mb-2">Scenario Voltooid!</h3>
          {/* Gebruik hier ook de correcte totalen */}
          <p className="text-gray-600 mb-4">Je hebt {correctAnswers} van de {totalAnswered} vragen correct beantwoord</p>
          
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl p-6 mb-6">
            <div className="text-4xl font-bold mb-2">{score}%</div>
            <div className="text-lg">
              {score >= 90 ? 'Uitstekend! Je bent klaar voor echte noodsituaties.' :
               score >= 70 ? 'Goed gedaan! Nog wat oefening en je bent er klaar voor.' :
               score >= 50 ? 'Niet slecht, maar meer oefening is nodig.' :
               'Dit scenario vraagt meer studie. Probeer het opnieuw!'}
            </div>
          </div>
        </div>
        
        <div className="space-y-4 mb-8">
          <h4 className="font-bold text-lg">Jouw Pad door het Scenario:</h4>
          {/* We gebruiken hier Object.entries om de volgorde te behouden */}
          {Object.entries(scenarioResults).map(([stepId, result], index) => {
            const step = activeScenario.steps.find(s => s.id.toString() === stepId.toString());
            if (!step) return null;

            const isConsequence = String(step.id).includes('_consequence');
            
            return (
              <div key={step.id} className={`flex items-center justify-between p-3 rounded-lg ${isConsequence ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                <span className={`font-medium ${isConsequence ? 'pl-4 text-yellow-800' : 'text-gray-700'}`}>
                  {isConsequence && '↪ '}Vraag {index + 1}
                </span>
                <div className="flex items-center gap-2">
                    {!accessibilityMode && (
                        <span className="text-sm text-gray-600">{result?.timeUsed}s</span>
                    )}
                    {result?.correct ? (
                        <CheckIcon className="w-5 h-5 text-green-600" />
                    ) : (
                        <XMarkIcon className="w-5 h-5 text-red-600" />
                    )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => startScenario(activeScenario)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl transition-colors"
          >
            Opnieuw Proberen
          </button>
          <button
            onClick={resetScenario}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl transition-colors"
          >
            Terug naar Overzicht
          </button>
        </div>
      </div>
    );
  };

  const EmergencyTab = () => (
    <div className="space-y-8">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
          <h2 className="text-xl font-bold text-red-800">Echte Noodsituatie?</h2>
        </div>
        <p className="text-red-700 mb-4">
          Als je dit leest tijdens een echte noodsituatie: STOP met lezen en bel onmiddellijk 112!
        </p>
        <a 
          href="tel:112" 
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-colors"
        >
          <PhoneIcon className="w-5 h-5" />
          BEL 112 NU
        </a>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-6">Belangrijke Nummers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {emergencyContacts.map((contact, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{contact.icon}</span>
                <div>
                  <a 
                    href={`tel:${contact.number}`}
                    className="text-2xl font-bold text-blue-600 hover:text-blue-800"
                  >
                    {contact.number}
                  </a>
                </div>
              </div>
              <p className="text-gray-600 text-sm">{contact.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-blue-800 mb-4">Wanneer 112 bellen?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold text-blue-700 mb-2">Levensbedreigende situaties:</h4>
            <ul className="space-y-1 text-blue-600">
              <li>• Bewusteloze persoon</li>
              <li>• Geen ademhaling/hartslag</li>
              <li>• Ernstige bloeding</li>
              <li>• Vermoeden hartaanval</li>
              <li>• Verslikking</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-blue-700 mb-2">Andere noodsituaties:</h4>
            <ul className="space-y-1 text-blue-600">
              <li>• Brand</li>
              <li>• Ernstig ongeval</li>
              <li>• Geweld/bedreiging</li>
              <li>• Persoon in gevaar</li>
              <li>• Bij twijfel: gewoon bellen!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  
const handleScenarioCompletion = async (scenarioId) => {
  if (!profile?.id || !functions) return;
  
  try {
    // Ken 30 XP toe voor EHBO scenario
    const awardEHBOXP = httpsCallable(functions, 'awardEHBOXP');
    await awardEHBOXP({ 
      userId: profile.id, 
      scenarioId: scenarioId,
      xpAmount: 30
    });
    
    toast.success('Scenario voltooid! +30 XP verdiend!');
  } catch (error) {
    console.error('EHBO XP fout:', error);
    // Laat scenario voltooiing niet falen door XP probleem
  }
};

const TheoryTab = () => (
  <div className="space-y-8">
    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-8 text-white">
      <h2 className="text-2xl font-bold mb-4">EHBO Basisprincipes</h2>
      <p className="text-purple-100">
        Leer de fundamentele principes die bij elke noodsituatie gelden
      </p>
    </div>

    {/* Basisprincipes uitgebreid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">🛡️</div>
        <h3 className="text-lg font-bold mb-3">1. Eigen Veiligheid</h3>
        <p className="text-gray-600 text-sm mb-3">
          Altijd eerst controleren of de situatie veilig is. Een dode held helpt niemand.
        </p>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Check verkeer, brand, instorting</li>
          <li>• Gebruik persoonlijke bescherming</li>
          <li>• Roep hulp als onveilig</li>
        </ul>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">📞</div>
        <h3 className="text-lg font-bold mb-3">2. Hulp Oproepen</h3>
        <p className="text-gray-600 text-sm mb-3">
          Bij ernstige situaties altijd 112 bellen. Hoe eerder professionele hulp, hoe beter.
        </p>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Blijf kalm en spreek duidelijk</li>
          <li>• Geef locatie, situatie, aantal gewonden</li>
          <li>• Luister naar instructies</li>
        </ul>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">🤝</div>
        <h3 className="text-lg font-bold mb-3">3. Eerste Hulp</h3>
        <p className="text-gray-600 text-sm mb-3">
          Pas je kennis toe om het slachtoffer te helpen tot professionele hulp arriveert.
        </p>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• ABC: Airway, Breathing, Circulation</li>
          <li>• Kalmeer het slachtoffer</li>
          <li>• Monitor vitale functies</li>
        </ul>
      </div>
    </div>

    {/* Gerestaureerde Reanimatie Keten */}
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-xl font-bold mb-6">De Reanimatie Keten</h3>
      <p className="text-gray-600 mb-4 text-sm">
        De overlevingsketen bij hartstilstand. Elke minuut vertraging vermindert overlevingskans met 10%.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { step: '1', title: 'Herkenning', desc: 'Bewusteloosheid + geen normale ademhaling', icon: '👁️', detail: 'Roep luid, schud schouders. Check 10 sec ademhaling.' },
          { step: '2', title: 'Alarm', desc: '112 bellen + AED halen', icon: '📱', detail: 'Bel zelf of laat anderen bellen. Vraag om AED.' },
          { step: '3', title: 'Reanimatie', desc: '30 borstcompressies + 2 beademingen', icon: '💪', detail: '5-6cm diep, 100-120/min. Volledig loslaten tussen compressies.' },
          { step: '4', title: 'AED', desc: 'Defibrillator zo snel mogelijk', icon: '⚡', detail: 'Volg stemcommandos. Zorg dat niemand het slachtoffer aanraakt.' }
        ].map((item, index) => (
          <div key={index} className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">{item.icon}</span>
            </div>
            <h4 className="font-bold text-red-600 mb-1">Stap {item.step}</h4>
            <h5 className="font-semibold mb-2">{item.title}</h5>
            <p className="text-sm text-gray-600 mb-2">{item.desc}</p>
            <p className="text-xs text-gray-500">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Uitgebreide specifieke scenario's */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">🔥</div>
        <h3 className="text-lg font-bold mb-3">Brandwonden</h3>
        <p className="text-gray-600 text-sm mb-3">
          Koelen met lauw water (15-25°C), 10-20 minuten. Geen ijs, zalf of boter.
        </p>
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong>1e graad:</strong> Rood, pijnlijk (zonnebrend)</p>
          <p><strong>2e graad:</strong> Blaren, zeer pijnlijk</p>
          <p><strong>3e graad:</strong> Wit/zwart, geen pijn</p>
          <p><strong>112 bij:</strong> handpalm, gezicht/hals, 3e graad</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">🐝</div>
        <h3 className="text-lg font-bold mb-3">Anafylaxie</h3>
        <p className="text-gray-600 text-sm mb-3">
          Levensbedreigende allergische reactie. EpiPen direct gebruiken, altijd 112.
        </p>
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong>Symptomen:</strong> Uitslag, zwelling, ademnood, bewusteloosheid</p>
          <p><strong>EpiPen:</strong> Oranje kant in dijspier, 10 sec vasthouden</p>
          <p><strong>Na EpiPen:</strong> Alsnog 112 bellen, tweede dosis mogelijk</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">⚡</div>
        <h3 className="text-lg font-bold mb-3">Epilepsie</h3>
        <p className="text-gray-600 text-sm mb-3">
          Bescherm de persoon, tijd bijhouden. Nooit tegenhouden of mond openen.
        </p>
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong>Tijdens aanval:</strong> Omgeving veilig, tijd bijhouden</p>
          <p><strong>Na aanval:</strong> Stabiele zijligging, rustig praten</p>
          <p><strong>112 bij:</strong> 5 min, eerste aanval, letsel</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">🩸</div>
        <h3 className="text-lg font-bold mb-3">Bloedingen</h3>
        <p className="text-gray-600 text-sm mb-3">
          Eigen bescherming eerst. Directe druk op wond, gewonde deel omhoog.
        </p>
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong>Methode:</strong> Druk  verhoging  extra lagen</p>
          <p><strong>Nooit:</strong> Eerste verband weghalen</p>
          <p><strong>Infectiepreventie:</strong> Handschoenen, geen direct contact</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">🫁</div>
        <h3 className="text-lg font-bold mb-3">Verslikking</h3>
        <p className="text-gray-600 text-sm mb-3">
          Geen geluid = complete blokkering. Rugklappen eerst, dan Heimlich.
        </p>
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong>Herkenning:</strong> Handen aan keel, geen geluid</p>
          <p><strong>Stap 1:</strong> 5 ferme klappen tussen schouderbladen</p>
          <p><strong>Stap 2:</strong> Heimlich manoeuvre (vuist onder borstbeen)</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">💔</div>
        <h3 className="text-lg font-bold mb-3">Hartaanval</h3>
        <p className="text-gray-600 text-sm mb-3">
          Drukkende pijn op borst met uitstraling. Onmiddellijk 112, rust en kalmte.
        </p>
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong>Symptomen:</strong> Borstpijn, zweten, misselijkheid</p>
          <p><strong>Houding:</strong> Half rechtop, knieën gebogen</p>
          <p><strong>Niet:</strong> Laten bewegen, aspirine zonder toestemming</p>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">🌬️</div>
        <h3 className="text-lg font-bold mb-3">Ademstilstand</h3>
        <p className="text-gray-600 text-sm mb-3">
          Geen ademhaling maar wél een pols? De focus ligt volledig op beademen.
        </p>
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong>Herkenning:</strong> Bewusteloos, geen ademhaling, wel hartslag.</p>
          <p><strong>Actie:</strong> Start enkel beademing (1x per 5-6 sec).</p>
          <p><strong>Geen:</strong> Borstcompressies geven op een kloppend hart.</p>
          <p><strong>Alert:</strong> Wordt snel een hartstilstand. Controleer pols elke 2 min.</p>
        </div>
      </div>

      {/* --- NIEUWE THEORIEKAART --- */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">🌊</div>
        <h3 className="text-lg font-bold mb-3">Verdrinking</h3>
        <p className="text-gray-600 text-sm mb-3">
          Protocol wijkt af: start met 5 beademingen om het zuurstoftekort op te heffen.
        </p>
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong>Start:</strong> Altijd met 5 beademingen.</p>
          <p><strong>Daarna:</strong> Normale cyclus van 30:2 reanimatie.</p>
          <p><strong>Water:</strong> Probeer niet water uit de longen te duwen.</p>
          <p><strong>Luchtweg:</strong> Houd luchtweg vrij (braaksel).</p>
        </div>
      </div>

      {/* --- NIEUWE THEORIEKAART --- */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">🩹</div>
        <h3 className="text-lg font-bold mb-3">Wondverzorging</h3>
        <p className="text-gray-600 text-sm mb-3">
          Reinigen, ontsmetten, afdekken. Houd het simpel en proper voor (schaaf)wonden.
        </p>
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong>Stap 1:</strong> Spoel vuil weg met stromend water.</p>
          <p><strong>Stap 2:</strong> Ontsmet met een niet-prikkend middel.</p>
          <p><strong>Stap 3:</strong> Dek af met een pleister of steriel gaas.</p>
          <p><strong>Nooit:</strong> Vuil opsluiten of blaren doorprikken.</p>
        </div>
      </div>

      {/* --- NIEUWE THEORIEKAART --- */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">🦶</div>
        <h3 className="text-lg font-bold mb-3">Verstuiking (Enkel)</h3>
        <p className="text-gray-600 text-sm mb-3">
          Gebruik de RICE-methode om zwelling en pijn te beperken.
        </p>
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong>R:</strong> Rust (niet op steunen).</p>
          <p><strong>I:</strong> IJs (15-20 min, met doek ertussen).</p>
          <p><strong>C:</strong> Compressie (drukverband).</p>
          <p><strong>E:</strong> Elevatie (been omhoog).</p>
          <p><strong>Dokter bij:</strong> Onmogelijk om te steunen of "knak" gehoord.</p>
        </div>
      </div>

        {/* --- NIEUWE THEORIEKAART --- */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">😴</div>
        <h3 className="text-lg font-bold mb-3">Bewusteloosheid</h3>
        <p className="text-gray-600 text-sm mb-3">Een bewusteloos slachtoffer dat ademt, leg je in stabiele zijligging.</p>
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong>Controleer:</strong> Veiligheid -- Bewustzijn -- Ademhaling.</p>
          <p><strong>Ademt Normaal:</strong> Leg in stabiele zijligging.</p>
          <p><strong>Zijligging:</strong> Houdt de luchtweg vrij en voorkomt verstikking.</p>
          <p><strong>Alarmeer:</strong> Bel 112 en blijf het slachtoffer controleren.</p>
        </div>
      </div>
      
      {/* --- NIEUWE THEORIEKAART --- */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">🫀</div>
        <h3 className="text-lg font-bold mb-3">Reanimatie (BLS)</h3>
        <p className="text-gray-600 text-sm mb-3">Geen normale ademhaling? Start direct met 30 borstcompressies en 2 beademingen.</p>
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong>Cyclus:</strong> 30 borstcompressies, 2 beademingen.</p>
          <p><strong>Diepte:</strong> 5-6 cm diep voor een volwassene.</p>
          <p><strong>Snelheid:</strong> 100-120 compressies per minuut.</p>
          <p><strong>Niet Stoppen:</strong> Ga door tot professionele hulp het overneemt.</p>
        </div>
      </div>

      {/* --- NIEUWE THEORIEKAART --- */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">⚡️</div>
        <h3 className="text-lg font-bold mb-3">AED Gebruik</h3>
        <p className="text-gray-600 text-sm mb-3">Een AED kan een hartritme herstellen. Volg altijd de instructies van het apparaat.</p>
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong>Aanzetten:</strong> De eerste stap is altijd het toestel aanzetten.</p>
          <p><strong>Elektroden:</strong> Plak op ontblote borstkas (rechtsboven, linksonder).</p>
          <p><strong>Veiligheid:</strong> Raak slachtoffer niet aan tijdens analyse en schok.</p>
          <p><strong>Doorgaan:</strong> Hervat direct de reanimatie na de schok.</p>
        </div>
      </div>

      {/* --- NIEUWE THEORIEKAART --- */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">👃</div>
        <h3 className="text-lg font-bold mb-3">Bloedneus</h3>
        <p className="text-gray-600 text-sm mb-3">
          Hoofd voorover, neus dichtknijpen. Blijf 10 minuten rustig zitten.
        </p>
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong>Houding:</strong> Hoofd licht voorover (nooit achterover).</p>
          <p><strong>Actie:</strong> Knijp zachte deel van neus 10 min dicht.</p>
          <p><strong>Niet doen:</strong> Tussendoor controleren.</p>
          <p><strong>Geen:</strong> Watten in de neus stoppen.</p>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">☎️</div>
        <h3 className="text-lg font-bold mb-3">Communicatie met 112</h3>
        <p className="text-gray-600 text-sm mb-3">Blijf kalm. Geef eerst je locatie, dan pas de situatie.</p>
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong>Prioriteit 1:</strong> Exacte locatie.</p>
          <p><strong>Prioriteit 2:</strong> Wat is er gebeurd? Aantal slachtoffers?</p>
          <p><strong>Luister:</strong> Volg de instructies van de operator.</p>
          <p><strong>Niet Inhaken:</strong> Verbreek pas als de operator het zegt.</p>
        </div>
      </div>

    </div>

    {/* 112 Prioriteiten */}
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-xl font-bold mb-6">Wanneer onmiddellijk 112 bellen?</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-red-600 mb-3">Absoluut levensgevaarlijk (minuten tellen):</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Geen ademhaling of hartslag (reanimatie)</li>
            <li>• Anafylactische shock (EpiPen + 112)</li>
            <li>• Ernstige bloeding (niet te stoppen)</li>
            <li>• Vermoeden hartaanval</li>
            <li>• Bewusteloosheid onbekende oorzaak</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-orange-600 mb-3">Urgent maar meer tijd:</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Epileptische aanval 5 minuten</li>
            <li>• Grote brandwonden (handpalm)</li>
            <li>• Brandwonden gezicht/hals/geslachtsdelen</li>
            <li>• Vermoeden vergiftiging</li>
            <li>• Bij twijfel: altijd bellen!</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

  return (
    <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
      <div className={`max-w-7xl mx-auto px-4 pb-6 ${activeScenario ? "pt-16" : "pt-20"}`}>
        
        {/* Header — verborgen tijdens een oefening, zodat die de volle
            schermhoogte krijgt. */}
        {!activeScenario && (
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">EHBO & Veiligheid</h1>
                <p className="text-slate-500">Leer levensreddende vaardigheden door interactieve scenario's</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs — idem verborgen tijdens een oefening */}
        <div className={`${activeScenario ? 'hidden' : 'flex'} flex-wrap gap-1 mb-8 bg-white rounded-xl p-1 shadow-sm border border-gray-200`}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: AcademicCapIcon },
            { id: 'emergency', label: 'Noodcontacten', icon: PhoneIcon },
            { id: 'theory', label: 'Theorie', icon: TrophyIcon }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-grow md:flex-grow-0 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm md:text-base ${
                activeTab === tab.id 
                  ? 'bg-emerald-500 text-white' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {!activeScenario && (
          <>
            {activeTab === 'dashboard' && Dashboard()}
            {activeTab === 'emergency' && <EmergencyTab />}
            {activeTab === 'theory' && <TheoryTab />}
          </>
        )}
        
        {activeScenario && ScenarioView()}
      </div>
    </div>
  );
};

export default EHBODetail;