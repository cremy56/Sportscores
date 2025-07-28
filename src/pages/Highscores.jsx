// src/pages/Highscores.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom'; // Importeren
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'; // 'where' toegevoegd
import CategoryCard from '../components/CategoryCard';

export default function Highscores() {
    // Haal profiel en schoolgegevens op uit de context
    const { profile, school } = useOutletContext(); 
    const [testen, setTesten] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Stop als er geen school_id beschikbaar is
        if (!profile?.school_id) {
            setLoading(false);
            return;
        };

        const fetchTesten = async () => {
            try {
                const testenRef = collection(db, 'testen');
                // Query aangepast met 'where' om op school te filteren
                const q = query(
                    testenRef, 
                    where('school_id', '==', profile.school_id),
                    orderBy('naam')
                );
                const querySnapshot = await getDocs(q);
                const testenData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTesten(testenData);
            } catch (error) {
                console.error('Error fetching testen:', error);
            }
            setLoading(false);
        };
        fetchTesten();
    }, [profile?.school_id]); // Dependency array aangepast

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
            {/* Header Section */}
            <div className="max-w-7xl mx-auto mb-12">
                <div className="text-center">
                    {/* Logo Container */}
                    <div className="flex justify-center mb-6">
                        <div className="bg-gradient-to-br from-purple-100 to-blue-100 p-6 rounded-3xl shadow-lg">
                            {/* Logo is nu dynamisch */}
                            <img
                                src={school?.logo_url || '/logo.png'}
                                alt={`${school?.naam || 'Sportscores'} Logo`}
                                className="h-16 w-auto object-contain"
                            />
                        </div>
                    </div>
        
                    {/* Subtitle */}
                    <p className="text-xl text-gray-600 font-medium">
                        Sportscores & Highscores Dashboard
                    </p>
                    
                    {/* Decorative Line */}
                    <div className="mt-8 flex justify-center">
                        <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="max-w-7xl mx-auto">
                {/* Empty State */}
                {Object.keys(grouped_tests).length === 0 && !loading && (
                    <div className="bg-white/80 backdrop-blur-lg text-center p-12 rounded-3xl shadow-2xl border border-white/20 max-w-2xl mx-auto">
                        <div className="mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">Geen Testen Gevonden</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Er zijn momenteel geen testen beschikbaar voor deze school.
                            </p>
                        </div>
                    </div>
                )}
                
                {/* Tests Grid */}
                {Object.keys(grouped_tests).length > 0 && (
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
                )}
                
                {/* Stats Footer */}
                {Object.keys(grouped_tests).length > 0 && (
                    <div className="mt-16 text-center">
                        <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-6 border border-white/20 inline-block">
                            <div className="flex items-center space-x-8 text-sm text-gray-600">
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                                    <span>{Object.keys(grouped_tests).length} Categorieën</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full"></div>
                                    <span>{testen.length} Totaal Testen</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
