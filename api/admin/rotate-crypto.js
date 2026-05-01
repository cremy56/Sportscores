// api/admin/rotate-crypto.js
// ─────────────────────────────────────────────────────────────────────────────
// Key rotation script — uitvoeren bij elke 90-dagen key rotatie
//
// VÓÓR je dit uitvoert:
//   1. Maak een Firestore export (Google Cloud Console → Firestore → Export)
//   2. Voeg nieuwe key toe als nieuwe versie in Secret Manager
//   3. Update CURRENT_KEY_VERSION in lib/apiHelpers.js naar 'v2'
//   4. Deploy naar Vercel
//   5. Roep dit endpoint aan via POST /api/admin/rotate-crypto
//
// Het script is IDEMPOTENT — veilig om meerdere keren te draaien
// als het halverwege crasht. Documenten die al gemigreerd zijn (hebben
// al de nieuwe prefix) worden overgeslagen.
//
// ⚠️  ENKEL toegankelijk voor super-administrator
// ─────────────────────────────────────────────────────────────────────────────

import { db, verifyToken } from '../../lib/firebaseAdmin.js';
import { getMasterKey } from '../../lib/keyManager.js';
import { writeAuditLog } from '../../lib/auditLogger.js';
import CryptoJS from 'crypto-js';

const BATCH_SIZE = 400; // Firestore maximum per batch
const OLD_VERSION = 'v1';
const NEW_VERSION = 'v2';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decryptWithKey(encryptedName, key) {
    // Verwijder versie-prefix als aanwezig
    const colonIndex = encryptedName.indexOf(':');
    const ciphertext = (colonIndex > 0 && colonIndex <= 3)
        ? encryptedName.substring(colonIndex + 1)
        : encryptedName;

    const decrypted = CryptoJS.AES.decrypt(ciphertext, key);
    const result = decrypted.toString(CryptoJS.enc.Utf8);
    if (!result) throw new Error('Decryptie mislukt — lege string');
    return result;
}

function encryptWithKey(name, key, version) {
    const ciphertext = CryptoJS.AES.encrypt(name, key).toString();
    return `${version}:${ciphertext}`;
}

function getVersion(encryptedName) {
    if (!encryptedName) return 'legacy';
    const colonIndex = encryptedName.indexOf(':');
    if (colonIndex > 0 && colonIndex <= 3) {
        return encryptedName.substring(0, colonIndex);
    }
    return 'legacy'; // geen prefix = voor versie-systeem ingevoerd
}

// ─── Hoofd handler ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // ── Authenticatie ──────────────────────────────────────────────────────────
    let decodedToken;
    try {
        decodedToken = await verifyToken(req.headers.authorization);
    } catch {
        return res.status(401).json({ error: 'Niet geauthenticeerd' });
    }

    const adminSnap = await db.collection('users').doc(decodedToken.uid).get();
    if (!adminSnap.exists || adminSnap.data().rol !== 'super-administrator') {
        return res.status(403).json({ error: 'Alleen super-administrators kunnen key rotation uitvoeren' });
    }

    const { dryRun = true, oldKeySecret, newKeySecret } = req.body;

    // ── Validatie ──────────────────────────────────────────────────────────────
    if (!oldKeySecret || !newKeySecret) {
        return res.status(400).json({
            error: 'oldKeySecret en newKeySecret zijn verplicht',
            uitleg: 'Geef de Secret Manager versienamen mee, bv. { oldKeySecret: "1", newKeySecret: "2" }'
        });
    }

    // ── Keys ophalen uit Secret Manager ───────────────────────────────────────
    let oldKey, newKey;
    try {
        const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
        const { serviceAccount } = await import('../../lib/firebaseAdmin.js');
        const client = new SecretManagerServiceClient({
            credentials: serviceAccount,
            projectId: serviceAccount.project_id,
        });

        const secretBase = `projects/${serviceAccount.project_id}/secrets/MASTER_KEY_KABEVEREN`;

        const [oldVersion] = await client.accessSecretVersion({ name: `${secretBase}/versions/${oldKeySecret}` });
        oldKey = oldVersion.payload.data.toString('utf8');

        const [newVersion] = await client.accessSecretVersion({ name: `${secretBase}/versions/${newKeySecret}` });
        newKey = newVersion.payload.data.toString('utf8');
    } catch {
        return res.status(500).json({ error: 'Kon keys niet ophalen uit Secret Manager' });
    }

    // ── Migratie ───────────────────────────────────────────────────────────────
    const stats = {
        totaal: 0,
        gemigreerd: 0,
        overgeslagen: 0, // al op nieuwe versie
        fouten: 0,
        foutDetails: [],
        dryRun,
    };

    try {
        // Haal alle toegestane_gebruikers op
        const snap = await db.collection('toegestane_gebruikers').get();
        stats.totaal = snap.docs.length;

        const teVerwerken = snap.docs.filter(doc => {
            const data = doc.data();
            if (!data.encrypted_name) return false;
            const version = getVersion(data.encrypted_name);
            // Overslaan als al op nieuwe versie
            return version !== NEW_VERSION;
        });

        stats.overgeslagen = snap.docs.length - teVerwerken.length;

        // Verwerk in batches van BATCH_SIZE
        for (let i = 0; i < teVerwerken.length; i += BATCH_SIZE) {
            const chunk = teVerwerken.slice(i, i + BATCH_SIZE);
            const batch = db.batch();
            const chunkStats = { gemigreerd: 0, fouten: 0 };

            for (const doc of chunk) {
                try {
                    const data = doc.data();
                    const encryptedName = data.encrypted_name;

                    // Stap 1: Decrypt met oude key
                    const plainName = decryptWithKey(encryptedName, oldKey);

                    // Stap 2: Verificatie — is de decryptie zinvol?
                    if (!plainName || plainName.length < 2) {
                        throw new Error(`Verdachte decryptie: "${plainName}"`);
                    }

                    // Stap 3: Encrypt met nieuwe key → shadow field
                    const newEncrypted = encryptWithKey(plainName, newKey, NEW_VERSION);

                    // Stap 4: Schrijf naar shadow field (origineel onaangeroerd)
                    if (!dryRun) {
                        batch.update(doc.ref, {
                            encrypted_name_new: newEncrypted,
                            // Origineel encrypted_name blijft staan tot verificatie
                        });
                    }

                    chunkStats.gemigreerd++;
                } catch (err) {
                    chunkStats.fouten++;
                    stats.foutDetails.push({
                        docId: doc.id.substring(0, 8) + '...', // Niet volledig ID loggen
                        fout: err.message,
                    });
                }
            }

            // Commit batch enkel als geen fouten in deze chunk
            if (!dryRun && chunkStats.fouten === 0) {
                await batch.commit();
            } else if (!dryRun && chunkStats.fouten > 0) {
                // Sla corrupte batch over — log en ga verder
                console.error(`Batch ${i}-${i + BATCH_SIZE} overgeslagen door ${chunkStats.fouten} fouten`);
            }

            stats.gemigreerd += chunkStats.gemigreerd;
            stats.fouten += chunkStats.fouten;
        }

        // ── Stap 2: Verificeer shadow fields en promoveer ────────────────────
        // Alleen uitvoeren als dry run = false en geen fouten
        if (!dryRun && stats.fouten === 0) {
            const verifySnap = await db.collection('toegestane_gebruikers')
                .where('encrypted_name_new', '!=', null)
                .get();

            const verifyBatches = [];
            let currentBatch = db.batch();
            let count = 0;

            for (const doc of verifySnap.docs) {
                const data = doc.data();
                try {
                    // Verificeer dat shadow field correct decrypteerbaar is
                    const verified = decryptWithKey(data.encrypted_name_new, newKey);
                    if (!verified || verified.length < 2) throw new Error('Verificatie mislukt');

                    // Promoveer: kopieer shadow naar hoofd, verwijder shadow
                    currentBatch.update(doc.ref, {
                        encrypted_name: data.encrypted_name_new,
                        encrypted_name_new: db.FieldValue?.delete() ?? null,
                    });
                    count++;

                    if (count % BATCH_SIZE === 0) {
                        verifyBatches.push(currentBatch);
                        currentBatch = db.batch();
                    }
                } catch (err) {
                    stats.fouten++;
                    stats.foutDetails.push({ docId: doc.id.substring(0, 8) + '...', fout: `Verificatie: ${err.message}` });
                }
            }

            if (count % BATCH_SIZE !== 0) verifyBatches.push(currentBatch);

            if (stats.fouten === 0) {
                for (const b of verifyBatches) await b.commit();
                stats.gepromoveerd = count;
            } else {
                stats.gepromoveerd = 0;
                stats.waarschuwing = 'Promotie overgeslagen door verificatiefouten — shadow fields blijven staan';
            }
        }

    } catch (err) {
        return res.status(500).json({ error: 'Migratie mislukt', details: err.message, stats });
    }

    // ── Audit log ──────────────────────────────────────────────────────────────
    await writeAuditLog({
        action: 'key_rotation_migration',
        admin_user_id: decodedToken.uid,
        dry_run: dryRun,
        stats: {
            totaal: stats.totaal,
            gemigreerd: stats.gemigreerd,
            overgeslagen: stats.overgeslagen,
            fouten: stats.fouten,
        },
    });

    return res.status(200).json({
        success: stats.fouten === 0,
        ...stats,
        instructies: dryRun
            ? 'Dit was een dry run. Controleer de stats en roep opnieuw aan met { dryRun: false } als alles ok is.'
            : stats.fouten === 0
                ? 'Migratie geslaagd. Verwijder nu de oude key-versie in Secret Manager en update CURRENT_KEY_VERSION in apiHelpers.js.'
                : 'Migratie gedeeltelijk — controleer foutDetails. Draai script opnieuw na fix.',
    });
}