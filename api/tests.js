// pages/api/tests.js
import { db, verifyToken } from '../lib/firebaseAdmin.js';
import { Timestamp } from 'firebase-admin/firestore';
import { getMasterKey } from '../lib/keyManager.js';
import CryptoJS from 'crypto-js';

// ─────────────────────────────────────────────────────────
// HELPERS: naam versleutelen / ontsleutelen
// ─────────────────────────────────────────────────────────
const decryptName = (encryptedName, masterKey) => {
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

// ✅ GDPR: naam versleuteld opslaan in scores collectie
const encryptName = (name, masterKey) => {
    if (!name || !masterKey) return null;
    return CryptoJS.AES.encrypt(name, masterKey).toString();
};

// ─────────────────────────────────────────────────────────
// HELPER: haal school_id van ingelogde gebruiker
// ─────────────────────────────────────────────────────────
async function getSchoolId(uid) {
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) throw new Error('Gebruikersprofiel niet gevonden.');
    const schoolId = snap.data().school_id;
    if (!schoolId) throw new Error('Geen school_id aan profiel gekoppeld.');
    return schoolId;
}

// ─────────────────────────────────────────────────────────
// FUNCTIE 1: GET TESTS
// ─────────────────────────────────────────────────────────
async function handleGetTests(req, res, decodedToken) {
    try {
        const schoolId = await getSchoolId(decodedToken.uid);
        const querySnapshot = await db.collection('testen')
            .where('school_id', '==', schoolId)
            .where('is_actief', '==', true)
            .orderBy('naam')
            .get();

        const testenData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return res.status(200).json({ success: true, testen: testenData });
    } catch (error) {
        console.error('❌ handleGetTests:', error);
        return res.status(500).json({ error: 'Fout bij ophalen van testen' });
    }
}

// ─────────────────────────────────────────────────────────
// FUNCTIE 2: GET LEADERBOARD
// ─────────────────────────────────────────────────────────
function calculateAge(birthDate) {
    if (!birthDate) return null;
    const birth = birthDate.toDate ? birthDate.toDate() : new Date(birthDate);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

const usersCache = new Map();
const cacheExpiry = 5 * 60 * 1000;

async function getCachedUsers(schoolId) {
    const cacheKey = `users_school_${schoolId}`;
    const cached = usersCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < cacheExpiry) return cached.data;

    try {
        const toegestaneQuery = db.collection('toegestane_gebruikers')
            .where('rol', '==', 'leerling')
            .where('school_id', '==', schoolId)
            .where('is_active', '==', true);
        const snapshot = await toegestaneQuery.get();

        const usersData = new Map();
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            usersData.set(doc.id, {
                geboortedatum: data.geboortedatum || null,
                naam: data.decrypted_name || 'Leerling'
            });
        });

        const usersSnap = await db.collection('users').where('school_id', '==', schoolId).get();
        usersSnap.docs.forEach(doc => {
            const data = doc.data();
            if (data.smartschool_id_hash && usersData.has(data.smartschool_id_hash)) {
                usersData.set(data.smartschool_id_hash, {
                    ...usersData.get(data.smartschool_id_hash),
                    geboortedatum: data.geboortedatum || null
                });
            }
        });

        usersCache.set(cacheKey, { data: usersData, timestamp: Date.now() });
        return usersData;
    } catch (error) {
        console.error('Server error fetching users data:', error);
        return new Map();
    }
}

async function handleGetLeaderboard(req, res, decodedToken) {
    try {
        const { testId, globalAgeFilter } = req.body;
        const schoolId = await getSchoolId(decodedToken.uid);

        const testSnap = await db.collection('testen').doc(testId).get();
        if (!testSnap.exists) return res.status(404).json({ error: 'Test niet gevonden' });
        const testData = testSnap.data();

        const scoreDirection = testData.score_richting === 'hoog' ? 'desc' : 'asc';
        const scoresQuery = db.collection('scores')
            .where('test_id', '==', testId)
            .where('school_id', '==', schoolId)
            .orderBy('score', scoreDirection)
            .limit(globalAgeFilter ? 200 : 20);

        const scoresSnapshot = await scoresQuery.get();

        // ✅ GDPR: naam ontsleutelen bij weergave
        const masterKey = await getMasterKey();

        let rawScores = scoresSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                datum: data.datum?.toDate ? data.datum.toDate().toISOString() : null,
                leerling_naam: data.leerling_naam
                    ? decryptName(data.leerling_naam, masterKey)
                    : '[Onbekend]'
            };
        });

        if (globalAgeFilter) {
            const usersData = await getCachedUsers(schoolId);
            const filteredScores = [];
            for (const score of rawScores) {
                const userData = usersData.get(score.leerling_id);
                if (!userData?.geboortedatum) continue;
                const scoreUserAge = calculateAge(userData.geboortedatum);
                if (scoreUserAge === null) continue;
                const targetAge = globalAgeFilter;
                let isMatch = false;
                if (targetAge === 12) isMatch = scoreUserAge <= 12;
                else if (targetAge === 17) isMatch = scoreUserAge >= 17;
                else isMatch = scoreUserAge === targetAge;
                if (isMatch) filteredScores.push(score);
            }
            rawScores = filteredScores;
        }

        return res.status(200).json({
            success: true,
            scores: rawScores.slice(0, 5),
            testData
        });
    } catch (error) {
        console.error('❌ handleGetLeaderboard:', error);
        return res.status(500).json({ error: 'Fout bij ophalen van leaderboard' });
    }
}

// ─────────────────────────────────────────────────────────
// FUNCTIE 3: GET SETUP DATA (groepen + testen voor leerkracht)
// Nieuw voor NieuweTestafname migratie
// ─────────────────────────────────────────────────────────
async function handleGetSetupData(req, res, decodedToken) {
    try {
        const { schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);

        // Controleer dat de opgegeven schoolId overeenkomt met het profiel
        if (schoolId !== verifiedSchoolId) {
            return res.status(403).json({ error: 'Geen toegang tot deze school.' });
        }

        const [groepenSnap, testenSnap] = await Promise.all([
            db.collection('groepen')
                .where('school_id', '==', verifiedSchoolId)
                .where('leerkracht_id', '==', decodedToken.uid)  // ✅ eigen groepen
                .get(),
            db.collection('testen')
                .where('school_id', '==', verifiedSchoolId)
                .where('is_actief', '==', true)
                .orderBy('naam')
                .get()
        ]);

        return res.status(200).json({
            success: true,
            groepen: groepenSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            testen: testenSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        });
    } catch (error) {
        console.error('❌ handleGetSetupData:', error);
        return res.status(500).json({ error: 'Fout bij ophalen groepen/testen' });
    }
}

// ─────────────────────────────────────────────────────────
// FUNCTIE 4: GET LEERLINGEN VOOR GROEP
// Haalt leerlingendata + ontsleutelde namen op voor een groep
// ─────────────────────────────────────────────────────────
async function handleGetLeerlingenVoorGroep(req, res, decodedToken) {
    try {
        const { groepId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);

        if (schoolId !== verifiedSchoolId) {
            return res.status(403).json({ error: 'Geen toegang tot deze school.' });
        }

        // Haal groep op en verifieer eigenaarschap
        const groepSnap = await db.collection('groepen').doc(groepId).get();
        if (!groepSnap.exists) return res.status(404).json({ error: 'Groep niet gevonden.' });
        const groepData = groepSnap.data();

        if (groepData.school_id !== verifiedSchoolId || groepData.leerkracht_id !== decodedToken.uid) {
            return res.status(403).json({ error: 'Geen toegang tot deze groep.' });
        }

        const leerlingIds = groepData.leerling_ids || [];
        if (leerlingIds.length === 0) {
            return res.status(200).json({ success: true, leerlingen: [] });
        }

        // Haal master key op voor decryptie
        const masterKey = await getMasterKey();

        // Haal toegestane_gebruikers op voor encrypted_name, geboortedatum, gender
        // Firestore 'in' query max 30 items — splits indien nodig
        const chunks = [];
        for (let i = 0; i < leerlingIds.length; i += 30) {
            chunks.push(leerlingIds.slice(i, i + 30));
        }

        const toegestaneData = new Map();
        for (const chunk of chunks) {
            const snap = await db.collection('toegestane_gebruikers')
                .where('__name__', 'in', chunk)
                .get();
            snap.docs.forEach(d => toegestaneData.set(d.id, d.data()));
        }

        // Combineer data — naam ontsleutelen uit encrypted_name in toegestane_gebruikers
        // ✅ GDPR: geen geboortedatum — klas wordt gebruikt voor leeftijdsbepaling
        // klas (bv. "1A", "6LO") → leerjaar → normatieve leeftijd in frontend
        const leerlingen = leerlingIds
            .filter(id => toegestaneData.has(id))
            .map(id => {
                const tgData = toegestaneData.get(id);
                return {
                    id,  // smartschool_id_hash
                    data: {
                        klas: tgData.klas || null,           // ✅ bv. "1A", "6LO"
                        geslacht: (tgData.gender || '').toLowerCase() || null,
                        naam: decryptName(tgData.encrypted_name, masterKey)
                    }
                };
            })
            .sort((a, b) => a.data.naam.localeCompare(b.data.naam));

        return res.status(200).json({ success: true, leerlingen });
    } catch (error) {
        console.error('❌ handleGetLeerlingenVoorGroep:', error);
        return res.status(500).json({ error: 'Fout bij ophalen leerlingen' });
    }
}

// ─────────────────────────────────────────────────────────
// FUNCTIE 5: GET NORMEN
// Haalt normendata op voor puntberekening (gecached in frontend)
// ─────────────────────────────────────────────────────────
async function handleGetNormen(req, res, decodedToken) {
    try {
        const { testId } = req.body;

        // Verifieer dat de test tot de school van de gebruiker behoort
        const schoolId = await getSchoolId(decodedToken.uid);
        const testSnap = await db.collection('testen').doc(testId).get();
        if (!testSnap.exists) return res.status(404).json({ error: 'Test niet gevonden.' });
        if (testSnap.data().school_id !== schoolId) {
            return res.status(403).json({ error: 'Geen toegang tot deze test.' });
        }

        const normenSnap = await db.collection('normen')
            .where('test_id', '==', testId)
            .limit(1)
            .get();

        if (normenSnap.empty) {
            return res.status(200).json({ success: true, normen: null });
        }

        return res.status(200).json({
            success: true,
            normen: normenSnap.docs[0].data()
        });
    } catch (error) {
        console.error('❌ handleGetNormen:', error);
        return res.status(500).json({ error: 'Fout bij ophalen normen' });
    }
}

// ─────────────────────────────────────────────────────────
// FUNCTIE 6: GET RECENT SCORES
// Controleert of leerlingen deze test al recentelijk aflegden
// ─────────────────────────────────────────────────────────
async function handleGetRecentScores(req, res, decodedToken) {
    try {
        const { testId, groepId, datum, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);

        if (schoolId !== verifiedSchoolId) {
            return res.status(403).json({ error: 'Geen toegang tot deze school.' });
        }

        // Haal leerling_ids van de groep op
        const groepSnap = await db.collection('groepen').doc(groepId).get();
        if (!groepSnap.exists) return res.status(404).json({ error: 'Groep niet gevonden.' });
        const leerlingIds = groepSnap.data().leerling_ids || [];
        if (leerlingIds.length === 0) {
            return res.status(200).json({ success: true, hasRecentScores: false });
        }

        const geselecteerdeDatum = new Date(datum);
        const oneMonthAgo = new Date(geselecteerdeDatum);
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        // Firestore 'in' max 30 — gebruik eerste 30
        const queryIds = leerlingIds.slice(0, 30);
        const scoresSnap = await db.collection('scores')
            .where('test_id', '==', testId)
            .where('leerling_id', 'in', queryIds)  // ✅ smartschool_id_hash
            .where('datum', '>=', Timestamp.fromDate(oneMonthAgo))
            .where('datum', '<', Timestamp.fromDate(geselecteerdeDatum))
            .get();

        if (scoresSnap.empty) {
            return res.status(200).json({ success: true, hasRecentScores: false });
        }

        const recentScores = scoresSnap.docs.map(d => d.data());
        const mostRecent = recentScores.sort((a, b) => b.datum.toMillis() - a.datum.toMillis())[0];
        const affectedStudentsCount = new Set(recentScores.map(s => s.leerling_id)).size;

        // Controleer of het de eigen afname is
        const teacherIds = [...new Set(recentScores.map(s => s.leerkracht_id).filter(Boolean))];
        const isEigenAfname = teacherIds.includes(decodedToken.uid);

        return res.status(200).json({
            success: true,
            hasRecentScores: true,
            afnameDatum: mostRecent.datum.toDate().toISOString(),
            affectedStudentsCount,
            isEigenAfname
        });
    } catch (error) {
        console.error('❌ handleGetRecentScores:', error);
        return res.status(500).json({ error: 'Fout bij ophalen recente scores' });
    }
}

// ─────────────────────────────────────────────────────────
// FUNCTIE 7: SAVE SCORES
// Slaat batch van scores op via Admin SDK (server-side)
// ─────────────────────────────────────────────────────────
async function handleSaveScores(req, res, decodedToken) {
    try {
        const { groepId, testId, schoolId, datum, scores } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);

        if (schoolId !== verifiedSchoolId) {
            return res.status(403).json({ error: 'Geen toegang tot deze school.' });
        }
        if (!Array.isArray(scores) || scores.length === 0) {
            return res.status(400).json({ error: 'Geen scores opgegeven.' });
        }

        // Verifieer dat groep tot de leerkracht behoort
        const groepSnap = await db.collection('groepen').doc(groepId).get();
        if (!groepSnap.exists) return res.status(404).json({ error: 'Groep niet gevonden.' });
        const groepData = groepSnap.data();
        if (groepData.school_id !== verifiedSchoolId || groepData.leerkracht_id !== decodedToken.uid) {
            return res.status(403).json({ error: 'Geen toegang tot deze groep.' });
        }

        // Verifieer dat test tot de school behoort
        const testSnap = await db.collection('testen').doc(testId).get();
        if (!testSnap.exists) return res.status(404).json({ error: 'Test niet gevonden.' });
        if (testSnap.data().school_id !== verifiedSchoolId) {
            return res.status(403).json({ error: 'Geen toegang tot deze test.' });
        }

        const scoreDatum = new Date(datum);
        const batch = db.batch();

        // ✅ GDPR: naam versleutelen voor opslag
        const masterKey = await getMasterKey();

        for (const scoreItem of scores) {
            const { leerling_id, leerling_naam, score, rapportpunt } = scoreItem;

            // Basisvalidatie
            if (!leerling_id || score === null || score === undefined || isNaN(score)) continue;

            const newScoreRef = db.collection('scores').doc();
            batch.set(newScoreRef, {
                datum: Timestamp.fromDate(scoreDatum),
                groep_id: groepId,
                leerling_id,                                        // ✅ smartschool_id_hash
                leerling_naam: encryptName(leerling_naam, masterKey) || null, // ✅ AES versleuteld
                score: Number(score),
                rapportpunt: rapportpunt ?? null,
                school_id: verifiedSchoolId,
                test_id: testId,
                leerkracht_id: decodedToken.uid,                    // ✅ Firebase UID
                created_at: Timestamp.now()
            });
        }

        await batch.commit();
        return res.status(200).json({ success: true, opgeslagen: scores.length });
    } catch (error) {
        console.error('❌ handleSaveScores:', error);
        return res.status(500).json({ error: 'Fout bij opslaan scores: ' + error.message });
    }
}

// ─────────────────────────────────────────────────────────
// HOOFD HANDLER (Router)
// ─────────────────────────────────────────────────────────
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
        const decodedToken = await verifyToken(req.headers.authorization);
        const { action } = req.body;

        switch (action) {
            case 'get_tests':
                return await handleGetTests(req, res, decodedToken);

            case 'get_leaderboard':
                return await handleGetLeaderboard(req, res, decodedToken);

            // ✅ NIEUW — NieuweTestafname migratie
            case 'get_setup_data':
                return await handleGetSetupData(req, res, decodedToken);

            case 'get_leerlingen_voor_groep':
                return await handleGetLeerlingenVoorGroep(req, res, decodedToken);

            case 'get_normen':
                return await handleGetNormen(req, res, decodedToken);

            case 'get_recent_scores':
                return await handleGetRecentScores(req, res, decodedToken);

            case 'save_scores':
                return await handleSaveScores(req, res, decodedToken);

            default:
                return res.status(400).json({ error: `Onbekende action: ${action}` });
        }

    } catch (error) {
        if (error.message?.includes('token')) {
            return res.status(401).json({ error: 'Niet geauthenticeerd: ' + error.message });
        }
        console.error('❌ API Hoofd-error in /tests:', error);
        return res.status(500).json({ error: 'Fout bij verwerken test data' });
    }
}