// src/components/SchoolFormModal.jsx
import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { db } from '../firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { BuildingOffice2Icon, MapPinIcon } from '@heroicons/react/24/outline';

export default function SchoolFormModal({ isOpen, onClose, schoolData }) {
    const [formData, setFormData] = useState({ naam: '', stad: '' });
    const [loading, setLoading] = useState(false);

    const isEditing = !!schoolData;

    useEffect(() => {
        if (isOpen) {
            if (isEditing) {
                setFormData({
                    naam: schoolData.naam || '',
                    stad: schoolData.stad || '',
                });
            } else {
                setFormData({ naam: '', stad: '' });
            }
        }
    }, [schoolData, isEditing, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.naam || !formData.stad) {
            return toast.error("Vul alle velden in.");
        }

        setLoading(true);
        const toastId = toast.loading(isEditing ? 'School bijwerken...' : 'School toevoegen...');

        const schoolObject = {
            naam: formData.naam.trim(),
            stad: formData.stad.trim(),
        };

        try {
            if (isEditing) {
                const schoolRef = doc(db, 'scholen', schoolData.id);
                await updateDoc(schoolRef, schoolObject);
            } else {
                const schoolId = formData.naam.trim().toLowerCase().replace(/\s+/g, '_');
                const schoolRef = doc(db, 'scholen', schoolId);
                await setDoc(schoolRef, schoolObject);
            }
            toast.success(`School succesvol ${isEditing ? 'bijgewerkt' : 'toegevoegd'}!`);
            onClose();
        } catch (error) {
            console.error("Fout bij opslaan school:", error);
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
                        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <Dialog.Panel className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all">
                                <form onSubmit={handleSubmit}>
                                    {/* --- AANGEPAST: Consistente header toegevoegd --- */}
                                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                                <BuildingOffice2Icon className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <Dialog.Title as="h3" className="text-xl font-semibold text-white">
                                                    {isEditing ? "School Bewerken" : "Nieuwe School Toevoegen"}
                                                </Dialog.Title>
                                            </div>
                                        </div>
                                    </div>

                                    {/* --- AANGEPAST: Body met consistente padding en input-stijl --- */}
                                    <div className="px-6 py-6 space-y-4">
                                        <div>
                                            <label htmlFor="naam" className="block text-sm font-medium text-gray-700 mb-2">Naam van de school</label>
                                            <input type="text" name="naam" id="naam" value={formData.naam} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-300 rounded-xl" placeholder="bv. KA Beveren" />
                                        </div>
                                        <div>
                                            <label htmlFor="stad" className="block text-sm font-medium text-gray-700 mb-2">Stad</label>
                                            <input type="text" name="stad" id="stad" value={formData.stad} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-300 rounded-xl" placeholder="bv. Beveren" />
                                        </div>
                                    </div>
                                    
                                    {/* --- AANGEPAST: Consistente footer en knoppen --- */}
                                    <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row gap-3 sm:justify-end">
                                        <button type="button" onClick={onClose} className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100">
                                            Annuleren
                                        </button>
                                        <button type="submit" disabled={loading} className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-xl disabled:opacity-50">
                                            {loading ? "Opslaan..." : "Opslaan"}
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