// src/components/sportbuddy/tools/SlaapLab.jsx
// Interactieve tool voor de module "Slaap & herstel" (id: slaap).
// SLAAPTEKORT-SIMULATOR: de leerling zet zeven nachten slaap voor de buddy en
// ziet live wat slaapschuld doet met herstel, rustpols, reactietijd en
// blessurekans — consistent met de Hartmodule (rustpols +2-7 bpm na slechte
// nacht) en met de fitness-fatigue-fysiologie van de engine.
//
// DATAVRIJ: alles blijft in React-state, niets wordt opgeslagen of verstuurd.
// De buddy wordt NIET gemuteerd — dit is een "wat-als"-labo op een fictief
// personage. Geen enkele gezondheidswaarde van de leerling zelf.
//
// GRAAD-DIFFERENTIATIE (buddy.weergave.graad → prop `graad`):
//   1ste graad: buddygezicht + basisgevolgen, taal op smiley-niveau.
//   2de graad:  + rustpols-meter en korte uitleg (rust vs. inspanning).
//   3de graad:  + supercompensatie-curve, herstelvormen-weging en
//               energiebeschikbaarheid ({graad >= 3 && …}).
// Leerplananker: BO1_07.03 (rust/inspanning, 1ste gr.) · BV2_01.02.01 &
//   BV2_01.04.02 (2de gr.) · WD3_13.01.05 / WD3_13.02.04 "vormen van herstel"
//   & BV3_01.02.01 beoordelen met wetenschappelijke inzichten (3de gr.).
//
// MARKER: SLAAPLAB_TOOL_V1

import { useMemo, useState } from 'react';

const NORM = { min: 8, max: 10, streef: 9 }; // tiener-slaapnorm (uur/nacht)
const DAGEN = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

// Herstelvormen voor de 3de-graads-weging ("vormen van herstel", WD3_13.01.05)
const HERSTELVORMEN = [
  { id: 'slaap', naam: 'Voldoende slaap', score: 5,
    uitleg: 'De krachtigste herstelvorm: groeihormoon, geheugenconsolidatie en autonoom herstel. Niets vervangt slaap.' },
  { id: 'voeding', naam: 'Herstelvoeding + vocht', score: 4,
    uitleg: 'Koolhydraten + eiwit binnen ~2 u en rehydrateren vullen de energievoorraden aan en starten spierherstel.' },
  { id: 'actief', naam: 'Actief herstel', score: 3,
    uitleg: 'Rustig bewegen (uitfietsen, wandelen) bevordert doorbloeding en afvoer van afvalstoffen — beter dan volledig stilliggen.' },
  { id: 'koeling', naam: 'Koudetherapie', score: 2,
    uitleg: 'Dempt acute spierpijn, maar remt op lange termijn deels de trainingsaanpassing. Nuttig rond wedstrijden, niet dagelijks.' },
  { id: 'energiedrank', naam: 'Energiedrank', score: 0,
    uitleg: 'Geen herstelvorm: cafeïne + suiker maskeren vermoeidheid en verstoren je slaap — het tegenovergestelde van herstel.' },
];

export default function SlaapLab({ graad = 2, buddy }) {
  const naam = buddy?.naam || 'je buddy';
  const [nachten, setNachten] = useState([9, 8, 7, 6, 7, 9, 8]);

  const gemiddeld = useMemo(
    () => nachten.reduce((a, b) => a + b, 0) / nachten.length,
    [nachten],
  );
  // Slaapschuld = som van de tekorten t.o.v. de streefnorm (afgekapt op 0)
  const schuld = useMemo(
    () => nachten.reduce((a, u) => a + Math.max(0, NORM.streef - u), 0),
    [nachten],
  );

  // Transparant, richtingvast model (dezelfde slaaptekort-modifier als de engine)
  const herstel = Math.max(20, 100 - Math.round(schuld * 7));       // % herstelcapaciteit
  const rustpols = Math.min(7, Math.round(schuld * 0.9));           // + bpm
  const reactie = Math.round(schuld * 4);                           // + ms
  const blessure = Math.min(70, 8 + Math.round(schuld * 5));        // % kans

  // Buddy-toestand voor het gezicht: 0 = fris, 1 = moe
  const moeheid = Math.min(1, schuld / 18);

  const zetNacht = (i, val) =>
    setNachten((prev) => prev.map((u, idx) => (idx === i ? Number(val) : u)));

  const oordeel =
    schuld === 0
      ? { txt: `${naam} haalt de norm elke nacht — top hersteld!`, kleur: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' }
      : schuld <= 5
      ? { txt: 'Lichte slaapschuld — inhaalbaar, maar niet ideaal.', kleur: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' }
      : { txt: 'Serieuze slaapschuld — dit vreet aan het herstel en verhoogt de blessurekans.', kleur: 'text-red-700', bg: 'bg-red-50 border-red-200' };

  return (
    <div className="space-y-5">
      {/* Kop */}
      <div className="text-center">
        <div className="text-4xl mb-1">😴</div>
        <h4 className="font-bold text-gray-800">Slaaptekort-simulator</h4>
        <p className="text-sm text-gray-500">
          Zet zeven nachten voor {naam}. Je ziet meteen wat te weinig slaap doet.
        </p>
        <p className="text-xs text-gray-400 mt-1">Niets wordt bewaard — sluit je het venster, dan is alles weg.</p>
      </div>

      {/* Schuifregelaars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        {nachten.map((u, i) => (
          <label key={i} className="flex items-center gap-3">
            <span className="w-8 text-sm font-medium text-gray-500">{DAGEN[i]}</span>
            <input
              type="range" min="4" max="12" step="0.5" value={u}
              onChange={(e) => zetNacht(i, e.target.value)}
              className="flex-grow accent-indigo-500"
              aria-label={`Uren slaap ${DAGEN[i]}`}
            />
            <span className="w-12 text-right text-sm tabular-nums text-gray-700">{u} u</span>
          </label>
        ))}
      </div>

      {/* Buddy-gezicht + balken */}
      <div className="flex flex-col sm:flex-row items-center gap-5 rounded-xl bg-slate-50 border border-slate-200 p-4">
        <BuddyGezicht moeheid={moeheid} />
        <div className="flex-grow w-full space-y-3">
          <Balk label="Gemiddelde slaap" waarde={`${gemiddeld.toFixed(1)} u`} pct={Math.min(100, (gemiddeld / NORM.max) * 100)} kleur="bg-indigo-500" />
          <Balk label="Herstelcapaciteit" waarde={`${herstel}%`} pct={herstel} kleur="bg-sky-500" />
          <p className="text-xs text-gray-400">Richtlijn voor jouw leeftijd: {NORM.min}–{NORM.max} u per nacht.</p>
        </div>
      </div>

      {/* Oordeel */}
      <div className={`rounded-xl border p-3 text-sm font-medium ${oordeel.bg} ${oordeel.kleur}`}>
        {oordeel.txt}
      </div>

      {/* Gevolgen — meters verschijnen per graad */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Meter label="Reactietijd" waarde={`+${reactie} ms`} slecht={reactie > 20} />
        <Meter label="Herstel" waarde={`${herstel}%`} slecht={herstel < 70} />
        {graad >= 2 && <Meter label="Rustpols" waarde={`+${rustpols} bpm`} slecht={rustpols >= 4} />}
        <Meter label="Blessurekans" waarde={`${blessure}%`} slecht={blessure > 25} />
      </div>

      {/* Wetenschapskaart — register verschilt per graad */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-gray-700">
        <p className="font-semibold text-gray-800 mb-1">Wat zegt de wetenschap?</p>
        {graad === 1 && (
          <p>
            Je lichaam herstelt en groeit vooral tijdens de diepe slaap. Tieners hebben
            {' '}{NORM.min}–{NORM.max} u nodig. Te weinig slaap = minder energie en trager
            reageren de dag erna.
          </p>
        )}
        {graad === 2 && (
          <p>
            Slaap is de belangrijkste vorm van rust in de verhouding rust–inspanning. Na een
            slechte nacht ligt de rustpols 2–7 bpm hoger: het autonome zenuwstelsel is nog niet
            hersteld. Stapelen van korte nachten bouwt slaapschuld op die de trainingsvorm
            ondermijnt.
          </p>
        )}
        {graad >= 3 && (
          <p>
            Slaap stuurt de aanmaak van groeihormoon en het herstel van het autonome zenuwstelsel
            (zichtbaar in HRV en rustpols). Chronische slaapschuld verlaagt de
            energiebeschikbaarheid en het herstelvermogen, verhoogt de blessurekans en remt
            supercompensatie — de winst die net ná de belasting hoort te komen.
          </p>
        )}
      </div>

      {/* 3de graad: supercompensatie-curve + herstelvormen-weging */}
      {graad >= 3 && (
        <div className="space-y-4">
          <SupercompensatieCurve schuld={schuld} />
          <Herstelweger />
        </div>
      )}
    </div>
  );
}

// --- Buddy-gezicht: schaalt van fris (0) naar moe (1) --------------------
function BuddyGezicht({ moeheid }) {
  // interpoleer wallen-opacity en mondkromming
  const wallen = (0.15 + moeheid * 0.6).toFixed(2);
  const mond = moeheid > 0.5 ? 'M50 100 q20 -8 40 0' : 'M50 98 q20 10 40 0'; // zuur ↔ blij
  const oog = moeheid > 0.5
    ? { l: 'M40 60 q10 8 20 0', r: 'M80 60 q10 8 20 0' }   // moe
    : { l: 'M42 58 a6 6 0 1 1 12 0', r: 'M86 58 a6 6 0 1 1 12 0' }; // wakker
  return (
    <svg width="120" height="120" viewBox="0 0 140 140" className="shrink-0" role="img" aria-label="Buddy-humeur">
      <circle cx="70" cy="70" r="56" fill="#fde68a" stroke="#f59e0b" strokeWidth="3" />
      <path d={oog.l} stroke="#78350f" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d={oog.r} stroke="#78350f" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M42 74 q8 5 16 0" stroke="#c2895a" strokeWidth="2" fill="none" opacity={wallen} />
      <path d="M82 74 q8 5 16 0" stroke="#c2895a" strokeWidth="2" fill="none" opacity={wallen} />
      <path d={mond} stroke="#78350f" strokeWidth="3" fill="none" strokeLinecap="round" />
      {moeheid > 0.4 && (
        <>
          <text x="116" y="34" fontSize="18" fill="#f59e0b" fontWeight="700">z</text>
          <text x="126" y="22" fontSize="13" fill="#f59e0b" fontWeight="700">z</text>
        </>
      )}
    </svg>
  );
}

function Balk({ label, waarde, pct, kleur }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span className="font-semibold tabular-nums">{waarde}</span>
      </div>
      <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-full ${kleur} transition-all`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
    </div>
  );
}

function Meter({ label, waarde, slecht }) {
  return (
    <div className={`rounded-xl border p-3 ${slecht ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${slecht ? 'text-red-700' : 'text-gray-800'}`}>{waarde}</div>
    </div>
  );
}

// --- 3de graad: supercompensatie-curve ------------------------------------
// Toont hoe de vorm na belasting boven het beginniveau uitkomt (supercompensatie)
// bij goede slaap, en die winst uitblijft/verdwijnt bij slaapschuld.
function SupercompensatieCurve({ schuld }) {
  const W = 440, H = 150, base = 100;
  // hoogte van de supercompensatie-piek daalt met de slaapschuld
  const winst = Math.max(0, 34 - schuld * 3);
  // curve: belasting (dip) → herstel → piek (base + winst) → terug naar base
  const y = (v) => H - 20 - (v - 60) * 1.2;
  const path =
    `M20 ${y(base)}` +
    ` C70 ${y(base)}, 80 ${y(base - 26)}, 120 ${y(base - 26)}` +   // dip door belasting
    ` C180 ${y(base - 26)}, 200 ${y(base + winst)}, 250 ${y(base + winst)}` + // herstel → piek
    ` C320 ${y(base + winst)}, 360 ${y(base)}, 420 ${y(base)}`;    // terug naar uitgangsniveau

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
      <p className="text-sm font-semibold text-violet-800 mb-2">Supercompensatie — wat slaapschuld kost</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Supercompensatiecurve">
        {/* uitgangsniveau */}
        <line x1="20" y1={y(base)} x2="420" y2={y(base)} stroke="#c4b5fd" strokeWidth="1" strokeDasharray="4 4" />
        <text x="424" y={y(base) + 4} fontSize="10" fill="#7c3aed">start</text>
        {/* piekniveau */}
        {winst > 0 && (
          <>
            <line x1="20" y1={y(base + winst)} x2="420" y2={y(base + winst)} stroke="#a78bfa" strokeWidth="1" strokeDasharray="2 5" opacity="0.6" />
            <text x="250" y={y(base + winst) - 6} fontSize="10" fill="#6d28d9" textAnchor="middle">supercompensatie</text>
          </>
        )}
        <path d={path} fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />
        <text x="120" y={y(base - 26) + 22} fontSize="10" fill="#7c3aed" textAnchor="middle">belasting</text>
      </svg>
      <p className="text-xs text-violet-700 mt-1">
        {winst > 20
          ? 'Goede slaap: de vorm piekt boven het startniveau — dáár word je sterker.'
          : winst > 0
          ? 'Door de slaapschuld blijft er nog maar weinig supercompensatie over.'
          : 'Bij deze slaapschuld verdwijnt de supercompensatie: je traint zonder winst en riskeert overbelasting.'}
      </p>
    </div>
  );
}

// --- 3de graad: herstelvormen wegen ("vormen van herstel") ----------------
function Herstelweger() {
  const [open, setOpen] = useState(null);
  const gesorteerd = [...HERSTELVORMEN].sort((a, b) => b.score - a.score);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-gray-800 mb-1">Vormen van herstel — hoe zwaar wegen ze?</p>
      <p className="text-xs text-gray-400 mb-3">Tik een vorm aan voor de wetenschappelijke uitleg.</p>
      <div className="space-y-2">
        {gesorteerd.map((v) => (
          <div key={v.id}>
            <button
              type="button"
              onClick={() => setOpen(open === v.id ? null : v.id)}
              className="w-full flex items-center gap-3 text-left"
            >
              <span className="w-28 shrink-0 text-sm text-gray-700">{v.naam}</span>
              <span className="flex-grow h-2.5 rounded-full bg-gray-100 overflow-hidden">
                <span className="block h-full bg-indigo-500" style={{ width: `${(v.score / 5) * 100}%` }} />
              </span>
              <span className="w-8 text-right text-xs tabular-nums text-gray-500">{v.score}/5</span>
            </button>
            {open === v.id && <p className="mt-1 ml-1 text-xs text-gray-600">{v.uitleg}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
