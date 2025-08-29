// src/components/SchemaFormModal.jsx
import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { db } from '../firebase';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';

export default function SchemaFormModal({ isOpen, onClose, onSave, schemaData, alleOefeningen, alleTesten }) {
    const [naam, setNaam] = useState('');
    const [omschrijving, setOmschrijving] = useState('');
    const [categorie, setCategorie] = useState('Uithoudingsvermogen');
    const [duurWeken, setDuurWeken] = useState(8);
    const [gekoppeldeTestId, setGekoppeldeTestId] = useState('');
    const [weken, setWeken] = useState([]);
    const [loading, setLoading] = useState(false);

    const isEditing = !!schemaData;

    useEffect(() => {
        if (isOpen) {
            if (isEditing) {
                setNaam(schemaData.naam || '');
                setOmschrijving(schemaData.omschrijving || '');
                setCategorie(schemaData.categorie || 'Uithoudingsvermogen');
                setDuurWeken(schemaData.duur_weken || 8);
                setGekoppeldeTestId(schemaData.gekoppelde_test_id || '');
                setWeken(schemaData.weken || []);
            } else {
                setNaam('');
                setOmschrijving('');
                setCategorie('Uithoudingsvermogen');
                setDuurWeken(8);
                setGekoppeldeTestId('');
                setWeken([]);
            }
        }
    }, [schemaData, isEditing, isOpen]);
    
    // --- State Management voor geneste data ---

    const handleWeekChange = (weekIndex, field, value) => {
        const nieuweWeken = [...weken];
        nieuweWeken[weekIndex][field] = value;
        setWeken(nieuweWeken);
    };

    const handleTaakChange = (weekIndex, taakIndex, field, value) => {
        const nieuweWeken = [...weken];
        nieuweWeken[weekIndex].taken[taakIndex][field] = value;
        setWeken(nieuweWeken);
    };

    const addWeek = () => {
        setWeken([...weken, { week_nummer: weken.length + 1, doel_van_de_week: '', taken: [] }]);
    };
    
    const removeWeek = (weekIndex) => {
        const nieuweWeken = weken.filter((_, i) => i !== weekIndex)
            .map((week, index) => ({ ...week, week_nummer: index + 1 })); // Hernummer de weken
        setWeken(nieuweWeken);
    };

    const addTaak = (weekIndex) => {
        const nieuweWeken = [...weken];
        nieuweWeken[weekIndex].taken.push({ dag: `Dag ${nieuweWeken[weekIndex].taken.length + 1}`, omschrijving: '', oefening_id: '', type: 'Training' });
        setWeken(nieuweWeken);
    };

    const removeTaak = (weekIndex, taakIndex) => {
        const nieuweWeken = [...weken];
        nieuweWeken[weekIndex].taken = nieuweWeken[weekIndex].taken.filter((_, i) => i !== taakIndex);
        setWeken(nieuweWeken);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const loadingToast = toast.loading('Schema opslaan...');

        const schemaObject = {
            naam,
            omschrijving,
            categorie,
            duur_weken: Number(duurWeken),
            gekoppelde_test_id: gekoppeldeTestId,
            weken,
            last_updated_at: serverTimestamp()
        };

        try {
            if (isEditing) {
                const schemaRef = doc(db, 'trainingsschemas', schemaData.id);
                await setDoc(schemaRef, schemaObject, { merge: true });
                toast.success('Schema succesvol bijgewerkt!');
            } else {
                schemaObject.created_at = serverTimestamp();
                await addDoc(collection(db, 'trainingsschemas'), schemaObject);
                toast.success('Schema succesvol aangemaakt!');
            }
            onSave();
            onClose();
        } catch (error) {
            console.error("Fout bij opslaan schema:", error);
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
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Dialog.Panel as="form" onSubmit={handleSubmit} className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
                            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                                <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                                    {isEditing ? "Schema Bewerken" : "Nieuw Trainingsschema"}
                                </Dialog.Title>
                                
                                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <input value={naam} onChange={e => setNaam(e.target.value)} placeholder="Naam schema" required className="w-full p-2 border rounded-md" />
                                    <input value={omschrijving} onChange={e => setOmschrijving(e.target.value)} placeholder="Omschrijving" className="w-full p-2 border rounded-md" />
                                    <select value={categorie} onChange={e => setCategorie(e.target.value)} className="w-full p-2 border rounded-md">
                                        <option>Uithoudingsvermogen</option><option>Kracht</option><option>Snelheid</option><option>Lenigheid</option><option>Coördinatie</option>
                                    </select>
                                    <input type="number" value={duurWeken} onChange={e => setDuurWeken(e.target.value)} placeholder="Duur (weken)" className="w-full p-2 border rounded-md" />
                                    <select value={gekoppeldeTestId} onChange={e => setGekoppeldeTestId(e.target.value)} required className="w-full p-2 border rounded-md">
                                        <option value="">-- Koppel aan Test --</option>
                                        {alleTesten.map(test => <option key={test.id} value={test.id}>{test.naam}</option>)}
                                    </select>
                                </div>

                                <hr className="my-6" />

                                <div className="space-y-4">
                                    {weken.map((week, weekIndex) => (
                                        <div key={weekIndex} className="bg-slate-50 border p-4 rounded-lg">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="font-bold">Week {week.week_nummer}</h4>
                                                <button type="button" onClick={() => removeWeek(weekIndex)} className="text-red-500"><Trash2 size={16} /></button>
                                            </div>
                                            <input value={week.doel_van_de_week} onChange={e => handleWeekChange(weekIndex, 'doel_van_de_week', e.target.value)} placeholder="Doel van de week" className="w-full p-2 border rounded-md mb-4" />
                                            
                                            {week.taken.map((taak, taakIndex) => (
                                                <div key={taakIndex} className="grid grid-cols-4 gap-2 items-center mb-2 p-2 border-l-4 border-purple-200">
                                                    <input value={taak.dag} onChange={e => handleTaakChange(weekIndex, taakIndex, 'dag', e.target.value)} placeholder="Dag" className="p-2 border rounded-md" />
                                                    <input value={taak.omschrijving} onChange={e => handleTaakChange(weekIndex, taakIndex, 'omschrijving', e.target.value)} placeholder="Taak omschrijving" className="p-2 border rounded-md" />
                                                    <select value={taak.oefening_id} onChange={e => handleTaakChange(weekIndex, taakIndex, 'oefening_id', e.target.value)} className="p-2 border rounded-md">
                                                        <option value="">-- Kies Oefening --</option>
                                                        {alleOefeningen.map(oef => <option key={oef.id} value={oef.id}>{oef.naam}</option>)}
                                                    </select>
                                                    <button type="button" onClick={() => removeTaak(weekIndex, taakIndex)} className="text-red-500"><Trash2 size={16} /></button>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => addTaak(weekIndex)} className="text-sm text-purple-600 font-medium flex items-center"><PlusCircle size={16} className="mr-1" />Taak toevoegen</button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addWeek} className="font-bold text-blue-600 flex items-center"><PlusCircle size={16} className="mr-1" />Week toevoegen</button>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                <button type="submit" disabled={loading} className="inline-flex w-full justify-center rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white">
                                    {loading ? <Loader2 className="animate-spin" /> : (isEditing ? 'Wijzigingen Opslaan' : 'Schema Opslaan')}
                                </button>
                                <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm text-gray-900 ring-1 ring-inset ring-gray-300">
                                    Annuleren
                                </button>
                            </div>
                        </Dialog.Panel>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}