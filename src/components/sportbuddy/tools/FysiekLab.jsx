// src/components/sportbuddy/tools/FysiekLab.jsx
// Tool voor de module Fysieke kenmerken (KLUSCE). Leerplan:
//   • 2de graad (BV2_01.06): KLUSCE-beweegprofiel verklaren — analyseren
//   • 3de graad (BV3_01.05/06): K/L/U/S/C/E ontwikkelen + beweegvoorkeuren
//     onderbouwen — evalueren (hoger niveau)
//
// Datavrij: het profiel gaat over de fictieve buddy (stats K/L/U/S/C/E), niet
// over het lichaam van de leerling. Graad-differentiatie via prop `graad`.
//
// Layout-keuze: een altijd zichtbaar radardiagram (het profiel als geheel) naast
// tabs per kenmerk (de diepte in). Zo blijft het overzicht bewaard terwijl je
// inzoomt — beter dan losse secties (geen overzicht) of één lange lijst (scrollen).
//
// Delen:
//   1. Profielverkenner: radar + tab per kenmerk (uitleg, sporten, training).
//   2. Welk kenmerk overheerst? — sporten koppelen aan hun dominante kenmerk.
//   3. Trainbaarheid & evolutie (3de graad) — hoe snel ontwikkelt elk kenmerk.

import { useState } from 'react';

// De zes KLUSCE-kenmerken met didactische inhoud.
const KENMERKEN = [
  {
    key: 'K', naam: 'Kracht', emoji: '💪', kleur: '#ef4444',
    wat: 'De mate waarin je spieren weerstand kunnen overwinnen — duwen, trekken, tillen, springen.',
    sporten: 'gewichtheffen, rugby, sprinten, turnen',
    training: 'Krachttraining met eigen lichaamsgewicht of gewichten: push-ups, squats, springen. Bij jongeren vooral met eigen lichaamsgewicht.',
    trainbaar: 'hoog', evolutie: 'Kracht neemt sterk toe vanaf de puberteit, vooral bij een groeispurt. Trainbaar op elke leeftijd.',
  },
  {
    key: 'L', naam: 'Lenigheid', emoji: '🤸', kleur: '#8b5cf6',
    wat: 'De bewegingsuitslag van je gewrichten — hoe ver je kunt reiken, buigen en strekken.',
    sporten: 'turnen, dans, gymnastiek, vechtsport',
    training: 'Regelmatig en rustig rekken (statisch én dynamisch). Warm eerst op — koud rekken helpt weinig en kan blesseren.',
    trainbaar: 'hoog', evolutie: 'Kinderen zijn van nature lenig; zonder onderhoud neemt lenigheid af met de leeftijd. "Use it or lose it".',
  },
  {
    key: 'U', naam: 'Uithouding', emoji: '🫁', kleur: '#22c55e',
    wat: 'Hoe lang je een inspanning kunt volhouden — je aerobe motor (hart en longen).',
    sporten: 'lopen, wielrennen, zwemmen, voetbal',
    training: 'Langdurige inspanning op een tempo dat je kunt volhouden, plus intervallen. Bouw geleidelijk op.',
    trainbaar: 'zeer hoog', evolutie: 'Uithouding is een van de best trainbare kenmerken en verbetert snel met regelmatige duurtraining.',
  },
  {
    key: 'S', naam: 'Snelheid', emoji: '⚡', kleur: '#f59e0b',
    wat: 'Hoe snel je een beweging kunt uitvoeren — reactiesnelheid en versnelling.',
    sporten: 'sprinten, voetbal, basketbal, hockey',
    training: 'Korte, maximale sprints met volledige rust ertussen. Techniek en explosiviteit staan centraal.',
    trainbaar: 'matig', evolutie: 'Snelheid is deels aangeboren (spiervezeltype), maar techniek en reactietijd zijn wel te verbeteren.',
  },
  {
    key: 'C', naam: 'Coördinatie', emoji: '🎯', kleur: '#3b82f6',
    wat: 'Hoe vloeiend je bewegingen samenwerken — oog-handcoördinatie, timing, ritme.',
    sporten: 'jongleren, dans, tennis, gymnastiek',
    training: 'Veel gevarieerde bewegingservaringen: balspelen, ritme-oefeningen, nieuwe vaardigheden leren.',
    trainbaar: 'hoog', evolutie: 'De jonge jaren zijn het "gouden leertijdperk" voor coördinatie — vroeg oefenen loont het meest.',
  },
  {
    key: 'E', naam: 'Evenwicht', emoji: '⚖️', kleur: '#14b8a6',
    wat: 'Je vermogen om stabiel te blijven — stilstaand (statisch) én in beweging (dynamisch).',
    sporten: 'turnen, skateboarden, dans, klimmen',
    training: 'Oefenen op één been, wiebelplanken, balanceer-oefeningen. Ook je romp-("core")stabiliteit trainen.',
    trainbaar: 'hoog', evolutie: 'Evenwicht verbetert met oefening op elke leeftijd en is belangrijk om blessures te voorkomen.',
  },
];

// Kleine radar (hergebruikt de KLUSCE-logica, zelfstandig zodat de tool los werkt)
function MiniRadar({ stats, actiefKey, size = 200 }) {
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
      <polygon points={dataPunten} fill="#7c3aed" fillOpacity="0.35" stroke="#7c3aed" strokeWidth="2" />
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

// ─── 1. Profielverkenner (radar + tabs) ───────────────────────────────────────
function Profielverkenner({ stats, graad }) {
  const [actief, setActief] = useState('K');
  const k = KENMERKEN.find((x) => x.key === actief);
  const waarde = Math.round(stats?.[k.key] ?? 10);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="font-bold text-gray-800 mb-1">Het KLUSCE-profiel van je buddy</h3>
      <p className="text-xs text-gray-500 mb-4">Zes fysieke kenmerken vormen samen het beweegprofiel. Tik op een kenmerk om het te verkennen.</p>

      <div className="grid sm:grid-cols-[200px_1fr] gap-4 items-start">
        {/* Altijd zichtbaar: het profiel als geheel */}
        <div className="bg-gray-50 rounded-2xl p-3">
          <MiniRadar stats={stats} actiefKey={actief} />
        </div>

        <div>
          {/* Tabs: de zes kenmerken */}
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

          {/* Detail van het actieve kenmerk */}
          <div className="rounded-2xl p-4" style={{ backgroundColor: `${k.kleur}10` }}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-gray-800">{k.emoji} {k.naam}</h4>
              <span className="text-sm font-bold" style={{ color: k.kleur }}>{waarde}/100 bij je buddy</span>
            </div>
            <p className="text-sm text-gray-700 mb-3">{k.wat}</p>
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold text-gray-600">Sporten die erop leunen:</span> <span className="text-gray-700">{k.sporten}</span></p>
              <p><span className="font-semibold text-gray-600">Hoe train je het:</span> <span className="text-gray-700">{k.training}</span></p>
              {graad >= 3 && (
                <p className="pt-2 border-t border-gray-200"><span className="font-semibold text-gray-600">Evolutie:</span> <span className="text-gray-700">{k.evolutie}</span></p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 2. Welk kenmerk overheerst? ──────────────────────────────────────────────
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

// ─── 3. Trainbaarheid & evolutie (3de graad) ──────────────────────────────────
const TRAINBAAR_KLEUR = { 'matig': '#f59e0b', 'hoog': '#22c55e', 'zeer hoog': '#16a34a' };
const TRAINBAAR_BREEDTE = { 'matig': '45%', 'hoog': '75%', 'zeer hoog': '95%' };

function Trainbaarheid() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="font-bold text-gray-800 mb-1">Hoe trainbaar is elk kenmerk?</h3>
      <p className="text-xs text-gray-500 mb-4">Niet elk kenmerk verbetert even snel. Sommige zijn deels aangeboren, andere ontwikkel je sterk met training.</p>
      <div className="space-y-3">
        {KENMERKEN.map((k) => (
          <div key={k.key}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-semibold text-gray-700">{k.emoji} {k.naam}</span>
              <span className="text-xs font-semibold" style={{ color: TRAINBAAR_KLEUR[k.trainbaar] }}>{k.trainbaar} trainbaar</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-2.5 rounded-full" style={{ width: TRAINBAAR_BREEDTE[k.trainbaar], backgroundColor: TRAINBAAR_KLEUR[k.trainbaar] }} />
            </div>
          </div>
        ))}
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
            <InfoKader titel="Lees de radar">
              <p>Hoe verder een punt van het midden ligt, hoe sterker dat kenmerk bij je buddy. De vorm van de zeshoek toont in één oogopslag waar zijn sterktes en groeikansen liggen.</p>
              {graad >= 3 && <p>Een evenwichtig profiel is veelzijdig; een "spits" profiel is gespecialiseerd. Beide kunnen goed zijn — het hangt af van de sport.</p>}
            </InfoKader>
          </div>
        )}
      />

      <Sectie
        tool={<KenmerkOefening />}
        info={(
          <InfoKader titel="Waarom dit ertoe doet">
            <p>Als je weet welk kenmerk je sport vraagt, kun je <strong>gerichter trainen</strong>. Een turner traint anders dan een langeafstandsloper.</p>
            <p>Het helpt je ook je <strong>beweegvoorkeuren</strong> te begrijpen: sporten waarin je sterke kenmerken passen, voelen vaak vanzelfsprekender.</p>
            {graad >= 3 && <p>In het leerplan heet dit je beweegvoorkeuren onderbouwen vanuit je fysieke capaciteiten.</p>}
          </InfoKader>
        )}
      />

      {/* Trainbaarheid = evolutie-inzicht → 3de graad (BV3_01.05/06) */}
      {graad >= 3 && (
        <Sectie
          tool={<Trainbaarheid />}
          info={(
            <InfoKader titel="Aangeboren of trainbaar?">
              <p>Sommige kenmerken zijn sterk <strong>trainbaar</strong> (uithouding, kracht); andere zijn deels aangeboren (snelheid hangt af van je spiervezeltype).</p>
              <p>Dat betekent niet dat je snelheid niet kunt verbeteren — techniek, reactietijd en kracht helpen altijd. Maar het verklaart waarom talent en training samen tellen.</p>
              <p>De <strong>gevoelige periodes</strong> verschillen: coördinatie leer je het best jong, kracht komt sterk op met de puberteit.</p>
            </InfoKader>
          )}
        />
      )}
    </div>
  );
}
