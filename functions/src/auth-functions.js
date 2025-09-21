// functions/src/auth-functions.js
require('dotenv').config();
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const cors = require('cors')({ origin: true });

if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

exports.smartschoolAuth = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { code, state, redirect_uri } = req.body;
      
      let stateData;
      try {
        stateData = JSON.parse(state);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid state parameter' });
      }

      const schoolDomain = stateData.schoolDomain;
      console.log('School domain from state:', schoolDomain);
      console.log('Full state data:', stateData);
      
      if (!schoolDomain) {
        return res.status(400).json({ error: 'School domain missing in state' });
      }
      
      // Stap 1: Wissel code in voor token (dit blijft via het centrale eindpunt)
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
      
      // ========================= CORRECTIE HIER =========================
      // Stap 2: Haal gebruikersinfo op via het SPECIFIEKE schooldomein.
      // Stap 2: Haal gebruikersinfo op via het CENTRALE OAuth eindpunt
const constructedUrl = `https://oauth.smartschool.be/Api/V1/userinfo?access_token=${access_token}`;
console.log('Constructed URL:', constructedUrl);

const userResponse = await axios.get(constructedUrl);

const smartschoolUser = userResponse.data;
console.log('Smartschool API response:', JSON.stringify(smartschoolUser, null, 2));

// Update field validation to match actual API response
if (!smartschoolUser.name || !smartschoolUser.surname || !smartschoolUser.userID) {
    console.log('Missing fields - name:', !!smartschoolUser.name, 'surname:', !!smartschoolUser.surname, 'userID:', !!smartschoolUser.userID);
    throw new Error('Ontbrekende gebruikersgegevens in Smartschool respons.');
}

const fullName = `${smartschoolUser.name} ${smartschoolUser.surname}`;
const schoolId = schoolDomain;

// First: Try to find user by name + school (no birth date in initial query)
const userQuery = await db.collection('toegestane_gebruikers')
  .where('naam', '==', fullName)
  .where('school_id', '==', schoolId)
  .limit(1)
  .get();

if (userQuery.empty) {
  return res.status(404).json({ error: 'Je account is niet gevonden. Neem contact op met je beheerder.' });
}

const userDoc = userQuery.docs[0];
const userData = userDoc.data();

// Optional: Add Smartschool data to the document for future reference
await userDoc.ref.update({
  smartschool_username: smartschoolUser.username,
  smartschool_user_id: smartschoolUser.userID,
  last_smartschool_login: admin.firestore.FieldValue.serverTimestamp()
});

const customToken = await admin.auth().createCustomToken(userDoc.id);
res.json({ success: true, customToken });

    } catch (error) {
        console.error('Volledige fout in Cloud Function:', error);
        res.status(500).json({ error: 'OAuth authenticatie mislukt' });
    }
  });
});