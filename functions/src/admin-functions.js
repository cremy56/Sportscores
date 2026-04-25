// functions/src/admin-functions.js
const {onCall} = require('firebase-functions/v2/https');
const {onDocumentUpdated} = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const {FieldValue} = require('firebase-admin/firestore');

if (admin.apps.length === 0) admin.initializeApp();  // ✅ zeker geïnitialiseerd
const db = admin.firestore();  // ✅ nu veilig

exports.onUserNameChange = onDocumentUpdated('users/{userId}', async (event) => {
    const change = event.data;
    const userId = event.params.userId;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    if (beforeData.naam !== afterData.naam) {
        const smartschoolHash = afterData.smartschool_id_hash;
        if (smartschoolHash) {
            await updateDenormalizedNames(smartschoolHash, beforeData.naam, afterData.naam);
        }
        await logNameChange(userId, beforeData.naam, afterData.naam);
    }
});

async function updateDenormalizedNames(smartschoolHash, oldName, newName) {
    try {
        const scoresQuery = await db.collection('scores')
            .where('leerling_id', '==', smartschoolHash)
            .where('leerling_naam', '==', oldName)
            .get();

        if (scoresQuery.empty) return;

        const batchSize = 450;
        const docs = scoresQuery.docs;
        for (let i = 0; i < docs.length; i += batchSize) {
            const batch = db.batch();
            docs.slice(i, i + batchSize).forEach(doc => {
                batch.update(doc.ref, { leerling_naam: newName, laatst_bijgewerkt: FieldValue.serverTimestamp() });
            });
            await batch.commit();
        }
        console.log('Updated scores: ' + docs.length);
    } catch (error) {
        console.error('Fout bij updaten denormalized names:', error);
        await sendAlertToAdmins(smartschoolHash, oldName, newName, error);
    }
}

async function logNameChange(userId, oldName, newName) {
    await db.collection('audit_log').add({ type: 'name_change', userId, oldName, newName, timestamp: FieldValue.serverTimestamp(), status: 'completed' });
}

async function sendAlertToAdmins(identifier, oldName, newName, error) {
    const adminsQuery = await db.collection('users').where('rol', '==', 'administrator').get();
    const batch = db.batch();
    adminsQuery.docs.forEach(adminDoc => {
        batch.set(db.collection('notifications').doc(), { recipient: adminDoc.id, type: 'data_consistency_error', message: 'Fout bij bijwerken naam van "' + oldName + '" naar "' + newName + '"', error: error.message, timestamp: FieldValue.serverTimestamp(), read: false });
    });
    await batch.commit();
}

exports.checkDataConsistency = onCall(async (request) => {
    if (!request.auth) throw new Error('Authentication required');
    const uid = request.auth.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists || userDoc.data().rol !== 'administrator') throw new Error('Alleen administrators');

    const inconsistencies = [];
    try {
        const scoresSnapshot = await db.collection('scores').get();
        for (const scoreDoc of scoresSnapshot.docs) {
            const scoreData = scoreDoc.data();
            const leerlingHash = scoreData.leerling_id;
            if (!leerlingHash) continue;
            const usersQuery = await db.collection('users').where('smartschool_id_hash', '==', leerlingHash).limit(1).get();
            if (!usersQuery.empty) {
                const actualName = usersQuery.docs[0].data().naam;
                const storedName = scoreData.leerling_naam;
                if (actualName && storedName && actualName !== storedName) {
                    inconsistencies.push({ scoreId: scoreDoc.id, leerlingHash, actualName, storedName });
                }
            }
        }
        await db.collection('consistency_reports').add({ timestamp: FieldValue.serverTimestamp(), inconsistencies, totalScoresChecked: scoresSnapshot.docs.length, performedBy: uid });
        return { success: true, inconsistenciesFound: inconsistencies.length, totalChecked: scoresSnapshot.docs.length, inconsistencies };
    } catch (error) {
        throw new Error('Consistency check failed: ' + error.message);
    }
});

exports.getUserGroups = onCall(async (request) => {
    if (!request.auth) throw new Error('Authentication required');
    try {
        const userId = request.auth.uid;
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) throw new Error('User not found');
        const userData = userDoc.data();
        if (!['leerkracht', 'administrator', 'super-administrator'].includes(userData.rol)) throw new Error('Access denied');

        const groups = [];
        const teacherGroupsQuery = await db.collection('groepen').where('leerkracht_id', '==', userId).get();
        teacherGroupsQuery.docs.forEach(doc => {
            const g = doc.data();
            groups.push({ id: doc.id, naam: g.naam || 'Groep', leerling_count: g.leerling_ids?.length || 0, role: 'teacher', leerkracht_id: g.leerkracht_id || 'Onbekend' });
        });

        if (['administrator', 'super-administrator'].includes(userData.rol)) {
            const schoolGroupsQuery = await db.collection('groepen').where('school_id', '==', userData.school_id).get();
            schoolGroupsQuery.docs.forEach(doc => {
                if (!groups.find(g => g.id === doc.id)) {
                    const g = doc.data();
                    groups.push({ id: doc.id, naam: g.naam || 'Groep', leerling_count: g.leerling_ids?.length || 0, role: 'admin', leerkracht_id: g.leerkracht_id || 'Onbekend' });
                }
            });
        }

        groups.sort((a, b) => a.naam.localeCompare(b.naam));
        return { success: true, groups, user: { name: userData.naam, role: userData.rol, school_id: userData.school_id } };
    } catch (error) {
        return { success: false, error: error.message, groups: [] };
    }
});