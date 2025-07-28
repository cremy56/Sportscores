// src/components/StudentFormModal.jsx
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
    CheckCircleIcon 
} from '@heroicons/react/24/outline';

// Helper-functie om de datum correct te formatteren voor het <input type="date"> veld
const formatDateForInput = (date) => {
    if (!date) return '';
    
    let d;
    // Controleer of het een Firestore Timestamp-object is
    if (date.toDate) {
        d = date.toDate();
    } 
    // Probeer het te parsen als het een string of een Date-object is
    else {
        d = new Date(date);
    }

    // Controleer op een ongeldige datum
    if (isNaN(d.getTime())) {
        return '';
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Maanden zijn 0-gebaseerd
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
};

// Helper-functie om leeftijd te berekenen
const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
};

// Helper-functie om e-mail te valideren
const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

export default function StudentFormModal({ isOpen, onClose, onStudentSaved, studentData, schoolId }) {
    const [formData, setFormData] = useState({
        naam: '',
        email: '',
        geboortedatum: '',
        geslacht: 'M'
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [emailExists, setEmailExists] = useState(false);
    const [checkingEmail, setCheckingEmail] = useState(false);

    const isEditing = !!studentData;

    useEffect(() => {
        if (isOpen) {
            if (isEditing) {
                setFormData({
                    naam: studentData.naam || '',
                    email: studentData.email || '',
                    geboortedatum: formatDateForInput(studentData.geboortedatum),
                    geslacht: studentData.geslacht || 'M',
                });
            } else {
                setFormData({
                    naam: '',
                    email: '',
                    geboortedatum: '',
                    geslacht: 'M'
                });
            }
            setErrors({});
            setEmailExists(false);
        }
    }, [studentData, isEditing, isOpen]);

    // Validatie functie
    const validateForm = () => {
        const newErrors = {};

        if (!formData.naam.trim()) {
            newErrors.naam = 'Naam is verplicht';
        } else if (formData.naam.trim().length < 2) {
            newErrors.naam = 'Naam moet minimaal 2 karakters bevatten';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'E-mail is verplicht';
        } else if (!validateEmail(formData.email)) {
            newErrors.email = 'Voer een geldig e-mailadres in';
        }

        if (formData.geboortedatum) {
            const age = calculateAge(formData.geboortedatum);
            if (age !== null && (age < 4 || age > 25)) {
                newErrors.geboortedatum = 'Leeftijd moet tussen 4 en 25 jaar zijn';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Check of e-mail al bestaat
    const checkEmailExists = async (email) => {
        if (!email || !validateEmail(email) || isEditing) return;
        
        setCheckingEmail(true);
        try {
            const docRef = doc(db, 'toegestane_gebruikers', email);
            const docSnap = await getDoc(docRef);
            setEmailExists(docSnap.exists());
        } catch (error) {
            console.error('Error checking email:', error);
        } finally {
            setCheckingEmail(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Clear error voor dit veld
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }

        // Check email duplicaat met debounce
        if (name === 'email' && value !== studentData?.email) {
            setEmailExists(false);
            if (value) {
                const timeoutId = setTimeout(() => checkEmailExists(value), 500);
                return () => clearTimeout(timeoutId);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm() || emailExists) {
            toast.error("Corrigeer de fouten in het formulier.");
            return;
        }

        setLoading(true);
        const loadingToast = toast.loading(isEditing ? 'Leerling bijwerken...' : 'Leerling toevoegen...');

        const studentObject = {
            ...formData,
            naam: formData.naam.trim(),
            email: formData.email.trim().toLowerCase(),
            rol: 'leerling',
            school_id: schoolId,
            naam_keywords: formData.naam.toLowerCase().split(' '),
            updated_at: new Date(),
            ...(isEditing ? {} : { created_at: new Date() })
        };

        try {
            if (isEditing) {
                const { email, ...updateData } = studentObject;
                const studentRef = doc(db, 'toegestane_gebruikers', studentData.id);
                await updateDoc(studentRef, updateData);
            } else {
                const studentRef = doc(db, 'toegestane_gebruikers', formData.email.trim().toLowerCase());
                await setDoc(studentRef, studentObject);
            }
            
            toast.success(`Leerling succesvol ${isEditing ? 'bijgewerkt' : 'toegevoegd'}!`);
            onStudentSaved();
            onClose();
        } catch (error) {
            console.error("Fout bij opslaan leerling:", error);
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
                <Transition.Child 
                    as={Fragment} 
                    enter="ease-out duration-300" 
                    enterFrom="opacity-0" 
                    enterTo="opacity-100" 
                    leave="ease-in duration-200" 
                    leaveFrom="opacity-100" 
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child 
                            as={Fragment} 
                            enter="ease-out duration-300" 
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" 
                            enterTo="opacity-100 translate-y-0 sm:scale-100" 
                            leave="ease-in duration-200" 
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100" 
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
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
                                                    {isEditing ? "Leerling Bewerken" : "Nieuwe Leerling Toevoegen"}
                                                </Dialog.Title>
                                                <p className="text-purple-100 text-sm">
                                                    {isEditing ? "Wijzig de gegevens van de leerling" : "Voeg een nieuwe leerling toe aan uw school"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Form Content */}
                                    <div className="px-6 py-6 space-y-6">
                                        {/* Naam */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                <UserIcon className="w-4 h-4 inline mr-2" />
                                                Volledige naam *
                                            </label>
                                            <input 
                                                type="text" 
                                                name="naam" 
                                                value={formData.naam} 
                                                onChange={handleChange} 
                                                required 
                                                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                                                    errors.naam ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                                }`}
                                                placeholder="Bijv. Jan Janssen"
                                            />
                                            {errors.naam && (
                                                <p className="mt-1 text-sm text-red-600 flex items-center">
                                                    <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                                                    {errors.naam}
                                                </p>
                                            )}
                                        </div>

                                        {/* E-mail */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                <EnvelopeIcon className="w-4 h-4 inline mr-2" />
                                                E-mailadres *
                                            </label>
                                            <div className="relative">
                                                <input 
                                                    type="email" 
                                                    name="email" 
                                                    value={formData.email} 
                                                    onChange={handleChange} 
                                                    required 
                                                    disabled={isEditing}
                                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                                                        errors.email || emailExists ? 'border-red-300 bg-red-50' : 
                                                        isEditing ? 'border-gray-200 bg-gray-50' : 'border-gray-300'
                                                    }`}
                                                    placeholder="bijv. jan.janssen@school.nl"
                                                />
                                                {checkingEmail && (
                                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                                                    </div>
                                                )}
                                                {!checkingEmail && formData.email && !errors.email && !emailExists && !isEditing && (
                                                    <CheckCircleIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
                                                )}
                                            </div>
                                            {errors.email && (
                                                <p className="mt-1 text-sm text-red-600 flex items-center">
                                                    <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                                                    {errors.email}
                                                </p>
                                            )}
                                            {emailExists && (
                                                <p className="mt-1 text-sm text-red-600 flex items-center">
                                                    <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                                                    Dit e-mailadres is al in gebruik
                                                </p>
                                            )}
                                            {isEditing && (
                                                <p className="mt-1 text-xs text-gray-500">
                                                    E-mailadres kan niet worden gewijzigd na aanmaken
                                                </p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            {/* Geboortedatum */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    <CalendarIcon className="w-4 h-4 inline mr-2" />
                                                    Geboortedatum
                                                </label>
                                                <input 
                                                    type="date" 
                                                    name="geboortedatum" 
                                                    value={formData.geboortedatum} 
                                                    onChange={handleChange} 
                                                    max={new Date().toISOString().split('T')[0]}
                                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                                                        errors.geboortedatum ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                                    }`}
                                                />
                                                {age !== null && (
                                                    <p className="mt-1 text-sm text-gray-600">
                                                        Leeftijd: {age} jaar
                                                    </p>
                                                )}
                                                {errors.geboortedatum && (
                                                    <p className="mt-1 text-sm text-red-600 flex items-center">
                                                        <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                                                        {errors.geboortedatum}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Geslacht */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    <UserGroupIcon className="w-4 h-4 inline mr-2" />
                                                    Geslacht
                                                </label>
                                                <select 
                                                    name="geslacht" 
                                                    value={formData.geslacht} 
                                                    onChange={handleChange} 
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                                >
                                                    <option value="M">Mannelijk</option>
                                                    <option value="V">Vrouwelijk</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Info box */}
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                            <div className="flex items-start space-x-3">
                                                <div className="flex-shrink-0">
                                                    <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div className="text-sm text-blue-800">
                                                    <p className="font-medium mb-1">Let op:</p>
                                                    <ul className="space-y-1 text-xs">
                                                        <li>• Het e-mailadres wordt gebruikt als unieke identificatie</li>
                                                        <li>• Alle velden met een * zijn verplicht</li>
                                                        <li>• De geboortedatum wordt gebruikt voor leeftijdsgebonden normen</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row gap-3 sm:justify-end">
                                        <button 
                                            type="button" 
                                            onClick={onClose} 
                                            className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                                        >
                                            Annuleren
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={loading || emailExists || Object.keys(errors).length > 0} 
                                            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                                        >
                                            {loading ? (
                                                <div className="flex items-center justify-center space-x-2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    <span>Opslaan...</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center space-x-2">
                                                    <CheckCircleIcon className="w-5 h-5" />
                                                    <span>{isEditing ? 'Bijwerken' : 'Toevoegen'}</span>
                                                </div>
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