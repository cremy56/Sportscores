// src/pages/Gebruikersbeheer.jsx
import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    deleteDoc,
    getCountFromServer
} from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import Papa from 'papaparse';
import { 
    PlusIcon, 
    ArrowUpTrayIcon, 
    TrashIcon, 
    PencilIcon, 
    MagnifyingGlassIcon,
    UsersIcon,
    ArrowDownTrayIcon,
    UserPlusIcon,
    ShieldCheckIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';
import UserFormModal from '../components/UserFormModal'; 
import ConfirmModal from '../components/ConfirmModal';

// GEEN CryptoJS meer! Alles server-side! ✅

// Mobile-vriendelijke Action Buttons Component
const MobileActionButtons = ({ onEdit, onDelete, user }) => (
    <div className="flex items-center gap-2">
        <button
            onClick={onEdit}
            className="p-3 sm:p-2 text-gray-500 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-all duration-200 touch-manipulation"
            aria-label="Bewerk gebruiker"
        >
            <PencilIcon className="h-5 w-5" />
        </button>
        <button
            onClick={onDelete}
            className="p-3 sm:p-2 text-gray-500 rounded-full hover:bg-red-100 hover:text-red-600 transition-all duration-200 touch-manipulation"
            aria-label="Verwijder gebruiker"
        >
            <TrashIcon className="h-5 w-5" />
        </button>
    </div>
);

export default function Gebruikersbeheer() {
    const context = useOutletContext();
    const { profile, school } = context || {};
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterKlas, setFilterKlas] = useState('');
    const [filterRol, setFilterRol] = useState('');
    const [totalCount, setTotalCount] = useState(null);
    const fileInputRef = useCallback(node => {
        if (node !== null) {
            node.value = '';
        }
    }, []);
    const [modal, setModal] = useState({ type: null, data: null });

    // Tel totaal aantal gebruikers
    useEffect(() => {
        const getTotalCount = async () => {
            if (!profile?.school_id) return;
            try {
                const countQuery = query(
                    collection(db, 'toegestane_gebruikers'),
                    where('school_id', '==', profile.school_id)
                );
                const snapshot = await getCountFromServer(countQuery);
                setTotalCount(snapshot.data().count);
            } catch (error) {
                console.error('Fout bij ophalen totaal aantal:', error);
            }
        };
        getTotalCount();
    }, [profile?.school_id]);

    // Laad gebruikers op basis van filters
    useEffect(() => {
        if (profile?.school_id) {
            loadUsers();
        }
    }, [profile?.school_id, filterKlas, filterRol]);

    // === NIEUWE SERVER-SIDE LOAD USERS ===
    const loadUsers = async () => {
        if (!profile?.school_id) return;
        
        setLoading(true);
        try {
            // Roep server-side API aan voor decryptie
            const response = await fetch('/api/getUsers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    schoolId: profile.school_id,
                    filterKlas: filterKlas || null,
                    filterRol: filterRol || null
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Fout bij ophalen gebruikers');
            }

            // Users bevatten nu al 'decrypted_name' van server!
            setUsers(result.users);
            console.log(`✅ Loaded ${result.users.length} users`);
            
        } catch (error) {
            console.error('Fout bij laden gebruikers:', error);
            toast.error('Kon gebruikers niet laden: ' + error.message);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    // Haal unieke klassen op voor filter
    const uniqueKlassen = [...new Set(users.map(u => u.klas).filter(Boolean))].sort();

    const handleFileChange = useCallback((event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            toast.error('Alleen CSV bestanden zijn toegestaan.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result;
            Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    await handleCSVImport(results.data);
                },
                error: (error) => {
                    console.error('CSV parse fout:', error);
                    toast.error('Fout bij inlezen CSV bestand.');
                }
            });
        };
        reader.readAsText(file);
    }, [profile?.school_id]);

    const handleCSVImport = async (data) => {
        if (!profile?.school_id) {
            toast.error('School niet geladen, probeer opnieuw');
            return;
        }

        const loadingToast = toast.loading('CSV importeren...');
        
        try {
            const apiPayload = {
                csvData: data,
                targetSchoolId: profile.school_id,
                currentUserProfileHash: profile.smartschool_id_hash
            };

            const response = await fetch('/api/bulkCreateUsers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(apiPayload),
            });

            const result = await response.json();
            toast.dismiss(loadingToast);

            if (!response.ok) {
                throw new Error(result.error || 'Er is iets misgegaan');
            }

            // Toon succes/fouten
            if (result.errorCount > 0) {
                console.error('Import fouten:', result.errors);
                toast.error(
                    `${result.successCount} gebruikers geïmporteerd, ${result.errorCount} fouten`, 
                    { duration: 5000 }
                );
            } else {
                toast.success(`${result.successCount} gebruikers succesvol geïmporteerd!`);
            }

            loadUsers(); // Refresh

        } catch (error) {
            console.error('CSV import fout:', error);
            toast.error('Fout bij importeren: ' + error.message);
            toast.dismiss(loadingToast);
        }
    };

    const exportToCSV = () => {
        if (users.length === 0) {
            toast.error('Geen gebruikers om te exporteren');
            return;
        }

        // Export ZONDER gevoelige data
        const exportData = users.map(user => ({
            rol: user.rol,
            klas: user.klas || '',
            gender: user.gender || '',
            nickname: user.nickname || '',
            onboarding_complete: user.onboarding_complete || false,
            is_active: user.is_active,
            created_at: user.created_at?.toDate?.()?.toISOString() || ''
        }));

        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `gebruikers_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('Export succesvol!');
    };

    const handleDelete = async (user) => {
        try {
            await deleteDoc(doc(db, 'toegestane_gebruikers', user.id));
            await deleteDoc(doc(db, 'users', user.id));
            toast.success('Gebruiker verwijderd');
            loadUsers();
        } catch (error) {
            console.error('Fout bij verwijderen:', error);
            toast.error('Fout bij verwijderen');
        }
    };

    const handleOpenModal = (type, data = null, role = null) => {
        setModal({ type, data, role });
    };

    const handleCloseModal = () => {
        setModal({ type: null, data: null, role: null });
    };

    const handleUserSaved = () => {
        loadUsers();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4 sm:p-6 lg:p-8">
            <Toaster position="top-right" />
            
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                                <UsersIcon className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                    Gebruikersbeheer
                                </h1>
                                <p className="text-gray-600 text-sm mt-1">
                                    {totalCount !== null ? `${totalCount} gebruikers` : 'Laden...'}
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => handleOpenModal('form', null, 'leerling')}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all"
                            >
                                <PlusIcon className="w-5 h-5" />
                                <span className="hidden sm:inline">Leerling</span>
                            </button>
                            <button
                                onClick={() => handleOpenModal('form', null, 'leerkracht')}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition-all"
                            >
                                <UserPlusIcon className="w-5 h-5" />
                                <span className="hidden sm:inline">Leerkracht</span>
                            </button>
                            <label className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:shadow-lg transition-all cursor-pointer">
                                <ArrowUpTrayIcon className="w-5 h-5" />
                                <span className="hidden sm:inline">CSV Import</span>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>
                            <button
                                onClick={exportToCSV}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-xl hover:shadow-lg transition-all"
                            >
                                <ArrowDownTrayIcon className="w-5 h-5" />
                                <span className="hidden sm:inline">Export</span>
                            </button>
                        </div>
                    </div>

                    {/* Privacy Notice */}
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <ShieldCheckIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-800">
                                <p className="font-semibold mb-1">🔒 Privacy-Veilig Systeem</p>
                                <p className="text-xs">Namen worden encrypted opgeslagen en alleen zichtbaar voor leerkrachten via veilige server-side decryptie.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Filters</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Klas</label>
                            <select
                                value={filterKlas}
                                onChange={(e) => setFilterKlas(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">Alle klassen</option>
                                {uniqueKlassen.map(klas => (
                                    <option key={klas} value={klas}>{klas}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
                            <select
                                value={filterRol}
                                onChange={(e) => setFilterRol(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">Alle rollen</option>
                                <option value="leerling">Leerling</option>
                                <option value="leerkracht">Leerkracht</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
                            <p className="mt-4 text-gray-600">Gebruikers laden...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-8 text-center">
                            <UsersIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-600">Geen gebruikers gevonden</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Naam</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nickname</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Klas</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {users.map(user => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">
                                                    {user.decrypted_name || '[Naam niet beschikbaar]'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {user.nickname || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                    user.rol === 'leerling' 
                                                        ? 'bg-blue-100 text-blue-800' 
                                                        : 'bg-green-100 text-green-800'
                                                }`}>
                                                    {user.rol}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {user.klas || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {user.gender || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                    user.is_active 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {user.is_active ? 'Actief' : 'Inactief'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <MobileActionButtons
                                                    user={user}
                                                    onEdit={() => handleOpenModal('form', user)}
                                                    onDelete={() => handleOpenModal('confirm', user)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <UserFormModal
                isOpen={modal.type === 'form'}
                onClose={handleCloseModal}
                onUserSaved={handleUserSaved}
                userData={modal.data}
                schoolId={profile?.school_id}
                role={modal.role}
                currentUserProfile={profile}
                schoolSettings={school?.instellingen}
            />

            <ConfirmModal
                isOpen={modal.type === 'confirm'}
                onClose={handleCloseModal}
                onConfirm={() => {
                    handleDelete(modal.data);
                    handleCloseModal();
                }}
                title="Gebruiker verwijderen"
                message={`Weet je zeker dat je deze gebruiker wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`}
            />
        </div>
    );
}