// src/components/UniversalLogin.jsx
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { signInWithEmailAndPassword, signInWithCustomToken } from 'firebase/auth';
import { initiateSmartschoolLogin, exchangeCodeForToken } from '../utils/smartschoolAuth';
import toast, { Toaster } from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import logoSrc from '../assets/logo.png';

// Een simpele laad-indicator component
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
  
  // State voor het e-mailformulier
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Effect 1: Detecteer en handel de Smartschool callback af
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    // Als de URL 'code' en 'state' bevat, is het een callback.
    if (code && state) {
      setUiState('LOADING');
      setLoadingMessage('Bezig met aanmelden via Smartschool...');

      const handleOAuthCallback = async (authCode, authState) => {
        try {
          const tokenData = await exchangeCodeForToken(authCode, authState);
          
          if (tokenData.customToken) {
            await signInWithCustomToken(auth, tokenData.customToken);
            toast.success('Succesvol ingelogd via Smartschool!');
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

  // Effect 2: Laad de scholen, maar SLA DIT OVER als we een callback afhandelen.
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.has('code') && urlParams.has('state')) {
      // Dit is een callback, dus we hoeven de scholen niet te laden.
      return; 
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
  }, [location.search]); // Afhankelijk van de URL-zoekparameters

const handleSmartschoolButtonClick = () => {
    if (smartschoolSchools.length === 0) {
      toast.error('Geen scholen geconfigureerd voor Smartschool.');
      return;
    }
    if (smartschoolSchools.length === 1) {
      handleSmartschoolLogin(smartschoolSchools[0]);
    } else {
      setUiState('SCHOOL_SELECT');
    }
  };

  const handleSmartschoolLogin = (school) => {
    setUiState('LOADING');
    setLoadingMessage('U wordt doorgestuurd naar Smartschool...');
    const domain = school.instellingen?.smartschool_domain || school.id;
    initiateSmartschoolLogin(domain);
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setUiState('LOADING');
    setLoadingMessage('Bezig met aanmelden...');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Succesvol ingelogd!');
    } catch (error) {
      toast.error('Verkeerd e-mailadres of wachtwoord.');
      setUiState('EMAIL_FORM');
    }
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
              <button key={school.id} onClick={() => handleSmartschoolLogin(school)} className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl">
                {school.naam}
              </button>
            ))}
            <button onClick={() => setUiState('CHOICE')} className="w-full py-2 text-gray-500 text-sm">← Terug</button>
          </div>
        );

      case 'EMAIL_FORM':
        return (
          <>
            <button onClick={() => setUiState('CHOICE')} className="text-sm text-purple-600 mb-4 text-left w-full">← Andere inlogmethode</button>
            <form onSubmit={handleEmailLogin} className="space-y-6 text-left">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">E-mailadres</label>
                <input type="email" id="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Wachtwoord</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} id="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl pr-12" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <button type="submit" className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gray-800">Inloggen</button>
            </form>
          </>
        );

      case 'CHOICE':
      default:
        return (
          <div className="space-y-4">
            <button onClick={handleSmartschoolButtonClick} className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl">
              Inloggen via Smartschool
            </button>
            <button onClick={() => setUiState('EMAIL_FORM')} className="w-full py-4 px-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50">
              Inloggen met E-mail
            </button>
            <div className="mt-8 text-sm text-gray-600">
              Nog geen account?{' '}
              <Link to="/register" className="font-semibold text-purple-600 hover:text-purple-700">
                Account aanmaken
              </Link>
            </div>
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