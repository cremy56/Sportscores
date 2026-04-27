// pages/api/users.js
import { db, verifyToken } from '../lib/firebaseAdmin.js';
import { getMasterKey } from '../lib/keyManager.js';
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

async function handleUpdateTeacherKlassen(req, res, decodedToken) {
    try {
        const { userId, klassen } = req.body;
 
        // === 1. VALIDATIE ===
        if (!userId) {
            return res.status(400).json({ error: 'userId is verplicht' });
        }
        if (!Array.isArray(klassen)) {
            return res.status(400).json({ error: 'klassen moet een array zijn' });
        }
 
        // === 2. AUTORISATIE ===
        // Alleen admins mogen klassen toewijzen
        const adminSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminSnap.exists) {
            return res.status(403).json({ error: 'Jouw gebruikersprofiel niet gevonden.' });
        }
        const adminProfile = adminSnap.data();
 
        if (!['administrator', 'super-administrator'].includes(adminProfile.rol)) {
            return res.status(403).json({ error: 'Alleen administrators kunnen klassen toewijzen.' });
        }
 
        // === 3. CHECK LEERKRACHT BESTAAT ===
        // userId = smartschool_id_hash (document ID in toegestane_gebruikers)
        const leerkrachtSnap = await db.collection('toegestane_gebruikers').doc(userId).get();
        if (!leerkrachtSnap.exists) {
            return res.status(404).json({ error: 'Leerkracht niet gevonden.' });
        }
 
        const leerkrachtData = leerkrachtSnap.data();
 
        // Controleer dat het effectief een leerkracht is
        if (leerkrachtData.rol !== 'leerkracht') {
            return res.status(400).json({ error: 'Gebruiker is geen leerkracht.' });
        }
 
        // Controleer dat admin en leerkracht tot dezelfde school behoren
        if (adminProfile.rol !== 'super-administrator' &&
            leerkrachtData.school_id !== adminProfile.school_id) {
            return res.status(403).json({ error: 'Toegang geweigerd: andere school.' });
        }
 
        // === 4. UPDATE TOEGESTANE_GEBRUIKERS ===
        await db.collection('toegestane_gebruikers').doc(userId).update({
            klassen: klassen,
            last_updated: new Date()
        });
 
        // === 5. UPDATE USERS COLLECTIE ===
        // Zoek de users doc op basis van smartschool_id_hash
        const usersQuery = await db.collection('users')
            .where('smartschool_id_hash', '==', userId)
            .limit(1)
            .get();
 
        if (!usersQuery.empty) {
            await usersQuery.docs[0].ref.update({
                klassen: klassen,
                last_updated: new Date()
            });
            console.log(`✅ users collectie bijgewerkt voor leerkracht ${userId.substring(0, 16)}...`);
        } else {
            // Leerkracht heeft nog niet ingelogd → alleen toegestane_gebruikers updaten
            // Bij eerste login wordt users automatisch aangemaakt via checkAndCreateUser
            console.warn(`⚠️ Geen users doc gevonden voor leerkracht ${userId.substring(0, 16)}... - nog niet ingelogd`);
        }
 
        // === 6. AUDIT LOG ===
        await db.collection('audit_logs').add({
            admin_user_id: decodedToken.uid,
            action: 'update_teacher_klassen',
            target_leerkracht_hash: userId,
            school_id: leerkrachtData.school_id,
            klassen_toegewezen: klassen,
            timestamp: new Date()
        });
 
        console.log(`✅ Klassen bijgewerkt voor leerkracht: ${klassen.join(', ')}`);
 
        return res.status(200).json({
            success: true,
            message: `Klassen bijgewerkt: ${klassen.join(', ') || 'geen'}`,
            klassen
        });
 
    } catch (error) {
        console.error('❌ API Error in handleUpdateTeacherKlassen:', error);
        return res.status(500).json({ error: 'Fout bij bijwerken klassen: ' + error.message });
    }
}

// --- LOGICA 1: Get Users (van getUsers.js) ---


async function handleGetUsers(req, res, decodedToken) {
    try {
        const { schoolId, filterKlas, filterRol } = req.body;

        if (!schoolId) {
            return res.status(400).json({ error: 'School ID is verplicht' });
        }

        // === 1. HAAL PROFIEL OP ===
        const adminUserSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminUserSnap.exists) {
            return res.status(403).json({ error: 'Jouw gebruikersprofiel is niet gevonden.' });
        }
        const adminUserProfile = adminUserSnap.data();

        // === 2. SCHOOL CHECK ===
        if (adminUserProfile.rol !== 'super-administrator' && adminUserProfile.school_id !== schoolId) {
            return res.status(403).json({ error: 'Toegang geweigerd: je hebt geen rechten voor deze school.' });
        }

        // === 3. KLASSEN CHECK VOOR LEERKRACHTEN (GDPR!) ===
        // Leerkrachten mogen ALLEEN leerlingen zien van hun eigen klassen
        if (adminUserProfile.rol === 'leerkracht') {
            const toegestaneKlassen = adminUserProfile.klassen || [];

            // Als leerkracht geen klassen heeft toegewezen → geen toegang
            if (toegestaneKlassen.length === 0) {
                return res.status(403).json({
                    error: 'Je hebt nog geen klassen toegewezen gekregen. Contacteer de administrator.'
                });
            }

            // Als een specifieke klas gevraagd wordt → check of leerkracht die klas heeft
            if (filterKlas && !toegestaneKlassen.includes(filterKlas)) {
                return res.status(403).json({
                    error: `Je hebt geen toegang tot klas ${filterKlas}.`
                });
            }

            // Als geen klas gevraagd wordt → beperk tot eigen klassen
            // (voorkomt dat leerkracht alle leerlingen van de school ziet)
            if (!filterKlas) {
                // We gaan queries per klas uitvoeren en samenvoegen
                const masterKey = await getMasterKey();
                if (!masterKey) {
                    return res.status(500).json({ error: 'Server configuratie fout (key)' });
                }

                const alleResults = [];
                for (const klas of toegestaneKlassen) {
                    let q = db.collection('toegestane_gebruikers')
                        .where('school_id', '==', schoolId)
                        .where('klas', '==', klas);

                    if (filterRol) {
                        q = q.where('rol', '==', filterRol);
                    }

                    const snapshot = await q.get();
                    snapshot.docs.forEach(doc => {
                        const data = doc.data();
                        const decryptedName = data.encrypted_name
                            ? decryptName(data.encrypted_name, masterKey)
                            : (data.naam || '[Naam ontbreekt]');

                        alleResults.push({
                            id: doc.id,
                            ...data,
                            decrypted_name: decryptedName,
                            // Verwijder encrypted_name uit response (niet nodig op client)
                            encrypted_name: undefined
                        });
                    });
                }

                // Audit log
                await db.collection('audit_logs').add({
                    user_id: decodedToken.uid,
                    rol: adminUserProfile.rol,
                    action: 'get_users',
                    target_school_id: schoolId,
                    klassen_opgevraagd: toegestaneKlassen,
                    filters_used: { filterKlas: 'alle_eigen_klassen', filterRol },
                    users_returned: alleResults.length,
                    timestamp: new Date()
                });

                return res.status(200).json({
                    success: true,
                    users: alleResults,
                    count: alleResults.length
                });
            }
        }

        // === 4. ADMINS: Volledige toegang (met optionele filters) ===
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

            return {
                id: doc.id,
                ...data,
                decrypted_name: decryptedName,
                // Verwijder encrypted_name uit response
                encrypted_name: undefined
            };
        });

        // Audit log
        await db.collection('audit_logs').add({
            user_id: decodedToken.uid,
            rol: adminUserProfile.rol,
            action: 'get_users',
            target_school_id: schoolId,
            filters_used: { filterKlas: filterKlas || null, filterRol: filterRol || null },
            users_returned: users.length,
            timestamp: new Date()
        });

        return res.status(200).json({
            success: true,
            users,
            count: users.length
        });

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

// =============================================
// GECORRIGEERDE FUNCTIES VOOR users.js
// Vervang de volledige handleUpdateUser en handleDeleteUser
// =============================================

// --- LOGICA 4: Update User ---
async function handleUpdateUser(req, res, decodedToken) {
    try {
        const { userId, updates, currentUserProfileHash } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId is verplicht' });
        }
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ error: 'updates object is verplicht' });
        }

        // === 1. ADMIN PROFIEL OPHALEN ===
        const adminUserSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminUserSnap.exists) {
            return res.status(403).json({ error: 'Jouw gebruikersprofiel is niet gevonden.' });
        }
        const adminUserProfile = adminUserSnap.data();

        // === 2. DOELGEBRUIKER OPHALEN (toegestane_gebruikers) ===
        // userId = smartschool_id_hash (= doc ID in toegestane_gebruikers)
        const userRef = db.collection('toegestane_gebruikers').doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists()) {
            return res.status(404).json({ error: 'De te bewerken gebruiker is niet gevonden.' });
        }

        // === 3. AUTORISATIE ===
        const targetSchoolId = userDoc.data().school_id;

        if (adminUserProfile.rol !== 'super-administrator' && adminUserProfile.school_id !== targetSchoolId) {
            console.warn(`[${decodedToken.email || decodedToken.uid}] probeerde gebruiker (${userId.substring(0, 16)}...) te bewerken van school ${targetSchoolId}`);
            return res.status(403).json({ error: 'Toegang geweigerd: je hebt geen rechten voor deze school.' });
        }

        // === 4. UPDATE VALIDATIE ===
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

        // === 5. UPDATE TOEGESTANE_GEBRUIKERS ===
        await userRef.update(updateData);

        // === 6. UPDATE USERS COLLECTIE (als leerling al ingelogd heeft) ===
        // ✅ FIX: Zoek via smartschool_id_hash, niet via userId als doc ID
        //         (users collectie gebruikt Firebase UID als doc ID, niet de hash!)
        const usersQuery = await db.collection('users')
            .where('smartschool_id_hash', '==', userId)
            .limit(1)
            .get();

        if (!usersQuery.empty) {
            await usersQuery.docs[0].ref.update(updateData);
            console.log(`✅ [${decodedToken.email || decodedToken.uid}] User ${userId.substring(0, 16)}... bijgewerkt in beide collecties`);
        } else {
            console.log(`ℹ️ Geen users doc voor ${userId.substring(0, 16)}... (nog niet ingelogd) - alleen toegestane_gebruikers bijgewerkt`);
        }

        // === 7. AUDIT LOG ===
        await db.collection('audit_logs').add({
            admin_user_id: decodedToken.uid,
            admin_email: decodedToken.email || decodedToken.uid,
            action: 'update_user',
            target_user_hash: userId,
            target_school_id: targetSchoolId,
            fields_updated: Object.keys(updateData).filter(k => !k.includes('updated') && !k.includes('by')),
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

// --- LOGICA 5: Delete User ---
async function handleDeleteUser(req, res, decodedToken) {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId is verplicht' });
        }

        // === 1. ADMIN PROFIEL OPHALEN ===
        const adminUserSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminUserSnap.exists) {
            return res.status(403).json({ error: 'Jouw gebruikersprofiel is niet gevonden.' });
        }
        const adminUserProfile = adminUserSnap.data();

        // === 2. DOELGEBRUIKER OPHALEN (toegestane_gebruikers) ===
        // userId = smartschool_id_hash (= doc ID in toegestane_gebruikers)
        const userRef = db.collection('toegestane_gebruikers').doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists()) {
            return res.status(404).json({ error: 'De te verwijderen gebruiker is niet gevonden.' });
        }

        // === 3. AUTORISATIE ===
        const targetSchoolId = userDoc.data().school_id;

        if (adminUserProfile.rol !== 'super-administrator' && adminUserProfile.school_id !== targetSchoolId) {
            console.warn(`[${decodedToken.email || decodedToken.uid}] probeerde gebruiker (${userId.substring(0, 16)}...) te verwijderen van school ${targetSchoolId}`);
            return res.status(403).json({ error: 'Toegang geweigerd: je hebt geen rechten voor deze school.' });
        }

        // === 4. VERWIJDER UIT TOEGESTANE_GEBRUIKERS ===
        await userRef.delete();
        console.log(`🗑️ [${decodedToken.email || decodedToken.uid}] Gebruiker ${userId.substring(0, 16)}... verwijderd uit toegestane_gebruikers`);

        // === 5. VERWIJDER UIT USERS COLLECTIE (als leerling al ingelogd heeft) ===
        // ✅ FIX: Zoek via smartschool_id_hash, niet via userId als doc ID
        //         (users collectie gebruikt Firebase UID als doc ID, niet de hash!)
        const usersQuery = await db.collection('users')
            .where('smartschool_id_hash', '==', userId)
            .limit(1)
            .get();

        if (!usersQuery.empty) {
            await usersQuery.docs[0].ref.delete();
            console.log(`✅ User profiel (Firebase UID: ${usersQuery.docs[0].id}) ook verwijderd uit users collectie`);
        } else {
            console.log(`ℹ️ Geen users doc gevonden voor ${userId.substring(0, 16)}... (nog niet ingelogd)`);
        }

        // === 6. AUDIT LOG ===
        await db.collection('audit_logs').add({
            admin_user_id: decodedToken.uid,
            admin_email: decodedToken.email || decodedToken.uid,
            action: 'delete_user',
            target_user_hash: userId,
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
// TOEVOEGEN aan het einde van handleBulkCreate in api/users.js
// Na de audit_logs.add(...) en voor de return res.status(200)

        // === 7. DEACTIVEER ONTBREKENDE LEERLINGEN ===
        // Vergelijk de net geïmporteerde lijst met de bestaande actieve leerlingen
        // Leerlingen die niet meer in de import zitten worden gedeactiveerd
        if (rol === 'leerling' || csvData.some(r => r.rol?.toLowerCase() === 'leerling')) {
            try {
                const geimporteerdeHashen = csvData
                    .filter(r => r.rol?.toLowerCase() === 'leerling' && r.smartschool_user_id?.trim())
                    .map(r => generateHash(r.smartschool_user_id.trim()));

                // Haal alle actieve leerlingen op
                const actieveSnap = await db.collection('toegestane_gebruikers')
                    .where('school_id', '==', targetSchoolId)
                    .where('rol', '==', 'leerling')
                    .where('is_active', '==', true)
                    .get();

                const schooljaar = (() => {
                    const nu = new Date();
                    const maand = nu.getMonth() + 1;
                    const jaar = nu.getFullYear();
                    return maand >= 9 ? jaar : jaar - 1;
                })();

                const getLeerjaar = (klas) => {
                    if (!klas) return null;
                    const match = klas.toString().match(/^(\d+)/);
                    return match ? parseInt(match[1]) : null;
                };

                const deactivatieBatch = db.batch();
                let gedeactiveerd = 0;
                let teruggeactiveerd = 0;

                for (const doc of actieveSnap.docs) {
                    if (!geimporteerdeHashen.includes(doc.id)) {
                        const data = doc.data();
                        const leerjaar = getLeerjaar(data.klas);
                        const virtueelAfstudeerjaar = leerjaar ? schooljaar + (6 - leerjaar) : null;

                        deactivatieBatch.update(doc.ref, {
                            is_active: false,
                            klas_bij_vertrek: data.klas || null,
                            gedeactiveerd_op: new Date(),
                            virtueel_afstudeerjaar: virtueelAfstudeerjaar,
                            last_updated: new Date(),
                        });
                        gedeactiveerd++;
                    }
                }

                // Check inactieve leerlingen die terug in de lijst staan
                const inactieveSnap = await db.collection('toegestane_gebruikers')
                    .where('school_id', '==', targetSchoolId)
                    .where('rol', '==', 'leerling')
                    .where('is_active', '==', false)
                    .get();

                for (const doc of inactieveSnap.docs) {
                    if (geimporteerdeHashen.includes(doc.id)) {
                        deactivatieBatch.update(doc.ref, {
                            is_active: true,
                            gedeactiveerd_op: null,
                            virtueel_afstudeerjaar: null,
                            klas_bij_vertrek: null,
                            last_updated: new Date(),
                        });
                        teruggeactiveerd++;
                    }
                }

                await deactivatieBatch.commit();
                console.log(`✅ Sync: ${gedeactiveerd} gedeactiveerd, ${teruggeactiveerd} teruggeactiveerd`);

            } catch (syncError) {
                // Sync fout mag import niet blokkeren
                console.error('⚠️ Deactivatie sync fout (niet kritiek):', syncError.message);
            }
        }
        
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
            case 'update_teacher_klassen': 
                return await handleUpdateTeacherKlassen(req, res, decodedToken);
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