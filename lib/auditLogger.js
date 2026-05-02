// lib/auditLogger.js
// Schrijft audit logs via een aparte service account met enkel create-rechten.
// Deze account kan GEEN documenten updaten of verwijderen (IAM-niveau).
//
// Zie docs/audit-log-immutability.md voor setup instructies.

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const AUDIT_APP_NAME = 'audit-writer';

function getAuditDb() {
    const existing = getApps().find(a => a.name === AUDIT_APP_NAME);
    const app = existing ?? initializeApp({
        credential: cert(JSON.parse(process.env.AUDIT_WRITER_SERVICE_ACCOUNT))
    }, AUDIT_APP_NAME);
    return getFirestore(app);
}

/**
 * Schrijft een immutable audit log entry.
 *
 * @param {object} entry - Log data. Velden:
 *   - action {string}         Verplicht. Bv. 'create_user', 'delete_score'
 *   - admin_user_id {string}  Firebase UID van de uitvoerende gebruiker
 *   - school_id {string}      school_id voor filtering
 *   - ip_address {string}     Optioneel. Haal op via req.headers['x-forwarded-for']
 *   - [overige velden]        Vrij te gebruiken, maar NOOIT email opslaan
 *
 * Automatisch toegevoegd:
 *   - timestamp               Server-side Firestore timestamp
 *
 * @example
 * await writeAuditLog({
 *   action: 'bulk_create_users',
 *   admin_user_id: decodedToken.uid,
 *   school_id: targetSchoolId,
 *   users_created: successCount,
 *   ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
 * });
 */
export async function writeAuditLog(entry) {
    if (!entry?.action) {
        console.error('❌ writeAuditLog: action is verplicht');
        return;
    }

    // Defensief: zorg dat er nooit een email in logs terechtkomt
    if (entry.admin_email || entry.email) {
        console.error('❌ writeAuditLog: email mag NOOIT in audit logs. Gebruik admin_user_id.');
        const { admin_email, email, ...safeEntry } = entry;
        entry = safeEntry;
    }

    try {
        const db = getAuditDb();
        await db.collection('audit_logs').add({
            ...entry,
            timestamp: FieldValue.serverTimestamp(),
        });
    } catch (err) {
        // Audit logging mag de eigenlijke operatie nooit blokkeren
        console.error('❌ writeAuditLog fout (niet kritiek):', err.message);
    }
}
