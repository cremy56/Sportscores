// src/components/Layout.jsx
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { Toaster } from 'react-hot-toast';
import { useState, useRef, useEffect, useMemo } from 'react';
import { UserCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Bars3Icon } from '@heroicons/react/24/solid';
import logoSrc from '../assets/logo.png';
import StudentSearch from './StudentSearch';

// Dropdown Component
const DropdownMenu = ({ title, children, isActive = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

// Dropdown Item Component
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

// Profile Menu Component (ongewijzigd)
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

  return (
    <div className="w-64 bg-white border border-gray-200 rounded-xl shadow-xl p-4">
      <div className="mb-2">
        <p className="text-sm text-gray-500">Ingelogd als</p>
        <p className="font-semibold text-gray-900">{profile?.naam || profile?.email}</p>
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
            onChange={(e) => {
              const newRole = e.target.value;
              setActiveRole(newRole);
              if (newRole !== 'leerling') {
                setImpersonatedStudent(null);
                setSelectedStudent(null);
                onClose();
              }
            }}
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
      <NavLink to="/wachtwoord-wijzigen" className="w-full block px-2 py-1 text-sm text-purple-700 hover:bg-purple-50 rounded-md" onClick={onClose}>
        Wachtwoord wijzigen
      </NavLink>
      <button
        onClick={handleLogout}
        className="w-full text-left px-2 py-1 text-sm text-red-600 bg-transparent hover:bg-red-50 rounded-md mt-1"
      >
        Uitloggen
      </button>
    </div>
  );
};

export default function Layout({ profile, school, selectedStudent, setSelectedStudent }) {
  const location = useLocation();
  const [activeRole, setActiveRole] = useState(profile?.rol || 'leerling');
  const [impersonatedStudent, setImpersonatedStudent] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuButtonRef = useRef();

  useEffect(() => {
    if (activeRole === 'leerling' && impersonatedStudent && (profile?.rol === 'administrator' || profile?.rol === 'super-administrator')) {
      setSelectedStudent(impersonatedStudent);
    }
  }, [impersonatedStudent, activeRole, profile?.rol, setSelectedStudent]);

  useEffect(() => {
    if (profile?.rol) {
      setActiveRole(profile.rol);
    }
  }, [profile?.rol]);

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

  const simulatedProfile = useMemo(() => {
    if (activeRole === 'leerling' && impersonatedStudent && (profile?.rol === 'administrator' || profile?.rol === 'super-administrator')) {
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

  const isTeacherOrAdmin = activeRole === 'leerkracht' || activeRole === 'administrator' || activeRole === 'super-administrator';
  const evolutieLinkText = isTeacherOrAdmin ? 'Portfolio' : 'Mijn Evolutie';
  const testbeheerLinkText = (activeRole === 'administrator' || activeRole === 'super-administrator') ? 'Testbeheer' : 'Sporttesten';
  const groeiplanLinkText = isTeacherOrAdmin ? 'Remediëring' : 'Groeiplan';

  const activeLinkStyle = 'text-purple-700 font-bold border-b-2 border-purple-700 pb-1';
  const inactiveLinkStyle = 'text-gray-700 font-semibold hover:text-green-600 transition-colors pb-1 border-b-2 border-transparent';
  
  // Check if any admin routes are active for dropdown highlighting
  const isAdminDropdownActive = ['/gebruikersbeheer', '/trainingsbeheer', '/schoolbeheer'].includes(location.pathname);
  
  const routeTitles = {
    '/': 'Home',
    '/highscores': 'Highscores',
    '/evolutie': evolutieLinkText,
    '/groeiplan': groeiplanLinkText,
    '/gezondheid': 'Mijn Gezondheid',
    '/welzijnsmonitor': 'Welzijnsmonitor',
    '/groepsbeheer': 'Groepsbeheer',
    '/scores': 'Scores',
    '/testbeheer': testbeheerLinkText,
    '/gebruikersbeheer': 'Gebruikersbeheer',
    '/trainingsbeheer': 'Trainingsbeheer',
    '/schoolbeheer': 'Schoolbeheer',
    '/wachtwoord-wijzigen': 'Wachtwoord wijzigen',
  };

  const currentTitle = routeTitles[location.pathname] || '';

  return (
    <div>
      <Toaster position="top-center" />
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md shadow-sm border-b border-white/20">
        <nav className="relative w-full px-4 md:px-8 py-2 flex items-center justify-between">
          
          {/* LINKERKANT: Hamburger & Logo */}
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

          {/* MIDDEN (Desktop): Navigatie-items met Dropdowns */}
          <ul className="hidden md:flex items-center space-x-6 flex-grow justify-center">
            <li><NavLink to="/" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Home</NavLink></li>
            <li><NavLink to="/highscores" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Highscores</NavLink></li>
            <li><NavLink to="/evolutie" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>{evolutieLinkText}</NavLink></li>
            <li><NavLink to="/groeiplan" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>{groeiplanLinkText}</NavLink></li>
            
            {/* Gezondheid voor leerlingen en super-admin */}
            {(activeRole === 'leerling' || activeRole === 'super-administrator') && (
              <li><NavLink to="/gezondheid" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Mijn Gezondheid</NavLink></li>
            )}
            
            {/* Welzijnsmonitor voor leerkrachten en admins */}
            {(activeRole === 'leerkracht' || activeRole === 'administrator' || activeRole === 'super-administrator') && (
              <li><NavLink to="/welzijnsmonitor" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Welzijnsmonitor</NavLink></li>
            )}

            {/* Data Dropdown voor leerkrachten en admins */}
            {isTeacherOrAdmin && (
              <DropdownMenu title="Data" isActive={isDataDropdownActive}>
                <DropdownItem to="/groepsbeheer">Groepsbeheer</DropdownItem>
                <DropdownItem to="/scores">Scores</DropdownItem>
                <DropdownItem to="/testbeheer">{testbeheerLinkText}</DropdownItem>
              </DropdownMenu>
            )}

            {/* Beheer Dropdown voor admins */}
            {(activeRole === 'administrator' || activeRole === 'super-administrator') && (
              <DropdownMenu title="Beheer" isActive={isAdminDropdownActive}>
                <DropdownItem to="/gebruikersbeheer">Gebruikersbeheer</DropdownItem>
                <DropdownItem to="/trainingsbeheer">Trainingsbeheer</DropdownItem>
                {activeRole === 'super-administrator' && (
                  <DropdownItem to="/schoolbeheer">Schoolbeheer</DropdownItem>
                )}
              </DropdownMenu>
            )}
          </ul>

          {/* MIDDEN (Mobiel): Gecentreerde paginatitel */}
          <div className="md:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <h1 className="text-lg font-semibold text-gray-800 whitespace-nowrap">{currentTitle}</h1>
          </div>

          {/* RECHTERKANT: Profielmenu */}
          <div className="flex justify-end flex-shrink-0 relative z-20">
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
            ${mobileMenuOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-10 opacity-0 pointer-events-none'}
            `}
            onClick={() => setMobileMenuOpen(false)}
          >
            <li><NavLink to="/" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Home</NavLink></li>
            <li><NavLink to="/highscores" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Highscores</NavLink></li>
            <li><NavLink to="/evolutie" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>{evolutieLinkText}</NavLink></li>
            <li><NavLink to="/groeiplan" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>{groeiplanLinkText}</NavLink></li>
            
            {(activeRole === 'leerling' || activeRole === 'super-administrator') && (
              <li><NavLink to="/gezondheid" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Mijn Gezondheid</NavLink></li>
            )}
            
            {(activeRole === 'leerkracht' || activeRole === 'administrator' || activeRole === 'super-administrator') && (
              <li><NavLink to="/welzijnsmonitor" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Welzijnsmonitor</NavLink></li>
            )}
            
            {isTeacherOrAdmin && (
              <>
                <li><NavLink to="/groepsbeheer" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Groepsbeheer</NavLink></li>
                <li><NavLink to="/scores" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Scores</NavLink></li>
                <li><NavLink to="/testbeheer" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>{testbeheerLinkText}</NavLink></li>
              </>
            )}

            {(activeRole === 'administrator' || activeRole === 'super-administrator') && (
              <>
                <li><NavLink to="/gebruikersbeheer" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Gebruikersbeheer</NavLink></li>
                <li><NavLink to="/trainingsbeheer" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Trainingsbeheer</NavLink></li>
                {activeRole === 'super-administrator' && (
                  <li><NavLink to="/schoolbeheer" className={({ isActive }) => (isActive ? activeLinkStyle : inactiveLinkStyle)}>Schoolbeheer</NavLink></li>
                )}
              </>
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