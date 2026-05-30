// api/handlers/testen.js
import { db } from '../../lib/firebaseAdmin.js';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getMasterKey } from '../../lib/keyManager.js';
import { getSchoolId, decryptName, getLeeftijdFromKlas, berekenPunt } from '../../lib/apiHelpers.js';

// ─── Leaderboard cache ────────────────────────────────────────────────────────
const usersCache = new Map();
const cacheExpiry = 5 * 60 * 1000;

async function getCachedUsers(schoolId) {
    const cacheKey = `users_school_${schoolId}`;
    const cached = usersCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < cacheExpiry) return cached.data;

    try {
        const snapshot = await db.collection('toegestane_gebruikers')
            .where('rol', '==', 'leerling')
            .where('school_id', '==', schoolId)
            .where('is_active', '==', true)
            .get();

        const usersData = new Map();
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            usersData.set(doc.id, { klas: data.klas || null, naam: data.decrypted_name || 'Leerling' });
        });

        usersCache.set(cacheKey, { data: usersData, timestamp: Date.now() });
        return usersData;
    } catch (error) {
        console.error('Server error fetching users data:', error);
        return new Map();
    }
}

// ─── GET TESTS ────────────────────────────────────────────────────────────────
export async function handleGetTests(req, res, decodedToken) {
    try {
        const schoolId = await getSchoolId(decodedToken.uid);
        const querySnapshot = await db.collection('testen')
            .where('school_id', '==', schoolId)
            .where('is_actief', '==', true)
            .orderBy('naam')
            .get();
        return res.status(200).json({ success: true, testen: querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) });
    } catch (error) {
        console.error('❌ handleGetTests:', error);
        return res.status(500).json({ error: 'Fout bij ophalen van testen' });
    }
}

// ─── GET LEADERBOARD ──────────────────────────────────────────────────────────
export async function handleGetLeaderboard(req, res, decodedToken) {
    try {
        const { testId, globalAgeFilter } = req.body;
        const schoolId = await getSchoolId(decodedToken.uid);

        const testSnap = await db.collection('testen').doc(testId).get();
        if (!testSnap.exists) return res.status(404).json({ error: 'Test niet gevonden' });
        const testData = testSnap.data();

        const scoreDirection = testData.score_richting === 'hoog' ? 'desc' : 'asc';
        const scoresSnapshot = await db.collection('scores')
            .where('test_id', '==', testId)
            .where('school_id', '==', schoolId)
            .orderBy('score', scoreDirection)
            .limit(globalAgeFilter ? 200 : 20)
            .get();

        let rawScores = scoresSnapshot.docs.map(doc => ({
            ...doc.data(), id: doc.id,
            datum: doc.data().datum?.toDate ? doc.data().datum.toDate().toISOString() : null
        }));

        if (globalAgeFilter) {
            const usersData = await getCachedUsers(schoolId);
            rawScores = rawScores.filter(score => {
                const userData = usersData.get(score.leerling_id);
                if (!userData?.klas) return false;
                const scoreUserAge = getLeeftijdFromKlas(userData.klas);
                if (scoreUserAge === null) return false;
                const targetAge = globalAgeFilter;
                if (targetAge === 12) return scoreUserAge <= 12;
                if (targetAge === 17) return scoreUserAge >= 17;
                return scoreUserAge === targetAge;
            });
        }

        const leerlingIds = rawScores.slice(0, 5).map(s => s.leerling_id).filter(Boolean);
        const nicknameMap = new Map();
        if (leerlingIds.length > 0) {
            const usersSnap = await db.collection('users')
                .where('toegestane_gebruikers_id', 'in', leerlingIds).get();
            usersSnap.docs.forEach(d =>
                nicknameMap.set(d.data().toegestane_gebruikers_id, d.data().nickname || 'Sporter')
            );
        }

        const scoresWithNickname = rawScores.slice(0, 5).map(s => ({
            ...s, leerling_naam: nicknameMap.get(s.leerling_id) || 'Sporter'
        }));

        return res.status(200).json({ success: true, scores: scoresWithNickname, testData });
    } catch (error) {
        console.error('❌ handleGetLeaderboard:', error);
        return res.status(500).json({ error: 'Fout bij ophalen van leaderboard' });
    }
}

// ─── GET SETUP DATA ───────────────────────────────────────────────────────────
export async function handleGetSetupData(req, res, decodedToken) {
    try {
        const { schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang tot deze school.' });

        const [groepenSnap, testenSnap] = await Promise.all([
            db.collection('groepen')
                .where('school_id', '==', verifiedSchoolId)
                .where('leerkracht_id', '==', decodedToken.uid).get(),
            db.collection('testen')
                .where('school_id', '==', verifiedSchoolId)
                .where('is_actief', '==', true)
                .orderBy('naam').get()
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

// ─── GET LEERLINGEN VOOR GROEP ────────────────────────────────────────────────
export async function handleGetLeerlingenVoorGroep(req, res, decodedToken) {
    try {
        const { groepId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang tot deze school.' });

        const groepSnap = await db.collection('groepen').doc(groepId).get();
        if (!groepSnap.exists) return res.status(404).json({ error: 'Groep niet gevonden.' });
        const groepData = groepSnap.data();
        if (groepData.school_id !== verifiedSchoolId || groepData.leerkracht_id !== decodedToken.uid) {
            return res.status(403).json({ error: 'Geen toegang tot deze groep.' });
        }

        const leerlingIds = groepData.leerling_ids || [];
        if (leerlingIds.length === 0) return res.status(200).json({ success: true, leerlingen: [] });

        const masterKey = await getMasterKey();
        const chunks = [];
        for (let i = 0; i < leerlingIds.length; i += 30) chunks.push(leerlingIds.slice(i, i + 30));

        const toegestaneData = new Map();
        for (const chunk of chunks) {
            const snap = await db.collection('toegestane_gebruikers').where('__name__', 'in', chunk).get();
            snap.docs.forEach(d => toegestaneData.set(d.id, d.data()));
        }

        const leerlingen = leerlingIds
            .filter(id => toegestaneData.has(id))
            .map(id => {
                const tgData = toegestaneData.get(id);
                return {
                    id,
                    data: {
                        klas: tgData.klas || null,
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

// ─── GET NORMEN ───────────────────────────────────────────────────────────────
export async function handleGetNormen(req, res, decodedToken) {
    try {
        const { testId } = req.body;
        const schoolId = await getSchoolId(decodedToken.uid);
        const testSnap = await db.collection('testen').doc(testId).get();
        if (!testSnap.exists) return res.status(404).json({ error: 'Test niet gevonden.' });
        if (testSnap.data().school_id !== schoolId) return res.status(403).json({ error: 'Geen toegang tot deze test.' });

        const normenSnap = await db.collection('normen').where('test_id', '==', testId).limit(1).get();
        return res.status(200).json({
            success: true,
            normen: normenSnap.empty ? null : normenSnap.docs[0].data()
        });
    } catch (error) {
        console.error('❌ handleGetNormen:', error);
        return res.status(500).json({ error: 'Fout bij ophalen normen' });
    }
}

// ─── GET RECENT SCORES ────────────────────────────────────────────────────────
export async function handleGetRecentScores(req, res, decodedToken) {
    try {
        const { testId, groepId, datum, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang tot deze school.' });

        const groepSnap = await db.collection('groepen').doc(groepId).get();
        if (!groepSnap.exists) return res.status(404).json({ error: 'Groep niet gevonden.' });
        const leerlingIds = groepSnap.data().leerling_ids || [];
        if (leerlingIds.length === 0) return res.status(200).json({ success: true, hasRecentScores: false });

        const geselecteerdeDatum = new Date(datum);
        const oneMonthAgo = new Date(geselecteerdeDatum);
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const queryIds = leerlingIds.slice(0, 30);
        const scoresSnap = await db.collection('scores')
            .where('test_id', '==', testId)
            .where('leerling_id', 'in', queryIds)
            .where('datum', '>=', Timestamp.fromDate(oneMonthAgo))
            .where('datum', '<', Timestamp.fromDate(geselecteerdeDatum))
            .get();

        if (scoresSnap.empty) return res.status(200).json({ success: true, hasRecentScores: false });

        const recentScores = scoresSnap.docs.map(d => d.data());
        const mostRecent = recentScores.sort((a, b) => b.datum.toMillis() - a.datum.toMillis())[0];
        const affectedStudentsCount = new Set(recentScores.map(s => s.leerling_id)).size;
        const teacherIds = [...new Set(recentScores.map(s => s.leerkracht_id).filter(Boolean))];
        const isEigenAfname = teacherIds.includes(decodedToken.uid);

        return res.status(200).json({
            success: true, hasRecentScores: true,
            afnameDatum: mostRecent.datum.toDate().toISOString(),
            affectedStudentsCount, isEigenAfname
        });
    } catch (error) {
        console.error('❌ handleGetRecentScores:', error);
        return res.status(500).json({ error: 'Fout bij ophalen recente scores' });
    }
}

// ─── SAVE SCORES ──────────────────────────────────────────────────────────────
export async function handleSaveScores(req, res, decodedToken) {
    try {
        const { groepId, testId, schoolId, datum, scores } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang tot deze school.' });
        if (!Array.isArray(scores) || scores.length === 0) return res.status(400).json({ error: 'Geen scores opgegeven.' });

        const groepSnap = await db.collection('groepen').doc(groepId).get();
        if (!groepSnap.exists) return res.status(404).json({ error: 'Groep niet gevonden.' });
        const groepData = groepSnap.data();
        if (groepData.school_id !== verifiedSchoolId || groepData.leerkracht_id !== decodedToken.uid) {
            return res.status(403).json({ error: 'Geen toegang tot deze groep.' });
        }

        const testSnap = await db.collection('testen').doc(testId).get();
        if (!testSnap.exists) return res.status(404).json({ error: 'Test niet gevonden.' });
        if (testSnap.data().school_id !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang tot deze test.' });

        const scoreDatum = new Date(datum);
        const batch = db.batch();

        for (const scoreItem of scores) {
            const { leerling_id, score, rapportpunt } = scoreItem;
            if (!leerling_id || score === null || score === undefined || isNaN(score)) continue;

            const newScoreRef = db.collection('scores').doc();
            batch.set(newScoreRef, {
                datum: Timestamp.fromDate(scoreDatum),
                groep_id: groepId,
                leerling_id,
                score: Number(score),
                rapportpunt: rapportpunt ?? null,
                school_id: verifiedSchoolId,
                test_id: testId,
                leerkracht_id: decodedToken.uid,
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

// ─── SAVE SCORE (enkelvoud) ───────────────────────────────────────────────────
// Gebruikt door de Waarnemer Tool om één leerling-score op te slaan.
// Idempotent: bestaat er al een score voor leerling+test+datum(+groep), dan wordt
// die geüpdatet i.p.v. een duplicaat aan te maken (leerkracht kan opnieuw koppelen).
export async function handleSaveScore(req, res, decodedToken) {
    try {
        const { schoolId, groepId, testId, datum, leerlingId, klas, geslacht, score } = req.body;

        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang tot deze school.' });
        if (!testId || !leerlingId || score === null || score === undefined || isNaN(score)) {
            return res.status(400).json({ error: 'Verplichte velden ontbreken (testId, leerlingId, score).' });
        }

        // Test ophalen + normen voor puntberekening
        const testSnap = await db.collection('testen').doc(testId).get();
        if (!testSnap.exists) return res.status(404).json({ error: 'Test niet gevonden.' });
        if (testSnap.data().school_id !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang tot deze test.' });
        const testData = { id: testSnap.id, ...testSnap.data() };

        const normenSnap = await db.collection('normen').where('test_id', '==', testId).limit(1).get();
        const normenData = normenSnap.empty ? null : normenSnap.docs[0].data();
        const rapportpunt = berekenPunt(testData, klas, geslacht, Number(score), normenData);

        const scoreDatum = datum ? new Date(datum) : new Date();
        const dayStart = new Date(scoreDatum); dayStart.setHours(0, 0, 0, 0);
        const dayEnd   = new Date(scoreDatum); dayEnd.setHours(23, 59, 59, 999);

        // Bestaande score zoeken (idempotentie) — zelfde leerling+test+dag(+groep)
        let bestaandeQuery = db.collection('scores')
            .where('leerling_id', '==', leerlingId)
            .where('test_id', '==', testId)
            .where('datum', '>=', Timestamp.fromDate(dayStart))
            .where('datum', '<=', Timestamp.fromDate(dayEnd));
        if (groepId) bestaandeQuery = bestaandeQuery.where('groep_id', '==', groepId);

        const bestaandeSnap = await bestaandeQuery.limit(1).get();

        if (!bestaandeSnap.empty) {
            await bestaandeSnap.docs[0].ref.update({
                score: Number(score),
                rapportpunt: rapportpunt ?? null,
            });
            return res.status(200).json({ success: true, updated: true, rapportpunt });
        }

        await db.collection('scores').add({
            datum:         Timestamp.fromDate(scoreDatum),
            groep_id:      groepId || null,
            leerling_id:   leerlingId,
            score:         Number(score),
            rapportpunt:   rapportpunt ?? null,
            school_id:     verifiedSchoolId,
            test_id:       testId,
            leerkracht_id: decodedToken.uid,
            created_at:    Timestamp.now(),
        });

        return res.status(200).json({ success: true, created: true, rapportpunt });

    } catch (error) {
        console.error('❌ handleSaveScore:', error);
        return res.status(500).json({ error: 'Fout bij opslaan score: ' + error.message });
    }
}

// ─── GET TESTAFNAME DETAIL ────────────────────────────────────────────────────
export async function handleGetTestafnameDetail(req, res, decodedToken) {
    try {
        const { groepId, testId, datum, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const masterKey = await getMasterKey();
        const [groepSnap, testSnap] = await Promise.all([
            db.collection('groepen').doc(groepId).get(),
            db.collection('testen').doc(testId).get()
        ]);

        if (!testSnap.exists) return res.status(404).json({ error: 'Test niet gevonden.' });
        const groepData = groepSnap.exists ? groepSnap.data() : null;
        const testData = { id: testSnap.id, ...testSnap.data() };
        const leerlingIds = groepData?.leerling_ids || [];

        const targetDate = new Date(datum);
        const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);

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
            const chunks = [];
            for (let i = 0; i < leerlingIds.length; i += 30) chunks.push(leerlingIds.slice(i, i + 30));
            const toegestaneData = new Map();
            for (const chunk of chunks) {
                const snap = await db.collection('toegestane_gebruikers').where('__name__', 'in', chunk).get();
                snap.docs.forEach(d => toegestaneData.set(d.id, d.data()));
            }

            leerlingenData = leerlingIds
                .filter(id => toegestaneData.has(id))
                .map(id => {
                    const tgData = toegestaneData.get(id);
                    const scoreInfo = scoresMap.get(id);
                    return {
                        id,
                        naam: decryptName(tgData.encrypted_name, masterKey) || '[Naam niet beschikbaar]',
                        klas: tgData.klas || null,
                        geslacht: (tgData.gender || '').toLowerCase() || null,
                        score: scoreInfo?.score ?? null,
                        punt: scoreInfo?.rapportpunt ?? null,
                        score_id: scoreInfo?.id || null
                    };
                })
                .sort((a, b) => a.naam.localeCompare(b.naam));

        } else if (scoresSnap.docs.length > 0) {
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

// ─── UPDATE SCORE ─────────────────────────────────────────────────────────────
export async function handleUpdateScore(req, res, decodedToken) {
    try {
        const { scoreId, score, testId, klas, geslacht, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const scoreRef = db.collection('scores').doc(scoreId);
        const scoreSnap = await scoreRef.get();
        if (!scoreSnap.exists) return res.status(404).json({ error: 'Score niet gevonden.' });
        if (scoreSnap.data().school_id !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

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

// ─── DELETE SCORE ─────────────────────────────────────────────────────────────
export async function handleDeleteScore(req, res, decodedToken) {
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

// ─── UPDATE SCORE DATE ────────────────────────────────────────────────────────
export async function handleUpdateScoreDate(req, res, decodedToken) {
    try {
        const { scoreIds, newDate, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });
        if (!Array.isArray(scoreIds) || scoreIds.length === 0) return res.status(400).json({ error: 'Geen score IDs.' });

        const newDateObj = new Date(`${newDate}T00:00:00`);
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

// ─── DELETE TESTAFNAME ────────────────────────────────────────────────────────
export async function handleDeleteTestafname(req, res, decodedToken) {
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

// ─── GET EVALUATIES ───────────────────────────────────────────────────────────
export async function handleGetEvaluaties(req, res, decodedToken) {
    try {
        const { schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const [groepenSnap, testenSnap, scoresSnap] = await Promise.all([
            db.collection('groepen').where('school_id', '==', verifiedSchoolId).get(),
            db.collection('testen').where('school_id', '==', verifiedSchoolId).where('is_actief', '==', true).orderBy('naam').get(),
            db.collection('scores')
                .where('school_id', '==', verifiedSchoolId)
                .where('leerkracht_id', '==', decodedToken.uid).get()
        ]);

        const groepen = groepenSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const testen = testenSnap.docs.map(d => ({ id: d.id, ...d.data() }));

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
                    groep_id: data.groep_id, test_id: data.test_id, datum: datumDag,
                    groep_naam: groep?.naam || 'Verwijderde Groep',
                    test_naam: test?.naam || 'Onbekende Test',
                    score_ids: [], leerling_count: 0, isOrphanedGroup: !groep
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

// ─── DELETE TEST ──────────────────────────────────────────────────────────────
export async function handleDeleteTest(req, res, decodedToken) {
    try {
        const { testId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

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

// ─── GET STUDENT EVOLUTION ────────────────────────────────────────────────────
export async function handleGetStudentEvolution(req, res, decodedToken) {
    try {
        const { leerlingId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const testenSnap = await db.collection('testen')
            .where('school_id', '==', verifiedSchoolId)
            .where('is_actief', '==', true)
            .orderBy('categorie').orderBy('naam').get();

        const evolutionData = [];
        for (const test of testenSnap.docs.map(d => ({ id: d.id, ...d.data() }))) {
            const scoresSnap = await db.collection('scores')
                .where('test_id', '==', test.id)
                .where('leerling_id', '==', leerlingId)
                .orderBy('datum', 'desc').get();

            if (scoresSnap.empty) continue;

            const scores = scoresSnap.docs.map(d => ({
                id: d.id, score: d.data().score,
                rapportpunt: d.data().rapportpunt || null,
                datum: d.data().datum?.toDate ? d.data().datum.toDate().toISOString() : null
            }));

            const sorted = [...scores].sort((a, b) =>
                test.score_richting === 'hoog' ? b.score - a.score : a.score - b.score
            );
            const best = sorted[0];

            evolutionData.push({
                test_id: test.id, test_naam: test.naam, naam: test.naam,
                categorie: test.categorie, eenheid: test.eenheid,
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

// ─── GET SCORE NORMS ──────────────────────────────────────────────────────────
export async function handleGetScoreNorms(req, res, decodedToken) {
    try {
        const { testId, klas, geslacht } = req.body;
        const GENDER_MAPPING = { 'm': 'M', 'v': 'V', 'man': 'M', 'vrouw': 'V', 'jongen': 'M', 'meisje': 'V' };

        if (!testId || !klas || !geslacht) return res.status(400).json({ error: 'testId, klas en geslacht zijn verplicht.' });

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

// ─── GET STUDENT PROFILE ──────────────────────────────────────────────────────
export async function handleGetStudentProfile(req, res, decodedToken) {
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

// ─── GET TEST RANKING ─────────────────────────────────────────────────────────
export async function handleGetTestRanking(req, res, decodedToken) {
    const { schoolId: sId, testId, score, klas, geslacht } = req.body;
    const verifiedSchoolId = await getSchoolId(decodedToken.uid);
    if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });

    try {
        const leeftijd = getLeeftijdFromKlas(klas);
        const testDoc = await db.collection('testen').doc(testId).get();
        if (!testDoc.exists) return res.status(404).json({ error: 'Test niet gevonden' });
        const scoreRichting = testDoc.data().score_richting || 'hoog';

        const scoresSnap = await db.collection('scores')
            .where('test_id', '==', testId)
            .where('school_id', '==', verifiedSchoolId)
            .get();

        if (scoresSnap.empty) {
            return res.status(200).json({ overallRank: 1, totalStudents: 1, ageRank: 1, ageGroupTotal: 1 });
        }

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
        const sorted = [...allScores].sort((a, b) => scoreRichting === 'hoog' ? b - a : a - b);
        const overallRank = sorted.findIndex(s => scoreRichting === 'hoog' ? s <= score : s >= score) + 1 || 1;

        let ageRank = 1, ageGroupTotal = 1;
        if (leeftijd) {
            const leerlingIds = Object.keys(bestScores);
            const chunks = [];
            for (let i = 0; i < leerlingIds.length; i += 30) chunks.push(leerlingIds.slice(i, i + 30));

            const ageGroupScores = [];
            for (const chunk of chunks) {
                const tgSnap = await db.collection('toegestane_gebruikers').where('__name__', 'in', chunk).get();
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