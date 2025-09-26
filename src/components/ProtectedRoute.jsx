// src/components/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ profile, school, activeRole }) {
  const location = useLocation();
  
  // ✅ Definieer userRole EERST
  const userRole = activeRole || profile?.rol;
  
  // ✅ Nu kunnen we userRole veilig gebruiken in console.log
  console.log('🛡️ ProtectedRoute check:', {
    pathname: location.pathname,
    userRole,
    profileExists: !!profile,
    onboardingComplete: profile?.onboarding_complete
  });

  // Als het profiel nog niet geladen is, stuur de gebruiker terug.
  if (!profile) {
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

  console.log('👤 Role check:', { activeRole, profileRole: profile?.rol, finalRole: userRole });
  
  if (!userRole) {
    console.log('⏳ Waiting for role to be determined...');
    return <div>Loading...</div>;
  }
  
  const currentPath = location.pathname;

  // Definieer welke rollen toegang hebben tot welke paths
  const rolePermissions = {
    // Gezondheid pagina's - alleen leerlingen en admins
    '/gezondheid': ['leerling', 'administrator', 'super-administrator'],
    
    // Welzijnsmonitor - alleen leerkrachten en admins  
    '/welzijnsmonitor': ['leerkracht', 'administrator', 'super-administrator'],
    
    // Groepsbeheer - alleen leerkrachten en admins
    '/groepsbeheer': ['leerkracht', 'administrator', 'super-administrator'],
    '/groep': ['leerkracht', 'administrator', 'super-administrator'],
    
    // Sporttesten - alleen leerkrachten en admins
    '/sporttesten': ['leerkracht', 'administrator', 'super-administrator'],
    '/testafname': ['leerkracht', 'administrator', 'super-administrator'],
    '/nieuwe-testafname': ['leerkracht', 'administrator', 'super-administrator'],
    '/testbeheer': ['leerkracht', 'administrator', 'super-administrator'],
    
    // Instellingen - alleen admins
    '/instellingen': ['administrator', 'super-administrator'],
    
    // Specifieke instellingen pagina's
    '/instellingen/gebruikersbeheer': ['administrator', 'super-administrator'],
    '/instellingen/trainingsbeheer': ['administrator', 'super-administrator'],
    '/instellingen/schoolbeheer': ['super-administrator'], // Alleen super-admin
  };

  // Check of de huidige path autorisatie vereist
  const getRequiredRoles = (path) => {
    // Exacte match eerst
    if (rolePermissions[path]) {
      return rolePermissions[path];
    }
    
    // Dan kijk naar path prefixes (voor dynamische routes zoals /groep/:id)
    for (const [permissionPath, roles] of Object.entries(rolePermissions)) {
      if (path.startsWith(permissionPath)) {
        return roles;
      }
    }
    
    return null; // Geen speciale autorisatie vereist
  };

  const requiredRoles = getRequiredRoles(currentPath);
  
  // Als er specifieke rollen vereist zijn en de gebruiker heeft ze niet
  if (requiredRoles && !requiredRoles.includes(userRole)) {
    console.log(`🚨 ProtectedRoute REDIRECT: Access denied for "${userRole}" on path "${currentPath}". Required roles:`, requiredRoles);
    return <Navigate to="/" replace />;
  }

  // Geef profiel, school en activeRole door aan geneste routes
  return <Outlet context={{ profile, school, activeRole }} />;
}