// lib/sportbuddy/engine.js
// De simulatie-engine van Sportbuddy: het fitness-fatigue-model (Banister).
// PURE functies — geen Firestore, geen I/O. Daardoor testbaar met node en
// (indien ooit gewenst) herbruikbaar voor client-side previews.
//
// Kern: elke training verhoogt twee grootheden.
//   fitheid      — stijgt traag, zakt traag  (tijdsconstante ~42 dagen)
//   vermoeidheid — stijgt snel, zakt snel    (tijdsconstante ~7 dagen)
//   VORM = fitheid − vermoeidheid
// Daaruit volgen vanzelf: supercompensatie (rust ná belasting = winst),
// overtraining (stapelen zonder herstel), detraining (trage terugval bij
// stilstand — de buddy "sterft" nooit) en tapering (pieken naar een wedstrijd).
// Bron dagstaat-feiten: OOGST_KENNISLAGEN_SPORTBUDDY.md (rustpols/herstel).

import { TRAININGEN, VOEDING, SLAAP, WATER, MENTAAL } from './keuzes.js';

const TAU_FITHEID = 42;      // dagen
const TAU_VERMOEIDHEID = 7;  // dagen
const MAX_INHAAL_DAGEN = 120;

const klem = (x, min, max) => Math.min(max, Math.max(min, x));
const rond1 = (x) => Math.round(x * 10) / 10;

// ─── Afgeleide waarden (voor de dagstaat) ─────────────────────────────────────
export function afgeleiden(state) {
  const vorm = rond1(klem((state.fitheid || 0) - (state.vermoeidheid || 0), -50, 50));
  // Rustpols van de BUDDY: stijgt met vermoeidheid en stress.
  // Didactiek: "na zware training blijft de rustpols 12-24u verhoogd" (autonoom herstel).
  const rustpols = Math.round(52 + (state.vermoeidheid || 0) * 0.28 + (state.stress || 0) * 0.12);
  let blessurerisico = 'laag';
  if ((state.vermoeidheid || 0) > 55 || vorm < -12) blessurerisico = 'verhoogd';
  if ((state.vermoeidheid || 0) > 75 || vorm < -25) blessurerisico = 'hoog';
  return { vorm, rustpols, blessurerisico };
}

// ─── Detraining over n gemiste dagen (gesloten vorm) ──────────────────────────
export function vervalOverDagen(state, dagen) {
  const n = klem(Math.floor(dagen), 0, MAX_INHAAL_DAGEN);
  if (n <= 0) return { state, meldingen: [] };

  const nieuw = { ...state, stats: { ...state.stats } };
  nieuw.fitheid = rond1(nieuw.fitheid * Math.exp(-n / TAU_FITHEID));
  nieuw.vermoeidheid = rond1(nieuw.vermoeidheid * Math.exp(-n / TAU_VERMOEIDHEID));
  nieuw.stress = rond1(klem(nieuw.stress * Math.pow(0.95, n), 0, 100));

  const meldingen = [];
  // Vanaf ~1 week zonder training beginnen ook de fysieke kenmerken te zakken —
  // fysiologisch correcte terugval, geen straf (GDD: detraining als kernmechaniek).
  if (n > 7) {
    const detrainDagen = n - 7;
    for (const key of Object.keys(nieuw.stats)) {
      nieuw.stats[key] = rond1(klem(nieuw.stats[key] - detrainDagen * 0.3, 5, 100));
    }
    meldingen.push(`Je buddy heeft ${n} dagen niets gedaan: zijn conditie en kracht zijn wat weggezakt (detraining).`);
  } else if (n >= 2) {
    meldingen.push(`${n} dagen geen verzorging — de vermoeidheid zakte, maar de fitheid ook een beetje.`);
  }

  nieuw.seizoen = { ...nieuw.seizoen, dag: (nieuw.seizoen?.dag || 1) + n };
  return { state: nieuw, meldingen };
}

// ─── Eén verzorgde gamedag verwerken ──────────────────────────────────────────
// keuzes = { training, voeding, water, slaap, mentaal } — uitsluitend geldige IDs
// (validatie gebeurt in de handler vóór deze functie draait).
// opties.graad (1|2|3) stuurt de leeftijdsgebonden trainbaarheid: kracht is bij
// jonge tieners amper "bouwbaar" (prepuberale krachtwinst is vooral neuraal);
// pas in de 3de graad levert krachttraining volle spiergroei op.
const KRACHT_TRAINBAARHEID = { 1: 0.35, 2: 0.7, 3: 1.0 };

export function verwerkDag(state, keuzes, opties = {}) {
  const graad = opties.graad || 2;
  const training = TRAININGEN[keuzes.training];
  const voeding = VOEDING[keuzes.voeding];
  const slaap = SLAAP[keuzes.slaap];
  const water = WATER[keuzes.water];
  const mentaal = MENTAAL[keuzes.mentaal];

  const nieuw = { ...state, stats: { ...state.stats } };
  const meldingen = [];
  const belasting = training.belasting;

  // ── Voeding: het effect hangt af van de trainingsdag (didactiek!) ──────────
  let voedingsFactor = 1.0;
  if (voeding.type === 'fastfood') {
    voedingsFactor = 0.8;
    meldingen.push('Fastfood remt het herstel: veel verzadigd vet en zout, weinig bouwstoffen.');
  } else if (voeding.type === 'koolhydraatrijk') {
    voedingsFactor = belasting >= 50 ? 1.15 : 0.95;
    meldingen.push(belasting >= 50
      ? 'Slim: koolhydraten vullen de energievoorraad na een zware dag weer aan.'
      : 'Koolhydraatrijk eten op een rustdag is meer dan je buddy nodig heeft.');
  } else if (voeding.type === 'licht') {
    voedingsFactor = belasting >= 50 ? 0.85 : 1.1;
    if (belasting >= 50) meldingen.push('Te licht gegeten voor zo\'n zware dag: het herstel verloopt trager (energiebeschikbaarheid).');
  }

  // ── Slaap: dé herstelmotor ──────────────────────────────────────────────────
  const herstelFactor = klem(slaap.herstel * voedingsFactor, 0.55, 1.35);
  if (slaap.type === 'kort') {
    nieuw.stress = klem((nieuw.stress || 0) + 5, 0, 100);
    meldingen.push('Slaaptekort: de rustpols van je buddy ligt morgen 2-7 slagen hoger en het herstel hapert.');
  }

  // ── Banister-stap ───────────────────────────────────────────────────────────
  nieuw.fitheid = nieuw.fitheid * Math.exp(-1 / TAU_FITHEID) + belasting * 0.10;
  const nachtverval = klem(Math.exp(-1 / TAU_VERMOEIDHEID) / herstelFactor, 0.55, 0.98);
  nieuw.vermoeidheid = (nieuw.vermoeidheid + belasting * 0.2) * nachtverval;

  // ── Water ───────────────────────────────────────────────────────────────────
  if (water.type === 'weinig') {
    nieuw.vermoeidheid += 4;
    meldingen.push('Te weinig gedronken: dehydratatie laat de hartslag stijgen (koeling kost het lichaam moeite).');
  }

  // ── Stats groeien (met afnemende meeropbrengst; trage motor) ───────────────
  const { vorm: vormVoor } = afgeleiden(state);
  const overtraind = vormVoor < -20;
  for (const [statKey, gewicht] of Object.entries(training.focus)) {
    const huidig = nieuw.stats[statKey] || 0;
    const trainbaarheid = statKey === 'K' ? (KRACHT_TRAINBAARHEID[graad] || 0.7) : 1;
    const groei = belasting * 0.03 * gewicht * trainbaarheid * (1 - huidig / 100) * (overtraind ? 0.4 : 1);
    nieuw.stats[statKey] = rond1(klem(huidig + groei, 0, 100));
  }
  if (overtraind && belasting >= 50) {
    meldingen.push('Je buddy is overtraind (vorm diep negatief): zwaar trainen levert nu amper iets op en verhoogt het blessurerisico. Eerst herstellen!');
  }

  // ── Stress & mentaal ────────────────────────────────────────────────────────
  if (belasting >= 55) nieuw.stress = klem((nieuw.stress || 0) + 3, 0, 100);
  if (mentaal.stressverlaging) {
    nieuw.stress = klem((nieuw.stress || 0) - mentaal.stressverlaging, 0, 100);
    meldingen.push(mentaal.melding);
  }
  nieuw.stress = rond1(klem(nieuw.stress * 0.97, 0, 100));

  // ── Afronden & seizoen ──────────────────────────────────────────────────────
  nieuw.fitheid = rond1(klem(nieuw.fitheid, 0, 100));
  nieuw.vermoeidheid = rond1(klem(nieuw.vermoeidheid, 0, 100));
  nieuw.seizoen = { ...nieuw.seizoen, dag: (nieuw.seizoen?.dag || 1) + 1 };

  const na = afgeleiden(nieuw);
  if (belasting === 0 && vormVoor < 0) {
    meldingen.push('Rustdag op het juiste moment: de vermoeidheid zakt snel, de fitheid blijft — dat is supercompensatie.');
  }

  return { state: nieuw, meldingen, dagstaat: na };
}
