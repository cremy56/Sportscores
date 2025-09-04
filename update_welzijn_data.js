// update_welzijn_data.js
import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

// Initialiseer de Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// --- CONFIGURATIE ---
const USER_ID = 'u2yfNRhRbKN7gxjc5vcvLObmoZP2';

// --- DATA DIE TOEGEVOEGD MOET WORDEN ---

// BELANGRIJK: Gebruik hier de datums die overeenkomen met je EERSTE import.
const dagelijkseDataUpdates = {
  '2023-10-27': {
    humeur: 'Zeer goed',
    stress_niveau: 1
  },
  '2023-10-26': {
    humeur: 'Neutraal',
    stress_niveau: 3
  },
  '2023-10-25': {
    humeur: 'Goed',
    stress_niveau: 2
  }
};

const mentaleNotitiesData = [
    {
        tekst: "Een klasgenoot hielp me onverwacht met een moeilijke opdracht.",
        datum: admin.firestore.Timestamp.fromDate(new Date('2023-10-27T14:00:00')),
    },
    {
        tekst: "De leerkracht gaf me een compliment over mijn inzet.",
        datum: admin.firestore.Timestamp.fromDate(new Date('2023-10-25T11:20:00')),
    },
];

async function updateWelzijnData() {
  if (USER_ID === '__VUL_HIER_EEN_LEERLING_USER_ID_IN__') {
    console.error("❌ Fout: Vul een geldige userId in.");
    return;
  }

  console.log(`Start update van welzijnsdata voor gebruiker: ${USER_ID}`);
  const welzijnRef = db.collection('welzijn').doc(USER_ID);

  console.log('Bijwerken van dagelijkse data met humeur en stressniveau...');
  const dagelijkseDataRef = welzijnRef.collection('dagelijkse_data');
  for (const [datum, data] of Object.entries(dagelijkseDataUpdates)) {
    // DE FIX: Vervang .update() door .set() met de merge-optie.
    // Dit maakt het document aan als het niet bestaat, of werkt het bij als het wel bestaat.
    await dagelijkseDataRef.doc(datum).set(data, { merge: true });
    console.log(`  - Dagelijks rapport voor ${datum} aangemaakt/bijgewerkt.`);
  }
  console.log('✅ Dagelijkse data bijgewerkt.');

  console.log('Aanmaken van mentale notities...');
  const notitiesRef = welzijnRef.collection('mentale_notities');
  for (const notitie of mentaleNotitiesData) {
    await notitiesRef.add(notitie);
    console.log(`  - Notitie toegevoegd: "${notitie.tekst.substring(0, 20)}..."`);
  }
  console.log('✅ Mentale notities aangemaakt.');

  console.log('\n🎉 Update van alle welzijnsdata is voltooid!');
}

updateWelzijnData().catch(console.error);