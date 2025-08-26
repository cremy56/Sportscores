// src/pages/Groeiplan.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import FocusPuntKaart from '../components/groeiplan/FocusPuntKaart';
import StudentSearch from '../components/StudentSearch';
import ConfirmModal from '../components/ConfirmModal';

// --- SUB-COMPONENT: Kaart voor optionele, zelfgekozen schema's ---
const OptionalFocusPuntKaart = ({ schema, student, onRemove, isTeacherOrAdmin }) => {
    const navigate = useNavigate();
    // Voor nieuwe schema's starten we met false, voor bestaande checken we
    const [schemaExists, setSchemaExists] = useState(!schema.isNew);
    const [loading, setLoading] = useState(!schema.isNew); // Geen loading voor nieuwe schemas
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const studentIdentifier = student?.id;
    const schemaInstanceId = `${studentIdentifier}_${schema.id}`;

    useEffect(() => {
        // Skip de check als dit een nieuw schema is
        if (schema.isNew) {
            setLoading(false);
            return;
        }
        
        const checkSchemaExists = async () => {
            if (!isTeacherOrAdmin && studentIdentifier) {
                const actiefSchemaRef = doc(db, 'leerling_schemas', schemaInstanceId);
                const docSnap = await getDoc(actiefSchemaRef);
                setSchemaExists(docSnap.exists());
            }
            setLoading(false);
        };
        checkSchemaExists();
    }, [schemaInstanceId, isTeacherOrAdmin, studentIdentifier, schema.isNew]);

    const handleStartOrContinue = async () => {
        if (!schemaExists) {
            const actiefSchemaRef = doc(db, 'leerling_schemas', schemaInstanceId);
            try {
                // Controleer eerst of het document al bestaat (kan zijn dat het net aangemaakt is)
                const existingDoc = await getDoc(actiefSchemaRef);
                
                if (!existingDoc.exists()) {
                    await setDoc(actiefSchemaRef, {
                        leerling_id: studentIdentifier,
                        schema_id: schema.id,
                        start_datum: serverTimestamp(),
                        huidige_week: 1,
                        voltooide_taken: {},
                        type: 'optioneel'
                    });
                    toast.success("Optioneel schema gestart!");
                }
                
                setSchemaExists(true); // Update state zodat knoptekst verandert
            } catch (error) { 
                toast.error("Kon schema niet starten."); 
                return; // Stop hier als er een error is
            }
        }
        navigate(`/groeiplan/${schemaInstanceId}`);
    };
    
    const handleConfirmRemove = async () => {
        try {
            const optioneelSchemaRef = doc(db, 'leerling_optionele_schemas', `${studentIdentifier}_${schema.id}`);
            await deleteDoc(optioneelSchemaRef).catch(() => {});

            if (schemaExists) {
                await deleteDoc(doc(db, 'leerling_schemas', schemaInstanceId));
            }
            onRemove(schema.id);
            toast.success("Trainingsplan verwijderd.");
        } catch (error) { 
            toast.error("Kon plan niet verwijderen."); 
            console.error("Fout bij verwijderen:", error);
        }
        setIsConfirmOpen(false);
    };

    return (
        <>
            <div className="bg-white rounded-2xl shadow-md border-2 border-blue-200 p-8 max-w-2xl mx-auto relative">
                <div className="absolute -top-3 left-6">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                        💪 Zelfgekozen
                    </span>
                </div>
                {!isTeacherOrAdmin && (
                    <button 
                        onClick={() => setIsConfirmOpen(true)} 
                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg flex items-center justify-center"
                    >
                        <X size={16} />
                    </button>
                )}
                <div className="text-center pt-4">
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">{schema.naam}</h2>
                    <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 mt-6">
                        <p className="text-sm text-blue-600 mb-4">{schema.omschrijving}</p>
                        <div className="flex justify-between items-center text-sm font-medium text-blue-700">
                            <span>Duur: {schema.duur_weken} weken</span>
                            <span>Categorie: {schema.categorie}</span>
                        </div>
                    </div>
                    <div className="text-center mt-8">
                        {isTeacherOrAdmin ? (
                            <button 
                                onClick={() => navigate(`/groeiplan/${schemaInstanceId}`)}
                                className="px-8 py-3 bg-slate-600 text-white rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 font-medium"
                            >
                                Bekijk Voortgang
                            </button>
                        ) : loading ? (
                            <div className="px-8 py-3 bg-gray-300 text-gray-500 rounded-xl font-medium cursor-not-allowed">
                                Laden...
                            </div>
                        ) : (
                            <button 
                                onClick={handleStartOrContinue} 
                                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 font-medium"
                            >
                                {schemaExists ? `Ga verder met je ${schema.duur_weken}-wekenplan` : `Start je ${schema.duur_weken}-wekenplan`}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmRemove}
                title="Plan Verwijderen"
            >
                Weet je zeker dat je het plan "<strong>{schema.naam}</strong>" wilt verwijderen? 
                Deze actie kan niet ongedaan worden gemaakt.
            </ConfirmModal>
        </>
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
                <div className="border-b p-6">
                    <h2 className="text-2xl font-bold">Kies een Trainingsplan</h2>
                </div>
                <div className="p-6 overflow-y-auto">
                    <input 
                        type="text" 
                        placeholder="Zoek..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full px-4 py-3 border rounded-xl mb-4" 
                    />
                    <div className="flex flex-wrap gap-2 mb-6">
                        {categories.map(cat => (
                            <button 
                                key={cat} 
                                onClick={() => setSelectedCategory(cat)} 
                                className={`px-4 py-2 rounded-full text-sm font-medium ${
                                    selectedCategory === cat ? 'bg-purple-100 text-purple-700' : 'bg-slate-100'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                    {loading ? (
                        <p>Laden...</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {gefilterdePlannen.map(plan => (
                                <div key={plan.id} className="border rounded-xl p-4 hover:border-purple-300">
                                    <h3 className="font-bold">{plan.naam}</h3>
                                    <p className="text-sm text-slate-600 mb-2">{plan.omschrijving}</p>
                                    <button 
                                        onClick={() => onSelect(plan)} 
                                        className="w-full py-2 bg-purple-50 text-purple-700 rounded-lg font-medium"
                                    >
                                        Selecteren
                                    </button>
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
    
    const [verplichtSchema, setVerplichtSchema] = useState(null);
    const [focusPunt, setFocusPunt] = useState(null);
    const [optioneleSchemas, setOptioneleSchemas] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const isTeacherOrAdmin = profile?.rol === 'leerkracht' || profile?.rol === 'administrator';
    const currentProfile = selectedStudent || profile;

    useEffect(() => {
        if (!currentProfile?.id) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            const profileIdentifier = currentProfile.id;

            // Reset states
            setVerplichtSchema(null);
            setFocusPunt(null);
            setOptioneleSchemas([]);

            // 1. Haal ALLE actieve schema's op
            const actieveSchemasQuery = query(collection(db, 'leerling_schemas'), where('leerling_id', '==', profileIdentifier));
            const actieveSchemasSnapshot = await getDocs(actieveSchemasQuery);
            const actieveSchemasData = actieveSchemasSnapshot.docs.map(doc => ({...doc.data(), instanceId: doc.id }));
            
            const verplichtActief = actieveSchemasData.find(s => s.type !== 'optioneel');
            const optioneleSchemaInstanties = actieveSchemasData.filter(s => s.type === 'optioneel');
            
            // 2. Als er al een verplicht schema actief is, haal de details op
            if (verplichtActief) {
                const schemaSnap = await getDoc(doc(db, 'trainingsschemas', verplichtActief.schema_id));
                if (schemaSnap.exists()) setVerplichtSchema({ id: schemaSnap.id, ...schemaSnap.data() });
                
                if (schemaSnap.data().gekoppelde_test_id) {
                    const testSnap = await getDoc(doc(db, 'testen', schemaSnap.data().gekoppelde_test_id));
                    if (testSnap.exists()) setFocusPunt({ test_id: testSnap.id, ...testSnap.data() });
                }
            } else {
                // 3. Analyse om een verplicht schema voor te stellen
                const scoresQuery = query(collection(db, 'scores'), where('leerling_id', '==', profileIdentifier));
                const scoresSnapshot = await getDocs(scoresQuery);
                const scoresMetPunt = scoresSnapshot.docs.map(d => d.data()).filter(s => s.rapportpunt != null);
                
                if (scoresMetPunt.length > 0) {
                    const zwaksteScore = scoresMetPunt.sort((a,b) => a.rapportpunt - b.rapportpunt)[0];
                    if (zwaksteScore.rapportpunt <= 10) {
                        const testSnap = await getDoc(doc(db, 'testen', zwaksteScore.test_id));
                        if(testSnap.exists()) {
                            setFocusPunt({ test_id: testSnap.id, ...testSnap.data() });
                            const schemaQuery = query(collection(db, 'trainingsschemas'), where('gekoppelde_test_id', '==', zwaksteScore.test_id));
                            const schemaSnapshot = await getDocs(schemaQuery);
                            if (!schemaSnapshot.empty) {
                                setVerplichtSchema({ id: schemaSnapshot.docs[0].id, ...schemaSnapshot.docs[0].data() });
                            }
                        }
                    }
                }
            }

            // 4. Haal de details van de optionele schema's op
            if (optioneleSchemaInstanties.length > 0) {
                const schemaIds = optioneleSchemaInstanties.map(s => s.schema_id);
                if (schemaIds.length > 0) {
                    const schemasQuery = query(collection(db, 'trainingsschemas'), where('__name__', 'in', schemaIds));
                    const schemasSnapshot = await getDocs(schemasQuery);
                    setOptioneleSchemas(schemasSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
                }
            }

            setLoading(false);
        };
        fetchData();
    }, [currentProfile]);
    
    const handleSelectTrainingPlan = async (plan) => {
        const profileIdentifier = currentProfile.id;
        try {
            await setDoc(doc(db, 'leerling_schemas', `${profileIdentifier}_${plan.id}`), {
                leerling_id: profileIdentifier,
                schema_id: plan.id,
                start_datum: serverTimestamp(),
                huidige_week: 1,
                voltooide_taken: {},
                type: 'optioneel'
            });
            // Voeg een "isNew" flag toe zodat de component weet dat dit net toegevoegd is
            setOptioneleSchemas(prev => [...prev, { ...plan, isNew: true }]);
            setShowModal(false);
            toast.success("Trainingsplan toegevoegd!");
        } catch (error) { 
            toast.error("Kon plan niet toevoegen"); 
            console.error(error);
        }
    };
    
    const handleRemoveOptionalPlan = (planId) => {
        setOptioneleSchemas(prev => prev.filter(plan => plan.id !== planId));
    };
    
    const alGekozenIds = [verplichtSchema?.id, ...optioneleSchemas.map(s => s.id)].filter(Boolean);

    return (
        <div className="max-w-7xl mx-auto px-4 pt-8 pb-6 lg:px-8 lg:pt-12 lg:pb-8">
            <div className="flex justify-between items-center mb-12">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                    {isTeacherOrAdmin && selectedStudent ? `Trainingsschema's: ${selectedStudent.naam}` : 'Mijn Groeiplan'}
                </h1>
                {!isTeacherOrAdmin && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105"
                    >
                        <Plus size={20} />
                        <span className="ml-2 hidden sm:block">Voeg Trainingsplan Toe</span>
                    </button>
                )}
            </div>

            <div className="max-w-2xl mx-auto space-y-8">
                {isTeacherOrAdmin && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border">
                        <StudentSearch onStudentSelect={setSelectedStudent} schoolId={profile?.school_id} />
                    </div>
                )}

                {/* Leerkracht/Admin zonder geselecteerde student */}
                {isTeacherOrAdmin && !selectedStudent ? (
                    <div className="bg-white rounded-2xl p-8 text-center max-w-2xl mx-auto">
                        <div className="mb-6">
                            <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Selecteer een leerling</h3>
                        <p className="text-slate-600">Gebruik de zoekbalk hierboven om de evolutie van een leerling te bekijken.</p>
                        <p className="text-sm text-slate-500 mt-2">Typ minimaal 2 karakters om te zoeken</p>
                    </div>
                ) : (currentProfile || !isTeacherOrAdmin) && (
                    <>
                        {loading ? (
                            <div className="text-center p-8">Groeiplan laden...</div>
                        ) : (
                            <>
                                {verplichtSchema && focusPunt ? (
                                    <FocusPuntKaart 
                                        isVerplicht={true}
                                        test={{...focusPunt, test_naam: focusPunt.naam}} 
                                        schema={verplichtSchema} 
                                        student={currentProfile} 
                                    />
                                ) : (
                                    <div className="bg-white p-8 text-center rounded-2xl shadow-sm border">
                                        <h3 className="font-bold">Alles Ziet Er Goed Uit!</h3>
                                        <p>Geen verplicht focuspunt gevonden voor {currentProfile?.naam}.</p>
                                    </div>
                                )}

                                {optioneleSchemas.map(schema => (
                                    <OptionalFocusPuntKaart 
                                        key={schema.id} 
                                        schema={schema} 
                                        student={currentProfile} 
                                        onRemove={handleRemoveOptionalPlan} 
                                        isTeacherOrAdmin={isTeacherOrAdmin} 
                                    />
                                ))}
                            </>
                        )}
                    </>
                )}
            </div>

            <TrainingsplanModal 
                isOpen={showModal} 
                onClose={() => setShowModal(false)} 
                onSelect={handleSelectTrainingPlan} 
                alGekozenIds={alGekozenIds} 
            />
        </div>
    );
}