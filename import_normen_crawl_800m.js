// import_normen_crawl_800m.js
// Aangepast script om 'score_max' te wijzigen in 'score_min'

import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

// Voorkom dubbele initialisatie als dit script wordt gecombineerd met andere
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// --- DATA VOOR DE 'normen' COLLECTIE (MET score_min) ---
const normen = {
  'normen_crawl_800m': {
    "test_id": "crawl_800m",
    "school_id": "ka_beveren", // Pas aan indien nodig
    "score_richting": "laag", // Een lagere score (tijd in seconden) is beter
    "punten_schaal": [
      // Meisjes 16 jaar (5 TLO) - Tijden in seconden
      { geslacht: "V", leeftijd: 16, punt: 20, score_min: 1020 }, // 17.00'
      { geslacht: "V", leeftijd: 16, punt: 19, score_min: 1050 }, // 17.30'
      { geslacht: "V", leeftijd: 16, punt: 18, score_min: 1080 }, // 18.00'
      { geslacht: "V", leeftijd: 16, punt: 17, score_min: 1110 }, // 18.30'
      { geslacht: "V", leeftijd: 16, punt: 16, score_min: 1140 }, // 19.00'
      { geslacht: "V", leeftijd: 16, punt: 15, score_min: 1170 }, // 19.30'
      { geslacht: "V", leeftijd: 16, punt: 14, score_min: 1200 }, // 20.00'
      { geslacht: "V", leeftijd: 16, punt: 13, score_min: 1230 }, // 20.30'
      { geslacht: "V", leeftijd: 16, punt: 12, score_min: 1260 }, // 21.00'
      { geslacht: "V", leeftijd: 16, punt: 11, score_min: 1290 }, // 21.30'
      { geslacht: "V", leeftijd: 16, punt: 10, score_min: 1320 }, // 22.00'
      { geslacht: "V", leeftijd: 16, punt: 9, score_min: 1350 }, // 22.30'
      { geslacht: "V", leeftijd: 16, punt: 8, score_min: 1380 }, // 23.00'
      { geslacht: "V", leeftijd: 16, punt: 7, score_min: 1410 }, // 23.30'
      { geslacht: "V", leeftijd: 16, punt: 6, score_min: 1440 }, // 24.00'
      { geslacht: "V", leeftijd: 16, punt: 5, score_min: 1470 }, // 24.30'
      { geslacht: "V", leeftijd: 16, punt: 4, score_min: 1500 }, // 25.00'
      { geslacht: "V", leeftijd: 16, punt: 3, score_min: 1530 }, // 25.30'
      { geslacht: "V", leeftijd: 16, punt: 2, score_min: 1560 }, // 26.00'
      { geslacht: "V", leeftijd: 16, punt: 1, score_min: 1590 }, // 26.30'
      { geslacht: "V", leeftijd: 16, punt: 0, score_min: 1620 }, // 27.00'
      // Meisjes 17 jaar (6 TLO) - Tijden in seconden
      { geslacht: "V", leeftijd: 17, punt: 20, score_min: 990 }, // 16.30'
      { geslacht: "V", leeftijd: 17, punt: 19, score_min: 1005 }, // 16.45'
      { geslacht: "V", leeftijd: 17, punt: 18, score_min: 1020 }, // 17.00'
      { geslacht: "V", leeftijd: 17, punt: 17, score_min: 1035 }, // 17.15'
      { geslacht: "V", leeftijd: 17, punt: 16, score_min: 1050 }, // 17.30'
      { geslacht: "V", leeftijd: 17, punt: 15, score_min: 1065 }, // 17.45'
      { geslacht: "V", leeftijd: 17, punt: 14, score_min: 1080 }, // 18.00'
      { geslacht: "V", leeftijd: 17, punt: 13, score_min: 1095 }, // 18.15'
      { geslacht: "V", leeftijd: 17, punt: 12, score_min: 1110 }, // 18.30'
      { geslacht: "V", leeftijd: 17, punt: 11, score_min: 1125 }, // 18.45'
      { geslacht: "V", leeftijd: 17, punt: 10, score_min: 1140 }, // 19.00'
      { geslacht: "V", leeftijd: 17, punt: 9, score_min: 1170 }, // 19.30'
      { geslacht: "V", leeftijd: 17, punt: 8, score_min: 1200 }, // 20.00'
      { geslacht: "V", leeftijd: 17, punt: 7, score_min: 1230 }, // 20.30'
      { geslacht: "V", leeftijd: 17, punt: 6, score_min: 1260 }, // 21.00'
      { geslacht: "V", leeftijd: 17, punt: 5, score_min: 1290 }, // 21.30'
      { geslacht: "V", leeftijd: 17, punt: 4, score_min: 1320 }, // 22.00'
      { geslacht: "V", leeftijd: 17, punt: 3, score_min: 1350 }, // 22.30'
      { geslacht: "V", leeftijd: 17, punt: 2, score_min: 1380 }, // 23.00'
      { geslacht: "V", leeftijd: 17, punt: 1, score_min: 1410 }, // 23.30'
      { geslacht: "V", leeftijd: 17, punt: 0, score_min: 1440 }, // 24.00'
      // Jongens 16 jaar (5 TLO) - Tijden in seconden
      { geslacht: "M", leeftijd: 16, punt: 20, score_min: 900 }, // 15.00'
      { geslacht: "M", leeftijd: 16, punt: 19, score_min: 930 }, // 15.30'
      { geslacht: "M", leeftijd: 16, punt: 18, score_min: 960 }, // 16.00'
      { geslacht: "M", leeftijd: 16, punt: 17, score_min: 990 }, // 16.30'
      { geslacht: "M", leeftijd: 16, punt: 16, score_min: 1020 }, // 17.00'
      { geslacht: "M", leeftijd: 16, punt: 15, score_min: 1050 }, // 17.30'
      { geslacht: "M", leeftijd: 16, punt: 14, score_min: 1080 }, // 18.00'
      { geslacht: "M", leeftijd: 16, punt: 13, score_min: 1110 }, // 18.30'
      { geslacht: "M", leeftijd: 16, punt: 12, score_min: 1140 }, // 19.00'
      { geslacht: "M", leeftijd: 16, punt: 11, score_min: 1170 }, // 19.30'
      { geslacht: "M", leeftijd: 16, punt: 10, score_min: 1200 }, // 20.00'
      { geslacht: "M", leeftijd: 16, punt: 9, score_min: 1230 }, // 20.30'
      { geslacht: "M", leeftijd: 16, punt: 8, score_min: 1260 }, // 21.00'
      { geslacht: "M", leeftijd: 16, punt: 7, score_min: 1290 }, // 21.30'
      { geslacht: "M", leeftijd: 16, punt: 6, score_min: 1320 }, // 22.00'
      { geslacht: "M", leeftijd: 16, punt: 5, score_min: 1350 }, // 22.30'
      { geslacht: "M", leeftijd: 16, punt: 4, score_min: 1380 }, // 23.00'
      { geslacht: "M", leeftijd: 16, punt: 3, score_min: 1410 }, // 23.30'
      { geslacht: "M", leeftijd: 16, punt: 2, score_min: 1440 }, // 24.00'
      { geslacht: "M", leeftijd: 16, punt: 1, score_min: 1470 }, // 24.30'
      { geslacht: "M", leeftijd: 16, punt: 0, score_min: 1500 }, // 25.00'
      // Jongens 17 jaar (6 TLO) - Tijden in seconden
      { geslacht: "M", leeftijd: 17, punt: 20, score_min: 870 }, // 14.30'
      { geslacht: "M", leeftijd: 17, punt: 19, score_min: 885 }, // 14.45'
      { geslacht: "M", leeftijd: 17, punt: 18, score_min: 900 }, // 15.00'
      { geslacht: "M", leeftijd: 17, punt: 17, score_min: 915 }, // 15.15'
      { geslacht: "M", leeftijd: 17, punt: 16, score_min: 930 }, // 15.30'
      { geslacht: "M", leeftijd: 17, punt: 15, score_min: 945 }, // 15.45'
      { geslacht: "M", leeftijd: 17, punt: 14, score_min: 960 }, // 16.00'
      { geslacht: "M", leeftijd: 17, punt: 13, score_min: 975 }, // 16.15'
      { geslacht: "M", leeftijd: 17, punt: 12, score_min: 990 }, // 16.30'
      { geslacht: "M", leeftijd: 17, punt: 11, score_min: 1005 }, // 16.45'
      { geslacht: "M", leeftijd: 17, punt: 10, score_min: 1020 }, // 17.00'
      { geslacht: "M", leeftijd: 17, punt: 9, score_min: 1050 }, // 17.30'
      { geslacht: "M", leeftijd: 17, punt: 8, score_min: 1080 }, // 18.00'
      { geslacht: "M", leeftijd: 17, punt: 7, score_min: 1110 }, // 18.30'
      { geslacht: "M", leeftijd: 17, punt: 6, score_min: 1140 }, // 19.00'
      { geslacht: "M", leeftijd: 17, punt: 5, score_min: 1170 }, // 19.30'
      { geslacht: "M", leeftijd: 17, punt: 4, score_min: 1200 }, // 20.00'
      { geslacht: "M", leeftijd: 17, punt: 3, score_min: 1230 }, // 20.30'
      { geslacht: "M", leeftijd: 17, punt: 2, score_min: 1260 }, // 21.00'
      { geslacht: "M", leeftijd: 17, punt: 1, score_min: 1290 }, // 21.30'
      { geslacht: "M", leeftijd: 17, punt: 0, score_min: 1320 }  // 22.00'
    ]
  }
};

async function importNormenData() {
  console.log('Start update van 800m crawl normen (naar score_min)...');
  for (const [id, data] of Object.entries(normen)) {
    await db.collection('normen').doc(id).set(data);
    console.log(`✅ Normen '${id}' geüpdatet.`);
  }
  
  console.log('\n🎉 Update voltooid!');
}

importNormenData();