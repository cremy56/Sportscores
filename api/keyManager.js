// api/keyManager.js
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
// Importeer de GEDEELDE credentials uit firebaseAdmin.js
import { serviceAccount } from './firebaseAdmin.js'; 

let cachedMasterKey = null;

// Haal Project ID direct uit de service account credentials
const GCLOUD_PROJECT_ID = serviceAccount.project_id; 

if (!GCLOUD_PROJECT_ID) {
    throw new Error("Project ID niet gevonden in FIREBASE_ADMIN_CREDENTIALS");
}

const secretName = `projects/${GCLOUD_PROJECT_ID}/secrets/MASTER_KEY_KABEVEREN/versions/latest`;

export async function getMasterKey() {
    if (cachedMasterKey) {
        return cachedMasterKey;
    }

    try {
        // Initialiseer de client MET de gedeelde credentials
        const client = new SecretManagerServiceClient({
            credentials: {
                client_email: serviceAccount.client_email,
                private_key: serviceAccount.private_key,
            },
            projectId: GCLOUD_PROJECT_ID,
        }); 
        
        console.log("api/keyManager.js: SecretManagerServiceClient geïnitialiseerd MET credentials.");
        
        // Haal het geheim op
        const [version] = await client.accessSecretVersion({ name: secretName });
        const key = version.payload.data.toString('utf8');
        
        if (!key) {
             throw new Error("Master key is leeg in Secret Manager");
        }
        
        cachedMasterKey = key;
        return key;

    } catch (error) {
        console.error("!!! FATALE FOUT: Kan master key niet ophalen uit Secret Manager.");
        console.error("--- Google Cloud Error Details ---");
        console.error("Fout Code:", error.code);
        console.error("Fout Details:", error.details);
        console.error("Volledige Fout:", error.message);
        console.error("----------------------------------");
        throw new Error("Server configuratie fout: kan sleutel niet laden.");
    }
}