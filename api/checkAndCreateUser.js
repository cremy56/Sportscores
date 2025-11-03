// api/checkAndCreateUser.js
import { db, verifyToken } from './firebaseAdmin.js';
import CryptoJS from 'crypto-js';

// We hebben de hash-functie hier nodig, op de server
const generateHash = (smartschoolUserId) => {
    return CryptoJS.SHA256(smartschoolUserId).toString();
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // === 1. AUTHENTICATIE ===
        const decodedToken = await verifyToken(req.headers.authorization);
        const authUid = decodedToken.uid; 
        
        // === 2. CONTROLEER OF 'users' PROFIEL AL BESTAAT ===
        const profileRef = db.collection('users').doc(authUid);
        const docSnap = await profileRef.get();

        if (docSnap.exists()) {
            return res.status(200).json({ success: true, status: 'profile_exists', userProfile: docSnap.data() });
        }

        // === 3. PROFIEL BESTAAT NIET, CONTROLEER WHITELIST ===
        const hashedSmartschoolId = generateHash(authUid);
        
        const allowedUserRef = db.collection('toegestane_gebruikers').doc(hashedSmartschoolId);
        const allowedUserSnap = await allowedUserRef.get();

        if (allowedUserSnap.exists()) {
            const whitelistData = allowedUserSnap.data();
            
            // 4. Maak het profiel aan in de 'users' collectie
            //    (ZONDER 'naam' en 'email' velden)
            const initialProfileData = {
                smartschool_id_hash: hashedSmartschoolId,
                encrypted_name: whitelistData.encrypted_name,
                school_id: whitelistData.school_id,
                rol: whitelistData.rol,
                klas: whitelistData.klas || null,
                gender: whitelistData.gender || null,
                onboarding_complete: true,
                created_at: new Date(),
                last_login: new Date(),
            };

            await profileRef.set(initialProfileData);
            
            return res.status(201).json({ success: true, status: 'profile_created', userProfile: initialProfileData });
            
        } else {
            console.error(`GEBRUIKER GEWEIGERD: Hash ${hashedSmartschoolId} (van Smartschool ID ${authUid}) niet gevonden in 'toegestane_gebruikers'.`);
            return res.status(403).json({ error: 'Je hebt geen toegang tot deze applicatie.' });
        }

    } catch (error) {
        if (error.message.includes('token')) {
            return res.status(401).json({ error: 'Niet geauthenticeerd: ' + error.message });
        }
        console.error("❌ API Error in checkAndCreateUser:", error);
        res.status(500).json({ error: 'Serverfout bij profielcontrole' });
    }
}