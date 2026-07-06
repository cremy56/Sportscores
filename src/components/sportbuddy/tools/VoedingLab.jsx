// src/components/sportbuddy/tools/VoedingLab.jsx
// Interactieve tool voor de module Voeding (BO1_07.03 · WD2_13.01.06 · WD3_13.01.06).
// Datavrij: alles gaat over een gesimuleerd sportersbord en algemene principes,
// nooit over wat de leerling zelf eet (geen dagboek, geen invoer over het eigen
// lichaam of eetgedrag — bewust, i.v.m. eetstoornis-gevoeligheid).
//
// Graad-differentiatie (via prop `graad`):
//   • graad 1-2: Bordbouwer + hydratatie (basis voedingsdriehoek, BO1_07.03)
//   • graad 3  : + supplementen-fabelquiz (Sportwetenschappen)
//
// Delen:
//   1. Bordbouwer: verdeel je bord over de voedingsgroepen voor een doeldag,
//      krijg feedback t.o.v. de aanbevolen verhoudingen.
//   2. Hydratatie-check: hoeveel drinken bij welke omstandigheden.
//   3. Supplementen: fabel of feit? (enkel 3de graad)

import { useState, useMemo } from 'react';
import EnergiebalansSim from './EnergiebalansSim';
import MaaltijdPerSport from './MaaltijdPerSport';

// Voedingsgroepen met richtaandeel (%) per doeldag-type.
// Gebaseerd op de voedingsdriehoek + sportvoedingsprincipes (koolhydraten als
// motor rond zware training; eiwitten voor herstel; groenten/fruit als basis).
const GROEPEN = [
  { id: 'granen', naam: 'Granen & zetmeel', emoji: '🍞', kleur: '#f59e0b', hint: 'Pasta, rijst, brood, aardappel — de brandstof.' },
  { id: 'groenten', naam: 'Groenten & fruit', emoji: '🥦', kleur: '#22c55e', hint: 'Vitaminen, vezels, kleur op je bord.' },
  { id: 'eiwit', naam: 'Eiwitten', emoji: '🍗', kleur: '#ef4444', hint: 'Vlees, vis, ei, bonen, noten — de bouwstenen.' },
  { id: 'zuivel', naam: 'Zuivel', emoji: '🥛', kleur: '#3b82f6', hint: 'Melk, yoghurt, kaas — calcium & eiwit.' },
  { id: 'extra', naam: 'Extra / vetstof', emoji: '🧈', kleur: '#a855f7', hint: 'Oliën, noten, af en toe iets lekkers.' },
];

const DOELDAGEN = {
  rustdag:   { label: '😌 Rustdag',        doel: { granen: 25, groenten: 40, eiwit: 20, zuivel: 10, extra: 5 } },
  traindag:  { label: '💪 Zware trainingsdag', doel: { granen: 45, groenten: 25, eiwit: 20, zuivel: 5, extra: 5 } },
  matchdag:  { label: '🏟️ Wedstrijddag',   doel: { granen: 50, groenten: 20, eiwit: 15, zuivel: 10, extra: 5 } },
};

function Bordbouwer() {
  const [doeldag, setDoeldag] = useState('traindag');
  const [bord, setBord] = useState({ granen: 20, groenten: 20, eiwit: 20, zuivel: 20, extra: 20 });

  const totaal = Object.values(bord).reduce((s, v) => s + v, 0);
  const doel = DOELDAGEN[doeldag].doel;

  // Score: hoe dicht bij de aanbevolen verdeling (100 − gemiddelde afwijking)
  const score = useMemo(() => {
    const genormaliseerd = {};
    Object.keys(bord).forEach((k) => { genormaliseerd[k] = totaal > 0 ? (bord[k] / totaal) * 100 : 0; });
    const afwijking = Object.keys(doel).reduce((s, k) => s + Math.abs(genormaliseerd[k] - doel[k]), 0);
    return Math.max(0, Math.round(100 - afwijking));
  }, [bord, doel, totaal]);

  const feedback = score >= 85 ? { t: 'Uitstekend bord! Precies wat een sporter op deze dag nodig heeft.', k: 'text-green-700 bg-green-50' }
    : score >= 60 ? { t: 'Goed bezig — kleine bijsturing en het zit perfect.', k: 'text-amber-700 bg-amber-50' }
    : { t: 'Dit bord past nog niet bij deze dag. Bekijk de richtverdeling en pas aan.', k: 'text-red-700 bg-red-50' };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="font-bold text-gray-800 mb-1">De Bordbouwer</h3>
      <p className="text-xs text-gray-500 mb-4">Kies een dag en stel het bord van je buddy samen. Zie of je verdeling past bij wat een sporter die dag nodig heeft.</p>

      <div className="grid grid-cols-3 gap-1.5 mb-5">
        {Object.entries(DOELDAGEN).map(([id, d]) => (
          <button key={id} type="button" onClick={() => setDoeldag(id)}
            className={`px-2 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${doeldag === id ? 'border-purple-600 bg-purple-50 text-purple-800' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
            {d.label}
          </button>
        ))}
      </div>

      {/* Het bord: een stapelbalk van de verdeling */}
      <div className="flex h-8 rounded-full overflow-hidden mb-1 border border-gray-200">
        {GROEPEN.map((g) => {
          const pct = totaal > 0 ? (bord[g.id] / totaal) * 100 : 0;
          return pct > 0 ? <div key={g.id} style={{ width: `${pct}%`, backgroundColor: g.kleur }} title={g.naam} /> : null;
        })}
      </div>
      <div className="text-center text-xs text-gray-400 mb-4">jouw bord</div>

      {/* Schuiven per groep */}
      <div className="space-y-3 mb-4">
        {GROEPEN.map((g) => {
          const pct = totaal > 0 ? Math.round((bord[g.id] / totaal) * 100) : 0;
          const doelPct = doel[g.id];
          return (
            <div key={g.id}>
              <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                <span>{g.emoji} {g.naam}</span>
                <span>
                  <span style={{ color: g.kleur }}>{pct}%</span>
                  <span className="text-gray-300"> / doel {doelPct}%</span>
                </span>
              </div>
              <input type="range" min="0" max="50" value={bord[g.id]}
                onChange={(e) => setBord({ ...bord, [g.id]: +e.target.value })}
                className="w-full" style={{ accentColor: g.kleur }} />
            </div>
          );
        })}
      </div>

      <div className={`rounded-xl p-3 text-sm ${feedback.k}`}>
        <strong>Score: {score}/100.</strong> {feedback.t}
      </div>
    </div>
  );
}

// ─── Hydratatie-check ─────────────────────────────────────────────────────────
const HYDRATATIE = [
  { situatie: 'Een gewone schooldag zonder sport', juist: 'normaal', drank: '~1,5 L water verspreid over de dag' },
  { situatie: 'Een zware training op een warme dag', juist: 'veel', drank: 'Extra drinken vóór, tijdens én na — hitte kost veel vocht' },
  { situatie: 'Vlak vóór het slapengaan', juist: 'weinig', drank: 'Niet te veel meer — anders lig je \'s nachts wakker' },
];

function HydratatieCheck() {
  const [index, setIndex] = useState(0);
  const [gekozen, setGekozen] = useState(null);
  const [score, setScore] = useState(0);
  const [klaar, setKlaar] = useState(false);
  const opgave = HYDRATATIE[index];
  const opties = [
    { id: 'weinig', label: 'Weinig' },
    { id: 'normaal', label: 'Normaal' },
    { id: 'veel', label: 'Veel' },
  ];

  const kies = (id) => {
    if (gekozen) return;
    setGekozen(id);
    if (id === opgave.juist) setScore((s) => s + 1);
  };
  const volgende = () => {
    if (index < HYDRATATIE.length - 1) { setIndex(index + 1); setGekozen(null); }
    else setKlaar(true);
  };
  const opnieuw = () => { setIndex(0); setGekozen(null); setScore(0); setKlaar(false); };

  if (klaar) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
        <div className="text-4xl mb-2">{score === HYDRATATIE.length ? '💧' : '💪'}</div>
        <p className="text-lg font-bold text-gray-800 mb-1">{score} / {HYDRATATIE.length} juist</p>
        <p className="text-sm text-gray-500 mb-4">Hoeveel je nodig hebt hangt af van de dag: hitte en inspanning verhogen de behoefte.</p>
        <button type="button" onClick={opnieuw} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">Opnieuw</button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">Hoeveel drinken?</h3>
        <span className="text-xs text-gray-400">{index + 1} / {HYDRATATIE.length}</span>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 mb-4"><p className="text-sm text-gray-700">{opgave.situatie}</p></div>
      <div className="grid grid-cols-3 gap-2">
        {opties.map((o) => {
          const isJuist = o.id === opgave.juist;
          const isGekozen = gekozen === o.id;
          let stijl = 'border-gray-200 text-gray-700 hover:border-purple-300';
          if (gekozen) {
            if (isJuist) stijl = 'border-green-500 bg-green-50 text-green-800';
            else if (isGekozen) stijl = 'border-red-500 bg-red-50 text-red-800';
            else stijl = 'border-gray-200 text-gray-400';
          }
          return (
            <button key={o.id} type="button" disabled={!!gekozen} onClick={() => kies(o.id)}
              className={`px-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${stijl}`}>{o.label}</button>
          );
        })}
      </div>
      {gekozen && (
        <div className="mt-4">
          <div className={`rounded-xl p-3 text-sm ${gekozen === opgave.juist ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
            {gekozen === opgave.juist ? '✅ Juist! ' : `❌ Antwoord: ${opties.find((o) => o.id === opgave.juist).label}. `}
            {opgave.drank}
          </div>
          <div className="flex justify-end mt-3">
            <button type="button" onClick={volgende} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">
              {index < HYDRATATIE.length - 1 ? 'Volgende' : 'Resultaat'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Supplementen: fabel of feit? (enkel 3de graad) ───────────────────────────
const SUPPLEMENTEN = [
  { stelling: 'Eiwitshakes zijn nodig om spieren op te bouwen.', feit: false, uitleg: 'Fabel. Met gevarieerde voeding krijgt een jongere ruim genoeg eiwit binnen. Shakes zijn hooguit gemak, geen noodzaak.' },
  { stelling: 'Water is voor de meeste jongeren de beste sportdrank.', feit: true, uitleg: 'Feit. Enkel bij lange, intense inspanning (>1 u) bieden sportdranken meerwaarde. Voor de rest volstaat water.' },
  { stelling: 'Hoe meer vitaminepillen, hoe gezonder.', feit: false, uitleg: 'Fabel. Een teveel aan vitaminen helpt niet en kan zelfs schaden. Variatie op je bord verslaat elke pil.' },
  { stelling: 'Cafeïne kan de sportprestatie tijdelijk verbeteren.', feit: true, uitleg: 'Feit — maar met kanttekeningen: het verstoort de slaap, en bij jongeren wordt het afgeraden. Prestatie bouw je op met training en herstel.' },
];

function SupplementenQuiz() {
  const [index, setIndex] = useState(0);
  const [gekozen, setGekozen] = useState(null);
  const [score, setScore] = useState(0);
  const [klaar, setKlaar] = useState(false);
  const opgave = SUPPLEMENTEN[index];

  const kies = (keuze) => {
    if (gekozen !== null) return;
    setGekozen(keuze);
    if (keuze === opgave.feit) setScore((s) => s + 1);
  };
  const volgende = () => {
    if (index < SUPPLEMENTEN.length - 1) { setIndex(index + 1); setGekozen(null); }
    else setKlaar(true);
  };
  const opnieuw = () => { setIndex(0); setGekozen(null); setScore(0); setKlaar(false); };

  if (klaar) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
        <div className="text-4xl mb-2">{score >= 3 ? '🎉' : '💪'}</div>
        <p className="text-lg font-bold text-gray-800 mb-1">{score} / {SUPPLEMENTEN.length} juist</p>
        <p className="text-sm text-gray-500 mb-4">De supplementenindustrie belooft veel. Een kritische blik en gevarieerde voeding brengen je verder dan welke pil ook.</p>
        <button type="button" onClick={opnieuw} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">Opnieuw</button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">Fabel of feit?</h3>
        <span className="text-xs text-gray-400">{index + 1} / {SUPPLEMENTEN.length}</span>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 mb-4"><p className="text-sm text-gray-700">"{opgave.stelling}"</p></div>
      <div className="grid grid-cols-2 gap-2">
        {[{ v: true, l: '✅ Feit' }, { v: false, l: '❌ Fabel' }].map((o) => {
          const isJuist = o.v === opgave.feit;
          const isGekozen = gekozen === o.v;
          let stijl = 'border-gray-200 text-gray-700 hover:border-purple-300';
          if (gekozen !== null) {
            if (isJuist) stijl = 'border-green-500 bg-green-50 text-green-800';
            else if (isGekozen) stijl = 'border-red-500 bg-red-50 text-red-800';
            else stijl = 'border-gray-200 text-gray-400';
          }
          return (
            <button key={o.l} type="button" disabled={gekozen !== null} onClick={() => kies(o.v)}
              className={`px-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${stijl}`}>{o.l}</button>
          );
        })}
      </div>
      {gekozen !== null && (
        <div className="mt-4">
          <div className={`rounded-xl p-3 text-sm ${gekozen === opgave.feit ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
            {opgave.uitleg}
          </div>
          <div className="flex justify-end mt-3">
            <button type="button" onClick={volgende} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">
              {index < SUPPLEMENTEN.length - 1 ? 'Volgende' : 'Resultaat'}
            </button>
          </div>
        </div>
      )}
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

export default function VoedingLab({ graad = 2 }) {
  return (
    <div className="space-y-6">
      <Sectie
        tool={<Bordbouwer />}
        info={(
          <div className="flex flex-col gap-4 h-full">
            <InfoKader titel="De voedingsdriehoek">
              <p>Eet vooral uit de groene basis: <strong>groenten, fruit, volle granen en water</strong>. Hoe hoger in de driehoek (bewerkt, snoep), hoe minder je nodig hebt.</p>
              <p>"Regenboog op je bord" = variatie in voedingsstoffen.</p>
            </InfoKader>
            <InfoKader titel="Eten past bij de dag">
              <p><strong>Zware trainingsdag:</strong> meer koolhydraten (granen) — dat is je brandstof.</p>
              <p><strong>Rustdag:</strong> minder brandstof nodig, meer nadruk op groenten en herstel.</p>
              <p><strong>Rond een wedstrijd:</strong> koolhydraten vooraf voor energie, eiwitten nadien voor herstel.</p>
            </InfoKader>
          </div>
        )}
      />
      <Sectie
        tool={<HydratatieCheck />}
        info={(
          <InfoKader titel="Water: de beste sportdrank">
            <p>Voor de meeste jongeren is <strong>water</strong> de beste keuze. Je behoefte stijgt met hitte en inspanning.</p>
            <p>Dorst is een laat signaal — bij sport drink je best al vóór je dorst krijgt.</p>
            <p>Sportdranken met suikers en zouten hebben pas meerwaarde bij lange, intense inspanning (langer dan een uur).</p>
          </InfoKader>
        )}
      />

      {/* Maaltijd per sport → vanaf 2de graad (koppelt voeding aan sporttype) */}
      {graad >= 2 && (
        <Sectie
          tool={<MaaltijdPerSport />}
          info={(
            <InfoKader titel="Waarom sport de mix bepaalt">
              <p>Er bestaat geen "één ideaal bord". Wat je nodig hebt, hangt af van wat je vraagt van je lichaam.</p>
              <p><strong>Duursport</strong> leunt op koolhydraten (brandstof voor lange inspanning); <strong>krachtsport</strong> vraagt meer eiwit (spierherstel).</p>
              <p>Bij alle sporten blijven <strong>gezonde vetten</strong> nodig — voor hormonen, opname van vitamines en langdurige energie.</p>
              <p>De percentages zijn richtlijnen: variatie en genoeg eten blijven de basis.</p>
            </InfoKader>
          )}
        />
      )}

      {/* Energiebalans + RED-S → 3de graad (verdiepende sportvoedingsfysiologie) */}
      {graad >= 3 && (
        <Sectie
          tool={<EnergiebalansSim />}
          info={(
            <InfoKader titel="Energiebalans & RED-S">
              <p><strong>Energiebalans</strong> = inname (eten) min verbruik (rust + sport). Positief = overschot, negatief = tekort.</p>
              <p>Voor een sporter is de valkuil niet "te veel", maar <strong>te weinig</strong>: eet je structureel te weinig voor je trainingslast, dan ontstaat <strong>lage energiebeschikbaarheid (RED-S)</strong>.</p>
              <p>Het lichaam bespaart dan op herstel, botopbouw en hormonen. Gevolg: vermoeidheid, blessures, uitblijvende vooruitgang — bij zowel jongens als meisjes.</p>
              <p>De les: je gewicht sturen kan een bewuste keuze zijn (bv. een gewichtsklasse), maar altijd traag en met genoeg energie om te blijven presteren. Extreem eten — te veel óf te weinig — kost altijd.</p>
            </InfoKader>
          )}
        />
      )}

      {/* Supplementen = kritische sportvoeding → enkel 3de graad */}
      {graad >= 3 && (
        <Sectie
          tool={<SupplementenQuiz />}
          info={(
            <InfoKader titel="Supplementen kritisch bekeken">
              <p>De supplementenindustrie is groot en belooft veel. De realiteit: voor jongeren met gevarieerde voeding zijn de meeste supplementen <strong>overbodig</strong>.</p>
              <p>Sommige (zoals creatine of cafeïne) hebben bewezen effecten bij volwassen topsporters, maar worden bij jongeren afgeraden — het lichaam is nog in ontwikkeling.</p>
              <p>Let ook op: supplementen zijn nauwelijks gecontroleerd en kunnen verboden stoffen bevatten — een reëel dopingrisico.</p>
            </InfoKader>
          )}
        />
      )}
    </div>
  );
}
