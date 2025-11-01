// api/createUser.js - FIXED VERSION
// klas en gender alleen voor leerlingen
import { db } from './firebaseAdmin';
import { doc, setDoc } from 'firebase-admin/firestore';
import CryptoJS from 'crypto-js';

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

        // Extra validatie ALLEEN voor leerlingen
        if (currentUserRole === 'leerling') {
            if (!formData.klas?.trim()) {
                return res.status(400).json({ error: 'Klas is verplicht voor leerlingen' });
            }

            if (!['M', 'V', 'X'].includes(formData.gender)) {
                return res.status(400).json({ error: 'Gender moet M, V of X zijn voor leerlingen' });
            }
        }

        // Haal master key op
        const schoolKey = targetSchoolId.toUpperCase().replace(/_/g, '');
        const envVarName = `MASTER_KEY_${schoolKey}`;
        let masterKey = process.env[envVarName] || process.env.SCHOOL_MASTER_KEY;
        
        if (!masterKey) {
            console.error(`❌ Geen master key voor ${envVarName}`);
            return res.status(500).json({ error: 'Server configuratie fout' });
        }

        const docId = generateHash(formData.smartschool_user_id.trim());
        const encryptedName = encryptName(formData.naam.trim(), masterKey);

        console.log(`🔐 Creating user: ${currentUserRole} - ${docId.substring(0, 16)}...`);

        // Base data voor ALLE rollen
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

        // Voeg klas en gender ALLEEN toe voor leerlingen
        if (currentUserRole === 'leerling') {
            whitelistData.klas = formData.klas.trim();
            whitelistData.gender = formData.gender;
        }
        
        await setDoc(doc(db, 'toegestane_gebruikers', docId), whitelistData, { merge: true });

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