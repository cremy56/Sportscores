import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// --- DATA VOOR DE 'oefeningen' COLLECTIE (BEEPTEST SPECIFIEK) ---
const oefeningen = {
  'beeptest_duurloop_basis': {
    naam: "Aerobe Duurloop",
    categorie: "Uithouding",
    beschrijving: "Een rustige loop op een constant, comfortabel tempo (praattempo). Vormt de absolute basis van je uithoudingsvermogen, versterkt het hart en verbetert de zuurstoftoevoer naar de spieren.",
    visuele_media_url: "https://i.imgur.com/vaxmH2E.gif",
    instructies: [
      "Kies een tempo waarbij je nog een gesprek zou kunnen voeren.",
      "Houd je hartslag laag en constant (ongeveer 60-70% van je maximum).",
      "Focus op een ontspannen loophouding en een ritmische ademhaling.",
      "Deze training is bedoeld om afstand op te bouwen, niet snelheid."
    ]
  },
  'beeptest_interval_vo2max': {
    naam: "VO₂-Max Intervallen",
    categorie: "Uithouding",
    beschrijving: "Korte, intense intervallen (bv. 400m) op hoge snelheid, ontworpen om je maximale zuurstofopnamecapaciteit (VO₂-max) te verhogen. Dit is cruciaal voor de hogere trappen van de beeptest.",
    visuele_media_url: "https://i.imgur.com/yThgS2C.gif",
    instructies: [
      "Loop de aangegeven afstand op een zeer hoog tempo (9/10 inspanning).",
      "Neem een actieve herstelperiode (wandelen of rustig joggen) die ongeveer even lang of iets langer is dan de inspanning.",
      "Probeer elke interval op een consistent, hoog tempo te lopen.",
      "Deze training voelt zwaar aan en is zeer effectief."
    ]
  },
  'beeptest_shuttle_techniek': {
    naam: "Shuttle Run Techniektraining",
    categorie: "Techniek",
    beschrijving: "Specifieke oefening op de 20-meter shuttle-beweging. De focus ligt op het efficiënt en explosief keren om minimale energie en tijd te verliezen.",
    visuele_media_url: "https://i.imgur.com/bQ9gJ2E.gif",
    instructies: [
      "Zet twee kegels 20 meter uit elkaar.",
      "Loop heen en weer op een rustig tempo, focus volledig op de keertechniek.",
      "Vertraag vlak voor de lijn, blijf laag, zet met de buitenste voet af voorbij de lijn en draai je heupen snel om te versnellen in de andere richting.",
      "Oefen dit zonder de druk van de 'bieps' om de beweging te perfectioneren."
    ]
  },
  'beeptest_tempo_shuttles': {
    naam: "Beeptest Tempo Shuttles",
    categorie: "Uithouding",
    beschrijving: "Shuttle runs op een constant, uitdagend tempo (net onder je recordtempo). Dit verhoogt je lactaatdrempel en leert je lichaam omgaan met langdurige inspanning op hoge intensiteit.",
    visuele_media_url: "https://i.imgur.com/bQ9gJ2E.gif",
    instructies: [
      "Gebruik een beeptest app of audiobestand.",
      "Loop een vast aantal minuten op een specifieke trap (bv. 5 minuten op trap 8).",
      "De gekozen trap moet 'comfortabel zwaar' aanvoelen.",
      "Neem een ruime pauze en herhaal. Dit is mentaal en fysiek zwaar."
    ]
  },
  'beeptest_plyometrie_kracht': {
    naam: "Plyometrie voor Explosiviteit",
    categorie: "Kracht",
    beschrijving: "Explosieve krachtoefeningen die de elastische componenten van de spieren trainen. Essentieel voor een krachtige afzet bij het keren en snelle acceleratie.",
    visuele_media_url: "https://i.imgur.com/s4bJ9nF.gif",
    instructies: [
      "Voer oefeningen uit zoals Squat Jumps, Box Jumps en Lunges.",
      "Focus op een maximale, snelle inspanning bij elke herhaling.",
      "De contacttijd met de grond moet zo kort mogelijk zijn.",
      "Zorg voor een goede warming-up; dit is een intensieve training."
    ]
  },
  'beeptest_simulatie': {
    naam: "Volledige Beeptest Simulatie",
    categorie: "Meting",
    beschrijving: "Een volledige uitvoering van de beeptest, van begin tot je absolute maximum. Wordt gebruikt als training en als meetpunt voor je vooruitgang.",
    visuele_media_url: "https://i.imgur.com/3f8tB3d.gif",
    instructies: [
      "Zorg voor een goede warming-up.",
      "Gebruik een officieel audiobestand van de 20m shuttle run test.",
      "Loop tot je de 'biep' tweemaal na elkaar niet meer haalt.",
      "Noteer de laatst voltooide trap. Dit is je score.",
      "Neem na de test een uitgebreide cooling-down."
    ]
  }
};

// --- DATA VOOR DE 'trainingsschemas' COLLECTIE (BEEPTEST) ---
const trainingsschemas = {
  // Schema voor Beginners
  'schema_beeptest_beginner_8weken': {
    naam: "Beeptest Opbouw (8 Weken)",
    duur_weken: 8,
    categorie: "Uithouding",
    omschrijving: "Een 8-wekenplan voor beginners om de beeptest comfortabel uit te lopen en een solide basisconditie te ontwikkelen.",
    gekoppelde_test_id: "beeptest",
    weken: [
      { week_nummer: 1, doel_van_de_week: "Wennen aan de loopbelasting.", taken: [
          { dag: "Dag 1", omschrijving: "4x (3 min lopen, 2 min wandelen)", type: "Training", oefening_id: "beeptest_duurloop_basis" },
          { dag: "Dag 2", omschrijving: "15 min Shuttle Run techniektraining op laag tempo", type: "Techniek", oefening_id: "beeptest_shuttle_techniek" },
          { dag: "Dag 3", omschrijving: "4x (3 min lopen, 2 min wandelen)", type: "Training", oefening_id: "beeptest_duurloop_basis" }
      ]},
      { week_nummer: 2, doel_van_de_week: "Uithouding verlengen.", taken: [
          { dag: "Dag 1", omschrijving: "3x (5 min lopen, 2 min wandelen)", type: "Training", oefening_id: "beeptest_duurloop_basis" },
          { dag: "Dag 2", omschrijving: "15 min Shuttle Run techniektraining, iets sneller", type: "Techniek", oefening_id: "beeptest_shuttle_techniek" },
          { dag: "Dag 3", omschrijving: "3x (5 min lopen, 2 min wandelen)", type: "Training", oefening_id: "beeptest_duurloop_basis" }
      ]},
       { week_nummer: 3, doel_van_de_week: "Eerste duurloop en tempo.", taken: [
          { dag: "Dag 1", omschrijving: "15 min lopen zonder stoppen", type: "Training", oefening_id: "beeptest_duurloop_basis" },
          { dag: "Dag 2", omschrijving: "Beeptest trappen 1-4, 2 keer met 3 min rust", type: "Training", oefening_id: "beeptest_tempo_shuttles" },
          { dag: "Dag 3", omschrijving: "20 min lopen zonder stoppen", type: "Training", oefening_id: "beeptest_duurloop_basis" }
      ]},
       { week_nummer: 4, doel_van_de_week: "Rust en herstel voor de volgende fase.", taken: [
          { dag: "Dag 1", omschrijving: "15 min zeer rustige loop", type: "Herstel", oefening_id: "beeptest_duurloop_basis" },
          { dag: "Dag 2", omschrijving: "Volledige rust", type: "Herstel" },
          { dag: "Dag 3", omschrijving: "10 min rustig lopen + 10 min techniektraining", type: "Techniek", oefening_id: "beeptest_shuttle_techniek" }
      ]},
       { week_nummer: 5, doel_van_de_week: "Introductie van snelheid.", taken: [
          { dag: "Dag 1", omschrijving: "Interval: 6x 200m vlot, met 200m wandelrust", type: "Training", oefening_id: "beeptest_interval_vo2max" },
          { dag: "Dag 2", omschrijving: "20 min rustige duurloop", type: "Herstel", oefening_id: "beeptest_duurloop_basis" },
          { dag: "Dag 3", omschrijving: "Beeptest trappen 1-6, 2 keer met 4 min rust", type: "Training", oefening_id: "beeptest_tempo_shuttles" }
      ]},
       { week_nummer: 6, doel_van_de_week: "Uithouding en snelheid combineren.", taken: [
          { dag: "Dag 1", omschrijving: "Interval: 8x 200m vlot, met 200m wandelrust", type: "Training", oefening_id: "beeptest_interval_vo2max" },
          { dag: "Dag 2", omschrijving: "25 min rustige duurloop", type: "Herstel", oefening_id: "beeptest_duurloop_basis" },
          { dag: "Dag 3", omschrijving: "Beeptest trappen 1-7. Focus op één goede uitvoering.", type: "Training", oefening_id: "beeptest_tempo_shuttles" }
      ]},
       { week_nummer: 7, doel_van_de_week: "Generale repetitie.", taken: [
          { dag: "Dag 1", omschrijving: "30 min rustige duurloop", type: "Training", oefening_id: "beeptest_duurloop_basis" },
          { dag: "Dag 2", omschrijving: "Volledige rust", type: "Herstel" },
          { dag: "Dag 3", omschrijving: "Korte test: voer de beeptest uit tot trap 7 of 8.", type: "Meting", oefening_id: "beeptest_simulatie" }
      ]},
       { week_nummer: 8, doel_van_de_week: "De eindtest.", taken: [
          { dag: "Dag 1", omschrijving: "15 min zeer rustig joggen", type: "Herstel" },
          { dag: "Dag 2", omschrijving: "Volledige rust", type: "Herstel" },
          { dag: "Testdag", omschrijving: "Volledige beeptest tot je maximum.", type: "Meting", oefening_id: "beeptest_simulatie" }
      ]}
    ]
  },
  // Schema voor Gevorderden
  'schema_beeptest_gevorderd_6weken': {
    naam: "Beeptest Booster (6 Weken)",
    duur_weken: 6,
    categorie: "Uithouding",
    omschrijving: "Een 6-wekenplan voor lopers met een goede basisconditie die hun score significant willen verbeteren.",
    gekoppelde_test_id: "beeptest",
    weken: [
      { week_nummer: 1, doel_van_de_week: "Drempel verhogen.", taken: [
          { dag: "Dag 1", omschrijving: "Interval: 6x 400m op hoog tempo, 90s rust", type: "Training", oefening_id: "beeptest_interval_vo2max" },
          { dag: "Dag 2", omschrijving: "Duurloop: 35 min rustig", type: "Herstel", oefening_id: "beeptest_duurloop_basis" },
          { dag: "Dag 3", omschrijving: "Tempo Shuttles: 3x 4 min op trap (record - 2)", type: "Training", oefening_id: "beeptest_tempo_shuttles" }
      ]},
      { week_nummer: 2, doel_van_de_week: "Snelheid en efficiëntie.", taken: [
          { dag: "Dag 1", omschrijving: "Interval: 10x 200m sprint, 60s rust", type: "Training", oefening_id: "beeptest_interval_vo2max" },
          { dag: "Dag 2", omschrijving: "Duurloop: 40 min rustig", type: "Herstel", oefening_id: "beeptest_duurloop_basis" },
          { dag: "Dag 3", omschrijving: "Techniektraining: 20 min focus op explosief keren", type: "Techniek", oefening_id: "beeptest_shuttle_techniek" }
      ]},
      { week_nummer: 3, doel_van_de_week: "Wedstrijdhardheid.", taken: [
          { dag: "Dag 1", omschrijving: "Interval: 4x 800m op hoog tempo, 2 min rust", type: "Training", oefening_id: "beeptest_interval_vo2max" },
          { dag: "Dag 2", omschrijving: "Duurloop: 30 min rustig", type: "Herstel", oefening_id: "beeptest_duurloop_basis" },
          { dag: "Dag 3", omschrijving: "Testsimulatie: Volledige beeptest tot je maximum.", type: "Meting", oefening_id: "beeptest_simulatie" }
      ]},
      { week_nummer: 4, doel_van_de_week: "Herstel en supercompensatie.", taken: [
          { dag: "Dag 1", omschrijving: "Duurloop: 20 min zeer rustig", type: "Herstel", oefening_id: "beeptest_duurloop_basis" },
          { dag: "Dag 2", omschrijving: "Volledige rust", type: "Herstel" },
          { dag: "Dag 3", omschrijving: "Techniektraining: 15 min rustig met focus op keren", type: "Techniek", oefening_id: "beeptest_shuttle_techniek" }
      ]},
      { week_nummer: 5, doel_van_de_week: "Intensiteitspiek.", taken: [
          { dag: "Dag 1", omschrijving: "Interval: 8x 400m op hoog tempo, 60s rust", type: "Training", oefening_id: "beeptest_interval_vo2max" },
          { dag: "Dag 2", omschrijving: "Duurloop: 30 min rustig", type: "Herstel", oefening_id: "beeptest_duurloop_basis" },
          { dag: "Dag 3", omschrijving: "Tempo Shuttles: 2x 6 min op trap (record - 1)", type: "Training", oefening_id: "beeptest_tempo_shuttles" }
      ]},
      { week_nummer: 6, doel_van_de_week: "Tapering en de test.", taken: [
          { dag: "Dag 1", omschrijving: "15 min zeer rustig joggen", type: "Herstel" },
          { dag: "Dag 2", omschrijving: "Volledige Rust", type: "Herstel" },
          { dag: "Testdag", omschrijving: "Volledige beeptest tot je maximum.", type: "Meting", oefening_id: "beeptest_simulatie" }
      ]}
    ]
  },
  // Schema voor Experts
  'schema_beeptest_expert_6weken': {
    naam: "Beeptest Elite (6 Weken)",
    duur_weken: 6,
    categorie: "Prestatie",
    omschrijving: "Een geavanceerd 6-wekenplan voor atleten die mikken op een topscore, met focus op VO₂-max en explosiviteit.",
    gekoppelde_test_id: "beeptest",
    weken: [
      { week_nummer: 1, doel_van_de_week: "Volume en VO₂-Max.", taken: [
          { dag: "Dag 1", omschrijving: "Interval: 10x 400m sneller dan doeltempo, 60s rust", type: "Training", oefening_id: "beeptest_interval_vo2max" },
          { dag: "Dag 2", omschrijving: "Duurloop: 45 min rustig", type: "Herstel", oefening_id: "beeptest_duurloop_basis" },
          { dag: "Dag 3", omschrijving: "Tempo Shuttles: 3x 5 min op recordtempo", type: "Training", oefening_id: "beeptest_tempo_shuttles" },
          { dag: "Dag 4", omschrijving: "Plyometrie: 20 min explosieve krachtoefeningen", type: "Kracht", oefening_id: "beeptest_plyometrie_kracht" }
      ]},
      { week_nummer: 2, doel_van_de_week: "Kracht en snelheidsweerstand.", taken: [
          { dag: "Dag 1", omschrijving: "Interval: 5x 1000m op hoog tempo, 2 min rust", type: "Training", oefening_id: "beeptest_interval_vo2max" },
          { dag: "Dag 2", omschrijving: "Duurloop: 50 min rustig", type: "Herstel", oefening_id: "beeptest_duurloop_basis" },
          { dag: "Dag 3", omschrijving: "Techniektraining + Plyo: 15 min shuttles + 15 min kracht", type: "Techniek", oefening_id: "beeptest_plyometrie_kracht" },
          { dag: "Dag 4", omschrijving: "Herstelloop: 25 min zeer rustig", type: "Herstel", oefening_id: "beeptest_duurloop_basis" }
      ]},
      { week_nummer: 3, doel_van_de_week: "Wedstrijdhardheid.", taken: [
          { dag: "Dag 1", omschrijving: "Interval: 12x 300m 'all-out', 90s rust", type: "Training", oefening_id: "beeptest_interval_vo2max" },
          { dag: "Dag 2", omschrijving: "Duurloop: 40 min rustig", type: "Herstel", oefening_id: "beeptest_duurloop_basis" },
          { dag: "Dag 3", omschrijving: "Testsimulatie: Volledige beeptest tot je maximum.", type: "Meting", oefening_id: "beeptest_simulatie" },
          { dag: "Dag 4", omschrijving: "Volledige rust", type: "Herstel" }
      ]},
      { week_nummer: 4, doel_van_de_week: "Herstel en supercompensatie.", taken: [
          { dag: "Dag 1", omschrijving: "Duurloop: 25 min zeer rustig", type: "Herstel", oefening_id: "beeptest_duurloop_basis" },
          { dag: "Dag 2", omschrijving: "Volledige rust", type: "Herstel" },
          { dag: "Dag 3", omschrijving: "Techniektraining: 20 min rustig, focus op perfecte keren", type: "Techniek", oefening_id: "beeptest_shuttle_techniek" },
          { dag: "Dag 4", omschrijving: "Duurloop: 30 min rustig", type: "Herstel", oefening_id: "beeptest_duurloop_basis" }
      ]},
      { week_nummer: 5, doel_van_de_week: "Finale Piek.", taken: [
          { dag: "Dag 1", omschrijving: "Interval: 8x 400m sneller dan doeltempo, 60s rust", type: "Training", oefening_id: "beeptest_interval_vo2max" },
          { dag: "Dag 2", omschrijving: "Duurloop: 30 min rustig", type: "Herstel", oefening_id: "beeptest_duurloop_basis" },
          { dag: "Dag 3", omschrijving: "Tempo Shuttles: 8 min continu op trap (record)", type: "Training", oefening_id: "beeptest_tempo_shuttles" },
          { dag: "Dag 4", omschrijving: "Volledige rust", type: "Herstel" }
      ]},
      { week_nummer: 6, doel_van_de_week: "Tapering en de test.", taken: [
          { dag: "Dag 1", omschrijving: "15 min zeer rustig joggen + 4x strides", type: "Herstel" },
          { dag: "Dag 2", omschrijving: "Volledige Rust", type: "Herstel" },
          { dag: "Dag 3", omschrijving: "Volledige Rust", type: "Herstel" },
          { dag: "Testdag", omschrijving: "Volledige beeptest voor een nieuw record.", type: "Meting", oefening_id: "beeptest_simulatie" }
      ]}
    ]
  }
};
async function importData() {
  console.log('Start import van beeptest-oefeningen...');
  for (const [id, data] of Object.entries(oefeningen)) {
    await db.collection('oefeningen').doc(id).set(data);
    console.log(`✅ Oefening '${id}' toegevoegd.`);
  }
  console.log('Alle oefeningen zijn geïmporteerd!');

  console.log('\nStart import van beeptest-trainingsschema\'s...');
  for (const [id, data] of Object.entries(trainingsschemas)) {
    await db.collection('trainingsschemas').doc(id).set(data);
    console.log(`✅ Schema '${id}' toegevoegd.`);
  }
  console.log('Trainingsschema\'s zijn geïmporteerd!');
  
  console.log('\n🎉 Import voltooid!');
}

importData();