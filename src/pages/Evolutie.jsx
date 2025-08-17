// src/pages/Evolutie.jsx - Grid Layout like Highscores
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
                console.log('=== DEBUG Evolution Data Fetch ===');
                console.log('Selected Student:', selectedStudent);
                console.log('Student ID:', selectedStudent.id);
                console.log('Student Email:', selectedStudent.email);
                console.log('Selected Year:', selectedYear);
                
                // Haal alle data op (zonder schooljaar filter in database query)
                const allData = await getStudentEvolutionData(selectedStudent.id);
                console.log('Raw evolution data:', allData);
                
                // Filter client-side op schooljaar
                const filteredData = filterTestDataBySchoolYear(allData, selectedYear);
                console.log('Filtered evolution data:', filteredData);
                
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

    if (loading) {
        return (
            <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-2xl shadow-sm">
                    <div className="flex items-center space-x-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        <span className="text-gray-700 font-medium">Evolutiegegevens laden...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 py-6 lg:px-8 lg:py-8 space-y-6">
                
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
                        {selectedStudent ? selectedStudent.naam : pageTitle}
                    </h1>
                    <p className="text-slate-600 mb-4">
                        {selectedStudent 
                            ? `Evolutie overzicht voor schooljaar ${formatSchoolYear(selectedYear)}${isCurrentYear ? ' (huidig)' : ''}`
                            : 'Bekijk je sportieve vooruitgang'
                        }
                    </p>
                    <div className="flex justify-center mb-6">
                        <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                    </div>
                </div>

                {/* Controls Card */}
                {isTeacherOrAdmin ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6 items-end">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Zoek Leerling
                                </label>
                                <StudentSearch 
                                    onStudentSelect={handleStudentSelect}
                                    schoolId={profile?.school_id}
                                />
                            </div>
                            <div>
                                <label htmlFor="school-year-select" className="block text-sm font-medium text-slate-700 mb-2">
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
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-purple-500 focus:ring-purple-500 text-sm"
                                >
                                    {availableYears.map(year => (
                                        <option key={year.value} value={year.value}>
                                            {year.label} {year.isCurrent ? '(Huidig)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="max-w-sm mx-auto">
                            <label htmlFor="student-year-select" className="block text-sm font-medium text-slate-700 mb-2">
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
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-purple-500 focus:ring-purple-500 text-sm"
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

                {/* Error State */}
                {error && (
                    <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 max-w-2xl mx-auto">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-red-800 mb-2">Fout bij laden</h3>
                            <p className="text-red-600 leading-relaxed mb-4">{error}</p>
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
                                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
                            >
                                Probeer opnieuw
                            </button>
                        </div>
                    </div>
                )}

                {/* No Student Selected (Teacher/Admin view) */}
                {!error && !selectedStudent && isTeacherOrAdmin && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-2xl mx-auto">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Selecteer een leerling</h3>
                            <p className="text-slate-600 mb-2">
                                Gebruik de zoekbalk hierboven om de evolutie van een leerling te bekijken.
                            </p>
                            <p className="text-sm text-slate-500">
                                Typ minimaal 2 karakters om te zoeken
                            </p>
                        </div>
                    </div>
                )}

                {/* Student Selected but No Data */}
                {!error && selectedStudent && Object.keys(grouped_data).length === 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-2xl mx-auto">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Geen gegevens gevonden</h3>
                            <p className="text-slate-600 mb-2">
                                Geen scoregeschiedenis gevonden voor <strong>{selectedStudent.naam}</strong>
                            </p>
                            <p className="text-sm text-slate-500 mb-4">
                                in het schooljaar {formatSchoolYear(selectedYear)}
                                {isCurrentYear && ' (huidig schooljaar)'}
                            </p>
                            <div className="p-4 bg-blue-50 rounded-xl">
                                <p className="text-sm text-blue-700">
                                    💡 Tip: Probeer een ander schooljaar of controleer of er scores zijn ingevoerd voor deze leerling in dit periode.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Evolution Cards Grid - Same as Highscores */}
                {!error && selectedStudent && Object.keys(grouped_data).length > 0 && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                            {Object.entries(grouped_data).map(([categoryName, testsInCategory]) => (
                                <EvolutionCard
                                    key={`${categoryName}-${selectedYear}`}
                                    categoryName={categoryName}
                                    tests={testsInCategory}
                                    student={selectedStudent}
                                />
                            ))}
                        </div>
                        
                        {/* Stats Footer */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-4">
                            <div className="flex items-center justify-center space-x-8 text-sm text-slate-600 flex-wrap gap-4">
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
                                    <span>{totalScores} Scores</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-purple-500 rounded-full"></div>
                                    <span>
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
                )}
            </div>
        </div>
    );
}