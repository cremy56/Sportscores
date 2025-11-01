// In api/firebaseAdmin.js
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Haal de JSON-string op die je al in Vercel hebt
const serviceAccountString = process.env.FIREBASE_ADMIN_CREDENTIALS;

if (!serviceAccountString) {
    throw new Error('De FIREBASE_ADMIN_CREDENTIALS environment variable is niet ingesteld.');
}

const serviceAccount = JSON.parse(serviceAccountString);

// Initialiseer de admin app (alleen als het nog niet is gebeurd)
if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

// Exporteer de admin-versie van de database
export const db = getFirestore();
export default admin;