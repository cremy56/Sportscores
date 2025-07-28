// src/components/StudentFormModal.jsx
import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { db } from '../firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function StudentFormModal({ isOpen, onClose, onStudentSaved, studentData, schoolId }) {
    const [formData, setFormData] = useState({
        naam: '',
        email: '',
        geboortedatum: '',
        geslacht: 'M'
    });
    const [loading, setLoading] = useState(false);

    const isEditing = !!studentData;

    useEffect(() => {
        if (isOpen) {
            if (isEditing) {
                setFormData({
                    naam: studentData.naam || '',
                    email: studentData.email || '',
                    geboortedatum: studentData.geboortedatum || '',
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
        }
    }, [studentData, isEditing, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.naam || !formData.email) {
            toast.error("Naam en e-mail zijn verplicht.");
            return;
        }
        setLoading(true);
        const loadingToast = toast.loading('Leerling opslaan...');

        const studentObject = {
            ...formData,
            rol: 'leerling',
            school_id: schoolId,
            naam_keywords: formData.naam.toLowerCase().split(' ')
        };

        try {
            if (isEditing) {
                // Bij bewerken kunnen we de email (ID) niet wijzigen.
                const { email, ...updateData } = studentObject;
                const studentRef = doc(db, 'toegestane_gebruikers', studentData.id);
                await updateDoc(studentRef, updateData);
            } else {
                // Bij een nieuwe leerling is de email de unieke ID.
                const studentRef = doc(db, 'toegestane_gebruikers', formData.email);
                await setDoc(studentRef, studentObject);
            }
            toast.success(`Leerling succesvol ${isEditing ? 'bijgewerkt' : 'aangemaakt'}!`);
            onStudentSaved();
        } catch (error) {
            console.error("Fout bij opslaan leerling:", error);
            toast.error(`Fout: ${error.message}`);
        } finally {
            toast.dismiss(loadingToast);
            setLoading(false);
        }
    };

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-40" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </Transition.Child>
                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-xl">
                                <form onSubmit={handleSubmit}>
                                    <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                                        <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                                            {isEditing ? "Leerling Bewerken" : "Nieuwe Leerling Toevoegen"}
                                        </Dialog.Title>
                                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="sm:col-span-2">
                                                <label className="block text-sm font-medium">Naam</label>
                                                <input type="text" name="naam" value={formData.naam} onChange={handleChange} required className="w-full mt-1 p-2 border rounded-md" />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="block text-sm font-medium">E-mail</label>
                                                <input type="email" name="email" value={formData.email} onChange={handleChange} required disabled={isEditing} className="w-full mt-1 p-2 border rounded-md disabled:bg-gray-100" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium">Geboortedatum</label>
                                                <input type="date" name="geboortedatum" value={formData.geboortedatum} onChange={handleChange} className="w-full mt-1 p-2 border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium">Geslacht</label>
                                                <select name="geslacht" value={formData.geslacht} onChange={handleChange} className="w-full mt-1 p-2 border rounded-md">
                                                    <option value="M">Mannelijk</option>
                                                    <option value="V">Vrouwelijk</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                        <button type="submit" disabled={loading} className="inline-flex w-full justify-center rounded-md bg-purple-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-800 sm:ml-3 sm:w-auto">
                                            {loading ? 'Opslaan...' : 'Opslaan'}
                                        </button>
                                        <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto">
                                            Annuleren
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
