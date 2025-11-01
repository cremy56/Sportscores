// api/createUser.js
import { db } from '../src/firebase'; // Pas het pad naar firebase.js aan
import { doc, setDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';

// --- Deze functies draaien nu veilig op de server ---
const generateHash = (smartschoolUserId) => {
    return CryptoJS.SHA256(smartschoolUserId).toString();
};

const encryptName = (name, masterKey) => {
    if (!masterKey) throw new Error('Master key niet beschikbaar op server');
    return CryptoJS.AES.encrypt(name, masterKey).toString();
};
// ---------------------------------------------------

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Haal de (onversleutelde) data op uit de request
        const { 
            formData, 
            currentUserRole, 
            targetSchoolId, 
            currentUserProfileHash 
        } = req.body;

        // --- Haal de VEILIGE sleutel op ---
        // Dit werkt alleen op de server en gebruikt de naam ZONDER VITE_ prefix
        const schoolKey = targetSchoolId.toUpperCase().replace(/_/g, '');
        const envVarName = `MASTER_KEY_${schoolKey}`;
        
        let masterKey = process.env[envVarName];
        if (!masterKey) {
            masterKey = process.env.SCHOOL_MASTER_KEY; // Algemene fallback
        }
        
        if (!masterKey) {
            console.error(`❌ Geen master key gevonden op server voor ${envVarName}`);
            return res.status(500).json({ error: 'Server encryptie-fout' });
        }
        // ---------------------------------

        // Genereer de hash en encrypt de naam (veilig op de server)
        const docId = generateHash(formData.smartschool_user_id.trim());
        const encryptedName = encryptName(formData.naam.trim(), masterKey);

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
        
        // Schrijf naar Firestore (dit vereist dat je server-functie permissie heeft)
        await setDoc(doc(db, 'toegestane_gebruikers', docId), whitelistData, { merge: true });
        await setDoc(doc(db, 'users', docId), usersData, { merge: true });

        // Stuur succes terug naar de client
        res.status(200).json({ success: true, userId: docId });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Fout bij opslaan: ' + error.message });
    }
}