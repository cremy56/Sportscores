// src/pages/Trainingsbeheer.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { PlusIcon } from '@heroicons/react/24/solid';
import OefeningFormModal from '../components/OefeningFormModal';
import SchemaFormModal from '../components/SchemaFormModal';

export default function Trainingsbeheer() {
    const { profile } = useOutletContext();
    const [oefeningen, setOefeningen] = useState([]);
    const [schemas, setSchemas] = useState([]);
    const [testen, setTesten] = useState([]); // <-- 2. State voor testen toevoegen
    const [loading, setLoading] = useState(true);

    // Modals state
    const [isOefeningModalOpen, setIsOefeningModalOpen] = useState(false);
    const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
    const [selectedOefening, setSelectedOefening] = useState(null);
    const [selectedSchema, setSelectedSchema] = useState(null);


    useEffect(() => {
        if (!profile?.school_id) return;

        const oefeningenQuery = collection(db, 'oefeningen');
        const unsubscribeOefeningen = onSnapshot(oefeningenQuery, (snapshot) => {
            setOefeningen(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        const schemasQuery = collection(db, 'trainingsschemas');
        const unsubscribeSchemas = onSnapshot(schemasQuery, (snapshot) => {
            setSchemas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        // --- 3. Listener voor Testen toevoegen ---
        const testenQuery = collection(db, 'testen');
        const unsubscribeTesten = onSnapshot(testenQuery, (snapshot) => {
            setTesten(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        return () => {
            unsubscribeOefeningen();
            unsubscribeSchemas();
            unsubscribeTesten(); // <-- Unsubscribe toevoegen
        };
    }, [profile?.school_id]);
    
    const handleSave = () => console.log("Data opgeslagen, onSnapshot vernieuwt de lijst.");


    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Trainingsbeheer</h1>
                <div className="space-x-4">
                    <button 
                        onClick={() => setIsOefeningModalOpen(true)}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center shadow-sm hover:bg-purple-700"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Nieuwe Oefening
                    </button>
                    <button 
                        onClick={() => setIsSchemaModalOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center shadow-sm hover:bg-blue-700"
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
                    setSelectedOefening(null); // Reset selectie bij sluiten
                }}
                onSave={handleSave}
                oefeningData={selectedOefening}
            />

             {/* --- 4. Schema Modal Toevoegen --- */}
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
                <div className="bg-white p-6 rounded-2xl shadow-sm border">
                    <h2 className="text-xl font-bold mb-4">Oefeningen ({oefeningen.length})</h2>
                    <ul className="space-y-2 max-h-96 overflow-y-auto">
                        {oefeningen.map(oefening => (
                            <li key={oefening.id} className="p-3 bg-slate-50 rounded-lg border flex justify-between items-center">
                                <span>{oefening.naam} - <span className="text-slate-500">{oefening.categorie}</span></span>
                                {/* Voorbereiding voor bewerk-knop */}
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
                <div className="bg-white p-6 rounded-2xl shadow-sm border">
                    <h2 className="text-xl font-bold mb-4">Trainingsschema's ({schemas.length})</h2>
                    <ul className="space-y-2 max-h-96 overflow-y-auto">
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
    );
}