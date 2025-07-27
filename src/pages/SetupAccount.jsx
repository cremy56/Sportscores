// src/pages/SetupAccount.jsx
import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

// Een aparte component voor de popup
function SessionExpiredModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border border-gray-200">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
          <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Sessie Verlopen</h3>
        <div className="mt-2 text-sm text-gray-600">
          <p>Uit veiligheidsoverwegingen is uw inloglink verlopen. Vraag alstublieft een nieuwe registratielink aan.</p>
        </div>
        <div className="mt-6">
          <button
            type="button"
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-2xl hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:ring-offset-2 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            onClick={onClose}
          >
            Nieuwe link aanvragen
          </button>
        </div>
      </div>
    </div>
  );
}


export default function SetupAccount() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // State om de zichtbaarheid van de popup te beheren
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);

  useEffect(() => {
    if (auth.currentUser) {
      setUserEmail(auth.currentUser.email);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('Wachtwoord moet minstens 6 tekens lang zijn.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('De wachtwoorden komen niet overeen.');
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Geen gebruiker gevonden.");

      await updatePassword(user, password);
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        onboarding_complete: true
      });

      toast.success('Uw account is succesvol ingesteld!');
      navigate('/');

    } catch (error) {
      // Verbeterde foutafhandeling: toon de popup bij de specifieke fout
      if (error.code === 'auth/requires-recent-login') {
        setShowSessionExpiredModal(true);
      } else {
        toast.error(`Fout: ${error.message}`);
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showSessionExpiredModal && <SessionExpiredModal onClose={() => navigate('/register')} />}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Toaster position="top-center" />
        
        <div className="w-full max-w-md bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 p-4 rounded-2xl mb-4 shadow-lg">
              <img
                src="/logo.png"
                alt="Sportscores Logo"
                className="h-12 w-auto object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Account Instellen
            </h1>
            <p className="text-gray-600 text-center text-sm">
              Welkom <span className="font-semibold text-purple-600">{userEmail}</span>!<br />
              Stel een wachtwoord in om uw account te activeren.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Nieuw Wachtwoord
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 placeholder-gray-400 text-gray-900 pr-10"
                  placeholder="Voer uw nieuwe wachtwoord in"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-purple-600"
                >
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimaal 6 tekens</p>
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                Bevestig Wachtwoord
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 placeholder-gray-400 text-gray-900 pr-10"
                  placeholder="Herhaal uw wachtwoord"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-purple-600"
                >
                  {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-2xl hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Account activeren...
                </div>
              ) : (
                'Account Activeren'
              )}
            </button>
          </form>

          <div className="mt-6 p-4 bg-green-50/60 rounded-2xl border border-green-200/30">
            <p className="text-xs text-green-800 text-center">
              🔒 Uw wachtwoord wordt veilig opgeslagen en gecodeerd
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
