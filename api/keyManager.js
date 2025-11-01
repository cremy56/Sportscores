// api/keyManager.js
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import admin from './firebaseAdmin.js'; 

let cachedMasterKey = null;
const GCLOUD_PROJECT_ID = 'sportscore-6774d'; 
const secretName = `projects/${GCLOUD_PROJECT_ID}/secrets/MASTER_KEY_KABEVEREN/versions/latest`;

export async function getMasterKey() {
    if (cachedMasterKey) {
        return cachedMasterKey;
    }

    // --- DEBUG LOGS ---
    console.log("api/keyManager.js: Functie gestart.");
    console.log("api/keyManager.js: Cache is leeg, probeer sleutel op te halen.");
    console.log("api/keyManager.js: Project ID:", GCLOUD_PROJECT_ID);
    console.log("api/keyManager.js: Secret-naam die wordt opgevraagd:", secretName);
    // --------------------

    try {
        const client = new SecretManagerServiceClient(); 
        console.log("api/keyManager.js: SecretManagerServiceClient geïnitialiseerd.");

        const [version] = await client.accessSecretVersion({ name: secretName });
        console.log("api/keyManager.js: accessSecretVersion was succesvol.");

        const key = version.payload.data.toString('utf8');
        
        if (!key) {
             console.error("!!! FATALE FOUT: Sleutel opgehaald, maar deze is LEEG.");
             throw new Error("Master key is leeg in Secret Manager");
        }
        
        cachedMasterKey = key;
        return key;

    } catch (error) {
        // --- DIT IS DE BELANGRIJKSTE LOG ---
        console.error("!!! FATALE FOUT: Kan master key niet ophalen uit Secret Manager.");
        console.error("--- Google Cloud Error Details ---");
        console.error("Fout Code:", error.code);
        console.error("Fout Details:", error.details);
        console.error("Volledige Fout:", error.message);
        console.error("----------------------------------");
        // ---------------------------------
        
        throw new Error("Server configuratie fout: kan sleutel niet laden.");
    }
}