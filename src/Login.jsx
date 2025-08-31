// src/Login.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import toast, { Toaster } from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'; // Importeer de iconen

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // State voor wachtwoord zichtbaarheid

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
      <Toaster position="top-center" />
      
      <div className="w-full max-w-md bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-br from-purple-100 to-blue-100 p-4 rounded-2xl mb-4 shadow-lg">
            <img
              src="/src/assets/logo.png"
              alt="Sportscores Logo"
              className="h-12 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            KA Beveren
          </h1>
          <p className="text-gray-600 text-center text-sm">
            Welkom terug bij Sportscores
          </p>
        </div>

        <form className="space-y-6" onSubmit={handlePasswordLogin}>
          <div className="space-y-4">
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
            
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Wachtwoord
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'} // Verander type gebaseerd op state
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 placeholder-gray-400 text-gray-900 pr-10"
                  placeholder="Voer uw wachtwoord in"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-purple-600"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
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
                Bezig met inloggen...
              </div>
            ) : (
              'Inloggen'
            )}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
          <div className="relative flex justify-center text-sm"><span className="px-4 bg-white/80 text-gray-500 font-medium">Nog geen account?</span></div>
        </div>

        <Link
          to="/register"
          className="w-full flex justify-center items-center py-4 px-4 border-2 border-purple-600 text-purple-600 font-semibold rounded-2xl hover:bg-purple-50 hover:border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:ring-offset-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-white/60"
        >
          Account aanmaken
        </Link>
      </div>
    </div>
  );
}
