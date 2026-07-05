// src/components/sportbuddy/BuddyAvatar.jsx
// v2: parametrische chibi-avatar die meegroeit met de leerling én met de buddy.
//   • graad (1|2|3)      → lichaamsproporties: 1ste graad kinderlijk chibi,
//                          2de graad langer, 3de graad jongvolwassen/atletisch
//   • geslacht/lichaam   → 'm' | 'v' | 'neutraal' (schouder/heup-verhouding)
//   • kracht (K-stat)    → schouderbreedte, armdikte en spierdefinitie groeien
//                          beetje bij beetje mee (pas echt zichtbaar in 3de graad)
//   • conditie           → 'fris' | 'top' (aura) | 'moe' | 'uitgeput' (houding,
//                          wallen) — je ZIET detraining en overtraining
//   • blessure           → verbandje op de arm
// GDD-grens: evolutie is altijd atletischer/energieker of vermoeider —
// nooit dikker of lelijker (geen lichaamskritiek-mechaniek).

import { useId } from 'react';

export const HUID_TINTEN = ['#f6d7b0', '#e8b98a', '#c68863', '#8d5a3b'];
export const HAAR_KLEUREN = ['#2d2a26', '#6b4a2b', '#b0813f', '#d9c169', '#a33b2e'];
export const HAAR_STIJLEN = ['spikes', 'krullen', 'lang', 'kuif', 'kaal'];
export const GEZICHTEN = ['blij', 'focus', 'ontspannen', 'guitig'];
export const LICHAMEN = ['m', 'v', 'neutraal'];

const HUID_PALET = [
  { licht: '#fdeccd', basis: '#f6d7b0', schaduw: '#e0b88b' },
  { licht: '#f4d3a9', basis: '#e8b98a', schaduw: '#cf9a66' },
  { licht: '#d9a37e', basis: '#c68863', schaduw: '#a56c4a' },
  { licht: '#a97350', basis: '#8d5a3b', schaduw: '#6e432b' },
];
const HAAR_HIGHLIGHT = ['#524c44', '#8a6339', '#c99a55', '#e9d78d', '#c05a48'];

// Proporties per graad (voeten staan altijd op dezelfde grond, y≈274)
const GRAAD_DIMS = {
  1: { s: 1.0, hoofdY: 92, torsoTop: 152, torsoBot: 206, shortBot: 232, beenTop: 226, schouder: 30, heup: 33, armW: 14, spierSchouder: 1.5, spierArm: 0.5 },
  2: { s: 0.86, hoofdY: 80, torsoTop: 132, torsoBot: 198, shortBot: 228, beenTop: 224, schouder: 33, heup: 32, armW: 13, spierSchouder: 5, spierArm: 2 },
  3: { s: 0.74, hoofdY: 70, torsoTop: 112, torsoBot: 190, shortBot: 224, beenTop: 220, schouder: 37, heup: 30, armW: 12, spierSchouder: 9, spierArm: 4.5 },
};

function Haar({ stijl, highlight, gradId }) {
  switch (stijl) {
    case 'krullen':
      return (
        <g fill={`url(#${gradId})`}>
          <circle cx="62" cy="52" r="17" />
          <circle cx="82" cy="40" r="19" />
          <circle cx="104" cy="36" r="20" />
          <circle cx="126" cy="42" r="18" />
          <circle cx="142" cy="56" r="15" />
        </g>
      );
    case 'lang':
      return (
        <g>
          <path
            d="M46 76 Q44 26 100 24 Q156 26 154 76 L154 116 Q146 104 142 96 L142 62 Q126 44 100 44 Q74 44 58 62 L58 96 Q54 104 46 116 Z"
            fill={`url(#${gradId})`}
          />
          <path d="M64 40 Q84 28 112 32 Q96 38 82 46 Q72 44 64 40 Z" fill={highlight} opacity="0.5" />
        </g>
      );
    case 'kuif':
      return (
        <g>
          <path
            d="M52 72 Q50 40 82 30 Q74 20 88 16 Q112 8 132 24 Q152 38 148 72 Q128 46 100 44 Q72 44 52 72 Z"
            fill={`url(#${gradId})`}
          />
          <path d="M88 20 Q108 12 126 26 Q110 22 94 26 Z" fill={highlight} opacity="0.55" />
        </g>
      );
    case 'kaal':
      return <path d="M62 56 Q80 40 100 40 Q120 40 138 56 Q120 48 100 48 Q80 48 62 56 Z" fill="#000" opacity="0.06" />;
    case 'spikes':
    default:
      return (
        <g>
          <path
            d="M50 74 Q48 52 60 44 L52 28 L70 38 L68 18 L84 34 L88 10 L100 32 L112 10 L118 34 L132 18 L130 38 L148 28 L140 44 Q152 52 150 74 Q128 48 100 46 Q72 48 50 74 Z"
            fill={`url(#${gradId})`}
          />
          <path d="M84 26 L92 16 L98 28 Q90 26 84 26 Z" fill={highlight} opacity="0.6" />
        </g>
      );
  }
}

function Mond({ variant, moe }) {
  if (moe) return <path d="M88 118 Q100 114 112 118" stroke="#8c4a32" strokeWidth="3.5" fill="none" strokeLinecap="round" />;
  switch (variant) {
    case 'focus':
      return <path d="M88 118 Q100 122 112 118" stroke="#8c4a32" strokeWidth="3.5" fill="none" strokeLinecap="round" />;
    case 'ontspannen':
      return <path d="M88 116 Q100 126 112 116" stroke="#8c4a32" strokeWidth="3.5" fill="none" strokeLinecap="round" />;
    case 'guitig':
      return <path d="M86 114 Q100 130 116 112 Q104 122 86 114 Z" fill="#8c4a32" />;
    case 'blij':
    default:
      return (
        <g>
          <path d="M84 112 Q100 132 116 112 Q100 122 84 112 Z" fill="#8c4a32" />
          <path d="M92 119 Q100 124 108 119 Q100 121 92 119 Z" fill="#e78a7a" />
        </g>
      );
  }
}

function Ogen({ variant, irisId }) {
  if (variant === 'ontspannen') {
    return (
      <g stroke="#3a2f28" strokeWidth="4" fill="none" strokeLinecap="round">
        <path d="M70 92 Q79 84 88 92" />
        <path d="M112 92 Q121 84 130 92" />
      </g>
    );
  }
  const rechterDicht = variant === 'guitig';
  return (
    <g>
      <ellipse cx="79" cy="92" rx="11" ry="13" fill="#fff" />
      <circle cx="80" cy="94" r="7.5" fill={`url(#${irisId})`} />
      <circle cx="80" cy="94" r="3.5" fill="#1c130e" />
      <circle cx="83" cy="90" r="2.6" fill="#fff" />
      <circle cx="77.5" cy="97" r="1.3" fill="#fff" opacity="0.9" />
      {rechterDicht ? (
        <path d="M112 92 Q121 86 130 92" stroke="#3a2f28" strokeWidth="4" fill="none" strokeLinecap="round" />
      ) : (
        <g>
          <ellipse cx="121" cy="92" rx="11" ry="13" fill="#fff" />
          <circle cx="120" cy="94" r="7.5" fill={`url(#${irisId})`} />
          <circle cx="120" cy="94" r="3.5" fill="#1c130e" />
          <circle cx="123" cy="90" r="2.6" fill="#fff" />
          <circle cx="117.5" cy="97" r="1.3" fill="#fff" opacity="0.9" />
        </g>
      )}
    </g>
  );
}

function Wenkbrauwen({ variant }) {
  const stijl = { stroke: '#3a2f28', strokeWidth: 4, fill: 'none', strokeLinecap: 'round' };
  if (variant === 'focus') {
    return (
      <g {...stijl}>
        <path d="M68 76 Q78 74 88 79" />
        <path d="M132 76 Q122 74 112 79" />
      </g>
    );
  }
  return (
    <g {...stijl}>
      <path d="M68 76 Q79 70 90 75" />
      <path d="M110 75 Q121 70 132 76" />
    </g>
  );
}

export default function BuddyAvatar({
  gezicht = 0, huid = 0, haar = 0, haarkleur = 0,
  graad = 1, lichaam = 'm', kracht = 10,
  conditie = 'fris', blessure = false,
  className = '',
}) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '');
  const palet = HUID_PALET[huid] || HUID_PALET[0];
  const haarBasis = HAAR_KLEUREN[haarkleur] || HAAR_KLEUREN[0];
  const haarLicht = HAAR_HIGHLIGHT[haarkleur] || HAAR_HIGHLIGHT[0];
  const haarStijl = HAAR_STIJLEN[haar] || HAAR_STIJLEN[0];
  const gezichtVariant = GEZICHTEN[gezicht] || GEZICHTEN[0];

  const dims = GRAAD_DIMS[graad] || GRAAD_DIMS[1];
  const K = Math.max(0, Math.min(100, kracht));

  // Lichaamsvorm: geslacht/lichaamskeuze stuurt schouder/heup (vanaf 2de graad)
  let schouder = dims.schouder;
  let heup = dims.heup;
  if (graad >= 2) {
    if (lichaam === 'v') { schouder -= 4; heup += 3; }
    if (lichaam === 'neutraal') { schouder -= 2; heup += 1; }
  }
  // Spiergroei: kracht verbreedt schouders en armen — per graad sterker
  // (1ste graad amper: prepuberale krachtwinst is vooral neuraal)
  schouder += (K / 100) * dims.spierSchouder;
  const armW = dims.armW + (K / 100) * dims.spierArm;
  const spierOpacity = graad === 1 ? 0 : Math.max(0, (K - 25) / 75) * (graad === 3 ? 0.85 : 0.4);

  const moe = conditie === 'moe' || conditie === 'uitgeput';
  const droop = conditie === 'uitgeput' ? 5 : moe ? 3 : 0;
  const hoofdKantel = moe ? (conditie === 'uitgeput' ? -6 : -3) : 0;

  const huidGrad = `huid${uid}`;
  const haarGrad = `haar${uid}`;
  const shirtGrad = `shirt${uid}`;
  const irisGrad = `iris${uid}`;
  const auraGrad = `aura${uid}`;

  const tTop = dims.torsoTop + droop;
  const tBot = dims.torsoBot;
  const armY = tTop + 8;
  const hoofdS = dims.s;
  const hoofdY = dims.hoofdY + droop;

  return (
    <svg viewBox="0 0 200 300" className={className} role="img" aria-label="Jouw Sportbuddy">
      <defs>
        <radialGradient id={huidGrad} cx="42%" cy="34%" r="75%">
          <stop offset="0%" stopColor={palet.licht} />
          <stop offset="62%" stopColor={palet.basis} />
          <stop offset="100%" stopColor={palet.schaduw} />
        </radialGradient>
        <linearGradient id={haarGrad} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor={haarLicht} />
          <stop offset="55%" stopColor={haarBasis} />
        </linearGradient>
        <linearGradient id={shirtGrad} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#9d5cf0" />
          <stop offset="60%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#5f2bb8" />
        </linearGradient>
        <radialGradient id={irisGrad} cx="35%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#8a5a3a" />
          <stop offset="100%" stopColor="#4a2c18" />
        </radialGradient>
        <radialGradient id={auraGrad} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Topvorm-aura */}
      {conditie === 'top' && <ellipse cx="100" cy="160" rx="88" ry="126" fill={`url(#${auraGrad})`} />}

      {/* Grondschaduw */}
      <ellipse cx="100" cy="284" rx="58" ry="9" fill="#000" opacity="0.10" />

      {/* Benen + kousen + sneakers (voeten op vaste grond) */}
      <g>
        <rect x="80" y={dims.beenTop} width="14" height={250 - dims.beenTop} rx="6" fill={`url(#${huidGrad})`} />
        <rect x="106" y={dims.beenTop} width="14" height={250 - dims.beenTop} rx="6" fill={`url(#${huidGrad})`} />
        {graad === 3 && (
          <g stroke={palet.schaduw} strokeWidth="1.6" opacity={spierOpacity * 0.7} fill="none">
            <path d={`M83 ${dims.beenTop + 8} Q87 ${dims.beenTop + 14} 84 ${dims.beenTop + 20}`} />
            <path d={`M109 ${dims.beenTop + 8} Q113 ${dims.beenTop + 14} 110 ${dims.beenTop + 20}`} />
          </g>
        )}
        <rect x="79" y="244" width="16" height="20" rx="6" fill="#fff" />
        <rect x="105" y="244" width="16" height="20" rx="6" fill="#fff" />
        <rect x="79" y="248" width="16" height="4" fill="#7c3aed" />
        <rect x="105" y="248" width="16" height="4" fill="#7c3aed" />
        <path d="M76 264 Q76 258 84 258 L94 258 Q98 262 98 268 Q98 274 92 274 L80 274 Q74 274 74 269 Z" fill="#f4f4f6" />
        <path d="M104 264 Q104 258 112 258 L122 258 Q126 262 126 268 Q126 274 120 274 L108 274 Q102 274 102 269 Z" fill="#f4f4f6" />
        <path d="M74 269 Q74 273 80 273 L92 273 Q97 273 97 268 L74 268 Z" fill="#7c3aed" />
        <path d="M102 269 Q102 273 108 273 L120 273 Q125 273 125 268 L102 268 Z" fill="#7c3aed" />
        <path d="M84 258 L90 266 M88 258 L94 265" stroke="#c9c9d4" strokeWidth="1.6" />
        <path d="M112 258 L118 266 M116 258 L122 265" stroke="#c9c9d4" strokeWidth="1.6" />
      </g>

      {/* Short */}
      <path
        d={`M${100 - heup + 2} ${tBot - 6} L${100 + heup - 2} ${tBot - 6} L${100 + heup + 3} ${dims.shortBot} Q116 ${dims.shortBot + 6} 102 ${dims.shortBot} L100 ${dims.shortBot - 6} L98 ${dims.shortBot} Q84 ${dims.shortBot + 6} ${100 - heup - 3} ${dims.shortBot} Z`}
        fill="#5f2bb8"
      />
      <path d={`M${100 - heup + 2} ${tBot} L${100 - heup - 2} ${dims.shortBot - 2} M${100 + heup - 2} ${tBot} L${100 + heup + 2} ${dims.shortBot - 2}`} stroke="#fff" strokeWidth="3" strokeLinecap="round" />

      {/* Armen + handen (+ spierlijnen bij hogere kracht) */}
      <path d={`M${100 - schouder + 4} ${armY} Q${100 - schouder - 14} ${armY + 16} ${100 - schouder - 10} ${armY + 40}`} stroke={`url(#${huidGrad})`} strokeWidth={armW} fill="none" strokeLinecap="round" />
      <path d={`M${100 + schouder - 4} ${armY} Q${100 + schouder + 14} ${armY + 16} ${100 + schouder + 10} ${armY + 40}`} stroke={`url(#${huidGrad})`} strokeWidth={armW} fill="none" strokeLinecap="round" />
      <circle cx={100 - schouder - 10} cy={armY + 42} r={armW * 0.62} fill={`url(#${huidGrad})`} />
      <circle cx={100 + schouder + 10} cy={armY + 42} r={armW * 0.62} fill={`url(#${huidGrad})`} />
      {spierOpacity > 0 && (
        <g stroke={palet.schaduw} strokeWidth="1.8" fill="none" opacity={spierOpacity}>
          <path d={`M${100 - schouder - 9} ${armY + 12} Q${100 - schouder - 4} ${armY + 18} ${100 - schouder - 8} ${armY + 25}`} />
          <path d={`M${100 + schouder + 9} ${armY + 12} Q${100 + schouder + 4} ${armY + 18} ${100 + schouder + 8} ${armY + 25}`} />
        </g>
      )}

      {/* Shirt (voetbaltenue) */}
      <path
        d={`M${100 - schouder} ${tTop + 6} Q100 ${tTop - 6} ${100 + schouder} ${tTop + 6} L${100 + heup} ${tBot} Q100 ${tBot + 10} ${100 - heup} ${tBot} Z`}
        fill={`url(#${shirtGrad})`}
      />
      <path d={`M${100 - schouder + 4} ${tTop + 8} L${100 - heup + 4} ${tBot - 2} M${100 + schouder - 4} ${tTop + 8} L${100 + heup - 4} ${tBot - 2}`} stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.9" />
      <path d={`M${100 - 12} ${tTop + 2} Q100 ${tTop + 12} ${100 + 12} ${tTop + 2} Q106 ${tTop + 6} 100 ${tTop + 6} Q94 ${tTop + 6} ${100 - 12} ${tTop + 2} Z`} fill="#fff" opacity="0.9" />
      {/* Spierdefinitie door het shirt (borst/schouders) — groeit met kracht */}
      {spierOpacity > 0 && (
        <g stroke="#3f1f80" strokeWidth="2" fill="none" opacity={spierOpacity * 0.8}>
          <path d={`M${100 - schouder + 6} ${tTop + 10} Q${100 - schouder + 14} ${tTop + 4} ${100 - schouder + 20} ${tTop + 10}`} />
          <path d={`M${100 + schouder - 6} ${tTop + 10} Q${100 + schouder - 14} ${tTop + 4} ${100 + schouder - 20} ${tTop + 10}`} />
          <path d={`M92 ${tTop + 20} Q100 ${tTop + 25} 108 ${tTop + 20}`} />
        </g>
      )}
      {graad === 3 && K > 60 && (
        <g stroke="#3f1f80" strokeWidth="1.7" fill="none" opacity={spierOpacity * 0.6}>
          <path d={`M100 ${tTop + 32} L100 ${tBot - 14}`} />
          <path d={`M92 ${tTop + 40} L108 ${tTop + 40} M92 ${tTop + 50} L108 ${tTop + 50}`} />
        </g>
      )}

      {/* Blessure: verbandje op de rechterarm */}
      {blessure && (
        <g transform={`rotate(28 ${100 + schouder + 6} ${armY + 20})`}>
          <rect x={100 + schouder - 2} y={armY + 14} width={armW + 6} height="12" rx="3" fill="#fff" stroke="#d8d8e0" strokeWidth="1" />
          <path d={`M${100 + schouder - 2} ${armY + 20} L${100 + schouder + armW + 4} ${armY + 20}`} stroke="#d8d8e0" strokeWidth="1" />
        </g>
      )}

      {/* Nek */}
      <rect x="92" y={tTop - 14} width="16" height="18" rx="6" fill={`url(#${huidGrad})`} />

      {/* Hoofd (geschaald per graad, kantelt licht bij vermoeidheid) */}
      <g transform={`translate(${100 - 100 * hoofdS} ${hoofdY - 92 * hoofdS}) scale(${hoofdS})`}>
        <g transform={hoofdKantel ? `rotate(${hoofdKantel} 100 130)` : undefined}>
          <circle cx="45" cy="96" r="9" fill={`url(#${huidGrad})`} />
          <circle cx="155" cy="96" r="9" fill={`url(#${huidGrad})`} />
          <ellipse cx="100" cy="92" rx="56" ry="52" fill={`url(#${huidGrad})`} />
          <ellipse cx="66" cy="108" rx="8" ry="5" fill="#e78a7a" opacity="0.45" />
          <ellipse cx="134" cy="108" rx="8" ry="5" fill="#e78a7a" opacity="0.45" />
          <Wenkbrauwen variant={moe ? 'ontspannen' : gezichtVariant} />
          <Ogen variant={gezichtVariant} irisId={irisGrad} />
          {moe && (
            <g stroke="#9a7a68" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity={conditie === 'uitgeput' ? 0.8 : 0.5}>
              <path d="M71 106 Q79 110 87 106" />
              <path d="M113 106 Q121 110 129 106" />
            </g>
          )}
          {conditie === 'uitgeput' && <path d="M146 74 Q150 80 146 85 Q142 80 146 74 Z" fill="#7dd3fc" />}
          <path d="M97 102 Q100 106 103 102" stroke={palet.schaduw} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <Mond variant={gezichtVariant} moe={moe} />
          <Haar stijl={haarStijl} highlight={haarLicht} gradId={haarGrad} />
        </g>
      </g>

      {/* Voetbal */}
      <g>
        <circle cx="152" cy="262" r="16" fill="#fff" stroke="#d8d8e0" strokeWidth="1.5" />
        <polygon points="152,254 159,259 156,267 148,267 145,259" fill="#2d2a26" />
        <path d="M152 254 L152 246 M159 259 L167 257 M156 267 L161 274 M148 267 L143 274 M145 259 L137 257" stroke="#2d2a26" strokeWidth="1.6" />
        <ellipse cx="146" cy="254" rx="5" ry="3" fill="#fff" opacity="0.7" />
      </g>
    </svg>
  );
}
