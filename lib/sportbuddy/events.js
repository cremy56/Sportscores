// lib/sportbuddy/events.js
// Het EVENT-DECK: situatie → 2-3 keuzes → gevolg in de simulatie → wetenschapskaart.
// Eerlijkheidsregels (beslist 5 jul 2026):
//   1. Elk event heeft een veilige uitweg — schade komt uit KEUZES, nooit uit pech.
//   2. Iedereen krijgt hetzelfde AANTAL events (2/week), alleen wélk event verschilt.
//   3. Blackout do+vr (48 u vóór de zaterdagmatch): events vallen op zo/ma/di/wo.
//   4. (fase 3) Seizoensklassement middelt de rest uit.
// Selectie is deterministisch geseed op uid+week: geen reroll mogelijk.
// Gevolgen leven UITSLUITEND server-side; de client krijgt alleen id+tekst.

import { hashString, maakRng } from './seed.js';

export const EVENTS = {
  feestje: {
    titel: 'Het feestje', emoji: '🎉',
    situatie: 'Vrijdagfeestje bij een klasgenoot! Iedereen gaat. Je buddy twijfelt: morgen is er training, en zaterdag nadert.',
    keuzes: [
      { id: 'laat', tekst: 'Blijven tot in de late uurtjes', gevolg: { vermoeidheid: 10, stress: 6 },
        gevolgTekst: 'Om 2u thuis. De volgende dag is je buddy een schim van zichzelf: traag, prikkelbaar, futloos.' },
      { id: 'energiedrank', tekst: 'Blijven én energiedrankjes drinken om wakker te blijven', gevolg: { vermoeidheid: 14, stress: 10 },
        gevolgTekst: 'De cafeïne maskeert de vermoeidheid even — maar je buddy slaapt nog slechter en zijn rustpols schiet omhoog.' },
      { id: 'vroeg', tekst: 'Even gaan, om 22u naar huis', gevolg: {},
        gevolgTekst: 'Het beste van twee werelden: plezier gehad én uitgeslapen. Je buddy staat fris op het trainingsveld.' },
    ],
    wetenschap: 'Slaaptekort vertraagt de reactietijd meetbaar en verstoort het herstel. Cafeïne blokkeert adenosinereceptoren: je vóélt de vermoeidheid niet meer, maar ze is er wel — en de hartslag stijgt 3-11 slagen gedurende 2-5 uur per drankje. Eén korte nacht kost een atleet tot 2 dagen topvorm.',
    eindtermen: 'I.2 — risicovol middelengebruik',
  },
  pijntje: {
    titel: 'Het pijntje', emoji: '🤕', blackoutGevoelig: true,
    situatie: 'Na de training voelt je buddy een stekende pijn aan de enkel. Niet dramatisch, maar ook niet niks.',
    keuzes: [
      { id: 'doorspelen', tekst: 'Negeren en gewoon doorgaan', gevolg: { blessure: { type: 'enkel', dagen: 5 }, vermoeidheid: 8 },
        gevolgTekst: 'De enkel zwelt op. Wat een dagje rust was geweest, is nu een blessure van een week.' },
      { id: 'laten_kijken', tekst: 'Laten bekijken en een dag rust nemen', gevolg: {},
        gevolgTekst: 'Verstandig: het blijkt een lichte overbelasting. Eén dagje rust en je buddy kan weer voluit.' },
      { id: 'tapen', tekst: 'Tapen en rustig verder trainen', gevolg: { vermoeidheid: 4 },
        gevolgTekst: 'Het gaat nét — maar je buddy compenseert en belast andere spieren. Op het randje.' },
    ],
    wetenschap: 'Pijn is informatie, geen zwakte. Vroege signalen van overbelasting negeren verandert microschade in echte blessures — en te vroeg hervatten verdubbelt het risico op herblessure. Regel: bij aanhoudende of scherpe pijn → stoppen, koelen, laten bekijken (denk aan RICE).',
    eindtermen: 'I.20 — eerste hulp & blessurepreventie',
  },
  examenstress: {
    titel: 'De toetsenweek', emoji: '📚',
    situatie: 'Volgende week vier toetsen. Je buddy voelt de druk stijgen en twijfelt of trainen er deze week nog in zit.',
    keuzes: [
      { id: 'alleen_blokken', tekst: 'Alle trainingen schrappen om te blokken', gevolg: { stress: 8 },
        gevolgTekst: 'Uren aan de bureau, maar het hoofd raakt vol. Zonder uitlaatklep stapelt de spanning zich op.' },
      { id: 'plannen', tekst: 'Plannen: blokken + korte trainingen behouden', gevolg: { stress: -5 },
        gevolgTekst: 'De korte trainingen maken het hoofd leeg. Je buddy blokt daarna geconcentreerder — planning wint.' },
      { id: 'negeren', tekst: 'Stress wegdrukken met een avondje gamen', gevolg: { stress: 3, vermoeidheid: 6 },
        gevolgTekst: 'Even weg van de boeken — maar de toetsen zijn er nog, en de nacht werd kort.' },
    ],
    wetenschap: 'Beweging is een van de best onderzochte stressverlagers: het verlaagt cortisol en verbetert focus en slaap. Tijdmanagement (grote taken opdelen, pauzes inplannen) houdt sporten haalbaar in drukke periodes — topsporters plannen hun studie zoals hun training.',
    eindtermen: 'I.3/I.4 — gezondheidsvaardigheden',
  },
  nietgoedinvel: {
    titel: 'Niet goed in zijn vel', emoji: '😔',
    situatie: 'Je buddy is al dagen stil. Op training loopt hij erbij zonder plezier, en hij ontwijkt zijn ploegmaats. Er zit hem duidelijk iets dwars.',
    keuzes: [
      { id: 'negeren', tekst: 'Het waait wel over — niets doen', gevolg: { stress: 8 },
        gevolgTekst: 'Het waait niet over. De knoop in de maag van je buddy wordt groter.' },
      { id: 'praten', tekst: 'Erover praten met een goede vriend', gevolg: { stress: -6 },
        gevolgTekst: 'Alleen al het uitspreken lucht op. Zijn vriend luistert écht — de wereld voelt meteen wat lichter.' },
      { id: 'hulp', tekst: 'Hulp zoeken bij iemand die ervoor opgeleid is', gevolg: { stress: -8 }, hulpwijzer: true,
        gevolgTekst: 'Sterke keuze. Praten met iemand die weet hoe te helpen is geen zwakte — het is precies wat kampioenen ook doen.' },
    ],
    wetenschap: 'Praten helpt — dat is geen dooddoener maar neurowetenschap: emoties benoemen dempt de stressrespons. En als het over jóú gaat in plaats van je buddy: het CLB op school, Awel (bel of chat via 102), 1712 (geweld) en de Zelfmoordlijn (1813) staan altijd klaar. Hulp zoeken is een vaardigheid, geen zwakte.',
    eindtermen: 'I.32-I.35 — weten waar je hulp vindt',
  },
  aanbod: {
    titel: 'Het aanbod', emoji: '💉', blackoutGevoelig: true,
    situatie: 'Een oudere speler bij de club neemt je buddy apart: "Ik heb iets dat écht werkt. Iedereen op niveau gebruikt het. Interesse?"',
    keuzes: [
      { id: 'aannemen', tekst: 'Aannemen — hij wil alles doen om beter te worden', gevolg: { stats: { K: 5, S: 3 }, stress: 8 },
        gevolgTekst: 'Het wérkt: je buddy voelt zich sterker dan ooit. Maar hij schrikt van elke dopingcontrole-geruchten, slaapt slechter... en dit is pas het begin.' },
      { id: 'weigeren', tekst: 'Vriendelijk weigeren', gevolg: {},
        gevolgTekst: 'Je buddy schudt het hoofd. Zijn vooruitgang zal trager gaan — maar hij is wel écht van hem.' },
      { id: 'melden', tekst: 'Weigeren én de trainer inlichten', gevolg: { stress: -3 },
        gevolgTekst: 'Moedig. De trainer pakt het discreet op. Je buddy slaapt met een gerust geweten — fair play begint bij jezelf.' },
    ],
    wetenschap: 'Eerlijk: doping wérkt op korte termijn — anders zou niemand het nemen. Maar de rekening volgt altijd: hormoonverstoring, hartschade, blessures door te snelle groei, schorsing, en de constante angst voor controles. Netto verlies je er als atleet altijd mee — nog vóór je erop betrapt wordt.',
    eindtermen: 'I.2 — korte- vs. langetermijngevolgen van middelengebruik',
  },
  gamemarathon: {
    titel: 'De gamemarathon', emoji: '📱',
    situatie: 'De nieuwe game is uit en de vriendengroep speelt vanavond samen. "Gewoon tot het volgende level," zegt iedereen. Morgen: training.',
    keuzes: [
      { id: 'doorgamen', tekst: 'Doorgaan tot 3u — dit level móét af', gevolg: { vermoeidheid: 12, stress: 5 },
        gevolgTekst: 'Level gehaald, nacht verloren. Het blauwe scherm hield zijn brein wakker tot lang na het uitzetten.' },
      { id: 'timer', tekst: 'Meespelen met een harde stop om 22u30', gevolg: {},
        gevolgTekst: 'Gespeeld, gelachen, en op tijd offline. Je buddy bewijst dat gamen en sporten prima samengaan — met een plan.' },
      { id: 'afspreken', tekst: 'Voorstellen om in het weekend verder te spelen', gevolg: { stress: -2 },
        gevolgTekst: 'De groep vindt het prima. Zaterdagavond na de match wordt het pas écht gezellig.' },
    ],
    wetenschap: 'Blauw licht van schermen remt melatonine, het slaaphormoon — je lichaam "denkt" dat het dag is. Gamen tot diep in de nacht combineert slaaptekort met mentale opwinding: dubbel slecht voor herstel en reactietijd. Vuistregel: schermen een uur voor bedtijd weg.',
    eindtermen: 'I.2 — verslavende handelingen',
  },
  groepsdruk_fiets: {
    titel: 'De kortere weg', emoji: '🚴',
    situatie: 'Na training rijdt de groep naar huis via de drukke steenweg — sneller, maar zonder fietspad. "Helm? Watje!" roept er eentje.',
    keuzes: [
      { id: 'meedoen', tekst: 'Meerijden zonder helm — erbij horen telt', gevolg: { stress: 4 },
        gevolgTekst: 'Het ging goed... deze keer. Maar je buddy voelde zich de hele rit ongemakkelijk tussen het razende verkeer.' },
      { id: 'eigen_route', tekst: 'Zelf de veilige route nemen, mét helm', gevolg: {},
        gevolgTekst: 'Vijf minuten langer onderweg, honderd procent heelhuids thuis. Je buddy heeft er geen seconde spijt van.' },
      { id: 'voorstellen', tekst: 'De groep overtuigen om samen de veilige route te nemen', gevolg: { stress: -2 },
        gevolgTekst: 'Tot zijn verrassing rijden er drie mee. Soms is de "watje" gewoon degene die eerst durft.' },
    ],
    wetenschap: 'Een fietshelm verlaagt het risico op ernstig hoofdletsel met ongeveer 60%. Groepsdruk is een van de sterkste gedragskrachten die er bestaan — dat wéten is de eerste stap om er zelf over te beslissen. Vermoeidheid na training vertraagt bovendien je reactietijd in het verkeer.',
    eindtermen: 'I.21 — veilig in het verkeer',
  },
  extra_training: {
    titel: 'De extra sessie', emoji: '💪',
    situatie: 'De trainer biedt een vrijwillige extra sessie aan: "Voor wie écht stappen wil zetten." Je buddy wil dolgraag — maar zijn lichaam heeft ook al een week achter de rug.',
    keuzes: [
      { id: 'voluit', tekst: 'Voluit meedoen — kansen grijp je', gevolg: { fitheid: 3, vermoeidheid: 10 },
        gevolgTekst: 'Topsessie! Maar de teller van deze week staat nu wel hoog. Herstel wordt cruciaal.' },
      { id: 'half', tekst: 'Meedoen maar bewust doseren', gevolg: { fitheid: 1.5, vermoeidheid: 5 },
        gevolgTekst: 'Slim gedoseerd: de prikkel meegepakt zonder de rekening te laten oplopen.' },
      { id: 'overslaan', tekst: 'Overslaan — het weekschema zit al vol', gevolg: {},
        gevolgTekst: 'Nee durven zeggen is ook trainen. Je buddy komt fris aan de start van de volgende sessie.' },
    ],
    wetenschap: 'Méér trainen is niet altijd béter trainen: de winst zit in de balans tussen belasting en herstel (supercompensatie). Topatleten zijn vooral top in luisteren naar hun lichaam — de beste beslissing hangt af van hoe vol je week al zit. Kijk naar je vorm- en vermoeidheidsmeter!',
    eindtermen: 'I.7/I.11 — trainen naar eigen ontwikkeling',
  },
};

const EVENT_IDS = Object.keys(EVENTS);
// Eventdagen: zo(7), ma(1), di(2), wo(3) — do/vr = blackout, za = matchdag
const EVENT_DAGEN = [7, 1, 2, 3];

// ISO-weeknummer (voor de week-seed)
function isoWeek(datumStr) {
  const d = new Date(`${datumStr}T12:00:00Z`);
  const doel = new Date(d);
  doel.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const jaarStart = new Date(Date.UTC(doel.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((doel - jaarStart) / 86400000 + 1) / 7);
  return `${doel.getUTCFullYear()}W${week}`;
}

// Bepaal deterministisch het event van vandaag voor deze leerling (of null).
// Regel 2: exact 2 events per week voor iedereen, op 2 geseede weekdagen.
export function eventVanVandaag(uid, datum, weekdag) {
  const week = isoWeek(datum);
  const rng = maakRng(hashString(`event_${uid}_${week}`));

  // Kies 2 verschillende eventdagen uit [zo, ma, di, wo]
  const dagen = [...EVENT_DAGEN];
  const dag1 = dagen.splice(Math.floor(rng() * dagen.length), 1)[0];
  const dag2 = dagen.splice(Math.floor(rng() * dagen.length), 1)[0];

  // Kies 2 verschillende events
  const ids = [...EVENT_IDS];
  const ev1 = ids.splice(Math.floor(rng() * ids.length), 1)[0];
  const ev2 = ids.splice(Math.floor(rng() * ids.length), 1)[0];

  let eventId = null;
  if (weekdag === dag1) eventId = ev1;
  if (weekdag === dag2) eventId = ev2;
  if (!eventId) return null;
  return { id: eventId, ...EVENTS[eventId] };
}

// Client-veilige weergave: GEEN gevolgen of wetenschap meesturen vóór de keuze
export function eventVoorClient(event) {
  if (!event) return null;
  return {
    id: event.id,
    titel: event.titel,
    emoji: event.emoji,
    situatie: event.situatie,
    keuzes: event.keuzes.map((k) => ({ id: k.id, tekst: k.tekst })),
  };
}
