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
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [isTestDetailsOpen, setIsTestDetailsOpen] = useState(false);
    const [isNormenOpen, setIsNormenOpen] = useState(true);
    const [selectedNorms, setSelectedNorms] = useState([]);
    const [itemsToDelete, setItemsToDelete] = useState(null);

    const getNormIdentifier = (norm) => `${norm.leeftijd}-${norm.geslacht}-${norm.punt}-${norm.score_min}`;

    const fetchData = useCallback(async () => {
        const testRef = doc(db, 'testen', testId);
        const testSnap = await getDoc(testRef);
        if (testSnap.exists()) {
            setTest({ id: testSnap.id, ...testSnap.data() });
        } else { toast.error("Kon testdetails niet laden."); }
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

    const handleSaveNewNorm = async () => { /* ... Logica ongewijzigd ... */ };
    const handleUpdateNorm = async () => { /* ... Logica ongewijzigd ... */ };
    const executeDelete = async () => { /* ... Logica ongewijzigd ... */ };
    const handleCsvUpload = (event) => { /* ... Logica ongewijzigd ... */ };

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

    if (loading) return <div>Laden...</div>;

    return (
        <>
            <ConfirmModal isOpen={!!itemsToDelete} onClose={() => setItemsToDelete(null)} onConfirm={executeDelete} title="Norm(en) verwijderen" />
            <TestFormModal isOpen={isTestModalOpen} onClose={() => setIsTestModalOpen(false)} onTestSaved={fetchData} testData={test} schoolId={profile?.school_id} />
            
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 p-4 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <Link to="/testbeheer" className="flex items-center text-sm text-gray-600 hover:text-purple-700 font-semibold">
                        <ArrowLeftIcon className="h-4 w-4 mr-2" />
                        Terug naar testbeheer
                    </Link>
                    
                    <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-lg border border-white/20 overflow-hidden">
                        <div className="p-4 lg:p-6">
                            <div className="w-full flex justify-between items-center group">
                                <div onClick={() => setIsTestDetailsOpen(!isTestDetailsOpen)} className="flex items-center space-x-3 cursor-pointer flex-grow">
                                    {/* Header testdetails */}
                                    <div className="text-left">
                                        <h1 className="text-lg lg:text-2xl font-bold text-gray-900 group-hover:text-purple-700">{test?.naam}</h1>
                                        <p className="text-xs lg:text-sm text-gray-600">Testgegevens</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 lg:space-x-3">
                                    <button onClick={(e) => { e.stopPropagation(); setIsTestModalOpen(true); }} className="text-blue-600 p-2 rounded-xl hover:bg-blue-50">
                                        <PencilIcon className="h-4 w-4"/> 
                                    </button>
                                    <button onClick={() => setIsTestDetailsOpen(!isTestDetailsOpen)}>
                                        <ChevronDownIcon className={`h-5 w-5 text-gray-400 transform transition-transform ${isTestDetailsOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>
                            </div>
                            
                            {/* --- FIX: PREVIEW SECTIE WANNEER INGEKLAPT --- */}
                            {!isTestDetailsOpen && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                        <div><span className="text-gray-500">Categorie:</span><span className="ml-2 font-medium text-gray-800">{test?.categorie}</span></div>
                                        <div><span className="text-gray-500">Eenheid:</span><span className="ml-2 font-medium text-gray-800">{test?.eenheid || '-'}</span></div>
                                        <div><span className="text-gray-500">Normen:</span><span className="ml-2 font-medium text-gray-800">{puntenSchaal.length} items</span></div>
                                    </div>
                                    {test?.beschrijving && (
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                            <p className="text-sm text-gray-600 line-clamp-2">{test.beschrijving}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* Volledige details wanneer uitgeklapt */}
                            {isTestDetailsOpen && (
                                <div className="mt-6 pt-6 border-t border-gray-100 space-y-6">
                                    {/* ... volledige beschrijving en details hier ... */}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-lg border border-white/20 overflow-hidden">
                        <div className="p-4 lg:p-6">
                            <h2 className="text-xl font-bold text-gray-800">Prestatienormen</h2>
                            
                            {/* --- FIX: FILTERS SECTIE --- */}
                            <div className="my-4 space-y-4">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <select value={selectedLeeftijd} onChange={(e) => setSelectedLeeftijd(e.target.value)} className="flex-1 p-3 border border-gray-200 rounded-xl text-sm">
                                        <option value="all">Alle leeftijden</option>
                                        {uniekeLeeftijden.map(leeftijd => <option key={leeftijd} value={leeftijd}>{leeftijd} jaar</option>)}
                                    </select>
                                    <select value={selectedGeslacht} onChange={(e) => setSelectedGeslacht(e.target.value)} className="flex-1 p-3 border border-gray-200 rounded-xl text-sm">
                                        <option value="all">Alle geslachten</option>
                                        {uniekeGeslachten.map(geslacht => <option key={geslacht} value={geslacht}>{geslacht === 'M' ? 'Mannelijk' : 'Vrouwelijk'}</option>)}
                                    </select>
                                </div>
                                {/* ... Knoppen zoals Import en Nieuw ... */}
                            </div>

                            {/* Tabel met normen */}
                            <div className="overflow-x-auto rounded-2xl">
                                <table className="min-w-full bg-white rounded-2xl shadow-sm">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            {/* --- FIX: WERKEND SELECTIEVAKJE --- */}
                                            <th className="py-3 px-6"><input type="checkbox" onChange={handleSelectAll} checked={gefilterdeNormen.length > 0 && selectedNorms.length === gefilterdeNormen.length} /></th>
                                            <th className="py-3 px-6 text-left text-xs font-semibold text-gray-600 uppercase">Leeftijd</th>
                                            <th className="py-3 px-6 text-left text-xs font-semibold text-gray-600 uppercase">Geslacht</th>
                                            <th className="py-3 px-6 text-left text-xs font-semibold text-gray-600 uppercase">Min. Score</th>
                                            <th className="py-3 px-6 text-left text-xs font-semibold text-gray-600 uppercase">Punt</th>
                                            <th className="py-3 px-6 text-left text-xs font-semibold text-gray-600 uppercase">Acties</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {gefilterdeNormen.map((norm) => {
                                            const normId = getNormIdentifier(norm);
                                            const isEditingThis = editingNorm?.original && getNormIdentifier(editingNorm.original) === normId;
                                            return (
                                                <tr key={normId} className="hover:bg-blue-50">
                                                    {/* --- FIX: WERKEND SELECTIEVAKJE --- */}
                                                    <td className="py-4 px-6"><input type="checkbox" checked={selectedNorms.includes(normId)} onChange={() => handleSelectNorm(normId)} /></td>
                                                    {isEditingThis ? (
                                                        <>
                                                            {/* Edit form velden */}
                                                            <td><input type="number" value={editingNorm.current.leeftijd} onChange={e => setEditingNorm(p => ({...p, current: {...p.current, leeftijd: e.target.value}}))} className="w-20 p-1 border rounded" /></td>
                                                            <td><select value={editingNorm.current.geslacht} onChange={e => setEditingNorm(p => ({...p, current: {...p.current, geslacht: e.target.value}}))} className="w-24 p-1 border rounded"><option value="M">M</option><option value="V">V</option></select></td>
                                                            <td><input type="number" value={editingNorm.current.score_min} onChange={e => setEditingNorm(p => ({...p, current: {...p.current, score_min: e.target.value}}))} className="w-24 p-1 border rounded" /></td>
                                                            <td><input type="number" value={editingNorm.current.punt} onChange={e => setEditingNorm(p => ({...p, current: {...p.current, punt: e.target.value}}))} className="w-20 p-1 border rounded" /></td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {/* Norm data weergave */}
                                                            <td className="py-4 px-6">{norm.leeftijd}</td>
                                                            <td className="py-4 px-6">{norm.geslacht}</td>
                                                            <td className="py-4 px-6 font-semibold">{norm.score_min}</td>
                                                            <td className="py-4 px-6 font-semibold text-purple-700">{norm.punt}</td>
                                                        </>
                                                    )}
                                                    <td className="py-4 px-6">
                                                        <div className="flex gap-2 items-center">
                                                            {/* --- FIX: WERKEND KNOPPEN --- */}
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
                         </div>
                    </div>
                </div>
            </div>
        </>
    );
}