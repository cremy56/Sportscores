// api/getUsers.js
import { db, verifyToken } from './firebaseAdmin.js'; // <-- AANGEPAST
import CryptoJS from 'crypto-js';
import { getMasterKey } from './keyManager.js'; // <-- AANGEPAST

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
        // === 1. AUTHENTICATIE ===
        // Controleer of de gebruiker is ingelogd
        const decodedToken = await verifyToken(req.headers.authorization);
        
        const { schoolId, filterKlas, filterRol } = req.body;

        if (!schoolId) {
            return res.status(400).json({ error: 'School ID is verplicht' });
        }
        
        // === 2. AUTORISATIE (Optioneel maar aanbevolen) ===
        // TODO: Controleer of decodedToken.uid (de ingelogde gebruiker) 
        // toegang heeft tot dit 'schoolId'.
        // Voor nu gaan we verder.

        // === 3. HAAL SLEUTEL OP ===
        const masterKey = await getMasterKey();
        
        if (!masterKey) {
            return res.status(500).json({ error: 'Server configuratie fout (key)' });
        }

        // === 4. VOER QUERY UIT ===
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

        console.log(`✅ [${decodedToken.email}] Loaded ${users.length} users for school ${schoolId}`);

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