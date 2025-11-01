// In api/firebaseAdmin.js
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth'; // <-- VOEG DEZE IMPORT TOE

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

// --- VOEG DEZE FUNCTIE TOE ---
/**
 * Verifieert het Firebase ID Token van de gebruiker.
 * @param {string} authHeader - De "Authorization" header (bijv. "Bearer ...")
 * @returns {Promise<admin.auth.DecodedIdToken>} - Het gedecodeerde token-object
 */
export const verifyToken = async (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Geen of ongeldig Authorization token meegegeven.');
    }
    const token = authHeader.split('Bearer ')[1];
    
    // Controleert bij Firebase of het token echt, geldig en niet verlopen is
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken; // Dit object bevat nu info zoals uid, email, etc.
};
// ------------------------------

export default admin;