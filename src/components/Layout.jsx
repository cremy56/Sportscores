import { Outlet, NavLink, useOutletContext, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Toaster } from 'react-hot-toast';
import { useState, useRef, useEffect } from 'react';
import { UserCircleIcon } from '@heroicons/react/24/outline';

export default function Layout() {
  const { profile } = useOutletContext();
  
  // State voor actieve rol (default = echte rol van profiel)
  const [activeRole, setActiveRole] = useState(profile?.rol || 'leerling');

  const isTeacherOrAdmin = activeRole === 'leerkracht' || activeRole === 'administrator';
  const evolutieLinkText = isTeacherOrAdmin ? 'Portfolio' : 'Mijn Evolutie';

  const activeLinkStyle = 'text-purple-700 font-bold border-b-2 border-purple-700 pb-1';
  const inactiveLinkStyle = 'text-gray-700 font-semibold hover:text-green-600 transition-colors pb-1 border-b-2 border-transparent';

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();

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
        <nav className="container mx-auto px-4 py-2 flex items-center">
          <NavLink to="/" className="block h-8 mr-8">
            <img 
              src="/logo.png" 
              alt="Sportscores Logo" 
              className="h-full w-auto object-contain"
            />
          </NavLink>

          <ul className="hidden md:flex items-center space-x-8 flex-grow">
            <li><NavLink to="/" className={({isActive}) => isActive ? activeLinkStyle : inactiveLinkStyle}>Highscores</NavLink></li>
            <li><NavLink to="/evolutie" className={({isActive}) => isActive ? activeLinkStyle : inactiveLinkStyle}>{evolutieLinkText}</NavLink></li>
            
            {isTeacherOrAdmin && (
              <>
                <li><NavLink to="/groepsbeheer" className={({isActive}) => isActive ? activeLinkStyle : inactiveLinkStyle}>Groepsbeheer</NavLink></li>
                <li><NavLink to="/scores" className={({isActive}) => isActive ? activeLinkStyle : inactiveLinkStyle}>Scores</NavLink></li>
              </>
            )}

            {activeRole === 'administrator' && (
              <>
                <li><NavLink to="/leerlingbeheer" className={({isActive}) => isActive ? activeLinkStyle : inactiveLinkStyle}>Leerlingbeheer</NavLink></li>
                <li><NavLink to="/testbeheer" className={({isActive}) => isActive ? activeLinkStyle : inactiveLinkStyle}>Testbeheer</NavLink></li>
              </>
            )}
          </ul>

          {/* Rol-switcher alleen zichtbaar voor echte admins */}
          {profile?.rol === 'administrator' && (
            <select
              className="ml-4 border border-gray-300 rounded px-2 py-1 text-sm"
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value)}
              title="Switch rol"
            >
              <option value="administrator">Administrator</option>
              <option value="leerkracht">Leerkracht</option>
              <option value="leerling">Leerling</option>
            </select>
          )}

          {/* Gebruikersicoon + menu */}
          <div className="relative ml-4" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="text-purple-700 hover:text-purple-900 transition-colors"
            >
              <UserCircleIcon className="h-8 w-8" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-50">
                <div className="mb-2">
                  <p className="text-sm text-gray-500">Ingelogd als</p>
                  <p className="font-semibold">{profile?.naam || profile?.email}</p>
                  {/* Laat de echte rol zien, niet de geswitchte */}
                  {profile?.rol === 'administrator' && (
                    <p className="text-xs text-gray-400 mt-1">Rol: {profile?.rol}</p>
                  )}
                </div>
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
                  className="w-full text-left px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md mt-1"
                >
                  Uitloggen
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Geef ook activeRole door zodat child components het kunnen gebruiken */}
        <Outlet context={{ profile, activeRole }} />
      </main>
    </div>
  );
}
