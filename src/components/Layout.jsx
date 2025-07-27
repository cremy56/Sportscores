// src/components/Layout.jsx
import { Outlet, NavLink, useOutletContext, Link, useLocation } from 'react-router-dom';
import { auth } from '../firebase'; // Importeer Firebase auth
import { signOut } from 'firebase/auth'; // Importeer de signOut functie
import { Toaster } from 'react-hot-toast';
import { useState, useRef, useEffect } from 'react';
import { UserCircleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'; // Cog6ToothIcon toegevoegd
import { Bars3Icon } from '@heroicons/react/24/solid';

export default function Layout() {
  // Haal nu ook 'school' op uit de context die door ProtectedRoute wordt geleverd
  const { profile, school } = useOutletContext();
  const location = useLocation();
  const [activeRole, setActiveRole] = useState(profile?.rol || 'leerling');

  const isTeacherOrAdmin = activeRole === 'leerkracht' || activeRole === 'administrator';
  const evolutieLinkText = isTeacherOrAdmin ? 'Portfolio' : 'Mijn Evolutie';

  const activeLinkStyle = 'text-purple-700 font-bold border-b-2 border-purple-700 pb-1';
  const inactiveLinkStyle = 'text-gray-700 font-semibold hover:text-green-600 transition-colors pb-1 border-b-2 border-transparent';

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const routeTitles = {
    '/': 'Highscores',
    '/evolutie': profile?.rol === 'leerkracht' || profile?.rol === 'administrator' ? 'Portfolio' : 'Mijn Evolutie',
    '/groepsbeheer': 'Groepsbeheer',
    '/scores': 'Scores',
    '/leerlingbeheer': 'Leerlingbeheer',
    '/testbeheer': 'Testbeheer',
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

            <NavLink to="/" className="block h-8">
              <img
                src="/logo.png" // Gebruik altijd het website logo
                alt="Sportscores Logo"
                className="h-full w-auto object-contain"
              />
            </NavLink>
          </div>
          <div className="flex-grow text-center md:hidden">
            <h1 className="text-lg font-semibold text-gray-800">{currentTitle}</h1>
          </div>
          <ul className="hidden md:flex items-center space-x-8 flex-grow mx-8">
            <li>
              <NavLink to="/" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>
                Highscores
              </NavLink>
            </li>
            <li>
              <NavLink to="/evolutie" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>
                {evolutieLinkText}
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
                  <NavLink to="/testbeheer" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>
                    Testbeheer
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
          className={`mobile-menu bg-white text-black dark:bg-white dark:text-black md:hidden absolute top-full left-0 right-0 border border-gray-200 rounded-b-md py-4 px-6 flex flex-col space-y-3 transition-transform duration-300 ease-in-out
           ${mobileMenuOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-10 opacity-0 pointer-events-none'}
          `}
            onClick={() => setMobileMenuOpen(false)}
          >
            <li><NavLink to="/" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Highscores</NavLink></li>
            <li><NavLink to="/evolutie" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>{evolutieLinkText}</NavLink></li>

            {isTeacherOrAdmin && (
              <>
                <li><NavLink to="/groepsbeheer" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Groepsbeheer</NavLink></li>
                <li><NavLink to="/scores" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Scores</NavLink></li>
              </>
            )}

            {activeRole === 'administrator' && (
              <>
                <li><NavLink to="/leerlingbeheer" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Leerlingbeheer</NavLink></li>
                <li><NavLink to="/testbeheer" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Testbeheer</NavLink></li>
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
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-50">
                <div className="mb-2">
                  <p className="text-sm text-gray-500">Ingelogd als</p>
                  <p className="font-semibold text-gray-900">{profile?.naam || profile?.email}</p>
                  
                  {/* --- AANGEPAST: School logo en naam --- */}
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
                    <select id="role-switcher" className="w-full border border-gray-300 rounded px-2 py-1 text-sm" value={activeRole} onChange={(e) => setActiveRole(e.target.value)} title="Switch rol">
                      <option value="administrator">Administrator</option>
                      <option value="leerkracht">Leerkracht</option>
                      <option value="leerling">Leerling</option>
                    </select>
                  </div>
                )}

                <hr className="my-2" />
                <Link to="/wachtwoord-wijzigen" className="w-full block px-2 py-1 text-sm text-purple-700 hover:bg-purple-50 rounded-md" onClick={() => setMenuOpen(false)}>
                  Wachtwoord wijzigen
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-2 py-1 text-sm text-red-600 bg-transparent hover:bg-red-50 rounded-md mt-1"
                >
                  Uitloggen
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Outlet context={{ profile, school, activeRole }} />
      </main>
    </div>
  );
}
