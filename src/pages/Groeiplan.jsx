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
import { analyseerEvolutieData } from '../utils/analyseUtils';
import { getStudentEvolutionData } from '../utils/firebaseUtils';

// =============================================
// HELPER: Haal de smartschool_id_hash op van een profiel
// - Voor leerlingen (ingelogd): profile.smartschool_id_hash
// - Voor selectedStudent (door leerkracht): doc.id van toegestane_gebruikers
// =============================================
function getStudentHash(profile) {
    return profile?.smartschool_id_hash || profile?.id || null;
}

// =============================================
// SUB-COMPONENT: Optioneel schema kaart
// ✅ FIX: Typo opgelost (student?.emai → studentHash)
// ✅ FIX: smartschool_id_hash als identifier
// =============================================
const OptionalFocusPuntKaart = ({ schema, student, onRemove, isTeacherOrAdmin }) => {
    const navigate = useNavigate();
    const [schemaExists, setSchemaExists] = useState(!schema.isNew);
    const [loading, setLoading] = useState(!schema.isNew);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    // ✅ FIX: Typo was student?.emai (ontbrak 'l')
    // Gebruik smartschool_id_hash als universele identifier
    const studentHash = getStudentHash(student);
    const schemaInstanceId = `${studentHash}_${schema.id}`;

    useEffect(() => {
        if (schema.isNew) {
            setLoading(false);
            return;
        }

        const checkSchemaExists = async () => {
            if (!isTeacherOrAdmin && studentHash) {
                const actiefSchemaRef = doc(db, 'leerling_schemas', schemaInstanceId);
                const docSnap = await getDoc(actiefSchemaRef);
                setSchemaExists(docSnap.exists());
            }
            setLoading(false);
        };
        checkSchemaExists();
    }, [schemaInstanceId, isTeacherOrAdmin, studentHash, schema.isNew]);

    const handleStartOrContinue = async () => {
        if (!schemaExists) {
            const actiefSchemaRef = doc(db, 'leerling_schemas', schemaInstanceId);
            try {
                const existingDoc = await getDoc(actiefSchemaRef);
                if (!existingDoc.exists()) {
                    await setDoc(actiefSchemaRef, {
                        leerling_id: studentHash,    // ✅ smartschool_id_hash
                        schema_id: schema.id,
                        start_datum: serverTimestamp(),
                        huidige_week: 1,
                        voltooide_taken: {},
                        type: 'optioneel'
                    });
                    toast.success("Optioneel schema gestart!");
                }
                setSchemaExists(true);
            } catch (error) {
                toast.error("Kon schema niet starten.");
                return;
            }
        }

        sessionStorage.setItem('currentSchema', JSON.stringify({
            userId: studentHash,             // ✅ smartschool_id_hash
            schemaTemplateId: schema.id,
            timestamp: Date.now()
        }));
        navigate('/groeiplan/schema');
    };

    const handleConfirmRemove = async () => {
        try {
            const optioneelSchemaRef = doc(db, 'leerling_optionele_schemas', `${studentHash}_${schema.id}`);
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
                        Zelfgekozen
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
                                onClick={() => {
                                    sessionStorage.setItem('currentSchema', JSON.stringify({
                                        userId: studentHash,
                                        schemaTemplateId: schema.id,
                                        timestamp: Date.now()
                                    }));
                                    navigate('/groeiplan/schema');
                                }}
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
                                {schemaExists
                                    ? `Ga verder met je ${schema.duur_weken}-wekenplan`
                                    : `Start je ${schema.duur_weken}-wekenplan`}
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

// =============================================
// SUB-COMPONENT: Modal voor trainingsplan kiezen
// =============================================
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
                                className={`px-4 py-2 rounded-full text-sm font-medium ${selectedCategory === cat ? 'bg-purple-100 text-purple-700' : 'bg-slate-100'}`}
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

// =============================================
// HOOFD COMPONENT: Groeiplan
// ✅ FIX: smartschool_id_hash als universele identifier
// ✅ FIX: Debug console.logs verwijderd
// =============================================
export default function Groeiplan() {
    const { profile, selectedStudent, setSelectedStudent } = useOutletContext();

    const [verplichteFocusPunten, setVerplichteFocusPunten] = useState([]);
    const [optioneleSchemas, setOptioneleSchemas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const isTeacherOrAdmin = ['leerkracht', 'administrator', 'super-administrator'].includes(profile?.rol);
    const currentProfile = isTeacherOrAdmin ? selectedStudent : profile;

    useEffect(() => {
        if ((isTeacherOrAdmin && !selectedStudent) || !currentProfile?.id) {
            setLoading(false);
            setVerplichteFocusPunten([]);
            setOptioneleSchemas([]);
            return;
        }

        const fetchData = async () => {
            setLoading(true);

            // ✅ FIX: Gebruik smartschool_id_hash als universele identifier
            // - Voor leerlingen (ingelogd): profile.smartschool_id_hash
            // - Voor selectedStudent (leerkracht view): doc.id van toegestane_gebruikers
            const studentHash = getStudentHash(currentProfile);

            if (!studentHash) {
                setLoading(false);
                return;
            }

            // Stap 1: Haal actieve schema-instanties op
            // ✅ FIX: Alleen smartschool_id_hash gebruiken 
            const actieveSchemasQuery = query(
                collection(db, 'leerling_schemas'),
                where('leerling_id', '==', studentHash)
            );
            const actieveSchemasSnapshot = await getDocs(actieveSchemasQuery);
            const actieveSchemaMap = new Map();
            actieveSchemasSnapshot.docs.forEach(doc => {
                const data = doc.data();
                actieveSchemaMap.set(data.schema_id, data.type || 'verplicht');
            });

            // Stap 2: Bepaal verplichte focuspunten op basis van testresultaten
            // ✅ token en school_id expliciet meegeven
            const evolutionData = await getStudentEvolutionData(studentHash, profile.school_id, profile._token);
            const zwakkeTesten = analyseerEvolutieData(evolutionData);
            const verplichteFocusPuntenData = [];

            for (const testResult of zwakkeTesten) {
                const schemaQuery = query(
                    collection(db, 'trainingsschemas'),
                    where('gekoppelde_test_id', '==', testResult.test_id)
                );
                const schemaSnapshot = await getDocs(schemaQuery);

                if (!schemaSnapshot.empty) {
                    const schemaDoc = schemaSnapshot.docs[0];
                    const schemaData = { id: schemaDoc.id, ...schemaDoc.data() };

                    verplichteFocusPuntenData.push({
                        test: { ...testResult, test_naam: testResult.naam },
                        schema: schemaData,
                        isActief: actieveSchemaMap.has(schemaData.id),
                        isImproved: testResult.isImproved
                    });
                }
            }

            setVerplichteFocusPunten(verplichteFocusPuntenData);

            // Stap 3: Optionele schema's
            const optioneleSchemaIds = [];
            for (const [schemaId, type] of actieveSchemaMap.entries()) {
                if (type === 'optioneel') optioneleSchemaIds.push(schemaId);
            }

            if (optioneleSchemaIds.length > 0) {
                const schemasQuery = query(
                    collection(db, 'trainingsschemas'),
                    where('__name__', 'in', optioneleSchemaIds)
                );
                const schemasSnapshot = await getDocs(schemasQuery);
                setOptioneleSchemas(schemasSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            } else {
                setOptioneleSchemas([]);
            }

            setLoading(false);
        };

        fetchData();
    }, [currentProfile, isTeacherOrAdmin, selectedStudent]);

    // =============================================
    // Optioneel trainingsplan toevoegen
    // ✅ FIX: smartschool_id_hash als leerling_id
    // =============================================
    const handleSelectTrainingPlan = async (plan) => {
        const studentHash = getStudentHash(currentProfile);
        if (!studentHash) return toast.error('Geen student geselecteerd.');

        try {
            await setDoc(doc(db, 'leerling_schemas', `${studentHash}_${plan.id}`), {
                leerling_id: studentHash,    // ✅ smartschool_id_hash
                schema_id: plan.id,
                start_datum: serverTimestamp(),
                huidige_week: 1,
                voltooide_taken: {},
                type: 'optioneel'
            });
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

    const alGekozenIds = [
        ...verplichteFocusPunten.map(vfp => vfp.schema.id),
        ...optioneleSchemas.map(s => s.id)
    ].filter(Boolean);

    // =============================================
    // RENDER
    // =============================================
    return (
        <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 py-4 lg:px-8 space-y-4">

                <div className="mb-8 mt-20">
                    <div className="flex justify-between items-center mb-12">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                            {isTeacherOrAdmin
                                ? (selectedStudent ? `Trainingsschema's: ${selectedStudent.naam}` : 'Trainingsschema\'s')
                                : 'Mijn Groeiplan'}
                        </h1>

                        <div className="flex-shrink-0">
                            {isTeacherOrAdmin ? (
                                <div className="w-80">
                                    <StudentSearch
                                        onStudentSelect={setSelectedStudent}
                                        schoolId={profile?.school_id}
                                        token={profile?._token}
                                        initialStudent={selectedStudent}
                                    />
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105"
                                >
                                    <Plus size={20} />
                                    <span className="ml-2 hidden sm:block">Voeg Trainingsplan Toe</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="max-w-2xl mx-auto space-y-8">
                    {isTeacherOrAdmin && !selectedStudent ? (
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
                                <p className="text-xs text-slate-500">Typ voor- of achternaam</p>
                            </div>
                        </div>
                    ) : (currentProfile || !isTeacherOrAdmin) && (
                        <>
                            {loading ? (
                                <div className="text-center p-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                                </div>
                            ) : (
                                <>
                                    {verplichteFocusPunten.length > 0 ? (
                                        verplichteFocusPunten.map((focusPunt) => (
                                            <FocusPuntKaart
                                                key={focusPunt.test.test_id}
                                                isVerplicht={true}
                                                test={focusPunt.test}
                                                schema={focusPunt.schema}
                                                student={currentProfile}
                                                isActief={focusPunt.isActief}
                                                isImproved={focusPunt.isImproved}
                                            />
                                        ))
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
        </div>
    );
}