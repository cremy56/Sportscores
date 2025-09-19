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

      const schoolDomain = stateData.school;
      
      // STAP 1: Exchange authorization code for access token
      console.log(`Exchanging code for token with ${schoolDomain}.smartschool.be`);
      const tokenResponse = await axios.post(`https://${schoolDomain}.smartschool.be/oauth/token`, {
        grant_type: 'authorization_code',
        client_id: process.env.SMARTSCHOOL_CLIENT_ID,
        client_secret: process.env.SMARTSCHOOL_CLIENT_SECRET,
        code,
        redirect_uri
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token } = tokenResponse.data;
      console.log('Access token received from Smartschool');
      
      // STAP 2: Get user info from Smartschool
      const userResponse = await axios.get(`https://${schoolDomain}.smartschool.be/api/v1/user`, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });

      const smartschoolUser = userResponse.data;
      console.log('Smartschool user info received:', {
        firstName: smartschoolUser.firstName,
        lastName: smartschoolUser.lastName,
        birthDate: smartschoolUser.birthDate
      });
      
      // STAP 3: Zoek school in Firestore
      const schoolId = schoolDomain.replace('-', '_');
      const schoolRef = await db.collection('scholen').doc(schoolId).get();
      
      if (!schoolRef.exists) {
        console.error('School not found in database:', schoolId);
        return res.status(404).json({ error: 'School niet gevonden' });
      }
      
      const schoolData = schoolRef.data();
      
      // Controleer auth method
      if (schoolData.instellingen?.auth_method !== 'smartschool') {
        return res.status(400).json({ 
          error: 'School gebruikt geen Smartschool authenticatie' 
        });
      }

      // STAP 4: Zoek gebruiker in toegestane_gebruikers
      const fullName = `${smartschoolUser.firstName} ${smartschoolUser.lastName}`;
      const birthDate = new Date(smartschoolUser.birthDate).toISOString().split('T')[0];
      
      console.log('Searching for user:', { fullName, birthDate, schoolId });
      
      const userQuery = await db.collection('toegestane_gebruikers')
        .where('naam', '==', fullName)
        .where('geboortedatum', '==', birthDate)
        .where('school_id', '==', schoolId)
        .get();

      if (userQuery.empty) {
        console.error('User not found in database:', { fullName, birthDate, schoolId });
        return res.status(404).json({ 
          error: 'Gebruiker niet gevonden',
          details: 'Geen match gevonden op basis van naam, geboortedatum en school'
        });
      }

      const userDoc = userQuery.docs[0];
      const userData = userDoc.data();
      
      console.log('User found in database:', userData.naam);
      
      // STAP 5: Creëer Firebase custom token
      const customToken = await admin.auth().createCustomToken(userDoc.id, {
        smartschool_id: smartschoolUser.id,
        email: userData.email,
        rol: userData.rol,
        school_id: userData.school_id,
        auth_method: 'smartschool'
      });

      console.log('Firebase custom token created successfully');

      res.json({
        success: true,
        customToken,
        user: {
          id: userDoc.id,
          naam: userData.naam,
          email: userData.email,
          rol: userData.rol,
          school_id: userData.school_id
        }
      });

    } catch (error) {
      console.error('Smartschool OAuth error:', error.response?.data || error.message);
      res.status(500).json({ 
        error: 'OAuth authentication failed',
        details: error.response?.data?.error_description || error.message 
      });
    }
  });
});