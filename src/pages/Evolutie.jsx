// src/pages/Evolutie.jsx - Optimized Layout with compact header
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
    const { profile, selectedStudent, setSelectedStudent } = useOutletContext();
    const [evolutionData, setEvolutionData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [availableYears, setAvailableYears] = useState([]);

    // --- AANPASSING 1: Begin standaard met 'all' ---
    const [selectedYear, setSelectedYear] = useState('all');

   useEffect(() => {
        const years = generateSchoolYears(10);
        // --- AANPASSING 2: Voeg 'Alle Schooljaren' toe aan de lijst ---
        const allYearsOption = { label: 'Alle Schooljaren', value: 'all' };
        setAvailableYears([allYearsOption, ...years]);
    }, []);

    useEffect(() => {
        // Als de ingelogde gebruiker een leerling is, stel deze in
        if (profile?.rol === 'leerling' && !selectedStudent) {
            setSelectedStudent(profile);
        }
    }, [profile, selectedStudent, setSelectedStudent]);

    useEffect(() => {
        if (!selectedStudent?.id) {
            setEvolutionData([]);
            return;
        }

       const fetchEvolutionData = async () => {
            setLoading(true);
            setError(null);
            try {
                const allData = await getStudentEvolutionData(selectedStudent.id);
                const dataToShow = (selectedYear === 'all')
                    ? allData
                    : filterTestDataBySchoolYear(allData, selectedYear);
                setEvolutionData(dataToShow);
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

    const pageTitle = (profile?.rol === 'leerkracht' || profile?.rol === 'administrator' || profile?.rol === 'super-administrator') 
        ? 'Evolutie leerlingen' 
        : 'Mijn Evolutie';

    const isTeacherOrAdmin = profile?.rol === 'leerkracht' || profile?.rol === 'administrator' || profile?.rol === 'super-administrator';
    const handleStudentSelect = (student) => {
        setSelectedStudent(student);
        setError(null);
    };

   // --- AANPASSING 4: Handel zowel 'all' (string) als jaartallen (number) af ---
    const handleYearChange = (newYearValue) => {
        const valueToSet = newYearValue === 'all' ? 'all' : Number(newYearValue);
        setSelectedYear(valueToSet);
        setError(null);
    };

    const totalScores = evolutionData.reduce((total, test) => total + (test.all_scores?.length || 0), 0);
    const currentYearInfo = availableYears.find(year => year.value === selectedYear);
    const isCurrentYear = currentYearInfo?.isCurrent || false;

  const exportToCSV = () => {
    if (!selectedStudent || Object.keys(grouped_data).length === 0) {
        return;
    }

    let csvContent = '';
    
    // Header informatie
    csvContent += `Leerling,${selectedStudent.naam}\n`;
    csvContent += `Schooljaar,${selectedYear === 'all' ? 'Alle Schooljaren' : formatSchoolYear(selectedYear)}\n`;
    csvContent += `Export datum,${new Date().toLocaleDateString('nl-BE')}\n\n`;
    
    // Data per categorie
    Object.entries(grouped_data).forEach(([categoryName, testsInCategory]) => {
        csvContent += `Categorie: ${categoryName}\n`;
        csvContent += `Test,Datum,Score,Eenheid,Rapportpunt\n`;
        
        testsInCategory.forEach(test => {
            test.all_scores.forEach(score => {
                csvContent += `"${test.naam}","${new Date(score.datum.toDate()).toLocaleDateString('nl-BE')}","${score.score}","${test.eenheid}","${score.rapportpunt || '-'}"\n`;
            });
        });
        csvContent += '\n';
    });
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const yearLabel = selectedYear === 'all' ? 'Alle_Jaren' : formatSchoolYear(selectedYear).replace('/', '-');
    const fileName = `${selectedStudent.naam.replace(/\s+/g, '_')}_Evolutie_${yearLabel}.csv`;
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

    if (loading && !evolutionData.length) {
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
            <div className="max-w-7xl mx-auto px-4 py-4 lg:px-8 space-y-4">
                
                {/* Header zoals Groepsbeheer - zonder card */}
                {isTeacherOrAdmin ? (
                    <div className="mb-8 mt-20">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            {/* Titel sectie */}
                            <div className="text-center lg:text-left lg:flex-1">
                                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
                                    {selectedStudent ? selectedStudent.naam : pageTitle}
                                </h1>
                                <p className="text-sm text-slate-600 mb-3">
                                    {selectedStudent 
                                        ? selectedYear === 'all'
                                            ? 'Evolutie overzicht over alle schooljaren'
                                            : `Evolutie overzicht voor schooljaar ${formatSchoolYear(selectedYear)}${isCurrentYear ? ' (huidig)' : ''}`
                                        : 'Selecteer een leerling om de evolutie te bekijken'
                                    }
                                </p>
                            </div>
                            
                            {/* Controls sectie */}
<div className="lg:flex-shrink-0 lg:w-[600px]">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 items-end">
        <div>
            <label className="inline-block text-sm font-medium text-slate-700 mb-2">
                Zoek Leerling
            </label>
            <StudentSearch 
                onStudentSelect={setSelectedStudent}
                schoolId={profile?.school_id}
                initialStudent={selectedStudent}
            />
        </div>
        <div>
            <label htmlFor="school-year-select" className="inline-block text-sm font-medium text-slate-700 mb-2">
                Schooljaar
            </label>
            <select
                id="school-year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg"
            >
                {availableYears.map(year => (
                    <option key={year.value} value={year.value}>
                        {year.label}
                    </option>
                ))}
            </select>
        </div>
        <div>
            <label className="inline-block text-sm font-medium text-slate-700 mb-2">
                Export
            </label>
            <button
                onClick={exportToCSV}
                disabled={!selectedStudent || Object.keys(grouped_data).length === 0}
                className="w-full h-10 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
            >
                CSV Export
            </button>
        </div>
    </div>
</div>
                        </div>
                    </div>
                ) : (
                    <div className="mb-8 mt-20">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            {/* Titel sectie voor leerling */}
                            <div className="text-center sm:text-left sm:flex-1">
                                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
                                    {selectedStudent ? selectedStudent.naam : pageTitle}
                                </h1>
                                <p className="text-sm text-slate-600 mb-3">
                                    {selectedStudent 
                                        ? selectedYear === 'all'
                                            ? 'Evolutie overzicht over alle schooljaren'
                                            : `Evolutie overzicht voor schooljaar ${formatSchoolYear(selectedYear)}${isCurrentYear ? ' (huidig)' : ''}`
                                        : ''
                                    }
                                </p>
                                <div className="flex justify-center sm:justify-start">
                                    <div className="w-20 h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                                </div>
                            </div>
                            
                            {/* Controls sectie voor leerling */}
<div className="sm:flex-shrink-0 sm:w-80">
    <div className="grid grid-cols-2 gap-3">
        <div>
            <label htmlFor="student-year-select" className="inline-block text-sm font-medium text-slate-700 mb-2">
                <span className="flex items-center justify-center sm:justify-start">
                    Bekijk schooljaar
                    {isCurrentYear && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Huidig
                        </span>
                    )}
                </span>
            </label>
            <select
                id="student-year-select"
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:border-purple-500 focus:ring-purple-500 text-sm"
            >
                {availableYears.map(year => (
                    <option key={year.value} value={year.value}>
                        {year.label}{year.isCurrent ? ' (Huidig)' : ''}
                    </option>
                ))}
            </select>
        </div>
        <div>
            <label className="inline-block text-sm font-medium text-slate-700 mb-2">
                Export
            </label>
            <button
    onClick={exportToCSV}
    disabled={Object.keys(grouped_data).length === 0}
    className="w-full h-10 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
>
    CSV Export
</button>
        </div>
    </div>
</div>

                        </div>
                    </div>
                )}

                {/* Error State - Compacter */}
                {error && (
                    <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 max-w-2xl mx-auto">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-red-800 mb-1">Fout bij laden</h3>
                            <p className="text-sm text-red-600 leading-relaxed mb-3">{error}</p>
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
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                            >
                                Probeer opnieuw
                            </button>
                        </div>
                    </div>
                )}

                {/* No Student Selected - Compacter */}
                {!error && !selectedStudent && isTeacherOrAdmin && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">Selecteer een leerling</h3>
                            <p className="text-sm text-slate-600 mb-1">
                                Gebruik de zoekbalk hierboven om de evolutie van een leerling te bekijken.
                            </p>
                            <p className="text-xs text-slate-500">
                                Typ voor-of achternaam
                            </p>
                        </div>
                    </div>
                )}

                {/* No Data - Compacter */}
                {!error && selectedStudent && Object.keys(grouped_data).length === 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">Geen gegevens gevonden</h3>
                            <p className="text-sm text-slate-600 mb-1">
                                Geen scoregeschiedenis gevonden voor <strong>{selectedStudent.naam}</strong>
                            </p>
                            <p className="text-xs text-slate-500 mb-3">
                                in het schooljaar {formatSchoolYear(selectedYear)}
                                {isCurrentYear && ' (huidig schooljaar)'}
                            </p>
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <p className="text-xs text-blue-700">
                                    💡 Tip: Probeer een ander schooljaar of controleer of er scores zijn ingevoerd voor deze leerling in dit periode.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Evolution Cards Grid - Meer ruimte voor de grafieken */}
                {!error && selectedStudent && Object.keys(grouped_data).length > 0 && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                            {Object.entries(grouped_data).map(([categoryName, testsInCategory]) => (
                                <EvolutionCard
                                    key={`${categoryName}-${selectedYear}`}
                                    categoryName={categoryName}
                                    tests={testsInCategory}
                                    student={selectedStudent}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}