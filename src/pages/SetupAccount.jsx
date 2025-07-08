// src/pages/SetupAccount.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function SetupAccount() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();

useEffect(() => {
    const fetchUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
      const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('rol')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserRole(profile.rol);
        }
      }
    };
    fetchUserEmail();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Wachtwoord moet minstens 6 tekens lang zijn.');
      return;
    }

    if (password !== confirmPassword) {
      setError('De wachtwoorden komen niet overeen.');
      return;
    }

    setLoading(true);

    try {
      // 1. Haal de huidige gebruiker op
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Geen gebruiker gevonden.");

      // Haal de rol van de gebruiker op uit de public.users tabel
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('rol')
        .eq('id', user.id)
        .single();
      if (userError) throw userError;

      // 2. Update het wachtwoord van de gebruiker
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      
      // 3. Update de toestemming ALLEEN als de gebruiker een leerling is
      if (userData.rol === 'leerling') {
        const { error: consentError } = await supabase
          .from('leerlingen')
          .update({ toestemming_leaderboard: consent })
          .eq('user_id', user.id);
        if (consentError) throw consentError;
      }

      // 4. Markeer de onboarding als voltooid in de 'users' tabel
      const { error: onboardingError } = await supabase
        .from('users')
        .update({ onboarding_complete: true })
        .eq('id', user.id);
      if (onboardingError) throw onboardingError;

      // 5. Stuur de gebruiker door naar de hoofdpagina
      alert('Je account is succesvol ingesteld!');
      navigate('/');
      window.location.reload(); // Forceer een refresh om de app state te vernieuwen

    } catch (error) {
      setError(error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-center">Account Instellen</h2>
        <p className="text-center text-gray-600">
          Welkom <span className="font-bold">{userEmail}</span>! Stel hier je wachtwoord in om je account te activeren.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium">Nieuw Wachtwoord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 border rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Bevestig Wachtwoord</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 border rounded-md"
              required
            />
          </div>

          {/* --- DE CONDITIONELE WEERGAVE --- */}
          {/* Toon dit blok alleen als de rol van de gebruiker 'leerling' is */}
          {userRole === 'leerling' && (
            <div className="flex items-center">
              <input
                id="consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <label htmlFor="consent" className="ml-2 block text-sm">
                Ja, mijn volledige naam mag op de highscore-lijsten getoond worden.
              </label>
            </div>
          )}
          {/* ----------------------------- */}
          
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 font-bold text-white bg-purple-700 rounded-md hover:bg-purple-800 disabled:bg-gray-400"
          >
            {loading ? 'Opslaan...' : 'Account Instellen'}
          </button>
        </form>
      </div>
    </div>
  );
}