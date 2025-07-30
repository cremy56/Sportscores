// src/pages/Highscores.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import CategoryCard from '../components/CategoryCard';
import PageHeader from '../components/PageHeader';

export default function Highscores() {
    const { profile, school } = useOutletContext(); 
    const [testen, setTesten] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
                <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
                    <div className="flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        <p className="text-lg font-medium text-gray-700">Highscores laden...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 p-4 lg:p-8">
            {/* Header met schoollogo */}
            <div className="max-w-7xl mx-auto mb-12">
                <div className="text-center">
                    <div className="flex justify-center mb-6">
                        <div className="bg-gradient-to-br from-purple-100 to-blue-100 p-6 rounded-3xl shadow-lg">
                            <img
                                src={school?.logo_url || '/logo.png'}
                                alt={`${school?.naam || 'Sportscores'} Logo`}
                                className="h-16 w-auto object-contain"
                                onError={(e) => {
                                    e.target.src = '/logo.png'; // Fallback
                                }}
                            />
                        </div>
                    </div>
                    
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                        {school?.naam || 'School'} Highscores
                    </h1>
                    
                    <p className="text-xl text-gray-600 font-medium mb-8">
                        De beste tijden van onze school!
                    </p>
                    
                    <div className="flex justify-center">
                        <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto">
                {/* Error State */}
                {error && (
                    <div className="bg-white/80 backdrop-blur-lg text-center p-12 rounded-3xl shadow-2xl border border-red-200 max-w-2xl mx-auto mb-8">
                        <div className="mb-6">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-red-800 mb-2">Oeps!</h3>
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
                    <div className="bg-white/80 backdrop-blur-lg text-center p-12 rounded-3xl shadow-2xl border border-white/20 max-w-2xl mx-auto">
                        <div className="mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">Geen Actieve Testen</h3>
                            <p className="text-gray-600 leading-relaxed">
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
                
                {/* Tests Grid */}
                {!error && Object.keys(grouped_tests).length > 0 && (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                            {Object.entries(grouped_tests).map(([categoryName, testsInCategory]) => (
                                <div key={categoryName} className="transform transition-all duration-300 hover:scale-105">
                                    <CategoryCard 
                                        categoryName={categoryName}
                                        tests={testsInCategory}
                                    />
                                </div>
                            ))}
                        </div>
                        
                        {/* Stats Footer */}
                        <div className="mt-16 text-center">
                            <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-6 border border-white/20 inline-block">
                                <div className="flex items-center space-x-8 text-sm text-gray-600 flex-wrap justify-center gap-4">
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
                    </>
                )}
            </div>
        </div>
    );
}