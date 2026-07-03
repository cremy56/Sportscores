// api/auth.js
import { db, verifyToken } from '../lib/firebaseAdmin.js';
import { generateHash, generateLegacyHash, encryptName, CURRENT_HASH_VERSION } from '../lib/apiHelpers.js';
import { getHashPepper, getMasterKey } from '../lib/keyManager.js';

// ─── Auto-migratie legacy hash → HMAC (h1) ────────────────────────────────────
// TIJDELIJK: verwijderen zodra alle whitelist-docs hash_version 'h1' hebben.
// Het Smartschool-ID zit in het OAuth-token bij login — de server kan de
// migratie dus zelf doen, zonder dat het ID ergens opgeslagen of opgezocht
// hoeft te worden. Bij login: als het HMAC-doc niet bestaat maar er wél een
// doc onder de oude kale SHA-256-hash staat, wordt dat doc verplaatst.
// Geeft altijd { nieuweHash, snap } terug — snap is null als de gebruiker
// in geen van beide vormen op de whitelist staat.
async function resolveWhitelistDoc(smartschoolUserId, pepper) {
    const nieuweHash = generateHash(smartschoolUserId, pepper);
    const nieuwRef = db.collection('toegestane_gebruikers').doc(nieuweHash);
    const nieuwSnap = await nieuwRef.get();
    if (nieuwSnap.exists) {
        return { nieuweHash, snap: nieuwSnap, gemigreerd: false };
    }

    const legacyHash = generateLegacyHash(smartschoolUserId);
    const legacyRef = db.collection('toegestane_gebruikers').doc(legacyHash);
    const legacySnap = await legacyRef.get();
    if (!legacySnap.exists) {
        return { nieuweHash, snap: null, gemigreerd: false };
    }

    // Migreren: kopie onder HMAC-ID, plaintext-restanten strippen, oud doc weg
    const data = legacySnap.data();
    const nieuwDoc = {
        ...data,
        smartschool_id_hash: nieuweHash,
        hash_version: CURRENT_HASH_VERSION,
        hash_gemigreerd_op: new Date(),
        last_updated: new Date(),
    };
    if (!nieuwDoc.encrypted_name && typeof data.naam === 'string' && data.naam.trim()) {
        const masterKey = await getMasterKey();
        nieuwDoc.encrypted_name = encryptName(data.naam.trim(), masterKey);
    }
    delete nieuwDoc.smartschool_id;
    delete nieuwDoc.naam;
    delete nieuwDoc.naam_keywords;

    await nieuwRef.set(nieuwDoc);
    await legacyRef.delete();
    console.warn('⚠️ Whitelist-account automatisch gemigreerd naar HMAC-hash (h1)');

    const snap = await nieuwRef.get();
    return { nieuweHash, snap, gemigreerd: true };
}

// ─── Nickname generator ───────────────────────────────────────────────────────
const ADJECTIVES = [
    'Swift','Bold','Fierce','Wild','Sharp','Brave','Rapid','Strong',
    'Iron','Steel','Dark','Storm','Blaze','Frost','Shadow','Thunder',
    'Silver','Golden','Crimson','Blazing','Silent','Mighty','Cosmic','Turbo',
    'Hyper','Ultra','Mega','Super','Flash','Neon','Cyber','Phantom',
];
const ANIMALS = [
    'Tiger','Eagle','Lynx','Shark','Panther','Falcon','Wolf','Cobra',
    'Lion','Hawk','Jaguar','Viper','Condor','Mamba','Bear','Hornet',
    'Rhino','Cheetah','Bison','Raptor','Stallion','Barracuda','Piranha','Komodo',
    'Wolverine','Scorpion','Mantis','Gecko','Tarantula','Grizzly','Puma','Osprey',
];

const generateNickname = () => {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const num = Math.floor(Math.random() * 999) + 1;
    return `${adj}${animal}${num}`;
};

// generateHash komt uit lib/apiHelpers.js — één gedeelde implementatie
// (voorbereiding op de HMAC/salted-hash migratie in stap 2)

// ─── Nickname validatie ───────────────────────────────────────────────────────
const validateNickname = (nickname) => {
    if (!nickname || typeof nickname !== 'string') return 'Nickname is verplicht';
    const trimmed = nickname.trim();
    if (trimmed.length < 3) return 'Nickname moet minstens 3 tekens zijn';
    if (trimmed.length > 20) return 'Nickname mag maximaal 20 tekens zijn';
    if (!/^[a-zA-Z0-9_\-À-ÿ]+$/.test(trimmed)) return 'Alleen letters, cijfers, _ en - toegestaan';
    return null;
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const decodedToken = await verifyToken(req.headers.authorization);
        const firebaseUid = decodedToken.uid;
        const { action } = req.body || {};

        // ── Nickname wijzigen ─────────────────────────────────────────────────
        if (action === 'update_nickname') {
            const { nickname } = req.body;
            const error = validateNickname(nickname);
            if (error) return res.status(400).json({ error });

            const trimmed = nickname.trim();

            const profileDoc = await db.collection('users').doc(firebaseUid).get();
            if (!profileDoc.exists) return res.status(404).json({ error: 'Profiel niet gevonden' });
            const schoolId = profileDoc.data().school_id;

            // Check 1: uniciteit onder actieve gebruikers
            const bestaand = await db.collection('users')
                .where('school_id', '==', schoolId)
                .where('nickname', '==', trimmed)
                .limit(1)
                .get();
            if (!bestaand.empty && bestaand.docs[0].id !== firebaseUid) {
                return res.status(409).json({ error: 'Deze nickname is al in gebruik. Kies een andere.' });
            }

            // Check 2: geblokkeerde nicknames (alltime ranking archief)
            const geblokkeerd = await db.collection('nickname_archief').doc(trimmed).get();
            if (geblokkeerd.exists) {
                const data = geblokkeerd.data();
                if (data.school_id === schoolId) {
                    return res.status(409).json({
                        error: 'Deze nickname staat in de alltime rankings en kan niet hergebruikt worden. Kies een andere.'
                    });
                }
            }

            await db.collection('users').doc(firebaseUid).update({
                nickname: trimmed,
                nickname_updated_at: new Date(),
                onboarding_complete: true,
            });

            return res.status(200).json({ success: true, nickname: trimmed });
        }

        // === Smartschool User ID ophalen (uit het OAuth-token) ===
        let smartschoolUserId = firebaseUid;
        if (decodedToken.smartschool_user_id) {
            smartschoolUserId = decodedToken.smartschool_user_id;
        } else if (decodedToken.providerData?.length > 0 && decodedToken.providerData[0].uid) {
            smartschoolUserId = decodedToken.providerData[0].uid;
        }

        const pepper = await getHashPepper();

        // ── Profiel check / aanmaken (default flow) ───────────────────────────
        const profileRef = db.collection('users').doc(firebaseUid);
        const docSnap = await profileRef.get();

        if (docSnap.exists) {
            const rawData = docSnap.data();

            // ── TIJDELIJK: auto-migratie voor bestaande profielen ─────────────
            // Migreert het whitelist-doc naar de HMAC-hash zodra de gebruiker
            // inlogt, en werkt de koppeling in het users-profiel bij.
            // Verwijderen zodra alle accounts hash_version 'h1' hebben.
            const profileUpdate = { last_login: new Date() };
            try {
                const { nieuweHash, snap, gemigreerd } = await resolveWhitelistDoc(smartschoolUserId, pepper);
                if (snap && (gemigreerd || rawData.toegestane_gebruikers_id !== nieuweHash)) {
                    profileUpdate.toegestane_gebruikers_id = nieuweHash;
                    rawData.toegestane_gebruikers_id = nieuweHash;
                }
            } catch (err) {
                // Migratie mag een login nooit blokkeren
                console.error('Auto-migratie check mislukt:', err.message);
            }
            await profileRef.update(profileUpdate);

            // Firestore Timestamps serialiseren niet correct naar JSON.
            // Zet alle datum-velden om naar ISO string.
            const toISO = (v) => v?.toDate ? v.toDate().toISOString() : (v instanceof Date ? v.toISOString() : v);

            const userProfile = {
                ...rawData,
                created_at:              toISO(rawData.created_at),
                last_login:              toISO(rawData.last_login),
                vrijstelling_geregistreerd_op: toISO(rawData.vrijstelling_geregistreerd_op) || null,
                vrijstelling_einddatum:  toISO(rawData.vrijstelling_einddatum)  || null,
            };

            return res.status(200).json({
                success: true,
                status: 'profile_exists',
                userProfile,
            });
        }

        // === Whitelist zoeken (met auto-migratie van legacy hashes) ===
        const { snap: whitelistSnap } = await resolveWhitelistDoc(smartschoolUserId, pepper);

        if (!whitelistSnap) {
            return res.status(403).json({ error: 'Je hebt geen toegang tot deze applicatie.' });
        }

        const whitelistDoc = whitelistSnap;
        const whitelistData = whitelistSnap.data();

        // === Nickname genereren (uniek binnen school) ===
        let nickname = generateNickname();
        let attempts = 0;
        while (attempts < 10) {
            const bestaand = await db.collection('users')
                .where('school_id', '==', whitelistData.school_id)
                .where('nickname', '==', nickname)
                .limit(1)
                .get();
            if (bestaand.empty) break;
            nickname = generateNickname();
            attempts++;
        }

        // === Slanke users collectie aanmaken ===
        // GDPR: geen naam, klas, gender, hash hier — dat blijft in toegestane_gebruikers
        const isLeerling = whitelistData.rol === 'leerling';

        const initialProfileData = {
            toegestane_gebruikers_id: whitelistDoc.id,
            school_id: whitelistData.school_id,
            rol: whitelistData.rol,
            klas: whitelistData.klas || null,
            geslacht: isLeerling ? (whitelistData.gender || null) : null,
            ...(whitelistData.rol !== 'leerling' && { klassen: whitelistData.klassen || [] }),
            nickname,
            onboarding_complete: false,
            created_at: new Date(),
            last_login: new Date(),
        };

        await profileRef.set(initialProfileData);

        return res.status(201).json({
            success: true,
            status: 'profile_created',
            userProfile: initialProfileData
        });

    } catch (error) {
        if (error.message?.includes('token')) {
            return res.status(401).json({ error: 'Niet geauthenticeerd' });
        }
        return res.status(500).json({ error: 'Serverfout bij profielcontrole' });
    }
}