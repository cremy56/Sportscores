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

  if (loading) return <div>Laden...</div>;
  if (error) return <div className="text-red-500 bg-white text-center p-8">{error}</div>;

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
    leerling: ['/', '/evolutie'],
    leerkracht: ['/', '/evolutie', '/groepsbeheer', '/groep', '/scores'],
    administrator: ['/', '/evolutie', '/groepsbeheer', '/groep', '/scores', '/leerlingbeheer', '/testbeheer']
  };

  const pad = location.pathname;
  const rol = profile.rol;

  const heeftToegang = toegestaneRoutesPerRol[rol]?.some(route =>
    pad === route || pad.startsWith(route + '/')
  );

  if (!heeftToegang) {
    return <Navigate to="/" replace />;
  }

  // ✅ Geef toegang tot beschermde routes met profiel in context
  return <Outlet context={{ profile }} />;
}
