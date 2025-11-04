// src/pages/Highscores.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db, auth } from '../firebase';
import CategoryCard from '../components/CategoryCard';

// Importeer de calculateAge helper functie (of definieer hem hier)
function calculateAge(birthDate) {
    if (!birthDate) return null;
    const birth = birthDate.toDate ? birthDate.toDate() : new Date(birthDate);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}


export default function Highscores() {
    const { profile, school } = useOutletContext(); 
    const [testen, setTesten] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // State voor de filter van leerkrachten
    const [teacherSelectedAge, setTeacherSelectedAge] = useState(null);
    // State voor de effectieve filter die wordt doorgegeven aan de componenten
    const [effectiveAgeFilter, setEffectiveAgeFilter] = useState(null);

    // Bepaal de effectieve filter op basis van de rol en selectie
    useEffect(() => {
        if (profile?.rol === 'leerling') {
            const userAge = calculateAge(profile.geboortedatum);
            
            if (userAge === null) { // Als de leeftijd niet berekend kan worden, geen filter
                setEffectiveAgeFilter(null);
            } else if (userAge >= 17) {
                setEffectiveAgeFilter(17);
            } else if (userAge <= 12) {
                setEffectiveAgeFilter(12);
            } else {
                setEffectiveAgeFilter(userAge);
            }

        } else {
            setEffectiveAgeFilter(teacherSelectedAge);
        }
    }, [profile, teacherSelectedAge]);

    useEffect(() => {
        
    if (!profile?.school_id) {
        setLoading(false);
        return;
    }

    const fetchTesten = async () => {
        try {
            setError(null);
            setLoading(true); // Zet loading hier

            const user = auth.currentUser;
            if (!user) {
                throw new Error("Geen gebruiker ingelogd.");
            }
            const token = await user.getIdToken();

            const response = await fetch('/api/getTests', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Kon de testen niet laden via API.');
            }

            setTesten(data.testen);
        } catch (err) {
            console.error('Error fetching testen via API:', err);
            setError('Kon de testen niet laden. Probeer het later opnieuw.');
        } finally {
            setLoading(false);
        }
    };

    fetchTesten();
}, [profile?.school_id]);

    const grouped_tests = testen.reduce((acc, test) => {
        const cat = test.categorie || 'Algemeen';
        (acc[cat] = acc[cat] || []).push(test);
        return acc;
    }, {});
    
    // Functie om de leeftijdstekst te genereren voor leerlingen
    const getLearnerAgeText = () => {
        if (effectiveAgeFilter === null) return "Geen leeftijdsfilter beschikbaar.";
        if (effectiveAgeFilter === 12) return "Top 5 scores voor 12-jarigen en jonger.";
        if (effectiveAgeFilter === 17) return "Top 5 scores voor 17-jarigen en ouder.";
        return `Top 5 scores voor ${effectiveAgeFilter}-jarigen.`;
    };

    // JSX return
    return (
        <div className="fixed inset-0 bg-slate-50 overflow-y-auto pt-20">
            <div className="max-w-7xl mx-auto px-4 py-6 lg:px-8 lg:py-8">
                
                <div className="mb-8">
                    {/* --- START VAN WIJZIGING (Header voor leerlingen) --- */}
                    {profile?.rol === 'leerling' ? (
                        <div className="text-left">
                            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
                                {profile?.naam || 'Leerling'}
                            </h1>
                            <p className="text-sm text-slate-600 mb-3">
                                {getLearnerAgeText()}
                            </p>
                            
                        </div>
                    ) : (
                        // Oude header voor leerkrachten/admins (met logo en algemene tekst)
                        <>
                           <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
                                {/* Logo en titel links */}
                                <div className="flex items-center space-x-4">
                                   
                                    <div>
                                        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
                                            {school?.naam} Highscores
                                        </h1>
                                        <p className="text-slate-600">
                                            De beste tijden van onze school!
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Filter rechts */}
                                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-4">
                                    <div className="flex items-center space-x-4">
                                        <span className="text-sm font-medium text-slate-700">Filter op leeftijd:</span>
                                        <select
                                            value={teacherSelectedAge || ''}
                                            onChange={(e) => setTeacherSelectedAge(e.target.value ? parseInt(e.target.value) : null)}
                                            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        >
                                            <option value="">Alle leeftijden</option>
                                            {[12, 13, 14, 15, 16, 17].map(age => (
                                                <option key={age} value={age}>
                                                    {age} jaar
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                    </>
                
)}
</div>
                {loading && (
                    <div className="text-center text-slate-500">Laden van highscores...</div>
                )}

                {error && (
                    <div className="text-center text-red-500">{error}</div>
                )}

                {!loading && !error && Object.keys(grouped_tests).length === 0 && (
                    <div className="text-center text-slate-500 p-10 bg-white rounded-lg shadow-sm">
                        <p className="text-xl font-semibold mb-2">Nog geen highscores beschikbaar</p>
                        <p>Begin met het afnemen van testen om de eerste scores te zien!</p>
                    </div>
                )}

                {/* Tests Grid - Geef de effectiveAgeFilter door */}
                {!error && Object.keys(grouped_tests).length > 0 && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                            {Object.entries(grouped_tests).map(([categoryName, testsInCategory]) => (
                                <CategoryCard 
                                    key={categoryName}
                                    categoryName={categoryName}
                                    tests={testsInCategory}
                                    globalAgeFilter={effectiveAgeFilter}
                                    // --- START VAN WIJZIGING (Nieuwe prop voor CategoryCard) ---
                                    isLearner={profile?.rol === 'leerling'} 
                                    // --- EINDE VAN WIJZIGING ---
                                />
                            ))}
                        </div>
                        
                        {/* Stats Footer blijft hetzelfde */}
                        <div className="text-center text-slate-500 text-sm mt-8">
                            Laatst bijgewerkt: {new Date().toLocaleDateString()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}