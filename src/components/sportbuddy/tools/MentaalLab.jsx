// src/components/sportbuddy/tools/MentaalLab.jsx
// Interactieve tool voor de module Mentale kracht (BV1_01.02.04 hulp · BV3_01.02.02 mentaal welbevinden; 1ste graad
// 1.15-1.19). Datavrij: alles gaat over het fictieve personage en algemene
// principes — geen stemming loggen, geen invoer over de leerling zelf (dit was
// het DPO-gevoeligste punt; opgelost door niets te bewaren).
//
// Graad-differentiatie (prop `graad`):
//   • 1-2: ademhalingstool + winst/verlies + Hulpwijzer (BV1_01.02.04 · BV1_01.09 fair-play)
//   • 3  : + Yerkes-Dodson-simulator (spanning↔prestatie, prestatiedruk — BV3_01.02.02)
//
// Delen:
//   1. Ademhalingstool (box breathing 4-4-4-4) — live, niets bewaard.
//   2. Omgaan met winst & verlies — sportieve reacties herkennen (BV1_01.09 fair-play).
//   3. Yerkes-Dodson-simulator (3de graad) — de omgekeerde U van spanning.
//   4. Hulpwijzer — waar vind je echte hulp (BV1_01.02.04 · BV2_01.02.03).

import { useState, useEffect, useRef, useMemo } from 'react';
import ClutchShot from './ClutchShot';

// ─── 1. Ademhalingstool (box breathing) ───────────────────────────────────────
const FASES = [
  { id: 'in', label: 'Adem in', duur: 4, kleur: '#3b82f6' },
  { id: 'vast1', label: 'Houd vast', duur: 4, kleur: '#8b5cf6' },
  { id: 'uit', label: 'Adem uit', duur: 4, kleur: '#22c55e' },
  { id: 'vast2', label: 'Houd vast', duur: 4, kleur: '#8b5cf6' },
];

function Ademtool() {
  const [actief, setActief] = useState(false);
  const [faseIndex, setFaseIndex] = useState(0);
  const [seconde, setSeconde] = useState(0);
  const [rondes, setRondes] = useState(0);
  const timerRef = useRef(null);

  const fase = FASES[faseIndex];

  useEffect(() => {
    if (!actief) return undefined;
    timerRef.current = setInterval(() => {
      setSeconde((s) => {
        if (s + 1 >= fase.duur) {
          setFaseIndex((fi) => {
            const volgende = (fi + 1) % FASES.length;
            if (volgende === 0) setRondes((r) => r + 1);
            return volgende;
          });
          return 0;
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [actief, fase.duur]);

  const start = () => { setActief(true); setFaseIndex(0); setSeconde(0); };
  const stop = () => { setActief(false); setFaseIndex(0); setSeconde(0); setRondes(0); };

  // Cirkelgrootte: groeit bij inademen, krimpt bij uitademen, blijft bij vasthouden
  const voortgang = (seconde + 1) / fase.duur;
  const schaal = fase.id === 'in' ? 0.6 + 0.4 * voortgang
    : fase.id === 'uit' ? 1.0 - 0.4 * voortgang
    : fase.id === 'vast1' ? 1.0 : 0.6;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="font-bold text-gray-800 mb-1">Ademhalingsoefening</h3>
      <p className="text-xs text-gray-500 mb-4">"Box breathing": adem in vier gelijke tellen. Sporters gebruiken dit om vlak vóór een wedstrijd rustig te worden. Volg de cirkel.</p>

      <div className="flex flex-col items-center py-4">
        <div className="relative w-44 h-44 flex items-center justify-center mb-4">
          <div
            className="absolute rounded-full transition-all duration-1000 ease-linear"
            style={{
              width: `${schaal * 100}%`, height: `${schaal * 100}%`,
              backgroundColor: `${fase.kleur}22`, border: `3px solid ${fase.kleur}`,
            }}
          />
          <div className="relative text-center">
            <div className="text-lg font-bold" style={{ color: fase.kleur }}>{actief ? fase.label : 'Klaar?'}</div>
            {actief && <div className="text-3xl font-bold text-gray-700 tabular-nums">{fase.duur - seconde}</div>}
          </div>
        </div>

        {actief && <p className="text-xs text-gray-400 mb-3">Ronde {rondes + 1}</p>}

        {!actief ? (
          <button type="button" onClick={start} className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold">Start</button>
        ) : (
          <button type="button" onClick={stop} className="text-gray-500 font-semibold border border-gray-300 rounded-xl px-6 py-2">Stop</button>
        )}
      </div>
    </div>
  );
}

// ─── 2. Omgaan met winst & verlies (BV1_01.09 fair-play) ──────────────────────
const SITUATIES = [
  {
    situatie: 'Je buddy verliest een belangrijke wedstrijd door een eigen fout.',
    opties: [
      { tekst: 'De scheidsrechter en het veld de schuld geven', goed: false, uitleg: 'Anderen de schuld geven helpt niet leren. Fouten horen bij sport — ervan leren is de sportieve reactie.' },
      { tekst: 'De fout erkennen en bedenken wat hij volgende keer anders doet', goed: true, uitleg: 'Sterk! Een fout erkennen en er een leerpunt van maken is precies wat kampioenen doen. Verlies is feedback.' },
      { tekst: 'Stoppen met de sport want hij is toch niet goed genoeg', goed: false, uitleg: 'Eén nederlaag zegt niets over je toekomst. De besten verloren vaak — ze bleven doorgaan en leren.' },
    ],
  },
  {
    situatie: 'Je buddy wint ruim van een veel zwakkere tegenstander.',
    opties: [
      { tekst: 'De tegenstander uitlachen en opscheppen', goed: false, uitleg: 'Winnen met respect hoort bij sportiviteit. De tegenstander kleineren is geen echte overwinning.' },
      { tekst: 'De tegenstander bedanken en bescheiden blijven', goed: true, uitleg: 'Mooi. Respect tonen in de overwinning is even belangrijk als waardig verliezen — dat is sportieve wilsontplooiing.' },
      { tekst: 'Nu denken dat hij nooit meer kan verliezen', goed: false, uitleg: 'Overmoed is een valkuil. Elke tegenstander verdient je volle inzet en respect.' },
    ],
  },
  {
    situatie: 'Een ploegmaat van je buddy maakt een beslissende fout.',
    opties: [
      { tekst: 'Hem voor de hele ploeg afkraken', goed: false, uitleg: 'Een ploegmaat afbreken breekt het team. Iedereen maakt fouten — steun werkt beter dan kritiek.' },
      { tekst: 'Hem bemoedigen: "geeft niet, volgende keer beter"', goed: true, uitleg: 'Precies. Een team dat elkaar steunt na fouten wordt sterker. Zo geef je respectvolle feedback.' },
      { tekst: 'Voortaan nooit meer naar hem passen', goed: false, uitleg: 'Iemand uitsluiten na een fout schaadt het hele team. Vertrouwen herstel je door te blijven samenspelen.' },
    ],
  },
];

function WinstVerlies() {
  const [index, setIndex] = useState(0);
  const [gekozen, setGekozen] = useState(null);
  const [score, setScore] = useState(0);
  const [klaar, setKlaar] = useState(false);
  const opgave = SITUATIES[index];

  const kies = (i) => {
    if (gekozen !== null) return;
    setGekozen(i);
    if (opgave.opties[i].goed) setScore((s) => s + 1);
  };
  const volgende = () => {
    if (index < SITUATIES.length - 1) { setIndex(index + 1); setGekozen(null); }
    else setKlaar(true);
  };
  const opnieuw = () => { setIndex(0); setGekozen(null); setScore(0); setKlaar(false); };

  if (klaar) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
        <div className="text-4xl mb-2">{score === SITUATIES.length ? '🏆' : '💪'}</div>
        <p className="text-lg font-bold text-gray-800 mb-1">{score} / {SITUATIES.length} sportief</p>
        <p className="text-sm text-gray-500 mb-4">Winnen én verliezen horen bij sport. Hoe je ermee omgaat, maakt je een echte sporter.</p>
        <button type="button" onClick={opnieuw} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">Opnieuw</button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">Winst & verlies</h3>
        <span className="text-xs text-gray-400">{index + 1} / {SITUATIES.length}</span>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 mb-4"><p className="text-sm text-gray-700">{opgave.situatie}</p></div>
      <div className="space-y-2">
        {opgave.opties.map((o, i) => {
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
          <div className={`rounded-xl p-3 text-sm ${opgave.opties[gekozen].goed ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
            {opgave.opties[gekozen].uitleg}
          </div>
          <div className="flex justify-end mt-3">
            <button type="button" onClick={volgende} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">
              {index < SITUATIES.length - 1 ? 'Volgende' : 'Resultaat'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 3. Yerkes-Dodson-simulator (3de graad) ───────────────────────────────────
// De omgekeerde-U: prestatie stijgt met spanning tot een optimum en daalt daarna.
function YerkesDodson() {
  const [spanning, setSpanning] = useState(50); // 0..100

  // Omgekeerde U rond een optimum (~55%). Prestatie 0..100.
  const prestatie = useMemo(() => {
    const optimum = 55;
    const breedte = 32;
    const p = 100 * Math.exp(-Math.pow(spanning - optimum, 2) / (2 * breedte * breedte));
    return Math.round(p);
  }, [spanning]);

  const zone = spanning < 30 ? { label: 'Te weinig spanning', kleur: '#3b82f6', uitleg: 'Je buddy is te ontspannen, bijna ongeïnteresseerd. Zonder een beetje spanning komt hij niet tot scherpe prestaties — de "underarousal".' }
    : spanning <= 75 ? { label: 'Optimale spanning', kleur: '#22c55e', uitleg: 'De ideale zone: genoeg spanning om scherp en gefocust te zijn, niet zoveel dat het verlamt. Hier presteert je buddy op zijn best.' }
    : { label: 'Te veel spanning', kleur: '#ef4444', uitleg: 'Te veel spanning slaat om in stress: gespannen spieren, tunnelvisie, fouten. Dit heet "choking under pressure". Ademhaling en routines helpen om terug te zakken.' };

  // Curvegrafiek
  const W = 560, H = 200, PADL = 34, PADB = 28, PADT = 10, PADR = 10;
  const xVan = (s) => PADL + (s / 100) * (W - PADL - PADR);
  const yVan = (p) => PADT + (1 - p / 100) * (H - PADT - PADB);
  const curve = Array.from({ length: 51 }, (_, i) => {
    const s = i * 2;
    const p = 100 * Math.exp(-Math.pow(s - 55, 2) / (2 * 32 * 32));
    return `${xVan(s).toFixed(1)},${yVan(p).toFixed(1)}`;
  }).join(' ');

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="font-bold text-gray-800 mb-1">De wet van Yerkes-Dodson</h3>
      <p className="text-xs text-gray-500 mb-4">Spanning en prestatie vormen een omgekeerde U. Schuif de spanning en zie waar je buddy op zijn best presteert.</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Assen */}
        <line x1={PADL} y1={PADT} x2={PADL} y2={H - PADB} stroke="#e5e7eb" strokeWidth="1" />
        <line x1={PADL} y1={H - PADB} x2={W - PADR} y2={H - PADB} stroke="#e5e7eb" strokeWidth="1" />
        <text x={PADL - 6} y={PADT + 4} textAnchor="end" fontSize="9" fill="#94a3b8">hoog</text>
        <text x={PADL - 6} y={H - PADB} textAnchor="end" fontSize="9" fill="#94a3b8">laag</text>
        <text x={PADL} y={H - 6} textAnchor="start" fontSize="9" fill="#94a3b8">weinig spanning</text>
        <text x={W - PADR} y={H - 6} textAnchor="end" fontSize="9" fill="#94a3b8">veel spanning</text>
        <text x={PADL - 20} y={H / 2} textAnchor="middle" fontSize="9" fill="#94a3b8" transform={`rotate(-90 ${PADL - 20} ${H / 2})`}>prestatie</text>
        {/* Curve */}
        <polyline points={curve} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinejoin="round" />
        {/* Marker */}
        <line x1={xVan(spanning)} y1={PADT} x2={xVan(spanning)} y2={H - PADB} stroke={zone.kleur} strokeWidth="1.5" strokeDasharray="4 3" />
        <circle cx={xVan(spanning)} cy={yVan(prestatie)} r="6" fill={zone.kleur} stroke="#fff" strokeWidth="2" />
      </svg>

      <div className="grid grid-cols-2 gap-3 mt-2 mb-4 text-center">
        <div className="bg-gray-50 rounded-xl py-2">
          <div className="text-xl font-bold tabular-nums" style={{ color: zone.kleur }}>{spanning}%</div>
          <div className="text-[10px] text-gray-400">spanning</div>
        </div>
        <div className="bg-gray-50 rounded-xl py-2">
          <div className="text-xl font-bold text-gray-700 tabular-nums">{prestatie}</div>
          <div className="text-[10px] text-gray-400">prestatieniveau</div>
        </div>
      </div>

      <input type="range" min="0" max="100" value={spanning} onChange={(e) => setSpanning(+e.target.value)} className="w-full accent-purple-600 mb-4" />

      <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: `${zone.kleur}15`, color: zone.kleur }}>
        <strong>{zone.label}.</strong> {zone.uitleg}
      </div>
    </div>
  );
}

// ─── 4. Hulpwijzer ────────────────────────────────────────────────────────────
const HULPLIJNEN = [
  { naam: 'CLB van je school', info: 'via het secretariaat of je klastitularis' },
  { naam: 'Awel', info: 'bel 102 of chat via awel.be — voor álle vragen' },
  { naam: '1712', info: 'bij geweld of misbruik' },
  { naam: 'Zelfmoordlijn', info: 'bel 1813 — 24/7 bij acute nood' },
];

function Hulpwijzer() {
  return (
    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6">
      <h3 className="font-bold text-emerald-800 mb-1">🧭 De Hulpwijzer</h3>
      <p className="text-sm text-emerald-900 mb-4">Alles hierboven gaat over je fictieve buddy. Maar als het over <strong>jóú</strong> gaat en je zit ergens mee — dan is hulp vragen geen zwakte, maar net wat sterke mensen doen. Hier vind je echte hulp:</p>
      <ul className="space-y-2">
        {HULPLIJNEN.map((h) => (
          <li key={h.naam} className="flex items-start gap-2 text-sm text-emerald-900">
            <span className="text-emerald-500 mt-0.5">●</span>
            <span><span className="font-semibold">{h.naam}</span> — {h.info}</span>
          </li>
        ))}
      </ul>
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

export default function MentaalLab({ graad = 2 }) {
  return (
    <div className="space-y-6">
      <Sectie
        tool={<Ademtool />}
        info={(
          <div className="flex flex-col gap-4 h-full">
            <InfoKader titel="Waarom ademhaling werkt">
              <p>Bij spanning versnelt je ademhaling automatisch. Door bewust <strong>traag en diep</strong> te ademen, geef je je lichaam het signaal dat er geen gevaar is — je hartslag zakt en je wordt rustiger.</p>
              <p>Topsporters gebruiken dit vlak vóór een strafschop of start: enkele diepe ademhalingen brengen de focus terug.</p>
            </InfoKader>
            <InfoKader titel="Spanning versus ontspanning">
              <p>Een beetje spanning is nuttig — het maakt je scherp. Maar te veel spanning verlamt. Ademhaling, muziek, een vaste routine of even bewegen helpen om te <strong>ontspannen</strong> wanneer de spanning te hoog wordt.</p>
              <p>Leren schakelen tussen aan- en ontspanning is een vaardigheid die je kunt trainen — net als een spier.</p>
            </InfoKader>
          </div>
        )}
      />

      <Sectie
        tool={<WinstVerlies />}
        info={(
          <InfoKader titel="Sportief winnen én verliezen">
            <p>Verlies hoort bij sport. De vraag is niet óf je verliest, maar <strong>hoe je ermee omgaat</strong>: leer je eruit, of geef je anderen de schuld?</p>
            <p>Ook winnen vraagt sportiviteit: respect voor de tegenstander, bescheiden blijven.</p>
            <p>Dit heet <strong>sportieve wilsontplooiing</strong> — en het geldt net zo goed buiten het sportveld: omgaan met tegenslag is een levensvaardigheid.</p>
          </InfoKader>
        )}
      />

      {/* Yerkes-Dodson = verdiepende prestatiepsychologie → 3de graad */}
      {graad >= 3 && (
        <Sectie
          tool={<YerkesDodson />}
          info={(
            <InfoKader titel="De omgekeerde U verklaard">
              <p>De <strong>wet van Yerkes-Dodson</strong> (1908) beschrijft de relatie tussen spanning (arousal) en prestatie als een omgekeerde U.</p>
              <p>Te weinig spanning → je bent niet scherp genoeg. Te veel spanning → je verkrampt ("choking"). Ertussen ligt de <strong>optimale zone</strong>.</p>
              <p>Het optimum verschilt per taak: fijne, complexe taken (een vrije worp) vragen minder spanning; grove, krachtige taken (een tackle) verdragen meer.</p>
              <p>De praktische les: leer je spanning <em>reguleren</em> — opladen als je te vlak bent, ademhalen als je te gespannen bent.</p>
            </InfoKader>
          )}
        />
      )}

      {/* Toepassing: box breathing + Yerkes-Dodson samen in één sportmoment */}
      <Sectie
        tool={<ClutchShot graad={graad} />}
        info={(
          <div className="flex flex-col gap-4 h-full">
            <InfoKader titel="Van paniek naar flow">
              <p>Dit brengt alles samen: bij te veel spanning (Yerkes-Dodson, rode zone) faalt je fijne motoriek — je hand trilt, je richt mis.</p>
              <p>Met <strong>box breathing</strong> zak je terug naar de optimale zone. Het vizier wordt stil, de worp lukt.</p>
            </InfoKader>
            {graad >= 3 ? (
              <InfoKader titel="De biologie erachter">
                <p>Spanning activeert je <strong>sympathisch zenuwstelsel</strong>: adrenaline, hoge hartslag, tunnelvisie — nuttig om te vechten of vluchten, maar rampzalig voor precisie.</p>
                <p>Trage ademhaling stimuleert de <strong>nervus vagus</strong> en je <strong>parasympathisch zenuwstelsel</strong>: hartslag zakt, de fijne motoriek keert terug. Zo stuurt ademhaling rechtstreeks je prestatie.</p>
              </InfoKader>
            ) : (
              <InfoKader titel="Waarom je hand trilt">
                <p>Bij veel spanning maakt je lichaam adrenaline aan. Dat helpt om hard te lopen of te springen, maar maakt je handen net onrustig — slecht voor precies richten.</p>
                <p>Rustig ademen draait dat terug: je hartslag zakt en je krijgt de controle over je bewegingen terug.</p>
              </InfoKader>
            )}
          </div>
        )}
      />

      <Hulpwijzer />
    </div>
  );
}
