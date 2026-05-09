// functions/src/sportlab-functions.js
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');

const getDb = () => admin.firestore();

// =============================================
// CRON: Verlopen sessies sluiten (elke 30 min)
//
// Firestore TTL (op vervalt_op) verwijdert documenten automatisch.
// Deze functie doet enkel de STATUS-update naar 'gesloten'.
//
// Sluitregels per status:
//   actief/evaluatie   → na 2 uur
//   docent_evaluatie   → na 24 uur
// =============================================
exports.sluitVerlopenSessies = onSchedule(
    {
        schedule: '*/30 * * * *',
        timeZone: 'Europe/Brussels',
    },
    async (event) => {
        const db = getDb();
        const nu = Date.now();
        const tweeUurGeleden          = new Date(nu - 2  * 60 * 60 * 1000);
        const vierentwintigUurGeleden  = new Date(nu - 24 * 60 * 60 * 1000);

        try {
            const snap = await db.collection('sport_lab_sessions')
                .where('status', 'in', ['actief', 'evaluatie', 'docent_evaluatie'])
                .get();

            if (snap.empty) return;

            const batch = db.batch();
            let gesloten = 0;

            snap.docs.forEach(d => {
                const data = d.data();
                const startTijd = data.start_tijd?.toDate?.();
                if (!startTijd) return;

                const drempel = data.status === 'docent_evaluatie'
                    ? vierentwintigUurGeleden
                    : tweeUurGeleden;

                if (startTijd < drempel) {
                    batch.update(d.ref, {
                        status: 'gesloten',
                        gesloten_op: Timestamp.now(),
                    });
                    gesloten++;
                }
            });

            if (gesloten > 0) {
                await batch.commit();
                console.log(`✅ ${gesloten} verlopen sessie(s) automatisch gesloten.`);
            }

        } catch (error) {
            console.error('❌ sluitVerlopenSessies:', error);
            throw error;
        }
    }
);

// verwijderOudeSportLabData is verwijderd.
// Firestore TTL (vervalt_op) verwijdert alle Sport Lab documenten
// automatisch, gratis en betrouwbaarder dan een Cloud Function.
//
// TTL policies actief op:
//   sport_lab_sessions     → vervalt_op
//   sport_lab_deelnames    → vervalt_op
//   sport_lab_scores       → vervalt_op
//   sport_lab_toernooien   → vervalt_op