// src/components/UserFormModal.jsx
import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { db } from '../firebase';
import { doc, setDoc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { 
    UserIcon, 
    BuildingOfficeIcon,
    ShieldCheckIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

// Helper functies
const capitalize = (s) => s && s.charAt(0).toUpperCase() + s.slice(1);


export default function UserFormModal({ 
    isOpen, 
    onClose, 
    onUserSaved, 
    userData, 
    schoolId, 
    role, 
    currentUserProfile, 
    schoolSettings
}) {
    const [formData, setFormData] = useState({
        naam: '',
        smartschool_user_id: '',
        klas: '',
        gender: 'M',
        school_id: ''
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [schools, setSchools] = useState([]);
    const [loadingSchools, setLoadingSchools] = useState(false);

    const isEditing = !!userData;
    const currentUserRole = isEditing ? userData?.rol : role;
    const isSuperAdmin = currentUserProfile?.rol === 'super_admin';

    // Haal scholen op voor super-administrators
    useEffect(() => {
        if (isOpen && isSuperAdmin && !isEditing) {
            fetchSchools();
        }
    }, [isOpen, isSuperAdmin, isEditing]);

    // Reset form bij openen
    useEffect(() => {
        if (isOpen) {
            if (userData) {
                // Editing mode - alleen klas en gender kunnen bewerkt worden
                setFormData({
                    naam: '', // Naam is encrypted, kan niet getoond worden
                    smartschool_user_id: '', // Kan niet bewerkt worden
                    klas: userData.klas || '',
                    gender: userData.gender || 'M',
                    school_id: userData.school_id || ''
                });
            } else {
                // New user mode
                setFormData({
                    naam: '',
                    smartschool_user_id: '',
                    klas: '',
                    gender: 'M',
                    school_id: isSuperAdmin ? '' : schoolId
                });
            }
            setErrors({});
        }
    }, [isOpen, userData, schoolId, role, isSuperAdmin]);

    const fetchSchools = async () => {
        setLoadingSchools(true);
        try {
            const q = query(collection(db, 'scholen'), orderBy('naam'));
            const snapshot = await getDocs(q);
            const schoolsData = snapshot.docs.map(doc => ({
                id: doc.id,
                naam: doc.data().naam
            }));
            setSchools(schoolsData);
        } catch (error) {
            console.error('Fout bij ophalen scholen:', error);
            toast.error('Kon scholen niet laden');
        } finally {
            setLoadingSchools(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Clear error voor dit veld
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        // Naam validatie (alleen voor nieuwe users)
        if (!isEditing && (!formData.naam.trim() || formData.naam.trim().length < 2)) {
            newErrors.naam = 'Naam is verplicht (min 2 tekens)';
        }

        // Smartschool User ID validatie (alleen bij nieuwe users)
        if (!isEditing && !formData.smartschool_user_id.trim()) {
            newErrors.smartschool_user_id = 'Smartschool User ID is verplicht';
        }

        // School validatie voor super-admin
        if (isSuperAdmin && !formData.school_id) {
            newErrors.school_id = 'Selecteer een school';
        }

        // Klas validatie voor leerlingen
        if (currentUserRole === 'leerling' && !formData.klas.trim()) {
            newErrors.klas = 'Klas is verplicht voor leerlingen';
        }

        // Gender validatie voor leerlingen
        if (currentUserRole === 'leerling' && !['M', 'V', 'X'].includes(formData.gender)) {
            newErrors.gender = 'Geldig gender is verplicht (M, V of X)';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            toast.error("Corrigeer de fouten in het formulier");
            return;
        }

        // De masterKey is hier niet meer nodig.
        // if (!masterKey && !isEditing) { ... } // <-- VERWIJDER DEZE CHECK

        setLoading(true);
        const loadingToast = toast.loading(isEditing ? 'Bijwerken...' : 'Toevoegen...');
        
        try {
            // Data die we naar de server sturen
            const targetSchoolId = isSuperAdmin ? formData.school_id : schoolId;
            const apiPayload = {
                formData: formData, // De (onversleutelde) formulierdata
                currentUserRole: currentUserRole,
                targetSchoolId: targetSchoolId,
                currentUserProfileHash: currentUserProfile?.smartschool_id_hash
            };

            // Als we bewerken, stuur dit naar een andere API (nog te maken)
            if (isEditing) {
                // TODO: Maak een 'api/updateUser.js' die alleen klas/gender bijwerkt
                // Voor nu focussen we op de 'create' flow.
                // Gooi een error als men probeert te editen:
                if (isEditing) {
                     throw new Error("Bewerken is nog niet geïmplementeerd met de veilige API-route");
                }
            }

            // Roep de nieuwe, veilige API route aan
            const response = await fetch('/api/createUser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(apiPayload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Er is iets misgegaan');
            }
            
            toast.dismiss(loadingToast);
            toast.success(`${capitalize(currentUserRole)} succesvol toegevoegd!`);
            onUserSaved();
            onClose();

        } catch (error) {
            console.error('Save error:', error);
            toast.dismiss(loadingToast);
            toast.error('Fout bij opslaan: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                                <form onSubmit={handleSubmit}>
                                    {/* Header */}
                                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                                <UserIcon className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="text-left">
                                                <Dialog.Title as="h3" className="text-xl font-semibold text-white">
                                                    {isEditing ? `Gebruiker Bewerken` : `Nieuwe ${capitalize(currentUserRole)} Toevoegen`}
                                                </Dialog.Title>
                                                {isEditing && userData?.id && (
                                                    <p className="text-sm text-white/80 font-mono mt-1">
                                                        ID: {userData.id.substring(0, 16)}...
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Privacy Notice */}
                                    <div className="px-6 pt-6">
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                            <div className="flex items-start gap-3">
                                                <ShieldCheckIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                                <div className="text-sm text-blue-800">
                                                    {isEditing ? (
                                                        <p>Bij bewerken kunnen alleen <strong>klas</strong> en <strong>gender</strong> worden aangepast. Namen blijven encrypted.</p>
                                                    ) : (
                                                        <>
                                                            <p className="font-semibold mb-1">🔒 Privacy-Veilig Systeem</p>
                                                            <ul className="text-xs space-y-1">
                                                                <li>• Naam wordt encrypted opgeslagen (AES-256-GCM)</li>
                                                                <li>• Smartschool ID wordt gehashed (SHA-256)</li>
                                                                <li>• Hash wordt gebruikt als document ID</li>
                                                            </ul>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-6 py-6 space-y-6">
                                        {/* Smartschool User ID - alleen bij nieuwe users */}
                                        {!isEditing && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Smartschool User ID *
                                                </label>
                                                <input 
                                                    type="text" 
                                                    name="smartschool_user_id" 
                                                    value={formData.smartschool_user_id} 
                                                    onChange={handleInputChange} 
                                                    placeholder="Bijv: Vm0cswf4KjN8yRuhBeaZHA=="
                                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 font-mono text-sm ${errors.smartschool_user_id ? 'border-red-300' : 'border-gray-300'}`} 
                                                />
                                                {errors.smartschool_user_id && <p className="mt-1 text-sm text-red-600">{errors.smartschool_user_id}</p>}
                                                <div className="mt-2 flex items-start gap-2 text-xs text-gray-500">
                                                    <InformationCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                                    <span>Haal dit op uit Smartschool export of OAuth response. Dit wordt gehashed en gebruikt als unieke identifier.</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Naam - alleen bij nieuwe users */}
                                        {!isEditing && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Volledige Naam (Voor- en Achternaam) *
                                                </label>
                                                <input 
                                                    type="text" 
                                                    name="naam" 
                                                    value={formData.naam} 
                                                    onChange={handleInputChange} 
                                                    placeholder="Bijv: Jan Janssens"
                                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${errors.naam ? 'border-red-300' : 'border-gray-300'}`} 
                                                />
                                                {errors.naam && <p className="mt-1 text-sm text-red-600">{errors.naam}</p>}
                                                <p className="mt-1 text-xs text-gray-500">
                                                    🔒 Wordt encrypted opgeslagen en alleen zichtbaar voor leerkrachten met master key
                                                </p>
                                            </div>
                                        )}

                                        {/* School selector - alleen voor super-administrators bij nieuwe gebruikers */}
                                        {!isEditing && isSuperAdmin && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">School *</label>
                                                <div className="relative">
                                                    <BuildingOfficeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                    <select 
                                                        name="school_id" 
                                                        value={formData.school_id} 
                                                        onChange={handleInputChange}
                                                        disabled={loadingSchools}
                                                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${errors.school_id ? 'border-red-300' : 'border-gray-300'}`}
                                                    >
                                                        <option value="">
                                                            {loadingSchools ? 'Scholen laden...' : 'Selecteer een school'}
                                                        </option>
                                                        {schools.map(school => (
                                                            <option key={school.id} value={school.id}>
                                                                {school.naam}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {errors.school_id && <p className="mt-1 text-sm text-red-600">{errors.school_id}</p>}
                                                <p className="mt-1 text-xs text-gray-500">Als super-administrator kunt u gebruikers voor elke school aanmaken</p>
                                            </div>
                                        )}

                                        {/* Info voor bestaande gebruikers */}
                                        {isEditing && isSuperAdmin && (
                                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                                <div className="flex items-center space-x-2">
                                                    <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
                                                    <p className="text-sm text-blue-800">
                                                        School en Smartschool User ID kunnen niet worden gewijzigd bij bestaande gebruikers
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Klas - alleen voor leerlingen */}
                                        {currentUserRole === 'leerling' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Klas *
                                                </label>
                                                <input 
                                                    type="text" 
                                                    name="klas" 
                                                    value={formData.klas} 
                                                    onChange={handleInputChange} 
                                                    placeholder="Bijv: 3A, 4B"
                                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${errors.klas ? 'border-red-300' : 'border-gray-300'}`} 
                                                />
                                                {errors.klas && <p className="mt-1 text-sm text-red-600">{errors.klas}</p>}
                                                <p className="mt-1 text-xs text-gray-500">
                                                    Gebruikt voor grade-based normen en filtering
                                                </p>
                                            </div>
                                        )}

                                        {/* Gender - alleen voor leerlingen */}
                                        {currentUserRole === 'leerling' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Gender *
                                                </label>
                                                <select 
                                                    name="gender" 
                                                    value={formData.gender} 
                                                    onChange={handleInputChange} 
                                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${errors.gender ? 'border-red-300' : 'border-gray-300'}`}
                                                >
                                                    <option value="M">Mannelijk (M)</option>
                                                    <option value="V">Vrouwelijk (V)</option>
                                                    <option value="X">X / Anders</option>
                                                </select>
                                                {errors.gender && <p className="mt-1 text-sm text-red-600">{errors.gender}</p>}
                                                <p className="mt-1 text-xs text-gray-500">
                                                    Nodig voor grade-based normen (geen geboortedatum meer gebruikt)
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer Buttons */}
                                    <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row gap-3 sm:justify-end">
                                        <button 
                                            type="button" 
                                            onClick={onClose} 
                                            disabled={loading}
                                            className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
                                        >
                                            Annuleren
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={loading} 
                                            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-xl disabled:opacity-50 hover:from-purple-700 hover:to-blue-700 transition-all"
                                        >
                                            {loading ? (
                                                <span className="flex items-center justify-center">
                                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Opslaan...
                                                </span>
                                            ) : (
                                                isEditing ? 'Wijzigingen Opslaan' : `${capitalize(currentUserRole)} Toevoegen`
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}