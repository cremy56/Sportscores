// src/pages/Groeiplan.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Plus, X, Target, Star, Clock, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import FocusPuntKaart from '../components/groeiplan/FocusPuntKaart';
import StudentSearch from '../components/StudentSearch';

// --- SUB-COMPONENT: Kaart voor optionele, zelfgekozen schema's ---
const OptionalFocusPuntKaart = ({ schema, student, onRemove, isTeacherOrAdmin }) => {
    const navigate = useNavigate();
    const [schemaExists, setSchemaExists] = useState(false);
    const [loading, setLoading] = useState(true);

    const studentIdentifier = student?.id;
    const schemaInstanceId = `${studentIdentifier}_${schema.id}`;

    useEffect(() => {
        const checkSchemaExists = async () => {
            if (!isTeacherOrAdmin && studentIdentifier) {
                const actiefSchemaRef = doc(db, 'leerling_schemas', schemaInstanceId);
                const docSnap = await getDoc(actiefSchemaRef);
                setSchemaExists(docSnap.exists());
            }
            setLoading(false);
        };
        checkSchemaExists();
    }, [schemaInstanceId, isTeacherOrAdmin, studentIdentifier]);

    const handleStartOrContinue = async () => {
        if (!schemaExists) {
            const actiefSchemaRef = doc(db, 'leerling_schemas', schemaInstanceId);
            try {
                await setDoc(actiefSchemaRef, {
                    leerling_id: studentIdentifier,
                    schema_id: schema.id,
                    start_datum: serverTimestamp(),
                    huidige_week: 1,
                    voltooide_taken: {},
                    type: 'optioneel'
                });
                toast.success("Optioneel schema gestart!");
            } catch (error) { toast.error("Kon schema niet starten."); }
        }
        navigate(`/groeiplan/${schemaInstanceId}`);
    };
    
    const handleRemove = async () => {
        if (!window.confirm(`Weet je zeker dat je het plan "${schema.naam}" wilt verwijderen?`)) return;
        try {
            await deleteDoc(doc(db, 'leerling_optionele_schemas', `${studentIdentifier}_${schema.id}`));
            if (schemaExists) {
                await deleteDoc(doc(db, 'leerling_schemas', schemaInstanceId));
            }
            onRemove(schema.id);
            toast.success("Trainingsplan verwijderd.");
        } catch (error) { toast.error("Kon plan niet verwijderen."); }
    };

    return (
        <div className="bg-white rounded-2xl shadow-md border-2 border-blue-200 p-8 max-w-2xl mx-auto relative">
            <div className="absolute -top-3 left-6"><span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">💪 Zelfgekozen</span></div>
            {!isTeacherOrAdmin && <button onClick={handleRemove} className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg flex items-center justify-center"><X size={16} /></button>}
            <div className="text-center pt-4">
                <h2 className="text-3xl font-bold text-slate-800 mb-2">{schema.naam}</h2>
                <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 mt-6">
                    <p className="text-sm text-blue-600 mb-4">{schema.omschrijving}</p>
                    <div className="flex justify-between items-center text-sm font-medium text-blue-700">
                        <span>Duur: {schema.duur_weken} weken</span><span>Categorie: {schema.categorie}</span>
                    </div>
                </div>
                <div className="text-center mt-8">
                    <button onClick={handleStartOrContinue} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 font-medium">
                        {schemaExists ? `Ga verder met plan` : `Start dit plan`}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: Modal om een trainingsplan te kiezen ---
const TrainingsplanModal = ({ isOpen, onClose, onSelect, alGekozenIds }) => {
    const [alleSchemas, setAlleSchemas] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Alle');
    const [loading, setLoading] = useState(true);
    
    const categories = useMemo(() => ['Alle', ...new Set(alleSchemas.map(s => s.categorie))], [alleSchemas]);

    useEffect(() => {
        if (!isOpen) return;
        const fetchSchemas = async () => {
            setLoading(true);
            const schemasQuery = query(collection(db, 'trainingsschemas'));
            const snapshot = await getDocs(schemasQuery);
            setAlleSchemas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        };
        fetchSchemas();
    }, [isOpen]);
    
    const gefilterdePlannen = alleSchemas.filter(plan => {
        if (alGekozenIds.includes(plan.id)) return false;
        const matchesSearch = plan.naam.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'Alle' || plan.categorie === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-6"><h2 className="text-2xl font-bold">Kies een Trainingsplan</h2></div>
                <div className="p-6 overflow-y-auto">
                    <input type="text" placeholder="Zoek..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-3 border rounded-xl mb-4" />
                    <div className="flex flex-wrap gap-2 mb-6">
                        {categories.map(cat => <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium ${selectedCategory === cat ? 'bg-purple-100 text-purple-700' : 'bg-slate-100'}`}>{cat}</button>)}
                    </div>
                    {loading ? <p>Laden...</p> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {gefilterdePlannen.map(plan => (
                                <div key={plan.id} className="border rounded-xl p-4 hover:border-purple-300">
                                    <h3 className="font-bold">{plan.naam}</h3>
                                    <p className="text-sm text-slate-600 mb-2">{plan.omschrijving}</p>
                                    <button onClick={() => onSelect(plan)} className="w-full py-2 bg-purple-50 text-purple-700 rounded-lg font-medium">Selecteren</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- HOOFDCOMPONENT: Groeiplan ---
export default function Groeiplan() {
    const { profile } = useOutletContext();
    const [selectedStudent, setSelectedStudent] = useState(null);
    
    // State voor de verschillende soorten plannen
    const [verplichtSchema, setVerplichtSchema] = useState(null);
    const [optioneleSchemas, setOptioneleSchemas] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const isTeacherOrAdmin = profile?.rol === 'leerkracht' || profile?.rol === 'administrator';
    const currentProfile = selectedStudent || profile;

    useEffect(() => {
        if (!currentProfile) { setLoading(false); return; }

        const fetchData = async () => {
            setLoading(true);
            const profileIdentifier = currentProfile.id;

            // 1. Haal ALLE actieve schema's voor deze leerling op
            const actieveSchemasQuery = query(
                collection(db, 'leerling_schemas'), 
                where('leerling_id', '==', profileIdentifier)
            );
            const actieveSchemasSnapshot = await getDocs(actieveSchemasQuery);
            const actieveSchemas = actieveSchemasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 2. Haal de details van de schema-sjablonen op
            const schemaIds = actieveSchemas.map(s => s.schema_id);
            if (schemaIds.length > 0) {
                const schemasQuery = query(collection(db, 'trainingsschemas'), where('__name__', 'in', schemaIds));
                const schemasSnapshot = await getDocs(schemasQuery);
                const schemaDetailsMap = new Map(schemasSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }]));

                // 3. Verdeel de schema's in 'verplicht' en 'optioneel'
                const verplicht = actieveSchemas.find(s => s.type === 'verplicht');
                const optioneel = actieveSchemas.filter(s => s.type === 'optioneel');

                if (verplicht) {
                    setVerplichtSchema(schemaDetailsMap.get(verplicht.schema_id));
                }
                setOptioneleSchemas(optioneel.map(s => schemaDetailsMap.get(s.schema_id)));
            } else {
                 setVerplichtSchema(null);
                 setOptioneleSchemas([]);
            }

            // ... (Hier kan eventueel nog de logica komen om een nieuw verplicht schema voor te stellen)

            setLoading(false);
        };
        fetchData();
    }, [currentProfile]);
    
    const handleSelectTrainingPlan = async (plan) => {
        const profileIdentifier = currentProfile.id;
        try {
            await setDoc(doc(db, 'leerling_schemas', `${currentProfile.id}_${plan.id}`), {
                leerling_id: profileIdentifier,
                schema_id: plan.id,
                toegevoegd_op: serverTimestamp(),
                type: 'optioneel'
            });
            setOptionalSchemas(prev => [...prev, plan]);
            setShowModal(false);
            toast.success("Trainingsplan toegevoegd!");
        } catch (error) { toast.error("Kon plan niet toevoegen"); }
    };
    
    const handleRemoveOptionalPlan = (planId) => {
        setOptionalSchemas(prev => prev.filter(plan => plan.id !== planId));
    };
    
    const alGekozenIds = [gekoppeldSchema?.id, ...optionalSchemas.map(s => s.id)].filter(Boolean);

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="text-center"><h1 className="text-3xl font-bold">Mijn Groeiplan</h1></div>
            {isTeacherOrAdmin && <div className="bg-white p-6 rounded-2xl max-w-2xl mx-auto"><StudentSearch onStudentSelect={setSelectedStudent} schoolId={profile?.school_id} /></div>}

            {(currentProfile || !isTeacherOrAdmin) && (
                <>
                    {loading ? <p>Laden...</p> : (
                        <>
                            {gekoppeldSchema ? (
                                <FocusPuntKaart isVerplicht={true} test={focusPunt} schema={gekoppeldSchema} student={currentProfile} />
                            ) : (
                                <div className="bg-white p-8 text-center rounded-2xl max-w-2xl mx-auto"><h3 className="font-bold">Alles Ziet Er Goed Uit!</h3><p>Geen verplicht focuspunt gevonden.</p></div>
                            )}

                            {optionalSchemas.map(schema => (
                                <OptionalFocusPuntKaart key={schema.id} schema={schema} student={currentProfile} onRemove={handleRemoveOptionalPlan} isTeacherOrAdmin={isTeacherOrAdmin} />
                            ))}

                            {!isTeacherOrAdmin && (
                                <div className="text-center"><button onClick={() => setShowModal(true)} className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-xl"><Plus size={20} className="mr-2" />Voeg Trainingsplan Toe</button></div>
                            )}
                        </>
                    )}
                </>
            )}

            <TrainingsplanModal isOpen={showModal} onClose={() => setShowModal(false)} onSelect={handleSelectTrainingPlan} alGekozenIds={alGekozenIds} />
        </div>
    );
}