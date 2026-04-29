// lib/apiHelpers.js
// Gedeelde helper functies voor alle API handlers
import { db } from './firebaseAdmin.js';
import CryptoJS from 'crypto-js';

// ─── Encryptie helpers ────────────────────────────────────────────────────────
export const decryptName = (encryptedName, masterKey) => {
    try {
        if (!encryptedName) return '[Geen naam]';
        const decrypted = CryptoJS.AES.decrypt(encryptedName, masterKey);
        const result = decrypted.toString(CryptoJS.enc.Utf8);
        return result || '[Decryptie fout]';
    } catch (error) {
        console.error('Decryptie fout:', error);
        return '[Naam niet beschikbaar]';
    }
};

export const encryptName = (name, masterKey) => {
    if (!name || !masterKey) return null;
    return CryptoJS.AES.encrypt(name, masterKey).toString();
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
