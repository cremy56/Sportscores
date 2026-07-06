// src/components/sportbuddy/tools/HoudingLab.jsx
// Tool voor de module Houding & rug. Leerplan:
//   • 1ste graad (BV1_01.02.01): ergonomie toepassen — zitten, staan, heffen,
//     tillen, verplaatsen.
//   • I.5: statische én dynamische lichaamshouding beoordelen met ergonomie.
//   • I.6: technieken van manutentie, staan, zitten en rughygiëne toepassen.
//
// Datavrij: houdingen van de fictieve buddy en herkenbare situaties, nooit een
// beoordeling van het lichaam van de leerling. Graad-differentiatie via `graad`.
//
// Delen:
//   1. Til-simulator: kies een tiltechniek → zie de belasting op de onderrug.
//   2. Houdingchecker: goede vs. foute zit/sta/gamer-houding herkennen (I.5).
//   3. Ergonomie-oefening: juiste richtlijn kiezen per situatie (I.6).
//   4. De wervelkolom (3de graad): waarom een neutrale rug beschermt.

import { useState } from 'react';

// ─── 1. Til-simulator ─────────────────────────────────────────────────────────
// Didactisch model: de druk op de onderrug (lage lendenwervels) hangt af van de
// hefboomarm — hoe verder de last van je rug, hoe groter de belasting. Getild
// met een gebogen rug staat de last ver vóór de wervelkolom (lange hefboom);
// door de knieën en dicht tegen het lichaam is de hefboom kort.
const TECHNIEKEN = [
  {
    id: 'rug', label: 'Met gebogen rug', emoji: '🙇',
    factor: 1.0, kleur: '#ef4444',
    beschrijving: 'Benen gestrekt, rug gebogen, last ver van het lichaam.',
    gevolg: 'De last hangt ver vóór je wervelkolom — een lange hefboom. Je onderrug moet enorm veel kracht leveren. Zo ontstaan hernia\'s en rugpijn.',
  },
  {
    id: 'half', label: 'Half door de knieën', emoji: '🧍',
    factor: 0.6, kleur: '#f59e0b',
    beschrijving: 'Deels gebogen knieën, rug licht gebogen, last iets dichter.',
    gevolg: 'Beter, maar nog niet ideaal: de last zit nog te ver van je lichaam en je rug is niet neutraal.',
  },
  {
    id: 'knie', label: 'Door de knieën, rechte rug', emoji: '🏋️',
    factor: 0.25, kleur: '#22c55e',
    beschrijving: 'Zak door de knieën, rug recht, last dicht tegen het lichaam.',
    gevolg: 'De juiste techniek: je benen (de sterkste spieren) doen het werk, je rug blijft neutraal en de last is dicht bij je wervelkolom — een korte hefboom.',
  },
];

function TilSimulator() {
  const [techniek, setTechniek] = useState('rug');
  const [gewicht, setGewicht] = useState(15); // kg van de last (fictief voorwerp)
  const t = TECHNIEKEN.find((x) => x.id === techniek);

  // Geschatte druk op de onderrug (L5/S1), didactisch geschaald.
  // Basis: rompgewicht ~ altijd aanwezig; last vermenigvuldigd met hefboomfactor.
  const basis = 340; // N, rompbelasting bij vooroverbuigen (indicatief)
  const druk = Math.round(basis + gewicht * 9.81 * (1 + t.factor * 9));
  const drukKg = Math.round(druk / 9.81);

  // Kleur/oordeel op basis van de druk
  const niveau = druk > 2500 ? { kleur: '#ef4444', label: 'Gevaarlijk hoog' }
    : druk > 1400 ? { kleur: '#f59e0b', label: 'Verhoogd' }
    : { kleur: '#22c55e', label: 'Veilig' };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="font-bold text-gray-800 mb-1">De til-simulator</h3>
      <p className="text-xs text-gray-500 mb-4">Je buddy tilt een last. Kies de tiltechniek en het gewicht, en zie hoeveel druk er op zijn onderrug komt.</p>

      {/* Techniekkeuze */}
      <div className="grid grid-cols-3 gap-1.5 mb-4">
        {TECHNIEKEN.map((tt) => (
          <button key={tt.id} type="button" onClick={() => setTechniek(tt.id)}
            className={`px-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${techniek === tt.id ? 'text-white' : 'text-gray-600 border-gray-200 hover:border-gray-300'}`}
            style={techniek === tt.id ? { backgroundColor: tt.kleur, borderColor: tt.kleur } : {}}>
            <span className="block text-xl">{tt.emoji}</span>
            {tt.label}
          </button>
        ))}
      </div>

      {/* Zijaanzicht van de tilhouding (SVG) */}
      <div className="bg-gray-50 rounded-2xl p-4 mb-4 flex justify-center">
        <TilFiguur techniek={techniek} gewicht={gewicht} kleur={t.kleur} />
      </div>

      {/* Gewicht-slider */}
      <div className="flex justify-between text-sm font-semibold text-gray-600 mb-1">
        <span>Gewicht van de last</span><span>{gewicht} kg</span>
      </div>
      <input type="range" min="2" max="30" value={gewicht} onChange={(e) => setGewicht(+e.target.value)} className="w-full accent-purple-600 mb-4" />

      {/* Drukmeter */}
      <div className="flex items-end justify-between bg-gray-50 rounded-xl px-4 py-3 mb-3">
        <div>
          <div className="text-2xl font-bold tabular-nums" style={{ color: niveau.kleur }}>~{drukKg} kg</div>
          <div className="text-[11px] text-gray-400">druk op de onderrug</div>
        </div>
        <span className="text-sm font-bold" style={{ color: niveau.kleur }}>{niveau.label}</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div className="h-2.5 rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (druk / 3000) * 100)}%`, backgroundColor: niveau.kleur }} />
      </div>

      <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: `${t.kleur}12`, color: t.kleur }}>
        <strong>{t.emoji} {t.label}.</strong> {t.gevolg}
      </div>
    </div>
  );
}

// Fatsoenlijke zijaanzicht-figuur: gevuld lichaam, doos schaalt met het gewicht.
function TilFiguur({ techniek, gewicht, kleur }) {
  const doosZ = 18 + (gewicht / 30) * 34; // 18..52 px, groeit met het gewicht
  const W = 220, H = 240, grond = 210;
  const huid = '#f0c9a8', huidD = '#d9a877', kledij = '#4f6bed', kledijD = '#3a52c4';

  if (techniek === 'knie') {
    // GOED: door de knieën, rug recht, doos dicht tegen het lichaam
    const dx = 110, dy = 150 - doosZ / 2;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="200" height="220">
        <line x1="20" y1={grond} x2={W - 20} y2={grond} stroke="#cbd5e1" strokeWidth="3" />
        <ellipse cx="78" cy={grond - 4} rx="16" ry="6" fill={huidD} />
        <ellipse cx="120" cy={grond - 4} rx="16" ry="6" fill={huidD} />
        <path d="M96,150 L128,150 L124,178 L112,178 Z" fill={kledij} />
        <path d={`M112,176 L124,176 L122,${grond - 6} L110,${grond - 6} Z`} fill={kledijD} />
        <path d="M96,150 L88,178 L78,178 L88,150 Z" fill={kledijD} />
        <path d={`M84,176 L94,178 L86,${grond - 6} L76,${grond - 6} Z`} fill={kledij} />
        <circle cx="108" cy="150" r="15" fill={kledijD} />
        <path d="M98,150 L118,150 L114,86 L102,86 Z" fill={kledij} />
        <path d="M108,146 L108,88" fill="none" stroke={kleur} strokeWidth="4" strokeLinecap="round" />
        <circle cx="108" cy="72" r="15" fill={huid} />
        <path d="M104,96 L96,132" stroke={huid} strokeWidth="9" strokeLinecap="round" />
        <path d="M116,96 L124,132" stroke={huid} strokeWidth="9" strokeLinecap="round" />
        <rect x={dx - doosZ / 2} y={dy} width={doosZ} height={doosZ} rx="3" fill="#b45309" stroke="#7c3a12" strokeWidth="2" />
        <text x={dx} y={dy + doosZ / 2 + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{gewicht}</text>
        <line x1="108" y1="140" x2={dx} y2={dy + doosZ / 2} stroke={kleur} strokeWidth="1.5" strokeDasharray="5 4" opacity="0.4" />
      </svg>
    );
  }
  // SLECHT (rug/half): vooroverbuigen, rug bol, doos ver vooraan
  const bol = techniek === 'rug' ? 1 : 0.6; // half = minder extreem
  const dx = techniek === 'rug' ? 176 : 158, dy = 178 - doosZ / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="200" height="220">
      <line x1="20" y1={grond} x2={W - 20} y2={grond} stroke="#cbd5e1" strokeWidth="3" />
      <ellipse cx="70" cy={grond - 4} rx="16" ry="6" fill={huidD} />
      <path d={`M62,${grond - 6} L66,120 L78,120 L74,${grond - 6} Z`} fill={kledij} />
      <circle cx="72" cy="118" r="14" fill={kledijD} />
      <path d={`M72,104 Q120,${96 + (1 - bol) * 8} 160,104 L158,120 Q118,${116 + (1 - bol) * 6} 74,124 Z`} fill={kledij} />
      <path d={`M74,110 Q118,${90 + (1 - bol) * 16} 156,108`} fill="none" stroke={kleur} strokeWidth="4" strokeLinecap="round" />
      <circle cx="168" cy="112" r="15" fill={huid} />
      <path d="M150,110 L170,150" stroke={huid} strokeWidth="9" strokeLinecap="round" />
      <rect x={dx - doosZ / 2} y={dy} width={doosZ} height={doosZ} rx="3" fill="#b45309" stroke="#7c3a12" strokeWidth="2" />
      <text x={dx} y={dy + doosZ / 2 + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{gewicht}</text>
      <line x1="80" y1="112" x2={dx} y2={dy + doosZ / 2} stroke={kleur} strokeWidth="1.5" strokeDasharray="5 4" opacity="0.5" />
    </svg>
  );
}

// ─── 2. Houdingchecker ────────────────────────────────────────────────────────
const HOUDINGEN = [
  {
    situatie: 'Zitten aan een bureau', emoji: '💺',
    goed: 'Voeten plat op de grond, rug tegen de leuning, scherm op ooghoogte, schouders ontspannen.',
    fout: 'Onderuitgezakt, benen gekruist, scherm te laag zodat je nek voorover buigt.',
  },
  {
    situatie: 'Gamen of smartphone', emoji: '🎮',
    goed: 'Toestel omhoog naar ooghoogte, korte pauzes, rechte nek.',
    fout: '"Tech neck": urenlang met het hoofd ver voorover naar een laag scherm — zware belasting op de nek.',
  },
  {
    situatie: 'Een zware boekentas dragen', emoji: '🎒',
    goed: 'Beide schouderbanden gebruiken, tas hoog en dicht tegen de rug, niet te zwaar.',
    fout: 'Aan één schouder, laag bungelend — dit trekt je wervelkolom scheef.',
  },
  {
    situatie: 'Rechtstaand wachten', emoji: '🧍',
    goed: 'Gewicht op beide voeten, bekken neutraal, schouders ontspannen naar achter.',
    fout: 'Hangen op één heup met holle onderrug, schouders naar voren.',
  },
];

function Houdingchecker() {
  const [index, setIndex] = useState(0);
  const [gekozen, setGekozen] = useState(null);
  const [score, setScore] = useState(0);
  const [klaar, setKlaar] = useState(false);
  const h = HOUDINGEN[index];
  // Willekeurige volgorde van goed/fout per vraag (stabiel per index)
  const goedLinks = index % 2 === 0;
  const opties = goedLinks
    ? [{ tekst: h.goed, goed: true }, { tekst: h.fout, goed: false }]
    : [{ tekst: h.fout, goed: false }, { tekst: h.goed, goed: true }];

  const kies = (i) => {
    if (gekozen !== null) return;
    setGekozen(i);
    if (opties[i].goed) setScore((s) => s + 1);
  };
  const volgende = () => {
    if (index < HOUDINGEN.length - 1) { setIndex(index + 1); setGekozen(null); }
    else setKlaar(true);
  };
  const opnieuw = () => { setIndex(0); setGekozen(null); setScore(0); setKlaar(false); };

  if (klaar) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
        <div className="text-4xl mb-2">{score === HOUDINGEN.length ? '🌟' : '💪'}</div>
        <p className="text-lg font-bold text-gray-800 mb-1">{score} / {HOUDINGEN.length} juist</p>
        <p className="text-sm text-gray-500 mb-4">Een goede houding voorkomt rug- en nekklachten — je hele leven lang.</p>
        <button type="button" onClick={opnieuw} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">Opnieuw</button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">Welke houding is juist?</h3>
        <span className="text-xs text-gray-400">{index + 1} / {HOUDINGEN.length}</span>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 mb-4 text-center">
        <div className="text-3xl mb-1">{h.emoji}</div>
        <p className="text-sm font-semibold text-gray-700">{h.situatie}</p>
      </div>
      <div className="space-y-2">
        {opties.map((o, i) => {
          const isGekozen = gekozen === i;
          let stijl = 'border-gray-200 text-gray-700 hover:border-purple-300';
          if (gekozen !== null) {
            if (o.goed) stijl = 'border-green-500 bg-green-50 text-green-800';
            else if (isGekozen) stijl = 'border-red-500 bg-red-50 text-red-800';
            else stijl = 'border-gray-200 text-gray-400';
          }
          return (
            <button key={i} type="button" disabled={gekozen !== null} onClick={() => kies(i)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${stijl}`}>
              {o.tekst}
            </button>
          );
        })}
      </div>
      {gekozen !== null && (
        <div className="mt-4">
          <div className={`rounded-xl p-3 text-sm ${opties[gekozen].goed ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
            {opties[gekozen].goed ? '✅ Juist! Dit is de ergonomische houding.' : '❌ Dit is net de houding om te vermijden.'}
          </div>
          <div className="flex justify-end mt-3">
            <button type="button" onClick={volgende} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">
              {index < HOUDINGEN.length - 1 ? 'Volgende' : 'Resultaat'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 3. Ergonomie-oefening (manutentie-richtlijnen) ───────────────────────────
const RICHTLIJNEN = [
  { vraag: 'Je gaat een zware doos van de grond tillen. Wat doe je eerst?', opties: ['Door je knieën zakken', 'Vooroverbuigen met gestrekte benen'], juist: 0 },
  { vraag: 'Waar hou je de last tijdens het tillen?', opties: ['Zo dicht mogelijk tegen je lichaam', 'Met gestrekte armen ver van je'], juist: 0 },
  { vraag: 'Je moet iets zwaars verplaatsen en van richting veranderen. Hoe draai je?', opties: ['Met je voeten, niet met je rug', 'Door je romp te draaien'], juist: 0 },
  { vraag: 'Wat doe je bij een last die te zwaar is?', opties: ['Hulp vragen of in delen', 'Toch alleen tillen'], juist: 0 },
];

function ErgonomieOefening() {
  const [index, setIndex] = useState(0);
  const [gekozen, setGekozen] = useState(null);
  const [score, setScore] = useState(0);
  const [klaar, setKlaar] = useState(false);
  const opgave = RICHTLIJNEN[index];

  const kies = (i) => {
    if (gekozen !== null) return;
    setGekozen(i);
    if (i === opgave.juist) setScore((s) => s + 1);
  };
  const volgende = () => {
    if (index < RICHTLIJNEN.length - 1) { setIndex(index + 1); setGekozen(null); }
    else setKlaar(true);
  };
  const opnieuw = () => { setIndex(0); setGekozen(null); setScore(0); setKlaar(false); };

  if (klaar) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
        <div className="text-4xl mb-2">{score === RICHTLIJNEN.length ? '🎓' : '💪'}</div>
        <p className="text-lg font-bold text-gray-800 mb-1">{score} / {RICHTLIJNEN.length} juist</p>
        <p className="text-sm text-gray-500 mb-4">Deze manutentie-regels beschermen je rug — thuis, op school én later op het werk.</p>
        <button type="button" onClick={opnieuw} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">Opnieuw</button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">Til-richtlijnen</h3>
        <span className="text-xs text-gray-400">{index + 1} / {RICHTLIJNEN.length}</span>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 mb-4"><p className="text-sm text-gray-700">{opgave.vraag}</p></div>
      <div className="space-y-2">
        {opgave.opties.map((o, i) => {
          const isJuist = i === opgave.juist;
          const isGekozen = gekozen === i;
          let stijl = 'border-gray-200 text-gray-700 hover:border-purple-300';
          if (gekozen !== null) {
            if (isJuist) stijl = 'border-green-500 bg-green-50 text-green-800';
            else if (isGekozen) stijl = 'border-red-500 bg-red-50 text-red-800';
            else stijl = 'border-gray-200 text-gray-400';
          }
          return (
            <button key={i} type="button" disabled={gekozen !== null} onClick={() => kies(i)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${stijl}`}>
              {o}
            </button>
          );
        })}
      </div>
      {gekozen !== null && (
        <div className="flex justify-end mt-4">
          <button type="button" onClick={volgende} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">
            {index < RICHTLIJNEN.length - 1 ? 'Volgende' : 'Resultaat'}
          </button>
        </div>
      )}
    </div>
  );
}

// Anatomische wervelkolom in één stand: gestapelde wervels langs de curve.
function WervelKolom({ type, kleur, label }) {
  const topY = 20, botY = 180, x0 = 50, n = 18;
  const offset = (t) => {
    if (type === 'neutraal') return 8 * Math.sin(t * Math.PI * 2.1);
    if (type === 'bol') return 26 * Math.sin(t * Math.PI * 0.85);
    return -6 + 22 * Math.pow(t, 2) * Math.sin(t * Math.PI); // hol
  };
  const wervels = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const y = topY + t * (botY - topY);
    const x = x0 + offset(t);
    const bw = 11 + t * 7;
    let vk = '#e2e8f0';
    if (type === 'bol' && t > 0.25 && t < 0.75) vk = '#fca5a5';
    if (type === 'hol' && t > 0.6) vk = '#fcd34d';
    if (type === 'neutraal') vk = '#bbf7d0';
    return { x, y, bw, vk };
  });
  const pad = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n; const y = topY + t * (botY - topY); const x = x0 + offset(t);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 205" width="100" height="205" className="mx-auto">
      <circle cx={x0 + offset(0)} cy={topY - 6} r="13" fill="#f0c9a8" />
      {wervels.map((w, i) => (
        <rect key={i} x={w.x - w.bw / 2} y={w.y - 4} width={w.bw} height="7" rx="2" fill={w.vk} stroke="#94a3b8" strokeWidth="0.8" />
      ))}
      <path d={pad} fill="none" stroke={kleur} strokeWidth="2.5" opacity="0.7" />
      <text x={x0} y="200" textAnchor="middle" fontSize="12" fontWeight="700" fill={kleur}>{label}</text>
    </svg>
  );
}

// ─── Infokaders ───────────────────────────────────────────────────────────────
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

export default function HoudingLab({ graad = 2 }) {
  return (
    <div className="space-y-6">
      <Sectie
        tool={<TilSimulator />}
        info={(
          <div className="flex flex-col gap-4 h-full">
            <InfoKader titel="De hefboom van je rug">
              <p>Hoe verder je een last van je rug houdt, hoe zwaarder die weegt voor je onderrug — als een lange hefboom. Een last van 15 kg met een gebogen rug kan honderden kilo's druk op je lendenwervels geven.</p>
              <p>Daarom: <strong>door de knieën, rug recht, last dicht tegen je lichaam.</strong> Je benen zijn veel sterker dan je rug.</p>
            </InfoKader>
            <InfoKader titel="Til-regels (manutentie)">
              <p>1. Ga dicht bij de last staan. 2. Zak door je knieën, hou je rug recht. 3. Span je buikspieren aan. 4. Til met je benen. 5. Draai met je voeten, niet met je rug. 6. Te zwaar? Vraag hulp of til in delen.</p>
              <p className="pt-1 border-t border-indigo-100 text-indigo-400">Leerplan: BV1_01.02.01 (heffen, tillen) · I.6 (manutentie).</p>
            </InfoKader>
          </div>
        )}
      />

      <Sectie
        tool={<Houdingchecker />}
        info={(
          <InfoKader titel="Statisch en dynamisch">
            <p>Je houding is <strong>statisch</strong> als je stilzit of -staat, en <strong>dynamisch</strong> als je beweegt (tillen, dragen, draaien). Beide tellen voor je rug.</p>
            <p>De grootste boosdoener vandaag is lang stilzitten in een slechte houding — school, gamen, smartphone. Kleine correcties maken een groot verschil.</p>
            <p>Tip: geen enkele houding is perfect om úren aan te houden. <strong>Regelmatig van houding wisselen</strong> en even bewegen is het gezondst.</p>
          </InfoKader>
        )}
      />

      <Sectie
        tool={<ErgonomieOefening />}
        info={(
          <InfoKader titel="Waarom rughygiëne?">
            <p>Rugklachten zijn een van de meest voorkomende gezondheidsproblemen — en ze beginnen vaak jong, door verkeerde gewoontes.</p>
            <p>Goede <strong>rughygiëne</strong> (bewust omgaan met je rug bij tillen, zitten en staan) voorkomt veel ellende later. Het is een vaardigheid die je nu leert en je leven lang meeneemt.</p>
            {graad >= 3 && <p>Ook in vele beroepen (zorg, bouw, logistiek) is manutentie een verplichte veiligheidsvaardigheid.</p>}
          </InfoKader>
        )}
      />

      {/* Wervelkolom-verdieping → 3de graad */}
      {graad >= 3 && (
        <Sectie
          tool={(
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-1">De neutrale wervelkolom</h3>
              <p className="text-xs text-gray-500 mb-4">Je ruggengraat heeft van nature drie krommingen (een dubbele S). In die "neutrale" stand vangt hij schokken het best op.</p>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="bg-red-50 rounded-xl p-3">
                  <WervelKolom type="bol" kleur="#ef4444" label="Bol (kyfose)" />
                  <p className="text-xs text-gray-500 mt-1">rug rondt, druk op de tussenwervelschijven vooraan</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <WervelKolom type="neutraal" kleur="#22c55e" label="Neutraal" />
                  <p className="text-xs text-gray-500 mt-1">natuurlijke dubbele S, druk gelijk verdeeld</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                  <WervelKolom type="hol" kleur="#f59e0b" label="Hol (lordose)" />
                  <p className="text-xs text-gray-500 mt-1">onderrug te hol, druk op de facetgewrichten</p>
                </div>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-sm text-purple-900 mt-4">
                Sterke <strong>core-spieren</strong> (buik en rug samen) houden je wervelkolom in de neutrale stand — daarom is core-stability zo belangrijk voor een gezonde rug.
              </div>
            </div>
          )}
          info={(
            <InfoKader titel="Tussenwervelschijven">
              <p>Tussen je wervels liggen <strong>schijven</strong> die als schokdempers werken. Bij verkeerd tillen (gebogen rug) wordt de druk ongelijk verdeeld en kan zo'n schijf uitpuilen — een <strong>hernia</strong>.</p>
              <p>Een neutrale rug verdeelt de druk gelijkmatig, zodat de schijven gezond blijven.</p>
              <p>Bewegen is goed voor je schijven: ze krijgen geen bloedvaten en leven van de "pomp" die beweging veroorzaakt. Lang stilzitten is dus net ongezond.</p>
            </InfoKader>
          )}
        />
      )}
    </div>
  );
}
