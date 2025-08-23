// import_normen_pullup.js
import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// --- DATA VOOR DE 'normen' COLLECTIE ---
const normen = {
  'normen_pull_up_jeugd_m': { // <-- Leesbare ID
    "test_id": "pull_up",
    "school_id": "ka_beveren", // Pas aan indien nodig
    "score_richting": "hoog",
    "punten_schaal": [
      // Jongens 14 jaar
      { geslacht: "M", leeftijd: 14, punt: 1, score_min: 1 },
      { geslacht: "M", leeftijd: 14, punt: 2, score_min: 1 },
      { geslacht: "M", leeftijd: 14, punt: 3, score_min: 2 },
      { geslacht: "M", leeftijd: 14, punt: 4, score_min: 2 },
      { geslacht: "M", leeftijd: 14, punt: 5, score_min: 3 },
      { geslacht: "M", leeftijd: 14, punt: 6, score_min: 3 },
      { geslacht: "M", leeftijd: 14, punt: 7, score_min: 4 },
      { geslacht: "M", leeftijd: 14, punt: 8, score_min: 4 },
      { geslacht: "M", leeftijd: 14, punt: 9, score_min: 5 },
      { geslacht: "M", leeftijd: 14, punt: 10, score_min: 5 },
      { geslacht: "M", leeftijd: 14, punt: 11, score_min: 6 },
      { geslacht: "M", leeftijd: 14, punt: 12, score_min: 6 },
      { geslacht: "M", leeftijd: 14, punt: 13, score_min: 7 },
      { geslacht: "M", leeftijd: 14, punt: 14, score_min: 7 },
      { geslacht: "M", leeftijd: 14, punt: 15, score_min: 8 },
      { geslacht: "M", leeftijd: 14, punt: 16, score_min: 9 },
      { geslacht: "M", leeftijd: 14, punt: 17, score_min: 10 },
      { geslacht: "M", leeftijd: 14, punt: 18, score_min: 11 },
      { geslacht: "M", leeftijd: 14, punt: 19, score_min: 12 },
      { geslacht: "M", leeftijd: 14, punt: 20, score_min: 13 },
      // Jongens 15 jaar
      { geslacht: "M", leeftijd: 15, punt: 1, score_min: 1 },
      { geslacht: "M", leeftijd: 15, punt: 2, score_min: 2 },
      { geslacht: "M", leeftijd: 15, punt: 3, score_min: 2 },
      { geslacht: "M", leeftijd: 15, punt: 4, score_min: 3 },
      { geslacht: "M", leeftijd: 15, punt: 5, score_min: 3 },
      { geslacht: "M", leeftijd: 15, punt: 6, score_min: 4 },
      { geslacht: "M", leeftijd: 15, punt: 7, score_min: 5 },
      { geslacht: "M", leeftijd: 15, punt: 8, score_min: 5 },
      { geslacht: "M", leeftijd: 15, punt: 9, score_min: 6 },
      { geslacht: "M", leeftijd: 15, punt: 10, score_min: 6 },
      { geslacht: "M", leeftijd: 15, punt: 11, score_min: 7 },
      { geslacht: "M", leeftijd: 15, punt: 12, score_min: 8 },
      { geslacht: "M", leeftijd: 15, punt: 13, score_min: 8 },
      { geslacht: "M", leeftijd: 15, punt: 14, score_min: 9 },
      { geslacht: "M", leeftijd: 15, punt: 15, score_min: 10 },
      { geslacht: "M", leeftijd: 15, punt: 16, score_min: 11 },
      { geslacht: "M", leeftijd: 15, punt: 17, score_min: 12 },
      { geslacht: "M", leeftijd: 15, punt: 18, score_min: 13 },
      { geslacht: "M", leeftijd: 15, punt: 19, score_min: 14 },
      { geslacht: "M", leeftijd: 15, punt: 20, score_min: 15 },
      // Jongens 16 jaar
      { geslacht: "M", leeftijd: 16, punt: 1, score_min: 1 },
      { geslacht: "M", leeftijd: 16, punt: 2, score_min: 2 },
      { geslacht: "M", leeftijd: 16, punt: 3, score_min: 3 },
      { geslacht: "M", leeftijd: 16, punt: 4, score_min: 4 },
      { geslacht: "M", leeftijd: 16, punt: 5, score_min: 4 },
      { geslacht: "M", leeftijd: 16, punt: 6, score_min: 5 },
      { geslacht: "M", leeftijd: 16, punt: 7, score_min: 6 },
      { geslacht: "M", leeftijd: 16, punt: 8, score_min: 7 },
      { geslacht: "M", leeftijd: 16, punt: 9, score_min: 8 },
      { geslacht: "M", leeftijd: 16, punt: 10, score_min: 9 },
      { geslacht: "M", leeftijd: 16, punt: 11, score_min: 9 },
      { geslacht: "M", leeftijd: 16, punt: 12, score_min: 10 },
      { geslacht: "M", leeftijd: 16, punt: 13, score_min: 11 },
      { geslacht: "M", leeftijd: 16, punt: 14, score_min: 12 },
      { geslacht: "M", leeftijd: 16, punt: 15, score_min: 13 },
      { geslacht: "M", leeftijd: 16, punt: 16, score_min: 14 },
      { geslacht: "M", leeftijd: 16, punt: 17, score_min: 15 },
      { geslacht: "M", leeftijd: 16, punt: 18, score_min: 16 },
      { geslacht: "M", leeftijd: 16, punt: 19, score_min: 17 },
      { geslacht: "M", leeftijd: 16, punt: 20, score_min: 18 },
      // Jongens 17 jaar (gebaseerd op jouw input)
      { geslacht: "M", leeftijd: 17, punt: 1, score_min: 1 },
      { geslacht: "M", leeftijd: 17, punt: 2, score_min: 2 },
      { geslacht: "M", leeftijd: 17, punt: 3, score_min: 3 },
      { geslacht: "M", leeftijd: 17, punt: 4, score_min: 4 },
      { geslacht: "M", leeftijd: 17, punt: 5, score_min: 5 },
      { geslacht: "M", leeftijd: 17, punt: 6, score_min: 6 },
      { geslacht: "M", leeftijd: 17, punt: 7, score_min: 7 }, // Grens 'redelijk'
      { geslacht: "M", leeftijd: 17, punt: 8, score_min: 7 },
      { geslacht: "M", leeftijd: 17, punt: 9, score_min: 8 },
      { geslacht: "M", leeftijd: 17, punt: 10, score_min: 9 },
      { geslacht: "M", leeftijd: 17, punt: 11, score_min: 10 }, // Grens 'goed'
      { geslacht: "M", leeftijd: 17, punt: 12, score_min: 10 },
      { geslacht: "M", leeftijd: 17, punt: 13, score_min: 11 },
      { geslacht: "M", leeftijd: 17, punt: 14, score_min: 12 },
      { geslacht: "M", leeftijd: 17, punt: 15, score_min: 12 },
      { geslacht: "M", leeftijd: 17, punt: 16, score_min: 13 }, // Grens 'zeer goed'
      { geslacht: "M", leeftijd: 17, punt: 17, score_min: 14 },
      { geslacht: "M", leeftijd: 17, punt: 18, score_min: 15 },
      { geslacht: "M", leeftijd: 17, punt: 19, score_min: 17 },
      { geslacht: "M", leeftijd: 17, punt: 20, score_min: 20 }
    ]
  }
};

async function importNormenData() {
  console.log('Start import van pull-up normen...');
  for (const [id, data] of Object.entries(normen)) {
    await db.collection('normen').doc(id).set(data);
    console.log(`✅ Normen '${id}' toegevoegd.`);
  }
  
  console.log('\n🎉 Import voltooid!');
}

importNormenData();