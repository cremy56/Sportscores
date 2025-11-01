// api/getUsers.js
import { db } from '../src/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import CryptoJS from 'crypto-js';

const decryptName = (encryptedName, masterKey) => {
    try {
        const decrypted = CryptoJS.AES.decrypt(encryptedName, masterKey);
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.error('Decryptie fout:', error);
        return '[Naam niet beschikbaar]';
    }
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { schoolId, filterKlas, filterRol } = req.body;

        if (!schoolId) {
            return res.status(400).json({ error: 'School ID is verplicht' });
        }

        // Haal master key op (server-side!)
        const schoolKey = schoolId.toUpperCase().replace(/_/g, '');
        const envVarName = `MASTER_KEY_${schoolKey}`;
        let masterKey = process.env[envVarName] || process.env.SCHOOL_MASTER_KEY;
        
        if (!masterKey) {
            console.error(`❌ Geen master key voor ${envVarName}`);
            return res.status(500).json({ error: 'Server configuratie fout' });
        }

        // Query toegestane_gebruikers
        let q = query(
            collection(db, 'toegestane_gebruikers'),
            where('school_id', '==', schoolId)
        );

        if (filterKlas) {
            q = query(q, where('klas', '==', filterKlas));
        }

        if (filterRol) {
            q = query(q, where('rol', '==', filterRol));
        }

        const snapshot = await getDocs(q);
        
        // Parallel: haal users data op voor namen
        const userIds = snapshot.docs.map(doc => doc.id);
        const usersPromises = userIds.map(id => 
            getDocs(query(collection(db, 'users'), where('smartschool_id_hash', '==', id)))
        );
        const usersSnapshots = await Promise.all(usersPromises);

        // Maak user map met decrypted namen
        const usersMap = {};
        usersSnapshots.forEach(snap => {
            if (!snap.empty) {
                const userData = snap.docs[0].data();
                const decryptedName = decryptName(userData.encrypted_name, masterKey);
                usersMap[userData.smartschool_id_hash] = {
                    ...userData,
                    decrypted_name: decryptedName
                };
            }
        });

        // Combineer data
        const users = snapshot.docs.map(doc => {
            const whitelistData = doc.data();
            const userData = usersMap[doc.id] || {};
            
            return {
                id: doc.id,
                ...whitelistData,
                nickname: userData.nickname || '',
                decrypted_name: userData.decrypted_name || '[Naam niet beschikbaar]',
                onboarding_complete: userData.onboarding_complete || false
            };
        });

        console.log(`✅ Loaded ${users.length} users for school ${schoolId}`);

        res.status(200).json({ 
            success: true, 
            users: users,
            count: users.length
        });

    } catch (error) {
        console.error('❌ API Error:', error);
        res.status(500).json({ 
            error: 'Fout bij ophalen gebruikers: ' + error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}