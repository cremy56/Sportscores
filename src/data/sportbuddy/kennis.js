// src/data/sportbuddy/kennis.js
// De kennismodules van Sportbuddy, gegroepeerd in de vier kamers rond de buddy.
// Elke module: 3-5 uitlegkaartjes (kennisflow) → mini-quiz (3-4 vragen).
// Inhoud geoogst uit OOGST_KENNISLAGEN_SPORTBUDDY.md; per kaart een bron.
// XP-toekenning (quiz) gebeurt SERVER-SIDE — de correcte antwoorden hier zijn
// alleen voor de directe feedback in de UI; de handler hercontroleert.
// Dekkingsmatrix: Hart/Fysiek/Energie → I.8 · Voeding → I.3/I.4 ·
// Slaap → I.3/herstel · Mentaal → I.32-35 · Houding → I.5/I.6.
//
// GRAAD-DIFFERENTIATIE (GDD §4 / MVP-plan): niet alle inhoud is voor iedereen.
//   • 1ste graad (minGraad 1): basis, herkennen, smiley-niveau
//   • 2de graad (minGraad 2): + meters en korte uitleg / vergelijken (I.3)
//   • 3de graad (minGraad 3): + diepe fysiologie (energiemetabolisme, lactaat,
//                             supplementen, curves) — Sportwetenschappen
// Een kaart/quizvraag zonder minGraad geldt vanaf graad 1. Een tool-sectie kan
// datzelfde `minGraad`-veld dragen (zie de tools). De helpers hieronder filteren
// op de graad van de leerling (afgeleid uit de klas, server-side meegestuurd).

export function voorGraad(items, graad) {
  return (items || []).filter((it) => (it.minGraad || 1) <= graad);
}

// Modules zichtbaar voor een bepaalde graad. Een module met `minGraad` is pas
// vanaf die graad zichtbaar (bv. energiesystemen: enkel 2de + 3de graad —
// energielevering is geen leerdoel in de 1ste graad).
export function modulesVoorGraad(modules, graad) {
  return (modules || []).filter((m) => (m.minGraad || 1) <= graad);
}

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
    eindterm: 'I.8', beschikbaar: true, minGraad: 2,
    intro: 'Sprinten of een uur fietsen? Je lichaam schakelt tussen drie energiesystemen.',
    kaarten: [
      { titel: 'Drie energiesystemen', minGraad: 2, tekst: 'Je spieren maken energie (ATP) via drie systemen: het ATP-PCr-systeem (direct en explosief, zonder zuurstof), de glycolyse (snel, zonder zuurstof, met lactaat) en het aerobe systeem (traag, mét zuurstof, bijna onuitputtelijk). Ze werken altijd samen.', bron: 'Leerplan Sportwetenschappen' },
      { titel: 'Explosief of duur?', minGraad: 1, tekst: 'Voor een korte, explosieve inspanning (sprint, sprong) gebruikt je lichaam een ander energiesysteem dan voor een lange duurinspanning (joggen, fietsen). Explosief put snel uit; duur hou je lang vol.', bron: 'Leerplan Sportwetenschappen' },
      { titel: 'ATP-PCr: direct & explosief', minGraad: 3, tekst: 'Voor een sprong, worp of korte sprint levert het ATP-PCr-systeem onmiddellijk energie uit creatinefosfaat in de spier. Geen zuurstof nodig, geen lactaat — maar de voorraad is na ongeveer 10 seconden op.', bron: 'Leerplan Sportwetenschappen' },
      { titel: 'Glycolyse: snel, met lactaat', minGraad: 3, tekst: 'Voor intense inspanningen van 10 seconden tot 2 minuten springt de glycolyse bij: ze verbrandt koolhydraten zonder zuurstof. Daarbij ontstaat lactaat (melkzuur). Dat brandende gevoel in je benen bij een all-out 400m? Dat is dit systeem op volle toeren.', bron: 'Leerplan Sportwetenschappen' },
      { titel: 'Aeroob: traag & onuitputtelijk', minGraad: 3, tekst: 'Bij duurinspanningen neemt na 1 à 2 minuten het aerobe systeem de bovenhand: het verbrandt vetten en koolhydraten mét zuurstof. Traag op gang, maar zuinig en bijna eindeloos — hierop steunt je uithouding.', bron: 'Leerplan Sportwetenschappen' },
      { titel: 'Voetbal: een mengeling', minGraad: 2, tekst: 'Voetbal wisselt voortdurend: rustig traven (aeroob) met explosieve sprints en duels (ATP-PCr en glycolyse) ertussen. Daarom trainen voetballers zowel hun uithouding als hun explosiviteit — intervaltraining doet precies dat.', bron: 'Leerplan Sportwetenschappen' },
    ],
    quiz: [
      { vraag: 'Hoeveel energiesystemen heeft je lichaam?', opties: ['Eén', 'Twee', 'Drie'], juist: 2 },
      { vraag: 'Welk systeem levert energie voor een korte, maximale sprong?', opties: ['ATP-PCr', 'Aeroob'], juist: 0 },
      { vraag: 'Bij welk systeem ontstaat lactaat?', opties: ['Het aerobe systeem', 'De glycolyse'], juist: 1 },
      { vraag: 'Welk systeem neemt de bovenhand bij een lange duurloop?', opties: ['ATP-PCr', 'Aeroob'], juist: 1 },
    ],
  },
  {
    id: 'fysiek', kamer: 'training', naam: 'Fysieke kenmerken', emoji: '💪',
    eindterm: 'BV_01.05/06 (KLUSCE)', beschikbaar: true,
    intro: 'Kracht, lenigheid, uithouding, snelheid, coördinatie en evenwicht — je zes fysieke kenmerken.',
    kaarten: [
      { titel: 'De zes KLUSCE-kenmerken', minGraad: 1, tekst: 'Je fysieke kunnen bestaat uit zes basiskenmerken: Kracht, Lenigheid, Uithouding, Snelheid, Coördinatie en Evenwicht — samen KLUSCE. Elke sport vraagt een eigen mix ervan.', bron: 'Leerplan Beweging & Sport' },
      { titel: 'Elk sport zijn mix', minGraad: 1, tekst: 'Een turner heeft veel lenigheid en evenwicht nodig, een sprinter vooral snelheid en kracht, een langeafstandsloper uithouding. Geen enkele sporter scoort overal maximaal — het gaat om de juiste combinatie voor jouw sport.', bron: 'Leerplan Beweging & Sport' },
      { titel: 'Je beweegprofiel lezen', minGraad: 2, tekst: 'In een radardiagram zie je je zes kenmerken in één oogopslag. De vorm toont je sterktes en groeikansen. Zo kun je je fysieke capaciteiten verklaren en gericht bijsturen.', bron: 'Leerplan Sportwetenschappen' },
      { titel: 'Trainbaar of aangeboren?', minGraad: 3, tekst: 'Uithouding en kracht zijn sterk trainbaar; snelheid is deels aangeboren (je spiervezeltype). Coördinatie leer je het best jong, kracht komt sterk op met de puberteit. Talent en training tellen samen.', bron: 'Trainingsleer' },
      { titel: 'Kenmerken ontwikkelen', minGraad: 3, tekst: 'Elk kenmerk vraagt eigen training: kracht via weerstand, uithouding via duurinspanning, lenigheid via rekken, coördinatie via gevarieerde beweging. Door je zwakkere kenmerken te trainen, onderbouw je bewust je beweegvoorkeuren.', bron: 'Leerplan Sportwetenschappen' },
    ],
    quiz: [
      { vraag: 'Waar staat KLUSCE voor?', opties: ['Zes fysieke basiskenmerken', 'Een sportmerk'], juist: 0 },
      { vraag: 'Welk kenmerk heeft een langeafstandsloper vooral nodig?', opties: ['Uithouding', 'Lenigheid'], juist: 0 },
      { vraag: 'Welk kenmerk is deels aangeboren?', opties: ['Uithouding', 'Snelheid'], juist: 1 },
      { vraag: 'Waarom is een beweegprofiel nuttig?', opties: ['Om gericht te trainen', 'Nergens voor'], juist: 0 },
    ],
  },
  // ══════════════════ KAMER: DE KEUKEN (voeding) ══════════════════
  {
    id: 'voeding', kamer: 'voeding', naam: 'Voeding voor de sporter', emoji: '🍽️',
    eindterm: 'I.3, I.4', beschikbaar: true,
    intro: 'Wat je eet, wordt wie je bent op het veld. Leer de bouwstoffen kennen.',
    kaarten: [
      { titel: 'De voedingsdriehoek', minGraad: 1, tekst: 'Eet vooral uit de onderste, groene lagen: groenten, fruit, volle granen en water. Hoe hoger in de driehoek (bewerkte producten, snoep), hoe minder je lichaam ervan nodig heeft. "Regenboog op je bord" = variatie in voedingsstoffen.', bron: 'Gezond Leven' },
      { titel: 'Koolhydraten: de brandstof', minGraad: 1, tekst: 'Volle granen, pasta, rijst en aardappelen leveren langdurige energie. Voor een sporter zijn ze de belangrijkste brandstof — zeker rond zware trainingen. Kies volkoren: die geeft trager en langer energie.', bron: 'Gezond Leven' },
      { titel: 'Eiwitten: de bouwstenen', minGraad: 1, tekst: 'Eiwitten uit vlees, vis, eieren, bonen en noten herstellen en bouwen je spieren op. Na een krachttraining helpen ze je spieren sterker terug te komen. Wissel dierlijke en plantaardige bronnen af.', bron: 'Gezond Leven' },
      { titel: 'Timing rond training', minGraad: 2, tekst: 'Vóór een zware inspanning kies je koolhydraten voor energie; erna een combinatie van koolhydraten en eiwitten voor herstel. Op een rustdag heeft je lichaam minder brandstof nodig — luister naar wat de dag vraagt.', bron: 'Leerplan Sportwetenschappen' },
      { titel: 'Supplementen: meestal overbodig', minGraad: 3, tekst: 'Met gevarieerde voeding heeft een jongere geen eiwitshakes of pillen nodig. Sommige supplementen werken bij volwassen topsporters, maar worden bij jongeren afgeraden — en ze zijn nauwelijks gecontroleerd, wat een dopingrisico geeft.', bron: 'Leerplan Sportwetenschappen' },
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
    eindterm: 'I.32-35, I.17', beschikbaar: true,
    intro: 'Sport speelt zich ook tussen de oren af. Leer omgaan met spanning, winst en verlies.',
    kaarten: [
      { titel: 'Spanning hoort erbij', minGraad: 1, tekst: 'Voor een wedstrijd zenuwachtig zijn is normaal — zelfs toppers hebben dat. Een beetje spanning maakt je scherp. Het wordt pas een probleem als de spanning zo groot wordt dat je verkrampt.', bron: 'Sportpsychologie' },
      { titel: 'Ademen om te ontspannen', minGraad: 1, tekst: 'Bij spanning gaat je ademhaling vanzelf sneller. Door bewust traag en diep te ademen, kalmeer je je lichaam: je hartslag zakt en je wordt rustiger. Vlak voor een start of strafschop helpt dat om je focus terug te vinden.', bron: 'Sportpsychologie' },
      { titel: 'Winnen én verliezen', minGraad: 1, tekst: 'Verlies hoort bij sport. Wie een fout maakt en ervan leert, wordt beter; wie anderen de schuld geeft, blijft steken. En winnen doe je met respect voor de tegenstander — dat is sportieve wilsontplooiing.', bron: 'Leerplan Beweging & Sport' },
      { titel: 'Spanning reguleren', minGraad: 2, tekst: 'Te weinig spanning maakt je slap, te veel verlamt je. De kunst is om je spanning te sturen: jezelf opladen als je te vlak bent, of ademhalen en een vaste routine gebruiken als je te gespannen bent. Dit kun je trainen, net als een spier.', bron: 'Sportpsychologie' },
      { titel: 'De wet van Yerkes-Dodson', minGraad: 3, tekst: 'Al in 1908 beschreven Yerkes en Dodson dat prestatie en spanning een omgekeerde U vormen: prestatie stijgt met spanning tot een optimum en daalt daarna weer. Fijne, complexe taken vragen minder spanning; grove krachttaken verdragen er meer.', bron: 'Yerkes & Dodson (1908)' },
      { titel: 'Waar vind je hulp?', minGraad: 1, tekst: 'Als het niet meer over je buddy gaat maar over jezelf, is hulp vragen geen zwakte. Je CLB, Awel (102), 1712 en de Zelfmoordlijn (1813) staan klaar. Weten waar je terechtkunt, is zelf al een sterke vaardigheid.', bron: 'CLB / Hulpwijzer' },
    ],
    quiz: [
      { vraag: 'Is een beetje spanning voor een wedstrijd normaal?', opties: ['Ja, het maakt je scherp', 'Nee, dat is altijd slecht'], juist: 0 },
      { vraag: 'Wat helpt om te ontspannen bij te veel spanning?', opties: ['Sneller ademen', 'Traag en diep ademen'], juist: 1 },
      { vraag: 'Wat is de sportieve reactie op een verlies?', opties: ['Anderen de schuld geven', 'Eruit leren voor de volgende keer'], juist: 1 },
      { vraag: 'Waar kun je terecht als je ergens mee zit?', opties: ['Bij niemand', 'Bij het CLB, Awel of 1813'], juist: 1 },
    ],
  },
  {
    id: 'houding', kamer: 'mentaal', naam: 'Houding & rug', emoji: '🧍',
    eindterm: 'BV1_01.02.01 · I.5 · I.6', beschikbaar: true,
    intro: 'Goed tillen, gezond zitten en je rug beschermen — vaardigheden voor het leven.',
    kaarten: [
      { titel: 'Til met je benen', minGraad: 1, tekst: 'Zak door de knieën, hou je rug recht en de last dicht tegen je lichaam. Je benen zijn veel sterker dan je rug. Tillen met een gebogen rug zet enorme druk op je onderrug en kan een hernia veroorzaken.', bron: 'BV1_01.02.01 · I.6 (manutentie)' },
      { titel: 'Statisch en dynamisch', minGraad: 1, tekst: 'Je houding telt zowel als je stilzit of -staat (statisch) als wanneer je beweegt, tilt of draait (dynamisch). Een goede houding in beide situaties beschermt je rug en nek.', bron: 'I.5 (statische/dynamische houding)' },
      { titel: 'Pas op voor "tech neck"', minGraad: 1, tekst: 'Urenlang met je hoofd voorover naar een laag scherm (smartphone, gamen) belast je nek zwaar. Hou je toestel omhoog, wissel regelmatig van houding en neem pauzes.', bron: 'BV1_01.02.01 (zitten) · I.5' },
      { titel: 'Draai met je voeten', minGraad: 2, tekst: 'Moet je een last verplaatsen én van richting veranderen? Draai dan met je voeten, niet door je romp te wringen. Zo blijft je wervelkolom recht en beschermd. Te zwaar? Vraag hulp of til in delen.', bron: 'BV1_01.02.01 (verplaatsen) · I.6' },
      { titel: 'De neutrale wervelkolom', minGraad: 3, tekst: 'Je ruggengraat heeft drie natuurlijke krommingen (een dubbele S). In die neutrale stand verdeelt hij de druk gelijk over de tussenwervelschijven. Sterke core-spieren houden je rug in die stand — daarom is core-stability zo belangrijk.', bron: 'I.6 (rughygiëne) · core-stability (I.8)' },
    ],
    quiz: [
      { vraag: 'Hoe til je een zware doos van de grond?', opties: ['Door de knieën, rug recht', 'Vooroverbuigen met gestrekte benen'], juist: 0 },
      { vraag: 'Waar hou je de last tijdens het tillen?', opties: ['Ver van je lichaam', 'Dicht tegen je lichaam'], juist: 1 },
      { vraag: 'Wat is "tech neck"?', opties: ['Nekbelasting door voorovergebogen schermgebruik', 'Een nieuwe sport'], juist: 0 },
      { vraag: 'Wat houdt je wervelkolom in de neutrale stand?', opties: ['Sterke core-spieren', 'Losse spieren'], juist: 0 },
    ],
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
export const MODULES_MET_TOOL = ['hart', 'slaap', 'energie', 'voeding', 'mentaal', 'fysiek', 'houding'];

