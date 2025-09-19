// src/utils/smartschoolAuth.js
const SMARTSCHOOL_CONFIG = {
  clientId: process.env.REACT_APP_SMARTSCHOOL_CLIENT_ID,
  redirectUri: `${window.location.origin}/auth/smartschool/callback`,
  scope: 'userinfo fulluserinfo'
};

export const initiateSmartschoolLogin = (schoolDomain) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SMARTSCHOOL_CONFIG.clientId,
    redirect_uri: SMARTSCHOOL_CONFIG.redirectUri,
    scope: SMARTSCHOOL_CONFIG.scope,
    state: JSON.stringify({ 
      school: schoolDomain,
      timestamp: Date.now() 
    })
  });

  const authUrl = `https://${schoolDomain}.smartschool.be/oauth?${params.toString()}`;
  console.log('Redirecting to:', authUrl); // Voor debugging
  window.location.href = authUrl;
};

export const exchangeCodeForToken = async (code, state) => {
  try {
    const response = await fetch('/api/auth/smartschool/token', {
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