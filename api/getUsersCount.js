// api/getUsersCount.js
import { db, verifyToken } from './firebaseAdmin.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const decodedToken = await verifyToken(req.headers.authorization);
        const { schoolId } = req.body;

        if (!schoolId) {
            return res.status(400).json({ error: 'School ID is verplicht' });
        }

        const adminUserSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminUserSnap.exists()) {
            return res.status(403).json({ error: 'Jouw profiel is niet gevonden.' });
        }
        const adminUserProfile = adminUserSnap.data();

        if (adminUserProfile.rol !== 'super-administrator' && adminUserProfile.school_id !== schoolId) {
            return res.status(403).json({ error: 'Toegang geweigerd.' });
        }

        const countQuery = db.collection('toegestane_gebruikers')
                             .where('school_id', '==', schoolId);
                             
        const snapshot = await countQuery.count().get();
        const count = snapshot.data().count;

        // Je hoeft hier geen audit log te schrijven, 
        // want de 'getUsers' call doet dat al.

        res.status(200).json({ success: true, count: count });

    } catch (error) {
        if (error.message.includes('token')) {
            return res.status(401).json({ error: 'Niet geauthenticeerd' });
        }
        console.error('❌ API Error in getUsersCount:', error);
        res.status(500).json({ error: 'Fout bij ophalen telling' });
    }
}