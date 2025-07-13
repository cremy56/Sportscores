// src/pages/SetupAccount.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

export default function SetupAccount() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
        const { data: profile } = await supabase
          .from('users')
          .select('rol')
          .eq('email', user.email)
          .single();
        if (profile) {
          setUserRole(profile.rol);
        }
      }
    };
    fetchUserData();
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Geen actieve gebruiker gevonden. Log opnieuw in.");

      await supabase.from('users').update({ id: user.id }).eq('email', user.email).is('id', null);
      await supabase.auth.updateUser({ password });

      if (userRole === 'leerling') {
        await supabase.from('leerlingen').update({ toestemming_leaderboard: consent }).eq('user_id', user.id);
      }

      await supabase.from('users').update({ onboarding_complete: true }).eq('id', user.id);

      toast.success('Je account is succesvol ingesteld!');
      setTimeout(() => {
        navigate('/');
        window.location.reload();
      }, 1500);

    } catch (error) {
      toast.error(error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Verbeterde layout: gecentreerd, met achtergrondkleur en een mooie 'card' voor de content.
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Toaster position="top-center" />
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-lg">
        <div className="text-center">
            <img src="/logo.png" alt="Sportscores Logo" className="mx-auto h-12 w-auto"/>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">Account Instellen</h2>
            <p className="mt-2 text-sm text-gray-600">
              Welkom <span className="font-medium">{userEmail}</span>! Kies een wachtwoord.
            </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nieuw Wachtwoord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Bevestig Wachtwoord</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              required
            />
          </div>

          {userRole === 'leerling' && (
            <div className="flex items-center pt-2">
              <input
                id="consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="consent" className="ml-3 block text-sm text-gray-900">
                Ja, mijn naam mag op de highscore-lijsten.
              </label>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-400"
          >
            {loading ? 'Bezig...' : 'Account Activeren'}
          </button>
        </form>
      </div>
    </div>
  );
}
