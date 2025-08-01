// Verbeterde Score Verdeling Component - Dynamische punten schaal
function ScoreDistributionChart({ leerlingen }) {
    const distribution = useMemo(() => {
        const puntenMetScore = leerlingen
            .filter(l => l.punt !== null && l.punt !== undefined)
            .map(l => l.punt);
        
        if (puntenMetScore.length === 0) return null;

        // Bepaal automatisch de maximum score
        const maxScore = Math.max(...puntenMetScore);
        const isScale20 = maxScore > 10; // Als hoogste score > 10, dan 20-punten schaal
        
        let excellent, good, satisfactory, poor;
        
        if (isScale20) {
            // 20-punten schaal
            excellent = puntenMetScore.filter(p => p >= 16).length;    // 16-20 = Uitstekend
            good = puntenMetScore.filter(p => p >= 12 && p < 16).length; // 12-16 = Goed  
            satisfactory = puntenMetScore.filter(p => p >= 8 && p < 12).length; // 8-12 = Voldoende
            poor = puntenMetScore.filter(p => p < 8).length;            // <8 = Onvoldoende
        } else {
            // 10-punten schaal (oorspronkelijk)
            excellent = puntenMetScore.filter(p => p >= 8).length;
            good = puntenMetScore.filter(p => p >= 6 && p < 8).length;
            satisfactory = puntenMetScore.filter(p => p >= 4 && p < 6).length;
            poor = puntenMetScore.filter(p => p < 4).length;
        }
        
        const total = puntenMetScore.length;
        const average = (puntenMetScore.reduce((sum, p) => sum + p, 0) / total).toFixed(1);

        return {
            excellent: { count: excellent, percentage: Math.round((excellent / total) * 100) },
            good: { count: good, percentage: Math.round((good / total) * 100) },
            satisfactory: { count: satisfactory, percentage: Math.round((satisfactory / total) * 100) },
            poor: { count: poor, percentage: Math.round((poor / total) * 100) },
            average,
            total,
            maxScore,
            isScale20,
            // Labels gebaseerd op schaal
            labels: isScale20 ? {
                excellent: "Uitstekend (16-20)",
                good: "Goed (12-16)", 
                satisfactory: "Voldoende (8-12)",
                poor: "Onvoldoende (<8)"
            } : {
                excellent: "Uitstekend (8-10)",
                good: "Goed (6-8)",
                satisfactory: "Voldoende (4-6)", 
                poor: "Onvoldoende (<4)"
            }
        };
    }, [leerlingen]);

    if (!distribution) {
        return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <ChartBarIcon className="h-5 w-5 mr-2" />
                    Score Verdeling
                </h3>
                <p className="text-gray-500 text-center py-8">Geen scores beschikbaar voor analyse</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2" />
                Score Verdeling
            </h3>
            <p className="text-xs text-gray-500 mb-4">
                Schaal: {distribution.isScale20 ? '20-punten systeem' : '10-punten systeem'} 
                (max: {distribution.maxScore})
            </p>
            
            <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-700">{distribution.labels.excellent}</span>
                    <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                                className="bg-green-500 h-2 rounded-full" 
                                style={{ width: `${distribution.excellent.percentage}%` }}
                            ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12">{distribution.excellent.count}/{distribution.total}</span>
                    </div>
                </div>
                
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-700">{distribution.labels.good}</span>
                    <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: `${distribution.good.percentage}%` }}
                            ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12">{distribution.good.count}/{distribution.total}</span>
                    </div>
                </div>
                
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-yellow-700">{distribution.labels.satisfactory}</span>
                    <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                                className="bg-yellow-500 h-2 rounded-full" 
                                style={{ width: `${distribution.satisfactory.percentage}%` }}
                            ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12">{distribution.satisfactory.count}/{distribution.total}</span>
                    </div>
                </div>
                
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-red-700">{distribution.labels.poor}</span>
                    <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                                className="bg-red-500 h-2 rounded-full" 
                                style={{ width: `${distribution.poor.percentage}%` }}
                            ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12">{distribution.poor.count}/{distribution.total}</span>
                    </div>
                </div>
            </div>
            
            <div className="border-t pt-4">
                <p className="text-center">
                    <span className="text-sm text-gray-600">Gemiddelde: </span>
                    <span className="text-lg font-bold text-gray-900">{distribution.average}</span>
                    <span className="text-sm text-gray-600"> punten</span>
                </p>
            </div>
        </div>
    );
}

// Verbeterde Testafname Acties met meer functionaliteit
function TestafnameActions({ 
    groepId, 
    testId, 
    datum, 
    groepNaam, 
    testNaam, 
    onDateChange, 
    onExport, 
    onDuplicate, 
    onDelete 
}) {
    const [isEditingDate, setIsEditingDate] = useState(false);
    const [newDate, setNewDate] = useState(datum);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDateSave = async () => {
        if (newDate !== datum) {
            await onDateChange(newDate);
        }
        setIsEditingDate(false);
    };

    const handleExportCSV = () => {
        // CSV export functionaliteit
        onExport('csv');
    };

    const handleExportPDF = () => {
        // PDF export functionaliteit  
        onExport('pdf');
    };

    const handleDuplicate = () => {
        onDuplicate();
    };

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        onDelete();
        setShowDeleteConfirm(false);
    };

    return (
        <div className="bg-white/80 p-6 rounded-3xl shadow-2xl border border-white/20 backdrop-blur-lg">
            <div className="flex flex-col gap-6">
                {/* Datum bewerken */}
                <div className="border-b border-gray-200 pb-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Testdatum</h3>
                    <div className="flex items-center gap-3">
                        {isEditingDate ? (
                            <>
                                <input
                                    type="date"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                />
                                <button
                                    onClick={handleDateSave}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                                >
                                    Opslaan
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditingDate(false);
                                        setNewDate(datum);
                                    }}
                                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                                >
                                    Annuleren
                                </button>
                            </>
                        ) : (
                            <>
                                <span className="text-gray-700">
                                    {new Date(datum).toLocaleDateString('nl-BE', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}
                                </span>
                                <button
                                    onClick={() => setIsEditingDate(true)}
                                    className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
                                >
                                    Wijzigen
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Export opties */}
                <div className="border-b border-gray-200 pb-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Exporteren</h3>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleExportCSV}
                            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium flex items-center"
                        >
                            <DocumentIcon className="h-4 w-4 mr-2" />
                            Export CSV
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium flex items-center"
                        >
                            <DocumentIcon className="h-4 w-4 mr-2" />
                            Export PDF
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium flex items-center"
                        >
                            <PrinterIcon className="h-4 w-4 mr-2" />
                            Afdrukken
                        </button>
                    </div>
                </div>

                {/* Testafname acties */}
                <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Testafname Beheer</h3>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleDuplicate}
                            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium flex items-center"
                        >
                            <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                            Dupliceren
                        </button>
                        <button
                            onClick={() => navigate('/nieuwe-testafname')}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center"
                        >
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Nieuwe Testafname
                        </button>
                        <button
                            onClick={handleDelete}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium flex items-center"
                        >
                            <TrashIcon className="h-4 w-4 mr-2" />
                            Verwijderen
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Testafname Verwijderen</h3>
                        <p className="text-gray-600 mb-4">
                            Weet je zeker dat je deze testafname wilt verwijderen? 
                            <br />
                            <strong>{testNaam}</strong> - <strong>{groepNaam}</strong>
                            <br />
                            Alle scores worden permanent verwijderd.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Annuleren
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Verwijderen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}