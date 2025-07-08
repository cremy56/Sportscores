// src/pages/Evolutie.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom'; // <-- Stap 1: Belangrijke import
import { supabase } from '../supabaseClient';
import StudentSearch from '../components/StudentSearch';
import EvolutionCard from '../components/EvolutionCard';

const generateSchoolYears = () => {
    const years = [];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const endYear = currentMonth >= 8 ? currentYear : currentYear - 1;
    for (let i = endYear; i >= 2020; i--) {
        years.push({ value: i, label: `${i}-${i + 1}` });
    }
    return years;
};

export default function Evolutie() {
    // Stap 2: Haal het profiel op uit de context
    const { profile } = useOutletContext();
    const [showTitle, setShowTitle] = useState(false);
    // Stap 3: De oude 'userRole' state is verwijderd
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [evolutionData, setEvolutionData] = useState([]);
    const [loading, setLoading] = useState(false);

    const schoolYears = generateSchoolYears();
    const [selectedYear, setSelectedYear] = useState(schoolYears[0]?.value);

    // Deze useEffect stelt de ID in als de ingelogde gebruiker een leerling is
    useEffect(() => {
        // We gebruiken nu de 'profile' die we uit de context hebben gehaald
       if (profile?.rol === 'leerling') {
            setSelectedStudent(profile);
        }
    }, [profile]);

    // Deze useEffect haalt de data op zodra een leerling is geselecteerd
    useEffect(() => {
        if (!selectedStudent?.id) {
            setEvolutionData([]);
            return;
        };
        const fetchEvolutionData = async () => {
            setLoading(true);
            const { data, error } = await supabase.rpc('get_student_evolution_data', {
                p_user_id: selectedStudent.id,
                p_school_jaar_start: selectedYear
            });
            if (error) console.error('Error fetching evolution data:', error);
            else setEvolutionData(data);
            setLoading(false);
        };
        fetchEvolutionData();
    }, [selectedStudent, selectedYear]);

    const grouped_data = evolutionData.reduce((acc, test) => {
        if (test.all_scores) (acc[test.categorie] = acc[test.categorie] || []).push(test);
        return acc;
    }, {});
  
    // Bepaal de titel op basis van de rol uit het profiel
    const pageTitle = (profile?.rol === 'leerkracht' || profile?.rol === 'administrator') ? 'Portfolio' : 'Mijn Evolutie';

    return (
        <div className="max-w-7xl mx-auto">
            {/* Titel alleen tonen als showTitle true is */}
            {showTitle && (
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 text-center">
                    {selectedStudent ? selectedStudent.naam : pageTitle}
                </h1>
            )}
            <div className="bg-white/60 p-6 rounded-2xl shadow-xl border border-white/30 backdrop-blur-lg min-h-[60vh]">
                
                {/* Stap 4: Gebruik hier 'profile.rol' voor de check */}
                {(profile?.rol === 'leerkracht' || profile?.rol === 'administrator') && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 mb-6 items-end">
                        <div className="md:col-span-2">
                            <label htmlFor="student-search" className="block text-sm font-medium text-gray-700">Zoek Leerling</label>
                           <div id="student-search">
                                <StudentSearch onStudentSelect={(student) => setSelectedStudent(student)} />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="school-year-select" className="block text-sm font-medium text-gray-700">Schooljaar</label>
                            <select
                                id="school-year-select"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="w-full mt-1 px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                            >
                                {schoolYears.map(year => (
                                    <option key={year.value} value={year.value}>{year.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
                
                {/* De rest van de JSX voor de weergave van de kaarten */}
                {profile && (
                    <>
                        {!selectedStudent && (profile.rol === 'leerkracht' || profile.rol === 'administrator') && (
                             <div className="flex items-center justify-center h-full pt-16">
                                <p className="text-center text-gray-500 text-lg">
                                    Gebruik de zoekbalk hierboven om de evolutie van een leerling te bekijken.
                                </p>
                            </div>
                        )}

                        {selectedStudent && (
                             <>
                                {loading ? <p className="text-center mt-8">Laden...</p> :
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {Object.entries(grouped_data).length > 0 ? (
                                        Object.entries(grouped_data).map(([categoryName, testsInCategory]) => (
                                            <EvolutionCard
                                                key={categoryName}
                                                categoryName={categoryName}
                                                tests={testsInCategory}
                                                student={selectedStudent} // <-- Geef het volledige student-object door
                                            />
                                        ))
                                    ) : (
                                        <p className="col-span-1 md:col-span-2 text-center text-gray-500 py-8">
                                            Geen scoregeschiedenis gevonden voor deze leerling in het schooljaar {selectedYear}-{selectedYear+1}.
                                        </p>
                                    )}
                                    </div>
                                }
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
