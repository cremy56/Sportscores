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

function msNaarSeconden(ms) { return ms / 1000; }

// ─── KOPPEL MODAL ──────────────────────────────────────────────────────────────
// Koppelt één waarnemer-inzending aan echte leerlingen.
// De leerkracht kiest een groep/klas + datum; de test komt uit de inzending.
function KoppelModal({ inzending, groepen, klassen, profile, onClose, onKlaar }) {
    // Doel voorselecteren op basis van de sessie waarin de meting werd ingediend
    const initieelDoel = inzending?.klas
        ? `klas-${inzending.klas}`
        : (inzending?.groep_id || '');
    const [doel, setDoel]           = useState(initieelDoel);
    const [datum, setDatum]         = useState(new Date().toISOString().split('T')[0]);
    const [leerlingen, setLeerlingen] = useState([]);
    const [koppelingen, setKoppelingen] = useState({}); // { ingediendeNaam: leerlingId }
    const [laadtLeerlingen, setLaadtLeerlingen] = useState(false);
    const [saving, setSaving]       = useState(false);

    const metingen = inzending?.metingen || [];

    // Leerlingen laden zodra een doel gekozen is
    useEffect(() => {
        if (!doel) { setLeerlingen([]); return; }
        const laad = async () => {
            setLaadtLeerlingen(true);
            try {
                let data;
                if (doel.startsWith('klas-')) {
                    data = await apiPost('get_leerlingen_voor_klas', { klasNaam: doel.slice(5), schoolId: profile.school_id }, profile._token);
                } else {
                    data = await apiPost('get_leerlingen_voor_groep', { groepId: doel, schoolId: profile.school_id }, profile._token);
                }
                const lijst = (data.leerlingen || []).map(l => ({
                    id: l.id, naam: l.data.naam, klas: l.data.klas || null, geslacht: l.data.geslacht || null,
                })).sort((a, b) => a.naam.localeCompare(b.naam));
                setLeerlingen(lijst);
            } catch {
                toast.error('Kon leerlingen niet laden.');
                setLeerlingen([]);
            } finally {
                setLaadtLeerlingen(false);
            }
        };
        laad();
    }, [doel, profile]);

    // Slimme auto-suggestie op voornaam zodra leerlingen geladen zijn
    useEffect(() => {
        if (leerlingen.length === 0) { setKoppelingen({}); return; }
        const norm = (s) => (s || '').toLowerCase().trim();
        const voornaam = (s) => norm(s).split(/\s+/)[0];
        const auto = {};
        const gebruikt = new Set();
        for (const m of metingen) {
            const vn = voornaam(m.naam);
            if (!vn) continue;
            const matches = leerlingen.filter(l => {
                if (gebruikt.has(l.id)) return false;
                return voornaam(l.naam) === vn || norm(l.naam) === norm(m.naam) || norm(l.naam).startsWith(vn + ' ');
            });
            if (matches.length === 1) { auto[m.naam] = matches[0].id; gebruikt.add(matches[0].id); }
        }
        setKoppelingen(auto);
    }, [leerlingen]);

    const scoreVanMeting = (m) => {
        if (m.eindtijd !== null && m.eindtijd !== undefined) return msNaarSeconden(m.eindtijd);
        if (m.beste !== null && m.beste !== undefined) return m.beste;
        if (m.waarde !== null && m.waarde !== undefined) return m.waarde;
        return null;
    };

    // Weergave van de score: tijden tonen als min:sec, andere als getal + eenheid
    const isTijd = inzending?.modus === 'chrono_rondes'
        || inzending?.modus === 'chrono_eenmalig'
        || /min|sec/i.test(inzending?.eenheid || '');

    const toonScore = (m) => {
        const s = scoreVanMeting(m);
        if (s === null) return '–';
        if (isTijd) {
            const totaal = Math.round(s);
            const min = Math.floor(totaal / 60);
            const sec = totaal % 60;
            return `${min}:${String(sec).padStart(2, '0')}`;
        }
        return `${s}${inzending?.eenheid ? ' ' + inzending.eenheid : ''}`;
    };

    const handleOpslaan = async () => {
        if (!doel) { toast.error('Kies eerst een groep of klas.'); return; }
        if (!inzending.test_id) { toast.error('Deze inzending heeft geen gekoppelde test.'); return; }

        const gekoppeld = metingen
            .filter(m => koppelingen[m.naam])
            .map(m => {
                const l = leerlingen.find(x => x.id === koppelingen[m.naam]);
                return { leerlingId: l.id, klas: l.klas, geslacht: l.geslacht, score: scoreVanMeting(m) };
            })
            .filter(k => k.score !== null);

        if (gekoppeld.length === 0) { toast.error('Koppel minstens 1 naam aan een leerling.'); return; }

        setSaving(true);
        const t = toast.loading(`${gekoppeld.length} score(s) opslaan...`);
        let succes = 0;
        const isKlas = doel.startsWith('klas-');
        for (const k of gekoppeld) {
            try {
                await apiPost('save_score', {
                    schoolId: profile.school_id,
                    groepId:  isKlas ? null : doel,
                    testId:   inzending.test_id,
                    datum,
                    ...k,
                }, profile._token);
                succes++;
            } catch { /* doorgaan */ }
        }
        try {
            await apiPost('markeer_waarnemer_gekoppeld', { schoolId: profile.school_id, metingId: inzending.id }, profile._token);
        } catch { /* niet kritisch */ }

        toast.dismiss(t);
        toast.success(`${succes} score(s) opgeslagen!`);
        setSaving(false);
        onKlaar();
    };

    const aantalGekoppeld = Object.values(koppelingen).filter(Boolean).length;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full my-8 shadow-2xl max-h-[90vh] flex flex-col">
                <div className="p-5 border-b border-gray-100 flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">{inzending.test_naam || inzending.sport_type}</h3>
                        <p className="text-sm text-gray-500">Door {inzending.waarnemer} • {metingen.length} leerlingen</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto">
                    {!inzending.test_id && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                            Deze inzending heeft geen test. Koppelen is niet mogelijk; je kan ze enkel verwijderen.
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Groep of klas</label>
                            <select value={doel} onChange={e => setDoel(e.target.value)} className="w-full h-[44px] px-3 border border-gray-200 rounded-xl">
                                <option value="">-- Kies --</option>
                                {groepen.length > 0 && (
                                    <optgroup label="Groepen">
                                        {groepen.map(g => <option key={g.id} value={g.id}>{g.naam}</option>)}
                                    </optgroup>
                                )}
                                {klassen.length > 0 && (
                                    <optgroup label="Klassen">
                                        {klassen.map(k => { const n = typeof k === 'string' ? k : (k.naam || k.klas || k.id); return <option key={`klas-${n}`} value={`klas-${n}`}>Klas {n}</option>; })}
                                    </optgroup>
                                )}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                            <input type="date" value={datum} onChange={e => setDatum(e.target.value)} className="w-full h-[44px] px-3 border border-gray-200 rounded-xl" />
                        </div>
                    </div>

                    {laadtLeerlingen ? (
                        <p className="text-center text-gray-400 py-6">Leerlingen laden…</p>
                    ) : doel && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Koppel elke gemeten naam aan een leerling:</p>
                            {metingen.map((m, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="flex-1 text-sm text-gray-800 truncate">
                                        {m.naam}
                                        <span className="text-gray-400 ml-1">({toonScore(m)})</span>
                                    </span>
                                    <select
                                        value={koppelingen[m.naam] || ''}
                                        onChange={e => setKoppelingen(prev => ({ ...prev, [m.naam]: e.target.value }))}
                                        className="flex-1 h-[40px] px-2 border border-gray-200 rounded-lg text-sm"
                                    >
                                        <option value="">— niet koppelen —</option>
                                        {leerlingen.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-gray-100 flex gap-2">
                    <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50">
                        Annuleren
                    </button>
                    <button
                        onClick={handleOpslaan}
                        disabled={saving || !doel || aantalGekoppeld === 0 || !inzending.test_id}
                        className="flex-1 py-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl disabled:opacity-40"
                    >
                        {aantalGekoppeld > 0 ? `${aantalGekoppeld} koppelen` : 'Koppelen'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Sporttesten() {    const { profile } = useOutletContext();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('testafnames');
    const [evaluaties, setEvaluaties] = useState([]);
    const [groepen, setGroepen] = useState([]);
    const [testen, setTesten] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ type: null, data: null });
    const [filters, setFilters] = useState({ search: '', groep: '', test: '' });
    const [waarnemerInzendingen, setWaarnemerInzendingen] = useState([]);
    const [waarnemerLoading, setWaarnemerLoading] = useState(false);
    const [klassen, setKlassen] = useState([]);
    const [koppelInzending, setKoppelInzending] = useState(null);

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

    // Openstaande waarnemer-inzendingen ophalen (los van sessie — blijven 14 dagen beschikbaar)
    const fetchWaarnemerInzendingen = useCallback(async () => {
        if (!profile?.school_id || !profile?._token) return;
        setWaarnemerLoading(true);
        try {
            const data = await apiPost('get_waarnemer_metingen', { schoolId: profile.school_id }, profile._token);
            setWaarnemerInzendingen(data.inzendingen || []);
        } catch (error) {
            setWaarnemerInzendingen([]);
        } finally {
            setWaarnemerLoading(false);
        }
        // Klassen ophalen voor de koppel-modal (stil, optioneel)
        try {
            const kl = await apiPost('get_mijn_klassen', { schoolId: profile.school_id }, profile._token);
            setKlassen(kl.klassen || []);
        } catch { /* */ }
    }, [profile]);

    useEffect(() => {
        fetchWaarnemerInzendingen();
    }, [fetchWaarnemerInzendingen]);

    // Een onverwerkte inzending verwijderen — uitgevoerd na bevestiging via ConfirmModal
    const handleVerwijderInzending = async () => {
        const inz = modal.data;
        if (!inz) return;
        try {
            await apiPost('verwijder_waarnemer_metingen', { schoolId: profile.school_id, metingId: inz.id }, profile._token);
            toast.success('Inzending verwijderd');
            setWaarnemerInzendingen(prev => prev.filter(i => i.id !== inz.id));
        } catch (error) {
            toast.error('Verwijderen mislukt: ' + error.message);
        } finally {
            handleCloseModal();
        }
    };

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

    const WaarnemerInzendingenTab = () => {
        const formatDatum = (iso) => {
            if (!iso) return '';
            try {
                return new Date(iso).toLocaleString('nl-BE', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                });
            } catch { return ''; }
        };

        return (
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-teal-50/50">
                    <p className="text-sm text-gray-600">
                        Resultaten die leerlingen als waarnemer hebben ingediend. Ze blijven hier beschikbaar tot je ze koppelt of verwijdert — ook nadat een SportLab-sessie is afgelopen.
                    </p>
                </div>

                {waarnemerLoading ? (
                    <div className="p-12 text-center text-gray-400">Laden…</div>
                ) : waarnemerInzendingen.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-4xl mb-3">🔭</p>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Geen openstaande resultaten</h3>
                        <p className="text-gray-600">Er zijn momenteel geen waarnemer-resultaten die op koppeling wachten.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200/70">
                        {waarnemerInzendingen.map(inz => (
                            <li key={inz.id} className="group hover:bg-teal-50/50 transition-colors">
                                <div onClick={() => setKoppelInzending(inz)} className="flex items-center justify-between p-6 gap-3 cursor-pointer">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-lg text-gray-900 group-hover:text-teal-700">
                                            {inz.test_naam || inz.sport_type || 'Meting'}
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Door <span className="font-medium">{inz.waarnemer}</span>
                                            {' • '}{inz.metingen?.length || 0} leerling{(inz.metingen?.length || 0) !== 1 ? 'en' : ''}
                                            {inz.ingediend_op && <> • {formatDatum(inz.ingediend_op)}</>}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setModal({ type: 'confirmDeleteInzending', data: inz }); }}
                                            className="p-2 text-gray-400 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
                                            title="Inzending verwijderen"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                        <ChevronRightIcon className="h-6 w-6 text-gray-400 group-hover:text-teal-700 transition-all group-hover:translate-x-1" />
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        );
    };

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
                            <h1 className="text-2xl font-bold text-gray-800">
                                {activeTab === 'testafnames' ? 'Testafnames' : activeTab === 'waarnemer' ? 'Onverwerkt' : 'Testen'}
                            </h1>
                            {canManage && activeTab !== 'waarnemer' && (
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
                                <h1 className="text-3xl font-bold text-gray-800">
                                    {activeTab === 'testafnames' ? 'Testafnames' : activeTab === 'waarnemer' ? 'Onverwerkte resultaten' : 'Sporttesten Beheer'}
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    {activeTab === 'testafnames'
                                        ? 'Beheer en bekijk alle testresultaten'
                                        : activeTab === 'waarnemer'
                                        ? 'Resultaten van leerlingen die nog gekoppeld moeten worden'
                                        : 'Beheer de beschikbare sporttesten voor je school'}
                                </p>
                            </div>
                            {canManage && activeTab !== 'waarnemer' && (
                                <button onClick={() => activeTab === 'testafnames' ? navigate('/nieuwe-testafname') : setModal({ type: 'testForm', data: null })} className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-3 rounded-2xl shadow-lg hover:scale-105">
                                    <PlusIcon className="h-6 w-6" />
                                    <span className="ml-2">{activeTab === 'testafnames' ? 'Nieuwe Afname' : 'Nieuwe Test'}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Tab Navigatie */}
                    <div className="flex gap-2 border-b border-gray-200 mb-6">
                        <button onClick={() => setActiveTab('testafnames')} className={`px-4 py-2 font-medium text-sm ${activeTab === 'testafnames' ? 'border-b-2 border-purple-500 text-purple-600' : 'text-gray-500'}`}>Historiek</button>
                        <button onClick={() => setActiveTab('waarnemer')} className={`px-4 py-2 font-medium text-sm flex items-center gap-1.5 ${activeTab === 'waarnemer' ? 'border-b-2 border-purple-500 text-purple-600' : 'text-gray-500'}`}>
                            Onverwerkt
                            {waarnemerInzendingen.length > 0 && (
                                <span className="bg-teal-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{waarnemerInzendingen.length}</span>
                            )}
                        </button>
                        <button onClick={() => setActiveTab('testenbeheer')} className={`px-4 py-2 font-medium text-sm ${activeTab === 'testenbeheer' ? 'border-b-2 border-purple-500 text-purple-600' : 'text-gray-500'}`}>Testinfo en normen</button>
                    </div>

                    {activeTab === 'testafnames' && <TestafnamesTab />}
                    {activeTab === 'testenbeheer' && <TestenBeheerTab />}
                    {activeTab === 'waarnemer' && <WaarnemerInzendingenTab />}
                </div>
            </div>

           <TestFormModal isOpen={modal.type === 'testForm'} onClose={handleCloseModal} testData={modal.data} schoolId={profile?.school_id} onSuccess={fetchData} token={profile?._token} />

            {koppelInzending && (
                <KoppelModal
                    inzending={koppelInzending}
                    groepen={groepen}
                    klassen={klassen}
                    profile={profile}
                    onClose={() => setKoppelInzending(null)}
                    onKlaar={() => {
                        setKoppelInzending(null);
                        fetchWaarnemerInzendingen(); // lijst verversen
                        fetchData();                 // historiek verversen
                    }}
                />
            )}
            <ConfirmModal isOpen={modal.type === 'confirmDeleteTestafname'} onClose={handleCloseModal} onConfirm={handleDeleteTestafname} title="Testafname Verwijderen">
                Weet u zeker dat u de testafname voor "{modal.data?.test_naam}" van {modal.data?.groep_naam} wilt verwijderen? Alle {modal.data?.leerling_count} scores worden permanent gewist.
            </ConfirmModal>
            <ConfirmModal isOpen={modal.type === 'confirmDeleteTest'} onClose={handleCloseModal} onConfirm={handleDeleteTest} title="Test Verwijderen">
                Weet u zeker dat u de test "{modal.data?.naam}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </ConfirmModal>
            <ConfirmModal isOpen={modal.type === 'confirmDeleteInzending'} onClose={handleCloseModal} onConfirm={handleVerwijderInzending} title="Inzending Verwijderen">
                Weet u zeker dat u de inzending van {modal.data?.waarnemer} ({modal.data?.metingen?.length || 0} leerling{(modal.data?.metingen?.length || 0) !== 1 ? 'en' : ''}) wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </ConfirmModal>
        </>
    );
}