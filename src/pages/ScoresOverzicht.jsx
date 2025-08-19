// src/pages/ScoresOverzicht.jsx
import { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, writeBatch, doc, getDoc } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import { TrashIcon, PlusIcon, ChevronRightIcon, FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import ConfirmModal from '../components/ConfirmModal';
import { fetchScoresData, handleFirestoreError } from '../utils/firebaseUtils';


function StatCard({ title, value, subtitle, color = "purple" }) {
    const colorClasses = {
        purple: "from-purple-500 to-purple-600",
        blue: "from-blue-500 to-blue-600",
        green: "from-green-500 to-green-600",
        orange: "from-orange-500 to-orange-600"
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${colorClasses[color]} text-white mb-4`}>
                <span className="text-xl font-bold">{value}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
    );
}

function FilterBar({ filters, onFiltersChange, groepen, testen }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-6 overflow-hidden">
            <div className="p-4">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center justify-between w-full text-left"
                >
                    <div className="flex items-center">
                        <FunnelIcon className="h-5 w-5 text-gray-500 mr-2" />
                        <span className="font-medium text-gray-900">Filters</span>
                        {(filters.groep || filters.test || filters.search) && (
                            <span className="ml-2 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                                Actief
                            </span>
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
                                <input
                                    type="text"
                                    placeholder="Zoek op test of groep..."
                                    value={filters.search}
                                    onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Groep</label>
                            <select
                                value={filters.groep}
                                onChange={(e) => onFiltersChange({ ...filters, groep: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            >
                                <option value="">Alle groepen</option>
                                {groepen.map(g => (
                                    <option key={g.id} value={g.id}>{g.naam}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Test</label>
                            <select
                                value={filters.test}
                                onChange={(e) => onFiltersChange({ ...filters, test: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            >
                                <option value="">Alle testen</option>
                                {testen.map(t => (
                                    <option key={t.id} value={t.id}>{t.naam}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ScoresOverzicht() {
    const { profile } = useOutletContext();
    const [evaluaties, setEvaluaties] = useState([]);
    const [groepen, setGroepen] = useState([]);
    const [testen, setTesten] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ type: null, data: null });
    const [filters, setFilters] = useState({
        search: '',
        groep: '',
        test: ''
    });
    const navigate = useNavigate();

    // Statistieken berekenen
    const stats = useMemo(() => {
        const totalEvaluaties = evaluaties.length;
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        
        const thisMonthEvaluaties = evaluaties.filter(ev => {
            const evDate = new Date(ev.datum);
            return evDate.getMonth() === thisMonth && evDate.getFullYear() === thisYear;
        }).length;

        const uniqueGroepen = new Set(evaluaties.map(ev => ev.groep_id)).size;
        const uniqueTesten = new Set(evaluaties.map(ev => ev.test_id)).size;

        return {
            total: totalEvaluaties,
            thisMonth: thisMonthEvaluaties,
            uniqueGroepen,
            uniqueTesten
        };
    }, [evaluaties]);

    // Gefilterde evaluaties
    const filteredEvaluaties = useMemo(() => {
        return evaluaties.filter(ev => {
            // Zoekfilter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesTest = ev.test_naam.toLowerCase().includes(searchLower);
                const matchesGroep = ev.groep_naam.toLowerCase().includes(searchLower);
                if (!matchesTest && !matchesGroep) return false;
            }
            
            // Groepfilter
            if (filters.groep && ev.groep_id !== filters.groep) return false;
            
            // Testfilter
            if (filters.test && ev.test_id !== filters.test) return false;
            
            return true;
        });
    }, [evaluaties, filters]);

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (!profile?.school_id || !currentUser) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
              const data = await fetchScoresData(profile.school_id, currentUser.uid);

                // Parallel laden van alle data
                const [scoresSnapshot, groepenSnapshot, testenSnapshot] = await Promise.all([
                    getDocs(query(
                        collection(db, 'scores'), 
                        where('school_id', '==', profile.school_id),
                        where('leerkracht_id', '==', currentUser.uid)
                    )),
                    getDocs(query(collection(db, 'groepen'), where('school_id', '==', profile.school_id))),
                    getDocs(query(collection(db, 'testen'), where('school_id', '==', profile.school_id)))
                ]);

                const scoresData = scoresSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        datum: data.datum.toDate() // <<< FIX IS HIER
                    };
                });

                const groepenData = groepenSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const testenData = testenSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                setGroepen(groepenData);
                setTesten(testenData);

                // Groepeer scores per testafname
                const grouped = scoresData.reduce((acc, score) => {
                    const datumString = score.datum.toISOString().split('T')[0]; // bv. "2025-08-17"
                    const key = `${score.groep_id}-${score.test_id}-${score.datum}`;
                    if (!acc[key]) {
                        acc[key] = {
                            groep_id: score.groep_id,
                            test_id: score.test_id,
                            datum: score.datum,
                            groep_naam: groepenData.find(g => g.id === score.groep_id)?.naam || 'Onbekende Groep',
                            test_naam: testenData.find(t => t.id === score.test_id)?.naam || 'Onbekende Test',
                            score_ids: [],
                            leerling_count: 0
                        };
                    }
                    acc[key].score_ids.push(score.id);
                    acc[key].leerling_count++;
                    return acc;
                }, {});

                const uniekeEvaluaties = Object.values(grouped);

                // Sorteer op datum (nieuwste eerst)
                uniekeEvaluaties.sort((a, b) => new Date(b.datum) - new Date(a.datum));
                
                setEvaluaties(uniekeEvaluaties);

            } catch (error) {
                console.error("Fout bij laden testafnames:", error);
                toast.error("Kon gegevens niet laden. Probeer opnieuw.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [profile]);

    const handleDelete = async () => {
        if (!modal.data) return;
        
        const loadingToast = toast.loading('Testafname verwijderen...');
        try {
            const batch = writeBatch(db);
            modal.data.score_ids.forEach(scoreId => {
                const docRef = doc(db, 'scores', scoreId);
                batch.delete(docRef);
            });
            await batch.commit();
            
            setEvaluaties(prev => prev.filter(ev => 
                !(ev.test_id === modal.data.test_id && ev.groep_id === modal.data.groep_id && ev.datum === modal.data.datum)
            ));
            toast.success("Testafname succesvol verwijderd.");
        } catch (error) {
            console.error("Fout bij verwijderen:", error);
            if (error.code === 'permission-denied') {
                toast.error("Geen toegang om deze testafname te verwijderen.");
            } else {
                toast.error("Verwijderen mislukt. Probeer opnieuw.");
            }
        } finally {
            toast.dismiss(loadingToast);
            setModal({ type: null, data: null });
        }
    };

    const clearFilters = () => {
        setFilters({ search: '', groep: '', test: '' });
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Gegevens laden...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <Toaster position="top-center" />
            <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
                <div className="absolute inset-0 overflow-auto">
                    <div className="p-4 lg:p-8">
                        {/* --- MOBILE HEADER: Zichtbaar op kleine schermen, verborgen op lg en groter --- */}
                        <div className="lg:hidden max-w-7xl mx-auto mb-8">
                            <div className="flex justify-between items-center pt-12">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-800">Testafnames</h1>
                                    <p className="text-gray-600 text-sm">Beheer en bekijk alle testresultaten</p>
                                </div>
                                <button
                                    onClick={() => navigate('/nieuwe-testafname')}
                                    className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded-full shadow-lg"
                                >
                                    <PlusIcon className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        {/* --- DESKTOP HEADER: Verborgen op kleine schermen, zichtbaar op lg en groter --- */}
                        <div className="hidden lg:block max-w-7xl mx-auto mb-8">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-12">
                                <div>
                                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
                                        Testafnames
                                    </h1>
                                    <p className="text-gray-600 mt-1">
                                        Beheer en bekijk alle testresultaten
                                    </p>
                                </div>
                                <button
                                    onClick={() => navigate('/nieuwe-testafname')}
                                    className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 font-medium"
                                >
                                    <PlusIcon className="h-5 w-5 mr-2" />
                                    Nieuwe Afname
                                </button>
                            </div>
                        </div>

                        <div className="max-w-7xl mx-auto">
                            {/* Filters */}
                            <FilterBar 
                                filters={filters}
                                onFiltersChange={setFilters}
                                groepen={groepen}
                                testen={testen}
                            />

                            {/* Testafnames lijst */}
                            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                                {filteredEvaluaties.length > 0 ? (
                                    <>
                                        <div className="p-6 border-b border-gray-200/70">
                                            <div className="flex justify-between items-center">
                                                <h2 className="text-xl font-semibold text-gray-900">
                                                    Testafnames ({filteredEvaluaties.length})
                                                </h2>
                                                {(filters.search || filters.groep || filters.test) && (
                                                    <button
                                                        onClick={clearFilters}
                                                        className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                                                    >
                                                        Filters wissen
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <ul className="divide-y divide-gray-200/70">
                                            {filteredEvaluaties.map((item, index) => (
                                                <li key={`${item.groep_id}-${item.test_id}-${item.datum}`} className="group hover:bg-purple-50/50 transition-colors">
                                                    <div 
                                                        onClick={() => navigate(`/testafname/${item.groep_id}/${item.test_id}/${item.datum}`)}
                                                        className="flex items-center justify-between p-6 cursor-pointer"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex-1">
                                                                    <p className="font-semibold text-lg text-gray-900 group-hover:text-purple-700 transition-colors">
                                                                        {item.test_naam}
                                                                    </p>
                                                                    <p className="text-sm text-gray-600 mt-1">
                                                                        {item.groep_naam} • {item.leerling_count} leerling{item.leerling_count !== 1 ? 'en' : ''}
                                                                    </p>
                                                                </div>
                                                                <div className="text-right hidden sm:block">
                                                                    <p className="text-sm font-medium text-gray-900">
                                                                        {new Date(item.datum).toLocaleDateString('nl-BE', { 
                                                                            day: '2-digit', 
                                                                            month: 'short', 
                                                                            year: 'numeric' 
                                                                        })}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        {new Date(item.datum).toLocaleDateString('nl-BE', { weekday: 'long' })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 ml-4">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setModal({ type: 'confirm', data: item });
                                                                }}
                                                                className="p-2 text-gray-400 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
                                                                title="Verwijder testafname"
                                                            >
                                                                <TrashIcon className="h-5 w-5" />
                                                            </button>
                                                            <ChevronRightIcon className="h-6 w-6 text-gray-400 group-hover:text-purple-700 transition-all group-hover:translate-x-1" />
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                ) : (
                                    <div className="text-center py-16">
                                        {filters.search || filters.groep || filters.test ? (
                                            <div>
                                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                                    Geen resultaten gevonden
                                                </h3>
                                                <p className="text-gray-600 mb-4">
                                                    Probeer andere filterinstellingen
                                                </p>
                                                <button
                                                    onClick={clearFilters}
                                                    className="text-purple-600 hover:text-purple-800 font-medium"
                                                >
                                                    Alle filters wissen
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                                    Geen Testafnames Gevonden
                                                </h3>
                                                <p className="text-gray-600 mb-6">
                                                    Er zijn nog geen scores ingevoerd. Begin met je eerste testafname.
                                                </p>
                                              
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Statistieken footer */}
                            <div className="mt-12 text-center pb-8">
                                <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-white/20 inline-block shadow-lg">
                                    <div className="flex items-center space-x-6 text-sm text-gray-600 flex-wrap justify-center gap-x-6 gap-y-3">
                                        <div className="flex items-center" title="Totaal aantal testafnames">
                                            <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                                            <div><span className="font-bold text-gray-800">{stats.total}</span> Totaal</div>
                                        </div>
                                        <div className="flex items-center" title="Aantal testafnames deze maand">
                                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                                            <div><span className="font-bold text-gray-800">{stats.thisMonth}</span> Deze Maand</div>
                                        </div>
                                        <div className="flex items-center" title="Aantal unieke groepen met scores">
                                            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                                            <div><span className="font-bold text-gray-800">{stats.uniqueGroepen}</span> Groepen</div>
                                        </div>
                                        <div className="flex items-center" title="Aantal unieke testen met scores">
                                            <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                                            <div><span className="font-bold text-gray-800">{stats.uniqueTesten}</span> Testen</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={modal.type === 'confirm'}
                onClose={() => setModal({ type: null, data: null })}
                onConfirm={handleDelete}
                title="Testafname Verwijderen"
            >
                <div className="space-y-3">
                    <p>Weet u zeker dat u deze testafname wilt verwijderen?</p>
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium">{modal.data?.test_naam}</p>
                        <p className="text-sm text-gray-600">{modal.data?.groep_naam}</p>
                        <p className="text-sm text-gray-600">
                            {modal.data?.datum && new Date(modal.data.datum).toLocaleDateString('nl-BE')}
                        </p>
                    </div>
                    <p className="text-sm text-red-600">
                        Deze actie verwijdert alle bijbehorende scores en kan niet ongedaan worden gemaakt.
                    </p>
                </div>
            </ConfirmModal>
        </>
    );
}