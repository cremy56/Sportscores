// functions/src/sportlab-functions.js
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');

const getDb = () => admin.firestore();

// =============================================
// CRON: Verlopen sessies sluiten (elke 30 min)
// Sessies ouder dan 2 uur worden automatisch
// op "gesloten" gezet in Firestore.
// =============================================
exports.sluitVerlopenSessies = onSchedule(
    {
        schedule: '*/30 * * * *',
        timeZone: 'Europe/Brussels',
    },
    async (event) => {
        const db = getDb();
        const tweeUurGeleden = new Date(Date.now() - 2 * 60 * 60 * 1000);

        try {
            const snap = await db.collection('sport_lab_sessions')
                .where('status', 'in', ['actief', 'evaluatie'])
                .get();

            if (snap.empty) return;

            const batch = db.batch();
            let gesloten = 0;

            snap.docs.forEach(d => {
                const startTijd = d.data().start_tijd?.toDate?.();
                if (startTijd && startTijd < tweeUurGeleden) {
                    batch.update(d.ref, {
                        status: 'gesloten',
                        gesloten_op: Timestamp.now(),
                    });
                    gesloten++;
                }
            });

            if (gesloten > 0) {
                await batch.commit();
                console.log(`✅ ${gesloten} verlopen sessie(s) gesloten.`);
            }

        } catch (error) {
            console.error('❌ sluitVerlopenSessies:', error);
            throw error;
        }
    }
);

// =============================================
// CRON: Oude sessies + deelnames verwijderen
// Elke nacht om 02:00:
//   - Sessies ouder dan 7 dagen → verwijderen
//   - Bijhorende deelnames → verwijderen
// =============================================
exports.verwijderOudeSporLabData = onSchedule(
    {
        schedule: '0 2 * * *',
        timeZone: 'Europe/Brussels',
    },
    async (event) => {
        const db = getDb();
        const zevenDagenGeleden = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        try {
            const sessiesSnap = await db.collection('sport_lab_sessions')
                .where('status', '==', 'gesloten')
                .get();

            if (sessiesSnap.empty) {
                console.log('Geen oude sessies gevonden.');
                return;
            }

            let verwijderdeSessies = 0;
            let verwijderdeDeelnames = 0;

            for (const sessieDoc of sessiesSnap.docs) {
                const geslotenOp = sessieDoc.data().gesloten_op?.toDate?.();
                if (!geslotenOp || geslotenOp > zevenDagenGeleden) continue;

                // Verwijder deelnames van deze sessie
                const deelnamesSnap = await db.collection('sport_lab_deelnames')
                    .where('sessie_id', '==', sessieDoc.id)
                    .get();

                const batch = db.batch();
                deelnamesSnap.docs.forEach(d => {
                    batch.delete(d.ref);
                    verwijderdeDeelnames++;
                });

                batch.delete(sessieDoc.ref);
                verwijderdeSessies++;

                await batch.commit();
            }

            console.log(`✅ ${verwijderdeSessies} sessie(s) en ${verwijderdeDeelnames} deelname(s) verwijderd.`);

            // Audit log
            await db.collection('audit_logs').add({
                actor_uid: 'cron',
                action: 'sportlab_cleanup',
                verwijderde_sessies: verwijderdeSessies,
                verwijderde_deelnames: verwijderdeDeelnames,
                timestamp: Timestamp.now(),
            });

        } catch (error) {
            console.error('❌ verwijderOudeSportLabData:', error);
            throw error;
        }
    }
);
