// src/pages/Register.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from './firebase';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';

export default function Register() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Vul uw e-mailadres in.');
      return;
    }
    setLoading(true);

    // Controleer of het e-mailadres in de 'toegestane_gebruikers' collectie staat.
    const allowedUserRef = doc(db, 'toegestane_gebruikers', email);
    const allowedUserSnap = await getDoc(allowedUserRef);

    if (!allowedUserSnap.exists()) {
      toast.error('Dit e-mailadres is niet bekend in ons systeem.');
      setLoading(false);
      return;
    }

    // E-mailadres is bekend, verstuur de inloglink.
    const actionCodeSettings = {
      url: window.location.origin,
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      toast.success('Registratielink is naar uw e-mailadres verzonden!');
    } catch (error) {
      console.error(error);
      toast.error(`Fout: ${error.message}`);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
      <Toaster position="top-center" />
      
      <div className="w-full max-w-md bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
        {/* Logo en Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-br from-purple-100 to-blue-100 p-4 rounded-2xl mb-4 shadow-lg">
            <img
              src="/logo.png"
              alt="Sportscores Logo"
              className="h-12 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            KA Beveren
          </h1>
          <p className="text-gray-600 text-center text-sm">
            Maak je account aan voor Sportscores
          </p>
        </div>

        {/* Register Form */}
        <form className="space-y-6" onSubmit={handleRegister}>
          <div>
            <label htmlFor="email-address" className="block text-sm font-semibold text-gray-700 mb-2">
              E-mailadres
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 placeholder-gray-400 text-gray-900"
              placeholder="voornaam.naam@school.be"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-2xl hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Bezig...
              </div>
            ) : (
              'Registratielink Verzenden'
            )}
          </button>
        </form>

        {/* Info Text */}
        <div className="mt-6 p-4 bg-blue-50/60 rounded-2xl border border-blue-200/30">
          <p className="text-sm text-blue-800 text-center">
            📧 We sturen een veilige registratielink naar je e-mailadres van de school
          </p>
        </div>

        {/* Back to Login */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white/80 text-gray-500 font-medium">
              Al een account?
            </span>
          </div>
        </div>

        <Link
          to="/"
          className="w-full flex justify-center items-center py-4 px-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300/30 focus:ring-offset-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-white/60"
        >
          Terug naar inloggen
        </Link>
      </div>
    </div>
  );
}