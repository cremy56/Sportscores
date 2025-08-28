// src/components/MededelingModal.jsx
import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { db } from '../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

export default function MededelingModal({ isOpen, onClose, onSuccess, profile }) {
    const [type, setType] = useState('event');
    const [tekst, setTekst] = useState('');
    const [zichtbaarheidInDagen, setZichtbaarheidInDagen] = useState(7);
    const [loading, setLoading] = useState(false);

    const daysOptions = Array.from({ length: 30 }, (_, i) => i + 1);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!tekst.trim()) {
            toast.error("Het bericht mag niet leeg zijn.");
            return;
        }
        setLoading(true);
        const loadingToast = toast.loading('Bericht opslaan...');

        const maakDatum = new Date();
        const vervalDatum = new Date();
        vervalDatum.setDate(maakDatum.getDate() + parseInt(zichtbaarheidInDagen, 10));

        try {
            await addDoc(collection(db, 'mededelingen'), {
                school_id: profile.school_id,
                type: type,
                tekst: tekst,
                auteurNaam: profile.naam,
                maakDatum: Timestamp.fromDate(maakDatum),
                vervalDatum: Timestamp.fromDate(vervalDatum)
            });
            toast.success('Bericht succesvol geplaatst!');
            onSuccess(); // Roep de success callback aan
            onClose();   // Sluit de modal
        } catch (err) {
            console.error("Fout bij opslaan van mededeling:", err);
            toast.error(`Fout: ${err.message}`);
        } finally {
            toast.dismiss(loadingToast);
            setLoading(false);
        }
    };
console.log('MededelingModal rendert. Waarde van isOpen:', isOpen, 'Type:', typeof isOpen);

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
                                            Nieuw Bericht Maken
                                        </Dialog.Title>
                                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            
                                            <div className="sm:col-span-2">
                                                <label className="block text-sm font-medium">Type Bericht</label>
                                                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full mt-1 p-2 border rounded-md">
                                                    <option value="event">Aankondiging / Evenement</option>
                                                    <option value="prestatie">Uitzonderlijke Prestatie</option>
                                                </select>
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label className="block text-sm font-medium">Bericht</label>
                                                <textarea 
                                                    value={tekst} 
                                                    onChange={(e) => setTekst(e.target.value)} 
                                                    rows="4" 
                                                    className="w-full mt-1 p-2 border rounded-md"
                                                    placeholder="bv. Proficiat aan Jan Peeters met zijn nieuwe record!"
                                                ></textarea>
                                            </div>
                                            
                                            <div className="sm:col-span-2">
                                                <label className="block text-sm font-medium">Zichtbaar voor (dagen)</label>
                                                <select value={zichtbaarheidInDagen} onChange={(e) => setZichtbaarheidInDagen(e.target.value)} className="w-full mt-1 p-2 border rounded-md">
                                                    {daysOptions.map(day => <option key={day} value={day}>{day}</option>)}
                                                </select>
                                            </div>

                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                        <button 
                                            type="submit" 
                                            disabled={loading} 
                                            className="inline-flex w-full justify-center rounded-md bg-purple-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-800 sm:ml-3 sm:w-auto disabled:opacity-50"
                                        >
                                            {loading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
                                            {loading ? 'Opslaan...' : 'Bericht Opslaan'}
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={onClose} 
                                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                                        >
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