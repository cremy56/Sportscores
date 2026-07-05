// functions/src/auth-functions.js
// SECRET MANAGER-MIGRATIE (jul 2026): SMARTSCHOOL_CLIENT_ID en _SECRET komen
// niet langer uit .env (die werd bij elke deploy mee geüpload naar de
// source-snapshots in GCS) maar uit Google Secret Manager via defineSecret.
// De OAuth-flow zelf is ongewijzigd.
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const axios = require('axios');
const cors = require('cors')({ origin: true });

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const SMARTSCHOOL_CLIENT_ID = defineSecret('SMARTSCHOOL_CLIENT_ID');
const SMARTSCHOOL_CLIENT_SECRET = defineSecret('SMARTSCHOOL_CLIENT_SECRET');

exports.smartschoolAuth = onRequest(
  { secrets: [SMARTSCHOOL_CLIENT_ID, SMARTSCHOOL_CLIENT_SECRET] },
  (req, res) => {
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
            client_id: SMARTSCHOOL_CLIENT_ID.value(),
            client_secret: SMARTSCHOOL_CLIENT_SECRET.value(),
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
  }
);
