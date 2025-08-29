// src/components/TestFormModal.jsx
import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ClipboardList, CheckCircleIcon, Loader2 } from 'lucide-react';

export default function TestFormModal({ isOpen, onClose, onTestSaved, testData, schoolId }) {
    const [naam, setNaam] = useState('');
    const [categorie, setCategorie] = useState('Kracht');
    const [eenheid, setEenheid] = useState('');
    const [scoreRichting, setScoreRichting] = useState('hoog');
    const [beschrijving, setBeschrijving] = useState('');
    const [loading, setLoading] = useState(false);
    const [isActief, setIsActief] = useState(true);
    const [maxPunten, setMaxPunten] = useState(20);
    const isEditing = !!testData;

    const generateTestId = (testNaam) => {
        return testNaam.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 30);
    };

    useEffect(() => {
        if (isOpen) {
            if (isEditing) {
                setNaam(testData.naam || '');
                setCategorie(testData.categorie || 'Kracht');
                setEenheid(testData.eenheid || '');
                setScoreRichting(testData.score_richting || 'hoog');
                setBeschrijving(testData.beschrijving || '');
                setIsActief(testData.is_actief !== undefined ? testData.is_actief : true);
                setMaxPunten(testData.max_punten || 20);
            } else {
                setNaam(''); setCategorie('Kracht'); setEenheid('');
                setScoreRichting('hoog'); setBeschrijving('');
                setIsActief(true); setMaxPunten(20);
            }
        }
    }, [testData, isEditing, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!naam.trim() || !categorie.trim() || !eenheid.trim()) {
            toast.error("Naam, categorie en eenheid zijn verplicht.");
            return;
        }
        setLoading(true);
        const loadingToast = toast.loading('Test opslaan...');
        const testObject = { 
            naam, categorie, eenheid, beschrijving,
            score_richting: scoreRichting, 
            is_actief: isActief,
            max_punten: Number(maxPunten)
        };

        try {
            if (isEditing) {
                testObject.last_updated_at = serverTimestamp();
                await updateDoc(doc(db, 'testen', testData.id), testObject);
                toast.success(`Test succesvol bijgewerkt!`);
            } else {
                testObject.school_id = schoolId;
                testObject.created_at = serverTimestamp();
                const customId = generateTestId(naam);
                await setDoc(doc(db, 'testen', customId), testObject);
                toast.success(`Test succesvol aangemaakt!`);
            }
            if (onTestSaved) onTestSaved();
            onClose();
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
                                            <ClipboardList className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <Dialog.Title as="h3" className="text-xl font-semibold text-white">
                                                {isEditing ? "Test Bewerken" : "Nieuwe Test Aanmaken"}
                                            </Dialog.Title>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-6 py-6 space-y-4">
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Naam</label>
                                        <input value={naam} onChange={(e) => setNaam(e.target.value)} required className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                                        {!isEditing && naam && <p className="mt-1 text-xs text-gray-500">Test ID: {generateTestId(naam)}</p>}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Categorie</label>
                                            <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl">
                                                <option>Kracht</option><option>Snelheid</option><option>Uithoudingsvermogen</option><option>Lenigheid</option><option>Coördinatie</option><option>Sportprestaties</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Eenheid (bv. m, sec, aantal)</label>
                                            <input type="text" value={eenheid} onChange={(e) => setEenheid(e.target.value)} required className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Score Richting</label>
                                            <select value={scoreRichting} onChange={(e) => setScoreRichting(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl">
                                                <option value="hoog">Hoger is beter</option>
                                                <option value="laag">Lager is beter</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Max. Punten</label>
                                            <input type="number" value={maxPunten} onChange={(e) => setMaxPunten(e.target.value)} required className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Beschrijving (optioneel)</label>
                                        <textarea value={beschrijving} onChange={(e) => setBeschrijving(e.target.value)} rows="3" className="w-full px-4 py-3 border border-gray-300 rounded-xl"></textarea>
                                    </div>
                                    <div className="sm:col-span-2 flex items-center justify-between bg-gray-50 p-3 rounded-xl border">
                                        <label htmlFor="is_actief" className="font-medium text-gray-700">Zichtbaar op highscore pagina?</label>
                                        <div className="relative inline-block w-10 align-middle select-none">
                                            <input type="checkbox" name="is_actief" id="is_actief" checked={isActief} onChange={(e) => setIsActief(e.target.checked)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                                            <label htmlFor="is_actief" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row gap-3 sm:justify-end">
                                    <button type="button" onClick={onClose} className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100">Annuleren</button>
                                    <button 
                                        type="submit" 
                                        disabled={loading} 
                                        className="inline-flex w-full justify-center items-center space-x-2 rounded-md bg-purple-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-800 sm:ml-3 sm:w-auto disabled:opacity-50"
                                    >
                                        {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                                        <span>{isEditing ? 'Wijzigingen Opslaan' : 'Test Opslaan'}</span>
                                    </button>
                                </div>
                            </form>
                        </Dialog.Panel>
                    </div>
                </div>
                <style jsx global>{`
                    .toggle-checkbox:checked { right: 0; border-color: #6d28d9; }
                    .toggle-checkbox:checked + .toggle-label { background-color: #6d28d9; }
                `}</style>
            </Dialog>
        </Transition.Root>
    );
}