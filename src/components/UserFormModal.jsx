// src/components/UserFormModal.jsx
import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { 
    UserIcon, 
    EnvelopeIcon, 
    CalendarIcon, 
    UserGroupIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    AtSymbolIcon
} from '@heroicons/react/24/outline';

// Helper-functies
const formatDateForInput = (date) => {
    if (!date) return '';
    let d = date.toDate ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validateUsername = (username) => username && username.trim().length >= 3 && /^[a-zA-Z0-9._-]+$/.test(username.trim());
const capitalize = (s) => s && s.charAt(0).toUpperCase() + s.slice(1);

// Helper functie om identifier te bepalen
const getIdentifier = (formData) => {
    if (formData.smartschool_username && formData.smartschool_username.trim()) {
        return formData.smartschool_username.trim();
    }
    if (formData.email && formData.email.trim()) {
        return formData.email.trim().toLowerCase();
    }
    return null;
};

export default function UserFormModal({ isOpen, onClose, onUserSaved, userData, schoolId, role, currentUserProfile, schoolSettings }) {
    const [formData, setFormData] = useState({
        naam: '',
        email: '',
        smartschool_username: '',
        geboortedatum: '',
        geslacht: 'M',
        login_type: 'email' // 'email' of 'smartschool'
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [identifierExists, setIdentifierExists] = useState(false);
    const [checkingIdentifier, setCheckingIdentifier] = useState(false);

    const isEditing = !!userData;
    const currentUserRole = isEditing ? userData?.rol : role;
    
    // Bepaal welke login types beschikbaar zijn
    const getAvailableLoginTypes = () => {
        // Super-administrator kan altijd beide kiezen
        if (currentUserProfile?.rol === 'super-administrator') {
            return ['email', 'smartschool'];
        }
        
        // Voor andere administrators: check school instellingen
        if (schoolSettings?.auth_method) {
            return [schoolSettings.auth_method];
        }
        
        // Fallback naar email als er geen instelling is
        return ['email'];
    };
    
    const availableLoginTypes = getAvailableLoginTypes();
    const canChooseLoginType = availableLoginTypes.length > 1;

    useEffect(() => {
        if (isOpen) {
            if (isEditing) {
                // Bij bewerken: bepaal welk type login de gebruiker heeft
                const hasEmail = userData.email && userData.email.trim();
                const hasUsername = userData.smartschool_username && userData.smartschool_username.trim();
                
                setFormData({
                    naam: userData.naam || '',
                    email: userData.email || '',
                    smartschool_username: userData.smartschool_username || '',
                    geboortedatum: formatDateForInput(userData.geboortedatum),
                    geslacht: userData.geslacht || 'M',
                    login_type: hasUsername ? 'smartschool' : 'email'
                });
            } else {
                // Reset formulier voor een nieuwe gebruiker
                // Stel login_type in op de eerste beschikbare optie
                const defaultLoginType = availableLoginTypes.includes('email') ? 'email' : availableLoginTypes[0];
                
                setFormData({
                    naam: '',
                    email: '',
                    smartschool_username: '',
                    geboortedatum: '',
                    geslacht: 'M',
                    login_type: defaultLoginType
                });
            }
            setErrors({});
            setIdentifierExists(false);
        }
    }, [userData, isEditing, isOpen, availableLoginTypes]);

    const validateForm = () => {
        const newErrors = {};
        
        // Naam validatie
        if (!formData.naam.trim() || formData.naam.trim().length < 2) {
            newErrors.naam = 'Naam is verplicht en moet minimaal 2 karakters bevatten';
        }

        // Login type validatie - alleen voor beschikbare types
        if (formData.login_type === 'email' && availableLoginTypes.includes('email')) {
            if (!formData.email.trim() || !validateEmail(formData.email)) {
                newErrors.email = 'Een geldig e-mailadres is verplicht';
            }
        } else if (formData.login_type === 'smartschool' && availableLoginTypes.includes('smartschool')) {
            if (!formData.smartschool_username.trim() || !validateUsername(formData.smartschool_username)) {
                newErrors.smartschool_username = 'Een geldige Smartschool username is verplicht (minimaal 3 karakters, alleen letters, cijfers, punten, underscores en streepjes)';
            }
        }

        // Leeftijdvalidatie alleen voor leerlingen
        if (currentUserRole === 'leerling' && formData.geboortedatum) {
            const age = calculateAge(formData.geboortedatum);
            if (age !== null && (age < 4 || age > 25)) {
                newErrors.geboortedatum = 'Leeftijd moet tussen 4 en 25 jaar zijn';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const checkIdentifierExists = async (identifier, type) => {
        if (!identifier || isEditing) return;
        
        // Valideer identifier eerst
        if (type === 'email' && !validateEmail(identifier)) return;
        if (type === 'smartschool' && !validateUsername(identifier)) return;
        
        setCheckingIdentifier(true);
        try {
            const docRef = doc(db, 'toegestane_gebruikers', identifier);
            const docSnap = await getDoc(docRef);
            setIdentifierExists(docSnap.exists());
        } catch (error) {
            console.error('Error checking identifier:', error);
        } finally {
            setCheckingIdentifier(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Update form data eerst
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));

        // Reset andere velden wanneer login type verandert
        if (name === 'login_type') {
            setIdentifierExists(false);
            if (value === 'email') {
                setFormData(prev => ({ ...prev, smartschool_username: '', [name]: value }));
            } else {
                setFormData(prev => ({ ...prev, email: '', [name]: value }));
            }
            return; // Stop hier voor login_type changes
        }

        // Check identifier wanneer het verandert (alleen bij nieuwe gebruikers)
        if (!isEditing && (name === 'email' || name === 'smartschool_username')) {
            setIdentifierExists(false);
            const timeoutId = setTimeout(() => {
                if (value) {
                    const type = name === 'email' ? 'email' : 'smartschool';
                    checkIdentifierExists(value, type);
                }
            }, 500);
            // Note: Deze timeout cleanup werkt alleen in useEffect, niet in event handlers
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm() || identifierExists) {
            toast.error("Corrigeer de fouten in het formulier.");
            return;
        }

        setLoading(true);
        const loadingToast = toast.loading(`${capitalize(currentUserRole)} ${isEditing ? 'bijwerken...' : 'toevoegen...'}`);

        // Bepaal de identifier voor het document
        const identifier = getIdentifier(formData);
        if (!identifier) {
            toast.error('Er moet een email of smartschool username worden opgegeven');
            setLoading(false);
            return;
        }

        const userObject = {
            naam: formData.naam.trim(),
            rol: currentUserRole,
            school_id: schoolId,
            naam_keywords: formData.naam.toLowerCase().split(' ').filter(Boolean),
            updated_at: new Date(),
        };

        // Voeg email toe als het wordt gebruikt
        if (formData.login_type === 'email' && formData.email.trim()) {
            userObject.email = formData.email.trim().toLowerCase();
        }

        // Voeg smartschool_username toe als het wordt gebruikt
        if (formData.login_type === 'smartschool' && formData.smartschool_username.trim()) {
            userObject.smartschool_username = formData.smartschool_username.trim();
        }
        
        // Voeg leerling-specifieke velden alleen toe als de rol 'leerling' is
        if (currentUserRole === 'leerling') {
            userObject.geslacht = formData.geslacht;
            userObject.geboortedatum = formData.geboortedatum ? new Date(formData.geboortedatum) : null;
        }
        
        if (!isEditing) {
            userObject.created_at = new Date();
        }

        try {
            if (isEditing) {
                // Bij bewerken: update bestaand document
                const { email, smartschool_username, ...updateData } = userObject;
                
                // Behoud bestaande identifier velden
                if (userData.email) updateData.email = userData.email;
                if (userData.smartschool_username) updateData.smartschool_username = userData.smartschool_username;
                
                const userRef = doc(db, 'toegestane_gebruikers', userData.id);
                await updateDoc(userRef, updateData);
            } else {
                // Bij nieuw aanmaken: gebruik identifier als document ID
                const userRef = doc(db, 'toegestane_gebruikers', identifier);
                await setDoc(userRef, userObject);
            }
            
            toast.success(`${capitalize(currentUserRole)} succesvol ${isEditing ? 'bijgewerkt' : 'toegevoegd'}!`);
            onUserSaved();
            onClose();
        } catch (error) {
            console.error(`Fout bij opslaan ${currentUserRole}:`, error);
            toast.error(`Fout: ${error.message}`);
        } finally {
            toast.dismiss(loadingToast);
            setLoading(false);
        }
    };

    const age = formData.geboortedatum ? calculateAge(formData.geboortedatum) : null;

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                {/* Overlay */}
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
                            <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                                <form onSubmit={handleSubmit}>
                                    {/* Header */}
                                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                                <UserIcon className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <Dialog.Title as="h3" className="text-xl font-semibold text-white">
                                                    {isEditing ? `Gebruiker Bewerken` : `Nieuwe ${capitalize(currentUserRole)} Toevoegen`}
                                                </Dialog.Title>
                                                <p className="text-purple-100 text-sm">
                                                    {isEditing ? `Wijzig de gegevens van ${userData?.naam}` : `Voeg een nieuwe ${currentUserRole} toe aan uw school`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Formulier velden */}
                                    <div className="px-6 py-6 space-y-6">
                                        {/* Naam */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Volledige naam *</label>
                                            <input 
                                                type="text" 
                                                name="naam" 
                                                value={formData.naam} 
                                                onChange={handleChange} 
                                                required 
                                                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${errors.naam ? 'border-red-300' : 'border-gray-300'}`} 
                                            />
                                            {errors.naam && <p className="mt-1 text-sm text-red-600">{errors.naam}</p>}
                                        </div>

                                        {/* Login Type Selector - alleen bij nieuwe gebruiker */}
                                        {!isEditing && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-3">Inlog methode *</label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <label className="cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="login_type"
                                                            value="email"
                                                            checked={formData.login_type === 'email'}
                                                            onChange={handleChange}
                                                            className="sr-only"
                                                        />
                                                        <div className={`p-4 border-2 rounded-xl transition-all ${formData.login_type === 'email' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                                            <div className="flex items-center space-x-3">
                                                                <EnvelopeIcon className={`w-6 h-6 ${formData.login_type === 'email' ? 'text-purple-600' : 'text-gray-400'}`} />
                                                                <div>
                                                                    <h4 className="font-semibold text-gray-900">E-mail</h4>
                                                                    <p className="text-sm text-gray-600">Traditionele e-mail login</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </label>
                                                    
                                                    <label className="cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="login_type"
                                                            value="smartschool"
                                                            checked={formData.login_type === 'smartschool'}
                                                            onChange={handleChange}
                                                            className="sr-only"
                                                        />
                                                        <div className={`p-4 border-2 rounded-xl transition-all ${formData.login_type === 'smartschool' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                                            <div className="flex items-center space-x-3">
                                                                <AtSymbolIcon className={`w-6 h-6 ${formData.login_type === 'smartschool' ? 'text-purple-600' : 'text-gray-400'}`} />
                                                                <div>
                                                                    <h4 className="font-semibold text-gray-900">Smartschool</h4>
                                                                    <p className="text-sm text-gray-600">Smartschool username</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        )}

                                        {/* Email veld */}
                                        {(formData.login_type === 'email' || (isEditing && userData?.email)) && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">E-mailadres *</label>
                                                <input 
                                                    type="email" 
                                                    name="email" 
                                                    value={formData.email} 
                                                    onChange={handleChange} 
                                                    required={formData.login_type === 'email'} 
                                                    disabled={isEditing} 
                                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${errors.email || (identifierExists && formData.login_type === 'email') ? 'border-red-300' : 'border-gray-300'} ${isEditing ? 'bg-gray-50' : ''}`} 
                                                />
                                                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                                                {identifierExists && formData.login_type === 'email' && <p className="mt-1 text-sm text-red-600">Dit e-mailadres is al in gebruik</p>}
                                                {isEditing && <p className="mt-1 text-xs text-gray-500">Login gegevens kunnen niet worden gewijzigd.</p>}
                                            </div>
                                        )}

                                        {/* Smartschool username veld */}
                                        {(formData.login_type === 'smartschool' || (isEditing && userData?.smartschool_username)) && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Smartschool Username *</label>
                                                <input 
                                                    type="text" 
                                                    name="smartschool_username" 
                                                    value={formData.smartschool_username} 
                                                    onChange={handleChange} 
                                                    required={formData.login_type === 'smartschool'} 
                                                    disabled={isEditing}
                                                    placeholder="bijv. jdoe123"
                                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${errors.smartschool_username || (identifierExists && formData.login_type === 'smartschool') ? 'border-red-300' : 'border-gray-300'} ${isEditing ? 'bg-gray-50' : ''}`} 
                                                />
                                                {errors.smartschool_username && <p className="mt-1 text-sm text-red-600">{errors.smartschool_username}</p>}
                                                {identifierExists && formData.login_type === 'smartschool' && <p className="mt-1 text-sm text-red-600">Deze username is al in gebruik</p>}
                                                {isEditing && <p className="mt-1 text-xs text-gray-500">Login gegevens kunnen niet worden gewijzigd.</p>}
                                                {!isEditing && <p className="mt-1 text-xs text-gray-500">Alleen letters, cijfers, punten, underscores en streepjes toegestaan</p>}
                                            </div>
                                        )}

                                        {/* Alleen voor Leerlingen */}
                                        {currentUserRole === 'leerling' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Geboortedatum</label>
                                                    <input 
                                                        type="date" 
                                                        name="geboortedatum" 
                                                        value={formData.geboortedatum} 
                                                        onChange={handleChange} 
                                                        max={new Date().toISOString().split('T')[0]} 
                                                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${errors.geboortedatum ? 'border-red-300' : 'border-gray-300'}`} 
                                                    />
                                                    {age !== null && <p className="mt-1 text-sm text-gray-600">Leeftijd: {age} jaar</p>}
                                                    {errors.geboortedatum && <p className="mt-1 text-sm text-red-600">{errors.geboortedatum}</p>}
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Geslacht</label>
                                                    <select 
                                                        name="geslacht" 
                                                        value={formData.geslacht} 
                                                        onChange={handleChange} 
                                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                                    >
                                                        <option value="M">Mannelijk</option>
                                                        <option value="V">Vrouwelijk</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer & Knoppen */}
                                    <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row gap-3 sm:justify-end">
                                        <button 
                                            type="button" 
                                            onClick={onClose} 
                                            className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100"
                                        >
                                            Annuleren
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={loading || checkingIdentifier || identifierExists} 
                                            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-xl disabled:opacity-50"
                                        >
                                            {loading ? 'Opslaan...' : isEditing ? 'Wijzigingen Opslaan' : `${capitalize(currentUserRole)} Toevoegen`}
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