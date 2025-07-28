// src/components/TestFormModal.jsx
import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { db } from '../firebase';
import { doc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function TestFormModal({ isOpen, onClose, onTestSaved, testData, schoolId }) {
    const [naam, setNaam] = useState('');
    const [categorie, setCategorie] = useState('Kracht');
    const [eenheid, setEenheid] = useState('');
    const [scoreRichting, setScoreRichting] = useState('hoog');
    const [beschrijving, setBeschrijving] = useState('');
    const [loading, setLoading] = useState(false);

    const isEditing = !!testData;

    useEffect(() => {
        if (isOpen) {
            if (isEditing) {
                setNaam(testData.naam || '');
                setCategorie(testData.categorie || 'Kracht');
                setEenheid(testData.eenheid || '');
                setScoreRichting(testData.score_richting || 'hoog');
                setBeschrijving(testData.beschrijving || '');
            } else {
                setNaam('');
                setCategorie('Kracht');
                setEenheid('');
                setScoreRichting('hoog');
                setBeschrijving('');
            }
        }
    }, [testData, isEditing, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!naam.trim() || !categorie.trim() || !eenheid.trim()) {
            toast.error("Vul alstublieft alle verplichte velden in.");
            return;
        }
        setLoading(true);
        const loadingToast = toast.loading('Test opslaan...');

        const testObject = { 
            naam, 
            categorie, 
            eenheid, 
            score_richting: scoreRichting, 
            beschrijving 
        };

        try {
            if (isEditing) {
                const testRef = doc(db, 'testen', testData.id);
                await updateDoc(testRef, testObject);
            } else {
                // Voeg school_id en created_at toe voor nieuwe testen
                testObject.school_id = schoolId;
                testObject.created_at = serverTimestamp();
                await addDoc(collection(db, 'testen'), testObject);
            }
            toast.success(`Test succesvol ${isEditing ? 'bijgewerkt' : 'aangemaakt'}!`);
            onTestSaved();
        } catch (error) {
            console.error("Fout bij opslaan test:", error);
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
                                            {isEditing ? "Test Bewerken" : "Nieuwe Test Aanmaken"}
                                        </Dialog.Title>
                                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="sm:col-span-2">
                                                <label className="block text-sm font-medium">Naam</label>
                                                <input type="text" value={naam} onChange={(e) => setNaam(e.target.value)} required className="w-full mt-1 p-2 border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium">Categorie</label>
                                                <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className="w-full mt-1 p-2 border rounded-md">
                                                    <option>Kracht</option>
                                                    <option>Snelheid</option>
                                                    <option>Uithoudingsvermogen</option>
                                                    <option>Lenigheid</option>
                                                    <option>Coördinatie</option>
                                                    <option>Sportprestaties</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium">Eenheid (bv. m, sec, aantal)</label>
                                                <input type="text" value={eenheid} onChange={(e) => setEenheid(e.target.value)} required className="w-full mt-1 p-2 border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium">Score Richting</label>
                                                <select value={scoreRichting} onChange={(e) => setScoreRichting(e.target.value)} className="w-full mt-1 p-2 border rounded-md">
                                                    <option value="hoog">Hoger is beter</option>
                                                    <option value="laag">Lager is beter</option>
                                                </select>
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="block text-sm font-medium">Beschrijving (optioneel)</label>
                                                <textarea value={beschrijving} onChange={(e) => setBeschrijving(e.target.value)} rows="3" className="w-full mt-1 p-2 border rounded-md"></textarea>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                        <button type="submit" disabled={loading} className="inline-flex w-full justify-center rounded-md bg-purple-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-800 sm:ml-3 sm:w-auto">
                                            {loading ? 'Opslaan...' : 'Test Opslaan'}
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
