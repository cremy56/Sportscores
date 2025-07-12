// src/components/ProtectedRoute.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';

export default function ProtectedRoute() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error: profileError } = await supabase
          .rpc('get_full_user_profile', { p_user_id: user.id });

        if (profileError) {
          setError("Kon gebruikersprofiel niet laden.");
        } else if (data) {
          setProfile(data);
        } else {
          setError("Geen gebruikersprofiel gevonden.");
        }
      } else {
        setError("Geen actieve sessie.");
      }

      setLoading(false);
    };

    checkUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login'); // Pas aan naar jouw login route of '/' als je geen login pagina hebt
    window.location.reload();
  };

  if (loading) return <div>Laden...</div>;

  if (error) {
    return (
      <div className="text-red-500 bg-white text-center p-8">
        <p>{error}</p>
        {error === "Geen actieve sessie." && (
          <button
            onClick={handleLogout}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Uitloggen / Reset sessie
          </button>
        )}
      </div>
    );
  }

  // 🔒 Blokkeer toegang als onboarding nog niet voltooid is
  if (!profile?.onboarding_complete && location.pathname !== '/setup-account') {
    return <Navigate to="/setup-account" replace />;
  }

  // ⛔️ Verplicht wachtwoordwijziging afdwingen
  if (profile?.password_needs_change && location.pathname !== '/wachtwoord-wijzigen') {
    return <Navigate to="/wachtwoord-wijzigen" replace />;
  }

  // 🎯 Rolgebaseerde toegangscontrole
  const toegestaneRoutesPerRol = {
    leerling: [/^\/$/, /^\/evolutie/],
    leerkracht: [/^\/$/, /^\/evolutie/, /^\/groepsbeheer/, /^\/groep/, /^\/scores/, /^\/testafname/],
    administrator: [/^\/$/, /^\/evolutie/, /^\/groepsbeheer/, /^\/groep/, /^\/scores/, /^\/leerlingbeheer/, /^\/testbeheer/, /^\/testafname/]
  };

  const rol = profile.rol;
  const pad = location.pathname;

  const heeftToegang = toegestaneRoutesPerRol[rol]?.some(pattern => pattern.test(pad));

  if (!heeftToegang) {
    return <Navigate to="/" replace />;
  }

  // ✅ Geef toegang tot beschermde routes met profiel in context
  return <Outlet context={{ profile }} />;
}
