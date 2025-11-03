// functions/src/auth-functions.js
require('dotenv').config();
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const cors = require('cors')({ origin: true });

if (admin.apps.length === 0) {
  admin.initializeApp();
}

exports.smartschoolAuth = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { code, redirect_uri } = req.body;

      if (!code || !redirect_uri) {
        return res.status(400).json({ error: 'Code and redirect_uri zijn verplicht' });
      }

      // 1. Wissel code in voor token
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

      // 2. Haal gebruikersinfo op
      const userResponse = await axios.get(`https://oauth.smartschool.be/Api/V1/userinfo?access_token=${access_token}`);
      const smartschoolUser = userResponse.data;

      // 3. Valideer de minimale data
      if (!smartschoolUser || !smartschoolUser.userID) {
          throw new Error('Ontbrekende userID in Smartschool respons.');
      }

      // Dit is de unieke Smartschool ID (bv. "Vm0cswf4KjN8yRuhBeaZHA==")
      const smartschoolUid = smartschoolUser.userID;
      
      // 4. Maak een Firebase Custom Token aan met de Smartschool ID als de UID
      //    We geven de rest van de info mee als 'claims'
      const customToken = await admin.auth().createCustomToken(smartschoolUid, {
          email: smartschoolUser.email || '',
          displayName: `${smartschoolUser.name} ${smartschoolUser.surname}`
      });
      
      // 5. Stuur het custom token terug naar de frontend
      res.json({ success: true, customToken });

    } catch (error) {
        console.error('Volledige fout in Cloud Function:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'OAuth authenticatie mislukt' });
    }
  });
});