// api/getUsers.js - AANGEPAST VOOR GOOGLE SECRET MANAGER
import { db } from './firebaseAdmin.js';
import CryptoJS from 'crypto-js';
import { getMasterKey } from './keyManager.js'; // <-- NIEUWE IMPORT

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

        // Haal master key veilig op uit Google Secret Manager
        const masterKey = await getMasterKey();
        
        if (!masterKey) {
            console.error(`❌ Kon master key niet laden`);
            return res.status(500).json({ error: 'Server configuratie fout' });
        }

        // Query toegestane_gebruikers
        let collectionRef = db.collection('toegestane_gebruikers');
        let q = collectionRef.where('school_id', '==', schoolId);

        if (filterKlas) {
            q = q.where('klas', '==', filterKlas);
        }

        if (filterRol) {
            q = q.where('rol', '==', filterRol);
        }

        const snapshot = await q.get();
        
        // Process users
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