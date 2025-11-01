// api/bulkCreateUsers.js
import { db } from '../src/firebase'; // Pas pad aan indien nodig
import { doc, writeBatch } from 'firebase/firestore';
import CryptoJS from 'crypto-js';

// --- Server-side helper functies ---
const generateHash = (smartschoolUserId) => {
    return CryptoJS.SHA256(smartschoolUserId).toString();
};

const encryptName = (name, masterKey) => {
    if (!masterKey) throw new Error('Master key niet beschikbaar op server');
    return CryptoJS.AES.encrypt(name, masterKey).toString();
};
// ------------------------------------

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { csvData, targetSchoolId, currentUserProfileHash } = req.body;

        if (!csvData || !targetSchoolId) {
            return res.status(400).json({ error: 'Ontbrekende data of schoolId' });
        }

        // --- Haal de VEILIGE master key op ---
        const schoolKey = targetSchoolId.toUpperCase().replace(/_/g, '');
        const envVarName = `MASTER_KEY_${schoolKey}`;
        let masterKey = process.env[envVarName];
        
        if (!masterKey) {
            masterKey = process.env.SCHOOL_MASTER_KEY; // Fallback
        }
        
        if (!masterKey) {
            console.error(`❌ Geen master key gevonden op server voor ${envVarName}`);
            return res.status(500).json({ error: 'Server encryptie-fout' });
        }
        // -------------------------------------

        const batch = writeBatch(db);
        let successCount = 0;
        const errors = [];

        for (let i = 0; i < csvData.length; i++) {
            const row = csvData[i];

            // Validatie (kan ook op server)
            if (!row.smartschool_user_id || !row.naam || !row.rol) {
                errors.push(`Rij ${i + 1}: Verplichte velden (smartschool_user_id, naam, rol) ontbreken`);
                continue;
            }

            const hashedId = generateHash(row.smartschool_user_id.trim());
            const encryptedName = encryptName(row.naam.trim(), masterKey);
            const rol = row.rol.toLowerCase();
            const klas = rol === 'leerling' ? row.klas.trim() : null;
            const gender = rol === 'leerling' ? row.gender.toUpperCase() : null;

            // 1. Toegestane gebruikers
            const whitelistData = {
                smartschool_id_hash: hashedId,
                school_id: targetSchoolId,
                rol: rol,
                klas: klas,
                gender: gender,
                is_active: true,
                toegevoegd_door_hash: currentUserProfileHash || 'admin',
                last_updated: new Date(),
                created_at: new Date()
            };
            batch.set(doc(db, 'toegestane_gebruikers', hashedId), whitelistData, { merge: true });

            // 2. Users collectie
            const usersData = {
                smartschool_id_hash: hashedId,
                encrypted_name: encryptedName,
                nickname: '',
                nickname_lower: '',
                nickname_set_at: null,
                school_id: targetSchoolId,
                klas: klas,
                gender: gender,
                rol: rol,
                onboarding_complete: false,
                created_at: new Date(),
                last_login: null,
                last_smartschool_login: null
            };
            batch.set(doc(db, 'users', hashedId), usersData, { merge: true });

            successCount++;
        }

        // Commit de batch
        await batch.commit();

        res.status(200).json({ 
            success: true, 
            successCount: successCount, 
            errorCount: errors.length,
            errors: errors 
        });

    } catch (error) {
        console.error('API Bulk Error:', error);
        res.status(500).json({ error: 'Fout bij bulk import: ' + error.message });
    }
}