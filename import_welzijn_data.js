// import_welzijn_data.js
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
// Vervang dit met een ECHTE userId van een leerling uit je 'users' collectie
const USER_ID = 'u2yfNRhRbKN7gxjc5vcvLObmoZP2';

// --- VOORBEELDDATA ---

// Hoofddocument voor de welzijnscollectie
const welzijnHoofdDocument = {
  doelen: {
    stappen: 10000,
    water: 2000, // in ml
    slaap: 8,    // in uren
  },
  biometrie: {
    vetpercentage: 18.5,
    gewicht: 65.2, // in kg
    lengte: 175,   // in cm
  }
};

// Data voor de subcollectie 'dagelijkse_data'
const dagelijkseData = {
  '2023-10-27': {
    stappen: 11520,
    hartslag_rust: 62,
    water_intake: 2200,
    slaap_uren: 8.5,
    slaap_kwaliteit: 'goed',
    humeur: 'blij',
    stress_niveau: 2
  },
  '2023-10-26': {
    stappen: 8250,
    hartslag_rust: 65,
    water_intake: 1800,
    slaap_uren: 7,
    slaap_kwaliteit: 'matig',
    humeur: 'neutraal',
    stress_niveau: 3
  },
  '2023-10-25': {
    stappen: 9100,
    water_intake: 1900,
    slaap_uren: 7.5,
    slaap_kwaliteit: 'goed',
    humeur: 'blij',
    stress_niveau: 2
  }
};

// Data voor de subcollectie 'activiteiten'
const activiteitenData = [
  {
    type: 'Fietsen',
    datum: admin.firestore.Timestamp.fromDate(new Date('2023-10-26T18:00:00')),
    duur_minuten: 60,
    afstand_km: 25.5,
    notities: 'Rondje door het park.'
  },
  {
    type: 'Krachttraining',
    datum: admin.firestore.Timestamp.fromDate(new Date('2023-10-25T08:30:00')),
    duur_minuten: 45,
    notities: 'Focus op bovenlichaam.'
  },
  {
    type: 'Wandelen',
    datum: admin.firestore.Timestamp.fromDate(new Date('2023-10-27T12:30:00')),
    duur_minuten: 30,
    afstand_km: 3.2,
  }
];

// --- IMPORT SCRIPT ---
async function importWelzijnData() {
  if (USER_ID === '__VUL_HIER_EEN_LEERLING_USER_ID_IN__') {
    console.error("❌ Fout: Vul een geldige userId in in het script voordat je het uitvoert.");
    return;
  }

  console.log(`Start import van welzijnsdata voor gebruiker: ${USER_ID}`);

  // Stap 1: Maak het hoofddocument aan in de 'welzijn' collectie
  const welzijnRef = db.collection('welzijn').doc(USER_ID);
  await welzijnRef.set(welzijnHoofdDocument);
  console.log('✅ Hoofddocument aangemaakt met doelen en biometrie.');

  // Stap 2: Voeg documenten toe aan de 'dagelijkse_data' subcollectie
  console.log('Importeren van dagelijkse data...');
  const dagelijkseDataRef = welzijnRef.collection('dagelijkse_data');
  for (const [datum, data] of Object.entries(dagelijkseData)) {
    await dagelijkseDataRef.doc(datum).set(data);
    console.log(`  - Dagelijks rapport voor ${datum} toegevoegd.`);
  }
  console.log('✅ Dagelijkse data geïmporteerd.');

  // Stap 3: Voeg documenten toe aan de 'activiteiten' subcollectie
  console.log('Importeren van activiteiten...');
  const activiteitenRef = welzijnRef.collection('activiteiten');
  for (const activiteit of activiteitenData) {
    await activiteitenRef.add(activiteit);
    console.log(`  - Activiteit '${activiteit.type}' toegevoegd.`);
  }
  console.log('✅ Activiteiten geïmporteerd.');

  console.log('\n🎉 Import van alle welzijnsdata is voltooid!');
}

importWelzijnData().catch(console.error);
