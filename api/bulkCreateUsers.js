// api/bulkCreateUsers.js
import { db, verifyToken } from './firebaseAdmin.js'; // <-- AANGEPAST
import CryptoJS from 'crypto-js';
import { getMasterKey } from './keyManager.js'; // <-- AANGEPAST

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

        const { csvData, targetSchoolId, currentUserProfileHash } = req.body;

        // Haal het profiel op van de persoon die de API aanroept
        const adminUserSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminUserSnap.exists) {
            return res.status(403).json({ error: 'Jouw gebruikersprofiel is niet gevonden.' });
        }
        const adminUserProfile = adminUserSnap.data();

        // Blokkeer als ze geen super-admin zijn EN proberen data van een andere school te zien
       if (adminUserProfile.rol !== 'super-administrator' && adminUserProfile.school_id !== targetSchoolId) {
    console.warn(`[${decodedToken.email}] probeerde toegang te krijgen tot ${targetSchoolId}, maar hoort bij ${adminUserProfile.school_id}`);
    return res.status(403).json({ error: 'Toegang geweigerd: je hebt geen rechten voor deze school.' });
}
        // === EINDE AUTORISATIE ===
        // === 2. VALIDATIE ===
        if (!csvData || !Array.isArray(csvData)) {
            return res.status(400).json({ error: 'csvData moet een array zijn' });
        }
        // ... (alle andere validaties blijven hetzelfde) ...
        if (!targetSchoolId) {
            return res.status(400).json({ error: 'targetSchoolId is verplicht' });
        }
        if (csvData.length === 0) {
            return res.status(400).json({ error: 'CSV bevat geen data' });
        }

        // === 3. HAAL SLEUTEL OP ===
        const masterKey = await getMasterKey();
        
        if (!masterKey) {
            return res.status(500).json({ error: 'Server configuratie fout (key)' });
        }

        // === 4. DATA VERWERKEN ===
        console.log(`[${decodedToken.email}] Starting bulk import for ${targetSchoolId}...`);
        
        let successCount = 0;
        const errors = [];
        const batches = [];
        let currentBatch = db.batch();
        let operationsInBatch = 0;

        for (let i = 0; i < csvData.length; i++) {
            // ... (je for-loop logica blijft volledig hetzelfde) ...
            const row = csvData[i];
            const rowNum = i + 2;

            try {
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
                    currentBatch = db.batch(); // db.batch() gebruiken
                    operationsInBatch = 0;
                }
            } catch (rowError) {
                console.error(`Fout bij verwerken rij ${rowNum}:`, rowError);
                errors.push(`Rij ${rowNum}: ${rowError.message}`);
            }
        }

        if (operationsInBatch > 0) {
            batches.push(currentBatch);
        }
        
        // ... (Batch commit logica blijft hetzelfde) ...
        console.log(`📦 Committing ${batches.length} batch(es)...`);
        for (let i = 0; i < batches.length; i++) {
            await batches[i].commit();
            console.log(`✅ Batch ${i + 1}/${batches.length} committed`);
        }

        console.log(`✅ Import complete: ${successCount} success, ${errors.length} errors`);

        // === 6. AUDIT LOG ===
        await db.collection('audit_logs').add({
            admin_user_id: decodedToken.uid,
            admin_email: decodedToken.email,
            action: 'bulk_create_users',
            target_school_id: targetSchoolId,
            users_created: successCount,
            users_failed: errors.length,
            timestamp: new Date(),
            ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        });

        res.status(200).json({ 
            success: true, 
            successCount: successCount, 
            errorCount: errors.length,
            errors: errors.slice(0, 50),
            totalErrors: errors.length
        });

    } catch (error) {
        if (error.message.includes('token')) {
            return res.status(401).json({ error: 'Niet geauthenticeerd: ' + error.message });
        }
        console.error('❌ API Bulk Error:', error);
        res.status(500).json({ 
            error: 'Fout bij bulk import: ' + error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}