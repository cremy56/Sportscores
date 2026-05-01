// lib/apiHelpers.js
// Gedeelde helper functies voor alle API handlers
import { db } from './firebaseAdmin.js';
import CryptoJS from 'crypto-js';

// ─── Encryptie helpers ────────────────────────────────────────────────────────
// Versie-prefix systeem: elke ciphertext begint met "v1:", "v2:", etc.
// Dit laat toe om meerdere key-versies naast elkaar te gebruiken tijdens rotatie.
// Bij decryptie: prefix bepaalt welke key gebruikt wordt.
// Bij encryptie: altijd de huidige actieve versie.

const CURRENT_KEY_VERSION = 'v1';

// Keys per versie — bij rotatie: nieuwe versie toevoegen, oude laten staan tot migratie klaar is
// Keys worden opgehaald via getMasterKey() uit keyManager.js
// Dit object bevat de versie-mapping voor decryptie van oude data
const KEY_VERSION_MAP = {
    'v1': null, // wordt ingevuld via getMasterKey() — altijd de huidige secret
    // 'v2': null, // toevoegen bij volgende rotatie
};

export const encryptName = (name, masterKey) => {
    if (!name || !masterKey) return null;
    const ciphertext = CryptoJS.AES.encrypt(name, masterKey).toString();
    return `${CURRENT_KEY_VERSION}:${ciphertext}`;
};

export const decryptName = (encryptedName, masterKey) => {
    try {
        if (!encryptedName) return '[Geen naam]';

        // Detecteer versie-prefix
        const colonIndex = encryptedName.indexOf(':');
        let version = null;
        let ciphertext = encryptedName;

        if (colonIndex > 0 && colonIndex <= 3) {
            // Heeft versie-prefix (v1:, v2:, ...)
            version = encryptedName.substring(0, colonIndex);
            ciphertext = encryptedName.substring(colonIndex + 1);
        }
        // Geen prefix → legacy data van vóór versie-systeem → behandel als v1

        // Voor nu: alle versies gebruiken dezelfde masterKey (Secret Manager latest)
        // Bij rotatie: hier de juiste key per versie ophalen
        const decrypted = CryptoJS.AES.decrypt(ciphertext, masterKey);
        const result = decrypted.toString(CryptoJS.enc.Utf8);
        return result || '[Decryptie fout]';
    } catch {
        return '[Naam niet beschikbaar]';
    }
};

export const generateHash = (smartschoolUserId) => {
    return CryptoJS.SHA256(smartschoolUserId).toString();
};

// ─── School isolatie ──────────────────────────────────────────────────────────
export async function getSchoolId(uid) {
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) throw new Error('Gebruikersprofiel niet gevonden.');
    const schoolId = snap.data().school_id;
    if (!schoolId) throw new Error('Geen school_id aan profiel gekoppeld.');
    return schoolId;
}

// ─── Leeftijd via klas ────────────────────────────────────────────────────────
export function getLeeftijdFromKlas(klas) {
    if (!klas) return null;
    const match = klas.toString().match(/^(\d+)/);
    if (!match) return null;
    const leerjaar = parseInt(match[1]);
    if (leerjaar < 1 || leerjaar > 6) return null;
    return 11 + leerjaar; // 1→12, 2→13, ..., 6→17
}

// ─── Puntberekening server-side ───────────────────────────────────────────────
export function berekenPunt(test, klas, geslacht, score, normenData) {
    if (!test || !klas || !geslacht || score === null || isNaN(score) || !normenData) return null;
    try {
        const { score_richting } = test;
        if (!score_richting) return null;
        const leeftijd = getLeeftijdFromKlas(klas);
        if (leeftijd === null) return null;
        const normAge = Math.min(leeftijd, 17);
        const { punten_schaal } = normenData;
        if (!punten_schaal?.length) return null;
        const genderMap = { 'm': 'M', 'v': 'V', 'x': 'X', 'man': 'M', 'vrouw': 'V', 'jongen': 'M', 'meisje': 'V' };
        const mappedGender = genderMap[geslacht.toLowerCase()] || geslacht.toUpperCase();
        const relevantNorms = punten_schaal
            .filter(n => n.leeftijd === normAge && n.geslacht === mappedGender)
            .sort((a, b) => a.punt - b.punt);
        if (!relevantNorms.length) return null;
        if (score_richting === 'laag') {
            if (score <= relevantNorms[relevantNorms.length - 1].score_min) return relevantNorms[relevantNorms.length - 1].punt;
            if (score >= relevantNorms[0].score_min) return relevantNorms[0].punt;
            for (let i = 0; i < relevantNorms.length - 1; i++) {
                if (score < relevantNorms[i].score_min && score >= relevantNorms[i + 1].score_min) {
                    const mid = (relevantNorms[i].score_min + relevantNorms[i + 1].score_min) / 2;
                    return relevantNorms[i].punt + (score < mid ? 0.5 : 0);
                }
            }
        } else {
            if (score >= relevantNorms[relevantNorms.length - 1].score_min) return relevantNorms[relevantNorms.length - 1].punt;
            if (score <= relevantNorms[0].score_min) return relevantNorms[0].punt;
            for (let i = 0; i < relevantNorms.length - 1; i++) {
                if (score >= relevantNorms[i].score_min && score < relevantNorms[i + 1].score_min) {
                    const mid = (relevantNorms[i].score_min + relevantNorms[i + 1].score_min) / 2;
                    return relevantNorms[i].punt + (score > mid ? 0.5 : 0);
                }
            }
        }
        return null;
    } catch { return null; }
}