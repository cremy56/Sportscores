// api/bulkCreateUsers.js
import { db } from '../src/firebase';
import { doc, writeBatch } from 'firebase/firestore';
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
        const { csvData, targetSchoolId, currentUserProfileHash } = req.body;

        // Input validatie
        if (!csvData || !Array.isArray(csvData)) {
            return res.status(400).json({ error: 'csvData moet een array zijn' });
        }

        if (!targetSchoolId) {
            return res.status(400).json({ error: 'targetSchoolId is verplicht' });
        }

        if (csvData.length === 0) {
            return res.status(400).json({ error: 'CSV bevat geen data' });
        }

        if (csvData.length > 1000) {
            return res.status(400).json({ 
                error: 'Maximum 1000 gebruikers per batch. Split je CSV in kleinere bestanden.' 
            });
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

        let successCount = 0;
        const errors = [];
        const batches = [];
        let currentBatch = writeBatch(db);
        let operationsInBatch = 0;

        for (let i = 0; i < csvData.length; i++) {
            const row = csvData[i];
            const rowNum = i + 2; // +2 omdat CSV rij 1 = headers, rij 2 = eerste data

            try {
                // Validatie
                if (!row.smartschool_user_id || !row.smartschool_user_id.trim()) {
                    errors.push(`Rij ${rowNum}: Smartschool User ID ontbreekt`);
                    continue;
                }

                if (!row.naam || !row.naam.trim()) {
                    errors.push(`Rij ${rowNum}: Naam ontbreekt`);
                    continue;
                }

                if (!row.rol || !['leerling', 'leerkracht'].includes(row.rol.toLowerCase())) {
                    errors.push(`Rij ${rowNum}: Rol moet 'leerling' of 'leerkracht' zijn (nu: '${row.rol}')`);
                    continue;
                }

                const rol = row.rol.toLowerCase();

                // Extra validatie voor leerlingen
                if (rol === 'leerling') {
                    if (!row.klas || !row.klas.trim()) {
                        errors.push(`Rij ${rowNum}: Klas is verplicht voor leerlingen`);
                        continue;
                    }

                    if (!row.gender || !['M', 'V', 'X'].includes(row.gender.toUpperCase())) {
                        errors.push(`Rij ${rowNum}: Gender moet M, V of X zijn (nu: '${row.gender}')`);
                        continue;
                    }
                }

                // Generate hash en encrypt
                const hashedId = generateHash(row.smartschool_user_id.trim());
                const encryptedName = encryptName(row.naam.trim(), masterKey);
                const klas = rol === 'leerling' ? row.klas.trim() : null;
                const gender = rol === 'leerling' ? row.gender.toUpperCase() : null;

                // Data voor toegestane_gebruikers
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

                // Data voor users
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

                // Voeg toe aan batch
                currentBatch.set(doc(db, 'toegestane_gebruikers', hashedId), whitelistData, { merge: true });
                currentBatch.set(doc(db, 'users', hashedId), usersData, { merge: true });
                
                operationsInBatch += 2; // 2 writes per user
                successCount++;

                // Firestore batch limiet = 500 operations
                // Wij doen 2 per user, dus max 250 users per batch
                if (operationsInBatch >= 450) { // Veilige marge
                    batches.push(currentBatch);
                    currentBatch = writeBatch(db);
                    operationsInBatch = 0;
                }

            } catch (rowError) {
                console.error(`Fout bij verwerken rij ${rowNum}:`, rowError);
                errors.push(`Rij ${rowNum}: ${rowError.message}`);
            }
        }

        // Voeg laatste batch toe als die niet leeg is
        if (operationsInBatch > 0) {
            batches.push(currentBatch);
        }

        // Commit alle batches
        console.log(`📦 Committing ${batches.length} batch(es)...`);
        for (let i = 0; i < batches.length; i++) {
            await batches[i].commit();
            console.log(`✅ Batch ${i + 1}/${batches.length} committed`);
        }

        console.log(`✅ Import complete: ${successCount} success, ${errors.length} errors`);

        res.status(200).json({ 
            success: true, 
            successCount: successCount, 
            errorCount: errors.length,
            errors: errors.slice(0, 50), // Limit errors in response
            totalErrors: errors.length
        });

    } catch (error) {
        console.error('❌ API Bulk Error:', error);
        res.status(500).json({ 
            error: 'Fout bij bulk import: ' + error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}