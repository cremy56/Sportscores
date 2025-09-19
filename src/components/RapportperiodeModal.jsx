// src/components/RapportperiodeModal.jsx
import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { db } from '../firebase';
import { doc, setDoc, addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';

export default function RapportperiodeModal({ isOpen, onClose, schoolId, periodData }) {
    const [formData, setFormData] = useState({
        naam: '',
        startdatum: '',
        einddatum: '',
        doel_xp: 1000,
        schooljaar: '2023-2024',
        is_actief: false,
    });
    const [loading, setLoading] = useState(false);

    const isEditing = !!periodData;

    useEffect(() => {
        if (isOpen) {
            if (isEditing) {
                setFormData({
                    naam: periodData.naam || '',
                    // Converteer Firestore Timestamps naar YYYY-MM-DD formaat voor de input
                    startdatum: periodData.startdatum?.toDate().toISOString().split('T')[0] || '',
                    einddatum: periodData.einddatum?.toDate().toISOString().split('T')[0] || '',
                    doel_xp: periodData.doel_xp || 1000,
                    schooljaar: periodData.schooljaar || '2023-2024',
                    is_actief: periodData.is_actief || false,
                });
            } else {
                // Reset naar standaardwaarden voor een nieuwe periode
                setFormData({
                    naam: '',
                    startdatum: '',
                    einddatum: '',
                    doel_xp: 1000,
                    schooljaar: '2024-2025',
                    is_actief: false,
                });
            }
        }
    }, [periodData, isEditing, isOpen]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!schoolId || !formData.naam || !formData.startdatum || !formData.einddatum) {
            return toast.error("Vul alle verplichte velden in.");
        }

        setLoading(true);
        const toastId = toast.loading(isEditing ? 'Periode bijwerken...' : 'Periode opslaan...');

        const periodObject = {
            ...formData,
            doel_xp: Number(formData.doel_xp),
            // Converteer datums naar Firestore Timestamps
            startdatum: new Date(formData.startdatum),
            einddatum: new Date(formData.einddatum),
            last_updated_at: serverTimestamp()
        };

        try {
            const periodRef = isEditing
                ? doc(db, 'scholen', schoolId, 'rapportperioden', periodData.id)
                : collection(db, 'scholen', schoolId, 'rapportperioden');

            if (isEditing) {
                await updateDoc(periodRef, periodObject);
            } else {
                periodObject.created_at = serverTimestamp();
                await addDoc(periodRef, periodObject);
            }

            toast.success(`Periode succesvol ${isEditing ? 'bijgewerkt' : 'aangemaakt'}!`);
            onClose();
        } catch (error) {
            console.error("Fout bij opslaan periode:", error);
            toast.error(`Fout: ${error.message}`);
        } finally {
            toast.dismiss(toastId);
            setLoading(false);
        }
    };

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
                </Transition.Child>
                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Dialog.Panel as="form" onSubmit={handleSubmit} className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all">
                            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                        <CalendarIcon className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <Dialog.Title as="h3" className="text-xl font-semibold text-white">
                                            {isEditing ? "Rapportperiode Bewerken" : "Nieuwe Rapportperiode"}
                                        </Dialog.Title>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="naam" className="block text-sm font-medium text-gray-700 mb-2">Naam Periode</label>
                                        <input type="text" name="naam" id="naam" value={formData.naam} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-300 rounded-xl" placeholder="bv. Trimester 1" />
                                    </div>
                                    <div>
                                        <label htmlFor="schooljaar" className="block text-sm font-medium text-gray-700 mb-2">Schooljaar</label>
                                        <input type="text" name="schooljaar" id="schooljaar" value={formData.schooljaar} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-300 rounded-xl" placeholder="bv. 2024-2025" />
                                    </div>
                                    <div>
                                        <label htmlFor="startdatum" className="block text-sm font-medium text-gray-700 mb-2">Startdatum</label>
                                        <input type="date" name="startdatum" id="startdatum" value={formData.startdatum} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                                    </div>
                                    <div>
                                        <label htmlFor="einddatum" className="block text-sm font-medium text-gray-700 mb-2">Einddatum</label>
                                        <input type="date" name="einddatum" id="einddatum" value={formData.einddatum} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                                    </div>
                                    <div>
                                        <label htmlFor="doel_xp" className="block text-sm font-medium text-gray-700 mb-2">Doel XP</label>
                                        <input type="number" name="doel_xp" id="doel_xp" value={formData.doel_xp} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                                    </div>
                                    <div className="flex items-center justify-start pt-8">
                                        <input type="checkbox" name="is_actief" id="is_actief" checked={formData.is_actief} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                                        <label htmlFor="is_actief" className="ml-3 block text-sm font-medium text-gray-700">Actieve periode</label>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row gap-3 sm:justify-end">
                                <button type="button" onClick={onClose} className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100">
                                    Annuleren
                                </button>
                                <button type="submit" disabled={loading} className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-xl disabled:opacity-50 flex items-center justify-center space-x-2">
                                    {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                                    <span>{isEditing ? 'Wijzigingen Opslaan' : 'Periode Opslaan'}</span>
                                </button>
                            </div>
                        </Dialog.Panel>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}