// src/pages/Trainingsbeheer.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { PlusIcon, ChevronDownIcon, PencilIcon } from '@heroicons/react/24/solid';
import OefeningFormModal from '../components/OefeningFormModal';
import SchemaFormModal from '../components/SchemaFormModal';

export default function Trainingsbeheer() {
    const context = useOutletContext();
    const { profile } = context || {};
    const [oefeningen, setOefeningen] = useState([]);
    const [schemas, setSchemas] = useState([]);
    const [testen, setTesten] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modals state
    const [isOefeningModalOpen, setIsOefeningModalOpen] = useState(false);
    const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
    const [selectedOefening, setSelectedOefening] = useState(null);
    const [selectedSchema, setSelectedSchema] = useState(null);

    // State voor het in- en uitklappen van de lijsten
    const [isOefeningenOpen, setIsOefeningenOpen] = useState(true);
    const [isSchemasOpen, setIsSchemasOpen] = useState(true);

    useEffect(() => {
        if (!profile?.school_id) {
            setLoading(false);
            return;
        }

        const queries = [
            { ref: collection(db, 'oefeningen'), setter: setOefeningen },
            { ref: collection(db, 'trainingsschemas'), setter: setSchemas },
            { ref: collection(db, 'testen'), setter: setTesten }
        ];

        const unsubscribers = queries.map(q => 
            onSnapshot(q.ref, (snapshot) => {
                q.setter(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            })
        );
        
        setLoading(false);

        return () => unsubscribers.forEach(unsub => unsub());
    }, [profile?.school_id]);
    
    const handleSave = () => console.log("Data opgeslagen, onSnapshot vernieuwt de lijst.");

    if (loading) {
        return (
            <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="text-center p-8 sm:p-12">Laden...</div>
            </div>
        );
    }

    return (
        <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 sm:mb-8 space-y-4 sm:space-y-0">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Trainingsbeheer</h2>
                    <p className="text-sm sm:text-base text-gray-600">Beheer oefeningen en trainingsschema's</p>
                </div>
                
                {/* Mobile-first button layout */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button 
                        onClick={() => setIsOefeningModalOpen(true)}
                        className="flex items-center justify-center sm:justify-start bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 sm:py-2 rounded-xl shadow-lg transition-all duration-200 hover:scale-105 touch-manipulation w-full sm:w-auto"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        <span>Nieuwe Oefening</span>
                    </button>
                    <button 
                        onClick={() => setIsSchemaModalOpen(true)}
                        className="flex items-center justify-center sm:justify-start bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 sm:py-2 rounded-xl shadow-lg transition-all duration-200 hover:scale-105 touch-manipulation w-full sm:w-auto"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        <span>Nieuw Schema</span>
                    </button>
                </div>
            </div>

            <OefeningFormModal 
                isOpen={isOefeningModalOpen}
                onClose={() => { setIsOefeningModalOpen(false); setSelectedOefening(null); }}
                onSave={handleSave}
                oefeningData={selectedOefening}
            />

            <SchemaFormModal 
                isOpen={isSchemaModalOpen}
                onClose={() => { setIsSchemaModalOpen(false); setSelectedSchema(null); }}
                onSave={handleSave}
                schemaData={selectedSchema}
                alleOefeningen={oefeningen}
                alleTesten={testen}
            />

            {/* Mobile-first: Stack columns on mobile, side-by-side on desktop */}
            <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-8">
                {/* Kolom voor Oefeningen (inklapbaar) */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button 
                        onClick={() => setIsOefeningenOpen(prev => !prev)}
                        className="w-full flex justify-between items-center text-left p-4 sm:p-5 bg-gray-50 hover:bg-gray-100 transition-colors touch-manipulation"
                    >
                        <h3 className="text-lg sm:text-xl font-semibold">Oefeningen ({oefeningen.length})</h3>
                        <ChevronDownIcon className={`h-5 w-5 sm:h-6 sm:w-6 text-slate-400 transition-transform duration-300 ${isOefeningenOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`transition-all duration-500 ease-in-out ${isOefeningenOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                        <div className="p-4">
                            {oefeningen.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">Nog geen oefeningen aangemaakt</p>
                            ) : (
                                <ul className="space-y-3 max-h-80 overflow-y-auto">
                                    {oefeningen.map(oefening => (
                                        <li key={oefening.id} className="p-3 sm:p-4 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors">
                                            <div className="flex justify-between items-start space-x-3">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-medium text-gray-900 truncate">{oefening.naam}</h4>
                                                    <p className="text-sm text-slate-500 mt-1">{oefening.categorie}</p>
                                                </div>
                                                <button 
                                                    onClick={() => { setSelectedOefening(oefening); setIsOefeningModalOpen(true); }}
                                                    className="flex items-center space-x-1 text-sm text-purple-600 hover:text-purple-800 p-2 hover:bg-purple-50 rounded-lg transition-colors touch-manipulation flex-shrink-0"
                                                >
                                                    <PencilIcon className="h-4 w-4" />
                                                    <span className="hidden sm:inline">Bewerk</span>
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Kolom voor Schema's (inklapbaar) */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                        onClick={() => setIsSchemasOpen(prev => !prev)}
                        className="w-full flex justify-between items-center text-left p-4 sm:p-5 bg-gray-50 hover:bg-gray-100 transition-colors touch-manipulation"
                    >
                        <h3 className="text-lg sm:text-xl font-semibold">Trainingsschema's ({schemas.length})</h3>
                        <ChevronDownIcon className={`h-5 w-5 sm:h-6 sm:w-6 text-slate-400 transition-transform duration-300 ${isSchemasOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`transition-all duration-500 ease-in-out ${isSchemasOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                        <div className="p-4">
                            {schemas.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">Nog geen schema's aangemaakt</p>
                            ) : (
                                <ul className="space-y-3 max-h-80 overflow-y-auto">
                                    {schemas.map(schema => (
                                        <li key={schema.id} className="p-3 sm:p-4 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors">
                                            <div className="flex justify-between items-start space-x-3">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-medium text-gray-900 truncate">{schema.naam}</h4>
                                                    <p className="text-sm text-slate-500 mt-1">{schema.duur_weken} weken</p>
                                                </div>
                                                <button
                                                    onClick={() => { setSelectedSchema(schema); setIsSchemaModalOpen(true); }}
                                                    className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors touch-manipulation flex-shrink-0"
                                                >
                                                    <PencilIcon className="h-4 w-4" />
                                                    <span className="hidden sm:inline">Bewerk</span>
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}