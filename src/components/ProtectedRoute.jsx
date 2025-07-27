// src/components/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';

// De component ontvangt nu OOK de school-gegevens als prop
export default function ProtectedRoute({ profile, school }) {
  const location = useLocation();

  // Als het profiel nog niet geladen is, stuur de gebruiker terug.
  if (!profile) {
    // In een echte laad-situatie wordt dit meestal opgevangen door de 'loading' state in App.jsx,
    // maar dit is een veilige fallback.
    return <Navigate to="/" replace />;
  }

  // Als de onboarding niet is voltooid, forceer de gebruiker naar de setup-pagina.
  if (!profile.onboarding_complete && location.pathname !== '/setup-account') {
    return <Navigate to="/setup-account" replace />;
  }

  // Voorkom dat een volledig onboarded gebruiker teruggaat naar de setup-pagina.
  if (profile.onboarding_complete && location.pathname === '/setup-account') {
    return <Navigate to="/" replace />;
  }

  // ✅ Geef ZOWEL profiel als school door aan de geneste routes (zoals Layout).
  // De Layout component kan deze nu ophalen met useOutletContext().
  return <Outlet context={{ profile, school }} />;
}
