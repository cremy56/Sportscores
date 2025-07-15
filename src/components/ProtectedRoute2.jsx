// src/components/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';

// Deze component is nu veel eenvoudiger. Het ontvangt het profiel als een prop
// en bevat geen eigen state of data-fetching logica meer.
export default function ProtectedRoute({ profile }) {
  const location = useLocation();

  // Als het profiel nog niet geladen is (of niet bestaat),
  // stuur de gebruiker terug naar de login-pagina.
  // Dit is een veilige fallback. De laadstatus in App.jsx voorkomt onnodige redirects.
  if (!profile) {
    return <Navigate to="/" replace />;
  }

  // De kernlogica: als de onboarding niet is voltooid, forceer de gebruiker
  // naar de setup-pagina, tenzij ze daar al zijn.
  if (!profile.onboarding_complete && location.pathname !== '/setup-account') {
    return <Navigate to="/setup-account" replace />;
  }

  // Voorkom dat een volledig onboarded gebruiker teruggaat naar de setup-pagina.
  if (profile.onboarding_complete && location.pathname === '/setup-account') {
    return <Navigate to="/" replace />;
  }

  // ✅ Geef toegang en geef het profiel door aan de geneste routes (zoals Layout).
  return <Outlet context={{ profile }} />;
}
