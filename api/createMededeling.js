// pages/api/createMededeling.js
import { db, verifyToken } from './firebaseAdmin.js';
import { Timestamp } from 'firebase-admin/firestore'; // Gebruik Admin Timestamp

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // === 1. AUTHENTICATIE ===
        const decodedToken = await verifyToken(req.headers.authorization);
        const { type, tekst, zichtbaarheidInDagen } = req.body;

        // === 2. AUTORISATIE (Haal profiel op) ===
        const adminUserSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminUserSnap.exists) {
            return res.status(403).json({ error: 'Jouw gebruikersprofiel is niet gevonden.' });
        }
        const adminProfile = adminUserSnap.data();

        // Check of de rol wel mededelingen mag posten
        if (!['leerkracht', 'super-administrator'].includes(adminProfile.rol)) {
            return res.status(403).json({ error: 'Je hebt geen rechten om dit te doen.' });
        }

        // === 3. VALIDATIE ===
        if (!tekst || !tekst.trim()) {
            return res.status(400).json({ error: 'Bericht mag niet leeg zijn.' });
        }
        if (!['event', 'prestatie'].includes(type)) {
            return res.status(400).json({ error: 'Ongeldig type bericht.' });
        }
        const dagen = parseInt(zichtbaarheidInDagen, 10);
        if (isNaN(dagen) || dagen < 1 || dagen > 30) {
            return res.status(400).json({ error: 'Ongeldige zichtbaarheid (1-30 dagen).' });
        }

        // === 4. DATA VERWERKEN (Veilig) ===
        // Gebruik server-side data voor security-gevoelige velden
        const maakDatum = new Date();
        const vervalDatum = new Date();
        vervalDatum.setDate(maakDatum.getDate() + dagen);

        const mededelingData = {
            school_id: adminProfile.school_id, // Van server-profiel
            auteurNaam: adminProfile.naam,      // Van server-profiel
            type: type,                         // Van client
            tekst: tekst.trim(),                // Van client
            maakDatum: Timestamp.fromDate(maakDatum),
            vervalDatum: Timestamp.fromDate(vervalDatum)
        };

        await db.collection('mededelingen').add(mededelingData);

        res.status(200).json({ success: true, message: 'Bericht succesvol geplaatst!' });

    } catch (error) {
        if (error.message.includes('token')) {
            return res.status(401).json({ error: 'Niet geauthenticeerd: ' + error.message });
        }
        console.error('❌ API Error in createMededeling:', error);
        res.status(500).json({ error: 'Fout bij opslaan van mededeling' });
    }
}