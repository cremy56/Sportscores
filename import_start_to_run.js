// import_start_to_run.js
import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// --- DATA VOOR DE 'oefeningen' COLLECTIE ---
const oefeningen = {
  'lopen_interval_starttorun': {
    naam: "Start to Run - Intervaltraining",
    categorie: "Uithouding",
    beschrijving: "Een intervaltraining waarbij periodes van rustig joggen worden afgewisseld met wandelpauzes om het uithoudingsvermogen progressief op te bouwen.",
    visuele_media_url: "https://i.imgur.com/4J9c2oG.gif",
    instructies: [
      "Begin altijd met 5 minuten stevig wandelen als warming-up.",
      "Volg de specifieke loop- en wandelintervallen zoals aangegeven in het schema voor die week.",
      "Houd een comfortabel tempo aan tijdens het lopen waarbij je nog zou kunnen praten.",
      "Gebruik de wandelperiodes om actief te herstellen.",
      "Eindig altijd met 5 minuten rustig wandelen als cooling-down."
    ]
  },
  'lopen_duurloop_basis': {
    naam: "Start to Run - Duurloop",
    categorie: "Uithouding",
    beschrijving: "Een ononderbroken loop op een rustig en constant tempo om de aerobe basis en het duurvermogen te versterken.",
    visuele_media_url: "https://i.imgur.com/u4zQ8X3.gif",
    instructies: [
      "Begin altijd met 5 minuten stevig wandelen als warming-up.",
      "Loop de volledige aangegeven duur op een rustig, constant tempo.",
      "Focus op het volhouden van de tijd, niet op de snelheid.",
      "Eindig altijd met 5 minuten rustig wandelen als cooling-down."
    ]
  }
};

// --- DATA VOOR DE 'trainingsschemas' COLLECTIE ---
const trainingsschemas = {
  'schema_start_to_run_5km_10weken': {
    naam: "Start to Run 5km (10 Weken)",
    duur_weken: 10,
    categorie: "Uithouding",
    omschrijving: "Een progressief 10-wekenplan om beginners op te bouwen naar het lopen van 5 kilometer of 30 minuten aan één stuk.",
    gekoppelde_test_id: "5km", // <-- PAS DEZE ID AAN!
    weken: [
      { week_nummer: 1, doel_van_de_week: "Wennen aan de impact van het lopen.", taken: [ { dag: "Training 1, 2 & 3", omschrijving: "8x (1 min lopen, 2 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" } ] },
      { week_nummer: 2, doel_van_de_week: "De loopintervallen verlengen.", taken: [ { dag: "Training 1, 2 & 3", omschrijving: "7x (2 min lopen, 2 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" } ] },
      { week_nummer: 3, doel_van_de_week: "Meer lopen dan wandelen.", taken: [ { dag: "Training 1, 2 & 3", omschrijving: "6x (3 min lopen, 2 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" } ] },
      { week_nummer: 4, doel_van_de_week: "Het uithoudingsvermogen verder opbouwen.", taken: [ { dag: "Training 1, 2 & 3", omschrijving: "5x (4 min lopen, 2 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" } ] },
      { week_nummer: 5, doel_van_de_week: "Langere loopblokken aan kunnen.", taken: [ { dag: "Training 1, 2 & 3", omschrijving: "4x (5 min lopen, 2 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" } ] },
      { week_nummer: 6, doel_van_de_week: "De wandelpauzes aanzienlijk verkorten.", taken: [ { dag: "Training 1, 2 & 3", omschrijving: "3x (8 min lopen, 2 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" } ] },
      { week_nummer: 7, doel_van_de_week: "Trainen op bijna continue loopblokken.", taken: [ { dag: "Training 1, 2 & 3", omschrijving: "2x (12 min lopen, 1 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" } ] },
      { week_nummer: 8, doel_van_de_week: "De eerste ononderbroken duurloop.", taken: [ { dag: "Training 1, 2 & 3", omschrijving: "20 minuten lopen zonder wandelpauzes.", type: "Training", oefening_id: "lopen_duurloop_basis" } ] },
      { week_nummer: 9, doel_van_de_week: "De duur verder opbouwen richting de 5km.", taken: [ { dag: "Training 1, 2 & 3", omschrijving: "25 minuten lopen zonder wandelpauzes.", type: "Training", oefening_id: "lopen_duurloop_basis" } ] },
      { week_nummer: 10, doel_van_de_week: "De eindtest: 30 minuten of 5km lopen.", taken: [ { dag: "Testdag", omschrijving: "Loop 30 minuten aan één stuk of tot je 5km hebt bereikt.", type: "Meting", oefening_id: "lopen_duurloop_basis" } ] }
    ]
  }
};

async function importData() {
  console.log('Start import van Start-to-Run oefeningen...');
  for (const [id, data] of Object.entries(oefeningen)) {
    await db.collection('oefeningen').doc(id).set(data);
    console.log(`✅ Oefening '${id}' toegevoegd.`);
  }
  console.log('Alle oefeningen zijn geïmporteerd!');

  console.log('\nStart import van Start-to-Run trainingsschema...');
  for (const [id, data] of Object.entries(trainingsschemas)) {
    await db.collection('trainingsschemas').doc(id).set(data);
    console.log(`✅ Schema '${id}' toegevoegd.`);
  }
  console.log('Trainingsschema is geïmporteerd!');
  
  console.log('\n🎉 Import voltooid!');
}

importData();