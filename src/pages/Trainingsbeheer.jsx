// src/pages/Trainingsbeheer.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { PlusIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
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
            <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="text-center p-12">Laden...</div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Trainingsbeheer</h2>
                    <p className="text-gray-600">Beheer oefeningen en trainingsschema's</p>
                </div>
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => setIsOefeningModalOpen(true)}
                        className="flex items-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl shadow-lg transition-all duration-200 hover:scale-105"
                    >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Nieuwe Oefening
                    </button>
                    <button 
                        onClick={() => setIsSchemaModalOpen(true)}
                        className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-lg transition-all duration-200 hover:scale-105"
                    >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Nieuw Schema
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Kolom voor Oefeningen (inklapbaar) */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button 
                        onClick={() => setIsOefeningenOpen(prev => !prev)}
                        className="w-full flex justify-between items-center text-left p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                        <h3 className="text-lg font-semibold">Oefeningen ({oefeningen.length})</h3>
                        <ChevronDownIcon className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${isOefeningenOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`transition-all duration-500 ease-in-out ${isOefeningenOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                        <div className="p-4">
                            <ul className="space-y-2 max-h-80 overflow-y-auto">
                                {oefeningen.map(oefening => (
                                    <li key={oefening.id} className="p-3 bg-slate-50 rounded-lg border flex justify-between items-center">
                                        <span>{oefening.naam} - <span className="text-slate-500">{oefening.categorie}</span></span>
                                        <button 
                                            onClick={() => { setSelectedOefening(oefening); setIsOefeningModalOpen(true); }}
                                            className="text-sm text-purple-600 hover:underline"
                                        >
                                            Bewerk
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
                
                {/* Kolom voor Schema's (inklapbaar) */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                        onClick={() => setIsSchemasOpen(prev => !prev)}
                        className="w-full flex justify-between items-center text-left p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                        <h3 className="text-lg font-semibold">Trainingsschema's ({schemas.length})</h3>
                        <ChevronDownIcon className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${isSchemasOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`transition-all duration-500 ease-in-out ${isSchemasOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                        <div className="p-4">
                            <ul className="space-y-2 max-h-80 overflow-y-auto">
                                {schemas.map(schema => (
                                    <li key={schema.id} className="p-3 bg-slate-50 rounded-lg border flex justify-between items-center">
                                        <span>{schema.naam} - <span className="text-slate-500">{schema.duur_weken} weken</span></span>
                                        <button
                                            onClick={() => { setSelectedSchema(schema); setIsSchemaModalOpen(true); }}
                                            className="text-sm text-blue-600 hover:underline"
                                        >
                                            Bewerk
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}