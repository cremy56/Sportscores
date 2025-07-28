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
    
    const [isTestDetailsOpen, setIsTestDetailsOpen] = useState(false);
    const [isNormenOpen, setIsNormenOpen] = useState(false);

    const [selectedNorms, setSelectedNorms] = useState([]);
    const [itemsToDelete, setItemsToDelete] = useState(null);

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
        if (!itemsToDelete) return;
        let promise;
        let successMessage;

        if (Array.isArray(itemsToDelete)) { // Bulk delete
            const batch = writeBatch(db);
            itemsToDelete.forEach(id => {
                const normRef = doc(db, 'normen', id);
                batch.delete(normRef);
            });
            promise = batch.commit();
            successMessage = `${itemsToDelete.length} normen succesvol verwijderd!`;
        } else { // Single delete
            promise = deleteDoc(doc(db, 'normen', itemsToDelete.id));
            successMessage = "Norm succesvol verwijderd!";
        }

        toast.promise(promise, {
            loading: 'Bezig met verwijderen...',
            success: () => {
                setSelectedNorms([]);
                return successMessage;
            },
            error: "Kon de norm(en) niet verwijderen."
        });
        setItemsToDelete(null);
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
                    
                    const geslachtCleaned = (row.geslacht || '').trim().toUpperCase();
                    const finalGeslacht = geslachtCleaned.startsWith('M') ? 'M' : 'V';

                    batch.set(normRef, {
                        test_id: testId,
                        school_id: profile.school_id,
                        leeftijd: Number(row.leeftijd),
                        geslacht: finalGeslacht,
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

    const handleSelectNorm = (normId) => {
        setSelectedNorms(prev => 
            prev.includes(normId) 
                ? prev.filter(id => id !== normId) 
                : [...prev, normId]
        );
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedNorms(gefilterdeNormen.map(n => n.id));
        } else {
            setSelectedNorms([]);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
                <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
                    <div className="flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        <p className="text-lg font-medium text-gray-700">Testgegevens laden...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <ConfirmModal
                isOpen={!!itemsToDelete}
                onClose={() => setItemsToDelete(null)}
                onConfirm={executeDelete}
                title="Prestatienorm(en) verwijderen"
            >
                {`Weet u zeker dat u ${Array.isArray(itemsToDelete) ? itemsToDelete.length : 'deze'} norm(en) wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`}
            </ConfirmModal>
            
            <TestFormModal
                isOpen={isTestModalOpen}
                onClose={() => setIsTestModalOpen(false)}
                onTestSaved={() => { fetchData(); setIsTestModalOpen(false); }}
                testData={test}
                schoolId={profile?.school_id}
            />
            
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 p-4 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    <Link to="/testbeheer" className="flex items-center text-sm text-gray-600 hover:text-purple-700 font-semibold transition-colors duration-200">
                        <ArrowLeftIcon className="h-4 w-4 mr-2" />
                        Terug naar testbeheer
                    </Link>
                    
                    {/* TESTGEGEVENS SECTIE */}
                    <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-lg border border-white/20 overflow-hidden">
                        <div className="p-6">
                            <div className="w-full flex justify-between items-center group">
                                <div 
                                    onClick={() => setIsTestDetailsOpen(!isTestDetailsOpen)} 
                                    className="flex items-center space-x-3 cursor-pointer flex-grow"
                                >
                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center">
                                        <PencilIcon className="w-6 h-6 text-purple-600" />
                                    </div>
                                    <div className="text-left">
                                        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors duration-300">
                                            {test?.naam}
                                        </h1>
                                        <p className="text-sm text-gray-600">Testgegevens</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div 
                                        onClick={(e) => { e.stopPropagation(); setIsTestModalOpen(true); }} 
                                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold p-2 rounded-xl hover:bg-blue-50 transition-all duration-200 cursor-pointer"
                                    >
                                        <PencilIcon className="h-4 w-4"/> 
                                        <span className="hidden sm:inline">Bewerken</span>
                                    </div>
                                    <button onClick={() => setIsTestDetailsOpen(!isTestDetailsOpen)}>
                                        <ChevronDownIcon className={`h-6 w-6 text-gray-400 transform transition-transform duration-300 ${isTestDetailsOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>
                            </div>
                            
                            {!isTestDetailsOpen && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500">Categorie:</span>
                                            <span className="ml-2 font-medium text-gray-800">{test?.categorie}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Eenheid:</span>
                                            <span className="ml-2 font-medium text-gray-800">{test?.eenheid || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Normen:</span>
                                            <span className="ml-2 font-medium text-gray-800">{normen.length} items</span>
                                        </div>
                                    </div>
                                    {test?.beschrijving && (
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                            <p className="text-sm text-gray-600 line-clamp-2">
                                                {test.beschrijving}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {isTestDetailsOpen && (
                                <div className="mt-6 pt-6 border-t border-gray-100 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Categorie</h3>
                                            <p className="text-lg font-medium text-gray-800 bg-gray-50 p-3 rounded-xl">{test?.categorie}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Eenheid</h3>
                                            <p className="text-lg font-medium text-gray-800 bg-gray-50 p-3 rounded-xl">{test?.eenheid || 'Geen eenheid opgegeven'}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Beschrijving</h3>
                                        <div className="bg-gray-50 p-4 rounded-xl">
                                            <p className="text-gray-800 leading-relaxed">{test?.beschrijving || "Geen beschrijving beschikbaar."}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PRESTATIENORMEN SECTIE */}
                    <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-lg border border-white/20 overflow-hidden">
                        <div className="p-6">
                            <button 
                                onClick={() => setIsNormenOpen(!isNormenOpen)} 
                                className="w-full flex justify-between items-center group mb-4"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-teal-100 rounded-2xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div className="text-left">
                                        <h2 className="text-xl lg:text-2xl font-bold text-gray-900 group-hover:text-green-700 transition-colors duration-300">
                                            Prestatienormen
                                        </h2>
                                        <p className="text-sm text-gray-600">{normen.length} normen beschikbaar</p>
                                    </div>
                                </div>
                                <ChevronDownIcon className={`h-6 w-6 text-gray-400 transform transition-transform duration-300 ${isNormenOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {isNormenOpen && (
                                <div className="mb-6 space-y-4">
                                    <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                                        <div className="flex flex-wrap items-center gap-4">
                                            {/* Filters */}
                                        </div>
                                        <div className="flex gap-2">
                                            {selectedNorms.length > 0 && (
                                                <button 
                                                    onClick={() => setItemsToDelete(selectedNorms)}
                                                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-xl flex items-center gap-2 transition-all duration-200 transform hover:scale-105 shadow-lg"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                    Verwijder ({selectedNorms.length})
                                                </button>
                                            )}
                                            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCsvUpload} className="hidden" />
                                            <button 
                                                onClick={() => fileInputRef.current.click()} 
                                                className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-medium py-2 px-4 rounded-xl flex items-center gap-2 transition-all duration-200 transform hover:scale-105 shadow-lg"
                                            >
                                                <ArrowUpTrayIcon className="h-5 w-5" />
                                                <span className="hidden sm:inline">Importeer CSV</span>
                                            </button>
                                            <button 
                                                onClick={() => setIsAdding(true)} 
                                                disabled={isAdding || editingNorm} 
                                                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-2 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
                                            >
                                                + <span className="hidden sm:inline">Nieuwe Norm</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="overflow-x-auto rounded-2xl">
                                {gefilterdeNormen.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-2xl">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Geen normen gevonden</h3>
                                        <p className="text-gray-600">Er zijn nog geen prestatienormen toegevoegd voor deze test.</p>
                                    </div>
                                ) : (
                                    <table className="min-w-full bg-white rounded-2xl shadow-sm">
                                        <thead>
                                            <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                                                {isNormenOpen && (
                                                    <th className="py-4 px-6 rounded-tl-2xl">
                                                        <input 
                                                            type="checkbox" 
                                                            onChange={handleSelectAll}
                                                            checked={gefilterdeNormen.length > 0 && selectedNorms.length === gefilterdeNormen.length}
                                                            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                        />
                                                    </th>
                                                )}
                                                <th className={`py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${!isNormenOpen && 'rounded-tl-2xl'}`}>Leeftijd</th>
                                                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Geslacht</th>
                                                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Min. Score</th>
                                                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Punt</th>
                                                {isNormenOpen && <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider rounded-tr-2xl">Acties</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {isAdding && isNormenOpen && (
                                                <tr className="bg-purple-50 hover:bg-purple-100 transition-colors duration-200">
                                                     <td></td>
                                                    <td className="py-3 px-6"><input type="number" value={newNorm.leeftijd} onChange={e => setNewNorm({...newNorm, leeftijd: e.target.value})} className="w-full p-2 border border-purple-200 rounded-lg text-sm" /></td>
                                                    <td className="py-3 px-6"><select value={newNorm.geslacht} onChange={e => setNewNorm({...newNorm, geslacht: e.target.value})} className="w-full p-2 border border-purple-200 rounded-lg text-sm"><option value="M">M</option><option value="V">V</option></select></td>
                                                    <td className="py-3 px-6"><input type="number" step="any" value={newNorm.score_min} onChange={e => setNewNorm({...newNorm, score_min: e.target.value})} className="w-full p-2 border border-purple-200 rounded-lg text-sm" /></td>
                                                    <td className="py-3 px-6"><input type="number" value={newNorm.punt} onChange={e => setNewNorm({...newNorm, punt: e.target.value})} className="w-full p-2 border border-purple-200 rounded-lg text-sm" /></td>
                                                    <td className="py-3 px-6"><div className="flex gap-2 items-center"><button onClick={handleSaveNewNorm} className="text-green-600 p-1"><CheckIcon className="h-5 w-5"/></button><button onClick={() => setIsAdding(false)} className="text-red-600 p-1"><XMarkIcon className="h-5 w-5"/></button></div></td>
                                                </tr>
                                            )}
                                            {(isNormenOpen ? gefilterdeNormen : gefilterdeNormen.slice(0, 5)).map((norm, index) => (
                                                <tr key={norm.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-200`}>
                                                    {isNormenOpen && (
                                                        <td className="py-4 px-6">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={selectedNorms.includes(norm.id)}
                                                                onChange={() => handleSelectNorm(norm.id)}
                                                                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                            />
                                                        </td>
                                                    )}
                                                    {editingNorm?.id === norm.id && isNormenOpen ? (
                                                        <>
                                                            <td className="py-3 px-6"><input type="number" value={editingNorm.leeftijd} onChange={e => setEditingNorm({...editingNorm, leeftijd: e.target.value})} className="w-full p-2 border rounded-lg text-sm" /></td>
                                                            <td className="py-3 px-6"><select value={editingNorm.geslacht} onChange={e => setEditingNorm({...editingNorm, geslacht: e.target.value})} className="w-full p-2 border rounded-lg text-sm"><option value="M">M</option><option value="V">V</option></select></td>
                                                            <td className="py-3 px-6"><input type="number" step="any" value={isNaN(editingNorm.score_min) ? '' : editingNorm.score_min} onChange={e => setEditingNorm({...editingNorm, score_min: e.target.value})} className="w-full p-2 border rounded-lg text-sm" /></td>
                                                            <td className="py-3 px-6"><input type="number" value={editingNorm.punt} onChange={e => setEditingNorm({...editingNorm, punt: e.target.value})} className="w-full p-2 border rounded-lg text-sm" /></td>
                                                            <td className="py-3 px-6"><div className="flex gap-2 items-center"><button onClick={handleUpdateNorm} className="text-green-600 p-1"><CheckIcon className="h-5 w-5"/></button><button onClick={() => setEditingNorm(null)} className="text-red-600 p-1"><XMarkIcon className="h-5 w-5"/></button></div></td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="py-4 px-6 text-sm font-medium text-gray-900">{norm.leeftijd} jaar</td>
                                                            <td className="py-4 px-6 text-sm text-gray-700">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                    (norm.geslacht?.toUpperCase().startsWith('M')) ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                                                                }`}>
                                                                    {(norm.geslacht?.toUpperCase().startsWith('M')) ? 'Mannelijk' : 'Vrouwelijk'}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 px-6 text-sm text-gray-700 font-medium">{isNaN(norm.score_min) ? '-' : norm.score_min}</td>
                                                            <td className="py-4 px-6 text-sm text-gray-700"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">{norm.punt} pt</span></td>
                                                            {isNormenOpen && (
                                                                <td className="py-4 px-6">
                                                                    <div className="flex gap-3 items-center">
                                                                        <button onClick={() => setEditingNorm({ ...norm })} className="text-blue-600 p-1"><PencilIcon className="h-4 w-4"/></button>
                                                                        <button onClick={() => setItemsToDelete(norm)} className="text-red-600 p-1"><TrashIcon className="h-4 w-4"/></button>
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                            {!isNormenOpen && gefilterdeNormen.length > 5 && (
                                                <tr className="bg-gradient-to-r from-gray-50 to-blue-50">
                                                    <td colSpan="4" className="text-center py-4 text-sm text-gray-600 font-medium">
                                                        <div className="flex items-center justify-center space-x-2">
                                                            <span>... en {gefilterdeNormen.length - 5} meer normen.</span>
                                                            <button onClick={() => setIsNormenOpen(true)} className="text-purple-600 hover:text-purple-800 font-semibold underline">Klik om alles te bekijken</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
