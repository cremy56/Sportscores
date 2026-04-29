// pages/api/tests.js
import { db, verifyToken } from '../lib/firebaseAdmin.js';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getMasterKey } from '../lib/keyManager.js';
import CryptoJS from 'crypto-js';

// ─────────────────────────────────────────────────────────
// HELPER: naam ontsleutelen (zelfde logica als users.js)
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
        let rawScores = scoresSnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            datum: doc.data().datum?.toDate ? doc.data().datum.toDate().toISOString() : null
        }));

        if (globalAgeFilter) {
            const usersData = await getCachedUsers(schoolId);
            const filteredScores = [];
            for (const score of rawScores) {
                const userData = usersData.get(score.leerling_id);
                if (!userData?.klas) continue;
                const scoreUserAge = getLeeftijdFromKlas(userData.klas);
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

        // Nicknames ophalen voor de top scores
        const leerlingIds = rawScores.slice(0, 5).map(s => s.leerling_id).filter(Boolean);
        const nicknameMap = new Map();
        if (leerlingIds.length > 0) {
            const usersSnap = await db.collection('users')
                .where('toegestane_gebruikers_id', 'in', leerlingIds)
                .get();
            usersSnap.docs.forEach(d => 
                nicknameMap.set(d.data().toegestane_gebruikers_id, d.data().nickname || 'Sporter')
            );
        }

        const scoresWithNickname = rawScores.slice(0, 5).map(s => ({
            ...s,
            leerling_naam: nicknameMap.get(s.leerling_id) || 'Sporter'
        }));

        return res.status(200).json({
            success: true,
            scores: scoresWithNickname,
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
        const masterKey = await getMasterKey(); // ✅ voor encryptie naam
        const batch = db.batch();

        for (const scoreItem of scores) {
            const { leerling_id, score, rapportpunt } = scoreItem;

            // Basisvalidatie
            if (!leerling_id || score === null || score === undefined || isNaN(score)) continue;

            const newScoreRef = db.collection('scores').doc();
            batch.set(newScoreRef, {
                datum: Timestamp.fromDate(scoreDatum),
                groep_id: groepId,
                leerling_id,                            // ✅ smartschool_id_hash
                score: Number(score),
                rapportpunt: rapportpunt ?? null,
                school_id: verifiedSchoolId,
                test_id: testId,
                leerkracht_id: decodedToken.uid,        // ✅ Firebase UID
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
// FUNCTIE 8: GET TESTAFNAME DETAIL
// Haalt alle data op voor TestafnameDetail pagina
// ─────────────────────────────────────────────────────────
async function handleGetTestafnameDetail(req, res, decodedToken) {
    try {
        const { groepId, testId, datum, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const masterKey = await getMasterKey();

        // Haal groep en test parallel op
        const [groepSnap, testSnap] = await Promise.all([
            db.collection('groepen').doc(groepId).get(),
            db.collection('testen').doc(testId).get()
        ]);

        if (!testSnap.exists) return res.status(404).json({ error: 'Test niet gevonden.' });

        const groepData = groepSnap.exists ? groepSnap.data() : null;
        const testData = { id: testSnap.id, ...testSnap.data() };
        const leerlingIds = groepData?.leerling_ids || [];

        // Datum range voor de dag
        const targetDate = new Date(datum);
        const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);

        // Haal scores op voor deze testafname
        const scoresSnap = await db.collection('scores')
            .where('groep_id', '==', groepId)
            .where('test_id', '==', testId)
            .where('datum', '>=', Timestamp.fromDate(dayStart))
            .where('datum', '<=', Timestamp.fromDate(dayEnd))
            .get();

        const scoresMap = new Map();
        scoresSnap.docs.forEach(d => {
            const data = { id: d.id, ...d.data() };
            scoresMap.set(data.leerling_id, data);
        });

        let leerlingenData = [];

        if (leerlingIds.length > 0) {
            // Haal toegestane_gebruikers op in chunks van 30
            const chunks = [];
            for (let i = 0; i < leerlingIds.length; i += 30) chunks.push(leerlingIds.slice(i, i + 30));

            const toegestaneData = new Map();
            for (const chunk of chunks) {
                const snap = await db.collection('toegestane_gebruikers').where('__name__', 'in', chunk).get();
                snap.docs.forEach(d => toegestaneData.set(d.id, d.data()));
            }

            // Haal namen op via users (voor ontsleuteling)
            

            leerlingenData = leerlingIds
                .filter(id => toegestaneData.has(id))
                .map(id => {
                    const tgData = toegestaneData.get(id);
                    const scoreInfo = scoresMap.get(id);
                    // Naam: eerst uit users (ontsleuteld), dan uit score (ontsleuteld), dan fallback
                   const naam = decryptName(tgData.encrypted_name, masterKey);
                    return {
                        id,
                        naam: naam || '[Naam niet beschikbaar]',
                        klas: tgData.klas || null,
                        geslacht: (tgData.gender || '').toLowerCase() || null,
                        score: scoreInfo?.score ?? null,
                        punt: scoreInfo?.rapportpunt ?? null,
                        score_id: scoreInfo?.id || null
                    };
                })
                .sort((a, b) => a.naam.localeCompare(b.naam));

        } else if (scoresSnap.docs.length > 0) {
            // Fallback: groep bestaat niet meer, gebruik scores
            for (const d of scoresSnap.docs) {
                const data = d.data();
                const tgDoc = await db.collection('toegestane_gebruikers').doc(data.leerling_id).get();
                leerlingenData.push({
                    id: data.leerling_id,
                    naam: decryptName(tgDoc.data()?.encrypted_name || '', masterKey) || '[Onbekend]',
                    score: data.score ?? null,
                    punt: data.rapportpunt ?? null,
                    score_id: d.id,
                    isOrphaned: true
                });
            }
        }

        return res.status(200).json({
            success: true,
            groep_naam: groepData?.naam || 'Verwijderde Groep',
            test_naam: testData.naam,
            eenheid: testData.eenheid,
            max_punten: testData.max_punten || 20,
            test_volledig: testData,
            isOrphanedGroup: !groepSnap.exists,
            leerlingen: leerlingenData
        });
    } catch (error) {
        console.error('❌ handleGetTestafnameDetail:', error);
        return res.status(500).json({ error: 'Fout bij ophalen testafname detail' });
    }
}

// ─────────────────────────────────────────────────────────
// HELPER: puntberekening server-side (klas → leeftijd)
// ─────────────────────────────────────────────────────────
function getLeeftijdFromKlas(klas) {
    if (!klas) return null;
    const match = klas.toString().match(/^(\d+)/);
    if (!match) return null;
    const leerjaar = parseInt(match[1]);
    if (leerjaar < 1 || leerjaar > 6) return null;
    return 11 + leerjaar; // 1→12, 2→13, ..., 6→17
}

function berekenPunt(test, klas, geslacht, score, normenData) {
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

// ─────────────────────────────────────────────────────────
// FUNCTIE 9: UPDATE SCORE
// ─────────────────────────────────────────────────────────
async function handleUpdateScore(req, res, decodedToken) {
    try {
        const { scoreId, score, testId, klas, geslacht, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const scoreRef = db.collection('scores').doc(scoreId);
        const scoreSnap = await scoreRef.get();
        if (!scoreSnap.exists) return res.status(404).json({ error: 'Score niet gevonden.' });
        if (scoreSnap.data().school_id !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        // Haal normen op voor puntberekening
        const normenSnap = await db.collection('normen').where('test_id', '==', testId).limit(1).get();
        const normenData = normenSnap.empty ? null : normenSnap.docs[0].data();
        const testSnap = await db.collection('testen').doc(testId).get();
        const testData = testSnap.exists ? { id: testSnap.id, ...testSnap.data() } : null;

        const newPunt = berekenPunt(testData, klas, geslacht, score, normenData);

        await scoreRef.update({ score: Number(score), rapportpunt: newPunt });

        return res.status(200).json({ success: true, newPunt });
    } catch (error) {
        console.error('❌ handleUpdateScore:', error);
        return res.status(500).json({ error: 'Fout bij updaten score' });
    }
}

// ─────────────────────────────────────────────────────────
// FUNCTIE 10: DELETE SCORE
// ─────────────────────────────────────────────────────────
async function handleDeleteScore(req, res, decodedToken) {
    try {
        const { scoreId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const scoreRef = db.collection('scores').doc(scoreId);
        const scoreSnap = await scoreRef.get();
        if (!scoreSnap.exists) return res.status(404).json({ error: 'Score niet gevonden.' });
        if (scoreSnap.data().school_id !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        await scoreRef.delete();
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ handleDeleteScore:', error);
        return res.status(500).json({ error: 'Fout bij verwijderen score' });
    }
}

// ─────────────────────────────────────────────────────────
// FUNCTIE 11: UPDATE SCORE DATE (alle scores van een testafname)
// ─────────────────────────────────────────────────────────
async function handleUpdateScoreDate(req, res, decodedToken) {
    try {
        const { scoreIds, newDate, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });
        if (!Array.isArray(scoreIds) || scoreIds.length === 0) return res.status(400).json({ error: 'Geen score IDs.' });

        const newDateObj = new Date(newDate + 'T02:00:00.000Z');
        const batch = db.batch();
        for (const scoreId of scoreIds) {
            batch.update(db.collection('scores').doc(scoreId), { datum: Timestamp.fromDate(newDateObj) });
        }
        await batch.commit();
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ handleUpdateScoreDate:', error);
        return res.status(500).json({ error: 'Fout bij updaten datum' });
    }
}

// ─────────────────────────────────────────────────────────
// FUNCTIE 12: DELETE TESTAFNAME (alle scores van een sessie)
// ─────────────────────────────────────────────────────────
async function handleDeleteTestafname(req, res, decodedToken) {
    try {
        const { groepId, testId, datum, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const targetDate = new Date(datum);
        const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);

        const scoresSnap = await db.collection('scores')
            .where('groep_id', '==', groepId)
            .where('test_id', '==', testId)
            .where('school_id', '==', verifiedSchoolId)
            .where('datum', '>=', Timestamp.fromDate(dayStart))
            .where('datum', '<=', Timestamp.fromDate(dayEnd))
            .get();

        const batch = db.batch();
        scoresSnap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();

        return res.status(200).json({ success: true, verwijderd: scoresSnap.docs.length });
    } catch (error) {
        console.error('❌ handleDeleteTestafname:', error);
        return res.status(500).json({ error: 'Fout bij verwijderen testafname' });
    }
}

// ─────────────────────────────────────────────────────────
// FUNCTIE 13: GET EVALUATIES (voor Sporttesten overzicht)
// Haalt alle testafnames op gegroepeerd per groep+test+datum
// ─────────────────────────────────────────────────────────
async function handleGetEvaluaties(req, res, decodedToken) {
    try {
        const { schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        // Haal groepen, testen en scores parallel op
        const [groepenSnap, testenSnap, scoresSnap] = await Promise.all([
            db.collection('groepen').where('school_id', '==', verifiedSchoolId).get(),
            db.collection('testen').where('school_id', '==', verifiedSchoolId).where('is_actief', '==', true).orderBy('naam').get(),
            db.collection('scores')
                .where('school_id', '==', verifiedSchoolId)
                .where('leerkracht_id', '==', decodedToken.uid)
                .get()
        ]);

        const groepen = groepenSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const testen = testenSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Groepeer scores per groep+test+datum
        const grouped = {};
        scoresSnap.docs.forEach(d => {
            const data = d.data();
            const datum = data.datum?.toDate ? data.datum.toDate() : new Date(data.datum);
            const datumDag = datum.toISOString().split('T')[0];
            const key = `${data.groep_id}-${data.test_id}-${datumDag}`;

            if (!grouped[key]) {
                const groep = groepen.find(g => g.id === data.groep_id);
                const test = testen.find(t => t.id === data.test_id);
                grouped[key] = {
                    groep_id: data.groep_id,
                    test_id: data.test_id,
                    datum: datumDag,
                    groep_naam: groep?.naam || 'Verwijderde Groep',
                    test_naam: test?.naam || 'Onbekende Test',
                    score_ids: [],
                    leerling_count: 0,
                    isOrphanedGroup: !groep
                };
            }
            grouped[key].score_ids.push(d.id);
            grouped[key].leerling_count++;
        });

        const evaluaties = Object.values(grouped).sort((a, b) => new Date(b.datum) - new Date(a.datum));

        return res.status(200).json({ success: true, evaluaties, groepen, testen });
    } catch (error) {
        console.error('❌ handleGetEvaluaties:', error);
        return res.status(500).json({ error: 'Fout bij ophalen evaluaties' });
    }
}

// ─────────────────────────────────────────────────────────
// FUNCTIE 14: DELETE TEST
// ─────────────────────────────────────────────────────────
async function handleDeleteTest(req, res, decodedToken) {
    try {
        const { testId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        // Controleer of er nog scores zijn
        const scoresSnap = await db.collection('scores').where('test_id', '==', testId).limit(1).get();
        if (!scoresSnap.empty) {
            return res.status(400).json({ error: 'Kan test niet verwijderen: er zijn nog scores aan gekoppeld.' });
        }

        await db.collection('testen').doc(testId).delete();
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ handleDeleteTest:', error);
        return res.status(500).json({ error: 'Fout bij verwijderen test' });
    }
}

// ─────────────────────────────────────────────────────────
// FUNCTIE 15: GET GROEPEN (voor Groepsbeheer)
// ─────────────────────────────────────────────────────────
async function handleGetGroepen(req, res, decodedToken) {
    try {
        const { schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const snap = await db.collection('groepen')
            .where('school_id', '==', verifiedSchoolId)
            .where('leerkracht_id', '==', decodedToken.uid)
            .get();

        return res.status(200).json({
            success: true,
            groepen: snap.docs.map(d => ({ id: d.id, ...d.data() }))
        });
    } catch (error) {
        console.error('❌ handleGetGroepen:', error);
        return res.status(500).json({ error: 'Fout bij ophalen groepen' });
    }
}

// ─────────────────────────────────────────────────────────
// FUNCTIE 16: GET MIJN KLASSEN (voor Groepsbeheer)
// Haalt klassen op van de leerkracht via toegestane_gebruikers
// Fallback: alle klassen van de school
// ─────────────────────────────────────────────────────────
async function handleGetMijnKlassen(req, res, decodedToken) {
    try {
        const { schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        // Haal smartschool_id_hash op uit users profiel
        const userSnap = await db.collection('users').doc(decodedToken.uid).get();
        const leerkrachtHash = userSnap.data()?.smartschool_id_hash;

        if (leerkrachtHash) {
            const toegestaneSnap = await db.collection('toegestane_gebruikers').doc(leerkrachtHash).get();
            if (toegestaneSnap.exists) {
                const klassen = toegestaneSnap.data()?.klassen || [];
                if (klassen.length > 0) {
                    return res.status(200).json({ success: true, klassen });
                }
            }
        }

        // Fallback: alle klassen van de school via toegestane_gebruikers
        const leerlingenSnap = await db.collection('toegestane_gebruikers')
            .where('school_id', '==', verifiedSchoolId)
            .where('rol', '==', 'leerling')
            .where('is_active', '==', true)
            .get();

        const alleKlassen = [...new Set(
            leerlingenSnap.docs.map(d => d.data().klas).filter(Boolean).sort()
        )];

        return res.status(200).json({ success: true, klassen: alleKlassen, isFallback: true });
    } catch (error) {
        console.error('❌ handleGetMijnKlassen:', error);
        return res.status(500).json({ error: 'Fout bij ophalen klassen' });
    }
}

// ─────────────────────────────────────────────────────────
// FUNCTIE 17: CREATE GROEP
// ─────────────────────────────────────────────────────────
async function handleCreateGroep(req, res, decodedToken) {
    try {
        const { naam, leerling_ids, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });
        if (!naam?.trim()) return res.status(400).json({ error: 'Groepsnaam is verplicht.' });
        if (!Array.isArray(leerling_ids) || leerling_ids.length === 0) return res.status(400).json({ error: 'Selecteer minstens 1 leerling.' });

        // ✅ GDPR: geen leerlingen_cache — namen worden nooit plaintext opgeslagen
        const docRef = await db.collection('groepen').add({
            naam: naam.trim(),
            type: 'manueel',
            leerkracht_id: decodedToken.uid,
            school_id: verifiedSchoolId,
            leerling_ids,  // ✅ enkel smartschool_id_hash
            auto_sync: false,
            created_at: Timestamp.now()
        });

        return res.status(200).json({ success: true, id: docRef.id });
    } catch (error) {
        console.error('❌ handleCreateGroep:', error);
        return res.status(500).json({ error: 'Fout bij aanmaken groep' });
    }
}

// ─────────────────────────────────────────────────────────
// FUNCTIE 18: UPDATE GROEP (naam wijzigen)
// ─────────────────────────────────────────────────────────
async function handleUpdateGroep(req, res, decodedToken) {
    try {
        const { groepId, naam, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const groepRef = db.collection('groepen').doc(groepId);
        const groepSnap = await groepRef.get();
        if (!groepSnap.exists) return res.status(404).json({ error: 'Groep niet gevonden.' });
        if (groepSnap.data().leerkracht_id !== decodedToken.uid) return res.status(403).json({ error: 'Geen toegang.' });

        await groepRef.update({ naam: naam.trim() });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ handleUpdateGroep:', error);
        return res.status(500).json({ error: 'Fout bij wijzigen groep' });
    }
}

// ─────────────────────────────────────────────────────────
// FUNCTIE 19: DELETE GROEP
// ─────────────────────────────────────────────────────────
async function handleDeleteGroep(req, res, decodedToken) {
    try {
        const { groepId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const groepRef = db.collection('groepen').doc(groepId);
        const groepSnap = await groepRef.get();
        if (!groepSnap.exists) return res.status(404).json({ error: 'Groep niet gevonden.' });
        if (groepSnap.data().leerkracht_id !== decodedToken.uid) return res.status(403).json({ error: 'Geen toegang.' });

        await groepRef.delete();
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ handleDeleteGroep:', error);
        return res.status(500).json({ error: 'Fout bij verwijderen groep' });
    }
}

// ─────────────────────────────────────────────────────────
// FUNCTIE 20: GET GROEP DETAIL
// Haalt groep, leden (met namen) en scores op
// ─────────────────────────────────────────────────────────
async function handleGetGroepDetail(req, res, decodedToken) {
    try {
        const { groepId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const masterKey = await getMasterKey();

        // Haal groep op
        const groepSnap = await db.collection('groepen').doc(groepId).get();
        if (!groepSnap.exists) return res.status(404).json({ error: 'Groep niet gevonden.' });
        const groepData = { id: groepSnap.id, ...groepSnap.data() };
        if (groepData.school_id !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const leerlingIds = groepData.leerling_ids || [];

        // Haal leerlingendata op uit toegestane_gebruikers
        let members = [];
        if (leerlingIds.length > 0) {
            const chunks = [];
            for (let i = 0; i < leerlingIds.length; i += 30) chunks.push(leerlingIds.slice(i, i + 30));

            const toegestaneData = new Map();
            for (const chunk of chunks) {
                const snap = await db.collection('toegestane_gebruikers').where('__name__', 'in', chunk).get();
                snap.docs.forEach(d => toegestaneData.set(d.id, d.data()));
            }

            members = leerlingIds
                .filter(id => toegestaneData.has(id))
                .map(id => {
                    const tgData = toegestaneData.get(id);
                    return {
                        id,
                        naam: decryptName(tgData.encrypted_name, masterKey),
                        klas: tgData.klas || ''
                    };
                })
                .sort((a, b) => a.naam.localeCompare(b.naam));
        }

        // Haal scores op voor dit schooljaar
        const nu = new Date();
        const startJaar = nu.getMonth() >= 8 ? nu.getFullYear() : nu.getFullYear() - 1;
        const schoolYearStart = Timestamp.fromDate(new Date(startJaar, 8, 1));
        const schoolYearEnd = Timestamp.fromDate(new Date(startJaar + 1, 7, 31, 23, 59, 59));

        let scoresByLeerling = {};
        let testenVoorSorteren = [];

        if (leerlingIds.length > 0) {
            // Scores in chunks van max 30
            const allScores = [];
            const chunks = [];
            for (let i = 0; i < leerlingIds.length; i += 30) chunks.push(leerlingIds.slice(i, i + 30));

            for (const chunk of chunks) {
                const scoresSnap = await db.collection('scores')
                    .where('leerling_id', 'in', chunk)
                    .where('datum', '>=', schoolYearStart)
                    .where('datum', '<=', schoolYearEnd)
                    .get();
                allScores.push(...scoresSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            }

            // Haal testnamen op
            const testIds = [...new Set(allScores.map(s => s.test_id))];
            const testNamen = new Map();
            if (testIds.length > 0) {
                const testChunks = [];
                for (let i = 0; i < testIds.length; i += 30) testChunks.push(testIds.slice(i, i + 30));
                for (const chunk of testChunks) {
                    const testenSnap = await db.collection('testen').where('__name__', 'in', chunk).get();
                    testenSnap.docs.forEach(d => {
                        testNamen.set(d.id, d.data().naam);
                        testenVoorSorteren.push({ id: d.id, naam: d.data().naam });
                    });
                }
            }

            // Groepeer per leerling
            allScores.forEach(score => {
                if (!scoresByLeerling[score.leerling_id]) scoresByLeerling[score.leerling_id] = [];
                scoresByLeerling[score.leerling_id].push({
                    ...score,
                    datum: score.datum?.toDate ? score.datum.toDate().toISOString() : null,
                    test_naam: testNamen.get(score.test_id) || 'Onbekende Test'
                });
            });
        }

        return res.status(200).json({
            success: true,
            groep: groepData,
            members,
            scoresByLeerling,
            availableTests: testenVoorSorteren.sort((a, b) => a.naam.localeCompare(b.naam))
        });
    } catch (error) {
        console.error('❌ handleGetGroepDetail:', error);
        return res.status(500).json({ error: 'Fout bij ophalen groepdetail' });
    }
}

// ─────────────────────────────────────────────────────────
// FUNCTIE 21: ADD LEERLING AAN GROEP
// ─────────────────────────────────────────────────────────
async function handleAddLeerling(req, res, decodedToken) {
    try {
        const { groepId, leerlingId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const groepRef = db.collection('groepen').doc(groepId);
        const groepSnap = await groepRef.get();
        if (!groepSnap.exists) return res.status(404).json({ error: 'Groep niet gevonden.' });
        if (groepSnap.data().leerkracht_id !== decodedToken.uid) return res.status(403).json({ error: 'Geen toegang.' });

        await groepRef.update({
            leerling_ids: FieldValue.arrayUnion(leerlingId)
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ handleAddLeerling:', error);
        return res.status(500).json({ error: 'Fout bij toevoegen leerling' });
    }
}

// ─────────────────────────────────────────────────────────
// FUNCTIE 22: REMOVE LEERLING UIT GROEP
// ─────────────────────────────────────────────────────────
async function handleRemoveLeerling(req, res, decodedToken) {
    try {
        const { groepId, leerlingId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const groepRef = db.collection('groepen').doc(groepId);
        const groepSnap = await groepRef.get();
        if (!groepSnap.exists) return res.status(404).json({ error: 'Groep niet gevonden.' });
        if (groepSnap.data().leerkracht_id !== decodedToken.uid) return res.status(403).json({ error: 'Geen toegang.' });

        await groepRef.update({
            leerling_ids: FieldValue.arrayRemove(leerlingId)
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ handleRemoveLeerling:', error);
        return res.status(500).json({ error: 'Fout bij verwijderen leerling' });
    }
}

// ─────────────────────────────────────────────────────────
// FUNCTIE 23: GET KLAS DETAIL (read-only)
// Zelfde als get_groep_detail maar gefilterd op klas
// ─────────────────────────────────────────────────────────
async function handleGetKlasDetail(req, res, decodedToken) {
    try {
        const { klasNaam, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const masterKey = await getMasterKey();

        // Haal alle leerlingen van deze klas op
        const leerlingenSnap = await db.collection('toegestane_gebruikers')
            .where('school_id', '==', verifiedSchoolId)
            .where('klas', '==', klasNaam)
            .where('rol', '==', 'leerling')
            .where('is_active', '==', true)
            .get();

        const leerlingIds = leerlingenSnap.docs.map(d => d.id);
        const members = leerlingenSnap.docs.map(d => ({
            id: d.id,
            naam: decryptName(d.data().encrypted_name, masterKey),
            klas: d.data().klas || ''
        })).sort((a, b) => a.naam.localeCompare(b.naam));

        // Haal scores op voor dit schooljaar
        const nu = new Date();
        const startJaar = nu.getMonth() >= 8 ? nu.getFullYear() : nu.getFullYear() - 1;
        const schoolYearStart = Timestamp.fromDate(new Date(startJaar, 8, 1));
        const schoolYearEnd = Timestamp.fromDate(new Date(startJaar + 1, 7, 31, 23, 59, 59));

        let scoresByLeerling = {};
        let testenVoorSorteren = [];

        if (leerlingIds.length > 0) {
            const allScores = [];
            const chunks = [];
            for (let i = 0; i < leerlingIds.length; i += 30) chunks.push(leerlingIds.slice(i, i + 30));

            for (const chunk of chunks) {
                const scoresSnap = await db.collection('scores')
                    .where('leerling_id', 'in', chunk)
                    .where('datum', '>=', schoolYearStart)
                    .where('datum', '<=', schoolYearEnd)
                    .get();
                allScores.push(...scoresSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            }

            const testIds = [...new Set(allScores.map(s => s.test_id))];
            const testNamen = new Map();
            if (testIds.length > 0) {
                const testChunks = [];
                for (let i = 0; i < testIds.length; i += 30) testChunks.push(testIds.slice(i, i + 30));
                for (const chunk of testChunks) {
                    const testenSnap = await db.collection('testen').where('__name__', 'in', chunk).get();
                    testenSnap.docs.forEach(d => {
                        testNamen.set(d.id, d.data().naam);
                        testenVoorSorteren.push({ id: d.id, naam: d.data().naam });
                    });
                }
            }

            allScores.forEach(score => {
                if (!scoresByLeerling[score.leerling_id]) scoresByLeerling[score.leerling_id] = [];
                scoresByLeerling[score.leerling_id].push({
                    ...score,
                    datum: score.datum?.toDate ? score.datum.toDate().toISOString() : null,
                    test_naam: testNamen.get(score.test_id) || 'Onbekende Test'
                });
            });
        }

        return res.status(200).json({
            success: true,
            groep: { id: klasNaam, naam: klasNaam, isKlas: true },
            members,
            scoresByLeerling,
            availableTests: testenVoorSorteren.sort((a, b) => a.naam.localeCompare(b.naam))
        });
    } catch (error) {
        console.error('❌ handleGetKlasDetail:', error);
        return res.status(500).json({ error: 'Fout bij ophalen klasdetail' });
    }
}

// ─────────────────────────────────────────────────────────
// FUNCTIE 24: GET STUDENT EVOLUTION
// Haalt alle testdata + scores op voor een leerling
// ─────────────────────────────────────────────────────────
async function handleGetStudentEvolution(req, res, decodedToken) {
    try {
        const { leerlingId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        // Haal alle actieve testen op
        const testenSnap = await db.collection('testen')
            .where('school_id', '==', verifiedSchoolId)
            .where('is_actief', '==', true)
            .orderBy('categorie')
            .orderBy('naam')
            .get();

        const testen = testenSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Haal scores op per test voor deze leerling
        const evolutionData = [];

        for (const test of testen) {
            const scoresSnap = await db.collection('scores')
                .where('test_id', '==', test.id)
                .where('leerling_id', '==', leerlingId)
                .orderBy('datum', 'desc')
                .get();

            if (scoresSnap.empty) continue;

            const scores = scoresSnap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    score: data.score,
                    rapportpunt: data.rapportpunt || null,
                    datum: data.datum?.toDate ? data.datum.toDate().toISOString() : null
                };
            });

            // Personal best
            const sorted = [...scores].sort((a, b) => {
                if (test.score_richting === 'hoog') return b.score - a.score;
                return a.score - b.score;
            });
            const best = sorted[0];

            evolutionData.push({
                test_id: test.id,
                test_naam: test.naam,
                naam: test.naam,
                categorie: test.categorie,
                eenheid: test.eenheid,
                score_richting: test.score_richting,
                personal_best_score: best.score,
                personal_best_datum: best.datum,
                personal_best_points: best.rapportpunt,
                all_scores: scores
            });
        }

        return res.status(200).json({ success: true, evolutionData });
    } catch (error) {
        console.error('❌ handleGetStudentEvolution:', error);
        return res.status(500).json({ error: 'Fout bij ophalen evolutiedata' });
    }
}
// ─────────────────────────────────────────────────────────
// FUNCTIE: GET SCORE NORMS (voor EvolutionCard)
// ─────────────────────────────────────────────────────────
async function handleGetScoreNorms(req, res, decodedToken) {
    try {
        const { testId, klas, geslacht } = req.body;
        const GENDER_MAPPING = { 'm': 'M', 'v': 'V', 'man': 'M', 'vrouw': 'V', 'jongen': 'M', 'meisje': 'V' };

        if (!testId || !klas || !geslacht) return res.status(400).json({ error: 'testId, klas en geslacht zijn verplicht.' });

        // Klas → leeftijd
        const match = klas.toString().match(/^(\d+)/);
        if (!match) return res.status(200).json({ normen: null });
        const leerjaar = parseInt(match[1]);
        const leeftijd = Math.min(11 + leerjaar, 17);

        const mappedGender = GENDER_MAPPING[geslacht.toLowerCase()] || geslacht.toUpperCase();

        const normenSnap = await db.collection('normen').where('test_id', '==', testId).limit(1).get();
        if (normenSnap.empty) return res.status(200).json({ normen: null });

        const normData = normenSnap.docs[0].data();
        const puntenSchaal = normData.punten_schaal || [];
        const scoreRichting = normData.score_richting || 'hoog';

        // Zoek normen voor leeftijd (fallback naar dichtste leeftijd)
        const extractNorms = (age) => {
            const relevant = puntenSchaal.filter(n => n.leeftijd === age && n.geslacht === mappedGender);
            if (relevant.length === 0) return null;
            const find = (punt) => relevant.find(n => n.punt === punt)?.score_min;
            const n1 = find(1), n10 = find(10), n14 = find(14), n20 = find(20);
            if ([n1, n10, n14, n20].every(n => n !== undefined)) {
                return { '1': n1, '10': n10, '14': n14, '20': n20, norm_10: n10, norm_14: n14, score_richting: scoreRichting };
            }
            return null;
        };

        let normen = extractNorms(leeftijd);
        if (!normen) normen = extractNorms(Math.max(leeftijd - 1, 12));
        if (!normen) normen = extractNorms(Math.min(leeftijd + 1, 17));

        return res.status(200).json({ normen });
    } catch (error) {
        console.error('❌ handleGetScoreNorms:', error);
        return res.status(500).json({ error: 'Fout bij ophalen normen' });
    }
}
// ─────────────────────────────────────────────────────────
// GROEIPLAN ACTIONS
// ─────────────────────────────────────────────────────────
async function handleGetGroeiplanData(req, res, decodedToken) {
    try {
        const { leerlingId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        // Haal actieve schema-instanties op
        const schemasSnap = await db.collection('leerling_schemas')
            .where('leerling_id', '==', leerlingId).get();
        const actieveSchemaMap = new Map();
        schemasSnap.docs.forEach(d => {
            const data = d.data();
            actieveSchemaMap.set(data.schema_id, data.type || 'verplicht');
        });

        // Haal trainingsschemas op voor optionele schema's
        const optioneleSchemaIds = [...actieveSchemaMap.entries()]
            .filter(([_, type]) => type === 'optioneel')
            .map(([id]) => id);

        let optioneleSchemas = [];
        if (optioneleSchemaIds.length > 0) {
            const chunks = [];
            for (let i = 0; i < optioneleSchemaIds.length; i += 30) chunks.push(optioneleSchemaIds.slice(i, i + 30));
            for (const chunk of chunks) {
                const snap = await db.collection('trainingsschemas').where('__name__', 'in', chunk).get();
                optioneleSchemas.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
        }

        return res.status(200).json({
            success: true,
            actieveSchemaMap: Object.fromEntries(actieveSchemaMap),
            optioneleSchemas
        });
    } catch (error) {
        console.error('❌ handleGetGroeiplanData:', error);
        return res.status(500).json({ error: 'Fout bij ophalen groeiplan data' });
    }
}

async function handleGetTrainingsschemas(req, res, decodedToken) {
    try {
        await getSchoolId(decodedToken.uid); // ✅ verificeer token
        const snap = await db.collection('trainingsschemas').get();
        return res.status(200).json({
            success: true,
            schemas: snap.docs.map(d => ({ id: d.id, ...d.data() }))
        });
    } catch (error) {
        console.error('❌ handleGetTrainingsschemas:', error);
        return res.status(500).json({ error: 'Fout bij ophalen trainingsschemas' });
    }
}

async function handleGetTrainingsschemaForTest(req, res, decodedToken) {
    try {
        const { testId } = req.body;
        await getSchoolId(decodedToken.uid);
        const snap = await db.collection('trainingsschemas')
            .where('gekoppelde_test_id', '==', testId).limit(1).get();
        if (snap.empty) return res.status(200).json({ success: true, schema: null });
        return res.status(200).json({ success: true, schema: { id: snap.docs[0].id, ...snap.docs[0].data() } });
    } catch (error) {
        console.error('❌ handleGetTrainingsschemaForTest:', error);
        return res.status(500).json({ error: 'Fout bij ophalen trainingsschema' });
    }
}

async function handleAddOptioneelSchema(req, res, decodedToken) {
    try {
        const { leerlingId, schemaId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const docId = `${leerlingId}_${schemaId}`;
        await db.collection('leerling_schemas').doc(docId).set({
            leerling_id: leerlingId,
            schema_id: schemaId,
            start_datum: Timestamp.now(),
            huidige_week: 1,
            voltooide_taken: {},
            type: 'optioneel'
        });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ handleAddOptioneelSchema:', error);
        return res.status(500).json({ error: 'Fout bij toevoegen schema' });
    }
}

async function handleRemoveOptioneelSchema(req, res, decodedToken) {
    try {
        const { leerlingId, schemaId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const docId = `${leerlingId}_${schemaId}`;
        await db.collection('leerling_schemas').doc(docId).delete().catch(() => {});
        await db.collection('leerling_optionele_schemas').doc(docId).delete().catch(() => {});
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ handleRemoveOptioneelSchema:', error);
        return res.status(500).json({ error: 'Fout bij verwijderen schema' });
    }
}

async function handleCheckSchemaExists(req, res, decodedToken) {
    try {
        const { leerlingId, schemaId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const docId = `${leerlingId}_${schemaId}`;
        const snap = await db.collection('leerling_schemas').doc(docId).get();
        return res.status(200).json({ success: true, exists: snap.exists });
    } catch (error) {
        console.error('❌ handleCheckSchemaExists:', error);
        return res.status(500).json({ error: 'Fout bij controleren schema' });
    }
}

async function handleStartSchema(req, res, decodedToken) {
    try {
        const { leerlingId, schemaId, type, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const docId = `${leerlingId}_${schemaId}`;
        const snap = await db.collection('leerling_schemas').doc(docId).get();
        if (!snap.exists) {
            await db.collection('leerling_schemas').doc(docId).set({
                leerling_id: leerlingId,
                schema_id: schemaId,
                start_datum: Timestamp.now(),
                huidige_week: 1,
                voltooide_taken: {},
                type: type || 'optioneel'
            });
        }
        return res.status(200).json({ success: true, exists: snap.exists });
    } catch (error) {
        console.error('❌ handleStartSchema:', error);
        return res.status(500).json({ error: 'Fout bij starten schema' });
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
            case 'save_norm': {
    const { schoolId: sId, testId, norm } = req.body;
    const verifiedSchoolId = await getSchoolId(decodedToken.uid);
    if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
    try {
        const normDocRef = db.collection('normen').doc(testId);
        const normSnap = await normDocRef.get();
        if (normSnap.exists) {
            await normDocRef.update({ punten_schaal: [...(normSnap.data().punten_schaal || []), norm] });
        } else {
            await normDocRef.set({ test_id: testId, school_id: verifiedSchoolId, punten_schaal: [norm] });
        }
        return res.status(200).json({ success: true });
    } catch (err) { return res.status(500).json({ error: err.message }); }
            }

            case 'update_norm': {
                const { schoolId: sId, testId, originalNorm, updatedNorm } = req.body;
                const verifiedSchoolId = await getSchoolId(decodedToken.uid);
                if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
                try {
                    const normDocRef = db.collection('normen').doc(testId);
                    const normSnap = await normDocRef.get();
                    if (!normSnap.exists) return res.status(404).json({ error: 'Normen niet gevonden' });
                    const updated = (normSnap.data().punten_schaal || []).map(n =>
                        n.leeftijd === originalNorm.leeftijd && n.geslacht === originalNorm.geslacht &&
                        n.score_min === originalNorm.score_min && n.punt === originalNorm.punt ? updatedNorm : n
                    );
                    await normDocRef.update({ punten_schaal: updated });
                    return res.status(200).json({ success: true });
                } catch (err) { return res.status(500).json({ error: err.message }); }
            }

            case 'delete_normen': {
                const { schoolId: sId, testId, normen: normenToDelete } = req.body;
                const verifiedSchoolId = await getSchoolId(decodedToken.uid);
                if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
                try {
                    const normDocRef = db.collection('normen').doc(testId);
                    const normSnap = await normDocRef.get();
                    if (!normSnap.exists) return res.status(404).json({ error: 'Normen niet gevonden' });
                    const filtered = (normSnap.data().punten_schaal || []).filter(n =>
                        !normenToDelete.some(d => d.leeftijd === n.leeftijd && d.geslacht === n.geslacht &&
                            d.score_min === n.score_min && d.punt === n.punt)
                    );
                    await normDocRef.update({ punten_schaal: filtered });
                    return res.status(200).json({ success: true });
                } catch (err) { return res.status(500).json({ error: err.message }); }
            }

            case 'import_normen': {
                const { schoolId: sId, testId, normen: nieuweNormen, bestaandeNormen } = req.body;
                const verifiedSchoolId = await getSchoolId(decodedToken.uid);
                if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
                try {
                    const normDocRef = db.collection('normen').doc(testId);
                    const samengevoegd = [...(bestaandeNormen || []), ...nieuweNormen];
                    await normDocRef.set({ punten_schaal: samengevoegd, test_id: testId, school_id: verifiedSchoolId }, { merge: true });
                    return res.status(200).json({ success: true });
                } catch (err) { return res.status(500).json({ error: err.message }); }
            }
            case 'get_groeiplan_data': 
            return await handleGetGroeiplanData(req, res, decodedToken);
            
            case 'get_trainingsschemas': 
            return await handleGetTrainingsschemas(req, res, decodedToken);

            case 'save_schema': {
                const { schoolId: sId, schemaId, schema } = req.body;
                const verifiedSchoolId = await getSchoolId(decodedToken.uid);
                if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
                try {
                    const schemaObject = {
                        ...schema,
                        school_id: verifiedSchoolId,
                        last_updated_at: admin.firestore.FieldValue.serverTimestamp()
                    };
                    if (schemaId) {
                        await db.collection('trainingsschemas').doc(schemaId).set(schemaObject, { merge: true });
                    } else {
                        schemaObject.created_at = admin.firestore.FieldValue.serverTimestamp();
                        await db.collection('trainingsschemas').add(schemaObject);
                    }
                    return res.status(200).json({ success: true });
                } catch (err) {
                    console.error('❌ save_schema:', err);
                    return res.status(500).json({ error: err.message });
                }
            }

            case 'get_trainingsschema_for_test': 
            return await handleGetTrainingsschemaForTest(req, res, decodedToken);
            case 'add_optioneel_schema': 
            return await handleAddOptioneelSchema(req, res, decodedToken);
            case 'remove_optioneel_schema': 
            return await handleRemoveOptioneelSchema(req, res, decodedToken);
            case 'check_schema_exists': 
            return await handleCheckSchemaExists(req, res, decodedToken);
            case 'start_schema': 
            return await handleStartSchema(req, res, decodedToken);    
            case 'delete_leerling_schema': {
                const { schoolId: sId, leerlingId, schemaTemplateId } = req.body;
                const verifiedSchoolId = await getSchoolId(decodedToken.uid);
                if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
                try {
                    const schemaId = `${leerlingId}_${schemaTemplateId}`;
                    await db.collection('leerling_schemas').doc(schemaId).delete();
                    return res.status(200).json({ success: true });
                } catch (err) {
                    return res.status(500).json({ error: err.message });
                }
            }

            case 'save_oefening': {
                const { schoolId: sId, oefeningId, oefening } = req.body;
                const verifiedSchoolId = await getSchoolId(decodedToken.uid);
                if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
                try {
                    const oefeningObject = {
                        ...oefening,
                        school_id: verifiedSchoolId,
                        last_updated_at: admin.firestore.FieldValue.serverTimestamp()
                    };
                    if (oefeningId) {
                        await db.collection('oefeningen').doc(oefeningId).set(oefeningObject, { merge: true });
                    } else {
                        oefeningObject.created_at = admin.firestore.FieldValue.serverTimestamp();
                        await db.collection('oefeningen').add(oefeningObject);
                    }
                    return res.status(200).json({ success: true });
                } catch (err) {
                    return res.status(500).json({ error: err.message });
                }
            }
            case 'save_test': {
                const { schoolId: sId, testId, customId, test } = req.body;
                const verifiedSchoolId = await getSchoolId(decodedToken.uid);
                if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
                try {
                    const testObject = {
                        ...test,
                        school_id: verifiedSchoolId,
                        last_updated_at: admin.firestore.FieldValue.serverTimestamp()
                    };
                    if (testId) {
                        await db.collection('testen').doc(testId).update(testObject);
                    } else {
                        testObject.created_at = admin.firestore.FieldValue.serverTimestamp();
                        await db.collection('testen').doc(customId).set(testObject);
                    }
                    return res.status(200).json({ success: true });
                } catch (err) {
                    return res.status(500).json({ error: err.message });
                }
            }
            case 'save_school': {
                const verifiedSchoolId = await getSchoolId(decodedToken.uid);
                const verifiedProfile = await db.collection('users').where('toegestane_gebruikers_id', '==', decodedToken.uid).limit(1).get();
                // Alleen super-administrator mag scholen aanmaken/bewerken
                const userSnap = await db.collection('users').doc(decodedToken.uid).get();
                if (!userSnap.exists || userSnap.data().rol !== 'super-administrator') {
                    return res.status(403).json({ error: 'Alleen super-administrators mogen scholen beheren.' });
                }
                const { schoolId, school } = req.body;
                try {
                    if (schoolId) {
                        await db.collection('scholen').doc(schoolId).update(school);
                    } else {
                        const customId = school.naam.toLowerCase().replace(/\s+/g, '_');
                        await db.collection('scholen').doc(customId).set(school);
                    }
                    return res.status(200).json({ success: true });
                } catch (err) {
                    return res.status(500).json({ error: err.message });
                }
            }
            case 'get_school_settings': {
                const { schoolId: sId } = req.body;
                const verifiedSchoolId = await getSchoolId(decodedToken.uid);
                if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
                try {
                    const schoolSnap = await db.collection('scholen').doc(verifiedSchoolId).get();
                    return res.status(200).json({ instellingen: schoolSnap.exists ? schoolSnap.data().instellingen || null : null });
                } catch (err) { return res.status(500).json({ error: err.message }); }
            }

            case 'save_school_settings': {
                const { schoolId: sId, instellingen } = req.body;
                const verifiedSchoolId = await getSchoolId(decodedToken.uid);
                if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
                try {
                    await db.collection('scholen').doc(verifiedSchoolId).update({ instellingen });
                    return res.status(200).json({ success: true });
                } catch (err) { return res.status(500).json({ error: err.message }); }
            }
            case 'get_recent_scores':
                return await handleGetRecentScores(req, res, decodedToken);
            case 'save_scores':
                return await handleSaveScores(req, res, decodedToken);
            case 'get_testafname_detail':
                return await handleGetTestafnameDetail(req, res, decodedToken);
            case 'update_score':
                return await handleUpdateScore(req, res, decodedToken);
            case 'delete_score':
                return await handleDeleteScore(req, res, decodedToken);
            case 'update_score_date':
                return await handleUpdateScoreDate(req, res, decodedToken);
            case 'delete_testafname':
                return await handleDeleteTestafname(req, res, decodedToken);
            case 'delete_test':
                return await handleDeleteTest(req, res, decodedToken);
            case 'get_klas_detail':
                return await handleGetKlasDetail(req, res, decodedToken);
            case 'get_score_norms':
                return await handleGetScoreNorms(req, res, decodedToken);
            case 'get_student_profile': {
                const { schoolId: sId, leerlingId } = req.body;
                const verifiedSchoolId = await getSchoolId(decodedToken.uid);
                if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
                try {
                    const tgDoc = await db.collection('toegestane_gebruikers').doc(leerlingId).get();
                    if (!tgDoc.exists) return res.status(404).json({ error: 'Niet gevonden' });
                    const data = tgDoc.data();
                    if (data.school_id !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
                    return res.status(200).json({
                        geslacht: (data.gender || '').toLowerCase() || null,
                        klas: data.klas || null,
                    });
                } catch (err) {
                    return res.status(500).json({ error: err.message });
                }
            }
            case 'get_test_ranking': {
                const { schoolId: sId, testId, score, klas, geslacht } = req.body;
                const verifiedSchoolId = await getSchoolId(decodedToken.uid);
                if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });

                try {
                    const { getLeeftijdFromKlas } = await import('./utils/klasUtils.js').catch(() => ({
                        getLeeftijdFromKlas: (k) => {
                            const match = k?.toString().match(/^(\d+)/);
                            if (!match) return null;
                            const l = parseInt(match[1]);
                            return (l >= 1 && l <= 6) ? 11 + l : null;
                        }
                    }));

                    const leeftijd = getLeeftijdFromKlas(klas);

                    // Haal testinfo op
                    const testDoc = await db.collection('testen').doc(testId).get();
                    if (!testDoc.exists) return res.status(404).json({ error: 'Test niet gevonden' });
                    const scoreRichting = testDoc.data().score_richting || 'hoog';

                    // Haal alle scores op voor deze test
                    const scoresSnap = await db.collection('scores')
                        .where('test_id', '==', testId)
                        .where('school_id', '==', verifiedSchoolId)
                        .get();

                    if (scoresSnap.empty) {
                        return res.status(200).json({ overallRank: 1, totalStudents: 1, ageRank: 1, ageGroupTotal: 1 });
                    }

                    // Beste score per leerling
                    const bestScores = {};
                    scoresSnap.docs.forEach(d => {
                        const data = d.data();
                        if (!data.leerling_id || data.score == null) return;
                        if (!bestScores[data.leerling_id] ||
                            (scoreRichting === 'hoog' && data.score > bestScores[data.leerling_id].score) ||
                            (scoreRichting !== 'hoog' && data.score < bestScores[data.leerling_id].score)) {
                            bestScores[data.leerling_id] = { score: data.score };
                        }
                    });

                    const allScores = Object.values(bestScores).map(s => s.score);
                    const totalStudents = allScores.length;

                    // Overall ranking
                    const sorted = [...allScores].sort((a, b) => scoreRichting === 'hoog' ? b - a : a - b);
                    const overallRank = sorted.findIndex(s => scoreRichting === 'hoog' ? s <= score : s >= score) + 1 || 1;

                    // Leeftijdsgroep ranking via klas van toegestane_gebruikers
                    let ageRank = 1;
                    let ageGroupTotal = 1;

                    if (leeftijd) {
                        const leerlingIds = Object.keys(bestScores);
                        const chunks = [];
                        for (let i = 0; i < leerlingIds.length; i += 30) chunks.push(leerlingIds.slice(i, i + 30));

                        const ageGroupScores = [];
                        for (const chunk of chunks) {
                            const tgSnap = await db.collection('toegestane_gebruikers')
                                .where('__name__', 'in', chunk).get();
                            tgSnap.docs.forEach(d => {
                                const tgData = d.data();
                                const tgLeeftijd = getLeeftijdFromKlas(tgData.klas);
                                const tgGeslacht = (tgData.gender || '').toLowerCase();
                                const myGeslacht = (geslacht || '').toLowerCase();
                                if (tgLeeftijd && Math.abs(tgLeeftijd - leeftijd) <= 1 && tgGeslacht === myGeslacht) {
                                    ageGroupScores.push(bestScores[d.id].score);
                                }
                            });
                        }

                        ageGroupTotal = ageGroupScores.length || 1;
                        if (ageGroupScores.length > 0) {
                            const sortedAge = [...ageGroupScores].sort((a, b) => scoreRichting === 'hoog' ? b - a : a - b);
                            ageRank = sortedAge.findIndex(s => scoreRichting === 'hoog' ? s <= score : s >= score) + 1 || 1;
                        }
                    }

                    return res.status(200).json({ overallRank, totalStudents, ageRank, ageGroupTotal, leeftijd });
                } catch (err) {
                    console.error('❌ get_test_ranking:', err);
                    return res.status(500).json({ error: err.message });
                }
            }
            case 'get_ehbo_stats': {
                const { schoolId: sId, classId, studentId } = req.body;
                const verifiedSchoolId = await getSchoolId(decodedToken.uid);
                if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });

                try {
                    let leerlingIds = [];

                    if (studentId) {
                        leerlingIds = [studentId];
                    } else if (classId) {
                        const groepDoc = await db.collection('groepen').doc(classId).get();
                        if (!groepDoc.exists) return res.status(404).json({ error: 'Groep niet gevonden' });
                        const groepData = groepDoc.data();
                        if (groepData.school_id !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
                        leerlingIds = groepData.leerling_ids || [];
                    } else {
                        return res.status(400).json({ error: 'classId of studentId vereist' });
                    }

                    if (leerlingIds.length === 0) {
                        return res.status(200).json({
                            success: true,
                            classStats: { totalStudents: 0, studentsCompleted: 0, averageScore: 0, topPerformers: [], strugglingStudents: [] },
                            students: []
                        });
                    }

                    const masterKey = await getMasterKey();

                    // Namen ophalen uit toegestane_gebruikers (max 30 per query)
                    const chunks = [];
                    for (let i = 0; i < leerlingIds.length; i += 30) chunks.push(leerlingIds.slice(i, i + 30));
                    const toegestaneData = new Map();
                    for (const chunk of chunks) {
                        const snap = await db.collection('toegestane_gebruikers').where('__name__', 'in', chunk).get();
                        snap.docs.forEach(d => toegestaneData.set(d.id, d.data()));
                    }

                    const studentResults = [];
                    let totalScore = 0, studentsCompleted = 0;
                    const topPerformers = [], strugglingStudents = [];

                    for (const uid of leerlingIds) {
                        const tgData = toegestaneData.get(uid);
                        const naam = tgData?.encrypted_name ? decryptName(tgData.encrypted_name, masterKey) : '[Onbekend]';

                        const ehboDoc = await db.collection('ehbo_progress').doc(uid).get();
                        if (!ehboDoc.exists) {
                            studentResults.push({ id: uid, name: naam, isRegistered: false, progressPercentage: 0, averageScore: 0, completedScenarios: 0, certificationReady: false, lastActivity: null });
                            continue;
                        }

                        const ehboData = ehboDoc.data();
                        const completedScenarios = ehboData.completed_scenarios?.length || 0;
                        const totalScenarios = ehboData.total_scenarios || 10;
                        const progressPercentage = Math.round((completedScenarios / totalScenarios) * 100);
                        const averageScore = ehboData.average_score || 0;
                        const certificationReady = progressPercentage >= 80 && averageScore >= 70;

                        totalScore += averageScore;
                        if (certificationReady) studentsCompleted++;
                        if (averageScore >= 80) topPerformers.push({ name: naam, averageScore, completedScenarios });
                        if (averageScore < 50 || progressPercentage < 30) {
                            strugglingStudents.push({ name: naam, issue: averageScore < 50 ? 'low_scores' : 'inactive', recommendation: averageScore < 50 ? 'Extra oefening nodig' : 'Nog niet gestart' });
                        }

                        studentResults.push({ id: uid, name: naam, isRegistered: true, progressPercentage, averageScore, completedScenarios, certificationReady, lastActivity: ehboData.last_activity?.toDate?.()?.toISOString() || null });
                    }

                    const registered = studentResults.filter(s => s.isRegistered);
                    return res.status(200).json({
                        success: true,
                        classStats: {
                            totalStudents: leerlingIds.length,
                            studentsCompleted,
                            averageScore: registered.length > 0 ? Math.round(totalScore / registered.length) : 0,
                            topPerformers: topPerformers.sort((a, b) => b.averageScore - a.averageScore).slice(0, 5),
                            strugglingStudents: strugglingStudents.slice(0, 5),
                        },
                        students: studentResults
                    });
                } catch (err) {
                    console.error('❌ get_ehbo_stats:', err);
                    return res.status(500).json({ error: err.message });
                }
            }

            case 'get_welzijn_stats': {
                const { schoolId: sId, classId, studentId } = req.body;
                const verifiedSchoolId = await getSchoolId(decodedToken.uid);
                const userDoc = await db.collection('users').doc(decodedToken.uid).get();
                const userRol = userDoc.data()?.rol || '';
                if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
                if (!['leerkracht', 'administrator', 'super-administrator'].includes(userRol)) {
                    return res.status(403).json({ error: 'Geen toegang' });
                }
 
                
                try {
                    let leerlingIds = [];

                    if (studentId) {
                        leerlingIds = [studentId];
                    } else if (classId) {
                        const groepDoc = await db.collection('groepen').doc(classId).get();
                        if (!groepDoc.exists) return res.status(404).json({ error: 'Groep niet gevonden' });
                        const groepData = groepDoc.data();
                        if (groepData.school_id !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
                        leerlingIds = groepData.leerling_ids || [];
                    } else {
                        return res.status(400).json({ error: 'classId of studentId vereist' });
                    }

                    if (leerlingIds.length === 0) {
                        return res.status(200).json({
                            success: true,
                            groupStats: { totalStudents: 0, avgScore: 0, avgSleep: 0, avgSteps: 0, avgLogs7Days: 0, avgLogs30Days: 0, activeParticipation: 0 },
                            studentData: []
                        });
                    }

                    const masterKey = await getMasterKey();

                    // Namen ophalen
                    const chunks = [];
                    for (let i = 0; i < leerlingIds.length; i += 30) chunks.push(leerlingIds.slice(i, i + 30));
                    const toegestaneData = new Map();
                    for (const chunk of chunks) {
                        const snap = await db.collection('toegestane_gebruikers').where('__name__', 'in', chunk).get();
                        snap.docs.forEach(d => toegestaneData.set(d.id, d.data()));
                    }

                    const now = new Date();
                    const cutoff7 = new Date(now - 7 * 86400000).toISOString().split('T')[0];

                    const studentDataArr = [];
                    let totalScore = 0, totalSleep = 0, totalSteps = 0, totalLogs7 = 0, totalLogs30 = 0, activeCount = 0;

                    for (const uid of leerlingIds) {
                        const tgData = toegestaneData.get(uid);
                        const naam = tgData?.encrypted_name ? decryptName(tgData.encrypted_name, masterKey) : '[Onbekend]';

                        // GDPR: enkel aggregaten — geen raw gezondheidsdata naar leerkracht
                        const logsSnap = await db.collection('welzijn').doc(uid)
                            .collection('dagelijkse_data')
                            .orderBy('__name__', 'desc')
                            .limit(30)
                            .get();

                        const logs = logsSnap.docs.map(d => ({ date: d.id, ...d.data() }));
                        const logs7 = logs.filter(l => l.date >= cutoff7).length;
                        const logs30 = logs.length;

                        const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
                        const humeurMap = { 'Slecht': 20, 'Matig': 40, 'Neutraal': 60, 'Goed': 80, 'Uitstekend': 100 };
                        const avgSleep = avg(logs.filter(l => l.slaap_uren).map(l => l.slaap_uren));
                        const avgSteps = avg(logs.filter(l => l.stappen).map(l => l.stappen));
                        const avgScore = avg(logs.filter(l => l.humeur).map(l => humeurMap[l.humeur] || 60));

                        totalScore += avgScore;
                        totalSleep += avgSleep;
                        totalSteps += avgSteps;
                        totalLogs7 += logs7;
                        totalLogs30 += logs30;
                        if (logs7 >= 3) activeCount++;

                        studentDataArr.push({ id: uid, naam, avgScore, avgSleep, avgSteps, logs: { last7days: logs7, last30days: logs30 } });
                    }

                    const n = studentDataArr.length || 1;
                    return res.status(200).json({
                        success: true,
                        groupStats: {
                            totalStudents: leerlingIds.length,
                            avgScore: Math.round(totalScore / n),
                            avgSleep: Math.round((totalSleep / n) * 10) / 10,
                            avgSteps: Math.round(totalSteps / n),
                            avgLogs7Days: Math.round((totalLogs7 / n) * 10) / 10,
                            avgLogs30Days: Math.round(totalLogs30 / n),
                            activeParticipation: Math.round((activeCount / leerlingIds.length) * 100),
                        },
                        studentData: studentDataArr
                    });
                } catch (err) {
                    console.error('❌ get_welzijn_stats:', err);
                    return res.status(500).json({ error: err.message });
                }
            }
// ─────────────────────────────────────────────────────────────────────────────
// TOEVOEGEN AAN api/tests.js — in de switch(action) { ... }
// Vervangt directe Firestore calls in SchemaDetail.jsx
// ─────────────────────────────────────────────────────────────────────────────

                        case 'get_schema_detail': {
                            const { schoolId: sId, leerlingId, schemaTemplateId } = req.body;
                            const verifiedSchoolId = await getSchoolId(decodedToken.uid);
                            if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
                            try {
                                const masterKey = await getMasterKey();

                                // Leerlingprofiel ophalen
                                let leerlingProfiel = null;
                                const usersSnap = await db.collection('users')
                                    .where('toegestane_gebruikers_id', '==', leerlingId)
                                    .limit(1).get();
                                if (!usersSnap.empty) {
                                    const ud = usersSnap.docs[0];
                                    leerlingProfiel = { id: ud.id, ...ud.data() };
                                } else {
                                    const tgDoc = await db.collection('toegestane_gebruikers').doc(leerlingId).get();
                                    if (tgDoc.exists) {
                                        const tgData = tgDoc.data();
                                        leerlingProfiel = {
                                            id: tgDoc.id,
                                            naam: decryptName(tgData.encrypted_name, masterKey),
                                            klas: tgData.klas,
                                            toegestane_gebruikers_id: tgDoc.id,
                                        };
                                    }
                                }

                                // Schema details + actief schema
                                const schemaId = `${leerlingId}_${schemaTemplateId}`;
                                const [schemaSnap, actiefSnap] = await Promise.all([
                                    db.collection('trainingsschemas').doc(schemaTemplateId).get(),
                                    db.collection('leerling_schemas').doc(schemaId).get(),
                                ]);

                                return res.status(200).json({
                                    leerlingProfiel,
                                    schemaDetails: schemaSnap.exists ? schemaSnap.data() : null,
                                    actiefSchema: actiefSnap.exists ? { id: actiefSnap.id, ...actiefSnap.data() } : null,
                                });
                            } catch (err) {
                                console.error('❌ get_schema_detail:', err);
                                return res.status(500).json({ error: err.message });
                            }
                        }

                        case 'get_schema_actief': {
                            const { schoolId: sId, leerlingId, schemaTemplateId } = req.body;
                            const verifiedSchoolId = await getSchoolId(decodedToken.uid);
                            if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
                            try {
                                const schemaId = `${leerlingId}_${schemaTemplateId}`;
                                const snap = await db.collection('leerling_schemas').doc(schemaId).get();
                                return res.status(200).json({
                                    actiefSchema: snap.exists ? { id: snap.id, ...snap.data() } : null
                                });
                            } catch (err) {
                                return res.status(500).json({ error: err.message });
                            }
                        }

                        case 'voltooien_taak': {
                            const { schoolId: sId, leerlingId, schemaTemplateId, voltooide_taken } = req.body;
                            const verifiedSchoolId = await getSchoolId(decodedToken.uid);
                            if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
                            try {
                                const schemaId = `${leerlingId}_${schemaTemplateId}`;
                                await db.collection('leerling_schemas').doc(schemaId).update({ voltooide_taken });
                                return res.status(200).json({ success: true });
                            } catch (err) {
                                console.error('❌ voltooien_taak:', err);
                                return res.status(500).json({ error: err.message });
                            }
                        }

                        case 'valideer_week': {
                            const { schoolId: sId, leerlingId, schemaTemplateId, voltooide_taken, gevalideerde_weken, huidige_week } = req.body;
                            const verifiedSchoolId = await getSchoolId(decodedToken.uid);
                            if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
                            // Controleer rol
                            const rolDoc = await db.collection('users').doc(decodedToken.uid).get();
                            const rolUser = rolDoc.data()?.rol || '';
                            if (!['leerkracht', 'administrator', 'super-administrator'].includes(rolUser)) {
                                return res.status(403).json({ error: 'Enkel leerkrachten kunnen weken valideren' });
                            }
                            try {
                                const schemaId = `${leerlingId}_${schemaTemplateId}`;
                                await db.collection('leerling_schemas').doc(schemaId).update({
                                    voltooide_taken,
                                    gevalideerde_weken,
                                    huidige_week,
                                });
                                return res.status(200).json({ success: true });
                            } catch (err) {
                                console.error('❌ valideer_week:', err);
                                return res.status(500).json({ error: err.message });
                            }
                        }

                        case 'get_oefening_detail': {
                            const { schoolId: sId, oefeningId } = req.body;
                            const verifiedSchoolId = await getSchoolId(decodedToken.uid);
                            if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
                            try {
                                const snap = await db.collection('oefeningen').doc(oefeningId).get();
                                return res.status(200).json({
                                    oefening: snap.exists ? { id: snap.id, ...snap.data() } : null
                                });
                            } catch (err) {
                                return res.status(500).json({ error: err.message });
                            }
                        }
                        case 'get_mijn_klassen':
                            return await handleGetMijnKlassen(req, res, decodedToken);

                        case 'create_groep':
                            return await handleCreateGroep(req, res, decodedToken);

                        case 'update_groep':
                            return await handleUpdateGroep(req, res, decodedToken);

                        case 'delete_groep':
                            return await handleDeleteGroep(req, res, decodedToken);

                        // ✅ NIEUW — GroupDetail migratie
                        case 'get_groepen': return await handleGetGroepen(req, res, decodedToken);
                        case 'get_evaluaties': return await handleGetEvaluaties(req, res, decodedToken);
                        case 'get_groep_detail':
                            return await handleGetGroepDetail(req, res, decodedToken);

                        case 'add_leerling':
                            return await handleAddLeerling(req, res, decodedToken);

                        case 'remove_leerling':
                            return await handleRemoveLeerling(req, res, decodedToken);

                        // ✅ NIEUW — Evolutie/Groeiplan
                        case 'get_student_evolution':
                            return await handleGetStudentEvolution(req, res, decodedToken);
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