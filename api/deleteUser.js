// api/deleteUser.js
import { db, verifyToken } from './firebaseAdmin.js';

export default async function handler(req, res) {

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // === 1. AUTHENTICATIE ===
        const decodedToken = await verifyToken(req.headers.authorization);
        const { userId } = req.body;

        // === 2. VALIDATIE ===
        if (!userId) {
            return res.status(400).json({ error: 'userId is verplicht' });
        }

        // === 3. AUTORISATIE (TODO) ===
        // TODO: Controleer of de ingelogde admin (decodedToken.uid)
        // de rechten heeft om deze 'userId' te verwijderen.
        
        console.log(`🗑️ [${decodedToken.email}] Deleting user ${userId.substring(0, 16)}...`);

        // === 4. DATA VERWERKEN ===
        // 1. Verwijder uit whitelist
        await db.collection('toegestane_gebruikers').doc(userId).delete();

        // 2. Controleer en verwijder 'users' profiel (indien het bestaat)
        const userProfileRef = db.collection('users').doc(userId);
        const userProfileSnap = await userProfileRef.get();

        if (userProfileSnap.exists) {
            await userProfileRef.delete();
            console.log('User profiel (uit users collectie) ook verwijderd.');
        }

        console.log(`✅ User updated successfully`);

        res.status(200).json({ 
            success: true, 
            message: 'Gebruiker succesvol verwijderd'
        });

    } catch (error) {
        if (error.message.includes('token')) {
            return res.status(401).json({ error: 'Niet geauthenticeerd: ' + error.message });
        }
        console.error('❌ API Delete Error:', error);
        res.status(500).json({ 
            error: 'Fout bij verwijderen: ' + error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}