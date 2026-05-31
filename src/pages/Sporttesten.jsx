// src/pages/Sporttesten.jsx
// ✅ VOLLEDIG GEMIGREERD — geen directe Firestore calls meer
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { TrashIcon, PlusIcon, ChevronRightIcon, FunnelIcon, MagnifyingGlassIcon, BeakerIcon } from '@heroicons/react/24/outline';
import ConfirmModal from '../components/ConfirmModal';
import TestFormModal from '../components/TestFormModal';

// --- API HELPER ---
async function apiPost(action, body, token) {
    const response = await fetch('/api/tests', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, ...body })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'API fout');
    return data;
}

function FilterBar({ filters, onFiltersChange, groepen, testen }) {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-6 overflow-hidden">
            <div className="p-4">
                <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center justify-between w-full text-left">
                    <div className="flex items-center">
                        <FunnelIcon className="h-5 w-5 text-gray-500 mr-2" />
                        <span className="font-medium text-gray-900">Filters</span>
                        {(filters.groep || filters.test || filters.search) && (
                            <span className="ml-2 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">Actief</span>
                        )}
                    </div>
                    <ChevronRightIcon className={`h-5 w-5 text-gray-500 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>
                {isExpanded && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Zoeken</label>
                            <div className="relative">
                                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
                                <input type="text" placeholder="Zoek op test of groep..." value={filters.search} onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Groep</label>
                            <select value={filters.groep} onChange={(e) => onFiltersChange({ ...filters, groep: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                                <option value="">Alle groepen</option>
                                {groepen.map(g => <option key={g.id} value={g.id}>{g.naam}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Test</label>
                            <select value={filters.test} onChange={(e) => onFiltersChange({ ...filters, test: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                                <option value="">Alle testen</option>
                                {testen.map(t => <option key={t.id} value={t.id}>{t.naam}</option>)}
                            </select>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Sporttesten() {
    const { profile } = useOutletContext();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('testafnames');
    const [evaluaties, setEvaluaties] = useState([]);
    const [groepen, setGroepen] = useState([]);
    const [testen, setTesten] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ type: null, data: null });
    const [filters, setFilters] = useState({ search: '', groep: '', test: '' });

    const canManage = ['leerkracht', 'administrator', 'super-administrator'].includes(profile?.rol);

    // =============================================
    // DATA LADEN via API
    // ✅ GEMIGREERD: geen directe Firestore listeners
    // =============================================
    const fetchData = useCallback(async () => {
        if (!profile?.school_id || !profile?._token) return;
        setLoading(true);
        try {
            const data = await apiPost('get_evaluaties', { schoolId: profile.school_id }, profile._token);
            setEvaluaties(data.evaluaties || []);
            setGroepen(data.groepen || []);
            setTesten(data.testen || []);
        } catch (error) {
            toast.error('Kon data niet laden: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [profile]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCloseModal = () => setModal({ type: null, data: null });

    // =============================================
    // DELETE TESTAFNAME via API
    // =============================================
    const handleDeleteTestafname = async () => {
        const item = modal.data;
        if (!item) return;
        const loadingToast = toast.loading('Testafname verwijderen...');
        try {
            await apiPost('delete_testafname', {
                groepId: item.klas ? `klas-${item.klas}` : item.groep_id,
                testId: item.test_id,
                datum: item.datum,
                schoolId: profile.school_id
            }, profile._token);
            toast.success("Testafname succesvol verwijderd.");
            setEvaluaties(prev => prev.filter(e => !((e.klas ? `klas-${e.klas}` : e.groep_id) === (item.klas ? `klas-${item.klas}` : item.groep_id) && e.test_id === item.test_id && e.datum === item.datum)));
        } catch (error) {
            toast.error(`Verwijderen mislukt: ${error.message}`);
        } finally {
            toast.dismiss(loadingToast);
            handleCloseModal();
        }
    };

    // =============================================
    // DELETE TEST via API
    // =============================================
    const handleDeleteTest = async () => {
        const test = modal.data;
        if (!test) return;
        const loadingToast = toast.loading('Test verwijderen...');
        try {
            await apiPost('delete_test', { testId: test.id, schoolId: profile.school_id }, profile._token);
            toast.success(`'${test.naam}' succesvol verwijderd.`);
            setTesten(prev => prev.filter(t => t.id !== test.id));
        } catch (error) {
            toast.error(error.message.includes('scores') ? error.message : `Fout bij verwijderen: ${error.message}`);
        } finally {
            toast.dismiss(loadingToast);
            handleCloseModal();
        }
    };

    const filteredEvaluaties = useMemo(() => {
        return evaluaties.filter(ev => {
            if (filters.search && !(ev.test_naam.toLowerCase().includes(filters.search.toLowerCase()) || ev.groep_naam.toLowerCase().includes(filters.search.toLowerCase()))) return false;
            if (filters.groep && ev.groep_id !== filters.groep) return false;
            if (filters.test && ev.test_id !== filters.test) return false;
            return true;
        });
    }, [evaluaties, filters]);

    const TestafnamesTab = () => (
        <>
            <FilterBar filters={filters} onFiltersChange={setFilters} groepen={groepen} testen={testen} />
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                {filteredEvaluaties.length > 0 ? (
                    <ul className="divide-y divide-gray-200/70">
                        {filteredEvaluaties.map(item => {
                            const doelId = item.klas ? `klas-${item.klas}` : item.groep_id;
                            return (
                            <li key={`${doelId}-${item.test_id}-${item.datum}`} className={`group hover:bg-purple-50/50 transition-colors ${item.isOrphanedGroup ? 'opacity-75' : ''}`}>
                                <div onClick={() => navigate(`/testafname/${doelId}/${item.test_id}/${item.datum}`)} className="flex items-center justify-between p-6 cursor-pointer">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-lg text-gray-900 group-hover:text-purple-700">{item.test_naam}</p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {item.groep_naam}
                                            {item.isOrphanedGroup && <span className="text-orange-600 ml-1">(Groep verwijderd)</span>}
                                            • {item.leerling_count} leerling{item.leerling_count !== 1 ? 'en' : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <button onClick={(e) => { e.stopPropagation(); setModal({ type: 'confirmDeleteTestafname', data: item }); }} className="p-2 text-gray-400 rounded-full hover:bg-red-100 hover:text-red-600" title="Verwijder testafname"><TrashIcon className="h-5 w-5" /></button>
                                        <ChevronRightIcon className="h-6 w-6 text-gray-400 group-hover:text-purple-700 transition-all group-hover:translate-x-1" />
                                    </div>
                                </div>
                            </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="text-center py-16">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Geen Testafnames Gevonden</h3>
                        <p className="text-gray-600">Er zijn nog geen scores ingevoerd voor de geselecteerde filters.</p>
                    </div>
                )}
            </div>
        </>
    );

    const TestenBeheerTab = () => (
        <>
            {testen.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 text-center p-12 max-w-2xl mx-auto">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4"><BeakerIcon className="w-8 h-8 text-purple-600" /></div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Geen Testen Gevonden</h3>
                    <p className="text-gray-600">{canManage ? 'Klik op "Nieuwe Test" om te beginnen.' : 'Er zijn nog geen testen beschikbaar voor uw school.'}</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <ul className="divide-y divide-gray-200/70">
                        {testen.map(test => (
                            <li key={test.id} className="group">
                                <div onClick={() => navigate(`/testbeheer/${test.id}`)} className="flex items-center justify-between p-4 sm:p-6 cursor-pointer hover:bg-purple-50/50 transition-colors">
                                    <div>
                                        <p className="text-lg font-semibold text-gray-900 group-hover:text-purple-700">{test.naam}</p>
                                        <p className="text-sm text-gray-500">{test.categorie}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {canManage && (
                                            <button onClick={(e) => { e.stopPropagation(); setModal({ type: 'confirmDeleteTest', data: test }); }} className="p-2 text-gray-400 rounded-full hover:bg-red-100 hover:text-red-600"><TrashIcon className="h-5 w-5" /></button>
                                        )}
                                        <ChevronRightIcon className="h-6 w-6 text-gray-400 group-hover:text-purple-700 transition-transform group-hover:translate-x-1" />
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </>
    );

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
    );

    return (
        <>
            <Toaster position="top-center" />
            <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 pt-20 pb-6 lg:px-8 lg:pt-24 lg:pb-8">
                    {/* Mobile Header */}
                    <div className="lg:hidden mb-8">
                        <div className="flex justify-between items-center">
                            <h1 className="text-2xl font-bold text-gray-800">{activeTab === 'testafnames' ? 'Testafnames' : 'Testen'}</h1>
                            {canManage && (
                                <button onClick={() => activeTab === 'testafnames' ? navigate('/nieuwe-testafname') : setModal({ type: 'testForm', data: null })} className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded-full shadow-lg">
                                    <PlusIcon className="h-6 w-6" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Desktop Header */}
                    <div className="hidden lg:block mb-8">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800">{activeTab === 'testafnames' ? 'Testafnames' : 'Sporttesten Beheer'}</h1>
                                <p className="text-gray-600 mt-1">{activeTab === 'testafnames' ? 'Beheer en bekijk alle testresultaten' : 'Beheer de beschikbare sporttesten voor je school'}</p>
                            </div>
                            {canManage && (
                                <button onClick={() => activeTab === 'testafnames' ? navigate('/nieuwe-testafname') : setModal({ type: 'testForm', data: null })} className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-3 rounded-2xl shadow-lg hover:scale-105">
                                    <PlusIcon className="h-6 w-6" />
                                    <span className="ml-2">{activeTab === 'testafnames' ? 'Nieuwe Afname' : 'Nieuwe Test'}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Tab Navigatie */}
                    <div className="flex gap-2 border-b border-gray-200 mb-6">
                        <button onClick={() => setActiveTab('testafnames')} className={`px-4 py-2 font-medium text-sm ${activeTab === 'testafnames' ? 'border-b-2 border-purple-500 text-purple-600' : 'text-gray-500'}`}>Testafnames</button>
                        <button onClick={() => setActiveTab('testenbeheer')} className={`px-4 py-2 font-medium text-sm ${activeTab === 'testenbeheer' ? 'border-b-2 border-purple-500 text-purple-600' : 'text-gray-500'}`}>Testinfo en normen</button>
                    </div>

                    {activeTab === 'testafnames' && <TestafnamesTab />}
                    {activeTab === 'testenbeheer' && <TestenBeheerTab />}
                </div>
            </div>

           <TestFormModal isOpen={modal.type === 'testForm'} onClose={handleCloseModal} testData={modal.data} schoolId={profile?.school_id} onSuccess={fetchData} token={profile?._token} />
            <ConfirmModal isOpen={modal.type === 'confirmDeleteTestafname'} onClose={handleCloseModal} onConfirm={handleDeleteTestafname} title="Testafname Verwijderen">
                Weet u zeker dat u de testafname voor "{modal.data?.test_naam}" van {modal.data?.groep_naam} wilt verwijderen? Alle {modal.data?.leerling_count} scores worden permanent gewist.
            </ConfirmModal>
            <ConfirmModal isOpen={modal.type === 'confirmDeleteTest'} onClose={handleCloseModal} onConfirm={handleDeleteTest} title="Test Verwijderen">
                Weet u zeker dat u de test "{modal.data?.naam}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </ConfirmModal>
        </>
    );
}