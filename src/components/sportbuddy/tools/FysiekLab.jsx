// src/components/sportbuddy/tools/FysiekLab.jsx
// Tool voor de module Fysieke kenmerken (KLUSCE). Leerplan:
//   • 2de graad (BV2_01.06): KLUSCE-beweegprofiel verklaren — analyseren
//   • 3de graad (BV3_01.05/06): K/L/U/S/C/E ontwikkelen + beweegvoorkeuren
//     onderbouwen — evalueren
//
// Datavrij: profiel van de fictieve buddy (stats K/L/U/S/C/E), niet van de
// leerling. Graad-differentiatie via prop `graad`.
//
// Inhoud literatuuronderbouwd:
//   • Soorten kracht: maximaalkracht, snelkracht/explosieve kracht,
//     krachtuithouding (o.a. eigenkracht.nl, trainbeter.nl, trainingsleer).
//   • Uithouding: aeroob vs anaeroob (drempel ~70% max).
//   • Sensitieve/"gouden" periodes: LTAD-model (Balyi et al.): lenigheid 6-10 j,
//     snelheid 7-9 én 13-16 j, coördinatie 9-12 j, uithouding rond de groeispurt,
//     kracht 12-18 maanden ná de groeispurtpiek.
//
// Delen:
//   1. Profielverkenner: radar + tab per kenmerk (wat, soorten, sporten, training).
//   2. Sportprofiel-vergelijker: kies een sport → zie zijn KLUSCE-verdeling.
//   3. Welk kenmerk overheerst? — sporten koppelen aan hun dominante kenmerk.
//   4. Gouden leeftijd (3de graad) — sensitieve periode per kenmerk op een tijdlijn.

import { useState } from 'react';

const KENMERKEN = [
  {
    key: 'K', naam: 'Kracht', emoji: '💪', kleur: '#ef4444',
    wat: 'Het vermogen van je spieren om weerstand te overwinnen, vast te houden of tegen te werken.',
    soorten: [
      ['Maximaalkracht', 'de grootst mogelijke kracht bij één zware herhaling (bv. een 1RM squat).'],
      ['Snelkracht / explosieve kracht', 'zo snel mogelijk kracht zetten (bv. een sprong of worp).'],
      ['Krachtuithouding', 'een krachtinspanning lang volhouden met veel herhalingen (bv. roeien).'],
    ],
    sporten: 'gewichtheffen, rugby, sprinten, turnen',
    training: 'Krachttraining met eigen lichaamsgewicht of gewichten: push-ups, squats, springen. Bij jongeren vooral met eigen lichaamsgewicht.',
    // Sensitieve periode (LTAD): kracht 12-18 maanden ná de groeispurtpiek
    gouden: [13, 17], goudenTekst: 'Kracht komt sterk op ná de groeispurt (ongeveer 13-17 jaar), wanneer hormonen de spiergroei stimuleren.',
  },
  {
    key: 'L', naam: 'Lenigheid', emoji: '🤸', kleur: '#8b5cf6',
    wat: 'De bewegingsuitslag van je gewrichten — hoe ver je kunt reiken, buigen en strekken.',
    soorten: [
      ['Statische lenigheid', 'een rekhouding stil aanhouden (bv. een spagaat).'],
      ['Dynamische lenigheid', 'bewegingsuitslag tíjdens beweging (bv. een hoge trap).'],
    ],
    sporten: 'turnen, dans, gymnastiek, vechtsport',
    training: 'Regelmatig en rustig rekken (statisch én dynamisch). Warm eerst op — koud rekken helpt weinig en kan blesseren.',
    // LTAD: flexibiliteit 6-10 jaar
    gouden: [6, 10], goudenTekst: 'Kinderen zijn van nature het lenigst (ongeveer 6-10 jaar). Zonder onderhoud neemt lenigheid daarna af — "use it or lose it".',
  },
  {
    key: 'U', naam: 'Uithouding', emoji: '🫁', kleur: '#22c55e',
    wat: 'Hoe lang je een inspanning kunt volhouden — je aerobe en anaerobe motor.',
    soorten: [
      ['Aeroob uithoudingsvermogen', 'mét zuurstof, onder ~70% van je max — lange, rustige inspanning.'],
      ['Anaeroob uithoudingsvermogen', 'zonder voldoende zuurstof, boven ~70% — kort en intens, met lactaat.'],
    ],
    sporten: 'lopen, wielrennen, zwemmen, voetbal',
    training: 'Langdurige inspanning op een tempo dat je kunt volhouden, plus intervallen. Bouw geleidelijk op.',
    // LTAD: aerobe capaciteit rond de groeispurt
    gouden: [11, 15], goudenTekst: 'Uithouding is het best trainbaar rond de groeispurt (ongeveer 11-15 jaar), wanneer hart en longen sterk meegroeien.',
  },
  {
    key: 'S', naam: 'Snelheid', emoji: '⚡', kleur: '#f59e0b',
    wat: 'Hoe snel je een beweging kunt uitvoeren — reactiesnelheid, versnelling en maximale snelheid.',
    soorten: [
      ['Reactiesnelheid', 'hoe snel je reageert op een prikkel (bv. een startschot).'],
      ['Acceleratie', 'hoe snel je op gang komt vanuit stilstand.'],
      ['Maximale snelheid', 'je topsnelheid eenmaal op gang.'],
    ],
    sporten: 'sprinten, voetbal, basketbal, hockey',
    training: 'Korte, maximale sprints met volledige rust ertussen. Techniek en explosiviteit staan centraal.',
    // LTAD: twee vensters — 7-9 én 13-16 jaar
    gouden: [7, 16], goudenTekst: 'Snelheid heeft twee gevoelige vensters: rond 7-9 jaar (bewegingssnelheid) en opnieuw 13-16 jaar (kracht-gebonden snelheid). Deels aangeboren via je spiervezeltype.',
  },
  {
    key: 'C', naam: 'Coördinatie', emoji: '🎯', kleur: '#3b82f6',
    wat: 'Hoe vloeiend je bewegingen samenwerken — oog-handcoördinatie, timing en ritme.',
    soorten: [
      ['Oog-handcoördinatie', 'handen sturen op wat je ziet (bv. een bal vangen).'],
      ['Ritme & timing', 'bewegingen op het juiste moment uitvoeren (bv. dansen).'],
      ['Aanpassingsvermogen', 'je beweging bijsturen als de situatie verandert.'],
    ],
    sporten: 'jongleren, dans, tennis, gymnastiek',
    training: 'Veel gevarieerde bewegingservaringen: balspelen, ritme-oefeningen, nieuwe vaardigheden leren.',
    // LTAD: coördinatie/techniek 9-12 jaar
    gouden: [8, 12], goudenTekst: 'De "gouden leeftijd van het leren" (ongeveer 8-12 jaar): nieuwe bewegingen worden nu het snelst en blijvend aangeleerd.',
  },
  {
    key: 'E', naam: 'Evenwicht', emoji: '⚖️', kleur: '#14b8a6',
    wat: 'Je vermogen om stabiel te blijven — stilstaand (statisch) én in beweging (dynamisch).',
    soorten: [
      ['Statisch evenwicht', 'stabiel blijven zonder te bewegen (bv. een handstand).'],
      ['Dynamisch evenwicht', 'in balans blijven tijdens beweging (bv. over een balk lopen).'],
    ],
    sporten: 'turnen, skateboarden, dans, klimmen',
    training: 'Oefenen op één been, wiebelplanken, balanceer-oefeningen. Ook je romp-("core")stabiliteit trainen.',
    // Evenwicht sterk verweven met coördinatie → vergelijkbaar venster
    gouden: [8, 12], goudenTekst: 'Evenwicht ontwikkelt sterk mee met coördinatie (ongeveer 8-12 jaar), maar blijft op elke leeftijd trainbaar en beschermt tegen blessures.',
  },
];

// Sportprofielen: KLUSCE-verdeling per sport (didactische richtwaarden 0-100)
const SPORTPROFIELEN = [
  { id: 'voetbal', label: 'Voetbal', emoji: '⚽', stats: { K: 55, L: 45, U: 80, S: 78, C: 70, E: 55 } },
  { id: 'basketbal', label: 'Basketbal', emoji: '🏀', stats: { K: 62, L: 45, U: 68, S: 80, C: 78, E: 60 } },
  { id: 'turnen', label: 'Turnen', emoji: '🤸', stats: { K: 78, L: 92, U: 50, S: 60, C: 88, E: 90 } },
  { id: 'zwemmen', label: 'Zwemmen', emoji: '🏊', stats: { K: 65, L: 70, U: 88, S: 65, C: 62, E: 40 } },
  { id: 'sprint', label: 'Sprint (100m)', emoji: '💨', stats: { K: 82, L: 55, U: 35, S: 98, C: 60, E: 55 } },
  { id: 'wielrennen', label: 'Wielrennen', emoji: '🚴', stats: { K: 60, L: 40, U: 95, S: 62, C: 50, E: 55 } },
  { id: 'tennis', label: 'Tennis', emoji: '🎾', stats: { K: 58, L: 60, U: 70, S: 75, C: 85, E: 65 } },
  { id: 'dans', label: 'Dans', emoji: '💃', stats: { K: 55, L: 85, U: 65, S: 60, C: 88, E: 82 } },
];

// ─── Radar-component ──────────────────────────────────────────────────────────
function Radar({ stats, actiefKey, kleur = '#7c3aed', size = 200 }) {
  const keys = KENMERKEN.map((k) => k.key);
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

  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className="mx-auto">
      {raster.map((pts, i) => <polygon key={i} points={pts} fill="none" stroke="#e5e7eb" strokeWidth="1" />)}
      {keys.map((_, i) => {
        const [x, y] = punt(i, r);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e5e7eb" strokeWidth="1" />;
      })}
      <polygon points={dataPunten} fill={kleur} fillOpacity="0.35" stroke={kleur} strokeWidth="2" />
      {keys.map((k, i) => {
        const [x, y] = punt(i, r + 11);
        const actief = k === actiefKey;
        return (
          <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontSize={actief ? 13 : 10} fontWeight="700" fill={actief ? KENMERKEN[i].kleur : '#9ca3af'}>{k}</text>
        );
      })}
    </svg>
  );
}

// ─── 1. Profielverkenner (radar + tabs, met soorten) ──────────────────────────
function Profielverkenner({ stats, graad }) {
  const [actief, setActief] = useState('K');
  const k = KENMERKEN.find((x) => x.key === actief);
  const waarde = Math.round(stats?.[k.key] ?? 10);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="font-bold text-gray-800 mb-1">Het KLUSCE-profiel van je buddy</h3>
      <p className="text-xs text-gray-500 mb-4">Zes fysieke kenmerken vormen samen het beweegprofiel. Tik op een kenmerk om het te verkennen.</p>

      <div className="grid sm:grid-cols-[200px_1fr] gap-4 items-start">
        <div className="bg-gray-50 rounded-2xl p-3">
          <Radar stats={stats} actiefKey={actief} />
        </div>

        <div>
          <div className="grid grid-cols-6 gap-1 mb-4">
            {KENMERKEN.map((kn) => (
              <button key={kn.key} type="button" onClick={() => setActief(kn.key)}
                className={`py-2 rounded-xl border-2 text-sm font-bold transition-all ${actief === kn.key ? 'text-white' : 'text-gray-500 border-gray-200 hover:border-gray-300'}`}
                style={actief === kn.key ? { backgroundColor: kn.kleur, borderColor: kn.kleur } : {}}
                title={kn.naam}>
                {kn.key}
              </button>
            ))}
          </div>

          <div className="rounded-2xl p-4" style={{ backgroundColor: `${k.kleur}10` }}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-gray-800">{k.emoji} {k.naam}</h4>
              <span className="text-sm font-bold" style={{ color: k.kleur }}>{waarde}/100 bij je buddy</span>
            </div>
            <p className="text-sm text-gray-700 mb-3">{k.wat}</p>

            {/* Soorten van dit kenmerk */}
            <div className="mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Soorten</p>
              <ul className="space-y-1">
                {k.soorten.map(([naam, uitleg]) => (
                  <li key={naam} className="text-sm text-gray-700">
                    <span className="font-semibold" style={{ color: k.kleur }}>{naam}:</span> {uitleg}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-1.5 text-sm pt-2 border-t border-gray-200">
              <p><span className="font-semibold text-gray-600">Sporten:</span> <span className="text-gray-700">{k.sporten}</span></p>
              <p><span className="font-semibold text-gray-600">Hoe train je het:</span> <span className="text-gray-700">{k.training}</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 2. Sportprofiel-vergelijker ──────────────────────────────────────────────
function SportProfielen() {
  const [sportId, setSportId] = useState('basketbal');
  const sport = SPORTPROFIELEN.find((s) => s.id === sportId);
  // Gesorteerde kenmerken voor de "belangrijkste" duiding
  const gesorteerd = [...KENMERKEN].sort((a, b) => sport.stats[b.key] - sport.stats[a.key]);
  const top = gesorteerd.slice(0, 2);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="font-bold text-gray-800 mb-1">Het profiel van een sport</h3>
      <p className="text-xs text-gray-500 mb-4">Kies een sport en zie hoe groot het aandeel van elk KLUSCE-kenmerk is. Zo zie je meteen waarop die sport vooral leunt.</p>

      <div className="grid grid-cols-4 gap-1.5 mb-4">
        {SPORTPROFIELEN.map((s) => (
          <button key={s.id} type="button" onClick={() => setSportId(s.id)}
            className={`px-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${sportId === s.id ? 'border-purple-600 bg-purple-50 text-purple-800' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
            <span className="block text-lg">{s.emoji}</span>
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-[200px_1fr] gap-4 items-center">
        <div className="bg-gray-50 rounded-2xl p-3">
          <Radar stats={sport.stats} kleur="#0ea5e9" />
        </div>
        <div>
          {/* Balken per kenmerk */}
          <div className="space-y-2 mb-3">
            {KENMERKEN.map((kn) => {
              const v = sport.stats[kn.key];
              return (
                <div key={kn.key} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-600 w-24 shrink-0">{kn.emoji} {kn.naam}</span>
                  <div className="flex-grow bg-gray-100 rounded-full h-3">
                    <div className="h-3 rounded-full transition-all duration-500" style={{ width: `${v}%`, backgroundColor: kn.kleur }} />
                  </div>
                  <span className="text-xs font-bold text-gray-500 w-8 text-right tabular-nums">{v}</span>
                </div>
              );
            })}
          </div>
          <div className="bg-sky-50 rounded-xl p-3 text-sm text-sky-900">
            <strong>{sport.emoji} {sport.label}</strong> leunt vooral op <strong>{top[0].naam.toLowerCase()}</strong> en <strong>{top[1].naam.toLowerCase()}</strong>.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 3. Welk kenmerk overheerst? ──────────────────────────────────────────────
const SPORT_KENMERK = [
  { sport: 'Een marathon lopen', emoji: '🏃', juist: 'U' },
  { sport: 'Een gewicht boven je hoofd tillen', emoji: '🏋️', juist: 'K' },
  { sport: 'Een spagaat maken', emoji: '🤸', juist: 'L' },
  { sport: 'Een 100 meter sprint', emoji: '⚡', juist: 'S' },
  { sport: 'Op een evenwichtsbalk lopen', emoji: '⚖️', juist: 'E' },
  { sport: 'Drie ballen jongleren', emoji: '🤹', juist: 'C' },
];

function KenmerkOefening() {
  const [index, setIndex] = useState(0);
  const [gekozen, setGekozen] = useState(null);
  const [score, setScore] = useState(0);
  const [klaar, setKlaar] = useState(false);
  const opgave = SPORT_KENMERK[index];

  const kies = (key) => {
    if (gekozen) return;
    setGekozen(key);
    if (key === opgave.juist) setScore((s) => s + 1);
  };
  const volgende = () => {
    if (index < SPORT_KENMERK.length - 1) { setIndex(index + 1); setGekozen(null); }
    else setKlaar(true);
  };
  const opnieuw = () => { setIndex(0); setGekozen(null); setScore(0); setKlaar(false); };

  if (klaar) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
        <div className="text-4xl mb-2">{score === SPORT_KENMERK.length ? '🎯' : '💪'}</div>
        <p className="text-lg font-bold text-gray-800 mb-1">{score} / {SPORT_KENMERK.length} juist</p>
        <p className="text-sm text-gray-500 mb-4">Elke sport leunt op andere kenmerken. Wéten welke, helpt je gerichter trainen.</p>
        <button type="button" onClick={opnieuw} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">Opnieuw</button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">Welk kenmerk overheerst?</h3>
        <span className="text-xs text-gray-400">{index + 1} / {SPORT_KENMERK.length}</span>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 mb-4 text-center">
        <div className="text-3xl mb-1">{opgave.emoji}</div>
        <p className="text-sm text-gray-700">{opgave.sport}</p>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {KENMERKEN.map((kn) => {
          const isJuist = kn.key === opgave.juist;
          const isGekozen = gekozen === kn.key;
          let stijl = 'border-gray-200 text-gray-600 hover:border-purple-300';
          if (gekozen) {
            if (isJuist) stijl = 'border-green-500 bg-green-50 text-green-800';
            else if (isGekozen) stijl = 'border-red-500 bg-red-50 text-red-800';
            else stijl = 'border-gray-200 text-gray-300';
          }
          return (
            <button key={kn.key} type="button" disabled={!!gekozen} onClick={() => kies(kn.key)}
              className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${stijl}`} title={kn.naam}>
              {kn.key}
            </button>
          );
        })}
      </div>
      {gekozen && (
        <div className="mt-4">
          <div className={`rounded-xl p-3 text-sm ${gekozen === opgave.juist ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
            {gekozen === opgave.juist ? '✅ Juist! ' : `❌ Het juiste antwoord is ${KENMERKEN.find((x) => x.key === opgave.juist).naam}. `}
            Dit steunt vooral op <strong>{KENMERKEN.find((x) => x.key === opgave.juist).naam.toLowerCase()}</strong>.
          </div>
          <div className="flex justify-end mt-3">
            <button type="button" onClick={volgende} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">
              {index < SPORT_KENMERK.length - 1 ? 'Volgende' : 'Resultaat'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 4. Gouden leeftijd (sensitieve periodes, 3de graad) ──────────────────────
function GoudenLeeftijd() {
  const [actief, setActief] = useState('C');
  const k = KENMERKEN.find((x) => x.key === actief);
  const MIN = 5, MAX = 20;
  const pct = (leeftijd) => ((leeftijd - MIN) / (MAX - MIN)) * 100;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="font-bold text-gray-800 mb-1">De gouden leeftijd per kenmerk</h3>
      <p className="text-xs text-gray-500 mb-4">Elk kenmerk heeft een "gevoelige periode" waarin training het meeste effect heeft. Tik op een kenmerk en zie wanneer.</p>

      <div className="grid grid-cols-6 gap-1 mb-5">
        {KENMERKEN.map((kn) => (
          <button key={kn.key} type="button" onClick={() => setActief(kn.key)}
            className={`py-2 rounded-xl border-2 text-sm font-bold transition-all ${actief === kn.key ? 'text-white' : 'text-gray-500 border-gray-200 hover:border-gray-300'}`}
            style={actief === kn.key ? { backgroundColor: kn.kleur, borderColor: kn.kleur } : {}}>
            {kn.key}
          </button>
        ))}
      </div>

      {/* Tijdlijn 5-20 jaar */}
      <div className="px-1 mb-2">
        <div className="relative h-10">
          {/* As */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 rounded-full -translate-y-1/2" />
          {/* Gevoelig venster */}
          <div className="absolute top-1/2 h-3 rounded-full -translate-y-1/2 transition-all duration-500"
            style={{ left: `${pct(k.gouden[0])}%`, width: `${pct(k.gouden[1]) - pct(k.gouden[0])}%`, backgroundColor: k.kleur }} />
          {/* Labels bij het venster */}
          <div className="absolute -top-1 text-[10px] font-bold" style={{ left: `${pct(k.gouden[0])}%`, color: k.kleur }}>{k.gouden[0]} j</div>
          <div className="absolute -top-1 text-[10px] font-bold -translate-x-full" style={{ left: `${pct(k.gouden[1])}%`, color: k.kleur }}>{k.gouden[1]} j</div>
        </div>
        {/* Leeftijd-ticks */}
        <div className="flex justify-between text-[10px] text-gray-400">
          {[5, 8, 11, 14, 17, 20].map((j) => <span key={j}>{j}</span>)}
        </div>
      </div>

      <div className="rounded-xl p-3 text-sm mt-3" style={{ backgroundColor: `${k.kleur}12`, color: k.kleur }}>
        <strong>{k.emoji} {k.naam}.</strong> {k.goudenTekst}
      </div>
    </div>
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

export default function FysiekLab({ graad = 2, buddy }) {
  const stats = buddy?.stats || { K: 10, L: 10, U: 10, S: 10, C: 10, E: 10 };

  return (
    <div className="space-y-6">
      <Sectie
        tool={<Profielverkenner stats={stats} graad={graad} />}
        info={(
          <div className="flex flex-col gap-4 h-full">
            <InfoKader titel="Wat is KLUSCE?">
              <p><strong>KLUSCE</strong> staat voor de zes fysieke basiskenmerken: <strong>K</strong>racht, <strong>L</strong>enigheid, <strong>U</strong>ithouding, <strong>S</strong>nelheid, <strong>C</strong>oördinatie en <strong>E</strong>venwicht.</p>
              <p>Samen vormen ze je <strong>beweegprofiel</strong>. Geen enkele sporter scoort overal maximaal — elke sport vraagt een eigen mix.</p>
            </InfoKader>
            <InfoKader titel="Kenmerken hebben soorten">
              <p>Elk kenmerk valt uiteen in soorten. Kracht is bijvoorbeeld niet één ding: <strong>maximaalkracht</strong> (zwaar tillen) verschilt van <strong>snelkracht</strong> (explosief springen) en <strong>krachtuithouding</strong> (lang volhouden).</p>
              <p>Ook uithouding kent een <strong>aerobe</strong> (mét zuurstof) en <strong>anaerobe</strong> (zonder, met lactaat) vorm. Elke soort train je anders.</p>
            </InfoKader>
          </div>
        )}
      />

      <Sectie
        tool={<SportProfielen />}
        info={(
          <InfoKader titel="Elke sport zijn profiel">
            <p>Vergelijk de radars: een <strong>sprinter</strong> piekt op snelheid en kracht, een <strong>turner</strong> op lenigheid, evenwicht en coördinatie, een <strong>wielrenner</strong> op uithouding.</p>
            <p>Zo'n profiel helpt je begrijpen waarom sporters zo verschillend trainen — en welke sport bij jouw sterke kenmerken past.</p>
            {graad >= 3 && <p>In het leerplan heet dit je beweegvoorkeuren onderbouwen vanuit je fysieke capaciteiten.</p>}
          </InfoKader>
        )}
      />

      <Sectie
        tool={<KenmerkOefening />}
        info={(
          <InfoKader titel="Waarom dit ertoe doet">
            <p>Als je weet welk kenmerk je sport vraagt, kun je <strong>gerichter trainen</strong>. Een turner traint anders dan een langeafstandsloper.</p>
            <p>Het helpt je ook je <strong>beweegvoorkeuren</strong> te begrijpen: sporten waarin je sterke kenmerken passen, voelen vaak vanzelfsprekender.</p>
          </InfoKader>
        )}
      />

      {/* Gouden leeftijd = sensitieve periodes → 3de graad (BV3_01.05/06) */}
      {graad >= 3 && (
        <Sectie
          tool={<GoudenLeeftijd />}
          info={(
            <InfoKader titel="Sensitieve periodes">
              <p>Volgens het <strong>LTAD-model</strong> (Long-Term Athlete Development) heeft elk kenmerk een leeftijd waarop training extra effect heeft, gekoppeld aan de rijping van zenuwstelsel, spieren en hormonen.</p>
              <p><strong>Lenigheid</strong> en <strong>coördinatie</strong> pieken jong; <strong>kracht</strong> komt sterk op ná de groeispurt; <strong>uithouding</strong> rond de groeispurt zelf.</p>
              <p className="pt-1 border-t border-indigo-100">Belangrijk: dit zijn richtperiodes, geen deadlines. Élk kenmerk blijft op elke leeftijd trainbaar — buiten de gouden periode kost het alleen wat meer tijd.</p>
            </InfoKader>
          )}
        />
      )}
    </div>
  );
}
