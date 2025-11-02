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