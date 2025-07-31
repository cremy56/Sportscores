// src/pages/WachtwoordWijzigen.jsx
import { useState } from 'react';
import { auth } from '../firebase';
import { updatePassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

export default function WachtwoordWijzigen() {
  const [nieuwWachtwoord, setNieuwWachtwoord] = useState('');
  const [bevestigWachtwoord, setBevestigWachtwoord] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (nieuwWachtwoord !== bevestigWachtwoord) {
      toast.error('Wachtwoorden komen niet overeen.');
      return;
    }

    if (nieuwWachtwoord.length < 6) {
      toast.error('Wachtwoord moet minstens 6 tekens bevatten.');
      return;
    }

    if (!auth.currentUser) {
      toast.error('Je moet ingelogd zijn om je wachtwoord te wijzigen.');
      return;
    }

    setLoading(true);

    try {
      await updatePassword(auth.currentUser, nieuwWachtwoord);
      toast.success('Wachtwoord succesvol gewijzigd!');
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error('Fout bij wijzigen wachtwoord:', error);
      
      // Specifieke error handling voor Firebase
      switch (error.code) {
        case 'auth/requires-recent-login':
          toast.error('Je moet opnieuw inloggen om je wachtwoord te wijzigen.');
          break;
        case 'auth/weak-password':
          toast.error('Het wachtwoord is te zwak.');
          break;
        default:
          toast.error('Er ging iets mis bij het wijzigen van je wachtwoord.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
      <Toaster position="top-center" />
      
      <div className="w-full max-w-md bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-br from-purple-100 to-blue-100 p-4 rounded-2xl mb-4 shadow-lg">
            <svg className="h-12 w-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Wachtwoord Wijzigen
          </h1>
          <p className="text-gray-600 text-center text-sm">
            Stel een nieuw wachtwoord in voor uw account
          </p>
        </div>

        {/* Password Change Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="nieuw-wachtwoord" className="block text-sm font-semibold text-gray-700 mb-2">
              Nieuw wachtwoord
            </label>
            <input
              id="nieuw-wachtwoord"
              type="password"
              value={nieuwWachtwoord}
              onChange={(e) => setNieuwWachtwoord(e.target.value)}
              className="w-full px-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 placeholder-gray-400 text-gray-900"
              placeholder="Voer uw nieuwe wachtwoord in"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Minimaal 6 tekens</p>
          </div>

          <div>
            <label htmlFor="bevestig-wachtwoord" className="block text-sm font-semibold text-gray-700 mb-2">
              Bevestig nieuw wachtwoord
            </label>
            <input
              id="bevestig-wachtwoord"
              type="password"
              value={bevestigWachtwoord}
              onChange={(e) => setBevestigWachtwoord(e.target.value)}
              className="w-full px-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 placeholder-gray-400 text-gray-900"
              placeholder="Herhaal uw nieuwe wachtwoord"
              required
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
              'Wachtwoord wijzigen'
            )}
          </button>
        </form>

        {/* Navigation */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors"
          >
            Terug naar dashboard
          </Link>
        </div>

        {/* Security Info */}
        <div className="mt-6 p-4 bg-blue-50/60 rounded-2xl border border-blue-200/30">
          <p className="text-sm text-blue-800 text-center">
            🔒 Uw nieuwe wachtwoord wordt veilig opgeslagen
          </p>
        </div>
      </div>
    </div>
  );
}