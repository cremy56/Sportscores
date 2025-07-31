// src/pages/Evolutie.jsx - Mobile Optimized
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import StudentSearch from '../components/StudentSearch';
import EvolutionCard from '../components/EvolutionCard';
import PageHeader from '../components/PageHeader';
import { getStudentEvolutionData } from '../utils/firebaseUtils';
import { 
    generateSchoolYears, 
    getCurrentSchoolYear, 
    filterTestDataBySchoolYear,
    formatSchoolYear 
} from '../utils/schoolyearUtils';

export default function Evolutie() {
    const { profile } = useOutletContext();
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [evolutionData, setEvolutionData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [availableYears, setAvailableYears] = useState([]);

    // Gebruik de huidige schooljaar als default
    const [selectedYear, setSelectedYear] = useState(getCurrentSchoolYear());

    // Genereer beschikbare schooljaren
    useEffect(() => {
        const years = generateSchoolYears();
        setAvailableYears(years);
    }, []);

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
                // Haal alle data op (zonder schooljaar filter in database query)
                const allData = await getStudentEvolutionData(selectedStudent.id);
                
                // Filter client-side op schooljaar
                const filteredData = filterTestDataBySchoolYear(allData, selectedYear);
                
                setEvolutionData(filteredData);
                
                // Log voor debugging
                console.log(`Loaded ${allData.length} total tests, ${filteredData.length} for school year ${formatSchoolYear(selectedYear)}`);
                
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

    // Groepeer data per categorie (alleen data met scores)
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

    const handleStudentSelect = (student) => {
        console.log('Geselecteerde student:', student);
        setSelectedStudent(student);
        setError(null);
    };

    const handleYearChange = (newYear) => {
        setSelectedYear(Number(newYear));
        setError(null);
    };

    // Statistieken voor de footer
    const totalScores = evolutionData.reduce((total, test) => 
        total + (test.all_scores?.length || 0), 0
    );

    // Find huidige schooljaar info
    const currentYearInfo = availableYears.find(year => year.value === selectedYear);
    const isCurrentYear = currentYearInfo?.isCurrent || false;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 p-2 sm:p-4 lg:p-8">
            <PageHeader 
                title={selectedStudent ? selectedStudent.naam : pageTitle}
                subtitle={
                    selectedStudent 
                        ? `Evolutie overzicht voor schooljaar ${formatSchoolYear(selectedYear)}${isCurrentYear ? ' (huidig)' : ''}`
                        : 'Bekijk je sportieve vooruitgang'
                }
            >
                {/* Search Controls - alleen voor leraren/admins */}
                {isTeacherOrAdmin && (
                    <div className="grid grid-cols-1 gap-y-3 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-4 items-end">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Zoek Leerling
                            </label>
                            <StudentSearch 
                                onStudentSelect={handleStudentSelect}
                                schoolId={profile?.school_id}
                            />
                        </div>
                        <div>
                            <label htmlFor="school-year-select" className="block text-sm font-medium text-gray-700 mb-2">
                                Schooljaar
                                {isCurrentYear && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Huidig
                                    </span>
                                )}
                            </label>
                            <select
                                id="school-year-select"
                                value={selectedYear}
                                onChange={(e) => handleYearChange(e.target.value)}
                                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white/80 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 text-sm"
                            >
                                {availableYears.map(year => (
                                    <option key={year.value} value={year.value}>
                                        {year.label} {year.isCurrent ? '(Huidig)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Schooljaar selector voor leerlingen */}
                {!isTeacherOrAdmin && (
                    <div className="max-w-full sm:max-w-sm">
                        <label htmlFor="student-year-select" className="block text-sm font-medium text-gray-700 mb-2">
                            Bekijk schooljaar
                            {isCurrentYear && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Huidig
                                </span>
                            )}
                        </label>
                        <select
                            id="student-year-select"
                            value={selectedYear}
                            onChange={(e) => handleYearChange(e.target.value)}
                            className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white/80 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 text-sm"
                        >
                            {availableYears.map(year => (
                                <option key={year.value} value={year.value}>
                                    {year.label} {year.isCurrent ? '(Huidig)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </PageHeader>

            <div className="max-w-7xl mx-auto">
                <div className="bg-white/60 backdrop-blur-lg rounded-2xl sm:rounded-3xl shadow-xl border border-white/30 min-h-[60vh] p-4 sm:p-6 lg:p-8">
                    
                    {/* Loading State */}
                    {loading && (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                                <p className="text-base sm:text-lg font-medium text-gray-700">Evolutiegegevens laden...</p>
                                <p className="text-xs sm:text-sm text-gray-500 mt-2 px-4">
                                    Data voor {selectedStudent?.naam} wordt gefilterd voor schooljaar {formatSchoolYear(selectedYear)}...
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center bg-red-50 rounded-2xl p-6 sm:p-8 max-w-md mx-4">
                                <div className="text-red-500 text-3xl sm:text-4xl mb-4">⚠️</div>
                                <h3 className="text-base sm:text-lg font-semibold text-red-800 mb-2">Fout bij laden</h3>
                                <p className="text-sm sm:text-base text-red-600 mb-4">{error}</p>
                                <button 
                                    onClick={() => {
                                        setError(null);
                                        if (selectedStudent) {
                                            // Herlaad de data
                                            const fetchData = async () => {
                                                setLoading(true);
                                                try {
                                                    const allData = await getStudentEvolutionData(selectedStudent.id);
                                                    const filteredData = filterTestDataBySchoolYear(allData, selectedYear);
                                                    setEvolutionData(filteredData);
                                                } catch (err) {
                                                    setError('Kon de evolutiegegevens niet laden.');
                                                } finally {
                                                    setLoading(false);
                                                }
                                            };
                                            fetchData();
                                        }
                                    }}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                                >
                                    Probeer opnieuw
                                </button>
                            </div>
                        </div>
                    )}

                    {/* No Student Selected (Teacher/Admin view) */}
                    {!loading && !error && !selectedStudent && isTeacherOrAdmin && (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center max-w-md mx-4">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Selecteer een leerling</h3>
                                <p className="text-sm sm:text-base text-gray-600 mb-2">
                                    Gebruik de zoekbalk hierboven om de evolutie van een leerling te bekijken.
                                </p>
                                <p className="text-xs sm:text-sm text-gray-500">
                                    Typ minimaal 2 karakters om te zoeken
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Student Selected but No Data */}
                    {!loading && !error && selectedStudent && Object.keys(grouped_data).length === 0 && (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center max-w-md mx-4">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Geen gegevens gevonden</h3>
                                <p className="text-sm sm:text-base text-gray-600 mb-2">
                                    Geen scoregeschiedenis gevonden voor <strong>{selectedStudent.naam}</strong>
                                </p>
                                <p className="text-xs sm:text-sm text-gray-500 mb-4">
                                    in het schooljaar {formatSchoolYear(selectedYear)}
                                    {isCurrentYear && ' (huidig schooljaar)'}
                                </p>
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                    <p className="text-xs text-blue-700">
                                        💡 Tip: Probeer een ander schooljaar of controleer of er scores zijn ingevoerd voor deze leerling in dit periode.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Evolution Cards - Mobile Layout */}
                    {!loading && !error && selectedStudent && Object.keys(grouped_data).length > 0 && (
                        <>
                            {/* Mobile: Single column, Desktop: Two columns */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                                {Object.entries(grouped_data).map(([categoryName, testsInCategory]) => (
                                    <EvolutionCard
                                        key={`${categoryName}-${selectedYear}`} // Key includes schooljaar voor re-render
                                        categoryName={categoryName}
                                        tests={testsInCategory}
                                        student={selectedStudent}
                                    />
                                ))}
                            </div>
                            
                            {/* Enhanced Stats Footer - Mobile Optimized */}
                            <div className="mt-8 sm:mt-12 text-center">
                                <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-white/20 inline-block max-w-full">
                                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                                            <span>{Object.keys(grouped_data).length} Categorieën</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full"></div>
                                            <span>{evolutionData.length} Testen</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-teal-500 to-green-500 rounded-full"></div>
                                            <span>{totalScores} Scores</span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-purple-700 font-medium w-full sm:w-auto justify-center">
                                            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-green-500 to-purple-500 rounded-full"></div>
                                            <span className="text-xs sm:text-sm">
                                                {formatSchoolYear(selectedYear)}
                                                {isCurrentYear && (
                                                    <span className="ml-1 text-xs bg-green-100 text-green-700 px-1 rounded">
                                                        huidig
                                                    </span>
                                                )}
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