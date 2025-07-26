// src/pages/Highscores.jsx
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import CategoryCard from '../components/CategoryCard'; // Importeer de nieuwe component

export default function Highscores() {
    const [testen, setTesten] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTesten = async () => {
            const { data, error } = await supabase.from('testen').select('*').order('naam');
            if (error) {
                console.error('Error fetching testen:', error);
            } else {
                setTesten(data);
            }
            setLoading(false);
        };
        fetchTesten();
    }, []);

    // Groepeer de testen per categorie
    const grouped_tests = testen.reduce((acc, test) => {
        const cat = test.categorie || 'Algemeen'; // Fallback voor testen zonder categorie
        (acc[cat] = acc[cat] || []).push(test);
        return acc;
    }, {});

    if (loading) {
      return <p className="text-center text-gray-500">Highscores laden...</p>
    }

    return (
    <>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-purple-700">
            KA Beveren
        </h1>

        {/* --- NIEUWE WRAPPER HIERONDER --- */}
        {/* Deze div zorgt ervoor dat de content nooit te breed wordt en altijd gecentreerd is. */}
        <div className="max-w-6xl mx-auto">

            {/* De melding voor als er geen testen zijn */}
            {Object.keys(grouped_tests).length === 0 && !loading && (
              <div className="bg-white/60 text-center p-8 rounded-2xl shadow-lg border border-white/30 backdrop-blur-lg">
                <h3 className="text-xl font-semibold text-gray-700">Geen Testen Gevonden</h3>
                <p className="mt-2 text-gray-500">
                  Voeg eerst testen toe in Supabase om hier highscores te zien.
                </p>
              </div>
            )}
            
            {/* De grid staat nu BINNEN de wrapper met maximale breedte */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {Object.entries(grouped_tests).map(([categoryName, testsInCategory]) => (
                    <CategoryCard 
                        key={categoryName}
                        categoryName={categoryName}
                        tests={testsInCategory}
                    />
                ))}
            </div>

        </div>
    </>
);
}