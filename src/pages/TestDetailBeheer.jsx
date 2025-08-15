// src/pages/TestDetailBeheer.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, onSnapshot, updateDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
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
    const [normDocument, setNormDocument] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [selectedLeeftijd, setSelectedLeeftijd] = useState('all');
    const [selectedGeslacht, setSelectedGeslacht] = useState('all');
    const [isAdding, setIsAdding] = useState(false);
    const [newNorm, setNewNorm] = useState({ leeftijd: '', geslacht: 'M', score_min: '', punt: '' });
    const [editingNorm, setEditingNorm] = useState(null);
    const fileInputRef = useRef(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [isNormenOpen, setIsNormenOpen] = useState(true);
    const [selectedNorms, setSelectedNorms] = useState([]);
    const [itemsToDelete, setItemsToDelete] = useState(null);

    const getNormIdentifier = (norm) => `${norm.leeftijd}-${norm.geslacht}-${norm.punt}-${norm.score_min}`;

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
        const normDocRef = doc(db, 'normen', testId);
        const unsubscribe = onSnapshot(normDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const sortedPuntenSchaal = (data.punten_schaal || []).sort((a, b) => {
                    if (a.leeftijd !== b.leeftijd) return a.leeftijd - b.leeftijd;
                    if (a.geslacht !== b.geslacht) return a.geslacht.localeCompare(b.geslacht);
                    return a.punt - b.punt;
                });
                setNormDocument({ id: docSnap.id, ...data, punten_schaal: sortedPuntenSchaal });
            } else {
                setNormDocument({ id: testId, punten_schaal: [], score_richting: 'hoog', school_id: profile.school_id });
            }
            setLoading(false);
        }, (error) => {
            console.error("Fout bij ophalen normen:", error);
            toast.error("Kon normen niet laden.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, [testId, fetchData, profile.school_id]);
    
    const puntenSchaal = useMemo(() => normDocument?.punten_schaal || [], [normDocument]);
    const uniekeLeeftijden = useMemo(() => [...new Set(puntenSchaal.map(n => n.leeftijd))].sort((a, b) => a - b), [puntenSchaal]);
    const uniekeGeslachten = useMemo(() => [...new Set(puntenSchaal.map(n => n.geslacht))], [puntenSchaal]);

    const gefilterdeNormen = useMemo(() => {
        return puntenSchaal.filter(norm => {
            const leeftijdMatch = selectedLeeftijd === 'all' || norm.leeftijd === Number(selectedLeeftijd);
            const geslachtMatch = selectedGeslacht === 'all' || norm.geslacht === selectedGeslacht;
            return leeftijdMatch && geslachtMatch;
        });
    }, [puntenSchaal, selectedLeeftijd, selectedGeslacht]);

    const handleSaveNewNorm = async () => {
        if (!newNorm.leeftijd || !newNorm.score_min || !newNorm.punt) {
            toast.error("Vul alle velden in (leeftijd, score, punt).");
            return;
        }
        const normObject = {
            leeftijd: Number(newNorm.leeftijd),
            geslacht: newNorm.geslacht,
            score_min: Number(newNorm.score_min),
            punt: Number(newNorm.punt)
        };
        const normDocRef = doc(db, 'normen', testId);
        const promise = updateDoc(normDocRef, {
            punten_schaal: arrayUnion(normObject),
            test_id: testId,
            school_id: profile.school_id,
            score_richting: test?.score_richting || 'hoog'
        }).catch(err => {
            if (err.code === 'not-found') {
                return setDoc(normDocRef, {
                    punten_schaal: [normObject],
                    test_id: testId,
                    school_id: profile.school_id,
                    score_richting: test?.score_richting || 'hoog'
                });
            }
            throw err;
        });
        toast.promise(promise, {
            loading: 'Nieuwe norm opslaan...',
            success: () => { setIsAdding(false); setNewNorm({ leeftijd: '', geslacht: 'M', score_min: '', punt: '' }); return "Norm succesvol opgeslagen!"; },
            error: (err) => `Fout: ${err.message}`
        });
    };

    const handleUpdateNorm = async () => {
        const normDocRef = doc(db, 'normen', testId);
        const updatedSchaal = puntenSchaal.map(norm => {
            if (getNormIdentifier(norm) === getNormIdentifier(editingNorm.original)) {
                return { ...editingNorm.current, leeftijd: Number(editingNorm.current.leeftijd), score_min: Number(editingNorm.current.score_min), punt: Number(editingNorm.current.punt) };
            }
            return norm;
        });
        const promise = updateDoc(normDocRef, { punten_schaal: updatedSchaal });
        toast.promise(promise, {
            loading: 'Norm bijwerken...',
            success: () => { setEditingNorm(null); return "Norm succesvol bijgewerkt!"; },
            error: (err) => `Fout: ${err.message}`
        });
    };

    const executeDelete = async () => {
        if (!itemsToDelete) return;
        const normDocRef = doc(db, 'normen', testId);
        let promise;
        let successMessage;
        if (Array.isArray(itemsToDelete)) {
            const identifiersToDelete = new Set(itemsToDelete);
            const nieuweSchaal = puntenSchaal.filter(norm => !identifiersToDelete.has(getNormIdentifier(norm)));
            promise = updateDoc(normDocRef, { punten_schaal: nieuweSchaal });
            successMessage = `${itemsToDelete.length} normen succesvol verwijderd!`;
        } else {
            promise = updateDoc(normDocRef, { punten_schaal: arrayRemove(itemsToDelete) });
            successMessage = "Norm succesvol verwijderd!";
        }
        toast.promise(promise, {
            loading: 'Bezig met verwijderen...',
            success: () => { setSelectedNorms([]); return successMessage; },
            error: "Kon de norm(en) niet verwijderen."
        });
        setItemsToDelete(null);
    };

    // ... overige functies zoals handleCsvUpload, handleSelectNorm, etc. blijven hetzelfde ...
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

                const nieuweNormen = results.data.map(row => {
                    const geslachtCleaned = (row.geslacht || '').trim().toUpperCase();
                    return {
                        leeftijd: Number(row.leeftijd),
                        geslacht: geslachtCleaned.startsWith('M') ? 'M' : 'V',
                        score_min: Number(row.score_min),
                        punt: Number(row.punt)
                    };
                });
                
                const bestaandeIdentifiers = new Set(puntenSchaal.map(getNormIdentifier));
                const uniekeNieuweNormen = nieuweNormen.filter(norm => !bestaandeIdentifiers.has(getNormIdentifier(norm)));

                const samengevoegdeSchaal = [...puntenSchaal, ...uniekeNieuweNormen];
                const normDocRef = doc(db, 'normen', testId);
                const promise = updateDoc(normDocRef, { punten_schaal: samengevoegdeSchaal });

                toast.promise(promise, {
                    loading: `Bezig met importeren van ${nieuweNormen.length} normen...`,
                    success: `${uniekeNieuweNormen.length} nieuwe normen succesvol geïmporteerd!`,
                    error: (err) => `Import mislukt: ${err.message}`
                });
            },
            error: (error) => { toast.error(`Fout bij het lezen van het bestand: ${error.message}`); }
        });
        event.target.value = null;
    };
    
    const handleSelectNorm = (normIdentifier) => {
        setSelectedNorms(prev => 
            prev.includes(normIdentifier) 
                ? prev.filter(id => id !== normIdentifier) 
                : [...prev, normIdentifier]
        );
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedNorms(gefilterdeNormen.map(getNormIdentifier));
        } else {
            setSelectedNorms([]);
        }
    };
    
    if (loading) return <div>Laden...</div>; // Simple loading state

    return (
        <>
            <ConfirmModal isOpen={!!itemsToDelete} onClose={() => setItemsToDelete(null)} onConfirm={executeDelete} title="Prestatienorm(en) verwijderen">
                {`Weet u zeker dat u ${Array.isArray(itemsToDelete) ? itemsToDelete.length : 'deze'} norm(en) wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`}
            </ConfirmModal>
            
            <TestFormModal isOpen={isTestModalOpen} onClose={() => setIsTestModalOpen(false)} onTestSaved={() => { fetchData(); setIsTestModalOpen(false); }} testData={test} schoolId={profile?.school_id} />
            
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 p-4 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                     <Link to="/testbeheer" className="flex items-center text-sm text-gray-600 hover:text-purple-700 font-semibold transition-colors duration-200">
                        <ArrowLeftIcon className="h-4 w-4 mr-2" />
                        Terug naar testbeheer
                    </Link>
                    
                    {/* ... Test Details sectie ... */}

                    <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-lg border border-white/20 overflow-hidden">
                        <div className="p-4 lg:p-6">
                            <h2 className="text-xl font-bold text-gray-800">Prestatienormen</h2>
                            {/* ... Filters en knoppen ... */}
                        </div>
                        <div className="p-4 lg:p-6">
                            { gefilterdeNormen.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-2xl">Geen normen gevonden.</div>
                            ) : (
                                <div className="overflow-x-auto rounded-2xl">
                                    <table className="min-w-full bg-white rounded-2xl shadow-sm">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="py-3 px-6 text-left"><input type="checkbox" onChange={handleSelectAll} /></th>
                                                <th className="py-3 px-6 text-left text-xs font-semibold text-gray-600 uppercase">Leeftijd</th>
                                                <th className="py-3 px-6 text-left text-xs font-semibold text-gray-600 uppercase">Geslacht</th>
                                                <th className="py-3 px-6 text-left text-xs font-semibold text-gray-600 uppercase">Min. Score</th>
                                                <th className="py-3 px-6 text-left text-xs font-semibold text-gray-600 uppercase">Punt</th>
                                                <th className="py-3 px-6 text-left text-xs font-semibold text-gray-600 uppercase">Acties</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {gefilterdeNormen.map((norm, index) => {
                                                const normId = getNormIdentifier(norm);
                                                const isEditingThis = editingNorm?.original && getNormIdentifier(editingNorm.original) === normId;
                                                return (
                                                    <tr key={normId} className="hover:bg-blue-50 transition-colors">
                                                        <td className="py-4 px-6"><input type="checkbox" checked={selectedNorms.includes(normId)} onChange={() => handleSelectNorm(normId)} /></td>
                                                        
                                                        {/* --- FIX: DEZE CELLEN ONTBRAKEN --- */}
                                                        {isEditingThis ? (
                                                            <>
                                                                <td><input type="number" value={editingNorm.current.leeftijd} onChange={e => setEditingNorm(prev => ({...prev, current: {...prev.current, leeftijd: e.target.value}}))} className="w-20 p-1 border rounded" /></td>
                                                                <td><select value={editingNorm.current.geslacht} onChange={e => setEditingNorm(prev => ({...prev, current: {...prev.current, geslacht: e.target.value}}))} className="w-24 p-1 border rounded"><option value="M">M</option><option value="V">V</option></select></td>
                                                                <td><input type="number" value={editingNorm.current.score_min} onChange={e => setEditingNorm(prev => ({...prev, current: {...prev.current, score_min: e.target.value}}))} className="w-24 p-1 border rounded" /></td>
                                                                <td><input type="number" value={editingNorm.current.punt} onChange={e => setEditingNorm(prev => ({...prev, current: {...prev.current, punt: e.target.value}}))} className="w-20 p-1 border rounded" /></td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="py-4 px-6 text-sm text-gray-700">{norm.leeftijd}</td>
                                                                <td className="py-4 px-6 text-sm text-gray-700">{norm.geslacht}</td>
                                                                <td className="py-4 px-6 text-sm font-semibold text-gray-900">{norm.score_min}</td>
                                                                <td className="py-4 px-6 text-sm font-semibold text-purple-700">{norm.punt}</td>
                                                            </>
                                                        )}
                                                        {/* --- EINDE FIX --- */}
                                                        
                                                        <td className="py-4 px-6">
                                                            <div className="flex gap-2 items-center">
                                                                {isEditingThis ? (
                                                                    <>
                                                                        <button onClick={handleUpdateNorm} className="text-green-600 p-2 rounded-lg hover:bg-green-50"><CheckIcon className="h-4 w-4"/></button>
                                                                        <button onClick={() => setEditingNorm(null)} className="text-gray-500 p-2 rounded-lg hover:bg-gray-100"><XMarkIcon className="h-4 w-4"/></button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <button onClick={() => setEditingNorm({ original: norm, current: { ...norm } })} className="text-blue-600 p-2 rounded-lg hover:bg-blue-50"><PencilIcon className="h-4 w-4"/></button>
                                                                        <button onClick={() => setItemsToDelete(norm)} className="text-red-600 p-2 rounded-lg hover:bg-red-50"><TrashIcon className="h-4 w-4"/></button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}