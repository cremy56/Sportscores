// src/pages/TestDetailBeheer.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon, ArrowUpTrayIcon } from '@heroicons/react/24/solid';
import Papa from 'papaparse';
import TestFormModal from '../components/TestFormModal';

// Importeer uw bestaande, gedeelde modal component
import ConfirmModal from '../components/ConfirmModal'; 

export default function TestDetailBeheer() {
    const { testId } = useParams();
    const [test, setTest] = useState(null);
    const [normen, setNormen] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLeeftijd, setSelectedLeeftijd] = useState('all');
    const [selectedGeslacht, setSelectedGeslacht] = useState('all');
    const [isAdding, setIsAdding] = useState(false);
    const [newNorm, setNewNorm] = useState({ leeftijd: '', geslacht: 'M', score_min: '', punt: '' });
    const [editingNorm, setEditingNorm] = useState(null);
    const fileInputRef = useRef(null);

    // State voor de custom popup
     const [isTestModalOpen, setIsTestModalOpen] = useState(false); // Voor bewerken van de test zelf
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [normToDelete, setNormToDelete] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [testRes, normenRes] = await Promise.all([
            supabase.from('testen').select('*').eq('id', testId).single(),
            supabase.from('normen').select('*').eq('test_id', testId).order('leeftijd').order('geslacht').order('score_min')
        ]);
        if (testRes.error) toast.error("Kon testdetails niet laden."); else setTest(testRes.data);
        if (normenRes.error) toast.error("Kon normen niet laden."); else setNormen(normenRes.data);
        setLoading(false);
    }, [testId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const uniekeLeeftijden = useMemo(() => [...new Set(normen.map(n => n.leeftijd))].sort((a, b) => a - b), [normen]);
    const uniekeGeslachten = useMemo(() => [...new Set(normen.map(n => n.geslacht))], [normen]);

    const gefilterdeNormen = useMemo(() => {
        return normen.filter(norm => {
            const leeftijdMatch = selectedLeeftijd === 'all' || norm.leeftijd === Number(selectedLeeftijd);
            const geslachtMatch = selectedGeslacht === 'all' || norm.geslacht === selectedGeslacht;
            return leeftijdMatch && geslachtMatch;
        });
    }, [normen, selectedLeeftijd, selectedGeslacht]);

    const handleAddNorm = () => {
        setNewNorm({ leeftijd: selectedLeeftijd !== 'all' ? selectedLeeftijd : '', geslacht: selectedGeslacht !== 'all' ? selectedGeslacht : 'M', score_min: '', punt: '' });
        setIsAdding(true);
        setEditingNorm(null);
    };

    const handleSaveNewNorm = async () => {
        if (!newNorm.leeftijd || !newNorm.score_min || !newNorm.punt) {
            toast.error("Vul alle velden in (leeftijd, score, punt).");
            return;
        }
        const promise = supabase.from('normen').insert({ test_id: testId, ...newNorm }).select();
        toast.promise(promise, {
            loading: 'Nieuwe norm opslaan...',
            success: (res) => { if (res.error) throw res.error; fetchData(); setIsAdding(false); return "Norm succesvol opgeslagen!"; },
            error: (err) => `Fout: ${err.message}`
        });
    };

    const handleEditClick = (norm) => {
        setEditingNorm({ ...norm });
        setIsAdding(false);
    };

    const handleUpdateNorm = async () => {
        const { id, test_id, ...updateData } = editingNorm;
        const promise = supabase.from('normen').update(updateData).eq('id', id).select();
        toast.promise(promise, {
            loading: 'Norm bijwerken...',
            success: (res) => { if (res.error) throw res.error; fetchData(); setEditingNorm(null); return "Norm succesvol bijgewerkt!"; },
            error: (err) => `Fout: ${err.message}`
        });
    };

    const promptDeleteNorm = (normId) => {
        setNormToDelete(normId);
        setIsModalOpen(true);
    };

    const executeDelete = async () => {
        if (!normToDelete) return;
        const promise = supabase.from('normen').delete().eq('id', normToDelete);
        toast.promise(promise, {
            loading: 'Norm verwijderen...',
            success: () => {
                fetchData();
                return "Norm succesvol verwijderd!";
            },
            error: "Kon norm niet verwijderen."
        });
        setIsModalOpen(false);
        setNormToDelete(null);
    };

    const handleCsvUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            delimitersToGuess: [',', ';'],
            complete: async (results) => {
                const requiredHeaders = ['leeftijd', 'geslacht', 'score_min', 'punt'];
                const headers = results.meta.fields;
                if (!requiredHeaders.every(h => headers.includes(h))) {
                    toast.error(`CSV-bestand mist verplichte kolommen. Vereist: ${requiredHeaders.join(', ')}`);
                    return;
                }
                const normsToInsert = results.data.map(row => {
                    const geslachtUpper = row.geslacht?.toUpperCase();
                    const finalGeslacht = geslachtUpper === 'J' ? 'M' : geslachtUpper;
                    return {
                        test_id: testId,
                        leeftijd: Number(row.leeftijd),
                        geslacht: finalGeslacht,
                        score_min: Number(row.score_min),
                        punt: Number(row.punt)
                    };
                });
                const validNorms = normsToInsert.filter(n => !isNaN(n.leeftijd) && !isNaN(n.score_min) && !isNaN(n.punt) && (n.geslacht === 'M' || n.geslacht === 'V'));
                if (validNorms.length === 0) {
                    toast.error("Geen geldige rijen gevonden in het CSV-bestand om te importeren. Controleer de data.");
                    return;
                }
                const promise = supabase.from('normen').insert(validNorms);
                toast.promise(promise, {
                    loading: `Bezig met importeren van ${validNorms.length} normen...`,
                    success: () => { fetchData(); return `${validNorms.length} normen succesvol geïmporteerd!`; },
                    error: (err) => `Import mislukt: ${err.message}`
                });
            },
            error: (error) => { toast.error(`Fout bij het lezen van het bestand: ${error.message}`); }
        });
        event.target.value = null;
    };

function parseScoreMin(scoreStr) {
  const match = scoreStr.match(/^(\d{1,2})[’'](\d{2})$/); // voorbeeld: "23’30"
  if (!match) return NaN;
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  return minutes * 60 + seconds;
}
    if (loading) return <p>Laden...</p>;

    return (
        <>
            <ConfirmModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={executeDelete}
                title="Prestatienorm verwijderen"
            >
                Weet u zeker dat u deze norm wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </ConfirmModal>
{/* --- MODAL VOOR HET BEWERKEN VAN DE TEST --- */}
            {isTestModalOpen && (
                <TestFormModal
                    isOpen={isTestModalOpen}
                    onRequestClose={() => setIsTestModalOpen(false)}
                    onTestSaved={fetchData} // Herlaad de data na opslaan
                    testData={test} // Geef de huidige testdata mee
                />
            )}
            {/* ----------------------------------------- */}
            <div className="max-w-7xl mx-auto space-y-8">
                <Link to="/testbeheer" className="flex items-center text-sm text-gray-600 hover:text-purple-700 font-semibold">
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Terug naar testbeheer
                </Link>
                
                <div className="bg-white/60 p-6 rounded-2xl shadow-xl border border-white/30 backdrop-blur-lg">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold">Testgegevens: {test?.naam}</h1>
                        {/* --- DEZE KNOP OPENT NU DE MODAL --- */}
                        <button onClick={() => setIsTestModalOpen(true)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold">
                            <PencilIcon className="h-5 w-5"/> Bewerken
                        </button>
                    </div>
                    {/* --- NIEUWE LAYOUT VOOR TESTDETAILS --- */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                        <div>
                            <h3 className="text-sm font-medium text-gray-500">Categorie</h3>
                            <p className="font-semibold text-gray-800">{test?.categorie}</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-500">Eenheid</h3>
                            <p className="font-semibold text-gray-800">{test?.eenheid || '-'}</p>
                        </div>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-sm font-medium text-gray-500">Beschrijving</h3>
                        <details className="text-gray-800">
                            <summary className="cursor-pointer text-sm">
                                {test?.beschrijving?.split('.')[0] || "Geen beschrijving."}
                                {test?.beschrijving?.includes('.') && '... (lees meer)'}
                            </summary>
                            <p className="mt-2 text-sm">{test?.beschrijving}</p>
                        </details>
                    </div>
                    {/* ------------------------------------ */}
                </div>

                <div className="bg-white/60 p-6 rounded-2xl shadow-xl border border-white/30 backdrop-blur-lg">
                    <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4 flex-wrap">
                        <h2 className="text-2xl font-bold">Prestatienormen</h2>
                        <div className="flex items-center gap-4">
                            <div>
                                <label htmlFor="leeftijd-filter" className="block text-sm font-medium text-gray-700">Leeftijd</label>
                                <select id="leeftijd-filter" value={selectedLeeftijd} onChange={(e) => setSelectedLeeftijd(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md">
                                    <option value="all">Alle</option>
                                    {uniekeLeeftijden.map(leeftijd => <option key={leeftijd} value={leeftijd}>{leeftijd}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="geslacht-filter" className="block text-sm font-medium text-gray-700">Geslacht</label>
                                <select id="geslacht-filter" value={selectedGeslacht} onChange={(e) => setSelectedGeslacht(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md">
                                    <option value="all">Alle</option>
                                    {uniekeGeslachten.map(geslacht => <option key={geslacht} value={geslacht}>{geslacht}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2 self-start md:self-end">
                            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCsvUpload} className="hidden" />
                            <button onClick={() => fileInputRef.current.click()} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                                <ArrowUpTrayIcon className="h-5 w-5" />
                                Importeer CSV
                            </button>
                            <button onClick={handleAddNorm} disabled={isAdding || editingNorm} className="bg-purple-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400">
                                + Nieuwe Norm
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white rounded-lg">
                            <thead>
                                <tr className="bg-gray-50">
                                    {/* STYLING AANGEPAST: py-2 px-3 */}
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
                                        {/* STYLING AANGEPAST: py-1 px-2 */}
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
                                                {/* STYLING AANGEPAST: py-1 px-2 */}
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
                                                {/* STYLING AANGEPAST: py-2 px-3 en text-sm */}
                                                <td className="py-2 px-3 text-sm">{norm.leeftijd}</td>
                                                <td className="py-2 px-3 text-sm">{norm.geslacht}</td>
                                                <td className="py-2 px-3 text-sm">{norm.score_min}</td>
                                                <td className="py-2 px-3 text-sm">{norm.punt}</td>
                                                <td className="py-2 px-3 flex gap-4 items-center">
                                                    <button onClick={() => handleEditClick(norm)} className="text-blue-600 hover:text-blue-800"><PencilIcon className="h-4 w-4"/></button>
                                                    <button onClick={() => promptDeleteNorm(norm.id)} className="text-red-600 hover:text-red-800"><TrashIcon className="h-4 w-4"/></button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {gefilterdeNormen.length === 0 && !isAdding && <p className="text-center py-4 text-gray-500">Geen normen gevonden voor deze selectie.</p>}
                </div>
            </div>
        </>
    );
   
}
