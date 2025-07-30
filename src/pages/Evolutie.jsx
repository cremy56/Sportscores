// src/pages/Evolutie.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import StudentSearch from '../components/StudentSearch';
import EvolutionCard from '../components/EvolutionCard';
import PageHeader from '../components/PageHeader';
import { getStudentEvolutionData } from '../utils/firebaseUtils';

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
    const { profile } = useOutletContext();
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [evolutionData, setEvolutionData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const schoolYears = generateSchoolYears();
    const [selectedYear, setSelectedYear] = useState(schoolYears[0]?.value);

    // Auto-selecteer leerling als de gebruiker een leerling is
    useEffect(() => {
        if (profile?.rol === 'leerling') {
            setSelectedStudent(profile);
        }
    }, [profile]);

    // Haal evolutie data op
    useEffect(() => {
        if (!selectedStudent?.id) {
            setEvolutionData([]);
            return;
        }

        const fetchEvolutionData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const data = await getStudentEvolutionData(selectedStudent.id, selectedYear);
                setEvolutionData(data);
            } catch (err) {
                console.error('Error fetching evolution data:', err);
                setError('Kon de evolutiegegevens niet laden.');
                setEvolutionData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchEvolutionData();
    }, [selectedStudent, selectedYear]);

    // Groepeer data per categorie
    const grouped_data = evolutionData.reduce((acc, test) => {
        if (test.all_scores && test.all_scores.length > 0) {
            (acc[test.categorie] = acc[test.categorie] || []).push(test);
        }
        return acc;
    }, {});

    const pageTitle = (profile?.rol === 'leerkracht' || profile?.rol === 'administrator') 
        ? 'Portfolio' 
        : 'Mijn Evolutie';

    const isTeacherOrAdmin = profile?.rol === 'leerkracht' || profile?.rol === 'administrator';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 p-4 lg:p-8">
            <PageHeader 
                title={selectedStudent ? selectedStudent.naam : pageTitle}
                subtitle={selectedStudent ? `Evolutie overzicht voor schooljaar ${selectedYear}-${selectedYear + 1}` : 'Bekijk je sportieve vooruitgang'}
            >
                {/* Search Controls - alleen voor leraren/admins */}
                {isTeacherOrAdmin && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4 items-end">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Zoek Leerling
                            </label>
                            <StudentSearch 
                                onStudentSelect={(student) => {
                                    console.log('Geselecteerde student:', student);
                                    setSelectedStudent(student);
                                }} 
                            />
                        </div>
                        <div>
                            <label htmlFor="school-year-select" className="block text-sm font-medium text-gray-700 mb-2">
                                Schooljaar
                            </label>
                            <select
                                id="school-year-select"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300"
                            >
                                {schoolYears.map(year => (
                                    <option key={year.value} value={year.value}>
                                        {year.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </PageHeader>

            <div className="max-w-7xl mx-auto">
                <div className="bg-white/60 backdrop-blur-lg rounded-3xl shadow-xl border border-white/30 min-h-[60vh] p-8">
                    
                    {/* Loading State */}
                    {loading && (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                                <p className="text-lg font-medium text-gray-700">Evolutiegegevens laden...</p>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center bg-red-50 rounded-2xl p-8 max-w-md">
                                <div className="text-red-500 text-4xl mb-4">⚠️</div>
                                <h3 className="text-lg font-semibold text-red-800 mb-2">Fout bij laden</h3>
                                <p className="text-red-600">{error}</p>
                                <button 
                                    onClick={() => window.location.reload()}
                                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Probeer opnieuw
                                </button>
                            </div>
                        </div>
                    )}

                    {/* No Student Selected (Teacher/Admin view) */}
                    {!loading && !error && !selectedStudent && isTeacherOrAdmin && (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center max-w-md">
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">Selecteer een leerling</h3>
                                <p className="text-gray-600">
                                    Gebruik de zoekbalk hierboven om de evolutie van een leerling te bekijken.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Student Selected but No Data */}
                    {!loading && !error && selectedStudent && Object.keys(grouped_data).length === 0 && (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center max-w-md">
                                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">Geen gegevens gevonden</h3>
                                <p className="text-gray-600 mb-2">
                                    Geen scoregeschiedenis gevonden voor <strong>{selectedStudent.naam}</strong>
                                </p>
                                <p className="text-sm text-gray-500">
                                    in het schooljaar {selectedYear}-{selectedYear + 1}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Evolution Cards */}
                    {!loading && !error && selectedStudent && Object.keys(grouped_data).length > 0 && (
                        <>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {Object.entries(grouped_data).map(([categoryName, testsInCategory]) => (
                                    <EvolutionCard
                                        key={categoryName}
                                        categoryName={categoryName}
                                        tests={testsInCategory}
                                        student={selectedStudent}
                                    />
                                ))}
                            </div>
                            
                            {/* Stats Footer */}
                            <div className="mt-12 text-center">
                                <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-6 border border-white/20 inline-block">
                                    <div className="flex items-center space-x-8 text-sm text-gray-600">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                                            <span>{Object.keys(grouped_data).length} Categorieën</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full"></div>
                                            <span>{evolutionData.length} Testen</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 bg-gradient-to-r from-teal-500 to-green-500 rounded-full"></div>
                                            <span>
                                                {evolutionData.reduce((total, test) => total + (test.all_scores?.length || 0), 0)} Scores
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}