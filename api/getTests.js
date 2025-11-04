// pages/api/getTests.js
import { db, verifyToken } from './firebaseAdmin.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // === 1. AUTHENTICATIE ===
        const decodedToken = await verifyToken(req.headers.authorization);

        // === 2. AUTORISATIE (Haal school_id van de gebruiker) ===
        // We halen de school_id van de server, niet van de client,
        // zodat een gebruiker nooit data van een andere school kan opvragen.
        const adminUserSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminUserSnap.exists) {
            return res.status(403).json({ error: 'Jouw gebruikersprofiel is niet gevonden.' });
        }
        const schoolId = adminUserSnap.data().school_id;

        if (!schoolId) {
            return res.status(400).json({ error: 'Geen school_id aan jouw profiel gekoppeld.' });
        }

        // === 3. DATA OPHALEN (Logica uit Highscores.jsx) ===
        const testenRef = db.collection('testen');
        const q = testenRef
            .where('school_id', '==', schoolId)
            .where('is_actief', '==', true)
            .orderBy('naam');
        
        const querySnapshot = await q.get();
        const testenData = querySnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        }));

        res.status(200).json({ success: true, testen: testenData });

    } catch (error) {
        if (error.message.includes('token')) {
            return res.status(401).json({ error: 'Niet geauthenticeerd: ' + error.message });
        }
        console.error('❌ API Error in getTests:', error);
        res.status(500).json({ error: 'Fout bij ophalen van testen' });
    }
}