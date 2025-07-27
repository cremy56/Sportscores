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
      // Stuur de gebruiker terug naar de hoofdpagina na verificatie.
      // De app zal de login detecteren en de juiste pagina tonen.
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
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Toaster position="top-center" />
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg">
        <div>
           <img
                src="/logo.png"
                alt="Sportscores Logo"
                className="mx-auto h-16 w-auto object-contain"
            />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Registeren bij sportscores
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          <div className="rounded-md shadow-sm">
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              placeholder="E-mailadres"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-400"
            >
              {loading ? 'Bezig...' : 'Verzenden'}
            </button>
          </div>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          We e-mailen een link op je emailadres van de school.
        </p>
        <div className="text-center mt-4">
            <Link to="/login" className="font-medium text-purple-600 hover:text-purple-500">
                Terug naar inloggen
            </Link>
        </div>
      </div>
    </div>
  );
}
