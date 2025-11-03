// api/checkAndCreateUser.js
import { db, verifyToken } from './firebaseAdmin.js';
import CryptoJS from 'crypto-js';

// Importeer de admin-versie van 'setDoc'
import { setDoc, doc } from 'firebase-admin/firestore'; 

const generateHash = (smartschoolUserId) => {
    return CryptoJS.SHA256(smartschoolUserId).toString();
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // === 1. AUTHENTICATIE ===
        // We valideren de gebruiker die de check aanvraagt
        const decodedToken = await verifyToken(req.headers.authorization);
        
        // De UID van de ingelogde gebruiker (dit is de Smartschool User ID)
        const authUid = decodedToken.uid; 
        
        // === 2. CONTROLEER OF 'users' PROFIEL AL BESTAAT ===
        const profileRef = db.collection('users').doc(authUid);
        const docSnap = await profileRef.get();

        if (docSnap.exists()) {
            // Profiel bestaat al, alles is in orde.
            return res.status(200).json({ success: true, status: 'profile_exists', userProfile: docSnap.data() });
        }

        // === 3. PROFIEL BESTAAT NIET, CONTROLEER WHITELIST ===
        
        // Genereer de HASH (zoals je admin-tools doen)
        const hashedSmartschoolId = generateHash(authUid);
        
        // Controleer de 'toegestane_gebruikers' met de HASH
        const allowedUserRef = db.collection('toegestane_gebruikers').doc(hashedSmartschoolId);
        const allowedUserSnap = await allowedUserRef.get();

        if (allowedUserSnap.exists()) {
            // Gebruiker staat op de whitelist!
            const whitelistData = allowedUserSnap.data();
            
            // 4. Maak het profiel aan in de 'users' collectie
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
                email: decodedToken.email || '', // Van het auth token
                naam: decodedToken.displayName || '', // Van het auth token (onversleuteld)
            };

            await profileRef.set(initialProfileData);
            
            return res.status(201).json({ success: true, status: 'profile_created', userProfile: initialProfileData });
            
        } else {
            // Niet op de whitelist. Stuur een fout terug.
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