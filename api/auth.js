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
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const num = Math.floor(Math.random() * 999) + 1;
    return `${adj}${animal}${num}`;
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

        // ── Profiel check / aanmaken (default flow) ───────────────────────────
        const profileRef = db.collection('users').doc(firebaseUid);
        const docSnap = await profileRef.get();

        if (docSnap.exists) {
            await profileRef.update({ last_login: new Date() });
            return res.status(200).json({
                success: true,
                status: 'profile_exists',
                userProfile: docSnap.data()
            });
        }

        // === Smartschool User ID ophalen ===
        let smartschoolUserId = firebaseUid;
        if (decodedToken.smartschool_user_id) {
            smartschoolUserId = decodedToken.smartschool_user_id;
        } else if (decodedToken.providerData?.length > 0 && decodedToken.providerData[0].uid) {
            smartschoolUserId = decodedToken.providerData[0].uid;
        }

        const hashedSmartschoolId = generateHash(smartschoolUserId);
console.log('HASH:', hashedSmartschoolId);
        // === Whitelist zoeken via document ID ===
        // FIX: toegestane_gebruikers gebruikt de hash als document ID, niet als veld
        const whitelistSnap = await db.collection('toegestane_gebruikers')
            .doc(hashedSmartschoolId)
            .get();

        if (!whitelistSnap.exists) {
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