// api/getUsers.js
import { db, verifyToken } from './firebaseAdmin.js';
import CryptoJS from 'crypto-js';
import { getMasterKey } from './keyManager.js';

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

export default async function handler(req, res) {
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const decodedToken = await verifyToken(req.headers.authorization);
        const { schoolId, filterKlas, filterRol } = req.body;

        if (!schoolId) {
            return res.status(400).json({ error: 'School ID is verplicht' });
        }
        
        const adminUserSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminUserSnap.exists) {
            return res.status(403).json({ error: 'Jouw gebruikersprofiel is niet gevonden.' });
        }
        const adminUserProfile = adminUserSnap.data();

        if (adminUserProfile.rol !== 'super-administrator' && adminUserProfile.school_id !== schoolId) {
            console.warn(`[${decodedToken.email || decodedToken.uid}] probeerde toegang te krijgen tot ${schoolId}, maar hoort bij ${adminUserProfile.school_id}`);
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
            
            return {
                id: doc.id,
                ...data,
                decrypted_name: decryptedName
            };
        });

        console.log(`✅ [${decodedToken.email || decodedToken.uid}] Loaded ${users.length} users for school ${schoolId}`);

        // === 6. AUDIT LOG ===
        await db.collection('audit_logs').add({
            admin_user_id: decodedToken.uid,
            admin_email: decodedToken.email || decodedToken.uid, // <-- HIER IS DE FIX
            action: 'get_users',
            target_school_id: schoolId,
            filters_used: { filterKlas, filterRol },
            users_returned: users.length,
            timestamp: new Date(),
            ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        });

        res.status(200).json({ 
            success: true, 
            users: users,
            count: users.length
        });

    } catch (error) {
        if (error.message.includes('token')) {
            return res.status(401).json({ error: 'Niet geauthenticeerd: ' + error.message });
        }
        console.error('❌ API Error in getUsers:', error);
        res.status(500).json({ 
            error: 'Fout bij ophalen gebruikers: ' + error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}