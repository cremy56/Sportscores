import React from 'react';
import { NavLink, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { Cog6ToothIcon, WrenchScrewdriverIcon, UsersIcon, BuildingLibraryIcon } from '@heroicons/react/24/outline';

const settingsMenu = [
    { name: 'Algemeen', to: '/instellingen', icon: Cog6ToothIcon, end: true },
    { name: 'Trainingsbeheer', to: '/instellingen/trainingsbeheer', icon: WrenchScrewdriverIcon },
    { name: 'Gebruikersbeheer', to: '/instellingen/gebruikersbeheer', icon: UsersIcon },
    { name: 'Schoolbeheer', to: '/instellingen/schoolbeheer', icon: BuildingLibraryIcon, adminOnly: false }
];

export default function Instellingen() {
    const location = useLocation();
    
    // Get the context from Layout and provide a fallback
    const context = useOutletContext();
    const { profile } = context || {}; // Add fallback to prevent destructuring error

    // Bepaal de titel op basis van de actieve route
    const activeItem = settingsMenu.find(item => location.pathname === item.to);
    const pageTitle = activeItem ? activeItem.name : 'Instellingen';

    return (
        <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 pt-20 pb-6 lg:px-8 lg:pt-24 lg:pb-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Linker Menu (Sidebar) */}
                    <aside className="lg:w-1/4 xl:w-1/5 flex-shrink-0">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h2 className="text-xl font-bold mb-4 hidden lg:block">Instellingen</h2>
                            <nav className="flex lg:flex-col lg:space-y-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                                {settingsMenu.map((item) => {
                                    // Verberg Schoolbeheer voor leerkrachten
                                  if (item.adminOnly && !['administrator', 'super-administrator'].includes(profile?.rol)) {
                                        return null;
                                    }
                                    return (
                                        <NavLink
                                            key={item.name}
                                            to={item.to}
                                            end={item.end}
                                            className={({ isActive }) =>
                                                `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-sm lg:text-base whitespace-nowrap ${
                                                isActive
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                                }`
                                            }
                                        >
                                            <item.icon className="h-5 w-5" />
                                            <span>{item.name}</span>
                                        </NavLink>
                                    );
                                })}
                            </nav>
                        </div>
                    </aside>

                    {/* Rechter Content Area */}
                    <main className="flex-1 min-w-0">
                         <h2 className="text-2xl font-bold text-gray-800 mb-6 lg:hidden">{pageTitle}</h2>
                        {/* Pass the context down to nested routes */}
                        <Outlet context={context} />
                    </main>
                </div>
            </div>
        </div>
    );
}