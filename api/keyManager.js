// In api/keyManager.js
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import admin from './firebaseAdmin.js'; // Zorgt dat de admin-app is geladen

// Cache de sleutel in het geheugen van de serverless functie
let cachedMasterKey = null;

// Vul hier de Project ID in van je Firebase/Google Cloud project
const GCLOUD_PROJECT_ID = 'sportscore-6774d'; // Bijv: 'sportscore-6774d'

// Dit is de naam van het geheim dat je in stap 2 hebt gemaakt
const secretName = `projects/${GCLOUD_PROJECT_ID}/secrets/MASTER_KEY_KABEVEREN/versions/latest`;

export async function getMasterKey() {
    if (cachedMasterKey) {
        return cachedMasterKey;
    }

    try {
        // Initialiseert de client. 
        // Gebruikt automatisch de credentials van firebaseAdmin.
        const client = new SecretManagerServiceClient(); 
        
        console.log("Fetching master key from Secret Manager...");
        
        // Haal het geheim op
        const [version] = await client.accessSecretVersion({ name: secretName });
        const key = version.payload.data.toString('utf8');
        
        if (!key) {
             throw new Error("Master key is leeg in Secret Manager");
        }
        
        cachedMasterKey = key;
        return key;

    } catch (error) {
        console.error("!!! FATALE FOUT: Kan master key niet ophalen uit Secret Manager", error.message);
        throw new Error("Server configuratie fout: kan sleutel niet laden.");
    }
}