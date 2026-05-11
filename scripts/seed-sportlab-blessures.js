// scripts/seed-sportlab-blessures.js
// ─────────────────────────────────────────────────────────────────────────────
// Body Fixer — Algemene fitnessoefeningen voor niet-geblesseerde zones
//
// ⚠️  BELANGRIJK: Deze content geeft GEEN medisch advies en bevat
//     GEEN revalidatieoefeningen voor de geblesseerde zone.
//     De app toont uitsluitend algemene fitnessoefeningen voor
//     lichaamsdelen die de leerling WEL kan belasten.
//
//     Revalidatieoefeningen komen uitsluitend van de kinesist/arts
//     van de leerling. De leerling voert die in via het
//     "Kine-oefeningen" scherm.
//
// STRUCTUUR:
//   Per blessure:
//     - toegestane_zones: welke zones mag de leerling belasten
//     - verboden_zones: welke zones moet de leerling sparen
//     - info: algemene uitleg over de blessure (educatief, niet medisch)
//     - oefeningen per zone, verdeeld in 3 intensiteitsniveaus:
//         niveau_1: licht (week 1-2 na blessure — algemene fitheid bewaren)
//         niveau_2: matig (week 3-5 — kracht opbouwen in gezonde zones)
//         niveau_3: intensief (week 6+ — prestatie in gezonde zones)
//
//   De niveauverdeling gaat over de intensiteit van oefeningen
//   voor de GEZONDE zones, niet over het herstel van de blessure.
//
// Gebruik:
//   node scripts/seed-sportlab-blessures.js

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const oe = (naam, duur, uitleg, tip = null) => ({ naam, duur, uitleg, tip });

// ─── OEFENBIBLIOTHEEK PER ZONE EN NIVEAU ──────────────────────────────────────
// Niveau 1: licht — voor wie pas geblesseerd is of weinig uitgerust is
// Niveau 2: matig — normale trainingsintensiteit voor de gezonde zones
// Niveau 3: intensief — hogere uitdaging voor de gezonde zones
// Leeftijd 12-14j: lagere intensiteit dan 15-18j (groeischijven elders kwetsbaar)

const ZONES = {

    bovenlichaam: {
        label: 'Bovenlichaam',
        emoji: '💪',
        niveau_1: {
            omschrijving: 'Lichte activering — beweging bewaren',
            leeftijd_12_14: [
                oe('Muurpush-up', '2 × 10 herh.', 'Sta op armlengte van de muur, handpalmen op schouderhoogte. Buig gecontroleerd en duw terug. Rug recht.', 'Hoe verder van de muur, hoe zwaarder. Begin dicht bij.'),
                oe('Arm circles', '2 × 20 sec per richting', 'Armen zijwaarts gestrekt. Maak kleine cirkels naar voren, daarna naar achteren.', 'Goed voor doorbloeding en mobiliteit.'),
                oe('Schouderrol', '2 × 15 herh.', 'Rol schouders naar voren in een cirkel, daarna achterwaarts. Traag en gecontroleerd.', null),
            ],
            leeftijd_15_18: [
                oe('Muurpush-up', '3 × 12 herh.', 'Handen op muur schouderhoogte. Buig armen, neus naar muur, duw terug.', null),
                oe('Arm circles', '2 × 30 sec per richting', 'Armen zijwaarts. Cirkels klein naar groot.', null),
                oe('Y-W-T oefening (staand)', '2 × 10 herh.', 'Armen in Y-positie (schuin omhoog), houd 3 sec. Dan W (handen naast hoofd), dan T (horizontaal). Wissel.', 'Activeert schouderblad-spieren en houding.'),
            ],
        },
        niveau_2: {
            omschrijving: 'Normale trainingsintensiteit voor bovenlichaam',
            leeftijd_12_14: [
                oe('Kniepush-up', '3 × 10 herh.', 'Op handen en knieën. Borst naar grond, duw terug. Romp gespannen.', 'Heupen niet laten zakken — rechte lijn van knie tot schouder.'),
                oe('Superman', '3 × 10 herh.', 'Buiklig, armen gestrekt voor je. Til armen, borst en benen tegelijk op. Houd 2 sec.', 'Focus op aanspanning rug en bilspieren.'),
                oe('Tricep dips (stoel)', '2 × 10 herh.', 'Handen op stoel naast heupen. Schuif lichaam voor de stoel en laat zakken door armen te buigen. Duw terug.', 'Ellebogen naar achter, niet zijwaarts.'),
            ],
            leeftijd_15_18: [
                oe('Kniepush-up', '3 × 15 herh.', 'Op handen en knieën. Borst naar grond. Duw terug.', null),
                oe('Superman (met pauze)', '3 × 12 herh.', 'Buiklig. Armen + benen opheffen. Houd 3 sec. Laat zakken.', null),
                oe('Tricep dips (stoel)', '3 × 12 herh.', 'Dips op stoel. Gecontroleerd omlaag.', null),
                oe('Scapular push-up', '3 × 12 herh.', 'In plankpositie (of kniepush-up). Duw schouderbladen van mekaar zonder armen te buigen. Houd 2 sec.', 'Versterkt schouderblad-stabiliteit.'),
            ],
        },
        niveau_3: {
            omschrijving: 'Hogere uitdaging voor bovenlichaam',
            leeftijd_12_14: [
                oe('Kniepush-up (traag)', '3 × 12 herh.', '3 sec omlaag, 1 sec pauze, 2 sec omhoog. Traag tempo = hogere belasting.', 'Minder herhalingen zijn voldoende bij traag tempo.'),
                oe('Superman + twist', '3 × 8 herh. per kant', 'Buiklig. Hef op. Draai bovenlichaam licht naar links en rechts. Houd elke kant 2 sec.', null),
                oe('Wall handstand hold (tegen muur)', '2 × 15 sec', 'Handen op grond, benen omhoog naar muur. Houd positie. ENKEL als schouder en pols volledig vrij zijn.', 'Enkel uitvoeren als geen blessure aan schouder of pols.'),
            ],
            leeftijd_15_18: [
                oe('Volledige push-up', '4 × 12 herh.', 'Op handen en voeten. Borst naar grond. Duw terug. Rug recht.', null),
                oe('Pike push-up', '3 × 10 herh.', 'In omgekeerde V-positie. Buig armen zodat hoofd naar grond gaat. Duw terug.', 'Belast voornamelijk schouders.'),
                oe('Superman met weerstand', '4 × 10 herh.', 'Buiklig. Armen + benen opheffen. Houd 4 sec. Maximale aanspanning.', null),
            ],
        },
    },

    core: {
        label: 'Core / Romp',
        emoji: '🔥',
        niveau_1: {
            omschrijving: 'Lichte core-activering',
            leeftijd_12_14: [
                oe('Glute bridge', '2 × 12 herh.', 'Ruglig, knieën gebogen. Duw heupen omhoog. Houd 2 sec. Laat zakken.', 'Knijp bilspieren aan bovenaan.'),
                oe('Pelvic tilt', '2 × 15 herh.', 'Ruglig, knieën gebogen. Druk onderrug actief in de grond. Houd 5 sec. Ontspan.', 'Lichte maar effectieve core-activering.'),
                oe('Zittende core (stoel)', '2 × 10 herh.', 'Zit op stoel. Trek knieën afwisselend omhoog naar borst. Rug recht.', null),
            ],
            leeftijd_15_18: [
                oe('Glute bridge', '3 × 15 herh.', 'Ruglig. Hef heupen. Bilspieren aan. Houd 2 sec.', null),
                oe('Dead bug (armen)', '2 × 8 herh. per kant', 'Ruglig, benen in de lucht. Strek één arm achterover. Terug. Wissel. Benen bewegen niet.', 'Introductie dead bug — enkel armbewegingen.'),
                oe('Crunches', '3 × 15 herh.', 'Ruglig, knieën gebogen. Handen voor borst. Curl omhoog tot schouderbladen van grond zijn.', null),
            ],
        },
        niveau_2: {
            omschrijving: 'Normale core-training',
            leeftijd_12_14: [
                oe('Plank op knieën', '3 × 25 sec', 'Onderarmen en knieën. Rug recht. Buikspieren aanspannen.', 'Verhoog wekelijks met 5 sec.'),
                oe('Dead bug (volledig)', '3 × 8 herh. per kant', 'Ruglig. Armen omhoog, benen 90°. Strek arm + tegenovergesteld been. Onderrug in grond.', null),
                oe('Glute bridge (lang houden)', '3 × 3 × 10 sec', 'Hef heupen. Houd 10 sec. Bilspieren aanknijpen. Drie keer met korte pauze.', null),
            ],
            leeftijd_15_18: [
                oe('Plank (volledig)', '3 × 30 sec', 'Op onderarmen en voeten. Rug recht. Heupen niet zakken.', 'Verhoog wekelijks met 10 sec.'),
                oe('Dead bug (volledig)', '3 × 10 herh. per kant', 'Ruglig. Armen + tegenovergesteld been. Langzaam en gecontroleerd.', null),
                oe('Side plank', '3 × 20 sec per kant', 'Zijlig op onderarm. Hef heupen. Rechte lijn hoofd-voeten.', null),
                oe('Mountain climber (traag)', '3 × 20 herh.', 'In plankpositie. Trek knieën afwisselend naar borst. Traag tempo.', null),
            ],
        },
        niveau_3: {
            omschrijving: 'Intensieve core-training',
            leeftijd_12_14: [
                oe('Plank (volledig)', '3 × 30 sec', 'Op onderarmen en voeten.', null),
                oe('Side plank op knieën', '2 × 20 sec per kant', 'Zijlig op onderarm en gebogen knie. Hef heupen.', null),
                oe('Bicycle crunches', '3 × 20 herh.', 'Ruglig. Breng elleboog naar tegenovergestelde knie. Wisselend.', null),
            ],
            leeftijd_15_18: [
                oe('Plank + schoudertap', '3 × 20 taps', 'In plankpositie. Tik afwisselend tegenovergestelde schouder aan. Heupen stabiel.', null),
                oe('Side plank (lang)', '3 × 30 sec per kant', null, null),
                oe('Hollow body hold', '3 × 20 sec', 'Ruglig. Armen naast hoofd gestrekt. Til armen + benen van grond. Rug plat. Houd.', 'Geavanceerde core-activering.'),
                oe('Dragon flag (introductie)', '3 × 5 herh.', 'Ruglig, houd iets vast boven hoofd. Hef benen + romp langzaam op. Laat gecontroleerd zakken.', 'Enkel uitvoeren als plank 60 sec volledig stabiel gaat.'),
            ],
        },
    },

    onderlichaam: {
        label: 'Onderlichaam',
        emoji: '🦵',
        niveau_1: {
            omschrijving: 'Lichte onderlichaamsactivering',
            leeftijd_12_14: [
                oe('Mini squat (30°)', '2 × 12 herh.', 'Lichte kniebuiging tot 30°. Voeten schouderbreedte. Rug recht.', 'Lichte belasting — houd het comfortabel.'),
                oe('Kuitverheffingen (staand)', '2 × 15 herh.', 'Handen aan muur. Op tippentoe. Houd 1 sec. Laat zakken.', null),
                oe('Zijwaartse stap', '2 × 10 per kant', 'Kleine zijwaartse stappen op vlakke ondergrond. Voeten altijd op schouderbreedte.', null),
            ],
            leeftijd_15_18: [
                oe('Squat (licht, hoog)', '3 × 12 herh.', 'Voeten schouderbreedte. Zak licht door knieën (45°). Rug recht.', null),
                oe('Kuitverheffingen', '3 × 20 herh.', 'Op tippentoe. Houd 2 sec. Traag zakken.', null),
                oe('Balans op één been', '3 × 20 sec per been', 'Op één been. Focus op een punt. Stabiel blijven.', null),
            ],
        },
        niveau_2: {
            omschrijving: 'Normale onderlichaamsstraining',
            leeftijd_12_14: [
                oe('Squat (normaal, 90°)', '3 × 12 herh.', 'Voeten schouderbreedte. Zak tot 90°. Rug recht. Hielen op grond.', null),
                oe('Uitvalspas (lunge)', '3 × 8 herh. per been', 'Stap naar voren. Achterste knie richting grond. Terug. Wissel.', 'Handen op heupen.'),
                oe('Stap-up laag bankje', '3 × 10 herh. per been', 'Laag bankje (15-20cm). Stap op. Strek been. Stap af.', null),
            ],
            leeftijd_15_18: [
                oe('Squat (vol bereik)', '4 × 15 herh.', 'Voeten schouderbreedte. Volledig naar beneden. Rug recht.', null),
                oe('Uitvalspas (lunge)', '3 × 12 herh. per been', 'Diep naar beneden. Rug recht.', null),
                oe('Stap-up (hoger bankje)', '3 × 12 herh. per been', 'Bankje 30-40cm. Stap op. Strek been volledig. Stap gecontroleerd af.', null),
                oe('Glute bridge (één been)', '3 × 12 herh. per been', 'Ruglig. Hef heupen. Strek één been. Houd 2 sec.', null),
            ],
        },
        niveau_3: {
            omschrijving: 'Intensieve onderlichaamsstraining',
            leeftijd_12_14: [
                oe('Jump squat (licht)', '3 × 8 herh.', 'Squat en spring licht omhoog. Land zacht op beide voeten.', 'Enkel als beide voeten en knieën volledig vrij zijn van blessure.'),
                oe('Uitvalspas wandeling', '3 × 10 per been', 'Lunge-passen door de zaal — afwisselend vooruit.', null),
                oe('Kuitverheffing (één been)', '3 × 12 herh. per been', 'Op één been. Handen aan muur. Op tippentoe. Traag zakken.', null),
            ],
            leeftijd_15_18: [
                oe('Bulgarian split squat', '4 × 10 herh. per been', 'Voorste voet op grond, achterste voet op bankje. Zak diep. Rug recht.', 'Hoge functionele belasting.'),
                oe('Jump squat', '4 × 8 herh.', 'Explosieve sprong vanuit squat. Land zacht met gebogen knieën.', 'Enkel als geen blessure aan knie, enkel of voet.'),
                oe('Pistol squat (beginners)', '3 × 5 herh. per been', 'Sta op één been. Strek ander been voor je. Zak licht door standbeen.', 'Gebruik muur als steun. Uitdaging voor balans en kracht.'),
            ],
        },
    },

    mobiliteit: {
        label: 'Mobiliteit & Stretching',
        emoji: '🧘',
        niveau_1: {
            omschrijving: 'Basismobiliteit — elke dag nuttig',
            leeftijd_12_14: [
                oe('Cat-Cow', '3 × 10 herh.', 'Op handen en knieën. Maak holle rug (hoofd omhoog) en ronde rug (hoofd omlaag). Traag en vloeiend.', 'Wervelkolommobiliteit — veilig voor iedereen.'),
                oe('Heupbuiger stretch', '3 × 30 sec per kant', 'Halve knielstand. Duw heupen licht naar voren. Rek aan voorkant heup en bovenbeen.', null),
                oe('Schouder cross-body stretch', '3 × 30 sec per arm', 'Trek arm voor borst en houd vast met andere arm. Voel rek in schouder.', null),
            ],
            leeftijd_15_18: [
                oe('Cat-Cow', '3 × 15 herh.', null, null),
                oe('Heupbuiger stretch (diep)', '3 × 45 sec per kant', 'Halve knielstand diep. Duw heup naar voren. Arm van achterste been omhoog strekken.', null),
                oe('Thoracale rotatie (zijlig)', '3 × 10 herh. per kant', 'Zijlig, knieën gebogen 90°. Bovenste arm draaien naar achter. Schouder naar grond. Terug.', 'Middenrugmobiliteit — ondersteunt houding en kracht.'),
            ],
        },
        niveau_2: {
            omschrijving: 'Gerichte mobiliteit per zone',
            leeftijd_12_14: [
                oe('Quadriceps stretch (staand)', '3 × 30 sec per been', 'Sta op één been. Trek hak naar bil. Houd enkels vast. Muur voor steun.', 'Niet doen als knie geblesseerd is.'),
                oe('Hamstring stretch (ruglig)', '3 × 30 sec per been', 'Ruglig. Til been omhoog. Houd met handen. Strek knie zo recht als comfortabel.', 'Niet doen bij actieve hamstringblessure.'),
                oe('Heup 90-90 stretch', '3 × 45 sec per kant', 'Zit op grond. Beide knieën 90° gebogen, één voor en één naast je. Rechtop zitten. Wissel.', 'Heupflexibiliteit vanuit alle richtingen.'),
            ],
            leeftijd_15_18: [
                oe('Quadriceps stretch (liggend)', '3 × 45 sec per been', 'Buiklig. Trek hak naar bil. Houd enkels vast.', null),
                oe('Hamstring stretch (staand)', '3 × 45 sec per been', 'Sta. Strek één been voor je op verhoging. Leun licht voorover. Rug recht.', null),
                oe('Couch stretch (heupbuiger)', '3 × 45 sec per kant', 'Knie op grond, voet tegen muur omhoog. Romp recht. Diepe heupbuiger rek.', 'Een van de effectiefste heuprekken.'),
            ],
        },
        niveau_3: {
            omschrijving: 'Verdiepte mobiliteit en beweeglijkheid',
            leeftijd_12_14: [
                oe('Brede squat (sumo) + stretch', '3 × 45 sec', 'Brede voetstand, voeten uitgedraaid. Zak in gehurkte positie. Houd vast. Duw knieën naar buiten.', 'Diep lies- en heuprekkend.'),
                oe('Ruggever (backbend) aan muur', '3 × 20 sec', 'Sta voor muur. Handen hoog op muur. Buig licht achterover.', 'Lichte thoracale extensie.'),
            ],
            leeftijd_15_18: [
                oe('Brede squat + laterale stretch', '3 × 60 sec', 'Brede squat. Duw knieën uit. Neig dan naar één kant voor laterale rek.', null),
                oe('Pigeon pose', '3 × 60 sec per kant', 'Op de mat. Voorste been gebogen voor je. Achterste been gestrekt achter je. Leun voorover.', 'Diepe heup- en piriformis stretch.'),
                oe('Thoracale extensie op foam roller', '3 × 60 sec', 'Foam roller horizontaal onder middenrug. Laat ruggengraat over foam roller buigen. Armen voor hoofd.', null),
            ],
        },
    },

    armen: {
        label: 'Armen & Handen',
        emoji: '🤲',
        niveau_1: {
            omschrijving: 'Lichte armactivering',
            leeftijd_12_14: [
                oe('Bicep curl (zonder gewicht)', '2 × 15 herh.', 'Armen langs het lichaam. Buig ellebogen en breng handen naar schouders. Langzaam terug.', 'Geen gewicht — beweging bewaren.'),
                oe('Arm circles (alle richtingen)', '2 × 20 sec per richting', 'Klein, groot, naar voren, naar achter.', null),
            ],
            leeftijd_15_18: [
                oe('Bicep curl (licht)', '3 × 15 herh.', 'Kleine weerstand (waterfles, tas). Buig ellebogen. Traag omlaag.', null),
                oe('Tricep overhead stretch', '3 × 30 sec per arm', 'Til arm omhoog. Buig elleboog zodat hand achter hoofd hangt. Duw elleboog met andere hand naar achter.', 'Rek én lichte activering van tricep.'),
            ],
        },
        niveau_2: {
            omschrijving: 'Normale armtraining',
            leeftijd_12_14: [
                oe('Tricep dips (stoel)', '3 × 10 herh.', 'Op stoel. Handen naast heupen. Laat zakken door armen te buigen. Duw terug.', null),
                oe('Isometrische bicep curl (muur)', '3 × 20 sec', 'Druk onderarm omhoog tegen muur. Maximale spanning. Houd 20 sec.', null),
            ],
            leeftijd_15_18: [
                oe('Tricep dips (intensief)', '3 × 15 herh.', null, null),
                oe('Diamond push-up (kniepositie)', '3 × 10 herh.', 'Handen in diamantvorm onder borst. Kniepush-up positie. Borst naar handen.', 'Belast voornamelijk triceps.'),
            ],
        },
        niveau_3: {
            omschrijving: 'Intensieve armtraining',
            leeftijd_12_14: [
                oe('Tricep dips (uitgedaagd)', '3 × 12 herh.', 'Benen gestrekt — moeilijker dan gebogen knieën.', null),
            ],
            leeftijd_15_18: [
                oe('Diamond push-up (vol)', '4 × 12 herh.', 'Handen in diamantvorm. Volledige push-up positie.', null),
                oe('Pike push-up', '3 × 10 herh.', 'Omgekeerde V. Buig armen. Hoofd naar grond. Duw terug.', 'Voornamelijk schouders en triceps.'),
            ],
        },
    },
};

// ─── BLESSURE ZONES ───────────────────────────────────────────────────────────
// Definieert welke zones WEL en NIET mogen worden getraind per blessuretype.
// GEEN revalidatieoefeningen — uitsluitend info over de blessure en zone-toewijzing.

const BLESSURES = {

    enkel: {
        naam: 'Enkelblessure / Verzwikte enkel',
        emoji: '🦶',
        kleur: 'amber',
        info: {
            wat_is_het: 'Een enkelblessure ontstaat wanneer de banden rond de enkel uitrekken of scheuren door zwikken bij een sprong of verkeerde landing. Dit is de meest voorkomende sportblessure bij jongeren.',
            herkennen: 'Pijn aan de buiten- of binnenkant van de enkel, zwelling, mogelijk een blauwe plek, pijn bij steunen op de voet.',
            vermijden: 'Belast de enkel niet bij pijn. Gebruik het PEACE-principe: bescherm de enkel, houd hem omhoog, vermijd belasting.',
            wanneer_arts: 'Als je niet kunt steunen op de voet, als er een luid "knak"-geluid was, als de zwelling extreem is, of als de pijn na 72u niet afneemt.',
        },
        toegestane_zones: ['bovenlichaam', 'core', 'armen'],
        verboden_zones: ['onderlichaam'],
        opmerking_verboden: 'Oefeningen waarbij je op de voet staat of springt vermijd je. Vraag je kinesist wanneer je mag beginnen met kuitverheffingen en wandelen.',
    },

    knie: {
        naam: 'Knieblessure / Osgood-Schlatter',
        emoji: '🦵',
        kleur: 'orange',
        info: {
            wat_is_het: 'Osgood-Schlatter is een groeigerelateerde overbelastingsblessure waarbij de aanhechting van de kniepees op het scheenbeen geïrriteerd raakt tijdens een groeispurt. Treft 1 op 10 actieve adolescenten.',
            herkennen: 'Pijn net onder de knieschijf op een "knobbeltje". Verergert bij springen, hurken, traplopen. Na rust beter.',
            vermijden: 'Springen, diep knielen, squatten met pijn. Forceer nooit door de pijn heen — de groeischijf is kwetsbaar.',
            wanneer_arts: 'Bij pijn in rust of \'s nachts, bij extreme zwelling, of als klachten na 6 weken niet verbeteren.',
        },
        toegestane_zones: ['bovenlichaam', 'core', 'mobiliteit', 'armen'],
        verboden_zones: ['onderlichaam'],
        opmerking_verboden: 'Oefeningen waarbij je door de knieën buigt vermijd je zolang er pijn is. Vraag je kinesist welke oefeningen voor je knie specifiek zijn toegestaan.',
    },

    hamstring: {
        naam: 'Hamstringblessure',
        emoji: '🏃',
        kleur: 'red',
        info: {
            wat_is_het: 'De hamstring is de grote spiergroep aan de achterzijde van het bovenbeen. Een blessure ontstaat vaak tijdens een sprint of explosieve beweging. Herval is frequent zonder goede begeleiding.',
            herkennen: 'Plotse scherpe pijn achter het bovenbeen bij sprint of schop. Soms een "snap"-gevoel. Gevoeligheid bij aanraken.',
            vermijden: 'Sprinten, springen, explosieve bewegingen. Actief rekken van de hamstring in de eerste 48u.',
            wanneer_arts: 'Bij totale scheur, als normaal stappen pijnlijk is, bij grote zwelling, of als de pijn na 3 dagen niet vermindert.',
        },
        toegestane_zones: ['bovenlichaam', 'core', 'armen'],
        verboden_zones: ['onderlichaam'],
        opmerking_verboden: 'Oefeningen voor het bovenbeen en lopen vermijd je. Vraag je kinesist wanneer je de hamstring terug mag belasten en welke oefeningen hij aanbeveelt.',
    },

    sever: {
        naam: 'Ziekte van Sever (hielpijn)',
        emoji: '👟',
        kleur: 'yellow',
        info: {
            wat_is_het: 'De ziekte van Sever is een irritatie van de groeischijf aan de achterkant van de hiel, veroorzaakt door trekkracht van de achillespees. Komt voor bij 8-15-jarigen in een groeispurt.',
            herkennen: 'Pijn aan de achterkant en onderkant van de hiel tijdens en na sport. Na rust beter, bij belasting erger.',
            vermijden: 'Springen, intensief lopen op harde ondergrond, blootsvoets lopen. Draag schoenen met goede hieldempingen.',
            wanneer_arts: 'Bij pijn die ook \'s nachts aanwezig is, bij sterk hinken, of als klachten na 4 weken niet verbeteren.',
        },
        toegestane_zones: ['bovenlichaam', 'core', 'mobiliteit', 'armen'],
        verboden_zones: ['onderlichaam'],
        opmerking_verboden: 'Oefeningen waarbij je springt of intensief loopt vermijd je. Vraag je kinesist welke oefeningen voor je hiel zijn toegestaan.',
    },

    schouder: {
        naam: 'Schouderblessure',
        emoji: '💪',
        kleur: 'blue',
        info: {
            wat_is_het: 'Schouderblessures bij jongeren ontstaan door herhaalde bovenhandse bewegingen (gooien, slaan) of een val op de uitgestrekte arm. De schouder is een complex gewricht met veel structuren.',
            herkennen: 'Pijn bij arm omhoogbrengen of achterwaarts bewegen. Krachtverlies bij gooien. Klikken in de schouder.',
            vermijden: 'Gooien, stoten, steunen op arm, arm boven hoofd bij pijn.',
            wanneer_arts: 'Als de arm niet normaal bewogen kan worden, bij zichtbare vervorming, bij krachtverlies, of bij pijn na 1 week.',
        },
        toegestane_zones: ['onderlichaam', 'core'],
        verboden_zones: ['bovenlichaam', 'armen'],
        opmerking_verboden: 'Oefeningen waarbij je op je arm steunt of je arm actief beweegt vermijd je. Vraag je kinesist welke schouderoefeningen hij aanbeveelt.',
    },

    rug: {
        naam: 'Rugblessure / Rugpijn',
        emoji: '🔙',
        kleur: 'green',
        info: {
            wat_is_het: 'Rugklachten bij jongeren zijn steeds vaker aanwezig door zittend gedrag en eenzijdige sportbelasting. Acute rugpijn ontstaat door een verkeerde beweging of overbelasting.',
            herkennen: 'Pijn in de onderrug, soms uitstralend naar de bil. Moeite met opstaan na lang zitten. Stijf gevoel.',
            vermijden: 'Zwaar tillen, voorover buigen met gestrekte knieën, zware draaibewegingen. Bedrust wordt NIET aangeraden — licht bewegen is beter.',
            wanneer_arts: 'Bij uitstraling tot onder de knie, bij gevoelloosheid of tintelingen, bij problemen met plassen, of bij pijn na een val.',
        },
        toegestane_zones: ['mobiliteit'],
        verboden_zones: ['bovenlichaam', 'onderlichaam', 'core', 'armen'],
        opmerking_verboden: 'Bij rugpijn is voorzichtigheid geboden. Vraag je kinesist of arts welke oefeningen voor jou specifiek veilig zijn. Mobiliteit en licht bewegen zijn meestal wel toegestaan.',
    },

    pols_hand: {
        naam: 'Pols- of handblessure',
        emoji: '✋',
        kleur: 'purple',
        info: {
            wat_is_het: 'Polsblessures ontstaan door een val op de uitgestrekte hand of herhaalde belasting. De pols heeft 8 kleine botjes en veel gewrichten die kwetsbaar zijn. Polsblessures worden vaak onderschat.',
            herkennen: 'Pijn bij polsbeweging, grijpen of draaien. Zwelling boven de pols. Verminderde knijpkracht.',
            vermijden: 'Steunen op hand, push-ups, gewichten vasthouden, gooien, vangen.',
            wanneer_arts: 'Bij mogelijke botbreuk (sterke zwelling), bij aanhoudende pijn na 48u, of als vingers niet normaal bewegen.',
        },
        toegestane_zones: ['onderlichaam', 'core'],
        verboden_zones: ['bovenlichaam', 'armen'],
        opmerking_verboden: 'Oefeningen waarbij je op je handen steunt of de pols belast vermijd je. Vraag je kinesist welke oefeningen voor pols en hand toegestaan zijn.',
    },


    andere: {
        naam: 'Andere blessure',
        emoji: '🩹',
        kleur: 'slate',
        info: {
            wat_is_het: 'Jouw blessure staat niet in de lijst. Raadpleeg je kinesist of arts voor specifiek advies over welke zones je kunt belasten.',
            herkennen: 'Elk lichaamsdeel kan geblesseerd raken. Pijn, zwelling, beperkte beweging en krachtverlies zijn algemene signalen.',
            vermijden: 'Vermijd alles wat pijn veroorzaakt. Twijfel je of een oefening mag? Sla ze over en vraag je kinesist.',
            wanneer_arts: 'Bij aanhoudende pijn, zwelling, gevoelloosheid, of als je niet weet wat de blessure is.',
        },
        toegestane_zones: ['bovenlichaam', 'core'],
        verboden_zones: ['onderlichaam', 'armen'],
        opmerking_verboden: 'We gaan voorzichtig te werk omdat we je blessure niet kennen. Kies enkel oefeningen die volledig pijnvrij zijn. Vraag je kinesist welke zones jij specifiek kunt belasten.',
    },
    lies_heup: {
        naam: 'Lies- of heupblessure',
        emoji: '⚡',
        kleur: 'pink',
        info: {
            wat_is_het: 'Liesblessures zijn typisch bij sporten met veel richtingsveranderingen. De adductoren (binnenzijde bovenbeen) worden overbelast. Herval is frequent zonder goede begeleiding.',
            herkennen: 'Pijn aan de binnenzijde van het bovenbeen bij zijwaarts optillen been of bij knijpen knieën samen.',
            vermijden: 'Sprinten, zijwaartse sprongen, brede uitvalspas. Geen adductorenstretches in de eerste dagen.',
            wanneer_arts: 'Bij pijn langer dan 2 weken, bij pijn in rust of \'s nachts, of bij een snap-gevoel in de heup.',
        },
        toegestane_zones: ['bovenlichaam', 'core', 'armen'],
        verboden_zones: ['onderlichaam'],
        opmerking_verboden: 'Oefeningen waarbij je de binnenzijde van het bovenbeen belast vermijd je. Vraag je kinesist wanneer je de lies en heup terug mag belasten.',
    },
};

// ─── SEEDING FUNCTIE ──────────────────────────────────────────────────────────
async function seed() {
    console.log('🌱 Start seeding sport_lab_blessures...\n');
    console.log('📋 Aanpak: GEEN medisch advies — enkel fitnessoefeningen voor gezonde zones\n');

    // Sla oefenbibliotheek op als apart document (wordt door de app geladen per zone)
    try {
        await db.collection('sport_lab_blessures').doc('_oefeningen').set({ zones: ZONES });
        console.log('✅ Oefenbibliotheek gesaved (_oefeningen)');
    } catch (e) {
        console.error('❌ Oefenbibliotheek:', e.message);
    }

    // Sla blessure-definities op
    let succes = 0, fouten = 0;
    for (const [key, data] of Object.entries(BLESSURES)) {
        try {
            await db.collection('sport_lab_blessures').doc(key).set(data);
            console.log(`✅ ${data.naam}`);
            console.log(`   Toegestane zones: ${data.toegestane_zones.join(', ')}`);
            console.log(`   Verboden zones:   ${data.verboden_zones.join(', ')}`);
            succes++;
        } catch (e) {
            console.error(`❌ ${key}: ${e.message}`);
            fouten++;
        }
    }

    console.log(`\n📊 Klaar: ${succes} blessures + oefenbibliotheek geseed, ${fouten} fouten.`);
    console.log('\n⚠️  DISCLAIMER: Educatief. Geen medisch advies.');
    console.log('   Revalidatieoefeningen komen uitsluitend van de kinesist van de leerling.');
    process.exit(0);
}

seed().catch(err => { console.error('Kritieke fout:', err); process.exit(1); });