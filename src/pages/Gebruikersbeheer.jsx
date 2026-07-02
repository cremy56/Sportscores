// src/pages/Gebruikersbeheer.jsx
import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { db } from '../firebase';
import toast, { Toaster } from 'react-hot-toast';
import Papa from 'papaparse';
import {
    PlusIcon,
    ArrowUpTrayIcon,
    TrashIcon,
    PencilIcon,
    UsersIcon,
    ArrowDownTrayIcon,
    UserPlusIcon,
    ShieldCheckIcon,
    BookOpenIcon,
    XMarkIcon,
    CheckIcon
} from '@heroicons/react/24/outline';
import UserFormModal from '../components/UserFormModal';
import ConfirmModal from '../components/ConfirmModal';

// =============================================
// HELPER: Auth token ophalen
// =============================================
const getAuthToken = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
        toast.error("Authenticatie verlopen. Log opnieuw in.");
        throw new Error("Niet geauthenticeerd");
    }
    return await user.getIdToken();
};

// =============================================
// ACTION BUTTONS
// =============================================
const MobileActionButtons = ({ user, onEdit, onDelete, onKlassenToewijzen }) => (
    <div className="flex items-center gap-2 justify-end">
        {/* Klassen toewijzen - alleen voor leerkrachten */}
        {user.rol === 'leerkracht' && (
            <button
                onClick={onKlassenToewijzen}
                className="p-3 sm:p-2 text-gray-500 rounded-full hover:bg-green-100 hover:text-green-600 transition-all"
                aria-label="Klassen toewijzen"
                title="Klassen toewijzen"
            >
                <BookOpenIcon className="h-5 w-5" />
            </button>
        )}
        <button
            onClick={onEdit}
            className="p-3 sm:p-2 text-gray-500 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-all"
            aria-label="Bewerk gebruiker"
        >
            <PencilIcon className="h-5 w-5" />
        </button>
        <button
            onClick={onDelete}
            className="p-3 sm:p-2 text-gray-500 rounded-full hover:bg-red-100 hover:text-red-600 transition-all"
            aria-label="Verwijder gebruiker"
        >
            <TrashIcon className="h-5 w-5" />
        </button>
    </div>
);

// =============================================
// MODAL: Klassen toewijzen aan leerkracht
// =============================================
function KlassenModal({ isOpen, onClose, leerkracht, alleKlassen, onSaved }) {
    const [geselecteerdeKlassen, setGeselecteerdeKlassen] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialiseer met huidige klassen van leerkracht
    useEffect(() => {
        if (leerkracht) {
            setGeselecteerdeKlassen(leerkracht.klassen || []);
        }
    }, [leerkracht]);

    const toggleKlas = (klas) => {
        setGeselecteerdeKlassen(prev =>
            prev.includes(klas)
                ? prev.filter(k => k !== klas)
                : [...prev, klas].sort()
        );
    };

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            const token = await getAuthToken();

            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: 'update_teacher_klassen',
                    userId: leerkracht.id,              // smartschool_id_hash
                    klassen: geselecteerdeKlassen
                })
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Fout bij opslaan');
            }

            toast.success(`Klassen bijgewerkt voor ${leerkracht.decrypted_name}!`);
            onSaved();
            onClose();
        } catch (error) {
            console.error('Fout bij opslaan klassen:', error);
            toast.error('Fout bij opslaan: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !leerkracht) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">

                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Klassen Toewijzen</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {leerkracht.decrypted_name}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* GDPR Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5">
                    <div className="flex items-start gap-2">
                        <ShieldCheckIcon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-800">
                            De leerkracht kan <strong>alleen leerlingen zien</strong> van de hieronder toegewezen klassen.
                        </p>
                    </div>
                </div>

                {/* Klassen lijst */}
                {alleKlassen.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">
                        Geen klassen beschikbaar. Voeg eerst leerlingen toe met een klas.
                    </p>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
                        {alleKlassen.map(klas => {
                            const isSelected = geselecteerdeKlassen.includes(klas);
                            return (
                                <button
                                    key={klas}
                                    onClick={() => toggleKlas(klas)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${
                                        isSelected
                                            ? 'bg-green-50 border-green-300 text-green-800'
                                            : 'bg-slate-50 border-slate-200 text-gray-800 hover:bg-green-50/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <BookOpenIcon className={`h-4 w-4 ${isSelected ? 'text-green-600' : 'text-gray-400'}`} />
                                        <span className="font-medium">{klas}</span>
                                    </div>
                                    {isSelected && <CheckIcon className="h-5 w-5 text-green-600" />}
                                </button>
                            );
                        })}
                    </div>
                )}

                <p className="text-xs text-gray-400 mb-4">
                    {geselecteerdeKlassen.length} klas(sen) geselecteerd
                </p>

                {/* Knoppen */}
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-2xl font-semibold"
                    >
                        Annuleren
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-2xl font-semibold disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                <span>Opslaan...</span>
                            </>
                        ) : (
                            'Opslaan'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================
// HOOFD COMPONENT
// =============================================
export default function Gebruikersbeheer() {
    const context = useOutletContext();
    const { profile, school } = context || {};

    // ─── Feature flag: Gebruikersbeheer tijdelijk verborgen ──────────────────
    // De CSV-import blijft als fallback bestaan (naast de toekomstige
    // Smartschool API-sync), maar de UI is voorlopig enkel toegankelijk
    // voor super-administrators. Terug openzetten: zet deze flag op true.
    const GEBRUIKERSBEHEER_ENABLED = false;

    const heeftToegang = GEBRUIKERSBEHEER_ENABLED
        || profile?.rol === 'super-administrator';

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterKlas, setFilterKlas] = useState('');
    const [filterRol, setFilterRol] = useState('');
    const [totalCount, setTotalCount] = useState(null);
    const [modal, setModal] = useState({ type: null, data: null });

    // Klassen modal state
    const [klassenModal, setKlassenModal] = useState({ open: false, leerkracht: null });

    const fileInputRef = useCallback(node => {
        if (node !== null) node.value = '';
    }, []);

    // Alle unieke klassen (voor KlassenModal)
    const uniqueKlassen = [...new Set(users.map(u => u.klas).filter(Boolean))].sort();

    // =============================================
    // TOTAAL TELLEN
    // =============================================
    useEffect(() => {
        const getTotalCount = async () => {
            if (!heeftToegang || !profile?.school_id) return;
            try {
                const token = await getAuthToken();
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ action: 'get_count', schoolId: profile.school_id })
                });
                const result = await response.json();
                if (response.ok) setTotalCount(result.count);
            } catch (error) {
                console.error('Fout bij ophalen telling:', error.message);
            }
        };
        getTotalCount();
    }, [profile?.school_id]);

    // =============================================
    // GEBRUIKERS LADEN
    // =============================================
    useEffect(() => {
        if (heeftToegang && profile?.school_id) loadUsers();
    }, [heeftToegang, profile?.school_id, filterKlas, filterRol]);

    const loadUsers = async () => {
        if (!profile?.school_id) return;
        setLoading(true);
        try {
            const token = await getAuthToken();
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    action: 'get_users',
                    schoolId: profile.school_id,
                    filterKlas: filterKlas || null,
                    filterRol: filterRol || null
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Fout bij ophalen gebruikers');
            setUsers(result.users);
        } catch (error) {
            console.error('Fout bij laden gebruikers:', error);
            toast.error('Kon gebruikers niet laden: ' + error.message);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    // =============================================
    // CSV IMPORT
    // =============================================
    const handleFileChange = useCallback((event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.name.endsWith('.csv')) {
            toast.error('Alleen CSV bestanden zijn toegestaan.');
            return;
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
            Papa.parse(e.target?.result, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => { await handleCSVImport(results.data); },
                error: () => toast.error('Fout bij inlezen CSV bestand.')
            });
        };
        reader.readAsText(file);
    }, [profile?.school_id, profile?.toegestane_gebruikers_id]);

    const handleCSVImport = async (data) => {
        if (!profile?.school_id) return;
        const loadingToast = toast.loading('CSV importeren...');
        try {
            const token = await getAuthToken();
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    action: 'bulk_create',
                    csvData: data,
                    targetSchoolId: profile.school_id,
                    currentUserProfileHash: profile.toegestane_gebruikers_id
                })
            });
            const result = await response.json();
            toast.dismiss(loadingToast);
            if (!response.ok) throw new Error(result.error || 'Er is iets misgegaan');
            if (result.errorCount > 0) {
                toast.error(`${result.successCount} geïmporteerd, ${result.errorCount} fouten`, { duration: 5000 });
            } else {
                toast.success(`${result.successCount} gebruikers succesvol geïmporteerd!`);
            }
            loadUsers();
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error('Fout bij importeren: ' + error.message);
        }
    };

    // =============================================
    // EXPORT
    // =============================================
    const exportToCSV = () => {
        if (users.length === 0) { toast.error('Geen gebruikers om te exporteren'); return; }
        const exportData = users.map(user => ({
            rol: user.rol,
            klas: user.klas || '',
            klassen: (user.klassen || []).join(','),   // ✅ Klassen van leerkracht meenemen
            gender: user.gender || '',
            is_active: user.is_active,
            created_at: user.created_at?.toDate?.()?.toISOString() || ''
        }));
        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', `gebruikers_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Export succesvol!');
    };

    // =============================================
    // DELETE
    // =============================================
    const handleDelete = async (user) => {
        try {
            const token = await getAuthToken();
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ action: 'delete_user', userId: user.id })
            });
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Kon niet verwijderen');
            }
            toast.success('Gebruiker verwijderd');
            loadUsers();
        } catch (error) {
            toast.error('Fout bij verwijderen: ' + error.message);
        }
    };

    const handleOpenModal = (type, data = null, role = null) => setModal({ type, data, role });
    const handleCloseModal = () => setModal({ type: null, data: null, role: null });
    const handleUserSaved = () => loadUsers();

    // =============================================
    // TOEGANGSGUARD — Gebruikersbeheer tijdelijk verborgen
    // (na alle hooks geplaatst i.v.m. rules of hooks)
    // =============================================
    if (!heeftToegang) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
                    <ShieldCheckIcon className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-gray-800 mb-2">Gebruikersbeheer niet beschikbaar</h1>
                    <p className="text-sm text-gray-500">
                        Deze module is tijdelijk uitgeschakeld. Gebruikers worden
                        centraal beheerd. Neem contact op met de beheerder als je
                        toegang nodig hebt.
                    </p>
                </div>
            </div>
        );
    }

    // =============================================
    // RENDER
    // =============================================
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
                                <p className="text-xs">
                                    Namen worden encrypted opgeslagen. Leerkrachten zien alleen leerlingen
                                    van hun toegewezen klassen. Gebruik het <BookOpenIcon className="inline h-3 w-3" /> icoontje
                                    om klassen toe te wijzen aan leerkrachten.
                                </p>
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
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Klas / Klassen</th>
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
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                    user.rol === 'leerling'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : user.rol === 'leerkracht'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-purple-100 text-purple-800'
                                                }`}>
                                                    {user.rol}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.rol === 'leerling' ? (
                                                    // Leerling: toon klas
                                                    <span className="text-sm text-gray-600">{user.klas || '-'}</span>
                                                ) : user.rol === 'leerkracht' ? (
                                                    // Leerkracht: toon toegewezen klassen
                                                    <div className="flex flex-wrap gap-1">
                                                        {(user.klassen || []).length > 0 ? (
                                                            user.klassen.map(k => (
                                                                <span key={k} className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                                                                    {k}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-orange-500 italic">
                                                                ⚠️ Geen klassen
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-400">-</span>
                                                )}
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
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <MobileActionButtons
                                                    user={user}
                                                    onEdit={() => handleOpenModal('form', user)}
                                                    onDelete={() => handleOpenModal('confirm', user)}
                                                    onKlassenToewijzen={() => setKlassenModal({ open: true, leerkracht: user })}
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

            {/* MODALS */}
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
                onConfirm={() => { handleDelete(modal.data); handleCloseModal(); }}
                title="Gebruiker verwijderen"
                message="Weet je zeker dat je deze gebruiker wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt."
            />

            {/* ✅ NIEUW: Klassen toewijzen modal */}
            <KlassenModal
                isOpen={klassenModal.open}
                onClose={() => setKlassenModal({ open: false, leerkracht: null })}
                leerkracht={klassenModal.leerkracht}
                alleKlassen={uniqueKlassen}
                onSaved={loadUsers}
            />
        </div>
    );
}