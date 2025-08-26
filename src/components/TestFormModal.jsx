// src/components/TestFormModal.jsx
import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function TestFormModal({ isOpen, onClose, onTestSaved, testData, schoolId }) {
    const [naam, setNaam] = useState('');
    const [categorie, setCategorie] = useState('Kracht');
    const [eenheid, setEenheid] = useState('');
    const [scoreRichting, setScoreRichting] = useState('hoog');
    const [beschrijving, setBeschrijving] = useState('');
    const [loading, setLoading] = useState(false);
    
    // --- NIEUWE STATE VELDEN ---
    const [isActief, setIsActief] = useState(true);
    const [maxPunten, setMaxPunten] = useState(20);

    const isEditing = !!testData;

    // Functie om een test ID te genereren op basis van de testnaam
    const generateTestId = (testNaam) => {
        return testNaam
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Verwijder speciale karakters
            .replace(/\s+/g, '_') // Vervang spaties door underscores
            .substring(0, 30); // Beperk tot 30 karakters
    };

    useEffect(() => {
        if (isOpen) {
            if (isEditing) {
                setNaam(testData.naam || '');
                setCategorie(testData.categorie || 'Kracht');
                setEenheid(testData.eenheid || '');
                setScoreRichting(testData.score_richting || 'hoog');
                setBeschrijving(testData.beschrijving || '');
                // Vul nieuwe velden als de data bestaat, anders standaardwaarde
                setIsActief(testData.is_actief !== undefined ? testData.is_actief : true);
                setMaxPunten(testData.max_punten || 20);
            } else {
                // Reset alle velden voor een nieuwe test
                setNaam('');
                setCategorie('Kracht');
                setEenheid('');
                setScoreRichting('hoog');
                setBeschrijving('');
                setIsActief(true);
                setMaxPunten(20);
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

        // --- OBJECT UITGEBREID MET NIEUWE VELDEN ---
        const testObject = { 
            naam, 
            categorie, 
            eenheid, 
            score_richting: scoreRichting, 
            beschrijving,
            is_actief: isActief,
            max_punten: Number(maxPunten) // Zorg ervoor dat het als getal wordt opgeslagen
        };

        try {
            if (isEditing) {
                const testRef = doc(db, 'testen', testData.id);
                await updateDoc(testRef, testObject);
                toast.success(`Test succesvol bijgewerkt!`);
            } else {
                // AANGEPASTE LOGICA: Gebruik custom ID voor nieuwe testen
                testObject.school_id = schoolId;
                testObject.created_at = serverTimestamp();
                
                // Genereer een custom ID op basis van de testnaam
                const customId = generateTestId(naam);
                const testRef = doc(db, 'testen', customId);
                
                // Gebruik setDoc in plaats van addDoc om een specifieke ID te gebruiken
                await setDoc(testRef, testObject);
                toast.success(`Test succesvol aangemaakt!`);
            }
            
            // Roep de callback aan en sluit altijd de modal
            if (onTestSaved) {
                onTestSaved();
            }
            onClose(); // Forceer modal sluiting
            
        } catch (error) {
            console.error("Fout bij opslaan test:", error);
            // Als de ID al bestaat, probeer met een suffix (alleen voor nieuwe testen)
            if (!isEditing && (error.code === 'permission-denied' || error.message.includes('already exists'))) {
                try {
                    const timestamp = Date.now();
                    const fallbackId = `${generateTestId(naam)}_${timestamp}`;
                    const testRef = doc(db, 'testen', fallbackId);
                    await setDoc(testRef, testObject);
                    toast.success(`Test succesvol aangemaakt met ID: ${fallbackId}!`);
                    
                    // Roep de callback aan en sluit de modal
                    if (onTestSaved) {
                        onTestSaved();
                    }
                    onClose(); // Forceer modal sluiting
                    
                } catch (fallbackError) {
                    toast.error(`Fout: ${fallbackError.message}`);
                }
            } else {
                toast.error(`Fout: ${error.message}`);
            }
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
                                                <input 
                                                    type="text" 
                                                    value={naam} 
                                                    onChange={(e) => setNaam(e.target.value)} 
                                                    required 
                                                    className="w-full mt-1 p-2 border rounded-md" 
                                                />
                                                {/* Preview van de gegenereerde ID */}
                                                {!isEditing && naam && (
                                                    <div className="mt-1 text-xs text-gray-500">
                                                        Test ID: {generateTestId(naam)}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium">Categorie</label>
                                                <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className="w-full mt-1 p-2 border rounded-md">
                                                    <option>Kracht</option><option>Snelheid</option><option>Uithoudingsvermogen</option><option>Lenigheid</option><option>Coördinatie</option><option>Sportprestaties</option>
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
                                            
                                            {/* --- NIEUWE FORMULIER VELDEN --- */}
                                            <div>
                                                <label className="block text-sm font-medium">Max. Punten</label>
                                                <input type="number" value={maxPunten} onChange={(e) => setMaxPunten(e.target.value)} required className="w-full mt-1 p-2 border rounded-md" />
                                            </div>

                                            <div className="sm:col-span-2 flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                                <label htmlFor="is_actief" className="font-medium text-gray-700">Zichtbaar op highscore pagina?</label>
                                                <div className="relative inline-block w-10 align-middle select-none">
                                                    <input type="checkbox" name="is_actief" id="is_actief" checked={isActief} onChange={(e) => setIsActief(e.target.checked)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                                                    <label htmlFor="is_actief" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                                                </div>
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
                {/* Voeg deze CSS toe aan je globale stylesheet (bv. index.css) voor de toggle switch */}
                <style jsx global>{`
                    .toggle-checkbox:checked { right: 0; border-color: #6d28d9; }
                    .toggle-checkbox:checked + .toggle-label { background-color: #6d28d9; }
                `}</style>
            </Dialog>
        </Transition.Root>
    );
}