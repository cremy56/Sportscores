// import_test_crawl_800m.js
import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

// Voorkom dubbele initialisatie
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// --- DATA VOOR DE NIEUWE TEST ---
const nieuweTest = {
  'crawl_800m': {
    naam: "800m crawl",
    beschrijving: "Doel: Zwem 800 meter crawl zo snel mogelijk. Procedure: 1. Deelnemers starten in het water of met een startduik. 2. De chronometer start op het startsignaal. 3. De afstand is 800 meter (bv. 32 baantjes in een 25m-bad). 4. De tijd stopt wanneer de zwemmer de muur aantikt na het voltooien van de 800 meter. Benodigdheden: Zwembad, een chronometer.",
    categorie: "Uithouding",
    eenheid: "sec",
    score_richting: "laag",
    max_punten: 20,
    is_actief: true,
    school_id: "ka_beveren",
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    last_updated_at: admin.firestore.FieldValue.serverTimestamp()
  }
};

async function importTest() {
  console.log('Start import van nieuwe test...');
  for (const [id, data] of Object.entries(nieuweTest)) {
    await db.collection('testen').doc(id).set(data);
    console.log(`✅ Test '${id}' toegevoegd aan de 'testen' collectie.`);
  }
  
  console.log('\n🎉 Import voltooid!');
}

importTest();