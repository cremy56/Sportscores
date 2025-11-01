// In api/firebaseAdmin.js
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountString = process.env.FIREBASE_ADMIN_CREDENTIALS;

// --- TIJDELIJKE DEBUG STAP ---
console.log("--- DEBUGGING firebaseAdmin.js ---");
console.log("Typeof serviceAccountString:", typeof serviceAccountString);

if (serviceAccountString) {
    console.log("Eerste 30 karakters:", serviceAccountString.substring(0, 30));
    console.log("Laatste 30 karakters:", serviceAccountString.substring(serviceAccountString.length - 30));
} else {
    console.log("!!! serviceAccountString is LEEG of UNDEFINED !!!");
}
// ----------------------------

// Probeer te parsen en vang de fout op
let serviceAccount;
try {
    serviceAccount = JSON.parse(serviceAccountString);
} catch (error) {
    console.error("!!!!!!!!!!!! JSON PARSE FOUT !!!!!!!!!!!!");
    console.error("De FIREBASE_ADMIN_CREDENTIALS variabele is GEEN geldige JSON.");
    console.error("Foutmelding:", error.message);
    // Gooi de fout opnieuw om de 500-error te veroorzaken (wat we nu zien)
    throw new Error('JSON Parse Fout: Controleer de Vercel Environment Variable.');
}

// Initialiseer de admin app (alleen als het nog niet is gebeurd)
if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

// Exporteer de admin-versie van de database
export const db = getFirestore();
export default admin;