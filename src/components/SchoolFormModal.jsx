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
                // Maak een ID van de schoolnaam, bv. "KA Beveren" -> "ka_beveren"
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
                            <Dialog.Panel className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-gray-900 mb-4">
                                    {isEditing ? "School Bewerken" : "Nieuwe School Toevoegen"}
                                </Dialog.Title>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label htmlFor="naam" className="block text-sm font-medium text-gray-700">Naam van de school</label>
                                        <div className="relative mt-1">
                                            <BuildingOffice2Icon className="pointer-events-none absolute top-3.5 left-4 h-5 w-5 text-gray-400" />
                                            <input type="text" name="naam" id="naam" value={formData.naam} onChange={handleChange} required className="w-full rounded-xl border-gray-300 py-3 pl-11 shadow-sm" placeholder="bv. KA Beveren" />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="stad" className="block text-sm font-medium text-gray-700">Stad</label>
                                        <div className="relative mt-1">
                                            <MapPinIcon className="pointer-events-none absolute top-3.5 left-4 h-5 w-5 text-gray-400" />
                                            <input type="text" name="stad" id="stad" value={formData.stad} onChange={handleChange} required className="w-full rounded-xl border-gray-300 py-3 pl-11 shadow-sm" placeholder="bv. Beveren" />
                                        </div>
                                    </div>
                                    <div className="pt-4 flex justify-end gap-3">
                                        <button type="button" onClick={onClose} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Annuleren</button>
                                        <button type="submit" disabled={loading} className="rounded-xl border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
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