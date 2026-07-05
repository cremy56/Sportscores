// src/data/sportbuddy/kennis.js
// De kennismodules van Sportbuddy, gegroepeerd in de vier kamers rond de buddy.
// Elke module: 3-5 uitlegkaartjes (kennisflow) → mini-quiz (3-4 vragen).
// Inhoud geoogst uit OOGST_KENNISLAGEN_SPORTBUDDY.md; per kaart een bron.
// XP-toekenning (quiz) gebeurt SERVER-SIDE — de correcte antwoorden hier zijn
// alleen voor de directe feedback in de UI; de handler hercontroleert.
// Dekkingsmatrix: Hart/Fysiek/Energie → I.8 · Voeding → I.3/I.4 ·
// Slaap → I.3/herstel · Mentaal → I.32-35 · Houding → I.5/I.6.

export const KAMERS = [
  { id: 'training', naam: 'De Zaal', emoji: '🏋️', kleur: 'from-orange-400 to-red-500',
    omschrijving: 'Training, fysiologie en je zes fysieke kenmerken.' },
  { id: 'voeding', naam: 'De Keuken', emoji: '🍽️', kleur: 'from-green-400 to-emerald-600',
    omschrijving: 'Voeding voor de sporter: bouwstoffen, timing en fabels.' },
  { id: 'herstel', naam: 'De Rustkamer', emoji: '😴', kleur: 'from-sky-400 to-indigo-500',
    omschrijving: 'Hart, slaap en herstel — waar je sterker wordt.' },
  { id: 'mentaal', naam: 'De Coachruimte', emoji: '🧠', kleur: 'from-purple-400 to-fuchsia-600',
    omschrijving: 'Mentale kracht, houding en waar je hulp vindt.' },
];

export const MODULES = [
  // ══════════════════ KAMER: DE RUSTKAMER (herstel) ══════════════════
  {
    id: 'hart', kamer: 'herstel', naam: 'Hartfrequentie', emoji: '❤️',
    eindterm: 'I.8', beschikbaar: true,
    intro: 'Je hart is de motor van elke sporter. Leer zijn taal lezen.',
    kaarten: [
      { titel: 'De rustpols', tekst: 'Je rustpols is je hartslag in volledige rust. Een lágere rustpols betekent meestal een betere conditie: het hart pompt per slag meer bloed rond. Topsporters zitten vaak tussen 40 en 60 slagen per minuut.', bron: 'Gezond Sporten Vlaanderen' },
      { titel: 'Maximale hartslag', tekst: 'Je maximale hartslag schat je met de vuistregel 220 − leeftijd. Voor een 15-jarige is dat ongeveer 205 slagen per minuut. Het is een schatting: erfelijkheid zorgt voor verschillen tussen mensen.', bron: 'Gezond Sporten Vlaanderen' },
      { titel: 'Trainingszones', tekst: 'Tussen rust en maximum liggen zones. Voor het opbouwen van conditie train je meestal tussen 60% en 80% van je maximale hartslag — intensief genoeg om te prikkelen, rustig genoeg om vol te houden.', bron: 'Gezond Sporten Vlaanderen' },
      { titel: 'Waarom je pols schommelt', tekst: 'Stress, cafeïne, slaaptekort, hitte en koorts jagen je hartslag omhoog. Na een zware training blijft je rustpols zelfs 12 tot 24 uur verhoogd — je zenuwstelsel herstelt dan nog van de inspanning.', bron: 'Gezond Sporten Vlaanderen' },
    ],
    quiz: [
      { vraag: 'Wat betekent een lage rustpols meestal?', opties: ['Een slechte conditie', 'Een goede conditie', 'Uitdroging'], juist: 1 },
      { vraag: 'Hoe schat je je maximale hartslag?', opties: ['220 − leeftijd', 'leeftijd × 2', '200 + gewicht'], juist: 0 },
      { vraag: 'In welke zone bouw je vooral conditie op?', opties: ['20-40% van max', '60-80% van max', '95-100% van max'], juist: 1 },
      { vraag: 'Waarom ligt je rustpols hoger de dag na een zware training?', opties: ['Je hart is beschadigd', 'Je zenuwstelsel herstelt nog', 'Je drinkt te veel'], juist: 1 },
    ],
  },
  {
    id: 'slaap', kamer: 'herstel', naam: 'Slaap & herstel', emoji: '😴',
    eindterm: 'I.3', beschikbaar: true,
    intro: 'Je wordt niet sterker tíjdens de training, maar erna — vooral in je slaap.',
    kaarten: [
      { titel: 'Hoeveel slaap?', tekst: 'Tieners hebben 8 tot 10 uur slaap per nacht nodig — meer dan volwassenen. Tijdens de slaap verwerken je hersenen wat je leerde en herstelt je lichaam van de dag.', bron: 'Gezond Leven' },
      { titel: 'Groeien in je slaap', tekst: 'Je lichaam herstelt en groeit vooral tijdens de diepe slaap. Groeihormonen — die spieren herstellen en opbouwen — worden \'s nachts het sterkst aangemaakt. Slecht slapen = slecht herstellen.', bron: 'Gezond Leven' },
      { titel: 'Blauw licht', tekst: 'Schermen zenden blauw licht uit dat de aanmaak van melatonine (je slaaphormoon) afremt. Je lichaam "denkt" dat het nog dag is. Leg schermen daarom ongeveer een uur voor het slapengaan weg.', bron: 'Gezond Leven' },
      { titel: 'Slaaptekort en sport', tekst: 'Eén korte nacht verhoogt je rustpols met 2 tot 7 slagen, vertraagt je reactietijd en verhoogt je blessurekans. Slaap is dus geen luxe maar een deel van je training.', bron: 'Gezond Sporten Vlaanderen' },
    ],
    quiz: [
      { vraag: 'Hoeveel slaap heeft een tiener nodig?', opties: ['6-7 uur', '8-10 uur', '11-12 uur'], juist: 1 },
      { vraag: 'Wanneer maakt je lichaam vooral groeihormoon aan?', opties: ['Tijdens het sporten', '\'s Nachts in diepe slaap', 'Vlak na het eten'], juist: 1 },
      { vraag: 'Wat doet blauw licht van schermen?', opties: ['Het remt melatonine af', 'Het helpt je inslapen', 'Het heeft geen effect'], juist: 0 },
      { vraag: 'Wat doet één korte nacht met je lichaam?', opties: ['Niets bijzonders', 'Rustpols en blessurekans stijgen', 'Je wordt sterker'], juist: 1 },
    ],
  },
  // ══════════════════ KAMER: DE ZAAL (training) ══════════════════
  {
    id: 'energie', kamer: 'training', naam: 'Energiesystemen', emoji: '⚡',
    eindterm: 'I.8', beschikbaar: true,
    intro: 'Sprinten of een uur fietsen? Je lichaam kiest telkens een andere energiebron.',
    kaarten: [
      { titel: 'Twee soorten energie', tekst: 'Je spieren maken energie op twee manieren: mét zuurstof (aeroob) voor lange, rustige inspanningen, en zónder zuurstof (anaeroob) voor korte, explosieve inspanningen. Elke sport mengt beide.', bron: 'Leerplan Sportwetenschappen' },
      { titel: 'Het aerobe systeem', tekst: 'Bij duurinspanningen — joggen, fietsen, een wedstrijd uitlopen — werkt je lichaam aeroob. Het verbrandt vetten en koolhydraten mét zuurstof. Traag maar bijna onuitputtelijk: hierop steunt je uithouding.', bron: 'Leerplan Sportwetenschappen' },
      { titel: 'Het anaerobe systeem', tekst: 'Voor een sprint of een sprong heb je onmiddellijk veel energie nodig. Dan werkt je lichaam anaeroob, zonder zuurstof. Krachtig maar kort: na enkele tientallen seconden is de voorraad op en ontstaat er melkzuur.', bron: 'Leerplan Sportwetenschappen' },
      { titel: 'Voetbal: een mengeling', tekst: 'Voetbal wisselt voortdurend: rustig traven (aeroob) afgewisseld met korte sprints en duels (anaeroob). Daarom trainen voetballers zowel hun uithouding als hun explosiviteit — intervaltraining doet net dat.', bron: 'Leerplan Sportwetenschappen' },
    ],
    quiz: [
      { vraag: 'Welk systeem gebruik je voor een lange duurloop?', opties: ['Aeroob (mét zuurstof)', 'Anaeroob (zonder zuurstof)'], juist: 0 },
      { vraag: 'Wat ontstaat er bij langdurige anaerobe inspanning?', opties: ['Zuurstof', 'Melkzuur', 'Vet'], juist: 1 },
      { vraag: 'Waarom traint een voetballer beide systemen?', opties: ['Voetbal mengt duur en sprints', 'Alleen voor de show', 'Dat hoeft niet'], juist: 0 },
      { vraag: 'Welke training combineert rustig en explosief?', opties: ['Enkel wandelen', 'Intervaltraining', 'Stilstaan'], juist: 1 },
    ],
  },
  {
    id: 'fysiek', kamer: 'training', naam: 'Fysiek & KLUSCE', emoji: '💪',
    eindterm: 'I.7, I.8, I.11', beschikbaar: false,
    intro: 'Binnenkort: je zes fysieke kenmerken, bewegingsnormen en doelen stellen.',
    kaarten: [], quiz: [],
  },
  // ══════════════════ KAMER: DE KEUKEN (voeding) ══════════════════
  {
    id: 'voeding', kamer: 'voeding', naam: 'Voeding voor de sporter', emoji: '🍽️',
    eindterm: 'I.3, I.4', beschikbaar: true,
    intro: 'Wat je eet, wordt wie je bent op het veld. Leer de bouwstoffen kennen.',
    kaarten: [
      { titel: 'De voedingsdriehoek', tekst: 'Eet vooral uit de onderste, groene lagen: groenten, fruit, volle granen en water. Hoe hoger in de driehoek (bewerkte producten, snoep), hoe minder je lichaam ervan nodig heeft. "Regenboog op je bord" = variatie in voedingsstoffen.', bron: 'Gezond Leven' },
      { titel: 'Koolhydraten: de brandstof', tekst: 'Volle granen, pasta, rijst en aardappelen leveren langdurige energie. Voor een sporter zijn ze de belangrijkste brandstof — zeker rond zware trainingen. Kies volkoren: die geeft trager en langer energie.', bron: 'Gezond Leven' },
      { titel: 'Eiwitten: de bouwstenen', tekst: 'Eiwitten uit vlees, vis, eieren, bonen en noten herstellen en bouwen je spieren op. Na een krachttraining helpen ze je spieren sterker terug te komen. Wissel dierlijke en plantaardige bronnen af.', bron: 'Gezond Leven' },
      { titel: 'Timing rond training', tekst: 'Vóór een zware inspanning kies je koolhydraten voor energie; erna een combinatie van koolhydraten en eiwitten voor herstel. Op een rustdag heeft je lichaam minder brandstof nodig — luister naar wat de dag vraagt.', bron: 'Leerplan Sportwetenschappen' },
    ],
    quiz: [
      { vraag: 'Waaruit eet je volgens de voedingsdriehoek het meest?', opties: ['Snoep en frisdrank', 'Groenten, fruit, granen, water', 'Bewerkt vlees'], juist: 1 },
      { vraag: 'Wat is de belangrijkste brandstof van een sporter?', opties: ['Koolhydraten', 'Suikers uit snoep', 'Vetten alleen'], juist: 0 },
      { vraag: 'Wat helpt je spieren herstellen na krachttraining?', opties: ['Eiwitten', 'Frisdrank', 'Enkel water'], juist: 0 },
      { vraag: 'Wat eet je best ná een zware training?', opties: ['Niets', 'Koolhydraten + eiwitten', 'Alleen vet'], juist: 1 },
    ],
  },
  // ══════════════════ KAMER: DE COACHRUIMTE (mentaal) ══════════════════
  {
    id: 'mentaal', kamer: 'mentaal', naam: 'Mentale kracht', emoji: '🧠',
    eindterm: 'I.32-35', beschikbaar: false,
    intro: 'Binnenkort: omgaan met spanning, ademhalingsroutines en waar je hulp vindt.',
    kaarten: [], quiz: [],
  },
  {
    id: 'houding', kamer: 'mentaal', naam: 'Houding & rug', emoji: '🧍',
    eindterm: 'I.5, I.6', beschikbaar: false,
    intro: 'Binnenkort: goed tillen, gamer-houding en rughygiëne bij krachttraining.',
    kaarten: [], quiz: [],
  },
];

export function getModule(id) {
  return MODULES.find((m) => m.id === id) || null;
}
export function modulesVanKamer(kamerId) {
  return MODULES.filter((m) => m.kamer === kamerId);
}

// Welke modules hebben een eigen interactieve tool? (component gekoppeld in
// ModuleTool.jsx). Modules zonder tool tonen enkel de kennisflow + quiz.
export const MODULES_MET_TOOL = ['hart'];

