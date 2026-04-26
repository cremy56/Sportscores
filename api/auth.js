// api/auth.js
import { db, verifyToken } from '../lib/firebaseAdmin.js';
import CryptoJS from 'crypto-js';

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
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIEVEN.length)];
    const animal = ANIMALS[Math.floor(Math.random() * DIEREN.length)];
    const num = Math.floor(Math.random() * 999) + 1;
    return `${adj}${animal}${num}`; // bv. "SnelleTijger42"
};

const generateHash = (smartschoolUserId) => {
    return CryptoJS.SHA256(smartschoolUserId).toString();
};

// ─── Nickname validatie ───────────────────────────────────────────────────────
const validateNickname = (nickname) => {
    if (!nickname || typeof nickname !== 'string') return 'Nickname is verplicht';
    const trimmed = nickname.trim();
    if (trimmed.length < 3) return 'Nickname moet minstens 3 tekens zijn';
    if (trimmed.length > 20) return 'Nickname mag maximaal 20 tekens zijn';
    if (!/^[a-zA-Z0-9_\-À-ÿ]+$/.test(trimmed)) return 'Alleen letters, cijfers, _ en - toegestaan';
    return null; // geldig
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

            // Controleer uniciteit binnen school
            const profileDoc = await db.collection('users').doc(firebaseUid).get();
            if (!profileDoc.exists) return res.status(404).json({ error: 'Profiel niet gevonden' });
            const schoolId = profileDoc.data().school_id;

            const bestaand = await db.collection('users')
                .where('school_id', '==', schoolId)
                .where('nickname', '==', trimmed)
                .limit(1)
                .get();

            if (!bestaand.empty && bestaand.docs[0].id !== firebaseUid) {
                return res.status(409).json({ error: 'Deze nickname is al in gebruik. Kies een andere.' });
            }

            await db.collection('users').doc(firebaseUid).update({
                nickname: trimmed,
                nickname_updated_at: new Date(),
                onboarding_complete: true,
            });

            return res.status(200).json({ success: true, nickname: trimmed });
        }

        // ── Profiel check / aanmaken (default flow) ───────────────────────────
        console.log('=== START checkAndCreateUser ===');

        const profileRef = db.collection('users').doc(firebaseUid);
        const docSnap = await profileRef.get();

        if (docSnap.exists) {
            // ✅ Update last_login bij elke login
            await profileRef.update({ last_login: new Date() });
            console.log('✅ Profile already exists — last_login updated');
            return res.status(200).json({
                success: true,
                status: 'profile_exists',
                userProfile: docSnap.data()
            });
        }

        console.log('Profile does not exist, will create...');

        // === Smartschool User ID ophalen ===
        let smartschoolUserId = firebaseUid;
        if (decodedToken.smartschool_user_id) {
            smartschoolUserId = decodedToken.smartschool_user_id;
        } else if (decodedToken.providerData?.length > 0 && decodedToken.providerData[0].uid) {
            smartschoolUserId = decodedToken.providerData[0].uid;
        }

        const hashedSmartschoolId = generateHash(smartschoolUserId);

        // === Whitelist zoeken ===
        let whitelistDoc = null;
        let whitelistData = null;

        try {
            const whitelistQuery = await db.collection('toegestane_gebruikers')
                .where('smartschool_id_hash', '==', hashedSmartschoolId)
                .limit(1)
                .get();
            if (!whitelistQuery.empty) {
                whitelistDoc = whitelistQuery.docs[0];
                whitelistData = whitelistDoc.data();
            }
        } catch (queryError) {
            console.warn('⚠️ Query failed, scanning...', queryError.message);
            const allDocs = await db.collection('toegestane_gebruikers').get();
            for (const doc of allDocs.docs) {
                if (doc.data().smartschool_id_hash === hashedSmartschoolId) {
                    whitelistDoc = doc;
                    whitelistData = doc.data();
                    break;
                }
            }
        }

        if (!whitelistData) {
            console.error('❌ NOT FOUND IN WHITELIST:', hashedSmartschoolId);
            return res.status(403).json({ error: 'Je hebt geen toegang tot deze applicatie.' });
        }

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
        const initialProfileData = {
            toegestane_gebruikers_id: whitelistDoc.id,  // link naar sensitieve data
            school_id: whitelistData.school_id,
            rol: whitelistData.rol,
            klas: whitelistData.klas || null,            // niet identificerend zonder naam — nodig voor leeftijdsfilter
            klassen: whitelistData.klassen || [],        // enkel voor leerkrachten
            nickname,                                     // random gegenereerd
            onboarding_complete: false,                  // leerling ziet nickname-keuze bij eerste login
            created_at: new Date(),
            last_login: new Date(),
        };

        await profileRef.set(initialProfileData);

        console.log('✅ Profile created — nickname:', nickname);
        console.log('=== END checkAndCreateUser (SUCCESS) ===');

        return res.status(201).json({
            success: true,
            status: 'profile_created',
            userProfile: initialProfileData
        });

        
    } catch (error) {
        console.error('=== ERROR in auth.js ===', error.message);
        if (error.message?.includes('token')) {
            return res.status(401).json({ error: 'Niet geauthenticeerd: ' + error.message });
        }
        return res.status(500).json({ error: 'Serverfout bij profielcontrole', message: error.message });
    }
}