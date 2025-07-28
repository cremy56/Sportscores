// src/pages/TestDetailBeheer.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy, addDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useOutletContext } from 'react-router-dom';
import { ArrowLeftIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon, ArrowUpTrayIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import Papa from 'papaparse';
import TestFormModal from '../components/TestFormModal';
import ConfirmModal from '../components/ConfirmModal'; 

export default function TestDetailBeheer() {
    const { testId } = useParams();
    const { profile } = useOutletContext();
    const [test, setTest] = useState(null);
    const [normen, setNormen] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLeeftijd, setSelectedLeeftijd] = useState('all');
    const [selectedGeslacht, setSelectedGeslacht] = useState('all');
    const [isAdding, setIsAdding] = useState(false);
    const [newNorm, setNewNorm] = useState({ leeftijd: '', geslacht: 'M', score_min: '', punt: '' });
    const [editingNorm, setEditingNorm] = useState(null);
    const fileInputRef = useRef(null);

    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [normToDelete, setNormToDelete] = useState(null);
    
    // State voor de inklapbare secties
    const [isTestDetailsOpen, setIsTestDetailsOpen] = useState(true);
    const [isNormenOpen, setIsNormenOpen] = useState(true);

    const fetchData = useCallback(async () => {
        const testRef = doc(db, 'testen', testId);
        const testSnap = await getDoc(testRef);
        if (testSnap.exists()) {
            setTest({ id: testSnap.id, ...testSnap.data() });
        } else {
            toast.error("Kon testdetails niet laden.");
        }
    }, [testId]);

    useEffect(() => {
        fetchData();
        
        const normenRef = collection(db, 'normen');
        const q = query(normenRef, where('test_id', '==', testId), orderBy('leeftijd'), orderBy('punt'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const normenData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNormen(normenData);
            setLoading(false);
        }, (error) => {
            console.error("Fout bij ophalen normen:", error);
            toast.error("Kon normen niet laden.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [testId, fetchData]);

    const uniekeLeeftijden = useMemo(() => [...new Set(normen.map(n => n.leeftijd))].sort((a, b) => a - b), [normen]);
    const uniekeGeslachten = useMemo(() => [...new Set(normen.map(n => n.geslacht))], [normen]);

    const gefilterdeNormen = useMemo(() => {
        return normen.filter(norm => {
            const leeftijdMatch = selectedLeeftijd === 'all' || norm.leeftijd === Number(selectedLeeftijd);
            const geslachtMatch = selectedGeslacht === 'all' || norm.geslacht === selectedGeslacht;
            return leeftijdMatch && geslachtMatch;
        });
    }, [normen, selectedLeeftijd, selectedGeslacht]);

    const handleSaveNewNorm = async () => {
        if (!newNorm.leeftijd || !newNorm.score_min || !newNorm.punt) {
            toast.error("Vul alle velden in (leeftijd, score, punt).");
            return;
        }
        
        const normObject = {
            test_id: testId,
            school_id: profile.school_id,
            leeftijd: Number(newNorm.leeftijd),
            geslacht: newNorm.geslacht,
            score_min: Number(newNorm.score_min),
            punt: Number(newNorm.punt)
        };

        const promise = addDoc(collection(db, 'normen'), normObject);
        toast.promise(promise, {
            loading: 'Nieuwe norm opslaan...',
            success: () => { setIsAdding(false); return "Norm succesvol opgeslagen!"; },
            error: (err) => `Fout: ${err.message}`
        });
    };

    const handleUpdateNorm = async () => {
        const normRef = doc(db, 'normen', editingNorm.id);
        const { id, school_id, test_id, ...updateData } = editingNorm;
        
        const promise = updateDoc(normRef, {
            ...updateData,
            leeftijd: Number(updateData.leeftijd),
            score_min: Number(updateData.score_min),
            punt: Number(updateData.punt)
        });

        toast.promise(promise, {
            loading: 'Norm bijwerken...',
            success: () => { setEditingNorm(null); return "Norm succesvol bijgewerkt!"; },
            error: (err) => `Fout: ${err.message}`
        });
    };

    const executeDelete = async () => {
        if (!normToDelete) return;
        const promise = deleteDoc(doc(db, 'normen', normToDelete.id));
        toast.promise(promise, {
            loading: 'Norm verwijderen...',
            success: "Norm succesvol verwijderd!",
            error: "Kon norm niet verwijderen."
        });
        setNormToDelete(null);
    };

    const handleCsvUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const requiredHeaders = ['leeftijd', 'geslacht', 'score_min', 'punt'];
                if (!requiredHeaders.every(h => results.meta.fields.includes(h))) {
                    toast.error(`CSV mist verplichte kolommen: ${requiredHeaders.join(', ')}`);
                    return;
                }

                const batch = writeBatch(db);
                results.data.forEach(row => {
                    const normRef = doc(collection(db, 'normen'));
                    batch.set(normRef, {
                        test_id: testId,
                        school_id: profile.school_id,
                        leeftijd: Number(row.leeftijd),
                        geslacht: row.geslacht.toUpperCase(),
                        score_min: Number(row.score_min),
                        punt: Number(row.punt)
                    });
                });

                const promise = batch.commit();
                toast.promise(promise, {
                    loading: `Bezig met importeren van ${results.data.length} normen...`,
                    success: `${results.data.length} normen succesvol geïmporteerd!`,
                    error: (err) => `Import mislukt: ${err.message}`
                });
            },
            error: (error) => { toast.error(`Fout bij het lezen van het bestand: ${error.message}`); }
        });
        event.target.value = null;
    };

    if (loading) return <p className="text-center p-8">Laden...</p>;

    return (
        <>
            <ConfirmModal
                isOpen={!!normToDelete}
                onClose={() => setNormToDelete(null)}
                onConfirm={executeDelete}
                title="Prestatienorm verwijderen"
            >
                Weet u zeker dat u deze norm wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </ConfirmModal>
            
            <TestFormModal
                isOpen={isTestModalOpen}
                onClose={() => setIsTestModalOpen(false)}
                onTestSaved={() => { fetchData(); setIsTestModalOpen(false); }}
                testData={test}
                schoolId={profile?.school_id}
            />
            
            <div className="max-w-7xl mx-auto space-y-8">
                <Link to="/testbeheer" className="flex items-center text-sm text-gray-600 hover:text-purple-700 font-semibold">
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Terug naar testbeheer
                </Link>
                
                <div className="bg-white/60 p-6 rounded-2xl shadow-xl border border-white/30 backdrop-blur-lg">
                    <button onClick={() => setIsTestDetailsOpen(!isTestDetailsOpen)} className="w-full flex justify-between items-center">
                        <h1 className="text-2xl font-bold">Testgegevens: {test?.naam}</h1>
                        <div className="flex items-center">
                            <div onClick={(e) => { e.stopPropagation(); setIsTestModalOpen(true); }} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold mr-4 p-2 rounded-md hover:bg-gray-100">
                                <PencilIcon className="h-5 w-5"/> Bewerken
                            </div>
                            <ChevronDownIcon className={`h-6 w-6 transform transition-transform ${isTestDetailsOpen ? 'rotate-180' : ''}`} />
                        </div>
                    </button>
                    {isTestDetailsOpen && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Categorie</h3>
                                <p className="font-semibold text-gray-800">{test?.categorie}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Eenheid</h3>
                                <p className="font-semibold text-gray-800">{test?.eenheid || '-'}</p>
                            </div>
                            <div className="md:col-span-2">
                                <h3 className="text-sm font-medium text-gray-500">Beschrijving</h3>
                                <p className="mt-1 text-sm text-gray-800">{test?.beschrijving || "Geen beschrijving."}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white/60 p-6 rounded-2xl shadow-xl border border-white/30 backdrop-blur-lg">
                    <button onClick={() => setIsNormenOpen(!isNormenOpen)} className="w-full flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">Prestatienormen</h2>
                        <ChevronDownIcon className={`h-6 w-6 transform transition-transform ${isNormenOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* --- AANGEPAST: Logica voor voorvertoning en volledige weergave --- */}
                    <div className="overflow-x-auto">
                        {isNormenOpen ? (
                            <>
                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 flex-wrap mb-4">
                                    <div className="flex items-center gap-4">
                                        {/* Filters */}
                                    </div>
                                    <div className="flex gap-2 self-start md:self-end">
                                        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCsvUpload} className="hidden" />
                                        <button onClick={() => fileInputRef.current.click()} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                                            <ArrowUpTrayIcon className="h-5 w-5" />
                                            Importeer CSV
                                        </button>
                                        <button onClick={() => setIsAdding(true)} disabled={isAdding || editingNorm} className="bg-purple-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400">
                                            + Nieuwe Norm
                                        </button>
                                    </div>
                                </div>
                                <table className="min-w-full bg-white rounded-lg">
                                    {/* Volledige tabel met headers */}
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leeftijd</th>
                                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Geslacht</th>
                                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min. Score</th>
                                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punt</th>
                                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acties</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isAdding && (
                                            <tr className="bg-purple-50">
                                                <td className="py-1 px-2"><input type="number" value={newNorm.leeftijd} onChange={e => setNewNorm({...newNorm, leeftijd: e.target.value})} className="w-full p-1 border rounded text-sm" /></td>
                                                <td className="py-1 px-2">
                                                    <select value={newNorm.geslacht} onChange={e => setNewNorm({...newNorm, geslacht: e.target.value})} className="w-full p-1 border rounded text-sm">
                                                        <option value="M">M</option><option value="V">V</option>
                                                    </select>
                                                </td>
                                                <td className="py-1 px-2"><input type="number" step="any" value={newNorm.score_min} onChange={e => setNewNorm({...newNorm, score_min: e.target.value})} className="w-full p-1 border rounded text-sm" /></td>
                                                <td className="py-1 px-2"><input type="number" value={newNorm.punt} onChange={e => setNewNorm({...newNorm, punt: e.target.value})} className="w-full p-1 border rounded text-sm" /></td>
                                                <td className="py-1 px-2 flex gap-2 items-center">
                                                    <button onClick={handleSaveNewNorm} className="text-green-600 hover:text-green-800"><CheckIcon className="h-5 w-5"/></button>
                                                    <button onClick={() => setIsAdding(false)} className="text-red-600 hover:text-red-800"><XMarkIcon className="h-5 w-5"/></button>
                                                </td>
                                            </tr>
                                        )}
                                        {gefilterdeNormen.map(norm => (
                                            <tr key={norm.id} className="border-t">
                                                {editingNorm?.id === norm.id ? (
                                                   <>
                                                        <td className="py-1 px-2"><input type="number" value={editingNorm.leeftijd} onChange={e => setEditingNorm({...editingNorm, leeftijd: e.target.value})} className="w-full p-1 border rounded text-sm" /></td>
                                                        <td className="py-1 px-2">
                                                            <select value={editingNorm.geslacht} onChange={e => setEditingNorm({...editingNorm, geslacht: e.target.value})} className="w-full p-1 border rounded text-sm">
                                                                <option value="M">M</option><option value="V">V</option>
                                                            </select>
                                                        </td>
                                                        <td className="py-1 px-2"><input type="number" step="any" value={editingNorm.score_min} onChange={e => setEditingNorm({...editingNorm, score_min: e.target.value})} className="w-full p-1 border rounded text-sm" /></td>
                                                        <td className="py-1 px-2"><input type="number" value={editingNorm.punt} onChange={e => setEditingNorm({...editingNorm, punt: e.target.value})} className="w-full p-1 border rounded text-sm" /></td>
                                                        <td className="py-1 px-2 flex gap-2 items-center">
                                                            <button onClick={handleUpdateNorm} className="text-green-600 hover:text-green-800"><CheckIcon className="h-5 w-5"/></button>
                                                            <button onClick={() => setEditingNorm(null)} className="text-red-600 hover:text-red-800"><XMarkIcon className="h-5 w-5"/></button>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="py-2 px-3 text-sm">{norm.leeftijd}</td>
                                                        <td className="py-2 px-3 text-sm">{norm.geslacht}</td>
                                                        <td className="py-2 px-3 text-sm">{norm.score_min}</td>
                                                        <td className="py-2 px-3 text-sm">{norm.punt}</td>
                                                        <td className="py-2 px-3 flex gap-4 items-center">
                                                            <button onClick={() => setEditingNorm({ ...norm })} className="text-blue-600 hover:text-blue-800"><PencilIcon className="h-4 w-4"/></button>
                                                            <button onClick={() => setNormToDelete(norm)} className="text-red-600 hover:text-red-800"><TrashIcon className="h-4 w-4"/></button>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        ) : (
                            gefilterdeNormen.length > 0 && (
                                <table className="min-w-full bg-white rounded-lg">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leeftijd</th>
                                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Geslacht</th>
                                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min. Score</th>
                                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punt</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {gefilterdeNormen.slice(0, 5).map(norm => (
                                            <tr key={norm.id} className="border-t">
                                                <td className="py-2 px-3 text-sm">{norm.leeftijd}</td>
                                                <td className="py-2 px-3 text-sm">{norm.geslacht}</td>
                                                <td className="py-2 px-3 text-sm">{norm.score_min}</td>
                                                <td className="py-2 px-3 text-sm">{norm.punt}</td>
                                            </tr>
                                        ))}
                                        {gefilterdeNormen.length > 5 && (
                                            <tr className="border-t">
                                                <td colSpan="4" className="text-center py-2 text-sm text-gray-500">
                                                    ... en {gefilterdeNormen.length - 5} meer. Klik om uit te vouwen.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
