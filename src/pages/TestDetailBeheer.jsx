// src/pages/TestDetailBeheer.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, onSnapshot, updateDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useOutletContext } from 'react-router-dom';
import { ArrowLeftIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon, ArrowUpTrayIcon, ChevronDownIcon, EllipsisVerticalIcon } from '@heroicons/react/24/solid';
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
    const [showMobileMenu, setShowMobileMenu] = useState({});

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

    const toggleMobileMenu = (normId) => {
        setShowMobileMenu(prev => ({
            ...prev,
            [normId]: !prev[normId]
        }));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-2xl shadow-sm">
                    <div className="flex items-center space-x-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        <span className="text-gray-700 font-medium">Laden...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <ConfirmModal isOpen={!!itemsToDelete} onClose={() => setItemsToDelete(null)} onConfirm={executeDelete} title="Norm(en) verwijderen" />
            <TestFormModal isOpen={isTestModalOpen} onClose={() => setIsTestModalOpen(false)} onTestSaved={fetchData} testData={test} schoolId={profile?.school_id} />
            
            {/* VOLLEDIG SCHERM ACHTERGROND */}
            <div className="min-h-screen bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 py-6 lg:px-8 lg:py-8 space-y-6">
                    
                    {/* Breadcrumb */}
                    <Link to="/testbeheer" className="inline-flex items-center text-sm text-slate-600 hover:text-purple-700 font-medium transition-colors">
                        <ArrowLeftIcon className="h-4 w-4 mr-2" />
                        Terug naar testbeheer
                    </Link>
                    
                    {/* Test Details Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                        <div className="p-6">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">{test?.naam}</h1>
                                        <button 
                                            onClick={() => setIsTestModalOpen(true)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Bewerk test"
                                        >
                                            <PencilIcon className="h-5 w-5"/> 
                                        </button>
                                    </div>
                                    
                                    {/* Altijd zichtbare preview info */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                        <div className="bg-slate-50 rounded-xl p-4">
                                            <div className="text-sm text-slate-500 font-medium">Categorie</div>
                                            <div className="text-lg font-semibold text-slate-900">{test?.categorie || '-'}</div>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-4">
                                            <div className="text-sm text-slate-500 font-medium">Eenheid</div>
                                            <div className="text-lg font-semibold text-slate-900">{test?.eenheid || '-'}</div>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-4">
                                            <div className="text-sm text-slate-500 font-medium">Totaal normen</div>
                                            <div className="text-lg font-semibold text-purple-700">{puntenSchaal.length}</div>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-4">
                                            <div className="text-sm text-slate-500 font-medium">Score richting</div>
                                            <div className="text-lg font-semibold text-slate-900 capitalize">{normDocument?.score_richting || 'Hoog'}</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => setIsTestDetailsOpen(!isTestDetailsOpen)}
                                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors ml-4"
                                >
                                    <ChevronDownIcon className={`h-6 w-6 transform transition-transform ${isTestDetailsOpen ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                            
                            {/* Uitklapbare details */}
                            {isTestDetailsOpen && test?.beschrijving && (
                                <div className="pt-6 border-t border-slate-200">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Beschrijving</h3>
                                    <p className="text-slate-600 leading-relaxed">{test.beschrijving}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Normen Sectie */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-slate-900">Prestatienormen</h2>
                                <div className="text-sm text-slate-500">
                                    {gefilterdeNormen.length} van {puntenSchaal.length} normen
                                </div>
                            </div>
                            
                            {/* Filters en Acties */}
                            <div className="space-y-4 mb-6">
                                <div className="flex flex-col lg:flex-row gap-4">
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <select 
                                            value={selectedLeeftijd} 
                                            onChange={(e) => setSelectedLeeftijd(e.target.value)} 
                                            className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:border-purple-500 focus:ring-purple-500"
                                        >
                                            <option value="all">Alle leeftijden</option>
                                            {uniekeLeeftijden.map(leeftijd => 
                                                <option key={leeftijd} value={leeftijd}>{leeftijd} jaar</option>
                                            )}
                                        </select>
                                        <select 
                                            value={selectedGeslacht} 
                                            onChange={(e) => setSelectedGeslacht(e.target.value)} 
                                            className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:border-purple-500 focus:ring-purple-500"
                                        >
                                            <option value="all">Alle geslachten</option>
                                            {uniekeGeslachten.map(geslacht => 
                                                <option key={geslacht} value={geslacht}>
                                                    {geslacht === 'M' ? 'Mannelijk' : 'Vrouwelijk'}
                                                </option>
                                            )}
                                        </select>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <button className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium">
                                            Nieuwe norm
                                        </button>
                                        <button className="px-4 py-2 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-colors font-medium">
                                            <ArrowUpTrayIcon className="h-4 w-4 mr-2 inline" />
                                            Import CSV
                                        </button>
                                    </div>
                                </div>
                                
                                {selectedNorms.length > 0 && (
                                    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-200">
                                        <span className="text-purple-700 font-medium">
                                            {selectedNorms.length} item(s) geselecteerd
                                        </span>
                                        <button 
                                            onClick={() => setItemsToDelete(selectedNorms)}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                                        >
                                            Verwijder geselecteerde
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* RESPONSIVE TABEL/CARDS */}
                            {gefilterdeNormen.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-slate-400 text-lg mb-2">Geen normen gevonden</div>
                                    <div className="text-slate-500">Pas de filters aan of voeg nieuwe normen toe</div>
                                </div>
                            ) : (
                                <>
                                    {/* Desktop Tabel (verborgen op mobiel) */}
                                    <div className="hidden lg:block overflow-hidden rounded-xl border border-slate-200">
                                        <table className="min-w-full bg-white">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="py-4 px-6 text-left">
                                                        <input 
                                                            type="checkbox" 
                                                            onChange={handleSelectAll} 
                                                            checked={gefilterdeNormen.length > 0 && selectedNorms.length === gefilterdeNormen.length}
                                                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                                        />
                                                    </th>
                                                    <th className="py-4 px-6 text-left text-sm font-semibold text-slate-700">Leeftijd</th>
                                                    <th className="py-4 px-6 text-left text-sm font-semibold text-slate-700">Geslacht</th>
                                                    <th className="py-4 px-6 text-left text-sm font-semibold text-slate-700">Min. Score</th>
                                                    <th className="py-4 px-6 text-left text-sm font-semibold text-slate-700">Punt</th>
                                                    <th className="py-4 px-6 text-left text-sm font-semibold text-slate-700">Acties</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {gefilterdeNormen.map((norm) => {
                                                    const normId = getNormIdentifier(norm);
                                                    const isEditingThis = editingNorm?.original && getNormIdentifier(editingNorm.original) === normId;
                                                    return (
                                                        <tr key={normId} className="hover:bg-slate-50 transition-colors">
                                                            <td className="py-4 px-6">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={selectedNorms.includes(normId)} 
                                                                    onChange={() => handleSelectNorm(normId)}
                                                                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                                                />
                                                            </td>
                                                            {isEditingThis ? (
                                                                <>
                                                                    <td className="py-4 px-6">
                                                                        <input 
                                                                            type="number" 
                                                                            value={editingNorm.current.leeftijd} 
                                                                            onChange={e => setEditingNorm(p => ({...p, current: {...p.current, leeftijd: e.target.value}}))} 
                                                                            className="w-20 p-2 border border-slate-300 rounded-lg focus:border-purple-500 focus:ring-purple-500"
                                                                        />
                                                                    </td>
                                                                    <td className="py-4 px-6">
                                                                        <select 
                                                                            value={editingNorm.current.geslacht} 
                                                                            onChange={e => setEditingNorm(p => ({...p, current: {...p.current, geslacht: e.target.value}}))} 
                                                                            className="w-24 p-2 border border-slate-300 rounded-lg focus:border-purple-500 focus:ring-purple-500"
                                                                        >
                                                                            <option value="M">M</option>
                                                                            <option value="V">V</option>
                                                                        </select>
                                                                    </td>
                                                                    <td className="py-4 px-6">
                                                                        <input 
                                                                            type="number" 
                                                                            value={editingNorm.current.score_min} 
                                                                            onChange={e => setEditingNorm(p => ({...p, current: {...p.current, score_min: e.target.value}}))} 
                                                                            className="w-24 p-2 border border-slate-300 rounded-lg focus:border-purple-500 focus:ring-purple-500"
                                                                        />
                                                                    </td>
                                                                    <td className="py-4 px-6">
                                                                        <input 
                                                                            type="number" 
                                                                            value={editingNorm.current.punt} 
                                                                            onChange={e => setEditingNorm(p => ({...p, current: {...p.current, punt: e.target.value}}))} 
                                                                            className="w-20 p-2 border border-slate-300 rounded-lg focus:border-purple-500 focus:ring-purple-500"
                                                                        />
                                                                    </td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td className="py-4 px-6 font-medium text-slate-900">{norm.leeftijd} jaar</td>
                                                                    <td className="py-4 px-6 text-slate-700">{norm.geslacht}</td>
                                                                    <td className="py-4 px-6 font-semibold text-slate-900">{norm.score_min}</td>
                                                                    <td className="py-4 px-6 font-semibold text-purple-700">{norm.punt}</td>
                                                                </>
                                                            )}
                                                            <td className="py-4 px-6">
                                                                <div className="flex items-center gap-2">
                                                                    {isEditingThis ? (
                                                                        <>
                                                                            <button 
                                                                                onClick={handleUpdateNorm} 
                                                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                            >
                                                                                <CheckIcon className="h-4 w-4"/>
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => setEditingNorm(null)} 
                                                                                className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
                                                                            >
                                                                                <XMarkIcon className="h-4 w-4"/>
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <button 
                                                                                onClick={() => setEditingNorm({ original: norm, current: { ...norm } })} 
                                                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                            >
                                                                                <PencilIcon className="h-4 w-4"/>
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => setItemsToDelete(norm)} 
                                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                            >
                                                                                <TrashIcon className="h-4 w-4"/>
                                                                            </button>
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

                                    {/* Mobiele Cards (verborgen op desktop) */}
                                    <div className="lg:hidden space-y-3">
                                        {gefilterdeNormen.map((norm) => {
                                            const normId = getNormIdentifier(norm);
                                            const isEditingThis = editingNorm?.original && getNormIdentifier(editingNorm.original) === normId;
                                            return (
                                                <div key={normId} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center space-x-3">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={selectedNorms.includes(normId)} 
                                                                onChange={() => handleSelectNorm(normId)}
                                                                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                                            />
                                                            <div>
                                                                <div className="font-semibold text-slate-900">
                                                                    {norm.leeftijd} jaar • {norm.geslacht}
                                                                </div>
                                                                <div className="text-sm text-slate-500">
                                                                    Score: {norm.score_min} → Punt: {norm.punt}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="relative">
                                                            <button 
                                                                onClick={() => toggleMobileMenu(normId)}
                                                                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                                                            >
                                                                <EllipsisVerticalIcon className="h-5 w-5" />
                                                            </button>
                                                            
                                                            {showMobileMenu[normId] && (
                                                                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px] z-10">
                                                                    <button 
                                                                        onClick={() => {
                                                                            setEditingNorm({ original: norm, current: { ...norm } });
                                                                            setShowMobileMenu(prev => ({ ...prev, [normId]: false }));
                                                                        }}
                                                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                                                                    >
                                                                        <PencilIcon className="h-4 w-4 mr-2" />
                                                                        Bewerken
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => {
                                                                            setItemsToDelete(norm);
                                                                            setShowMobileMenu(prev => ({ ...prev, [normId]: false }));
                                                                        }}
                                                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                                                                    >
                                                                        <TrashIcon className="h-4 w-4 mr-2" />
                                                                        Verwijderen
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {isEditingThis && (
                                                        <div className="pt-3 border-t border-slate-200 space-y-3">
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-600 mb-1">Leeftijd</label>
                                                                    <input 
                                                                        type="number" 
                                                                        value={editingNorm.current.leeftijd} 
                                                                        onChange={e => setEditingNorm(p => ({...p, current: {...p.current, leeftijd: e.target.value}}))} 
                                                                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:border-purple-500 focus:ring-purple-500"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-600 mb-1">Geslacht</label>
                                                                    <select 
                                                                        value={editingNorm.current.geslacht} 
                                                                        onChange={e => setEditingNorm(p => ({...p, current: {...p.current, geslacht: e.target.value}}))} 
                                                                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:border-purple-500 focus:ring-purple-500"
                                                                    >
                                                                        <option value="M">M</option>
                                                                        <option value="V">V</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-600 mb-1">Min. Score</label>
                                                                    <input 
                                                                        type="number" 
                                                                        value={editingNorm.current.score_min} 
                                                                        onChange={e => setEditingNorm(p => ({...p, current: {...p.current, score_min: e.target.value}}))} 
                                                                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:border-purple-500 focus:ring-purple-500"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-600 mb-1">Punt</label>
                                                                    <input 
                                                                        type="number" 
                                                                        value={editingNorm.current.punt} 
                                                                        onChange={e => setEditingNorm(p => ({...p, current: {...p.current, punt: e.target.value}}))} 
                                                                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:border-purple-500 focus:ring-purple-500"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2 pt-2">
                                                                <button 
                                                                    onClick={handleUpdateNorm} 
                                                                    className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                                                                >
                                                                    Opslaan
                                                                </button>
                                                                <button 
                                                                    onClick={() => setEditingNorm(null)}
                                                                    className="flex-1 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm"
                                                                >
                                                                    Annuleren
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}