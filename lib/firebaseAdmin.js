// lib/firebaseAdmin.js
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Haal de JSON-string op die je al in Vercel hebt
const serviceAccountString = process.env.FIREBASE_ADMIN_CREDENTIALS;

if (!serviceAccountString) {
    throw new Error('De FIREBASE_ADMIN_CREDENTIALS environment variable is niet ingesteld.');
}

// Parse de JSON-string ÉÉN KEER
export const serviceAccount = JSON.parse(serviceAccountString);

// Initialiseer de admin app (alleen als het nog niet is gebeurd)
if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

// Exporteer de admin-versie van de database
export const db = getFirestore();

/**
 * Verifieert het Firebase ID Token van de gebruiker.
 */
export const verifyToken = async (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // .code expliciet meegeven: de API-handlers onderscheiden een echte
        // auth-fout van een infrastructuurfout op error.code, niet op de
        // fouttekst. Tekstherkenning was te bros (jul 2026: een ingetrokken
        // service-key gaf "Failed to fetch access token" en werd stil als
        // 401 gelabeld i.p.v. als storing).
        throw Object.assign(
            new Error('Geen of ongeldig Authorization token meegegeven.'),
            { code: 'auth/geen-token' }
        );
    }
    const token = authHeader.split('Bearer ')[1];

    // Controleert bij Firebase of het token echt, geldig en niet verlopen is.
    // Fouten hiervan hebben al een .code van de vorm 'auth/...'.
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken; // Dit object bevat nu info zoals uid, email, etc.
};

export default admin;