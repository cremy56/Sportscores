// src/Login.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import toast, { Toaster } from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Functie voor de wachtwoord login
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Vul zowel e-mailadres als wachtwoord in.');
      return;
    }
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Succesvol ingelogd!');
    } catch (error) {
      console.error(error);
      toast.error('Ongeldige inloggegevens.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Toaster position="top-center" />
      
      <div className="w-full max-w-sm sm:max-w-md md:max-w-3xl lg:max-w-4xl xl:max-w-5xl p-8 space-y-8 bg-white rounded-2xl shadow-lg">
        <div>
          <img
            src="/logo.png"
            alt="Sportscores Logo"
            className="mx-auto h-16 w-auto object-contain"
          />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Inloggen op uw account
          </h2>
        </div>

        <div>
          <form className="space-y-6" onSubmit={handlePasswordLogin}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-2">
                  E-mailadres
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  placeholder="voornaam.naam@school.be"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Wachtwoord
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  placeholder="Voer uw wachtwoord in"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Bezig met inloggen...
                </div>
              ) : (
                'Inloggen'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">
                Nog geen account?
              </span>
            </div>
          </div>

          {/* Registreren knop */}
          <Link
            to="/register"
            className="w-full flex justify-center items-center py-3 px-4 border-2 border-purple-600 text-purple-600 font-semibold rounded-xl hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            Account aanmaken
          </Link>
        </div>
      </div>
    </div>
  );
}