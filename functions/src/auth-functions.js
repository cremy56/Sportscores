// functions/src/auth-functions.js
require('dotenv').config();
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const cors = require('cors')({ origin: true });

const db = admin.firestore();

// Smartschool OAuth token exchange
exports.smartschoolAuth = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { code, state, redirect_uri } = req.body;
      
      console.log('Smartschool OAuth token exchange started');
      
      // Verifieer state parameter
      let stateData;
      try {
        stateData = JSON.parse(state);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid state parameter' });
      }
      
      const timeDiff = Date.now() - stateData.timestamp;
      if (timeDiff > 10 * 60 * 1000) { // 10 minuten timeout
        return res.status(400).json({ error: 'State expired' });
      }

      const schoolDomain = stateData.schoolDomain;
      if (!schoolDomain) {
        return res.status(400).json({ error: 'School domain missing in state' });
      }
      
      // STAP 1: Exchange authorization code for access token
      console.log(`Exchanging code for token with ${schoolDomain}.smartschool.be`);
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
      
      // STAP 2: Haal gebruikersinfo op via het centrale API-eindpunt
      // De documentatie specificeert dit eindpunt voor API-calls.
      //
      const userResponse = await axios.get(`https://api.smartschool.be/v3/userinfo`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });

      const smartschoolUser = userResponse.data;
      
      // STAP 3: Converteer domein naar school_id voor de database (bv. "kabeveren" -> "ka_beveren")
      const schoolId = schoolDomain; // Pas dit aan indien nodig

      // STAP 4: Zoek gebruiker in 'toegestane_gebruikers'
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
      const userData = userDoc.data();
      
      // STAP 5: Creëer Firebase custom token
      // We gebruiken het e-mailadres uit toegestane_gebruikers als de unieke ID voor het token.
      const customToken = await admin.auth().createCustomToken(userDoc.id);

      res.json({ success: true, customToken });

    } catch (error) {
        console.error('Smartschool OAuth error:', error.response?.data || error.message);
        res.status(500).json({ error: 'OAuth authenticatie mislukt' });
    }
  });
});
