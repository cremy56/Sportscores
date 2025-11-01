// api/createUser.js
import { db } from '../src/firebase';
import { doc, setDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';

// Server-side helper functies
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

        // Input validatie
        if (!formData) {
            return res.status(400).json({ error: 'formData is verplicht' });
        }

        if (!formData.smartschool_user_id || !formData.smartschool_user_id.trim()) {
            return res.status(400).json({ error: 'Smartschool User ID is verplicht' });
        }

        if (!formData.naam || !formData.naam.trim()) {
            return res.status(400).json({ error: 'Naam is verplicht' });
        }

        if (!currentUserRole || !['leerling', 'leerkracht'].includes(currentUserRole)) {
            return res.status(400).json({ error: 'Ongeldige rol' });
        }

        if (!targetSchoolId) {
            return res.status(400).json({ error: 'School ID is verplicht' });
        }

        // Extra validatie voor leerlingen
        if (currentUserRole === 'leerling') {
            if (!formData.klas || !formData.klas.trim()) {
                return res.status(400).json({ error: 'Klas is verplicht voor leerlingen' });
            }

            if (!formData.gender || !['M', 'V', 'X'].includes(formData.gender)) {
                return res.status(400).json({ error: 'Gender moet M, V of X zijn' });
            }
        }

        // Haal master key op
        const schoolKey = targetSchoolId.toUpperCase().replace(/_/g, '');
        const envVarName = `MASTER_KEY_${schoolKey}`;
        let masterKey = process.env[envVarName] || process.env.SCHOOL_MASTER_KEY;
        
        if (!masterKey) {
            console.error(`❌ Geen master key gevonden voor ${envVarName} of SCHOOL_MASTER_KEY`);
            return res.status(500).json({ 
                error: 'Server configuratie fout: encryptie key niet gevonden',
                details: 'Contact administrator'
            });
        }

        console.log(`✅ Master key geladen voor school: ${targetSchoolId}`);

        // Generate hash en encrypt
        const docId = generateHash(formData.smartschool_user_id.trim());
        const encryptedName = encryptName(formData.naam.trim(), masterKey);

        console.log(`🔐 Creating user with hash: ${docId.substring(0, 16)}...`);

        // Data voor toegestane_gebruikers
        const whitelistData = {
            smartschool_id_hash: docId,
            school_id: targetSchoolId,
            rol: currentUserRole,
            klas: currentUserRole === 'leerling' ? formData.klas.trim() : null,
            gender: currentUserRole === 'leerling' ? formData.gender : null,
            is_active: true,
            toegevoegd_door_hash: currentUserProfileHash || 'admin',
            last_updated: new Date(),
            created_at: new Date()
        };
        
        // Data voor users
        const usersData = {
            smartschool_id_hash: docId,
            encrypted_name: encryptedName,
            nickname: '',
            nickname_lower: '',
            nickname_set_at: null,
            school_id: targetSchoolId,
            klas: currentUserRole === 'leerling' ? formData.klas.trim() : null,
            gender: currentUserRole === 'leerling' ? formData.gender : null,
            rol: currentUserRole,
            onboarding_complete: false,
            created_at: new Date(),
            last_login: null,
            last_smartschool_login: null
        };
        
        // Schrijf naar Firestore
        await setDoc(doc(db, 'toegestane_gebruikers', docId), whitelistData, { merge: true });
        await setDoc(doc(db, 'users', docId), usersData, { merge: true });

        console.log(`✅ User created successfully: ${docId.substring(0, 16)}...`);

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