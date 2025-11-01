// api/getUsers.js - SIMPLIFIED VERSION
// Reads encrypted_name directly from toegestane_gebruikers
import { db } from './firebaseAdmin.js';
import CryptoJS from 'crypto-js';

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
        const { schoolId, filterKlas, filterRol } = req.body;

        if (!schoolId) {
            return res.status(400).json({ error: 'School ID is verplicht' });
        }

        // Haal master key op
        const schoolKey = schoolId.toUpperCase().replace(/_/g, '');
        const envVarName = `MASTER_KEY_${schoolKey}`;
        let masterKey = process.env[envVarName] || process.env.SCHOOL_MASTER_KEY;
        
        if (!masterKey) {
            console.error(`❌ Geen master key voor ${envVarName}`);
            return res.status(500).json({ error: 'Server configuratie fout' });
        }

        // Query toegestane_gebruikers - ALLES IN 1 QUERY!
        let collectionRef = db.collection('toegestane_gebruikers');
        let q = collectionRef.where('school_id', '==', schoolId);

        if (filterKlas) {
            q = q.where('klas', '==', filterKlas);
        }

        if (filterRol) {
            q = q.where('rol', '==', filterRol);
        }

        const snapshot = await q.get(); // Gebruik .get() in plaats van getDocs(q)
        // =============================
        
        // Process users - decrypt naam direct uit toegestane_gebruikers
        const users = snapshot.docs.map(doc => {
            const data = doc.data();
            
            // Decrypt naam (nu in zelfde document!)
            const decryptedName = data.encrypted_name 
                ? decryptName(data.encrypted_name, masterKey)
                : (data.naam || '[Naam ontbreekt]'); // Fallback voor oude data
            
            return {
                id: doc.id,
                ...data,
                decrypted_name: decryptedName
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