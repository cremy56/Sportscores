// src/utils/smartschoolAuth.js
const SMARTSCHOOL_CONFIG = {
  clientId: 'abc833209402', 
  // BELANGRIJK: Zorg dat DIT de URI is die je bij Smartschool hebt geregistreerd!
  redirectUri: 'Https://www.sportscores.be/auth/smartschool/callback', 
  scope: 'userinfo fulluserinfo' // Voeg 'fulluserinfo' toe voor geboortedatum
};

export const initiateSmartschoolLogin = (schoolDomain) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SMARTSCHOOL_CONFIG.clientId,
    redirect_uri: SMARTSCHOOL_CONFIG.redirectUri,
    scope: SMARTSCHOOL_CONFIG.scope,
    // De 'state' parameter geeft het schooldomein veilig door aan onze backend.
    state: JSON.stringify({ 
      schoolDomain: schoolDomain, // bv. "kabeveren"
      timestamp: Date.now() 
    })
  });

  // De URL wijst nu naar het CORRECTE, CENTRALE Smartschool OAuth eindpunt.
  const authUrl = `https://oauth.smartschool.be/OAuth/index/authorize?${params.toString()}`;
  
  console.log('Redirecting to:', authUrl);
  window.location.href = authUrl;
};

export const exchangeCodeForToken = async (code, state) => {
  try {
    const response = await fetch('https://us-central1-sportscore-6774d.cloudfunctions.net/smartschoolAuth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code,
        state,
        redirect_uri: SMARTSCHOOL_CONFIG.redirectUri
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Token exchange failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
};