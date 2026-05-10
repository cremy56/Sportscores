// scripts/seed-sportlab-blessures.js
// Vult de sport_lab_blessures collectie in Firestore.
// Content voor de Body Fixer rol in Sport Lab.
// Gebaseerd op wetenschappelijke bronnen over sportblessures bij 12-18-jarigen.
//
// ⚠️  DISCLAIMER: Deze content vervangt NOOIT medisch advies.
//     De leerling raadpleegt altijd een arts of kinesist.
//
// Gebruik:
//   node scripts/seed-sportlab-blessures.js

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ─── OEFENINGEN PER TRAININGSZONE ────────────────────────────────────────────
// Zones: bovenlichaam, core, onderlichaam, armen, mobiliteit
// Alle oefeningen zijn uitvoerbaar in een sporthal zonder materiaal.

const OEFENINGEN = {

    bovenlichaam: [
        {
            naam: 'Muurpush-up',
            duur: '3 × 12 herhalingen',
            uitleg: 'Sta op armlengte van de muur. Leg je handpalmen plat op de muur op schouderhoogte. Buig je armen gecontroleerd totdat je neus de muur bijna raakt, duw daarna terug. Houd je rug recht.',
            tip: 'Hoe verder je van de muur staat, hoe zwaarder. Begin dicht bij de muur.',
        },
        {
            naam: 'Kniepush-up',
            duur: '3 × 10 herhalingen',
            uitleg: 'Begin op handen en knieën. Handen op schouderbreedte, knieën op de grond. Laat je borst zakken naar de vloer en duw terug omhoog. Houd je romp gespannen.',
            tip: 'Zorg dat je heupen niet zakken. Je lijf vormt een rechte lijn van knie tot schouder.',
        },
        {
            naam: 'Arm circles',
            duur: '2 × 30 seconden per richting',
            uitleg: 'Strek je armen zijwaarts op schouderhoogte. Maak kleine cirkels naar voren gedurende 30 seconden. Wissel daarna van richting. Vergroot de cirkels geleidelijk.',
            tip: 'Goed voor mobiliteit én doorbloeding van schouder en bovenrug.',
        },
        {
            naam: 'Schouder shrugs',
            duur: '3 × 15 herhalingen',
            uitleg: 'Sta rechtop. Haal je schouders zo hoog mogelijk op richting de oren. Houd 2 seconden vast en laat dan gecontroleerd zakken. Ontspan volledig onderaan.',
            tip: 'Traag en gecontroleerd is effectiever dan snel. Geen rugblessure? Dan mag je ook cirkelen.',
        },
        {
            naam: 'Superman (rug extensie)',
            duur: '3 × 10 herhalingen',
            uitleg: 'Ga op je buik liggen. Strek armen voor je uit. Til tegelijkertijd je armen, borst en benen een paar centimeter van de grond. Houd 2 seconden vast en laat zakken.',
            tip: 'Niet te hoog. Focus op aanspanning van rug- en bilspieren, niet op hoogte.',
        },
    ],

    core: [
        {
            naam: 'Plank op knieën',
            duur: '3 × 20 seconden',
            uitleg: 'Steun op onderarmen en knieën. Houd je rug recht — geen holle of bolle rug. Span je buikspieren aan en adem rustig door. Kijk naar de grond.',
            tip: 'Verhoog de tijd stap voor stap. Drie seconden langer per training is al vooruitgang.',
        },
        {
            naam: 'Dead bug',
            duur: '3 × 8 herhalingen per zijde',
            uitleg: 'Ga op je rug liggen. Til armen recht omhoog en benen gebogen in de lucht (90°). Strek langzaam je rechterarm achterover terwijl je linkerbeen uitstrekt, zonder de grond te raken. Keer terug en wissel.',
            tip: 'Druk je onderrug actief in de grond. Als dit te moeilijk is, beweeg enkel de armen.',
        },
        {
            naam: 'Glute bridge',
            duur: '3 × 15 herhalingen',
            uitleg: 'Ga op je rug liggen, knieën gebogen, voeten plat op de grond. Duw je heupen omhoog totdat je lichaam een rechte lijn vormt van schouder tot knie. Houd 2 seconden vast en laat zakken.',
            tip: 'Knijp je bilspieren aan bovenaan. Dit versterkt ook je onderrug.',
        },
        {
            naam: 'Zittende rompdraaien',
            duur: '3 × 12 herhalingen per kant',
            uitleg: 'Ga rechtop zitten op een stoel of de grond. Kruis je armen voor je borst. Draai je bovenlichaam langzaam naar rechts en keer terug naar het midden, daarna naar links. Beweeg vanuit de buik, niet van de nek.',
            tip: 'Langzame gecontroleerde beweging. Voelt u pijn in de rug? Stop dan.',
        },
        {
            naam: 'Crunches',
            duur: '3 × 15 herhalingen',
            uitleg: 'Ga op je rug liggen, knieën gebogen. Leg je handen achter je hoofd. Curl je bovenlichaam omhoog totdat je schouderbladen van de grond zijn. Zet geen kracht met je handen op je nek.',
            tip: 'Half omhoog is voldoende — je hoeft je ellebogen niet aan je knieën te raken.',
        },
    ],

    onderlichaam: [
        {
            naam: 'Bodyweight squat',
            duur: '3 × 15 herhalingen',
            uitleg: 'Sta voetbreedteapart. Buig je knieën en laat je heupen zakken alsof je op een stoel gaat zitten. Houd je hielen op de grond en je knieën boven je voeten. Strek terug omhoog.',
            tip: 'Passen niet bij knieblessures! Bij twijfel: gebruik een stoel als geleider.',
        },
        {
            naam: 'Uitvalspas (lunge)',
            duur: '3 × 10 per been',
            uitleg: 'Stap één voet ver naar voren. Laat je achterste knie zakken richting de grond (niet erop). Stap terug. Wissel van been. Houd je romp recht.',
            tip: 'Zijwaartse lunge is lichter voor de knieën als reguliere lunge pijn geeft.',
        },
        {
            naam: 'Kuitverheffingen',
            duur: '3 × 20 herhalingen',
            uitleg: 'Sta rechtop, handen aan de muur voor balans. Kom op je tenen omhoog, houd 1 seconde vast en laat gecontroleerd zakken. Voeten samen of op schouderbreedte.',
            tip: 'Ook uitvoerbaar op één been voor meer uitdaging. Niet doen bij enkelblessures.',
        },
        {
            naam: 'Balans op één been',
            duur: '3 × 30 seconden per been',
            uitleg: 'Sta op één been. Hou je andere voet naast je knie. Probeer stabiel te blijven. Focus op een vast punt voor je. Verhoog de moeilijkheid door je ogen te sluiten.',
            tip: 'Verbetert stabiliteit en voorkomt toekomstige enkelblessures. Niet doen bij actieve enkelpijn.',
        },
        {
            naam: 'Stap-up op bankje',
            duur: '3 × 12 per been',
            uitleg: 'Zet één voet op een bankje of verhoging. Duw jezelf omhoog zodat je rechtop staat op het bankje. Stap gecontroleerd terug. Wissels van been.',
            tip: 'Begin met een lage verhoging. Goed voor kracht en balans samen.',
        },
    ],

    mobiliteit: [
        {
            naam: 'Quadriceps stretch (staand)',
            duur: '3 × 30 seconden per been',
            uitleg: 'Sta op één been (gebruik een muur voor steun). Buig je andere knie en breng je hak naar je bil. Houd je enkel vast. Voel de rek aan de voorkant van je bovenbeen.',
            tip: 'Zacht rekken — geen pijn. Niet doen bij actieve Osgood-Schlatter klachten.',
        },
        {
            naam: 'Hamstring stretch (liggend)',
            duur: '3 × 30 seconden per been',
            uitleg: 'Ga op je rug liggen. Til één been omhoog en houd het met beide handen vast. Strek je been zo recht mogelijk. Voel de rek aan de achterzijde van je bovenbeen.',
            tip: 'Het been hoeft niet volledig gestrekt te zijn. Rek tot je spanning voelt, geen pijn.',
        },
        {
            naam: 'Kuitspier stretch',
            duur: '3 × 30 seconden per been',
            uitleg: 'Sta voor de muur. Zet één voet achteraan. Houd de achterste knie gestrekt en druk de hak naar de grond. Leun licht naar voren. Voel de rek in je kuit.',
            tip: 'Essentieel bij de ziekte van Sever (hielpijn). Voer dit elke dag uit.',
        },
        {
            naam: 'Heupbuiger stretch',
            duur: '3 × 30 seconden per been',
            uitleg: 'Zak in een halve knielstand (één knie op de grond, andere voet voor je). Duw je heupen licht naar voren. Voel de rek aan de voorzijde van je heup en bovenbeen.',
            tip: 'Houd je romp rechtop. Niet te ver naar voren duwen.',
        },
        {
            naam: 'Schoudermobiliteit (handdoek)',
            duur: '2 × 10 heen en terug',
            uitleg: 'Houd een handdoek of elastiek met gestrekte armen voor je. Breng de handdoek langzaam over je hoofd naar achter, handen wijd uiteen. Zo ver als comfortabel gaat. Terug naar voren.',
            tip: 'Handen verder uit elkaar maakt het makkelijker. Niet doen bij acute schouderpijn.',
        },
    ],
};

// ─── BLESSURE ZONES EN CONTENT ────────────────────────────────────────────────
const BLESSURES = {

    enkel: {
        naam: 'Enkelblessure / Verzwikte enkel',
        emoji: '🦶',
        kleur: 'amber',
        info: {
            wat_is_het: 'Een enkelblessure ontstaat meestal door "verzwikken" — de voet draait naar binnen of buiten bij een sprong of verkeerde landing. De banden (ligamenten) rondom de enkel rekken uit of scheuren. Dit is de meest voorkomende sportblessure bij jongeren.',
            herkennen: 'Je voelt onmiddellijke pijn aan de buitenkant van de enkel. Er treedt zwelling op, soms een blauwe plek. Lopen is pijnlijk, staan op de geblesseerde voet doet pijn.',
            vermijden: 'Lopen, springen, rennen, snel van richting veranderen. Belast de enkel niet in de acute fase (eerste 48 uur). Gebruik het RICE-principe: Rust, IJs, Compressie, Elevatie.',
            wanneer_arts: 'Als je niet kunt steunen op de voet, als er direct na het verzwikken een "knak" was, als de pijn na 48 uur niet afneemt, of als er veel zwelling is.',
            herstel: 'Lichte enkelblessures herstellen in 1-3 weken. Stevige banden nemen 4-6 weken. Kinesist begeleiding versnelt het herstel significant.',
        },
        toegestane_zones: ['bovenlichaam', 'core'],
        verboden_oefeningen: ['lopen', 'springen', 'kuitverheffingen', 'balans op één been', 'squat', 'lunge'],
        oefeningen: {
            bovenlichaam: [OEFENINGEN.bovenlichaam[0], OEFENINGEN.bovenlichaam[1], OEFENINGEN.bovenlichaam[2], OEFENINGEN.bovenlichaam[4]],
            core: [OEFENINGEN.core[0], OEFENINGEN.core[1], OEFENINGEN.core[2], OEFENINGEN.core[3]],
        },
    },

    knie: {
        naam: 'Knieblessure / Osgood-Schlatter',
        emoji: '🦵',
        kleur: 'orange',
        info: {
            wat_is_het: 'Knieklachten komen veel voor bij groeiende jongeren. Osgood-Schlatter is een typische groeiblessure waarbij de aanhechting van de kniepees op het scheenbeen geïrriteerd raakt. Dit komt voor bij 12-16-jarige sporters die een groeispurt doormaken. De botten groeien sneller dan de spieren, waardoor de pees te hard trekt.',
            herkennen: 'Pijn net onder de knieschijf, op een "knobbeltje" op het scheenbeen. Pijn neemt toe bij springen, rennen en traplopen. Na sport erger, na rust beter. Soms zwelling op het scheenbeen.',
            vermijden: 'Springen, diep knielen, rennen (tijdelijk), squatten met pijnklachten. Forceer nooit door de pijn heen. De groeischijf is kwetsbaar.',
            wanneer_arts: 'Als de pijn meer dan 2 weken aanhoudt, als er een zichtbare zwelling is, als lopen pijnlijk is, of als één knie duidelijk groter lijkt dan de andere.',
            herstel: 'Osgood-Schlatter gaat vanzelf over wanneer de groeispurt voorbij is (gemiddeld 12-24 maanden). Goede begeleiding en aanpassing van training verminderen de klachten sterk.',
        },
        toegestane_zones: ['bovenlichaam', 'core', 'mobiliteit'],
        verboden_oefeningen: ['squat', 'lunge', 'springen', 'lopen', 'knielen', 'kuitverheffingen'],
        oefeningen: {
            bovenlichaam: [OEFENINGEN.bovenlichaam[0], OEFENINGEN.bovenlichaam[1], OEFENINGEN.bovenlichaam[2], OEFENINGEN.bovenlichaam[4]],
            core: [OEFENINGEN.core[0], OEFENINGEN.core[2], OEFENINGEN.core[3], OEFENINGEN.core[4]],
            mobiliteit: [OEFENINGEN.mobiliteit[1], OEFENINGEN.mobiliteit[2], OEFENINGEN.mobiliteit[3]],
        },
    },

    hamstring: {
        naam: 'Hamstringblessure',
        emoji: '🏃',
        kleur: 'red',
        info: {
            wat_is_het: 'De hamstring is de grote spiergroep aan de achterzijde van het bovenbeen. Een hamstringblessure ontstaat vaak tijdens een sprint of een explosieve beweging waarbij de spier overbelast wordt. Er zijn drie gradaties: lichte verrekking (1), kleine scheur (2), volledig scheuren (3).',
            herkennen: 'Plotselinge, scherpe pijn aan de achterzijde van het bovenbeen tijdens een sprint of explosieve beweging. Soms een "snap" of "knak"-gevoel. Pijn bij strekken van het been, gevoeligheid bij aanraken.',
            vermijden: 'Sprinten, springen, hoge kniebuigingen, explosive bewegingen. Pas de eerste 48 uur: rust, ijs, compressie. Rek de hamstring niet actief uit in de acute fase.',
            wanneer_arts: 'Als je niet normaal kunt lopen, als er een grote zwelling of blauwe plek is, als er een "knak" werd gehoord, of als de pijn na 3 dagen niet vermindert.',
            herstel: 'Graad 1: 1-2 weken. Graad 2: 4-8 weken. Graad 3: 3-6 maanden. Revalidatie bij een kinesist is sterk aanbevolen om herval te voorkomen.',
        },
        toegestane_zones: ['bovenlichaam', 'core'],
        verboden_oefeningen: ['sprinten', 'springen', 'lunge', 'hamstring-rek in acute fase'],
        oefeningen: {
            bovenlichaam: [OEFENINGEN.bovenlichaam[0], OEFENINGEN.bovenlichaam[1], OEFENINGEN.bovenlichaam[2], OEFENINGEN.bovenlichaam[3]],
            core: [OEFENINGEN.core[0], OEFENINGEN.core[3], OEFENINGEN.core[4]],
        },
    },

    sever: {
        naam: 'Ziekte van Sever (hielpijn)',
        emoji: '👟',
        kleur: 'yellow',
        info: {
            wat_is_het: 'De ziekte van Sever is een groeigerelateerde aandoening waarbij de groeischijf in de hiel geïrriteerd raakt door de trekkracht van de achillespees. Het komt voor bij actieve jongeren van 8-15 jaar, typisch tijdens groeispurten. De kuitspier groeit trager dan het bot.',
            herkennen: 'Pijn aan de achterkant en onderkant van de hiel, tijdens of na het sporten. Pijn bij knijpen van de hiel van beide kanten. Na rust minder pijn, bij belasting erger. Soms een lichte zwelling.',
            vermijden: 'Springen, intensief rennen op harde ondergrond, lopen op blote voeten. Draag schoenen met goede demping. Vermijd plotselinge intensiteitsverhoging.',
            wanneer_arts: 'Bij aanhoudende pijn na 2 weken rust, bij sterk hinken, of als de pijn ook in de nacht aanwezig is. Controleer ook het schoeisel — versleten zolen verergeren de klachten.',
            herstel: 'Sever gaat over zodra de groeispurt voorbij is. Met goede begeleiding en rekken van de kuitspieren kunnen klachten sterk verminderen. Gemiddeld herstel: 2-8 weken bij aanpassing van activiteiten.',
        },
        toegestane_zones: ['bovenlichaam', 'core', 'mobiliteit'],
        verboden_oefeningen: ['springen', 'intensief lopen', 'lopen op blote voeten'],
        oefeningen: {
            bovenlichaam: [OEFENINGEN.bovenlichaam[0], OEFENINGEN.bovenlichaam[1], OEFENINGEN.bovenlichaam[3], OEFENINGEN.bovenlichaam[4]],
            core: [OEFENINGEN.core[0], OEFENINGEN.core[1], OEFENINGEN.core[2]],
            mobiliteit: [OEFENINGEN.mobiliteit[2], OEFENINGEN.mobiliteit[3]],
        },
    },

    schouder: {
        naam: 'Schouderblessure',
        emoji: '💪',
        kleur: 'blue',
        info: {
            wat_is_het: 'Schouderblessures bij jongeren ontstaan vaak door herhaalde bovenhandse bewegingen (gooien, slaan bij volleybal/handbal/zwemmen) of door een val op de uitgestrekte arm. De schouder is een complex gewricht met veel spieren, pezen en banden die allemaal geblesseerd kunnen raken.',
            herkennen: 'Pijn bij bewegen van de arm, met name omhoog of achterwaarts. Krachtverlies bij gooien of slaan. Soms klikken of knappen in de schouder. Pijn bij slapen op de geblesseerde schouder.',
            vermijden: 'Gooien, stoten, het gewicht van je lichaam op de arm steunen, armen boven het hoofd brengen met pijn. Geen push-ups of plank bij schouderklachten.',
            wanneer_arts: 'Als de arm niet normaal bewogen kan worden, als er een zichtbare vervorming is (schouder uit kom), bij aanhoudende pijn na 1 week, of bij krachtverlies in de arm.',
            herstel: 'Afhankelijk van het type blessure. Lichte overbelasting: 1-3 weken. Peesblessure: 4-8 weken. Schouder uit kom: 6-12 weken. Revalidatie bij kinesist is noodzakelijk.',
        },
        toegestane_zones: ['onderlichaam', 'core'],
        verboden_oefeningen: ['push-ups', 'plank', 'gooien', 'arm overhead', 'gewicht op arm steunen'],
        oefeningen: {
            onderlichaam: [OEFENINGEN.onderlichaam[0], OEFENINGEN.onderlichaam[1], OEFENINGEN.onderlichaam[2], OEFENINGEN.onderlichaam[3], OEFENINGEN.onderlichaam[4]],
            core: [OEFENINGEN.core[2], OEFENINGEN.core[3], OEFENINGEN.core[4]],
        },
    },

    rug: {
        naam: 'Rugblessure / Rugpijn',
        emoji: '🔙',
        kleur: 'green',
        info: {
            wat_is_het: 'Rugklachten bij jongeren worden steeds vaker gezien, mede door zittend gedrag en eenzijdige belasting tijdens sporten. Acute rugpijn ontstaat vaak door een verkeerde beweging of overbelasting. Chronische rugpijn kan te maken hebben met houdingsproblemen of spieronevenwicht.',
            herkennen: 'Pijn in de onderrug, soms uitstralend naar de bil of het been. Moeite met opstaan na lang zitten. Pijn bij voorover buigen of tillen. Soms spierspanning langs de wervelkolom.',
            vermijden: 'Zwaar tillen, voorover buigen met gestrekte knieën, draaibewegingen met belasting, springen. Vermijd lang zitten in een slechte houding. Geen situps met rechte voeten.',
            wanneer_arts: 'Bij uitstraling naar het been (ischiaszenuw), bij gevoelloosheid of tintelingen in been of voet, bij problemen met plassen of stoelgang, bij pijn na een val of klap op de rug.',
            herstel: 'Acute rugpijn gaat meestal binnen 2-4 weken over met rust en lichte activiteit. Bewegen (licht) versnelt het herstel — volledig in bed blijven is NIET aangeraden. Kinesist begeleiding bij aanhoudende klachten.',
        },
        toegestane_zones: ['bovenlichaam_licht', 'mobiliteit'],
        verboden_oefeningen: ['voorover buigen', 'situps', 'zwaar tillen', 'draaibewegingen met belasting', 'springen'],
        oefeningen: {
            bovenlichaam_licht: [OEFENINGEN.bovenlichaam[0], OEFENINGEN.bovenlichaam[2], OEFENINGEN.bovenlichaam[3]],
            mobiliteit: [OEFENINGEN.mobiliteit[3], OEFENINGEN.mobiliteit[4]],
        },
    },

    pols_hand: {
        naam: 'Pols- of handblessure',
        emoji: '✋',
        kleur: 'purple',
        info: {
            wat_is_het: 'Polsblessures bij sporters ontstaan vaak door een val op de uitgestrekte hand of door herhaalde belasting (gym, turnbewegingen). De pols heeft veel kleine botjes en gewrichtjes die allemaal geblesseerd kunnen raken.',
            herkennen: 'Pijn bij bewegen van de pols, grijpen of draaibewegingen. Zwelling boven of rond de pols. Verminderde kracht bij knijpen. Soms pijn bij steunen op de hand.',
            vermijden: 'Steunen op de hand, push-ups, vangen, gooien, gewichten vasthouden. Bescherm de pols met een bandage of brace bij lichte klachten.',
            wanneer_arts: 'Bij mogelijke botbreuk (sterke zwelling, misvormde pols, val op uitgestrekte hand), bij aanhoudende pijn, of als de vingers niet normaal kunnen bewegen.',
            herstel: 'Lichte verstuiking: 1-2 weken. Peesletsel: 3-6 weken. Botbreuk: 6-8 weken in gips. Polsblessures worden soms onderschat — neem ze serieus.',
        },
        toegestane_zones: ['onderlichaam', 'core'],
        verboden_oefeningen: ['steunen op handen', 'push-ups', 'plank', 'gewichten vasthouden', 'gooien', 'vangen'],
        oefeningen: {
            onderlichaam: [OEFENINGEN.onderlichaam[0], OEFENINGEN.onderlichaam[1], OEFENINGEN.onderlichaam[2], OEFENINGEN.onderlichaam[3]],
            core: [OEFENINGEN.core[1], OEFENINGEN.core[2], OEFENINGEN.core[3]],
        },
    },

    lies_heup: {
        naam: 'Lies- of heupblessure',
        emoji: '⚡',
        kleur: 'pink',
        info: {
            wat_is_het: 'Liesblessures zijn typisch voor sporten met veel richtingsveranderingen (voetbal, hockey, handbal). De adductoren (binnenzijde van het bovenbeen) worden overbelast. Heupklachten bij jongeren kunnen ook groeigerelateerd zijn (bursitis, impingement).',
            herkennen: 'Pijn aan de binnenzijde van het bovenbeen (lies) of rond de heup. Pijn bij zijwaarts optillen van het been of bij samen drukken van de knieën. Verergert bij sprinten, springen en richtingsveranderingen.',
            vermijden: 'Sprinten, richtingsveranderingen, zijwaartse sprong, brede uithaalspas (lunge). Geen liesspierstretches in de acute fase.',
            wanneer_arts: 'Bij aanhoudende pijn langer dan 2 weken, bij pijn in rust of in de nacht, bij klachten in beide liezen tegelijk, of bij een snap-gevoel met pijn in de heup.',
            herstel: 'Lichte liesblessure: 2-4 weken. Ernstigere blessure: 6-12 weken. Volledig herstel is belangrijk voor langdurige sportdeelname. Herval is frequent als te vroeg hervat.',
        },
        toegestane_zones: ['bovenlichaam', 'core'],
        verboden_oefeningen: ['sprinten', 'zijwaartse sprongen', 'lunge', 'brede squat', 'richtingsveranderingen'],
        oefeningen: {
            bovenlichaam: [OEFENINGEN.bovenlichaam[0], OEFENINGEN.bovenlichaam[1], OEFENINGEN.bovenlichaam[2], OEFENINGEN.bovenlichaam[3]],
            core: [OEFENINGEN.core[0], OEFENINGEN.core[1], OEFENINGEN.core[3], OEFENINGEN.core[4]],
        },
    },
};

// ─── SEEDING FUNCTIE ──────────────────────────────────────────────────────────
async function seedSportLabBlessures() {
    console.log('🩺 Start seeding sport_lab_blessures...\n');

    const blessures = Object.keys(BLESSURES);
    let succes = 0;
    let fouten = 0;

    for (const key of blessures) {
        try {
            await db.collection('sport_lab_blessures').doc(key).set(
                BLESSURES[key],
                { merge: true }
            );
            console.log(`✅ ${BLESSURES[key].naam}`);
            succes++;
        } catch (error) {
            console.error(`❌ ${key}: ${error.message}`);
            fouten++;
        }
    }

    console.log(`\n📊 Klaar: ${succes} blessures geseed, ${fouten} fouten.`);
    console.log('📁 Collectie: sport_lab_blessures');
    console.log('📝 Blessures: enkel, knie/Osgood, hamstring, Sever, schouder, rug, pols, lies/heup');
    console.log('\n⚠️  Content is informatief — raadpleeg altijd een arts of kinesist.');

    process.exit(0);
}

seedSportLabBlessures().catch(err => {
    console.error('Kritieke fout:', err);
    process.exit(1);
});