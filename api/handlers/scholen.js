// api/handlers/scholen.js
import { db } from '../../lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { getSchoolId } from '../../lib/apiHelpers.js';

// ─── SAVE TEST ────────────────────────────────────────────────────────────────
export async function handleSaveTest(req, res, decodedToken) {
    const { schoolId: sId, testId, customId, test } = req.body;
    const verifiedSchoolId = await getSchoolId(decodedToken.uid);
    if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
    try {
        const testObject = {
            ...test,
            school_id: verifiedSchoolId,
            last_updated_at: FieldValue.serverTimestamp()   // ✅ was: admin.firestore.FieldValue
        };
        if (testId) {
            await db.collection('testen').doc(testId).update(testObject);
        } else {
            testObject.created_at = FieldValue.serverTimestamp();
            await db.collection('testen').doc(customId).set(testObject);
        }
        return res.status(200).json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

// ─── SAVE SCHOOL ──────────────────────────────────────────────────────────────
export async function handleSaveSchool(req, res, decodedToken) {
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

// ─── GET SCHOOL SETTINGS ──────────────────────────────────────────────────────
export async function handleGetSchoolSettings(req, res, decodedToken) {
    const { schoolId: sId } = req.body;
    const verifiedSchoolId = await getSchoolId(decodedToken.uid);
    if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
    try {
        const schoolSnap = await db.collection('scholen').doc(verifiedSchoolId).get();
        return res.status(200).json({
            instellingen: schoolSnap.exists ? schoolSnap.data().instellingen || null : null
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

// ─── SAVE SCHOOL SETTINGS ─────────────────────────────────────────────────────
export async function handleSaveSchoolSettings(req, res, decodedToken) {
    const { schoolId: sId, instellingen } = req.body;
    const verifiedSchoolId = await getSchoolId(decodedToken.uid);
    if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
    try {
        await db.collection('scholen').doc(verifiedSchoolId).update({ instellingen });
        return res.status(200).json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

// ─── GET SCHOLEN ──────────────────────────────────────────────────────────────
export async function handleGetScholen(req, res, decodedToken) {
    const userSnap = await db.collection('users').doc(decodedToken.uid).get();
    if (!userSnap.exists || userSnap.data().rol !== 'super-administrator') {
        return res.status(403).json({ error: 'Alleen super-administrators.' });
    }
    try {
        const snap = await db.collection('scholen').get();
        return res.status(200).json({ scholen: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

// ─── GET RAPPORTPERIODEN ──────────────────────────────────────────────────────
export async function handleGetRapportperioden(req, res, decodedToken) {
    const { targetSchoolId } = req.body;
    const verifiedSchoolId = await getSchoolId(decodedToken.uid);
    const userSnap = await db.collection('users').doc(decodedToken.uid).get();
    const rol = userSnap.data()?.rol;
    if (!['administrator', 'super-administrator'].includes(rol)) return res.status(403).json({ error: 'Verboden' });
    try {
        const snap = await db.collection('scholen')
            .doc(targetSchoolId || verifiedSchoolId)
            .collection('rapportperioden')
            .orderBy('startdatum', 'desc')
            .get();
        return res.status(200).json({ perioden: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

// ─── DELETE SCHOOL ────────────────────────────────────────────────────────────
export async function handleDeleteSchool(req, res, decodedToken) {
    const { targetSchoolId } = req.body;
    const userSnap = await db.collection('users').doc(decodedToken.uid).get();
    if (!userSnap.exists || userSnap.data().rol !== 'super-administrator') {
        return res.status(403).json({ error: 'Alleen super-administrators.' });
    }
    try {
        const usersSnap = await db.collection('toegestane_gebruikers')
            .where('school_id', '==', targetSchoolId).limit(1).get();
        if (!usersSnap.empty) {
            return res.status(400).json({ error: 'Kan school niet verwijderen. Er zijn nog gebruikers aan gekoppeld.' });
        }
        await db.collection('scholen').doc(targetSchoolId).delete();
        return res.status(200).json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

// ─── DELETE RAPPORTPERIODE ────────────────────────────────────────────────────
export async function handleDeleteRapportperiode(req, res, decodedToken) {
    const { targetSchoolId, periodeId } = req.body;
    const verifiedSchoolId = await getSchoolId(decodedToken.uid);
    const userSnap = await db.collection('users').doc(decodedToken.uid).get();
    if (!['administrator', 'super-administrator'].includes(userSnap.data()?.rol)) {
        return res.status(403).json({ error: 'Verboden' });
    }
    try {
        await db.collection('scholen')
            .doc(targetSchoolId || verifiedSchoolId)
            .collection('rapportperioden')
            .doc(periodeId)
            .delete();
        return res.status(200).json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

// ─── SAVE RAPPORTPERIODE ──────────────────────────────────────────────────────
export async function handleSaveRapportperiode(req, res, decodedToken) {
    const { schoolId: sId, periodeId, periode } = req.body;
    const verifiedSchoolId = await getSchoolId(decodedToken.uid);
    const userSnap = await db.collection('users').doc(decodedToken.uid).get();
    if (!['administrator', 'super-administrator'].includes(userSnap.data()?.rol)) {
        return res.status(403).json({ error: 'Verboden' });
    }
    try {
        const periodeObject = {
            ...periode,
            startdatum: new Date(periode.startdatum),
            einddatum: new Date(periode.einddatum),
            last_updated_at: FieldValue.serverTimestamp()   // ✅ was: admin.firestore.FieldValue
        };
        const ref = db.collection('scholen').doc(sId).collection('rapportperioden');
        if (periodeId) {
            await ref.doc(periodeId).update(periodeObject);
        } else {
            periodeObject.created_at = FieldValue.serverTimestamp();
            await ref.add(periodeObject);
        }
        return res.status(200).json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
