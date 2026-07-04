// api/admin/migrate-hash.js
// ─────────────────────────────────────────────────────────────────────────────
// Hash-migratie: kale SHA-256 → HMAC-SHA256 met pepper (hash-versie h1)
//
// WAAROM: de DPO merkte op dat kale SHA-256 van (raadbare) Smartschool-ID's
// brute-forcebaar is. HMAC met een geheime pepper uit Secret Manager lost dit
// op, maar de hash is óók het document-ID van toegestane_gebruikers en de
// foreign key in andere collecties. Dit script herrekent alles.
//
// VÓÓR je dit uitvoert:
//   1. Maak een Firestore export (Google Cloud Console → Firestore → Export)
//   2. Maak de secret HASH_PEPPER_KABEVEREN aan (zie INSTRUCTIES_HASH_MIGRATIE.md)
//   3. Deploy de nieuwe code (apiHelpers/keyManager/auth/users + dit script)
//   4. Draai NIET tussendoor een bulk-import (die zou HMAC-duplicaten aanmaken)
//   5. Roep dit endpoint aan met dezelfde CSV-data als je gebruikersimport:
//      POST /api/admin/migrate-hash  { csvData: [...], dryRun: true }
//
// Het script is IDEMPOTENT: al gemigreerde accounts (nieuw doc bestaat, oud
// doc niet meer) worden overgeslagen. Veilig om opnieuw te draaien na een crash.
//
// VOLGORDE PER ACCOUNT (crash-veilig):
//   1. Nieuw doc aanmaken onder HMAC-ID (kopie + hash_version: 'h1')
//   2. Referenties omzetten (users, scores, leerling_schemas, groepen)
//   3. Pas daarna het oude doc verwijderen
//
// ⚠️  ENKEL toegankelijk voor super-administrator
// ─────────────────────────────────────────────────────────────────────────────

import { db, verifyToken } from '../../lib/firebaseAdmin.js';
import { checkRateLimit, stuurRateLimitResponse } from '../../lib/rateLimiter.js';
import { getMasterKey, getHashPepper } from '../../lib/keyManager.js';
import { writeAuditLog } from '../../lib/auditLogger.js';
import {
    generateHash,
    generateLegacyHash,
    encryptName,
    CURRENT_HASH_VERSION,
} from '../../lib/apiHelpers.js';

// Collecties waarin de hash als veldwaarde voorkomt.
// ⚠️ Vul aan als een grep op je codebase nog andere referentievelden toont:
//    grep -rn "leerling_id\|toegestane_gebruikers_id" api/ src/ --include="*.js*"
const REFERENTIES = [
    { collection: 'users',            veld: 'toegestane_gebruikers_id' },
    { collection: 'scores',           veld: 'leerling_id' },
    { collection: 'leerling_schemas', veld: 'leerling_id' },
];

// Collecties met de hash in een array-veld
const ARRAY_REFERENTIES = [
    { collection: 'groepen', veld: 'leerling_ids' },
];

// Plaintext-restanten van de oude client-side StudentImport — worden gestript
const LEGACY_PLAINTEXT_VELDEN = ['smartschool_id', 'naam', 'naam_keywords'];

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

    // ── Rate limit (categorie 'admin', per gebruiker) ─────────────────────────
    const rl = await checkRateLimit(req, { categorie: 'admin', uid: decodedToken.uid });
    if (!rl.toegestaan) return stuurRateLimitResponse(res, rl.retryAfter);

    const adminSnap = await db.collection('users').doc(decodedToken.uid).get();
    if (!adminSnap.exists || adminSnap.data().rol !== 'super-administrator') {
        return res.status(403).json({ error: 'Alleen super-administrators kunnen de hash-migratie uitvoeren' });
    }

    const { csvData, dryRun = true } = req.body || {};

    // ── Validatie ──────────────────────────────────────────────────────────────
    if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
        return res.status(400).json({
            error: 'csvData (array) is verplicht',
            uitleg: 'Geef dezelfde rijen mee als bij de gebruikersimport: [{ smartschool_user_id: "..." }, ...]. '
                + 'De originele Smartschool-ID\'s zijn nodig om de hashes te herrekenen — '
                + 'uit de oude hash alleen kan dat niet (dat is net het punt van hashen).',
        });
    }

    // ── Sleutels ophalen ───────────────────────────────────────────────────────
    let pepper, masterKey;
    try {
        pepper = await getHashPepper();
        masterKey = await getMasterKey();
    } catch {
        return res.status(500).json({ error: 'Kon secrets niet ophalen — bestaat HASH_PEPPER_KABEVEREN al in Secret Manager?' });
    }

    const stats = {
        dryRun,
        rijenInCsv: csvData.length,
        gemigreerd: 0,
        alGemigreerd: 0,       // idempotentie: nieuw doc bestaat al, oud is weg
        nietGevonden: 0,       // ID zit in CSV maar (g)een van beide docs bestaat
        plaintextGestript: 0,  // legacy StudentImport-velden verwijderd
        naamAlsnogVersleuteld: 0,
        referentiesOmgezet: { users: 0, scores: 0, leerling_schemas: 0, groepen: 0, toegevoegd_door_hash: 0 },
        fouten: 0,
        foutDetails: [],
    };

    // Mapping oudeHash → nieuweHash (ook nodig voor toegevoegd_door_hash-pass)
    const hashMap = new Map();

    try {
        // ═══ FASE 1: accounts migreren ══════════════════════════════════════
        for (let i = 0; i < csvData.length; i++) {
            const row = csvData[i];
            const rowNum = i + 2;

            try {
                const rawId = row.smartschool_user_id?.trim();
                if (!rawId) {
                    stats.fouten++;
                    stats.foutDetails.push({ rij: rowNum, fout: 'smartschool_user_id ontbreekt' });
                    continue;
                }

                const oudeHash = generateLegacyHash(rawId);
                const nieuweHash = generateHash(rawId, pepper);
                hashMap.set(oudeHash, nieuweHash);

                const oudRef = db.collection('toegestane_gebruikers').doc(oudeHash);
                const nieuwRef = db.collection('toegestane_gebruikers').doc(nieuweHash);

                const [oudSnap, nieuwSnap] = await Promise.all([oudRef.get(), nieuwRef.get()]);

                if (!oudSnap.exists && nieuwSnap.exists) {
                    stats.alGemigreerd++;
                    continue;
                }
                if (!oudSnap.exists && !nieuwSnap.exists) {
                    stats.nietGevonden++;
                    continue;
                }

                // ── Nieuw document opbouwen ──────────────────────────────────
                const data = oudSnap.data();
                const nieuwDoc = {
                    ...data,
                    smartschool_id_hash: nieuweHash,
                    hash_version: CURRENT_HASH_VERSION,
                    hash_gemigreerd_op: new Date(),
                    last_updated: new Date(),
                };

                // Legacy StudentImport-restanten: plaintext naam alsnog versleutelen
                if (!nieuwDoc.encrypted_name && typeof data.naam === 'string' && data.naam.trim()) {
                    nieuwDoc.encrypted_name = encryptName(data.naam.trim(), masterKey);
                    stats.naamAlsnogVersleuteld++;
                }
                let gestript = false;
                for (const veld of LEGACY_PLAINTEXT_VELDEN) {
                    if (veld in nieuwDoc) {
                        delete nieuwDoc[veld];
                        gestript = true;
                    }
                }
                if (gestript) stats.plaintextGestript++;

                // ── Referenties zoeken ───────────────────────────────────────
                const refUpdates = [];
                for (const { collection, veld } of REFERENTIES) {
                    const snap = await db.collection(collection).where(veld, '==', oudeHash).get();
                    for (const doc of snap.docs) {
                        refUpdates.push({ ref: doc.ref, update: { [veld]: nieuweHash } });
                        stats.referentiesOmgezet[collection]++;
                    }
                }
                for (const { collection, veld } of ARRAY_REFERENTIES) {
                    const snap = await db.collection(collection).where(veld, 'array-contains', oudeHash).get();
                    for (const doc of snap.docs) {
                        const arr = (doc.data()[veld] || []).map(v => (v === oudeHash ? nieuweHash : v));
                        refUpdates.push({ ref: doc.ref, update: { [veld]: arr } });
                        stats.referentiesOmgezet[collection]++;
                    }
                }

                // ── Uitvoeren (volgorde: nieuw doc → referenties → oud doc weg)
                if (!dryRun) {
                    await nieuwRef.set(nieuwDoc, { merge: true });
                    for (const { ref, update } of refUpdates) {
                        await ref.update(update);
                    }
                    await oudRef.delete();
                }

                stats.gemigreerd++;
            } catch (err) {
                stats.fouten++;
                stats.foutDetails.push({ rij: rowNum, fout: err.message });
            }
        }

        // ═══ FASE 2: toegevoegd_door_hash omzetten ══════════════════════════
        // Dit veld verwijst naar de hash van de admin die het account toevoegde.
        const alleSnap = await db.collection('toegestane_gebruikers').get();
        for (const doc of alleSnap.docs) {
            const oud = doc.data().toegevoegd_door_hash;
            if (oud && hashMap.has(oud)) {
                if (!dryRun) {
                    await doc.ref.update({ toegevoegd_door_hash: hashMap.get(oud) });
                }
                stats.referentiesOmgezet.toegevoegd_door_hash++;
            }
        }

        // ═══ FASE 3: controle — wat is er NIET gemigreerd? ══════════════════
        // Accounts zonder hash_version zaten niet in de CSV. Die moeten ofwel
        // aan de CSV toegevoegd worden, ofwel bewust verwijderd (oud-leerlingen).
        const restSnap = await db.collection('toegestane_gebruikers').get();
        const nietGemigreerdDocs = restSnap.docs.filter(d => d.data().hash_version !== CURRENT_HASH_VERSION);
        stats.nogTeMigreren = nietGemigreerdDocs.length;
        stats.nogTeMigrerenVoorbeeld = nietGemigreerdDocs
            .slice(0, 10)
            .map(d => ({
                docId: d.id.substring(0, 8) + '...', // nooit volledig ID loggen
                rol: d.data().rol || '?',
                klas: d.data().klas || null,
                is_active: d.data().is_active ?? null,
            }));

    } catch (err) {
        return res.status(500).json({ error: 'Migratie mislukt', details: err.message, stats });
    }

    // ── Audit log ──────────────────────────────────────────────────────────────
    await writeAuditLog({
        action: 'hash_migration_hmac',
        admin_user_id: decodedToken.uid,
        dry_run: dryRun,
        stats: {
            rijenInCsv: stats.rijenInCsv,
            gemigreerd: stats.gemigreerd,
            alGemigreerd: stats.alGemigreerd,
            nietGevonden: stats.nietGevonden,
            nogTeMigreren: stats.nogTeMigreren,
            fouten: stats.fouten,
        },
        timestamp: new Date(),
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    });

    return res.status(200).json({
        success: stats.fouten === 0,
        ...stats,
        instructies: dryRun
            ? 'Dit was een DRY RUN — er is niets gewijzigd. Controleer de stats (vooral nietGevonden en nogTeMigreren) en roep opnieuw aan met { dryRun: false }.'
            : stats.fouten === 0 && stats.nogTeMigreren === 0
                ? 'Migratie volledig geslaagd. Test nu een login, en verwijder daarna de legacy-fallback in api/auth.js.'
                : stats.nogTeMigreren > 0
                    ? `Migratie gedraaid, maar ${stats.nogTeMigreren} account(s) zonder hash_version over — zie nogTeMigrerenVoorbeeld. Vul de CSV aan of ruim ze bewust op, en draai opnieuw.`
                    : 'Migratie gedeeltelijk — controleer foutDetails en draai opnieuw (idempotent).',
    });
}