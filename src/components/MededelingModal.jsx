// src/components/MededelingModal.jsx
import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { auth } from '../firebase';
import toast from 'react-hot-toast';
import { Loader2, Megaphone, CheckCircleIcon } from 'lucide-react';

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

    // De datums worden nu op de server berekend

    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error("Geen gebruiker ingelogd.");
        }
        const token = await user.getIdToken();

        const response = await fetch('/api/content', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                type: type,
                tekst: tekst,
                zichtbaarheidInDagen: parseInt(zichtbaarheidInDagen, 10)
            })
        });

        const result = await response.json();
        if (!response.ok) {
             throw new Error(result.error || 'Fout bij opslaan');
        }

        toast.success('Bericht succesvol geplaatst!');
        onSuccess();
        onClose();
    } catch (err) {
        console.error("Fout bij opslaan van mededeling:", err);
        toast.error(`Fout: ${err.message}`);
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
                                            <Megaphone className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <Dialog.Title as="h3" className="text-xl font-semibold text-white">
                                                Nieuw Bericht Maken
                                            </Dialog.Title>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="px-6 py-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Type Bericht</label>
                                        <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl">
                                            <option value="event">Aankondiging / Evenement</option>
                                            <option value="prestatie">Uitzonderlijke Prestatie</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Bericht</label>
                                        <textarea value={tekst} onChange={(e) => setTekst(e.target.value)} rows="4" className="w-full px-4 py-3 border border-gray-300 rounded-xl" placeholder="bv. Proficiat aan Jan Peeters met zijn nieuwe record!"></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Zichtbaar voor (dagen)</label>
                                        <select value={zichtbaarheidInDagen} onChange={(e) => setZichtbaarheidInDagen(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl">
                                            {daysOptions.map(day => <option key={day} value={day}>{day}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row gap-3 sm:justify-end">
                                    <button type="button" onClick={onClose} className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100">Annuleren</button>
                                    <button type="submit" disabled={loading} className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-xl disabled:opacity-50 flex items-center justify-center space-x-2">
                                        {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                                        <span>Bericht Opslaan</span>
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