// src/components/OefeningFormModal.jsx
import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { db } from '../firebase';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Loader2, PlusCircleIcon, XCircleIcon } from 'lucide-react';

export default function OefeningFormModal({ isOpen, onClose, onSave, oefeningData }) {
    const [naam, setNaam] = useState('');
    const [beschrijving, setBeschrijving] = useState('');
    const [categorie, setCategorie] = useState('Kracht');
    const [visueleMediaUrl, setVisueleMediaUrl] = useState('');
    const [instructies, setInstructies] = useState(['']); // Start met één lege instructie
    const [loading, setLoading] = useState(false);

    const isEditing = !!oefeningData;

    useEffect(() => {
        if (isOpen) {
            if (isEditing) {
                setNaam(oefeningData.naam || '');
                setBeschrijving(oefeningData.beschrijving || '');
                setCategorie(oefeningData.categorie || 'Kracht');
                setVisueleMediaUrl(oefeningData.visuele_media_url || '');
                // Converteer instructie-object naar een array voor het formulier
                const instructiesArray = oefeningData.instructies ? Object.values(oefeningData.instructies).sort((a, b) => a.stap - b.stap).map(i => i.tekst) : [''];
                setInstructies(instructiesArray);
            } else {
                // Reset formulier voor nieuwe oefening
                setNaam('');
                setBeschrijving('');
                setCategorie('Kracht');
                setVisueleMediaUrl('');
                setInstructies(['']);
            }
        }
    }, [oefeningData, isEditing, isOpen]);

    const handleInstructieChange = (index, value) => {
        const newInstructies = [...instructies];
        newInstructies[index] = value;
        setInstructies(newInstructies);
    };

    const addInstructie = () => {
        setInstructies([...instructies, '']);
    };

    const removeInstructie = (index) => {
        if (instructies.length > 1) {
            const newInstructies = instructies.filter((_, i) => i !== index);
            setInstructies(newInstructies);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!naam.trim() || !categorie.trim()) {
            toast.error("Naam en categorie zijn verplicht.");
            return;
        }
        setLoading(true);
        const loadingToast = toast.loading('Oefening opslaan...');

        // Converteer instructie-array terug naar een object/map voor Firestore
        const instructiesObject = instructies.reduce((acc, tekst, index) => {
            if (tekst.trim()) {
                acc[index] = tekst.trim();
            }
            return acc;
        }, {});

        const oefeningObject = {
            naam,
            beschrijving,
            categorie,
            visuele_media_url: visueleMediaUrl,
            instructies: instructiesObject,
            last_updated_at: serverTimestamp()
        };

        try {
            if (isEditing) {
                const oefeningRef = doc(db, 'oefeningen', oefeningData.id);
                await setDoc(oefeningRef, oefeningObject, { merge: true });
                toast.success('Oefening succesvol bijgewerkt!');
            } else {
                oefeningObject.created_at = serverTimestamp();
                await addDoc(collection(db, 'oefeningen'), oefeningObject);
                toast.success('Oefening succesvol aangemaakt!');
            }
            onSave();
            onClose();
        } catch (error) {
            console.error("Fout bij opslaan oefening:", error);
            toast.error(`Fout: ${error.message}`);
        } finally {
            toast.dismiss(loadingToast);
            setLoading(false);
        }
    };

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-40" onClose={onClose}>
                {/* Overlay */}
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                                <form onSubmit={handleSubmit}>
                                    <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                                        <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                                            {isEditing ? "Oefening Bewerken" : "Nieuwe Oefening"}
                                        </Dialog.Title>
                                        <div className="mt-5 grid grid-cols-1 gap-6">
                                            <input value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Naam van de oefening" required className="w-full p-2 border rounded-md" />
                                            <textarea value={beschrijving} onChange={(e) => setBeschrijving(e.target.value)} placeholder="Korte beschrijving" rows="2" className="w-full p-2 border rounded-md"></textarea>
                                            <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className="w-full p-2 border rounded-md">
                                                <option>Kracht</option><option>Snelheid</option><option>Uithoudingsvermogen</option><option>Lenigheid</option><option>Coördinatie</option>
                                            </select>
                                            <input value={visueleMediaUrl} onChange={(e) => setVisueleMediaUrl(e.target.value)} placeholder="URL naar GIF of video (bv. https://i.imgur.com/link.gif)" className="w-full p-2 border rounded-md" />
                                            
                                            <div>
                                                <label className="block text-sm font-medium mb-2">Instructies</label>
                                                {instructies.map((instructie, index) => (
                                                    <div key={index} className="flex items-center space-x-2 mb-2">
                                                        <span className="text-gray-500">{index + 1}.</span>
                                                        <input 
                                                            value={instructie} 
                                                            onChange={(e) => handleInstructieChange(index, e.target.value)} 
                                                            placeholder={`Stap ${index + 1}`}
                                                            className="flex-grow p-2 border rounded-md"
                                                        />
                                                        <button type="button" onClick={() => removeInstructie(index)} className="text-red-500 hover:text-red-700">
                                                            <XCircleIcon className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button type="button" onClick={addInstructie} className="flex items-center text-sm text-purple-600 hover:text-purple-800 font-medium mt-2">
                                                    <PlusCircleIcon className="h-5 w-5 mr-1" />
                                                    Stap toevoegen
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                        <button type="submit" disabled={loading} className="inline-flex w-full justify-center rounded-md bg-purple-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-800 sm:ml-3 sm:w-auto">
                                            {loading ? <Loader2 className="animate-spin" /> : (isEditing ? 'Wijzigingen Opslaan' : 'Oefening Opslaan')}
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