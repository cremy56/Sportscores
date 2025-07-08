import { Outlet, NavLink, useOutletContext, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Toaster } from 'react-hot-toast';
import { useState, useRef, useEffect } from 'react';
import { UserCircleIcon } from '@heroicons/react/24/outline';

export default function Layout() {
  const { profile } = useOutletContext();

  const [activeRole, setActiveRole] = useState(profile?.rol || 'leerling');

  const isTeacherOrAdmin = activeRole === 'leerkracht' || activeRole === 'administrator';
  const evolutieLinkText = isTeacherOrAdmin ? 'Portfolio' : 'Mijn Evolutie';

  const activeLinkStyle = 'text-purple-700 font-bold border-b-2 border-purple-700 pb-1';
  const inactiveLinkStyle = 'text-gray-700 font-semibold hover:text-green-600 transition-colors pb-1 border-b-2 border-transparent';

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    await supabase.auth.signOut();
  };

  return (
    <div>
      <Toaster position="top-center" />
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-white/20">
        <nav className="container mx-auto px-4 py-2 flex items-center justify-between">
          {/* Links: hamburger + logo */}
          <div className="flex items-center space-x-4">
            {/* Hamburger knop mobiel */}
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 text-gray-700 hover:text-purple-700"
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Logo */}
            <NavLink to="/" className="block h-8">
              <img
                src="/logo.png"
                alt="Sportscores Logo"
                className="h-full w-auto object-contain"
              />
            </NavLink>
          </div>

          {/* Desktop navigatie */}
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
              </>
            )}
          </ul>

          {/* Mobiele navigatie dropdown */}
          <ul
           className={`md:hidden absolute top-full left-0 right-0 bg-white shadow-md border border-gray-200 rounded-b-md py-4 px-6 flex flex-col space-y-3 transition-transform duration-300 ease-in-out
              ${mobileMenuOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-10 opacity-0 pointer-events-none'}
            `}
            onClick={() => setMobileMenuOpen(false)}
          >
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
              </>
            )}
          </ul>

          {/* Gebruikersicoon + menu helemaal rechts */}
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
                  {profile?.rol === 'administrator' && (
                    <p className="text-xs text-gray-400 mt-1">Rol: {profile?.rol}</p>
                  )}
                </div>

                {profile?.rol === 'administrator' && (
                  <div className="mb-4">
                    <label htmlFor="role-switcher" className="block text-xs font-semibold text-gray-500 mb-1">
                      Wissel rol
                    </label>
                    <select
                      id="role-switcher"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      value={activeRole}
                      onChange={(e) => setActiveRole(e.target.value)}
                      title="Switch rol"
                    >
                      <option value="administrator">Administrator</option>
                      <option value="leerkracht">Leerkracht</option>
                      <option value="leerling">Leerling</option>
                    </select>
                  </div>
                )}

                <hr className="my-2" />
                <Link
                  to="/wachtwoord-wijzigen"
                  className="w-full block px-2 py-1 text-sm text-purple-700 hover:bg-purple-50 rounded-md"
                  onClick={() => setMenuOpen(false)}
                >
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
        <Outlet context={{ profile, activeRole }} />
      </main>
    </div>
  );
}
