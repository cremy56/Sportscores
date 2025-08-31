// src/pages/Trainingsbeheer.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { PlusIcon } from '@heroicons/react/24/solid';
import OefeningFormModal from '../components/OefeningFormModal';
import SchemaFormModal from '../components/SchemaFormModal';

export default function Trainingsbeheer() {
    const { profile } = useOutletContext();
    const [oefeningen, setOefeningen] = useState([]);
    const [schemas, setSchemas] = useState([]);
    const [testen, setTesten] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modals state
    const [isOefeningModalOpen, setIsOefeningModalOpen] = useState(false);
    const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
    const [selectedOefening, setSelectedOefening] = useState(null);
    const [selectedSchema, setSelectedSchema] = useState(null);


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
        return <div className="text-center p-12">Laden...</div>;
    }

    return (
        <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 pt-20 pb-6 lg:px-8 lg:pt-24 lg:pb-8">
            
                {/* --- MOBIELE HEADER (conform Testbeheer) --- */}
                <div className="lg:hidden mb-8">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-800">Trainingsbeheer</h1>
                        <div className="flex items-center space-x-2">
                            <button 
                                onClick={() => setIsOefeningModalOpen(true)}
                                className="bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700"
                                title="Nieuwe Oefening"
                            >
                                <PlusIcon className="h-6 w-6" />
                            </button>
                            <button 
                                onClick={() => setIsSchemaModalOpen(true)}
                                className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700"
                                title="Nieuw Schema"
                            >
                                <PlusIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- DESKTOP HEADER --- */}
                <div className="hidden lg:flex justify-between items-center mb-12">
                    <h1 className="text-3xl font-bold">Trainingsbeheer</h1>
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={() => setIsOefeningModalOpen(true)}
                            className="bg-purple-600 text-white px-5 py-3 rounded-2xl flex items-center shadow-lg hover:bg-purple-700 transition-all duration-200 hover:scale-105"
                        >
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Nieuwe Oefening
                        </button>
                        <button 
                            onClick={() => setIsSchemaModalOpen(true)}
                            className="bg-blue-600 text-white px-5 py-3 rounded-2xl flex items-center shadow-lg hover:bg-blue-700 transition-all duration-200 hover:scale-105"
                        >
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Nieuw Schema
                        </button>
                    </div>
                </div>

                <OefeningFormModal 
                    isOpen={isOefeningModalOpen}
                    onClose={() => {
                        setIsOefeningModalOpen(false);
                        setSelectedOefening(null);
                    }}
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
                    {/* Kolom voor Oefeningen */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold mb-4">Oefeningen ({oefeningen.length})</h2>
                        <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
                            {oefeningen.map(oefening => (
                                <li key={oefening.id} className="p-3 bg-slate-50 rounded-lg border flex justify-between items-center">
                                    <span>{oefening.naam} - <span className="text-slate-500">{oefening.categorie}</span></span>
                                    <button 
                                        onClick={() => {
                                            setSelectedOefening(oefening);
                                            setIsOefeningModalOpen(true);
                                        }}
                                        className="text-sm text-purple-600 hover:underline"
                                    >
                                        Bewerk
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    
                    {/* Kolom voor Schema's */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold mb-4">Trainingsschema's ({schemas.length})</h2>
                        <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
                            {schemas.map(schema => (
                                <li key={schema.id} className="p-3 bg-slate-50 rounded-lg border flex justify-between items-center">
                                    <span>{schema.naam} - <span className="text-slate-500">{schema.duur_weken} weken</span></span>
                                    <button
                                        onClick={() => {
                                            setSelectedSchema(schema);
                                            setIsSchemaModalOpen(true);
                                        }}
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
    );
}