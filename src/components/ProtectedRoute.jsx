// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';

// De ProtectedRoute is nu veel simpeler. Het haalt geen data meer op,
// maar ontvangt het (nep)profiel direct van de App component.
export default function ProtectedRoute({ profile }) {

  // Als er om een of andere reden geen profiel is, stuur terug.
  // In onze nieuwe opzet zou dit niet mogen gebeuren.
  if (!profile) {
    // In een echte app zou je hier terugsturen naar een login-pagina.
    // Voor nu tonen we een simpele melding.
    return <div>Geen toegang.</div>;
  }

  // ✅ Alles is in orde. Geef toegang en geef het profiel door aan de geneste routes.
  return <Outlet context={{ profile }} />;
}
