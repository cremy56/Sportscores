// uploadNorms.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Voeg de absolute of relatieve link naar je service account JSON toe
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function uploadNorms() {
  try {
    // Lees de JSON-data van het bestand
    const data = JSON.parse(readFileSync('cooper_test_norms.json', 'utf8'));
    const testId = data.test_id;

    if (!testId) {
      console.error("Fout: 'test_id' niet gevonden in het JSON-bestand.");
      return;
    }

    // Specificeer de collectie en het document-ID
    const docRef = db.collection('normen').doc(testId);

    // Voeg de data toe aan Firestore
    await docRef.set(data);

    console.log(`✅ Data voor test '${testId}' succesvol toegevoegd aan de collectie 'normen'.`);
  } catch (e) {
    console.error("Er is een fout opgetreden:", e);
  }
}

uploadNorms();