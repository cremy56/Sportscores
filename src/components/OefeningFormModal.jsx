// src/components/OefeningFormModal.jsx
import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { db } from '../firebase';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Loader2, PlusCircle, XCircle, Dumbbell } from 'lucide-react';

export default function OefeningFormModal({ isOpen, onClose, onSave, oefeningData }) {
    const [naam, setNaam] = useState('');
    const [beschrijving, setBeschrijving] = useState('');
    const [categorie, setCategorie] = useState('Kracht');
    const [visueleMediaUrl, setVisueleMediaUrl] = useState('');
    const [instructies, setInstructies] = useState(['']);
    const [loading, setLoading] = useState(false);
    const isEditing = !!oefeningData;

    useEffect(() => {
        if (isOpen) {
            if (isEditing) {
                setNaam(oefeningData.naam || '');
                setBeschrijving(oefeningData.beschrijving || '');
                setCategorie(oefeningData.categorie || 'Kracht');
                setVisueleMediaUrl(oefeningData.visuele_media_url || '');
                const instructiesArray = oefeningData.instructies ? Object.values(oefeningData.instructies) : [''];
                setInstructies(instructiesArray.length > 0 ? instructiesArray : ['']);
            } else {
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

    const addInstructie = () => setInstructies([...instructies, '']);
    const removeInstructie = (index) => {
        if (instructies.length > 1) setInstructies(instructies.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!naam.trim() || !categorie.trim()) {
            toast.error("Naam en categorie zijn verplicht.");
            return;
        }
        setLoading(true);
        const loadingToast = toast.loading('Oefening opslaan...');
        const instructiesObject = instructies.reduce((acc, tekst, index) => {
            if (tekst.trim()) acc[index] = tekst.trim();
            return acc;
        }, {});

        const oefeningObject = {
            naam, beschrijving, categorie,
            visuele_media_url: visueleMediaUrl,
            instructies: instructiesObject,
            last_updated_at: serverTimestamp()
        };

        try {
            if (isEditing) {
                await setDoc(doc(db, 'oefeningen', oefeningData.id), oefeningObject, { merge: true });
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
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </Transition.Child>
                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                            <form onSubmit={handleSubmit}>
                                <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                            <Dumbbell className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <Dialog.Title as="h3" className="text-xl font-semibold text-white">
                                                {isEditing ? "Oefening Bewerken" : "Nieuwe Oefening"}
                                            </Dialog.Title>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-6 py-6 space-y-4">
                                    <input value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Naam van de oefening" required className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500" />
                                    <textarea value={beschrijving} onChange={(e) => setBeschrijving(e.target.value)} placeholder="Korte beschrijving" rows="2" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"></textarea>
                                    <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500">
                                        <option>Kracht</option><option>Snelheid</option><option>Uithoudingsvermogen</option><option>Lenigheid</option><option>Coördinatie</option>
                                    </select>
                                    <input value={visueleMediaUrl} onChange={(e) => setVisueleMediaUrl(e.target.value)} placeholder="URL naar GIF of video" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500" />
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">Instructies</label>
                                        {instructies.map((instructie, index) => (
                                            <div key={index} className="flex items-center space-x-2 mb-2">
                                                <span className="text-gray-500 font-semibold">{index + 1}.</span>
                                                <input value={instructie} onChange={(e) => handleInstructieChange(index, e.target.value)} placeholder={`Stap ${index + 1}`} className="flex-grow px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500" />
                                                <button type="button" onClick={() => removeInstructie(index)} className="text-red-500 hover:text-red-700 p-1"><XCircle className="h-5 w-5" /></button>
                                            </div>
                                        ))}
                                        <button type="button" onClick={addInstructie} className="flex items-center text-sm text-purple-600 hover:text-purple-800 font-medium mt-2">
                                            <PlusCircle className="h-5 w-5 mr-1" />Stap toevoegen
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row gap-3 sm:justify-end">
                                    <button type="button" onClick={onClose} className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100">Annuleren</button>
                                    <button type="submit" disabled={loading} className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-xl disabled:opacity-50 flex items-center justify-center space-x-2">
                                        {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                                        <span>{isEditing ? 'Wijzigingen Opslaan' : 'Oefening Opslaan'}</span>
                                    </button>
                                </div>
                            </form>
                        </Dialog.Panel>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}