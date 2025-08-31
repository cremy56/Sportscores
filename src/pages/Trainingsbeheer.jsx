// src/pages/Trainingsbeheer.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { PlusIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
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

    // --- NIEUW: State voor het in- en uitklappen van de lijsten ---
    const [isOefeningenOpen, setIsOefeningenOpen] = useState(false);
    const [isSchemasOpen, setIsSchemasOpen] = useState(false);

    useEffect(() => {
        if (!profile?.school_id) {
            setLoading(false);
            return;
        }

        // --- NIEUW: Bepaal de initiële open/dicht-status op basis van schermgrootte ---
        const isDesktop = window.innerWidth >= 1024; // Tailwind's 'lg' breakpoint
        setIsOefeningenOpen(isDesktop);
        setIsSchemasOpen(isDesktop);

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
            
                {/* Mobiele Header */}
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

                {/* Desktop Header */}
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
                    {/* --- AANGEPAST: Kolom voor Oefeningen (inklapbaar) --- */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <button 
                            onClick={() => setIsOefeningenOpen(prev => !prev)}
                            className="w-full flex justify-between items-center text-left"
                        >
                            <h2 className="text-xl font-bold">Oefeningen ({oefeningen.length})</h2>
                            <ChevronDownIcon className={`h-6 w-6 text-slate-400 transition-transform duration-300 ${isOefeningenOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <div className={`transition-all duration-500 ease-in-out grid ${isOefeningenOpen ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden">
                                <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
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
                    
                    {/* --- AANGEPAST: Kolom voor Schema's (inklapbaar) --- */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <button
                            onClick={() => setIsSchemasOpen(prev => !prev)}
                            className="w-full flex justify-between items-center text-left"
                        >
                            <h2 className="text-xl font-bold">Trainingsschema's ({schemas.length})</h2>
                            <ChevronDownIcon className={`h-6 w-6 text-slate-400 transition-transform duration-300 ${isSchemasOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <div className={`transition-all duration-500 ease-in-out grid ${isSchemasOpen ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden">
                                <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
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
        </div>
    );
}