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
      
      // Stap 1: Valideer de 'state' parameter die terugkomt van Smartschool.
      // Dit is een cruciale veiligheidsstap om CSRF-aanvallen te voorkomen.
      let stateData;
      try {
        stateData = JSON.parse(state);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid state parameter' });
      }
      // Controleer of de state niet te oud is (bv. maximaal 10 minuten).
      if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
        return res.status(400).json({ error: 'State expired' });
      }

      // Haal het schooldomein op dat we in de state hadden meegestuurd.
      const schoolDomain = stateData.school;
      if (!schoolDomain) {
        return res.status(400).json({ error: 'School domain missing in state' });
      }
      
      // Stap 2: Wissel de ontvangen 'code' in voor een 'access token'.
      // Dit gebeurt via een beveiligde server-naar-server call naar het CENTRALE Smartschool eindpunt.
      const tokenResponse = await axios.post('https://oauth.smartschool.be/OAuth/index/token', 
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: process.env.SMARTSCHOOL_CLIENT_ID, // Je geheime Client ID
          client_secret: process.env.SMARTSCHOOL_CLIENT_SECRET, // Je geheime Client Secret
          code,
          redirect_uri
        }).toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token } = tokenResponse.data;
      
      // Stap 3: Gebruik het 'access token' om de gebruikersinformatie op te halen.
      // Dit gebeurt via het CENTRALE API-eindpunt van Smartschool.
      const userResponse = await axios.get('https://oauth.smartschool.be/Api/V1/userinfo', {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      const smartschoolUser = userResponse.data;
      
      // Stap 4: Zoek de gebruiker in je eigen 'toegestane_gebruikers' database.
      // We gebruiken de naam, geboortedatum en school_id om een unieke match te vinden.
      const schoolId = schoolDomain; // We gaan ervan uit dat het domein gelijk is aan de school_id.
      const fullName = `${smartschoolUser.voornaam} ${smartschoolUser.naam}`;
      const birthDateTimestamp = admin.firestore.Timestamp.fromDate(new Date(smartschoolUser.geboortedatum));

      const userQuery = await db.collection('toegestane_gebruikers')
        .where('naam', '==', fullName)
        .where('geboortedatum', '==', birthDateTimestamp)
        .where('school_id', '==', schoolId)
        .get();

      if (userQuery.empty) {
        return res.status(404).json({ error: 'Gebruiker niet gevonden of gegevens komen niet overeen.' });
      }

      const userDoc = userQuery.docs[0];
      
      // Stap 5: Maak een Firebase Custom Token aan.
      // Hiermee kan de frontend inloggen bij Firebase als deze specifieke gebruiker.
      // De UID van het token is het e-mailadres (de document ID van toegestane_gebruikers).
      const customToken = await admin.auth().createCustomToken(userDoc.id);

      // Stuur het custom token terug naar de frontend.
      res.json({ success: true, customToken });

    } catch (error) {
        console.error('Smartschool OAuth error:', error.response?.data || error.message);
        res.status(500).json({ error: 'OAuth authenticatie mislukt' });
    }
  });
});