// src/components/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ profile, school, activeRole }) {
  const location = useLocation();
  const userRole = activeRole || profile?.rol;

  if (!profile) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!profile.onboarding_complete && location.pathname !== '/setup-account') {
    return <Navigate to="/setup-account" replace />;
  }

  if (profile.onboarding_complete && location.pathname === '/setup-account') {
    return <Navigate to="/" replace />;
  }

  if (!userRole) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const rolePermissions = {
    '/gezondheid': ['leerling', 'administrator', 'super-administrator'],
    // EHBO staat los van welzijn — altijd toegankelijk voor leerlingen
    '/ehbo': ['leerling', 'administrator', 'super-administrator'],
    // Sportbuddy — leerling-spel (fictieve atleet); admins voor test/impersonatie
    '/sportbuddy': ['leerling', 'administrator', 'super-administrator'],
    '/welzijnsmonitor': ['leerkracht', 'administrator', 'super-administrator'],
    '/groepsbeheer': ['leerkracht', 'administrator', 'super-administrator'],
    '/groep': ['leerkracht', 'administrator', 'super-administrator'],
    '/sporttesten': ['leerkracht', 'administrator', 'super-administrator'],
    '/testafname': ['leerkracht', 'administrator', 'super-administrator'],
    '/nieuwe-testafname': ['leerkracht', 'administrator', 'super-administrator'],
    '/instellingen': ['administrator', 'super-administrator'],
    '/instellingen/gebruikersbeheer': ['administrator', 'super-administrator'],
    '/instellingen/trainingsbeheer': ['administrator', 'super-administrator'],
    '/instellingen/schoolbeheer': ['super-administrator'],
    '/sportlab': ['leerling', 'leerkracht', 'administrator', 'super-administrator'],
  };

  const getRequiredRoles = (path) => {
    if (rolePermissions[path]) return rolePermissions[path];
    for (const [permissionPath, roles] of Object.entries(rolePermissions)) {
      if (path.startsWith(permissionPath)) return roles;
    }
    return null;
  };

  const requiredRoles = getRequiredRoles(location.pathname);
  if (requiredRoles && !requiredRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet context={{ profile, school, activeRole }} />;
}