// api/bulkCreateUsers.js - AANGEPAST VOOR GOOGLE SECRET MANAGER
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
        const { csvData, targetSchoolId, currentUserProfileHash } = req.body;

        // ... (Validatie logica blijft hetzelfde) ...
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
            return res.status(400).json({ error: 'Maximum 1000 gebruikers per batch' });
        }
        // ... (Einde validatie) ...

        // Haal master key veilig op uit Google Secret Manager
        const masterKey = await getMasterKey();
        
        if (!masterKey) {
            console.error(`❌ Kon master key niet laden`);
            return res.status(500).json({ error: 'Server configuratie fout' });
        }

        let successCount = 0;
        const errors = [];
        const batches = [];
        let currentBatch = db.batch();
        let operationsInBatch = 0;

        for (let i = 0; i < csvData.length; i++) {
            const row = csvData[i];
            const rowNum = i + 2;

            try {
                // ... (Validatie per rij blijft hetzelfde) ...
                if (!row.smartschool_user_id?.trim()) {
                    errors.push(`Rij ${rowNum}: Smartschool User ID ontbreekt`);
                    continue;
                }
                if (!row.naam?.trim()) {
                    errors.push(`Rij ${rowNum}: Naam ontbreekt`);
                    continue;
                }
                const rol = row.rol?.toLowerCase();
                if (!['leerling', 'leerkracht', 'super-administrator'].includes(rol)) {
                    errors.push(`Rij ${rowNum}: Rol moet 'leerling', 'leerkracht' of 'super-administrator' zijn`);
                    continue;
                }
                if (rol === 'leerling') {
                    if (!row.klas?.trim()) {
                        errors.push(`Rij ${rowNum}: Klas is verplicht voor leerlingen`);
                        continue;
                    }
                    const gender = row.gender?.toUpperCase();
                    if (!['M', 'V', 'X'].includes(gender)) {
                        errors.push(`Rij ${rowNum}: Gender moet M, V of X zijn voor leerlingen`);
                        continue;
                    }
                }
                // ... (Einde validatie per rij) ...


                const hashedId = generateHash(row.smartschool_user_id.trim());
                const encryptedName = encryptName(row.naam.trim(), masterKey);

                const whitelistData = {
                    smartschool_id_hash: hashedId,
                    encrypted_name: encryptedName,
                    school_id: targetSchoolId,
                    rol: rol,
                    is_active: true,
                    toegevoegd_door_hash: currentUserProfileHash || 'admin',
                    last_updated: new Date(),
                    created_at: new Date()
                };

                if (rol === 'leerling') {
                    whitelistData.klas = row.klas.trim();
                    whitelistData.gender = row.gender.toUpperCase();
                }

                const docRef = db.collection('toegestane_gebruikers').doc(hashedId);
                currentBatch.set(docRef, whitelistData, { merge: true });
                
                operationsInBatch++;
                successCount++;

                if (operationsInBatch >= 450) {
                    batches.push(currentBatch);
                    currentBatch = db.batch();
                    operationsInBatch = 0;
                }

            } catch (rowError) {
                console.error(`Fout bij verwerken rij ${rowNum}:`, rowError);
                errors.push(`Rij ${rowNum}: ${rowError.message}`);
            }
        }

        // ... (Rest van de batch commit logica blijft hetzelfde) ...
        if (operationsInBatch > 0) {
            batches.push(currentBatch);
        }
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
            errors: errors.slice(0, 50),
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