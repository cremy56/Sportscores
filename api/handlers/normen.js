// api/handlers/normen.js
import { db } from '../../lib/firebaseAdmin.js';
import { getSchoolId } from '../../lib/apiHelpers.js';

export async function handleSaveNorm(req, res, decodedToken) {
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
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

export async function handleUpdateNorm(req, res, decodedToken) {
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
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

export async function handleDeleteNormen(req, res, decodedToken) {
    const { schoolId: sId, testId, normen: normenToDelete } = req.body;
    const verifiedSchoolId = await getSchoolId(decodedToken.uid);
    if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
    try {
        const normDocRef = db.collection('normen').doc(testId);
        const normSnap = await normDocRef.get();
        if (!normSnap.exists) return res.status(404).json({ error: 'Normen niet gevonden' });
        const filtered = (normSnap.data().punten_schaal || []).filter(n =>
            !normenToDelete.some(d =>
                d.leeftijd === n.leeftijd && d.geslacht === n.geslacht &&
                d.score_min === n.score_min && d.punt === n.punt
            )
        );
        await normDocRef.update({ punten_schaal: filtered });
        return res.status(200).json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

export async function handleImportNormen(req, res, decodedToken) {
    const { schoolId: sId, testId, normen: nieuweNormen, bestaandeNormen } = req.body;
    const verifiedSchoolId = await getSchoolId(decodedToken.uid);
    if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
    try {
        const normDocRef = db.collection('normen').doc(testId);
        const samengevoegd = [...(bestaandeNormen || []), ...nieuweNormen];
        await normDocRef.set({ punten_schaal: samengevoegd, test_id: testId, school_id: verifiedSchoolId }, { merge: true });
        return res.status(200).json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
