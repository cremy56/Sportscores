// api/handlers/groepen.js
import { db } from '../../lib/firebaseAdmin.js';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getMasterKey } from '../../lib/keyManager.js';
import { getSchoolId, decryptName } from '../../lib/apiHelpers.js';

// ─── GET GROEPEN ──────────────────────────────────────────────────────────────
export async function handleGetGroepen(req, res, decodedToken) {
    try {
        const { schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const snap = await db.collection('groepen')
            .where('school_id', '==', verifiedSchoolId)
            .where('leerkracht_id', '==', decodedToken.uid)
            .get();

        return res.status(200).json({ success: true, groepen: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    } catch (error) {
        console.error('❌ handleGetGroepen:', error);
        return res.status(500).json({ error: 'Fout bij ophalen groepen' });
    }
}

// ─── GET MIJN KLASSEN ─────────────────────────────────────────────────────────
export async function handleGetMijnKlassen(req, res, decodedToken) {
    try {
        const { schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const userSnap = await db.collection('users').doc(decodedToken.uid).get();
        const leerkrachtHash = userSnap.data()?.smartschool_id_hash;

        if (leerkrachtHash) {
            const toegestaneSnap = await db.collection('toegestane_gebruikers').doc(leerkrachtHash).get();
            if (toegestaneSnap.exists) {
                const klassen = toegestaneSnap.data()?.klassen || [];
                if (klassen.length > 0) return res.status(200).json({ success: true, klassen });
            }
        }

        // Fallback: alle klassen van de school
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

// ─── CREATE GROEP ─────────────────────────────────────────────────────────────
export async function handleCreateGroep(req, res, decodedToken) {
    try {
        const { naam, leerling_ids, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });
        if (!naam?.trim()) return res.status(400).json({ error: 'Groepsnaam is verplicht.' });
        if (!Array.isArray(leerling_ids) || leerling_ids.length === 0) {
            return res.status(400).json({ error: 'Selecteer minstens 1 leerling.' });
        }

        const docRef = await db.collection('groepen').add({
            naam: naam.trim(),
            type: 'manueel',
            leerkracht_id: decodedToken.uid,
            school_id: verifiedSchoolId,
            leerling_ids,           // ✅ enkel smartschool_id_hash
            auto_sync: false,
            created_at: Timestamp.now()
        });

        return res.status(200).json({ success: true, id: docRef.id });
    } catch (error) {
        console.error('❌ handleCreateGroep:', error);
        return res.status(500).json({ error: 'Fout bij aanmaken groep' });
    }
}

// ─── UPDATE GROEP ─────────────────────────────────────────────────────────────
export async function handleUpdateGroep(req, res, decodedToken) {
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

// ─── DELETE GROEP ─────────────────────────────────────────────────────────────
export async function handleDeleteGroep(req, res, decodedToken) {
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

// ─── GET GROEP DETAIL ─────────────────────────────────────────────────────────
export async function handleGetGroepDetail(req, res, decodedToken) {
    try {
        const { groepId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const masterKey = await getMasterKey();
        const groepSnap = await db.collection('groepen').doc(groepId).get();
        if (!groepSnap.exists) return res.status(404).json({ error: 'Groep niet gevonden.' });
        const groepData = { id: groepSnap.id, ...groepSnap.data() };
        if (groepData.school_id !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const leerlingIds = groepData.leerling_ids || [];

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
                .map(id => ({
                    id,
                    naam: decryptName(toegestaneData.get(id).encrypted_name, masterKey),
                    klas: toegestaneData.get(id).klas || ''
                }))
                .sort((a, b) => a.naam.localeCompare(b.naam));
        }

        // Scores voor dit schooljaar
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
            success: true, groep: groepData, members, scoresByLeerling,
            availableTests: testenVoorSorteren.sort((a, b) => a.naam.localeCompare(b.naam))
        });
    } catch (error) {
        console.error('❌ handleGetGroepDetail:', error);
        return res.status(500).json({ error: 'Fout bij ophalen groepdetail' });
    }
}

// ─── ADD LEERLING ─────────────────────────────────────────────────────────────
export async function handleAddLeerling(req, res, decodedToken) {
    try {
        const { groepId, leerlingId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const groepRef = db.collection('groepen').doc(groepId);
        const groepSnap = await groepRef.get();
        if (!groepSnap.exists) return res.status(404).json({ error: 'Groep niet gevonden.' });
        if (groepSnap.data().leerkracht_id !== decodedToken.uid) return res.status(403).json({ error: 'Geen toegang.' });

        await groepRef.update({ leerling_ids: FieldValue.arrayUnion(leerlingId) });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ handleAddLeerling:', error);
        return res.status(500).json({ error: 'Fout bij toevoegen leerling' });
    }
}

// ─── REMOVE LEERLING ──────────────────────────────────────────────────────────
export async function handleRemoveLeerling(req, res, decodedToken) {
    try {
        const { groepId, leerlingId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const groepRef = db.collection('groepen').doc(groepId);
        const groepSnap = await groepRef.get();
        if (!groepSnap.exists) return res.status(404).json({ error: 'Groep niet gevonden.' });
        if (groepSnap.data().leerkracht_id !== decodedToken.uid) return res.status(403).json({ error: 'Geen toegang.' });

        await groepRef.update({ leerling_ids: FieldValue.arrayRemove(leerlingId) });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ handleRemoveLeerling:', error);
        return res.status(500).json({ error: 'Fout bij verwijderen leerling' });
    }
}

// ─── GET KLAS DETAIL ──────────────────────────────────────────────────────────
export async function handleGetKlasDetail(req, res, decodedToken) {
    try {
        const { klasNaam, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const masterKey = await getMasterKey();

        const leerlingenSnap = await db.collection('toegestane_gebruikers')
            .where('school_id', '==', verifiedSchoolId)
            .where('klas', '==', klasNaam)
            .where('rol', '==', 'leerling')
            .where('is_active', '==', true)
            .get();

        const leerlingIds = leerlingenSnap.docs.map(d => d.id);
        const members = leerlingenSnap.docs
            .map(d => ({
                id: d.id,
                naam: decryptName(d.data().encrypted_name, masterKey),
                klas: d.data().klas || ''
            }))
            .sort((a, b) => a.naam.localeCompare(b.naam));

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
            members, scoresByLeerling,
            availableTests: testenVoorSorteren.sort((a, b) => a.naam.localeCompare(b.naam))
        });
    } catch (error) {
        console.error('❌ handleGetKlasDetail:', error);
        return res.status(500).json({ error: 'Fout bij ophalen klasdetail' });
    }
}
