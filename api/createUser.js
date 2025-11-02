// api/createUser.js
import { db, verifyToken } from './firebaseAdmin.js';
import CryptoJS from 'crypto-js';
import { getMasterKey } from './keyManager.js';

const generateHash = (smartschoolUserId) => {
    return CryptoJS.SHA256(smartschoolUserId).toString();
};

const encryptName = (name, masterKey) => {
    if (!masterKey) throw new Error('Master key niet beschikbaar op server');
    return CryptoJS.AES.encrypt(name, masterKey).toString();
};

export default async function handler(req, res) {
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // === 1. AUTHENTICATIE ===
        const decodedToken = await verifyToken(req.headers.authorization);
        
        const { formData, currentUserRole, targetSchoolId, currentUserProfileHash } = req.body;

        // === 2. AUTORISATIE ===
        const adminUserSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminUserSnap.exists) {
            return res.status(403).json({ error: 'Jouw gebruikersprofiel is niet gevonden.' });
        }
        const adminUserProfile = adminUserSnap.data();

        if (adminUserProfile.rol !== 'super-administrator' && adminUserProfile.school_id !== targetSchoolId) {
            console.warn(`[${decodedToken.email || decodedToken.uid}] probeerde toegang te krijgen tot ${targetSchoolId}, maar hoort bij ${adminUserProfile.school_id}`); // <-- FIX HIER
            return res.status(403).json({ error: 'Toegang geweigerd: je hebt geen rechten voor deze school.' });
        }
        
        // === 3. VALIDATIE ===
        if (!formData?.smartschool_user_id?.trim()) {
            return res.status(400).json({ error: 'Smartschool User ID is verplicht' });
        }
        if (!formData?.naam?.trim()) {
            return res.status(400).json({ error: 'Naam is verplicht' });
        }
        if (!currentUserRole || !['leerling', 'leerkracht', 'super-administrator'].includes(currentUserRole)) {
            return res.status(400).json({ error: 'Ongeldige rol' });
        }
        if (!targetSchoolId) {
            return res.status(400).json({ error: 'School ID is verplicht' });
        }
        if (currentUserRole === 'leerling') {
            if (!formData.klas?.trim()) {
                return res.status(400).json({ error: 'Klas is verplicht voor leerlingen' });
            }
            if (!['M', 'V', 'X'].includes(formData.gender)) {
                return res.status(400).json({ error: 'Gender moet M, V of X zijn voor leerlingen' });
            }
        }

        // === 4. HAAL SLEUTEL OP ===
        const masterKey = await getMasterKey();
        
        if (!masterKey) {
            return res.status(500).json({ error: 'Server configuratie fout (key)' });
        }

        // === 5. DATA VERWERKEN ===
        const docId = generateHash(formData.smartschool_user_id.trim());
        const encryptedName = encryptName(formData.naam.trim(), masterKey);

        console.log(`🔐 [${decodedToken.email || decodedToken.uid}] Creating user: ${currentUserRole} - ${docId.substring(0, 16)}...`);

        const whitelistData = {
            smartschool_id_hash: docId,
            encrypted_name: encryptedName,
            school_id: targetSchoolId,
            rol: currentUserRole,
            is_active: true,
            toegevoegd_door_hash: currentUserProfileHash || 'admin',
            last_updated: new Date(),
            created_at: new Date()
        };

        if (currentUserRole === 'leerling') {
            whitelistData.klas = formData.klas.trim();
            whitelistData.gender = formData.gender;
        }
        
       await db.collection('toegestane_gebruikers').doc(docId).set(whitelistData, { merge: true });

        console.log(`✅ ${currentUserRole} created: ${docId.substring(0, 16)}...`);
        
        // === 6. AUDIT LOG ===
        await db.collection('audit_logs').add({
            admin_user_id: decodedToken.uid,
            admin_email: decodedToken.email || decodedToken.uid, // <-- HIER IS DE FIX
            action: 'create_user',
            target_user_id: docId,
            target_user_rol: currentUserRole,
            target_school_id: targetSchoolId,
            timestamp: new Date(),
            ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        });
        
        res.status(200).json({ 
            success: true, 
            userId: docId,
            message: `${currentUserRole} succesvol toegevoegd`
        });

    } catch (error) {
        if (error.message.includes('token')) {
            return res.status(401).json({ error: 'Niet geauthenticeerd: ' + error.message });
        }
        console.error('❌ API Error in createUser:', error);
        res.status(500).json({ 
            error: 'Fout bij opslaan: ' + error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}