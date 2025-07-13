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

  // Haal de gebruikersrol op via e-mail, omdat de ID-koppeling nog niet bestaat.
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
        
        // Haal profiel op basis van e-mailadres
        const { data: profile, error } = await supabase
          .from('users')
          .select('rol')
          .eq('email', user.email)
          .single();
        
        if (error) {
            console.error("Fout bij ophalen profiel:", error);
            toast.error("Kon je gebruikersprofiel niet vinden.");
        } else if (profile) {
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

      // STAP 3: Koppel auth.users.id aan de bestaande rij in public.users
      const { error: linkError } = await supabase
        .from('users')
        .update({ id: user.id })
        .eq('email', user.email)
        .is('id', null); // Extra veiligheid: koppel alleen als het nog niet gekoppeld is.

      if (linkError) throw new Error(`Fout bij koppelen account: ${linkError.message}`);

      // STAP 4: Update het wachtwoord in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(`Fout bij instellen wachtwoord: ${updateError.message}`);

      // STAP 5: Registreer toestemming indien de gebruiker een leerling is
      if (userRole === 'leerling') {
        const { error: consentError } = await supabase
          .from('leerlingen')
          .update({ toestemming_leaderboard: consent })
          .eq('user_id', user.id); // Gaat ervan uit dat 'leerlingen.user_id' nu gekoppeld is.

        // Een fout hier is niet fataal voor de login, dus we loggen het alleen.
        if (consentError) {
          console.error("Fout bij opslaan toestemming: ", consentError.message);
          toast.error("Kon toestemming niet opslaan, maar account is wel ingesteld.");
        }
      }

      // STAP 6: Markeer de onboarding als voltooid
      const { error: onboardingError } = await supabase
        .from('users')
        .update({ onboarding_complete: true })
        .eq('id', user.id);

      if (onboardingError) throw new Error(`Fout bij afronden installatie: ${onboardingError.message}`);

      // STAP 7: Alles is klaar!
      toast.success('Je account is succesvol ingesteld! Je wordt doorgestuurd.');
      setTimeout(() => {
        navigate('/');
        window.location.reload(); // Zorgt voor een schone state na de setup.
      }, 2000);

    } catch (error) {
      toast.error(error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Toaster position="top-center" />
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-center">Account Instellen</h2>
        <p className="text-center text-gray-600">
          Welkom <span className="font-bold">{userEmail}</span>! Stel een wachtwoord in om je account te activeren.
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

          {userRole === 'leerling' && (
            <div className="flex items-center pt-2">
              <input
                id="consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="consent" className="ml-2 block text-sm text-gray-900">
                Ja, mijn naam mag op de highscore-lijsten getoond worden.
              </label>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 font-bold text-white bg-purple-700 rounded-md hover:bg-purple-800 disabled:bg-gray-400"
          >
            {loading ? 'Bezig...' : 'Account Activeren'}
          </button>
        </form>
      </div>
    </div>
  );
}
