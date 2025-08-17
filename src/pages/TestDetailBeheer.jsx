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
    const [isNormenExpanded, setIsNormenExpanded] = useState(false);
    const [selectedNorms, setSelectedNorms] = useState([]);
    const [itemsToDelete, setItemsToDelete] = useState(null);
    const [showMobileMenu, setShowMobileMenu] = useState({});

    // Aantal items om te tonen in preview
    const PREVIEW_COUNT = 5;

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

    // Bepaal welke normen te tonen (preview of volledig)
    const normenToShow = useMemo(() => {
        return isNormenExpanded ? gefilterdeNormen : gefilterdeNormen.slice(0, PREVIEW_COUNT);
    }, [gefilterdeNormen, isNormenExpanded]);

// Parse gestructureerde beschrijving
    const parseTestBeschrijving = (beschrijving) => {
        if (!beschrijving) return null;
        
        const sections = {};
        const lines = beschrijving.split('\n').filter(line => line.trim());
        
        let currentSection = null;
        let currentContent = [];
        
        lines.forEach(line => {
            const trimmedLine = line.trim();
            
            // Check voor sectie headers
            if (trimmedLine.toLowerCase().startsWith('doel:')) {
                if (currentSection) {
                    sections[currentSection] = currentContent.join('\n');
                }
                currentSection = 'doel';
                currentContent = [trimmedLine.substring(5).trim()];
            } else if (trimmedLine.toLowerCase().startsWith('procedure:')) {
                if (currentSection) {
                    sections[currentSection] = currentContent.join('\n');
                }
                currentSection = 'procedure';
                currentContent = [];
            } else if (trimmedLine.toLowerCase().startsWith('benodigdheden:')) {
                if (currentSection) {
                    sections[currentSection] = currentContent.join('\n');
                }
                currentSection = 'benodigdheden';
                currentContent = [trimmedLine.substring(14).trim()];
            } else if (currentSection) {
                currentContent.push(trimmedLine);
            }
        });
        
        // Voeg laatste sectie toe
        if (currentSection) {
            sections[currentSection] = currentContent.join('\n');
        }
        
        return Object.keys(sections).length > 0 ? sections : { beschrijving: beschrijving };
    };

    const renderBeschrijvingContent = (content, type) => {
        if (type === 'procedure') {
            // Split op nummers en maak een geordende lijst
            const steps = content.split(/\d+\./).filter(step => step.trim());
            return (
                <ol className="list-decimal list-inside space-y-2 text-slate-700">
                    {steps.map((step, index) => (
                        <li key={index} className="leading-relaxed">
                            {step.trim()}
                        </li>
                    ))}
                </ol>
            );
        }
        
        return (
            <p className="text-slate-700 leading-relaxed">
                {content}
            </p>
        );
    };

    const handleSaveNewNorm = async () => {
        if (!newNorm.leeftijd || !newNorm.score_min || !newNorm.punt) {
            toast.error("Vul alle velden in.");
            return;
        }
        
        try {
            const normDocRef = doc(db, 'normen', testId);
            await updateDoc(normDocRef, {
                punten_schaal: arrayUnion({
                    leeftijd: Number(newNorm.leeftijd),
                    geslacht: newNorm.geslacht,
                    score_min: Number(newNorm.score_min),
                    punt: Number(newNorm.punt)
                })
            });
            
            setNewNorm({ leeftijd: '', geslacht: 'M', score_min: '', punt: '' });
            setIsAdding(false);
            toast.success("Norm toegevoegd!");
        } catch (error) {
            console.error("Fout bij toevoegen norm:", error);
            toast.error("Kon norm niet toevoegen.");
        }
    };

    const handleUpdateNorm = async () => {
        if (!editingNorm.current.leeftijd || !editingNorm.current.score_min || !editingNorm.current.punt) {
            toast.error("Vul alle velden in.");
            return;
        }
        
        try {
            const normDocRef = doc(db, 'normen', testId);
            await updateDoc(normDocRef, {
                punten_schaal: arrayRemove(editingNorm.original)
            });
            
            await updateDoc(normDocRef, {
                punten_schaal: arrayUnion({
                    leeftijd: Number(editingNorm.current.leeftijd),
                    geslacht: editingNorm.current.geslacht,
                    score_min: Number(editingNorm.current.score_min),
                    punt: Number(editingNorm.current.punt)
                })
            });
            
            setEditingNorm(null);
            toast.success("Norm bijgewerkt!");
        } catch (error) {
            console.error("Fout bij bijwerken norm:", error);
            toast.error("Kon norm niet bijwerken.");
        }
    };

    const executeDelete = async () => {
        try {
            const normDocRef = doc(db, 'normen', testId);
            
            if (Array.isArray(itemsToDelete)) {
                // Meerdere items verwijderen
                const normsToDelete = itemsToDelete.map(id => 
                    gefilterdeNormen.find(norm => getNormIdentifier(norm) === id)
                ).filter(Boolean);
                
                for (const norm of normsToDelete) {
                    await updateDoc(normDocRef, {
                        punten_schaal: arrayRemove(norm)
                    });
                }
                
                setSelectedNorms([]);
                toast.success(`${normsToDelete.length} norm(en) verwijderd!`);
            } else {
                // Enkele norm verwijderen
                await updateDoc(normDocRef, {
                    punten_schaal: arrayRemove(itemsToDelete)
                });
                toast.success("Norm verwijderd!");
            }
            
            setItemsToDelete(null);
        } catch (error) {
            console.error("Fout bij verwijderen norm(en):", error);
            toast.error("Kon norm(en) niet verwijderen.");
        }
    };

    const handleCsvUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const loadingToast = toast.loading('CSV-bestand verwerken...');

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            bom: true, // Belangrijk voor bestanden uit Excel
            transformHeader: header => header.trim(), // Verwijdert spaties
            
            complete: async (results) => {
                toast.dismiss(loadingToast);
                const requiredHeaders = ['leeftijd', 'geslacht', 'score_min', 'punt'];
                
                if (!requiredHeaders.every(h => results.meta.fields.includes(h))) {
                    toast.error(`CSV mist verplichte kolommen. Zorg dat deze aanwezig zijn: ${requiredHeaders.join(', ')}`);
                    console.error("Gevonden headers in CSV:", results.meta.fields);
                    return;
                }

                const uploadPromise = new Promise(async (resolve, reject) => {
                    try {
                        const normen = results.data.map(row => ({
                            leeftijd: Number(row.leeftijd),
                            geslacht: (row.geslacht || '').trim().toUpperCase(),
                            score_min: Number(row.score_min),
                            punt: Number(row.punt)
                        })).filter(norm => 
                            !isNaN(norm.leeftijd) && !isNaN(norm.score_min) && !isNaN(norm.punt) && 
                            ['M', 'V'].includes(norm.geslacht)
                        );

                        if (normen.length === 0) {
                            return reject(new Error("Geen geldige rijen met normen gevonden in het CSV-bestand."));
                        }

                        const normDocRef = doc(db, 'normen', testId);
                        
                        const bestaandeIdentifiers = new Set(puntenSchaal.map(getNormIdentifier));
                        const uniekeNieuweNormen = normen.filter(norm => !bestaandeIdentifiers.has(getNormIdentifier(norm)));

                        if (uniekeNieuweNormen.length === 0) {
                            // Dit is geen fout, dus we resolven met een succesbericht
                            resolve("Alle normen in het bestand bestonden al.");
                            return;
                        }

                        const samengevoegdeSchaal = [...puntenSchaal, ...uniekeNieuweNormen];
                        
                        await setDoc(normDocRef, { 
                            punten_schaal: samengevoegdeSchaal,
                            test_id: testId,
                            school_id: profile.school_id
                        }, { merge: true });

                        resolve(`${uniekeNieuweNormen.length} nieuwe normen succesvol geïmporteerd!`);

                    } catch (error) {
                        // Stuur de specifieke databasefout door
                        reject(error);
                    }
                });

                toast.promise(uploadPromise, {
                    loading: 'Normen importeren naar database...',
                    success: (message) => message,
                    error: (err) => {
                        // --- DIT IS DE VERBETERDE FOUTAFHANDELING ---
                        console.error("Specifieke importfout:", err);
                        if (err.code === 'permission-denied') {
                            return "Import mislukt: onvoldoende rechten. Controleer de database regels.";
                        }
                        if (err.message) {
                           return `Fout: ${err.message}`;
                        }
                        return "Onbekende fout bij het importeren.";
                    }
                });
            },
            error: (parseError) => {
                toast.dismiss(loadingToast);
                console.error("CSV parse fout:", parseError);
                toast.error("Kon het CSV-bestand niet lezen. Is het correct geformatteerd?");
            }
        });

        event.target.value = '';
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

    const toggleMobileMenu = (normId) => {
        setShowMobileMenu(prev => ({
            ...prev,
            [normId]: !prev[normId]
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="bg-white p-8 rounded-2xl shadow-sm">
                    <div className="flex items-center space-x-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        <span className="text-gray-700 font-medium">Laden...</span>
                    </div>
                </div>
            </div>
        );
    }

    const parsedBeschrijving = parseTestBeschrijving(test?.beschrijving);
    
    return (
          <div className="min-h-screen bg-slate-50">
            <ConfirmModal isOpen={!!itemsToDelete} onClose={() => setItemsToDelete(null)} onConfirm={executeDelete} title="Norm(en) verwijderen" />
            <TestFormModal isOpen={isTestModalOpen} onClose={() => setIsTestModalOpen(false)} onTestSaved={fetchData} testData={test} schoolId={profile?.school_id} />
            
            <div className="max-w-7xl mx-auto px-4 py-6 lg:px-8 lg:py-8 space-y-6 pt-24">
                    
                    {/* Terug link */}
                    <Link to="/testbeheer" className="inline-flex items-center text-sm text-slate-600 hover:text-purple-700 font-medium transition-colors">
                        <ArrowLeftIcon className="h-4 w-4 mr-2" />
                        Terug naar testbeheer
                    </Link>
                    
                    {/* Test Details Card - altijd uitgevouwen, geen breadcrumb meer */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                        <div className="p-4 lg:p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <h1 className="text-xl lg:text-3xl font-bold text-slate-900 truncate">{test?.naam}</h1>
                                        <button 
                                            onClick={() => setIsTestModalOpen(true)}
                                            className="flex-shrink-0 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Bewerk test"
                                        >
                                            <PencilIcon className="h-4 w-4 lg:h-5 lg:w-5"/> 
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                           {/* Basis info row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <div className="text-sm text-slate-500 font-medium mb-1">Categorie</div>
                                    <div className="text-lg font-semibold text-slate-900">{test?.categorie || '-'}</div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <div className="text-sm text-slate-500 font-medium mb-1">Eenheid</div>
                                    <div className="text-lg font-semibold text-slate-900">{test?.eenheid || '-'}</div>
                                </div>
                            </div>
                                
                                {/* Gestructureerde inhoud */}
                            <div className="space-y-6">
                                {/* Doel */}
                                {parsedBeschrijving?.doel && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                        <div className="text-sm text-blue-700 font-semibold mb-2 flex items-center">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                            Doel van de test
                                        </div>
                                        <div className="text-slate-700 leading-relaxed">{parsedBeschrijving.doel}</div>
                                    </div>
                                )}
                                
                                {/* Benodigdheden */}
                                {parsedBeschrijving?.benodigdheden && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                        <div className="text-sm text-amber-700 font-semibold mb-2 flex items-center">
                                            <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
                                            Benodigdheden
                                        </div>
                                        <div className="text-slate-700 leading-relaxed">{parsedBeschrijving.benodigdheden}</div>
                                    </div>
                                )}
                                
                                {/* Procedure */}
                                {parsedBeschrijving?.procedure && (
                                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                        <div className="text-sm text-green-700 font-semibold mb-3 flex items-center">
                                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                            Uitvoering procedure
                                        </div>
                                        <div className="text-slate-700">
                                            {renderBeschrijvingContent(parsedBeschrijving.procedure, 'procedure')}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Fallback voor niet-gestructureerde beschrijving */}
                                {parsedBeschrijving?.beschrijving && (
                                    <div className="bg-slate-50 rounded-xl p-4 sm:col-span-2 lg:col-span-3">
                                        <div className="text-sm text-slate-500 font-medium mb-2">Beschrijving</div>
                                        <div className="text-base text-slate-700 leading-relaxed">{parsedBeschrijving.beschrijving}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Normen Sectie */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                        <div className="p-4 lg:p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Prestatienormen</h2>
                                <div className="flex items-center space-x-4">
                                    <div className="text-sm text-slate-500">
                                        {gefilterdeNormen.length} {gefilterdeNormen.length === 1 ? 'norm' : 'normen'}
                                    </div>
                                    <button 
                                        onClick={() => setIsNormenExpanded(!isNormenExpanded)}
                                        className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                                        title={isNormenExpanded ? 'Inklappen' : 'Uitklappen'}
                                    >
                                        <ChevronDownIcon className={`h-5 w-5 transform transition-transform ${isNormenExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Filters en Acties - alleen zichtbaar als uitgevouwen */}
                            {isNormenExpanded && (
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
                                            <button 
                                                onClick={() => setIsAdding(true)}
                                                className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
                                            >
                                                Nieuwe norm
                                            </button>
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-4 py-2 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-colors font-medium"
                                            >
                                                <ArrowUpTrayIcon className="h-4 w-4 mr-2 inline" />
                                                Import CSV
                                            </button>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".csv"
                                                onChange={handleCsvUpload}
                                                className="hidden"
                                            />
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
                            )}

                            {/* Tabel met normen */}
                            {gefilterdeNormen.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-slate-400 text-lg mb-2">Geen normen gevonden</div>
                                    <div className="text-slate-500">Pas de filters aan of voeg nieuwe normen toe</div>
                                </div>
                            ) : (
                                <>
                                    {/* Nieuwe norm toevoegen form */}
                                    {isAdding && (
                                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
                                            <h3 className="text-lg font-semibold text-purple-900 mb-4">Nieuwe norm toevoegen</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-purple-700 mb-1">Leeftijd</label>
                                                    <input 
                                                        type="number" 
                                                        value={newNorm.leeftijd} 
                                                        onChange={e => setNewNorm(p => ({...p, leeftijd: e.target.value}))} 
                                                        className="w-full p-2 border border-purple-300 rounded-lg focus:border-purple-500 focus:ring-purple-500"
                                                        placeholder="14"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-purple-700 mb-1">Geslacht</label>
                                                    <select 
                                                        value={newNorm.geslacht} 
                                                        onChange={e => setNewNorm(p => ({...p, geslacht: e.target.value}))} 
                                                        className="w-full p-2 border border-purple-300 rounded-lg focus:border-purple-500 focus:ring-purple-500"
                                                    >
                                                        <option value="M">M</option>
                                                        <option value="V">V</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-purple-700 mb-1">Min. Score</label>
                                                    <input 
                                                        type="number" 
                                                        value={newNorm.score_min} 
                                                        onChange={e => setNewNorm(p => ({...p, score_min: e.target.value}))} 
                                                        className="w-full p-2 border border-purple-300 rounded-lg focus:border-purple-500 focus:ring-purple-500"
                                                        placeholder="2270"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-purple-700 mb-1">Punt</label>
                                                    <input 
                                                        type="number" 
                                                        value={newNorm.punt} 
                                                        onChange={e => setNewNorm(p => ({...p, punt: e.target.value}))} 
                                                        className="w-full p-2 border border-purple-300 rounded-lg focus:border-purple-500 focus:ring-purple-500"
                                                        placeholder="1"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={handleSaveNewNorm}
                                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                                                >
                                                    Opslaan
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setIsAdding(false);
                                                        setNewNorm({ leeftijd: '', geslacht: 'M', score_min: '', punt: '' });
                                                    }}
                                                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
                                                >
                                                    Annuleren
                                                </button>
                                            </div>
                                        </div>
                                    )}

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
                                                {normenToShow.map((norm) => {
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
                                        {normenToShow.map((norm) => {
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
                                    
                                    {/* Toon meer/minder knop */}
                                    {gefilterdeNormen.length > PREVIEW_COUNT && (
                                        <div className="flex justify-center pt-6">
                                            <button 
                                                onClick={() => setIsNormenExpanded(!isNormenExpanded)}
                                                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors flex items-center space-x-2"
                                            >
                                                {isNormenExpanded ? (
                                                    <>
                                                        <span>Toon minder</span>
                                                        <ChevronDownIcon className="h-4 w-4 rotate-180" />
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>Toon alle {gefilterdeNormen.length} normen</span>
                                                        <ChevronDownIcon className="h-4 w-4" />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
       
    );
}