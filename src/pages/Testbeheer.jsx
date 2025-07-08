// src/pages/Testbeheer.jsx
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import TestFormModal from '../components/TestFormModal';
import ConfirmModal from '../components/ConfirmModal';
import { TrashIcon } from '@heroicons/react/24/solid';

export default function Testbeheer() {
    const [testen, setTesten] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [modal, setModal] = useState({ type: null, data: null });

    const fetchTesten = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('testen').select('*').order('naam');
        if (error) toast.error("Kon de testen niet laden.");
        else setTesten(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchTesten();
    }, [fetchTesten]);

    const handleCloseModal = () => {
        setModal({ type: null, data: null });
    };

    const handleDeleteTest = async () => {
        const testToDelete = modal.data;
        if (!testToDelete) return;

        const { count, error: countError } = await supabase
            .from('scores')
            .select('*', { count: 'exact', head: true })
            .eq('test_id', testToDelete.id);

        if (countError) {
            toast.error(`Fout bij controleren van scores: ${countError.message}`);
            handleCloseModal();
            return;
        }

        if (count > 0) {
            toast.error(`Kan '${testToDelete.naam}' niet verwijderen. Er zijn nog ${count} scores aan deze test gekoppeld.`);
            handleCloseModal();
            return;
        }

        const { error } = await supabase.from('testen').delete().eq('id', testToDelete.id);

        if (error) {
            toast.error(`Fout bij verwijderen: ${error.message}`);
        } else {
            toast.success(`'${testToDelete.naam}' succesvol verwijderd.`);
            fetchTesten(); 
        }
        
        handleCloseModal();
    };

    return (
       <div className="max-w-4xl mx-auto">
            <div className="bg-white/60 p-6 rounded-2xl shadow-xl border border-white/30 backdrop-blur-lg">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Testbeheer</h1>
                    <button onClick={() => setModal({ type: 'form', data: null })} className="bg-purple-700 bg-transparent hover:bg-purple-800 text-white font-bold py-2 px-4 rounded-lg">
                        + Nieuwe Test
                    </button>
                </div>

                {loading ? <p>Laden...</p> : (
                    <div className="overflow-hidden border rounded-lg">
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Naam</th>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Categorie</th>
                                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Acties</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {testen.map(test => (
                                    <tr key={test.id} className="border-t hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium">
                                            <Link to={`/testbeheer/${test.id}`} className="text-purple-700 hover:underline">
                                                {test.naam}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{test.categorie}</td>
                                        <td className="px-4 py-3 text-gray-600 text-right">
                                            <button onClick={() => setModal({ type: 'confirm', data: test })} className="text-red-500 hover:text-red-700 p-1 rounded-full">
                                                <TrashIcon className="h-5 w-5"/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <TestFormModal
                isOpen={modal.type === 'form'}
                onClose={handleCloseModal}
                onTestSaved={() => {
                    fetchTesten();
                    handleCloseModal();
                }}
                testData={modal.data}
            />

            <ConfirmModal
                isOpen={modal.type === 'confirm'}
                onClose={handleCloseModal}
                onConfirm={handleDeleteTest}
                title="Test Verwijderen"
            >
                Weet u zeker dat u de test "{modal.data?.naam}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </ConfirmModal>
        </div>
    );
}
