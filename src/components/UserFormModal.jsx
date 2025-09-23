// src/components/UserFormModal.jsx
import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { 
    UserIcon, 
    EnvelopeIcon, 
    AtSymbolIcon,
    BuildingOfficeIcon
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

export default function UserFormModal({ isOpen, onClose, onUserSaved, userData, schoolId, role, currentUserProfile, schoolSettings }) {
    const [formData, setFormData] = useState({
        naam: '',
        email: '',
        smartschool_username: '',
        geboortedatum: '',
        geslacht: 'M',
        login_type: 'email',
        school_id: ''
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [schools, setSchools] = useState([]);
    const [loadingSchools, setLoadingSchools] = useState(false);
    const [currentSchoolSettings, setCurrentSchoolSettings] = useState(null);

    const isEditing = !!userData;
    const currentUserRole = isEditing ? userData?.rol : role;
    
    // Simpele logica zonder useMemo
    const isSuperAdmin = currentUserProfile?.rol === 'super-administrator';
    
    // Haal schoolinstellingen op als we een schoolId hebben maar geen schoolSettings
    useEffect(() => {
        const fetchSchoolSettings = async () => {
            // Als we al schoolSettings hebben via props, gebruik die
            if (schoolSettings) {
                setCurrentSchoolSettings(schoolSettings);
                return;
            }
            
            // Anders haal ze op via schoolId
            if (!schoolId || !isOpen) {
                setCurrentSchoolSettings(null);
                return;
            }
            
            try {
                console.log('Fetching settings for school:', schoolId);
                const schoolDoc = await getDoc(doc(db, 'scholen', schoolId));
                if (schoolDoc.exists()) {
                    const settings = schoolDoc.data().instellingen || {};
                    console.log('Fetched school settings:', settings);
                    setCurrentSchoolSettings(settings);
                } else {
                    console.log('School document not found');
                    setCurrentSchoolSettings({});
                }
            } catch (error) {
                console.error('Error fetching school settings:', error);
                setCurrentSchoolSettings({});
            }
        };

        fetchSchoolSettings();
    }, [schoolId, schoolSettings, isOpen]);

    // Bepaal beschikbare login types
    const schoolAuthMethod = currentSchoolSettings?.auth_method;
    console.log('Current role:', currentUserProfile?.rol);
    console.log('SchoolSettings:', currentSchoolSettings);
    console.log('SchoolAuthMethod:', schoolAuthMethod);
    
    let availableTypes = [];
    if (isSuperAdmin) {
        availableTypes = ['email', 'smartschool'];
    } else if (schoolAuthMethod) {
        availableTypes = [schoolAuthMethod];
    } else {
        availableTypes = ['email'];
    }
    
    console.log('Available types:', availableTypes);

    // Haal scholen op voor super-administrators
    useEffect(() => {
        const fetchSchools = async () => {
            if (!isSuperAdmin || !isOpen) return;
            
            setLoadingSchools(true);
            try {
                const schoolsQuery = query(collection(db, 'scholen'), orderBy('naam'));
                const schoolsSnapshot = await getDocs(schoolsQuery);
                const schoolsList = schoolsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    naam: doc.data().naam
                }));
                setSchools(schoolsList);
            } catch (error) {
                console.error('Error fetching schools:', error);
                toast.error('Kon scholen niet laden');
            } finally {
                setLoadingSchools(false);
            }
        };

        fetchSchools();
    }, [isSuperAdmin, isOpen]);

    // Initialize form data
    useEffect(() => {
        if (!isOpen) return;
        
        if (isEditing) {
            const hasUsername = userData.smartschool_username && userData.smartschool_username.trim();
            setFormData({
                naam: userData.naam || '',
                email: userData.email || '',
                smartschool_username: userData.smartschool_username || '',
                geboortedatum: formatDateForInput(userData.geboortedatum),
                geslacht: userData.geslacht || 'M',
                login_type: hasUsername ? 'smartschool' : 'email',
                school_id: userData.school_id || ''
            });
        } else {
            const defaultType = availableTypes.includes('email') ? 'email' : availableTypes[0];
            setFormData({
                naam: '',
                email: '',
                smartschool_username: '',
                geboortedatum: '',
                geslacht: 'M',
                login_type: defaultType,
                school_id: isSuperAdmin ? '' : schoolId || ''
            });
        }
        setErrors({});
    }, [isOpen, isEditing]); // Minimale dependencies

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleLoginTypeChange = (type) => {
        setFormData(prev => ({
            ...prev,
            login_type: type,
            email: type === 'smartschool' ? '' : prev.email,
            smartschool_username: type === 'email' ? '' : prev.smartschool_username
        }));
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.naam.trim() || formData.naam.trim().length < 2) {
            newErrors.naam = 'Naam is verplicht';
        }

        // School validatie voor super-admin
        if (isSuperAdmin && !formData.school_id) {
            newErrors.school_id = 'Selecteer een school';
        }

        if (formData.login_type === 'email' && (!formData.email.trim() || !validateEmail(formData.email))) {
            newErrors.email = 'Een geldig e-mailadres is verplicht';
        }
        
        if (formData.login_type === 'smartschool' && (!formData.smartschool_username.trim() || !validateUsername(formData.smartschool_username))) {
            newErrors.smartschool_username = 'Een geldige username is verplicht';
        }

        if (currentUserRole === 'leerling' && formData.geboortedatum) {
            const age = calculateAge(formData.geboortedatum);
            if (age !== null && (age < 4 || age > 25)) {
                newErrors.geboortedatum = 'Leeftijd moet tussen 4 en 25 jaar zijn';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            toast.error("Corrigeer de fouten");
            return;
        }

        setLoading(true);
        
        const identifier = formData.login_type === 'smartschool' 
            ? formData.smartschool_username.trim()
            : formData.email.trim().toLowerCase();

        const userObject = {
            naam: formData.naam.trim(),
            rol: currentUserRole,
            school_id: isSuperAdmin ? formData.school_id : schoolId,
            naam_keywords: formData.naam.toLowerCase().split(' ').filter(Boolean),
            updated_at: new Date(),
        };

        if (formData.login_type === 'email') {
            userObject.email = formData.email.trim().toLowerCase();
        } else {
            userObject.smartschool_username = formData.smartschool_username.trim();
        }
        
        if (currentUserRole === 'leerling') {
            userObject.geslacht = formData.geslacht;
            userObject.geboortedatum = formData.geboortedatum ? new Date(formData.geboortedatum) : null;
        }
        
        if (!isEditing) {
            userObject.created_at = new Date();
        }

        try {
            if (isEditing) {
                const userRef = doc(db, 'toegestane_gebruikers', userData.id);
                await updateDoc(userRef, userObject);
            } else {
                const userRef = doc(db, 'toegestane_gebruikers', identifier);
                await setDoc(userRef, userObject);
            }
            
            toast.success(`${capitalize(currentUserRole)} succesvol ${isEditing ? 'bijgewerkt' : 'toegevoegd'}!`);
            onUserSaved();
            onClose();
        } catch (error) {
            toast.error(`Fout: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const age = formData.geboortedatum ? calculateAge(formData.geboortedatum) : null;
    const canChooseType = availableTypes.length > 1;

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
                            <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                                <form onSubmit={handleSubmit}>
                                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                                <UserIcon className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <Dialog.Title as="h3" className="text-xl font-semibold text-white">
                                                    {isEditing ? `Gebruiker Bewerken` : `Nieuwe ${capitalize(currentUserRole)} Toevoegen`}
                                                </Dialog.Title>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-6 py-6 space-y-6">
                                        {/* Naam */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Volledige naam *</label>
                                            <input 
                                                type="text" 
                                                name="naam" 
                                                value={formData.naam} 
                                                onChange={handleInputChange} 
                                                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${errors.naam ? 'border-red-300' : 'border-gray-300'}`} 
                                            />
                                            {errors.naam && <p className="mt-1 text-sm text-red-600">{errors.naam}</p>}
                                        </div>

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
                                                        School kan niet worden gewijzigd bij bestaande gebruikers
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {!isEditing && canChooseType && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-3">Inlog methode *</label>
                                                <div className="space-y-3">
                                                    {availableTypes.includes('email') && (
                                                        <label className="flex items-center cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="login_type"
                                                                value="email"
                                                                checked={formData.login_type === 'email'}
                                                                onChange={(e) => handleLoginTypeChange(e.target.value)}
                                                                className="mr-3"
                                                            />
                                                            <EnvelopeIcon className="w-5 h-5 mr-2" />
                                                            <span>E-mail</span>
                                                        </label>
                                                    )}
                                                    {availableTypes.includes('smartschool') && (
                                                        <label className="flex items-center cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="login_type"
                                                                value="smartschool"
                                                                checked={formData.login_type === 'smartschool'}
                                                                onChange={(e) => handleLoginTypeChange(e.target.value)}
                                                                className="mr-3"
                                                            />
                                                            <AtSymbolIcon className="w-5 h-5 mr-2" />
                                                            <span>Smartschool</span>
                                                        </label>
                                                    )}
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
                                                    onChange={handleInputChange} 
                                                    disabled={isEditing}
                                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${errors.email ? 'border-red-300' : 'border-gray-300'} ${isEditing ? 'bg-gray-50' : ''}`} 
                                                />
                                                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                                            </div>
                                        )}

                                        {/* Username veld */}
                                        {(formData.login_type === 'smartschool' || (isEditing && userData?.smartschool_username)) && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Smartschool Username *</label>
                                                <input 
                                                    type="text" 
                                                    name="smartschool_username" 
                                                    value={formData.smartschool_username} 
                                                    onChange={handleInputChange} 
                                                    disabled={isEditing}
                                                    placeholder="bijv. jdoe123"
                                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${errors.smartschool_username ? 'border-red-300' : 'border-gray-300'} ${isEditing ? 'bg-gray-50' : ''}`} 
                                                />
                                                {errors.smartschool_username && <p className="mt-1 text-sm text-red-600">{errors.smartschool_username}</p>}
                                            </div>
                                        )}

                                        {/* Leerling velden */}
                                        {currentUserRole === 'leerling' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Geboortedatum</label>
                                                    <input 
                                                        type="date" 
                                                        name="geboortedatum" 
                                                        value={formData.geboortedatum} 
                                                        onChange={handleInputChange} 
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
                                                        onChange={handleInputChange} 
                                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                                    >
                                                        <option value="M">Mannelijk</option>
                                                        <option value="V">Vrouwelijk</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>

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
                                            disabled={loading} 
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