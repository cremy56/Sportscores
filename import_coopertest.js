// import_coopertest.js
import admin from 'firebase-admin';
import { createRequire } from 'module';

// Deze setup is nodig om JSON-bestanden te kunnen importeren in een ES Module
const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// --- DATA VOOR DE 'oefeningen' COLLECTIE ---
const oefeningen = {
  'lopen_interval_vo2max': {
    naam: "Interval Training (VO2 Max)",
    categorie: "Uithouding",
    beschrijving: "Een High-Intensity Interval Training (HIIT) ontworpen om de maximale zuurstofopname (VO2 max) te verhogen. Dit is cruciaal voor betere prestaties op de Coopertest.",
    visuele_media_url: "https://i.imgur.com/4J9c2oG.gif",
    instructies: [
      "Begin met een warming-up van 5-10 minuten (licht joggen).",
      "Loop de aangegeven intervaltijd op een zeer hoog tempo (ongeveer 90% van je maximale inspanning).",
      "Wandel of jog heel rustig tijdens de aangegeven rustperiode.",
      "Herhaal de cyclus voor het aangegeven aantal sets.",
      "Eindig met een cooling-down van 5 minuten (wandelen en stretchen)."
    ]
  },
  'lopen_tempo_lactaatdrempel': {
    naam: "Tempo Run (Lactaatdrempel)",
    categorie: "Uithouding",
    beschrijving: "Een training op een 'comfortabel zwaar' tempo. Dit verhoogt je lactaatdrempel, waardoor je lichaam verzuring langer kan uitstellen en je een hoger tempo kunt volhouden.",
    visuele_media_url: "https://i.imgur.com/yThgS2C.gif",
    instructies: [
      "Start met een warming-up van 5-10 minuten (licht joggen).",
      "Loop de aangegeven tijd op een constant, stevig tempo. Je moet nog kunnen praten, maar niet in volledige zinnen.",
      "Dit tempo moet aanvoelen als een 7 op een schaal van 10 qua inspanning.",
      "Eindig met een cooling-down van 5-10 minuten."
    ]
  },
  'lopen_duurloop_aerobe_basis': {
    naam: "Duurloop (Aerobe Basis)",
    categorie: "Uithouding",
    beschrijving: "Een lange, rustige loop (Long Slow Distance) om je algemene uithoudingsvermogen en de efficiëntie van je hart en longen te verbeteren. Het tempo moet heel comfortabel zijn.",
    visuele_media_url: "https://i.imgur.com/u4zQ8X3.gif",
    instructies: [
      "Loop op een rustig, constant tempo waarbij je een volledig gesprek kunt voeren.",
      "Focus op de duur van de training, niet op de snelheid of de afstand.",
      "Dit is de basis van je uithoudingsvermogen."
    ]
  }
};

// --- DATA VOOR DE 'trainingsschemas' COLLECTIE ---
const trainingsschemas = {
  'schema_coopertest_6weken': {
    naam: "6-Weken Coopertest Plan",
    duur_weken: 6,
    categorie: "Uithouding",
    omschrijving: "Een progressief 6-wekenplan om je prestatie op de 12-minuten Coopertest te maximaliseren door het verbeteren van VO2 max en lactaatdrempel.",
    gekoppelde_test_id: "78DkiRMdmFbKL8W6TEnC",
    weken: [
      { week_nummer: 1, doel_van_de_week: "Basis leggen en wennen aan de verschillende trainingsvormen.", taken: [ { dag: "Dag 1", omschrijving: "Interval Training: 4 sets van 400m lopen, met 400m wandel-rust ertussen.", type: "Training", oefening_id: "lopen_interval_vo2max" }, { dag: "Dag 2", omschrijving: "Actieve Rust: Wandelen of lichte stretching.", type: "Herstel" }, { dag: "Dag 3", omschrijving: "Duurloop: 20 minuten op een rustig tempo.", type: "Training", oefening_id: "lopen_duurloop_aerobe_basis" } ] },
      { week_nummer: 2, doel_van_de_week: "Volume en intensiteit licht opbouwen.", taken: [ { dag: "Dag 1", omschrijving: "Interval Training: 5 sets van 400m lopen, met 400m wandel-rust.", type: "Training", oefening_id: "lopen_interval_vo2max" }, { dag: "Dag 2", omschrijving: "Actieve Rust.", type: "Herstel" }, { dag: "Dag 3", omschrijving: "Tempo Run: 10 minuten op een stevig, constant tempo.", type: "Training", oefening_id: "lopen_tempo_lactaatdrempel" } ] },
      { week_nummer: 3, doel_van_de_week: "Verder bouwen op de lactaatdrempel en VO2 max.", taken: [ { dag: "Dag 1", omschrijving: "Interval Training: 6 sets van 400m lopen, met 400m wandel-rust.", type: "Training", oefening_id: "lopen_interval_vo2max" }, { dag: "Dag 2", omschrijving: "Actieve Rust.", type: "Herstel" }, { dag: "Dag 3", omschrijving: "Duurloop: 25 minuten op een rustig tempo.", type: "Training", oefening_id: "lopen_duurloop_aerobe_basis" } ] },
      { week_nummer: 4, doel_van_de_week: "Rustweek (Deload): het lichaam laten herstellen en supercompenseren.", taken: [ { dag: "Dag 1", omschrijving: "Lichte Training: 15 minuten heel rustig joggen.", type: "Herstel" }, { dag: "Dag 2", omschrijving: "Volledige Rust.", type: "Herstel" }, { dag: "Dag 3", omschrijving: "Lichte Training: 2 sets van 400m op tempo, verder rustig joggen.", type: "Herstel" } ] },
      { week_nummer: 5, doel_van_de_week: "Intensiteitspiek: je lichaam voorbereiden op de test.", taken: [ { dag: "Dag 1", omschrijving: "Interval Training: 3 sets van 800m lopen op hoog tempo, met 400m wandel-rust.", type: "Training", oefening_id: "lopen_interval_vo2max" }, { dag: "Dag 2", omschrijving: "Actieve Rust.", type: "Herstel" }, { dag: "Dag 3", omschrijving: "Tempo Run: 15 minuten op een stevig, constant tempo.", type: "Training", oefening_id: "lopen_tempo_lactaatdrempel" } ] },
      { week_nummer: 6, doel_van_de_week: "Tapering en de test: volledig herstellen om maximaal te presteren.", taken: [ { dag: "Dag 1", omschrijving: "Zeer lichte training: 10 min rustig joggen met 2x 100m versnelling.", type: "Herstel" }, { dag: "Dag 2", omschrijving: "Volledige Rust.", type: "Herstel" }, { dag: "Dag 3", omschrijving: "DE COOPERTEST: Warming-up, 12 minuten alles geven, en cooling-down.", type: "Meting" } ] }
    ]
  }
};

async function importData() {
  console.log('Start import van Coopertest-oefeningen...');
  for (const [id, data] of Object.entries(oefeningen)) {
    await db.collection('oefeningen').doc(id).set(data);
    console.log(`✅ Oefening '${id}' toegevoegd.`);
  }
  console.log('Alle oefeningen zijn geïmporteerd!');

  console.log('\nStart import van Coopertest-trainingsschema...');
  for (const [id, data] of Object.entries(trainingsschemas)) {
    await db.collection('trainingsschemas').doc(id).set(data);
    console.log(`✅ Schema '${id}' toegevoegd.`);
  }
  console.log('Trainingsschema is geïmporteerd!');
  
  console.log('\n🎉 Import voltooid!');
}

importData();