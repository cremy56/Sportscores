// src/components/ProtectedRoute.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function ProtectedRoute() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const checkUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // CORRECTIE: Haal het profiel direct uit de 'users' tabel.
        // De RLS-policy die we hebben ingesteld, zorgt ervoor dat dit werkt
        // voor zowel nieuwe gebruikers (via email) als bestaande gebruikers (via id).
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email) // Zoek op e-mail, dit werkt altijd.
          .single();

        if (profileError) {
          // Als er een fout is (anders dan 'geen rijen gevonden'), toon deze.
          if (profileError.code !== 'PGRST116') {
             setError("Fout bij het laden van het gebruikersprofiel.");
             console.error(profileError);
          } else {
             setError("Geen gebruikersprofiel gevonden voor dit account.");
          }
        } else if (profileData) {
          setProfile(profileData);
        } else {
          setError("Geen gebruikersprofiel gevonden.");
        }
      } else {
        setError("Geen actieve sessie. U wordt doorgestuurd.");
      }
      setLoading(false);
    };

    checkUserAndProfile();
  }, []);

  if (loading) {
    return <div></div>; // Toon niets tijdens het laden
  }

  if (error || !profile) {
    // Als er een fout is of geen profiel, stuur altijd terug naar de login-pagina.
    return <Navigate to="/" replace />;
  }

  // 🔒 De belangrijkste check: als de onboarding niet is voltooid,
  // forceer de gebruiker naar de setup-pagina.
  // Dit werkt nu omdat het profiel correct wordt geladen.
  if (!profile.onboarding_complete && location.pathname !== '/setup-account') {
    return <Navigate to="/setup-account" replace />;
  }
  
  // Als de onboarding wél is voltooid maar de gebruiker op de setup-pagina is, stuur hem dan weg.
  if (profile.onboarding_complete && location.pathname === '/setup-account') {
      return <Navigate to="/" replace />;
  }


  // ✅ Geef toegang tot de beschermde routes, met het profiel in de context.
  return <Outlet context={{ profile }} />;
}
