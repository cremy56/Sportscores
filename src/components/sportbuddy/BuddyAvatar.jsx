// src/components/sportbuddy/BuddyAvatar.jsx
// v0 (sessie 1): parametrische cartoon-avatar als gelaagde SVG.
// Bewust illustratief/cartoon (GDD-beslissing): vergroot de afstand tot echte
// lichamen. Identiek startlichaam voor iedereen; gezicht/huid/haar zijn puur
// cosmetisch. Lichaamsevolutie (3 stadia) volgt in sessie 3.

export const HUID_TINTEN = ['#f6d7b0', '#e8b98a', '#c68863', '#8d5a3b'];
export const HAAR_KLEUREN = ['#2d2a26', '#6b4a2b', '#b0813f', '#d9c169', '#a33b2e'];
export const HAAR_STIJLEN = ['kort', 'krullen', 'lang', 'kuif', 'kaal'];
export const GEZICHTEN = ['blij', 'focus', 'ontspannen', 'guitig'];

function Haar({ stijl, kleur }) {
  switch (stijl) {
    case 'krullen':
      return (
        <g fill={kleur}>
          <circle cx="38" cy="26" r="9" />
          <circle cx="50" cy="21" r="10" />
          <circle cx="62" cy="26" r="9" />
        </g>
      );
    case 'lang':
      return (
        <path
          d="M30 30 Q50 8 70 30 L70 52 Q66 46 62 46 L62 30 Q50 22 38 30 L38 46 Q34 46 30 52 Z"
          fill={kleur}
        />
      );
    case 'kuif':
      return <path d="M34 30 Q40 10 58 14 Q70 17 66 30 Q50 20 34 30 Z" fill={kleur} />;
    case 'kaal':
      return null;
    case 'kort':
    default:
      return <path d="M32 30 Q50 12 68 30 Q50 24 32 30 Z" fill={kleur} />;
  }
}

function Gezicht({ variant }) {
  switch (variant) {
    case 'focus':
      return (
        <g>
          <line x1="42" y1="34" x2="47" y2="36" stroke="#2d2a26" strokeWidth="2" strokeLinecap="round" />
          <line x1="58" y1="34" x2="53" y2="36" stroke="#2d2a26" strokeWidth="2" strokeLinecap="round" />
          <circle cx="44" cy="39" r="1.8" fill="#2d2a26" />
          <circle cx="56" cy="39" r="1.8" fill="#2d2a26" />
          <line x1="46" y1="47" x2="54" y2="47" stroke="#2d2a26" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case 'ontspannen':
      return (
        <g>
          <path d="M42 38 Q44 36 46 38" stroke="#2d2a26" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M54 38 Q56 36 58 38" stroke="#2d2a26" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M45 47 Q50 50 55 47" stroke="#2d2a26" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'guitig':
      return (
        <g>
          <circle cx="44" cy="38" r="1.8" fill="#2d2a26" />
          <path d="M54 38 Q56 35 58 38" stroke="#2d2a26" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M44 46 Q50 51 56 46" stroke="#2d2a26" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'blij':
    default:
      return (
        <g>
          <circle cx="44" cy="38" r="1.8" fill="#2d2a26" />
          <circle cx="56" cy="38" r="1.8" fill="#2d2a26" />
          <path d="M44 46 Q50 51 56 46" stroke="#2d2a26" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
  }
}

export default function BuddyAvatar({ gezicht = 0, huid = 0, haar = 0, haarkleur = 0, className = '' }) {
  const huidKleur = HUID_TINTEN[huid] || HUID_TINTEN[0];
  const haarStijl = HAAR_STIJLEN[haar] || HAAR_STIJLEN[0];
  const haarKleur = HAAR_KLEUREN[haarkleur] || HAAR_KLEUREN[0];
  const gezichtVariant = GEZICHTEN[gezicht] || GEZICHTEN[0];

  return (
    <svg viewBox="0 0 100 140" className={className} role="img" aria-label="Jouw Sportbuddy">
      {/* Lichaam — identiek startpunt voor iedereen (bewust: geen spiegel) */}
      <path d="M35 70 Q50 62 65 70 L68 105 Q50 112 32 105 Z" fill="#7c3aed" />
      <rect x="44" y="58" width="12" height="12" rx="4" fill={huidKleur} />
      {/* Armen */}
      <path d="M35 72 Q24 82 27 96" stroke={huidKleur} strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M65 72 Q76 82 73 96" stroke={huidKleur} strokeWidth="8" fill="none" strokeLinecap="round" />
      {/* Benen */}
      <path d="M42 106 L40 130" stroke="#374151" strokeWidth="9" strokeLinecap="round" />
      <path d="M58 106 L60 130" stroke="#374151" strokeWidth="9" strokeLinecap="round" />
      {/* Hoofd */}
      <circle cx="50" cy="40" r="18" fill={huidKleur} />
      <Haar stijl={haarStijl} kleur={haarKleur} />
      <Gezicht variant={gezichtVariant} />
    </svg>
  );
}
