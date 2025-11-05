// pages/api/users.js
import { db, verifyToken } from '../../lib/firebaseAdmin.js';
import { getMasterKey } from '../../lib/keyManager.js';
import CryptoJS from 'crypto-js';

// --- HELPER FUNCTIES (Vanuit alle bestanden) ---

// Van getUsers.js
const decryptName = (encryptedName, masterKey) => {
    try {
        if (!encryptedName) return '[Geen naam]';
        const decrypted = CryptoJS.AES.decrypt(encryptedName, masterKey);
        const result = decrypted.toString(CryptoJS.enc.Utf8);
        return result || '[Decryptie fout]';
    } catch (error) {
        console.error('Decryptie fout:', error);
        return '[Naam niet beschikbaar]';
    }
};

// Van createUser.js / bulkCreateUsers.js
const generateHash = (smartschoolUserId) => {
    return CryptoJS.SHA256(smartschoolUserId).toString();
};

const encryptName = (name, masterKey) => {
    if (!masterKey) throw new Error('Master key niet beschikbaar op server');
    return CryptoJS.AES.encrypt(name, masterKey).toString();
};

// --- LOGICA 1: Get Users (van getUsers.js) ---
async function handleGetUsers(req, res, decodedToken) {
    try {
        const { schoolId, filterKlas, filterRol } = req.body; // payload uit body

        if (!schoolId) {
            return res.status(400).json({ error: 'School ID is verplicht' });
        }
        
        const adminUserSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminUserSnap.exists) {
            return res.status(403).json({ error: 'Jouw gebruikersprofiel is niet gevonden.' });
        }
        const adminUserProfile = adminUserSnap.data();

        if (adminUserProfile.rol !== 'super-administrator' && adminUserProfile.school_id !== schoolId) {
            return res.status(403).json({ error: 'Toegang geweigerd: je hebt geen rechten voor deze school.' });
        }

        const masterKey = await getMasterKey();
        if (!masterKey) {
            return res.status(500).json({ error: 'Server configuratie fout (key)' });
        }

        let q = db.collection('toegestane_gebruikers')
                  .where('school_id', '==', schoolId);

        if (filterKlas) {
            q = q.where('klas', '==', filterKlas);
        }
        if (filterRol) {
            q = q.where('rol', '==', filterRol);
        }

        const snapshot = await q.get();
        const users = snapshot.docs.map(doc => {
            const data = doc.data();
            const decryptedName = data.encrypted_name 
                ? decryptName(data.encrypted_name, masterKey)
                : (data.naam || '[Naam ontbreekt]');
            
            return { id: doc.id, ...data, decrypted_name: decryptedName };
        });

        // Audit Log
        await db.collection('audit_logs').add({
            admin_user_id: decodedToken.uid,
            admin_email: decodedToken.email || decodedToken.uid,
            action: 'get_users',
            target_school_id: schoolId,
            filters_used: { filterKlas, filterRol },
            users_returned: users.length,
            timestamp: new Date()
        });

        return res.status(200).json({ success: true, users: users, count: users.length });

    } catch (error) {
        console.error('❌ API Error in handleGetUsers:', error);
        return res.status(500).json({ error: 'Fout bij ophalen gebruikers: ' + error.message });
    }
}

// --- LOGICA 2: Get Users Count (van getUsersCount.js) ---
async function handleGetCount(req, res, decodedToken) {
    try {
        const { schoolId } = req.body;
        if (!schoolId) {
            return res.status(400).json({ error: 'School ID is verplicht' });
        }

        const adminUserSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminUserSnap.exists) {
            return res.status(403).json({ error: 'Jouw profiel is niet gevonden.' });
        }
        const adminUserProfile = adminUserSnap.data();

        if (adminUserProfile.rol !== 'super-administrator' && adminUserProfile.school_id !== schoolId) {
            return res.status(403).json({ error: 'Toegang geweigerd.' });
        }

        const collectionRef = db.collection('toegestane_gebruikers');
        const query = collectionRef.where('school_id', '==', schoolId);
        
        const snapshot = await query.aggregate({ totalCount: 'count' }).get();
        const count = snapshot.data().totalCount;
        
        return res.status(200).json({ success: true, count: count });

    } catch (error) {
        console.error('❌ API Error in handleGetCount:', error);
        return res.status(500).json({ error: 'Fout bij ophalen telling' });
    }
}

// --- LOGICA 3: Create User (van createUser.js) ---
async function handleCreateUser(req, res, decodedToken) {
    try {
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
        
        const masterKey = await getMasterKey();
        if (!masterKey) {
            return res.status(500).json({ error: 'Server configuratie fout (key)' });
        }

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
        
        return res.status(200).json({ 
            success: true, 
            userId: docId,
            message: `${currentUserRole} succesvol toegevoegd`
        });

    } catch (error) {
        console.error('❌ API Error in handleCreateUser:', error);
        return res.status(500).json({ error: 'Fout bij opslaan: ' + error.message });
    }
}

// --- LOGICA 4: Update User (van updateUser.js) ---
async function handleUpdateUser(req, res, decodedToken) {
    try {
        const { userId, updates, currentUserProfileHash } = req.body;
       if (!userId) {
            return res.status(400).json({ error: 'userId is verplicht' });
        }
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ error: 'updates object is verplicht' });
        }
        
        // === 3. DATA OPHALEN ===
        const adminUserSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminUserSnap.exists) {
            return res.status(403).json({ error: 'Jouw gebruikersprofiel is niet gevonden.' });
        }
        const adminUserProfile = adminUserSnap.data();

        const userRef = db.collection('toegestane_gebruikers').doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists()) {
            return res.status(404).json({ error: 'De te bewerken gebruiker is niet gevonden.' });
        }
        
        // === 4. AUTORISATIE ===
        const targetSchoolId = userDoc.data().school_id;
        
        if (adminUserProfile.rol !== 'super-administrator' && adminUserProfile.school_id !== targetSchoolId) {
            console.warn(`[${decodedToken.email || decodedToken.uid}] probeerde gebruiker (${userId}) te bewerken van school ${targetSchoolId}, maar hoort zelf bij ${adminUserProfile.school_id}`); // <-- FIX HIER
            return res.status(403).json({ error: 'Toegang geweigerd: je hebt geen rechten voor deze school.' });
        }

        // === 5. UPDATE LOGICA ===
        const allowedFields = ['klas', 'gender', 'is_active'];
        const updateData = {};
        for (const field of allowedFields) {
            if (updates.hasOwnProperty(field)) {
                updateData[field] = updates[field];
            }
        }
        if (updateData.gender && !['M', 'V', 'X'].includes(updateData.gender)) {
            return res.status(400).json({ error: 'Gender moet M, V of X zijn' });
        }
        if (updateData.klas && typeof updateData.klas !== 'string') {
            return res.status(400).json({ error: 'Klas moet een string zijn' });
        }
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Geen geldige velden om te updaten' });
        }

        updateData.last_updated = new Date();
        updateData.updated_by_hash = currentUserProfileHash || 'admin';

        console.log(`🔄 [${decodedToken.email || decodedToken.uid}] Updating user ${userId.substring(0, 16)}...`);

        await userRef.update(updateData);

        const userProfileRef = db.collection('users').doc(userId);
        const userProfileSnap = await userProfileRef.get();

        if (userProfileSnap.exists) {
            console.log('User profiel bestaat, ook updaten...');
            await userProfileRef.update(updateData);
        } else {
            console.log('User profiel bestaat nog niet, update overgeslagen.');
        }

        console.log(`✅ User updated successfully`);

        // === 6. AUDIT LOG ===
        await db.collection('audit_logs').add({
            admin_user_id: decodedToken.uid,
            admin_email: decodedToken.email || decodedToken.uid, // <-- HIER IS DE FIX
            action: 'update_user',
            target_user_id: userId,
            target_school_id: targetSchoolId,
            fields_updated: Object.keys(updateData).filter(k => !k.includes('updated')),
            timestamp: new Date(),
            ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        });

        return res.status(200).json({ 
            success: true, 
            message: 'Gebruiker succesvol bijgewerkt',
        });
    } catch (error) {
        console.error('❌ API Error in handleUpdateUser:', error);
        return res.status(500).json({ error: 'Fout bij bijwerken: ' + error.message });
    }
}

// --- LOGICA 5: Delete User (van deleteUser.js) ---
async function handleDeleteUser(req, res, decodedToken) {
    try {
        const { userId } = req.body;
        // === 2. VALIDATIE ===
        if (!userId) {
            return res.status(400).json({ error: 'userId is verplicht' });
        }

        // === 3. DATA OPHALEN ===
        const adminUserSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminUserSnap.exists) {
            return res.status(403).json({ error: 'Jouw gebruikersprofiel is niet gevonden.' });
        }
        const adminUserProfile = adminUserSnap.data();

        const userRef = db.collection('toegestane_gebruikers').doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists()) {
            return res.status(404).json({ error: 'De te verwijderen gebruiker is niet gevonden.' });
        }
        
        // === 4. AUTORISATIE ===
        const targetSchoolId = userDoc.data().school_id;
        
        if (adminUserProfile.rol !== 'super-administrator' && adminUserProfile.school_id !== targetSchoolId) {
            console.warn(`[${decodedToken.email || decodedToken.uid}] probeerde gebruiker (${userId}) te verwijderen van school ${targetSchoolId}, maar hoort zelf bij ${adminUserProfile.school_id}`); // <-- FIX HIER
            return res.status(403).json({ error: 'Toegang geweigerd: je hebt geen rechten voor deze school.' });
        }
        
        console.log(`🗑️ [${decodedToken.email || decodedToken.uid}] Deleting user ${userId.substring(0, 16)}...`);

        // === 5. DATA VERWERKEN ===
        await db.collection('toegestane_gebruikers').doc(userId).delete();

        const userProfileRef = db.collection('users').doc(userId);
        const userProfileSnap = await userProfileRef.get();

        if (userProfileSnap.exists) {
            await userProfileRef.delete();
            console.log('User profiel (uit users collectie) ook verwijderd.');
        }

        console.log(`✅ User deleted successfully`);

        // === 6. AUDIT LOG ===
        await db.collection('audit_logs').add({
            admin_user_id: decodedToken.uid,
            admin_email: decodedToken.email || decodedToken.uid, // <-- HIER IS DE FIX
            action: 'delete_user',
            target_user_id: userId,
            target_school_id: targetSchoolId,
            timestamp: new Date(),
            ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        });

        return res.status(200).json({ 
            success: true, 
            message: 'Gebruiker succesvol verwijderd'
        });
    } catch (error) {
        console.error('❌ API Error in handleDeleteUser:', error);
        return res.status(500).json({ error: 'Fout bij verwijderen: ' + error.message });
    }
}

// --- LOGICA 6: Bulk Create (van bulkCreateUsers.js) ---
async function handleBulkCreate(req, res, decodedToken) {
    try {
        const { csvData, targetSchoolId, currentUserProfileHash } = req.body;
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
        if (!csvData || !Array.isArray(csvData)) {
            return res.status(400).json({ error: 'csvData moet een array zijn' });
        }
        if (!targetSchoolId) {
            return res.status(400).json({ error: 'targetSchoolId is verplicht' });
        }
        if (csvData.length === 0) {
            return res.status(400).json({ error: 'CSV bevat geen data' });
        }

        // === 4. HAAL SLEUTEL OP ===
                const masterKey = await getMasterKey();
                
                if (!masterKey) {
                    return res.status(500).json({ error: 'Server configuratie fout (key)' });
                }
        
                // === 5. DATA VERWERKEN ===
                console.log(`[${decodedToken.email || decodedToken.uid}] Starting bulk import for ${targetSchoolId}...`);
                
                let successCount = 0;
                const errors = [];
                const batches = [];
                let currentBatch = db.batch();
                let operationsInBatch = 0;
        
                for (let i = 0; i < csvData.length; i++) {
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
                            currentBatch = db.batch(); 
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
                
                console.log(`📦 Committing ${batches.length} batch(es)...`);
                for (let i = 0; i < batches.length; i++) {
                    await batches[i].commit();
                    console.log(`✅ Batch ${i + 1}/${batches.length} committed`);
                }
        
                console.log(`✅ Import complete: ${successCount} success, ${errors.length} errors`);
        
                // === 6. AUDIT LOG ===
                await db.collection('audit_logs').add({
                    admin_user_id: decodedToken.uid,
                    admin_email: decodedToken.email || decodedToken.uid, // <-- HIER IS DE FIX
                    action: 'bulk_create_users',
                    target_school_id: targetSchoolId,
                    users_created: successCount,
                    users_failed: errors.length,
                    timestamp: new Date(),
                    ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress
                });

        return res.status(200).json({ 
            success: true, 
            successCount: successCount, // (zorg dat deze variabelen bestaan)
            errorCount: errors.length,
            errors: errors.slice(0, 50), 
        });
    } catch (error) {
        console.error('❌ API Error in handleBulkCreate:', error);
        return res.status(500).json({ error: 'Fout bij bulk import: ' + error.message });
    }
}


// --- HOOFD HANDLER (Router) ---
export default async function handler(req, res) {
   if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    try {
        // Authenticatie gebeurt één keer
        const decodedToken = await verifyToken(req.headers.authorization);
        const { action } = req.body; 

        // Routeren op basis van de 'action'
        switch (action) {
            case 'get_users':
                return await handleGetUsers(req, res, decodedToken);
            case 'get_count':
                return await handleGetCount(req, res, decodedToken);
            case 'create_user':
                return await handleCreateUser(req, res, decodedToken);
            case 'update_user':
                return await handleUpdateUser(req, res, decodedToken);
            case 'delete_user':
                return await handleDeleteUser(req, res, decodedToken);
            case 'bulk_create':
                return await handleBulkCreate(req, res, decodedToken);
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }

    } catch (error) {
         if (error.message.includes('token')) {
            return res.status(401).json({ error: 'Niet geauthenticeerd: ' + error.message });
        }
        console.error('❌ API Hoofd-error in /users:', error);
        return res.status(500).json({ error: 'Fout bij verwerken user data' });
    }
}