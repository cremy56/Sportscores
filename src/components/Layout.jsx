// src/components/Layout.jsx
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { Toaster } from 'react-hot-toast';
import { useState, useRef, useEffect, useMemo } from 'react';
import { UserCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Zap, Star, TrendingUp } from 'lucide-react';
import { Bars3Icon } from '@heroicons/react/24/solid';
import logoSrc from '../assets/logo.png';
import StudentSearch from './StudentSearch';
import PrivacyModal from './PrivacyModal';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// =============================================
// DROPDOWN COMPONENT
// =============================================
const DropdownMenu = ({ title, children, isActive = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen &&
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const activeLinkStyle = 'text-purple-700 font-bold border-b-2 border-purple-700 pb-1';
  const inactiveLinkStyle = 'text-gray-700 font-semibold hover:text-green-600 transition-colors pb-1 border-b-2 border-transparent';

  return (
    <li className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-1 ${isActive ? activeLinkStyle : inactiveLinkStyle} cursor-pointer`}
        onMouseEnter={() => setIsOpen(true)}
      >
        <span>{title}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <ul
          className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-48 z-50"
          onMouseLeave={() => setIsOpen(false)}
        >
          {children}
        </ul>
      )}
    </li>
  );
};

// =============================================
// DROPDOWN ITEM COMPONENT
// =============================================
const DropdownItem = ({ to, children, onClick }) => (
  <li>
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `block px-4 py-2 text-sm transition-colors ${
          isActive
            ? 'bg-purple-50 text-purple-700 font-semibold'
            : 'text-gray-700 hover:bg-gray-50 hover:text-green-600'
        }`
      }
    >
      {children}
    </NavLink>
  </li>
);

// =============================================
// PROFILE MENU COMPONENT
// ✅ FIX: wachtwoord wijzigen verwijderd (Smartschool login)
// =============================================
const ProfileMenu = ({
  profile,
  school,
  activeRole,
  setActiveRole,
  impersonatedStudent,
  setImpersonatedStudent,
  setSelectedStudent,
  onClose,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Fout bij uitloggen:", error);
    }
  };

  const handleImpersonatedStudentSelect = (student) => {
    setImpersonatedStudent(student);
    onClose();
  };

  const handleRoleChange = (newRole) => {
    const currentPath = location.pathname;

    const restrictedPaths = {
      'leerling': ['/instellingen', '/welzijnsmonitor', '/groepsbeheer', '/sporttesten'],
      'leerkracht': ['/instellingen'],
      'administrator': [],
      'super-administrator': []
    };

    const isPathRestricted = restrictedPaths[newRole]?.some(path => currentPath.startsWith(path));

    setActiveRole(newRole);

    if (newRole !== 'leerling') {
      setImpersonatedStudent(null);
      setSelectedStudent(null);
    }

    if (isPathRestricted) {
      navigate('/');
    }

    onClose();
  };

  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <>
    <div className="w-64 bg-white border border-gray-200 rounded-xl shadow-xl p-4">
      <div className="mb-2">
        <p className="text-sm text-gray-500">Ingelogd als</p>
        
        <p className="font-semibold text-gray-900">{profile?.nickname || profile?.naam || 'Gebruiker'}</p>
        <div className="flex items-center mt-2">
          {school?.logo_url && (
            <img src={school.logo_url} alt={`${school.naam} logo`} className="h-8 w-8 rounded-full mr-2 object-cover" />
          )}
          <p className="text-xs text-gray-400">School: {school?.naam || 'Niet gevonden'}</p>
        </div>
      </div>

      {(profile?.rol === 'administrator' || profile?.rol === 'super-administrator') && (
        <div className="mb-4">
          <label htmlFor="role-switcher" className="block text-xs font-semibold text-gray-500 mb-1">Wissel rol</label>
          <select
            id="role-switcher"
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            value={activeRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            title="Switch rol"
          >
            {profile?.rol === 'super-administrator' && (
              <option value="super-administrator">Super-administrator</option>
            )}
            <option value="administrator">Administrator</option>
            <option value="leerkracht">Leerkracht</option>
            <option value="leerling">Leerling</option>
          </select>

          {activeRole === 'leerling' && (
            <div className="mt-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Test als leerling</label>
              <StudentSearch
                onStudentSelect={handleImpersonatedStudentSelect}
                schoolId={profile?.school_id}
                token={profile?._token}
                placeholder="Selecteer leerling..."
                compact={true}
              />
              {impersonatedStudent && (
                <p className="text-xs text-green-600 mt-1">Actief als: {impersonatedStudent.naam}</p>
              )}
            </div>
          )}
        </div>
      )}

      <hr className="my-2" />
      <button
        onClick={() => setPrivacyOpen(true)}
        className="block w-full text-left px-2 py-1 text-sm text-gray-500 hover:bg-gray-50 rounded-md mt-1"
      >
        🔒 Privacyverklaring
      </button>
      {/* ✅ FIX: 'Wachtwoord wijzigen' verwijderd - login gaat via Smartschool */}
      <button
        onClick={handleLogout}
        className="w-full text-left px-2 py-1 text-sm text-red-600 bg-transparent hover:bg-red-50 rounded-md mt-1"
      >
        Uitloggen
      </button>
    </div>
    <PrivacyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </>
  );
};

// =============================================
// REWARDS DISPLAY (Desktop)
// =============================================
const ClickableRewardsDisplay = ({ profile, activeRole }) => {
  const navigate = useNavigate();

  if (activeRole !== 'leerling') return null;

  const yearXP = profile?.xp_current_school_year || 0;
  const sparks = Math.floor((profile?.xp_current_period || 0) / 100);
  const streak = profile?.streak_days || 0;

  return (
    <div className="hidden md:flex items-center mr-3">
      <button
        onClick={() => navigate('/rewards')}
        className="bg-gradient-to-r from-purple-50 to-yellow-50 hover:from-purple-100 hover:to-yellow-100 px-3 py-1.5 rounded-full border border-gray-200 transition-all"
        title="Klik om naar Rewards te gaan"
      >
        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1" title="XP dit Schooljaar">
            <Star className="w-3 h-3 text-orange-500" />
            <span className="font-semibold text-orange-700">{yearXP}</span>
          </div>
          <div className="flex items-center space-x-1" title="Sparks deze Periode">
            <Zap className="w-3 h-3 text-purple-600" />
            <span className="font-semibold text-purple-700">{sparks}</span>
          </div>
          <div className="flex items-center space-x-1" title="Dagen Streak">
            <TrendingUp className="w-3 h-3 text-green-600" />
            <span className="font-semibold text-green-700">{streak}</span>
          </div>
        </div>
      </button>
    </div>
  );
};

// =============================================
// REWARDS DISPLAY (Mobiel)
// =============================================
const MobileClickableRewardsDisplay = ({ profile, activeRole }) => {
  const navigate = useNavigate();
  if (activeRole !== 'leerling') return null;

  const yearXP = profile?.xp_current_school_year || 0;
  const sparks = Math.floor((profile?.xp_current_period || 0) / 100);
  const streak = profile?.streak_days || 0;

  return (
    <button
      onClick={() => navigate('/rewards')}
      className="md:hidden mt-1 px-2 py-1 bg-gradient-to-r from-purple-50 to-yellow-50 rounded-full border border-gray-200"
      title="Bekijk je rewards"
    >
      <div className="flex items-center space-x-1">
        <div className="flex items-center space-x-0.5">
          <Star className="w-2.5 h-2.5 text-orange-500" />
          <span className="text-[10px] font-semibold text-orange-700">{yearXP}</span>
        </div>
        <span className="text-gray-300 text-[8px]">•</span>
        <div className="flex items-center space-x-0.5">
          <Zap className="w-2.5 h-2.5 text-purple-600" />
          <span className="text-[10px] font-semibold text-purple-700">{sparks}</span>
        </div>
        <span className="text-gray-300 text-[8px]">•</span>
        <div className="flex items-center space-x-0.5">
          <TrendingUp className="w-2.5 h-2.5 text-green-600" />
          <span className="text-[10px] font-semibold text-green-700">{streak}</span>
        </div>
      </div>
    </button>
  );
};

// =============================================
// HOOFD LAYOUT COMPONENT
//

// =============================================
export default function Layout({ profile, school, selectedStudent, setSelectedStudent, activeRole, setActiveRole }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [impersonatedStudent, setImpersonatedStudent] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuButtonRef = useRef();
  const [realtimeProfile, setRealtimeProfile] = useState(profile);
  const [schoolSettings, setSchoolSettings] = useState(null);

  // Real-time listener voor rewards data
  useEffect(() => {
    if (!profile?.id) {
      setRealtimeProfile(profile);
      return;
    }
    const userRef = doc(db, 'users', profile.id);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setRealtimeProfile(prev => ({
          ...prev,
          xp: userData.xp || 0,
          xp_current_period: userData.xp_current_period || 0,
          xp_current_school_year: userData.xp_current_school_year || 0,
          streak_days: userData.streak_days || 0,
        }));
      }
    });
    return () => unsubscribe();
  }, [profile?.id]);

  // School settings listener
  useEffect(() => {
    if (!school?.id) {
      setSchoolSettings(null);
      return;
    }

    const schoolRef = doc(db, 'scholen', school.id);
    const unsubscribe = onSnapshot(schoolRef, (docSnap) => {
      if (docSnap.exists()) {
        const schoolData = docSnap.data();
        setSchoolSettings(schoolData.instellingen || {});
      } else {
        setSchoolSettings(null);
      }
    });

    return () => unsubscribe();
  }, [school?.id]);

  // Impersonated student → selectedStudent synchronisatie
  useEffect(() => {
    if (activeRole === 'leerling' && impersonatedStudent && (profile?.rol === 'administrator' || profile?.rol === 'super-administrator')) {
      setSelectedStudent(impersonatedStudent);
    }
  }, [impersonatedStudent, activeRole, profile?.rol, setSelectedStudent]);

  // Initialiseer activeRole vanuit profiel
  useEffect(() => {
    if (profile?.rol && !activeRole) {
      setActiveRole(profile.rol);
    }
  }, [profile?.rol, activeRole, setActiveRole]);

  // Redirect als huidig pad niet toegankelijk is voor nieuwe rol
  // 
  useEffect(() => {
    if (!activeRole || !profile) return;

    const currentPath = location.pathname;
    const restrictedPaths = {
      'leerling': ['/instellingen', '/gebruikersbeheer', '/trainingsbeheer', '/schoolbeheer', '/welzijnsmonitor', '/groepsbeheer', '/sporttesten'],
      'leerkracht': ['/instellingen', '/gebruikersbeheer', '/trainingsbeheer', '/schoolbeheer'],
      'administrator': ['/schoolbeheer'],
      'super-administrator': []
    };

    const isPathRestricted = restrictedPaths[activeRole]?.some(path => currentPath.startsWith(path));

    // Redirect als welzijnsmodule uitgeschakeld is en gebruiker op welzijn-pagina zit
    const welzijnPaths = ['/gezondheid', '/welzijnsmonitor'];
    const isOnWelzijnPath = welzijnPaths.some(path => currentPath.startsWith(path));
    const welzijnUitgeschakeld = schoolSettings?.welzijnModuleActief === false;

    if (isPathRestricted || (isOnWelzijnPath && welzijnUitgeschakeld)) {
      navigate('/');
    }
  }, [activeRole, location.pathname, navigate, profile, schoolSettings]);

  const toggleMenu = () => {
    if (menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right + window.scrollX - 256,
      });
    }
    setMenuOpen(prev => !prev);
  };

  // Gesimuleerd profiel (voor rol-switching en impersonation)
  const simulatedProfile = useMemo(() => {
    if (activeRole === 'leerling' && impersonatedStudent && (profile?.rol === 'administrator' || profile?.rol === 'super-administrator')) {
      return {
        ...impersonatedStudent,
        rol: 'leerling',
        originalProfile: profile
      };
    }
    return {
      ...realtimeProfile,
      rol: activeRole,
    };
  }, [realtimeProfile, activeRole, impersonatedStudent]);

  const isTeacherOrAdmin = activeRole === 'leerkracht' || activeRole === 'administrator' || activeRole === 'super-administrator';
  const welzijnActief = schoolSettings !== null && schoolSettings?.welzijnModuleActief !== false; // verborgen tijdens laden én als uitgeschakeld
  const evolutieLinkText = isTeacherOrAdmin ? 'Portfolio' : 'Mijn Evolutie';
  const groeiplanLinkText = isTeacherOrAdmin ? 'Remediëring' : 'Groeiplan';
  const homeLinkText = schoolSettings?.sportdashboardAsHomepage ? 'Highscores' : 'Home';

  const activeLinkStyle = 'text-purple-700 font-bold border-b-2 border-purple-700 pb-1';
  const inactiveLinkStyle = 'text-gray-700 font-semibold hover:text-green-600 transition-colors pb-1 border-b-2 border-transparent';

  const routeTitles = {
    '/': schoolSettings?.sportdashboardAsHomepage ? 'Highscores' : 'Home',
    '/advalvas': 'Ad Valvas',
    '/highscores': 'Highscores',
    '/evolutie': evolutieLinkText,
    '/groeiplan': groeiplanLinkText,
    '/gezondheid': 'Mijn Gezondheid',
    '/welzijnsmonitor': 'Welzijnsmonitor',
    '/groepsbeheer': 'Groepsbeheer',
    '/sporttesten': 'Sporttesten',
    '/gebruikersbeheer': 'Gebruikersbeheer',
    '/trainingsbeheer': 'Trainingsbeheer',
    '/schoolbeheer': 'Schoolbeheer',
    '/rewards': 'Rewards',
  };

  const currentTitle = Object.entries(routeTitles).find(([path]) => location.pathname.startsWith(path))?.[1] || 'SportScores';

  return (
    <div>
      <Toaster position="top-center" />
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md shadow-sm border-b border-white/20">
        <nav className="relative w-full px-4 md:px-8 py-2 flex items-center justify-between">

          {/* LINKS: Hamburger & Logo */}
          <div className="relative z-20 flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="md:hidden p-2 text-black hover:text-purple-700"
              aria-label="Toggle menu"
            >
              <Bars3Icon className="w-6 h-6 text-black" />
            </button>
            <NavLink
              to="/"
              aria-label="Sportscores Logo"
              className="block h-8 w-28"
              style={{ backgroundImage: `url(${logoSrc})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'left center' }}
            />
          </div>

          {/* MIDDEN (Desktop): Navigatie */}
          <ul className="hidden md:flex items-center space-x-6 flex-grow justify-center">
            <li>
              <NavLink to="/" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>
                {homeLinkText}
              </NavLink>
            </li>

            {schoolSettings?.sportdashboardAsHomepage ? (
              <li><NavLink to="/advalvas" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Ad Valvas</NavLink></li>
            ) : (
              <li><NavLink to="/highscores" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Highscores</NavLink></li>
            )}

            <li><NavLink to="/evolutie" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>{evolutieLinkText}</NavLink></li>
            <li><NavLink to="/groeiplan" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>{groeiplanLinkText}</NavLink></li>

            {(activeRole === 'leerling' || activeRole === 'super-administrator') && welzijnActief && (
              <li><NavLink to="/gezondheid" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Mijn Gezondheid</NavLink></li>
            )}

            {isTeacherOrAdmin && welzijnActief && (
              <li><NavLink to="/welzijnsmonitor" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Welzijnsmonitor</NavLink></li>
            )}

            {isTeacherOrAdmin && (
              <>
                <li><NavLink to="/groepsbeheer" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Groepsbeheer</NavLink></li>
                <li>
                  <NavLink
                    to="/sporttesten"
                    className={() => location.pathname.startsWith('/sporttesten') || location.pathname.startsWith('/testbeheer') ? activeLinkStyle : inactiveLinkStyle}
                  >
                    Sporttesten
                  </NavLink>
                </li>
              </>
            )}

            {(activeRole === 'administrator' || activeRole === 'super-administrator') && (
              <li><NavLink to="/instellingen" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Instellingen</NavLink></li>
            )}
          </ul>

          {/* MIDDEN (Mobiel): Paginatitel + Rewards */}
          <div className="md:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
            <h1 className="text-lg font-semibold text-gray-800 whitespace-nowrap">{currentTitle}</h1>
            <MobileClickableRewardsDisplay profile={simulatedProfile} activeRole={activeRole} />
          </div>

          {/* RECHTS: Rewards + Profielmenu */}
          <div className="flex items-center justify-end flex-shrink-0 relative z-20">
            <ClickableRewardsDisplay profile={simulatedProfile} activeRole={activeRole} />
            <div ref={menuButtonRef}>
              <button
                onClick={toggleMenu}
                className="p-2 text-purple-700 bg-transparent hover:text-purple-900 transition-colors"
                aria-label="User menu"
              >
                <UserCircleIcon className="h-8 w-8" />
              </button>
            </div>
          </div>

          {/* Mobiel Menu */}
          <ul
            className={`mobile-menu bg-white text-black md:hidden absolute top-full left-0 right-0 border border-gray-200 rounded-b-md py-4 px-6 flex flex-col space-y-3 transition-transform duration-300 ease-in-out
              ${mobileMenuOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-10 opacity-0 pointer-events-none'}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <li><NavLink to="/" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>{homeLinkText}</NavLink></li>

            {schoolSettings?.sportdashboardAsHomepage ? (
              <li><NavLink to="/advalvas" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Ad Valvas</NavLink></li>
            ) : (
              <li><NavLink to="/highscores" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Highscores</NavLink></li>
            )}

            <li><NavLink to="/evolutie" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>{evolutieLinkText}</NavLink></li>
            <li><NavLink to="/groeiplan" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>{groeiplanLinkText}</NavLink></li>

            {(activeRole === 'leerling' || activeRole === 'super-administrator') && welzijnActief && (
              <li><NavLink to="/gezondheid" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Mijn Gezondheid</NavLink></li>
            )}

            {isTeacherOrAdmin && (
              <>
                {welzijnActief && (
                  <li><NavLink to="/welzijnsmonitor" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Welzijnsmonitor</NavLink></li>
                )}
                <li><NavLink to="/welzijnsmonitor" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Welzijnsmonitor</NavLink></li>
                <li><NavLink to="/groepsbeheer" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Groepsbeheer</NavLink></li>
                <li><NavLink to="/sporttesten" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Sporttesten</NavLink></li>
              </>
            )}

            {(activeRole === 'administrator' || activeRole === 'super-administrator') && (
              <li><NavLink to="/instellingen" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Instellingen</NavLink></li>
            )}
          </ul>
        </nav>
      </header>

      {/* Portal voor profielmenu */}
      {menuOpen && createPortal(
        <div
          style={{ position: 'absolute', top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
          className="z-50"
        >
          <ProfileMenu
            profile={profile}
            school={school}
            activeRole={activeRole}
            setActiveRole={setActiveRole}
            impersonatedStudent={impersonatedStudent}
            setImpersonatedStudent={setImpersonatedStudent}
            setSelectedStudent={setSelectedStudent}
            onClose={() => setMenuOpen(false)}
          />
        </div>,
        document.getElementById('portal-root')
      )}

      <main className="relative z-10 container mx-auto px-4 py-8">
        <Outlet context={{ profile: simulatedProfile, school, selectedStudent, setSelectedStudent }} />
      </main>
    </div>
  );
}