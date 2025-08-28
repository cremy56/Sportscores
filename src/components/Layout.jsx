// src/components/Layout.jsx
import { Outlet, NavLink, useOutletContext, Link, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { Toaster } from 'react-hot-toast';
import { useState, useRef, useEffect, useMemo } from 'react';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { Bars3Icon } from '@heroicons/react/24/solid';
import logoSrc from '../assets/logo.png';
import StudentSearch from './StudentSearch';

export default function Layout({ profile, school, selectedStudent, setSelectedStudent }) {

  const location = useLocation();
  const [activeRole, setActiveRole] = useState(profile?.rol || 'leerling');
  const [impersonatedStudent, setImpersonatedStudent] = useState(null);

  // Sync impersonatedStudent met selectedStudent
  useEffect(() => {
    if (activeRole === 'leerling' && impersonatedStudent && profile?.rol === 'administrator') {
      setSelectedStudent(impersonatedStudent);
    }
  }, [impersonatedStudent, activeRole, profile?.rol, setSelectedStudent]);

  // Maak een "gesimuleerd" profiel aan op basis van de geselecteerde rol
  const simulatedProfile = useMemo(() => {
    if (activeRole === 'leerling' && impersonatedStudent && profile?.rol === 'administrator') {
      return {
        ...impersonatedStudent,
        rol: 'leerling',
        originalProfile: profile
      };
    }
    return {
      ...profile,
      rol: activeRole,
    };
  }, [profile, activeRole, impersonatedStudent]);

  const isTeacherOrAdmin = activeRole === 'leerkracht' || activeRole === 'administrator';
  const evolutieLinkText = isTeacherOrAdmin ? 'Portfolio' : 'Mijn Evolutie';
  const testbeheerLinkText = activeRole === 'administrator' ? 'Testbeheer' : 'Sporttesten';
  const groeiplanLinkText = isTeacherOrAdmin ? 'Remediëring' : 'Groeiplan';

  const activeLinkStyle = 'text-purple-700 font-bold border-b-2 border-purple-700 pb-1';
  const inactiveLinkStyle = 'text-gray-700 font-semibold hover:text-green-600 transition-colors pb-1 border-b-2 border-transparent';

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const routeTitles = {
    '/': 'Home',
    '/highscores': 'Highscores',
    '/evolutie': evolutieLinkText,
    '/groeiplan': groeiplanLinkText,
    '/groepsbeheer': 'Groepsbeheer',
    '/scores': 'Scores',
    '/leerlingbeheer': 'Leerlingbeheer',
    '/testbeheer': testbeheerLinkText,
    '/schoolbeheer': 'Schoolbeheer',
    '/wachtwoord-wijzigen': 'Wachtwoord wijzigen',
  };

  const currentTitle = routeTitles[location.pathname] || '';

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Fout bij uitloggen:", error);
    }
  };

  // Handler voor student selectie in menu
  const handleImpersonatedStudentSelect = (student) => {
    setImpersonatedStudent(student);
    // Menu NIET sluiten na selectie zodat gebruiker kan zien wat er gebeurd is
    // setMenuOpen(false); // Deze regel uitcommentariëren
  };

  return (
   <div>
      <Toaster position="top-center" />
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-white/20">
        <nav className="container mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 text-black hover:text-purple-700 bg-white rounded"
              aria-label="Toggle menu"
            >
              <Bars3Icon className="w-6 h-6 text-black" />
            </button>

            <NavLink 
              to="/" 
              aria-label="Sportscores Logo"
              className="block h-8 w-32"
              style={{
                backgroundImage: `url(${logoSrc})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
              }}
            />
          </div>
          <div className="flex-grow text-center md:hidden">
            <h1 className="text-lg font-semibold text-gray-800">{currentTitle}</h1>
          </div>
          <ul className="hidden md:flex items-center space-x-8 flex-grow mx-8">
            <li>
              <NavLink to="/" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/highscores" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>
                Highscores
              </NavLink>
            </li>
            <li>
              <NavLink to="/evolutie" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>
                {evolutieLinkText}
              </NavLink>
            </li>
            <li>
              <NavLink to="/groeiplan" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>
                {groeiplanLinkText}
              </NavLink>
            </li>
            {isTeacherOrAdmin && (
              <>
                <li>
                  <NavLink to="/groepsbeheer" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>
                    Groepsbeheer
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/scores" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>
                    Scores
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/testbeheer" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>
                    {testbeheerLinkText}
                  </NavLink>
                </li>
              </>
            )}

            {activeRole === 'administrator' && (
              <>
                <li>
                  <NavLink to="/leerlingbeheer" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>
                    Leerlingbeheer
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/schoolbeheer" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>
                    Schoolbeheer
                  </NavLink>
                </li>
              </>
            )}
          </ul>

          <ul
            className={`mobile-menu bg-white text-black dark:bg-white dark:text-black md:hidden absolute top-full left-0 right-0 border border-gray-200 rounded-b-md py-4 px-6 flex flex-col space-y-3 transition-transform duration-300 ease-in-out z-40
             ${mobileMenuOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-10 opacity-0 pointer-events-none'}
            `}
            onClick={() => setMobileMenuOpen(false)}
          >
            <li><NavLink to="/" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Home</NavLink></li>
            <li><NavLink to="/highscores" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Highscores</NavLink></li>
            <li><NavLink to="/evolutie" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>{evolutieLinkText}</NavLink></li>
            <li><NavLink to="/groeiplan" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>{groeiplanLinkText}</NavLink></li>

            {isTeacherOrAdmin && (
              <>
                <li><NavLink to="/groepsbeheer" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Groepsbeheer</NavLink></li>
                <li><NavLink to="/scores" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Scores</NavLink></li>
                <li><NavLink to="/testbeheer" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>{testbeheerLinkText}</NavLink></li>
              </>
            )}

            {activeRole === 'administrator' && (
              <>
                <li><NavLink to="/leerlingbeheer" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Leerlingbeheer</NavLink></li>
                <li><NavLink to="/schoolbeheer" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Schoolbeheer</NavLink></li>
              </>
            )}
          </ul>

          <div className="relative ml-4 flex-shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="text-purple-700 bg-transparent hover:text-purple-900 transition-colors"
              aria-label="User menu"
            >
              <UserCircleIcon className="h-8 w-8" />
            </button>

            {menuOpen && (
              <div 
                className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-[9999]"
                style={{
                  position: 'fixed',
                  top: '60px',
                  right: '16px',
                  maxHeight: 'calc(100vh - 80px)',
                  overflowY: 'auto'
                }}
              >
                <div className="p-4">
                  <div className="mb-3">
                    <p className="text-sm text-gray-500">Ingelogd als</p>
                    <p className="font-semibold text-gray-900">{profile?.naam || profile?.email}</p>
                    
                    <div className="flex items-center mt-2">
                      {school?.logo_url && (
                        <img src={school.logo_url} alt={`${school.naam} logo`} className="h-8 w-8 rounded-full mr-2 object-cover" />
                      )}
                      <p className="text-xs text-gray-400">School: {school?.naam || 'Niet gevonden'}</p>
                    </div>
                  </div>

                  {profile?.rol === 'administrator' && (
                    <div className="mb-4">
                      <label htmlFor="role-switcher" className="block text-xs font-semibold text-gray-500 mb-1">Wissel rol</label>
                      <select 
                        id="role-switcher" 
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500" 
                        value={activeRole} 
                        onChange={(e) => {
                          setActiveRole(e.target.value);
                          if (e.target.value !== 'leerling') {
                            setImpersonatedStudent(null);
                            setSelectedStudent(null);
                          }
                        }} 
                        title="Switch rol"
                      >
                        <option value="administrator">Administrator</option>
                        <option value="leerkracht">Leerkracht</option>
                        <option value="leerling">Leerling</option>
                      </select>
                      
                      {/* Student selector voor wanneer rol = leerling */}
                      {activeRole === 'leerling' && (
                        <div className="mt-3">
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Test als leerling</label>
                          <div className="relative z-[10000]">
                            <StudentSearch 
                              onStudentSelect={handleImpersonatedStudentSelect}
                              schoolId={profile?.school_id}
                              placeholder="Selecteer leerling..."
                              compact={true}
                            />
                          </div>
                          {impersonatedStudent && (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                              <p className="text-xs text-green-700 font-medium">
                                ✓ Actief als: {impersonatedStudent.naam}
                              </p>
                              <button
                                onClick={() => {
                                  setImpersonatedStudent(null);
                                  setSelectedStudent(null);
                                }}
                                className="text-xs text-green-600 hover:text-green-800 underline mt-1"
                              >
                                Reset leerling selectie
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <hr className="my-3" />
                  <Link 
                    to="/wachtwoord-wijzigen" 
                    className="w-full block px-3 py-2 text-sm text-purple-700 hover:bg-purple-50 rounded-md transition-colors" 
                    onClick={() => setMenuOpen(false)}
                  >
                    Wachtwoord wijzigen
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 bg-transparent hover:bg-red-50 rounded-md mt-1 transition-colors"
                  >
                    Uitloggen
                  </button>
                  
                  {/* Menu sluiten knop */}
                  <button
                    onClick={() => setMenuOpen(false)}
                    className="w-full text-center px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border-t border-gray-200 mt-3 pt-3"
                  >
                    Menu sluiten
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Outlet context={{ 
          profile: simulatedProfile, 
          school,
          selectedStudent,
          setSelectedStudent
        }} />
      </main>
    </div>
  );
}