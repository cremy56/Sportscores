// src/components/UniversalLogin.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { signInWithEmailAndPassword, signInWithCustomToken } from 'firebase/auth';
import { initiateSmartschoolLogin, exchangeCodeForToken } from '../utils/smartschoolAuth';
import toast, { Toaster } from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import logoSrc from '../assets/logo.png';

export default function UniversalLogin() {
  const [loading, setLoading] = useState(false);
  const [smartschoolSchools, setSmartschoolSchools] = useState([]);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showSchoolSelector, setShowSchoolSelector] = useState(false);
  
  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadSmartschoolSchools();
    
    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state) {
      handleOAuthCallback(code, state);
    }
  }, []);

  const loadSmartschoolSchools = async () => {
    try {
      const schoolsSnapshot = await getDocs(collection(db, 'scholen'));
      
      const smartschoolSchools = schoolsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(school => school.instellingen?.auth_method === 'smartschool');
      
      setSmartschoolSchools(smartschoolSchools);
      console.log('Loaded Smartschool schools:', smartschoolSchools); // Debug
    } catch (error) {
      console.error('Error loading schools:', error);
      toast.error('Kon scholen niet laden');
    }
  };

  const handleOAuthCallback = async (code, state) => {
    setLoading(true);
    try {
      const tokenData = await exchangeCodeForToken(code, state);
      
      if (tokenData.success) {
        await signInWithCustomToken(auth, tokenData.customToken);
        toast.success('Succesvol ingelogd via Smartschool!');
        
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        throw new Error(tokenData.error || 'Login failed');
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      toast.error(`Login via Smartschool mislukt: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSmartschoolButtonClick = () => {
    if (smartschoolSchools.length === 0) {
      toast.error('Geen scholen gevonden die Smartschool gebruiken');
      return;
    }
    
    if (smartschoolSchools.length === 1) {
      // Direct login als er maar één Smartschool is
      handleSmartschoolLogin(smartschoolSchools[0]);
    } else {
      // Toon school selector popup
      setShowSchoolSelector(true);
    }
  };

  const handleSmartschoolLogin = (school) => {
    setLoading(true);
    try {
      const domain = school.instellingen?.smartschool_domain || school.id;
      console.log('Starting Smartschool login for:', domain); // Debug
      initiateSmartschoolLogin(domain);
    } catch (error) {
      console.error('Error initiating Smartschool login:', error);
      toast.error('Kon Smartschool login niet starten');
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Succesvol ingelogd!');
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Onbekende fout bij inloggen.';
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Verkeerd e-mailadres of wachtwoord.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Ongeldig e-mailadres.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Deze gebruiker is uitgeschakeld.';
          break;
        default:
          errorMessage = 'Fout bij inloggen. Controleer je gegevens of probeer het later opnieuw.';
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f9fafb' }}>
        <div style={{ border: '4px solid rgba(0, 0, 0, 0.1)', width: '36px', height: '36px', borderRadius: '50%', borderLeftColor: '#8b5cf6', animation: 'spin 1s ease infinite' }}></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Toaster position="top-center" />
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-8 sm:p-10 text-center">
        
        {/* Logo */}
        <div className="mb-6">
          <img
            src={logoSrc}
            alt="Sportscores Logo"
            className="h-16 w-auto object-contain mx-auto"
          />
        </div>

        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Sportscores</h1>
        <p className="text-gray-600 mb-8">Welkom terug</p>

        {/* Main Login Options */}
        {!showEmailForm && !showSchoolSelector && (
          <div className="space-y-4">
            {/* Smartschool Login Button */}
            <button
              onClick={handleSmartschoolButtonClick}
              className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200"
            >
              Inloggen via Smartschool
            </button>

            {/* Email Login Button */}
            <button
              onClick={() => setShowEmailForm(true)}
              className="w-full py-4 px-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200"
            >
              Inloggen met E-mail
            </button>
          </div>
        )}

        {/* School Selector Popup */}
        {showSchoolSelector && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Kies je school</h3>
            <div className="space-y-3">
              {smartschoolSchools.map((school) => (
                <button
                  key={school.id}
                  onClick={() => handleSmartschoolLogin(school)}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200"
                >
                  {school.naam}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowSchoolSelector(false)}
              className="w-full py-2 px-4 text-gray-500 hover:text-gray-700 text-sm"
            >
              ← Terug
            </button>
          </div>
        )}

        {/* Email Form */}
        {showEmailForm && (
          <form onSubmit={handleEmailLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-left text-sm font-medium text-gray-700 mb-2">
                E-mailadres
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voornaam.naam@school.be"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-left text-sm font-medium text-gray-700 mb-2">
                Wachtwoord
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Voer uw wachtwoord in"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <EyeIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Inloggen'
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowEmailForm(false)}
              className="w-full py-2 px-4 text-gray-500 hover:text-gray-700 text-sm"
            >
              ← Terug
            </button>
          </form>
        )}

        {/* Register Link - only show when not in forms */}
        {!showEmailForm && !showSchoolSelector && (
          <div className="mt-8 text-sm text-gray-600">
            Nog geen account?{' '}
            <Link to="/register" className="font-semibold text-purple-600 hover:text-purple-700">
              Account aanmaken
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}