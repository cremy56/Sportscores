// src/Login.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import toast, { Toaster } from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import logoSrc from './assets/logo.png'; // Zorg dat deze import bovenaan staat

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
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

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Toaster position="top-center" />
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-8 sm:p-10 text-center">
        
        {/* --- AANGEPAST: Logo direct in de header, buiten de card-div --- */}
        <div className="mb-6">
          <img
            src={logoSrc}
            alt="Sportscores Logo"
            className="h-16 w-auto object-contain mx-auto" // mx-auto om te centreren
          />
        </div>

        {/* --- AANGEPAST: Titel en subtitel --- */}
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">KA Beveren</h1>
        <p className="text-gray-600 mb-8">Welkom terug bij Sportscores</p>

        <form onSubmit={handleLogin} className="space-y-6">
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
        </form>

        <div className="mt-8 text-sm text-gray-600">
          Nog geen account?{' '}
          <Link to="/register" className="font-semibold text-purple-600 hover:text-purple-700">
            Account aanmaken
          </Link>
        </div>
      </div>
    </div>
  );
}