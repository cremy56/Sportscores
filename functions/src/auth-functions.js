// functions/src/auth-functions.js
require('dotenv').config();
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const cors = require('cors')({ origin: true });

// Initialiseer Firebase Admin. Zorg dat dit slechts één keer gebeurt.
// Als je al een `index.js` hebt die dit doet, is het hier niet nodig.
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

exports.smartschoolAuth = functions.https.onRequest((req, res) => {
  // Gebruik CORS om de aanvraag vanaf je web-app toe te staan.
  cors(req, res, async () => {
    // Accepteer alleen POST-requests voor de veiligheid.
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { code, state, redirect_uri } = req.body;
      
      let stateData;
      try { stateData = JSON.parse(state); } 
      catch (e) { return res.status(400).json({ error: 'Invalid state' }); }

      const schoolDomain = stateData.schoolDomain;
      if (!schoolDomain) {
        return res.status(400).json({ error: 'School domain missing in state' });
      }
      
      // Stap 1: Wissel code in voor token via het centrale eindpunt.
      const tokenResponse = await axios.post(`https://oauth.smartschool.be/OAuth/index/token`, 
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: process.env.SMARTSCHOOL_CLIENT_ID,
          client_secret: process.env.SMARTSCHOOL_CLIENT_SECRET,
          code,
          redirect_uri
        }).toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token } = tokenResponse.data;
      
      // Stap 2: Haal gebruikersinfo op via het centrale API-eindpunt.
      const userResponse = await axios.get(`https://api.smartschool.be/v3/userinfo`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      const smartschoolUser = userResponse.data;
      
      const schoolId = schoolDomain;
      
      // Stap 3: Zoek gebruiker in 'toegestane_gebruikers'
      const fullName = `${smartschoolUser.voornaam} ${smartschoolUser.naam}`;
      const birthDateTimestamp = admin.firestore.Timestamp.fromDate(new Date(smartschoolUser.geboortedatum));

      const userQuery = await db.collection('toegestane_gebruikers')
        .where('naam', '==', fullName)
        .where('geboortedatum', '==', birthDateTimestamp)
        .where('school_id', '==', schoolId)
        .get();

      if (userQuery.empty) {
        return res.status(404).json({ error: 'Gebruiker niet gevonden' });
      }

      const userDoc = userQuery.docs[0];
      
      // Stap 4: Creëer Firebase custom token
      const customToken = await admin.auth().createCustomToken(userDoc.id);

      res.json({ success: true, customToken });

    } catch (error) {
        console.error('Smartschool OAuth error:', error.response?.data || error.message);
        res.status(500).json({ error: 'OAuth authenticatie mislukt' });
    }
  });
});