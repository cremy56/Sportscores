// src/components/UniversalLogin.jsx
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { signInWithCustomToken } from 'firebase/auth';
import { initiateSmartschoolLogin, exchangeCodeForToken } from '../utils/smartschoolAuth';
import toast, { Toaster } from 'react-hot-toast';
import logoSrc from '../assets/logo.png';

// Loading spinner component
const LoadingSpinner = ({ message }) => (
  <div className="text-center">
    <div style={{ margin: 'auto', border: '4px solid rgba(0, 0, 0, 0.1)', width: '36px', height: '36px', borderRadius: '50%', borderLeftColor: '#8b5cf6', animation: 'spin 1s ease infinite' }}></div>
    <p className="mt-4 text-gray-600">{message}</p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default function UniversalLogin() {
  const [uiState, setUiState] = useState('CHOICE');
  const [smartschoolSchools, setSmartschoolSchools] = useState([]);
  const [loadingMessage, setLoadingMessage] = useState('Laden...');

  const location = useLocation();
  const navigate = useNavigate();

  // Verwerk Smartschool OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state) {
      setUiState('LOADING');
      setLoadingMessage('Bezig met aanmelden via Smartschool...');

      const handleOAuthCallback = async (authCode, authState) => {
        try {
          const tokenData = await exchangeCodeForToken(authCode, authState);
          
          if (tokenData.customToken) {
            await signInWithCustomToken(auth, tokenData.customToken);
            toast.success('Succesvol ingelogd via Smartschool!');
            // onAuthStateChanged in App.jsx handelt navigatie af
          } else {
            throw new Error(tokenData.error || 'Custom token niet ontvangen.');
          }
        } catch (error) {
          console.error('OAuth callback error:', error);
          toast.error(`Login mislukt: ${error.message}`);
          setUiState('CHOICE');
          navigate('/login', { replace: true });
        }
      };

      handleOAuthCallback(code, state);
    }
  }, [location, navigate]);

  // Laad scholen die Smartschool gebruiken
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.has('code') && urlParams.has('state')) {
      return; // Callback wordt al verwerkt
    }

    const loadSmartschoolSchools = async () => {
      try {
        const schoolsQuery = query(
          collection(db, 'scholen'), 
          where('instellingen.auth_method', '==', 'smartschool')
        );
        const schoolsSnapshot = await getDocs(schoolsQuery);
        
        const schoolsList = schoolsSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        
        setSmartschoolSchools(schoolsList);
      } catch (error) {
        console.error('Error loading schools:', error);
        toast.error('Kon de scholen niet laden.');
      }
    };
    loadSmartschoolSchools();
  }, [location.search]);

  const handleSmartschoolButtonClick = () => {
    if (smartschoolSchools.length === 0) {
      toast.error('Geen scholen geconfigureerd voor Smartschool.');
      return;
    }
    // Als er maar 1 school is, direct inloggen
    if (smartschoolSchools.length === 1) {
      handleSmartschoolLogin(smartschoolSchools[0]);
    } else {
      // Anders school laten kiezen
      setUiState('SCHOOL_SELECT');
    }
  };

  const handleSmartschoolLogin = (school) => {
    setUiState('LOADING');
    setLoadingMessage('U wordt doorgestuurd naar Smartschool...');
    const domain = school.instellingen?.smartschool_domain || school.id;
    initiateSmartschoolLogin(domain);
  };

  const renderContent = () => {
    switch (uiState) {
      case 'LOADING':
        return <LoadingSpinner message={loadingMessage} />;
      
      case 'SCHOOL_SELECT':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Kies je school</h3>
            {smartschoolSchools.map((school) => (
              <button
                key={school.id}
                onClick={() => handleSmartschoolLogin(school)}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
              >
                {school.naam}
              </button>
            ))}
            <button
              onClick={() => setUiState('CHOICE')}
              className="w-full py-2 text-gray-500 text-sm"
            >
              ← Terug
            </button>
          </div>
        );

      case 'CHOICE':
      default:
        return (
          <div className="space-y-4">
            <button
              onClick={handleSmartschoolButtonClick}
              className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
            >
              Inloggen via Smartschool
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Toaster position="top-center" />
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-8 sm:p-10 text-center">
        <div className="mb-6">
          <img src={logoSrc} alt="Sportscores Logo" className="h-16 w-auto object-contain mx-auto" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Sportscores</h1>
        <p className="text-gray-600 mb-8">Welkom terug</p>
        {renderContent()}
      </div>
    </div>
  );
}