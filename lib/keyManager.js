// api/keyManager.js
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
// Importeer de GEDEELDE credentials uit firebaseAdmin.js
import { serviceAccount } from './firebaseAdmin.js'; 

let cachedMasterKey = null;
let cacheTimestamp = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 uur — forceert refresh na key rotatie

// Haal Project ID direct uit de service account credentials
const GCLOUD_PROJECT_ID = serviceAccount.project_id; 

if (!GCLOUD_PROJECT_ID) {
    throw new Error("Project ID niet gevonden in FIREBASE_ADMIN_CREDENTIALS");
}

const secretName = `projects/${GCLOUD_PROJECT_ID}/secrets/MASTER_KEY_KABEVEREN/versions/latest`;
const pepperSecretName = `projects/${GCLOUD_PROJECT_ID}/secrets/HASH_PEPPER_KABEVEREN/versions/latest`;

// Gedeelde fetch-logica voor secrets
async function fetchSecret(name) {
    const client = new SecretManagerServiceClient({
        credentials: serviceAccount,
        projectId: GCLOUD_PROJECT_ID,
    });
    const [version] = await client.accessSecretVersion({ name });
    const value = version.payload.data.toString('utf8');
    if (!value) throw new Error('Secret is leeg in Secret Manager');
    return value;
}

export async function getMasterKey() {
    const now = Date.now();
    if (cachedMasterKey && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return cachedMasterKey;
    }

    try {
        const key = await fetchSecret(secretName);
        cachedMasterKey = key;
        cacheTimestamp = now;
        return key;

    } catch (error) {
        // Enkel generieke foutmelding loggen — geen interne details
        console.error('FATALE FOUT: Kan master key niet ophalen uit Secret Manager.');
        throw new Error('Server configuratie fout: kan sleutel niet laden.');
    }
}

// ─── Hash pepper (HMAC-SHA256 voor smartschool_id_hash) ─────────────────────
// Aparte secret naast de master key. Zelfde cache-patroon.
// Aanmaken: zie INSTRUCTIES_HASH_MIGRATIE.md (gcloud secrets create ...)
let cachedPepper = null;
let pepperTimestamp = null;

export async function getHashPepper() {
    const now = Date.now();
    if (cachedPepper && pepperTimestamp && (now - pepperTimestamp) < CACHE_TTL_MS) {
        return cachedPepper;
    }

    try {
        const pepper = await fetchSecret(pepperSecretName);
        cachedPepper = pepper;
        pepperTimestamp = now;
        return pepper;

    } catch (error) {
        console.error('FATALE FOUT: Kan hash pepper niet ophalen uit Secret Manager.');
        throw new Error('Server configuratie fout: kan sleutel niet laden.');
    }
}