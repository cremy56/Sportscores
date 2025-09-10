// src/pages/Highscores.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import CategoryCard from '../components/CategoryCard';

export default function Highscores() {
    const { profile, school } = useOutletContext(); 
    const [testen, setTesten] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [globalAgeFilter, setGlobalAgeFilter] = useState(null);

    useEffect(() => {
        if (!profile?.school_id) {
            setLoading(false);
            return;
        }

        const fetchTesten = async () => {
            try {
                setError(null);
                const testenRef = collection(db, 'testen');
                const q = query(
                    testenRef, 
                    where('school_id', '==', profile.school_id),
                    where('is_actief', '==', true), // Alleen actieve testen
                    orderBy('naam')
                );
                const querySnapshot = await getDocs(q);
                const testenData = querySnapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...doc.data() 
                }));
                setTesten(testenData);
            } catch (err) {
                console.error('Error fetching testen:', err);
                setError('Kon de testen niet laden. Probeer het later opnieuw.');
            } finally {
                setLoading(false);
            }
        };

        fetchTesten();
    }, [profile?.school_id]);

    // Groepeer de testen per categorie
    const grouped_tests = testen.reduce((acc, test) => {
        const cat = test.categorie || 'Algemeen';
        (acc[cat] = acc[cat] || []).push(test);
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-2xl shadow-sm">
                    <div className="flex items-center space-x-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        <span className="text-gray-700 font-medium">Highscores laden...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 py-6 lg:px-8 lg:py-8">
                
                {/* Compacte Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4 pt-8">
                        <img
                            src={school?.logo_url || '/logo.png'}
                            alt={`${school?.naam || 'Sportscores'} Logo`}
                            className="h-12 w-auto object-contain"
                            onError={(e) => {
                                e.target.src = '/logo.png'; // Fallback
                            }}
                        />
                    </div>
                    
                    <p className="text-slate-600 mb-4">
                        De beste tijden van onze school!
                    </p>
                    
                    <div className="flex justify-center mb-6">
                        <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                    </div>

                    {/* Age Filter Controls */}
                    <div className="flex justify-center mb-6">
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-4">
                            <div className="flex items-center space-x-4">
                                <span className="text-sm font-medium text-slate-700">Filter op leeftijd:</span>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setGlobalAgeFilter(null)}
                                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                            globalAgeFilter === null 
                                                ? 'bg-purple-600 text-white' 
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        Alle leeftijden
                                    </button>
                                    {[6, 7, 8, 9, 10, 11, 12].map(age => (
                                        <button
                                            key={age}
                                            onClick={() => setGlobalAgeFilter(age)}
                                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                                globalAgeFilter === age 
                                                    ? 'bg-purple-600 text-white' 
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {age} jaar
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error State */}
                {error && (
                    <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 max-w-2xl mx-auto mb-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-red-800 mb-2">Oeps!</h3>
                            <p className="text-red-600 leading-relaxed mb-4">{error}</p>
                            <button 
                                onClick={() => window.location.reload()}
                                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
                            >
                                Probeer opnieuw
                            </button>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!error && Object.keys(grouped_tests).length === 0 && !loading && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-2xl mx-auto">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Geen Actieve Testen</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Er zijn momenteel geen actieve testen beschikbaar voor deze school.
                                {profile?.rol === 'administrator' && (
                                    <span className="block mt-2 text-sm">
                                        Als administrator kun je nieuwe testen toevoegen in het testbeheer.
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                )}
                
                {/* Tests Grid - CategoryCards staan nu direct in de grid */}
                {!error && Object.keys(grouped_tests).length > 0 && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                            {Object.entries(grouped_tests).map(([categoryName, testsInCategory]) => (
                                <CategoryCard 
                                    key={categoryName}
                                    categoryName={categoryName}
                                    tests={testsInCategory}
                                    globalAgeFilter={globalAgeFilter}
                                />
                            ))}
                        </div>
                        
                        {/* Stats Footer */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-4">
                            <div className="flex items-center justify-center space-x-8 text-sm text-slate-600 flex-wrap gap-4">
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                                    <span>{Object.keys(grouped_tests).length} Categorieën</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full"></div>
                                    <span>{testen.length} Actieve Testen</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-gradient-to-r from-teal-500 to-green-500 rounded-full"></div>
                                    <span>School: {school?.naam || 'Onbekend'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}