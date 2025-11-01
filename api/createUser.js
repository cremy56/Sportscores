// api/createUser.js - AANGEPAST VOOR GOOGLE SECRET MANAGER
import { db } from './firebaseAdmin.js';
import CryptoJS from 'crypto-js';
import { getMasterKey } from './keyManager.js'; // <-- NIEUWE IMPORT

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
        const { formData, currentUserRole, targetSchoolId, currentUserProfileHash } = req.body;

        // ... (Validatie logica blijft hetzelfde) ...
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
        // ... (Einde validatie) ...

        // Haal master key veilig op uit Google Secret Manager
        const masterKey = await getMasterKey();
        
        if (!masterKey) {
            console.error(`❌ Kon master key niet laden`);
            return res.status(500).json({ error: 'Server configuratie fout' });
        }

        const docId = generateHash(formData.smartschool_user_id.trim());
        const encryptedName = encryptName(formData.naam.trim(), masterKey);

        console.log(`🔐 Creating user: ${currentUserRole} - ${docId.substring(0, 16)}...`);

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

        res.status(200).json({ 
            success: true, 
            userId: docId,
            message: `${currentUserRole} succesvol toegevoegd`
        });

    } catch (error) {
        console.error('❌ API Error:', error);
        res.status(500).json({ 
            error: 'Fout bij opslaan: ' + error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}