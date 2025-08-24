// src/pages/SchemaDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore'; // serverTimestamp toegevoegd
import { ArrowLeftIcon, PlayIcon, CheckCircleIcon, ClockIcon, CameraIcon, StarIcon, TrophyIcon, FireIcon, SparklesIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

export default function SchemaDetail() {
    const { schemaId } = useParams();
    const { profile } = useOutletContext();
    const [actiefSchema, setActiefSchema] = useState(null);
    const [schemaDetails, setSchemaDetails] = useState(null);
    const [leerlingProfiel, setLeerlingProfiel] = useState(null);
    const [loading, setLoading] = useState(true);

    const isTeacherOrAdmin = profile?.rol === 'leerkracht' || profile?.rol === 'administrator';
    const isCurrentUser = profile?.id === leerlingProfiel?.id || profile?.email === leerlingProfiel?.id;

    useEffect(() => {
        const fetchData = async () => {
            if (!profile || !schemaId) {
                return;
            }

            setLoading(true);
            
            const firstUnderscoreIndex = schemaId.indexOf('_');
            const actualLeerlingId = schemaId.substring(0, firstUnderscoreIndex);
            const actualSchemaTemplateId = schemaId.substring(firstUnderscoreIndex + 1);

            const leerlingRef = doc(db, 'users', actualLeerlingId);
            const schemaDetailsRef = doc(db, 'trainingsschemas', actualSchemaTemplateId);
            const actiefSchemaRef = doc(db, 'leerling_schemas', schemaId);

            try {
                const [leerlingSnap, schemaDetailsSnap, actiefSchemaSnap] = await Promise.all([
                    getDoc(leerlingRef),
                    getDoc(schemaDetailsRef),
                    getDoc(actiefSchemaRef)
                ]);

                if (leerlingSnap.exists()) {
                    setLeerlingProfiel({ id: leerlingSnap.id, ...leerlingSnap.data() });
                }

                if (schemaDetailsSnap.exists()) {
                    setSchemaDetails({ id: schemaDetailsSnap.id, ...schemaDetailsSnap.data() });
                }

                if (actiefSchemaSnap.exists()) {
                    setActiefSchema({ id: actiefSchemaSnap.id, ...actiefSchemaSnap.data() });
                }

            } catch (error) {
                console.error("Fout bij ophalen schema data:", error);
                toast.error("Kon de schema gegevens niet laden.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [profile, schemaId]);
    
    const handleTaakVoltooien = async (weekNummer, taakIndex, ervaringData) => {
        if (!actiefSchema || !isCurrentUser) return;

        try {
            const taakId = `week${weekNummer}_taak${taakIndex}`;
            const updatedVoltooide = {
                ...actiefSchema.voltooide_taken,
                [taakId]: {
                    voltooid_op: ervaringData.datum,
                    ervaring: ervaringData.ervaring,
                    status: 'wacht_op_validatie', // <-- Gebruik status
                    ingevuld_door: profile.naam || profile.email
                }
            };

            const actiefSchemaRef = doc(db, 'leerling_schemas', schemaId);
            await updateDoc(actiefSchemaRef, {
                voltooide_taken: updatedVoltooide
            });

            setActiefSchema(prev => ({
                ...prev,
                voltooide_taken: updatedVoltooide
            }));

            toast.success("🎯 Taak ingevuld! Wacht op validatie.", { duration: 4000 });
        } catch (error) {
            console.error("Fout bij voltooien taak:", error);
            toast.error("Kon de taak niet markeren als voltooid.");
        }
    };
    
    const handleValidatieTaak = async (weekNummer, taakIndex, isGevalideerd) => {
        if (!actiefSchema || !isTeacherOrAdmin) return;

        try {
            const taakId = `week${weekNummer}_taak${taakIndex}`;
            const updatedVoltooide = {
                ...actiefSchema.voltooide_taken,
                [taakId]: {
                    ...actiefSchema.voltooide_taken[taakId],
                    status: isGevalideerd ? 'gevalideerd' : 'afgewezen', // <-- Gebruik status
                    gevalideerd_door: profile.naam || profile.email,
                    gevalideerd_op: serverTimestamp() // <-- Gebruik serverTimestamp
                }
            };

            const actiefSchemaRef = doc(db, 'leerling_schemas', schemaId);
            await updateDoc(actiefSchemaRef, {
                voltooide_taken: updatedVoltooide
            });

            setActiefSchema(prev => ({
                ...prev,
                voltooide_taken: updatedVoltooide
            }));

            if (isGevalideerd) {
                await geefTrainingsbadge(taakId);
                toast.success("🏆 Taak gevalideerd! Badge toegekend!", { duration: 5000 });
            } else {
                toast.success("Validatie bijgewerkt.");
            }
        } catch (error) {
            console.error("Fout bij valideren taak:", error);
            toast.error("Kon de taak niet valideren.");
        }
    };

    const geefTrainingsbadge = async (taakId) => {
        // Implementatie badge toekenning...
    };

    const getProgressStats = () => {
        if (!actiefSchema || !schemaDetails) return { completed: 0, total: 0, percentage: 0, badges: 0 };
        
        const totaleTaken = schemaDetails.weken.reduce((total, week) => total + week.taken.length, 0);
        const gevalideerdeTaken = Object.values(actiefSchema.voltooide_taken || {}).filter(taak => taak.status === 'gevalideerd').length;
            
        return {
            completed: gevalideerdeTaken,
            total: totaleTaken,
            percentage: totaleTaken > 0 ? Math.round((gevalideerdeTaken / totaleTaken) * 100) : 0,
            badges: gevalideerdeTaken
        };
    };

    if (!profile) {
        return <div className="text-center p-12">Authenticatie controleren...</div>;
    }

    if (loading) {
        return (
            <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (!schemaDetails) {
        return <div className="text-center p-12">Schema details niet gevonden.</div>
    }

    if (!actiefSchema) {
        // Weergave voor "nog niet gestart"
        return (
            <div className="max-w-2xl mx-auto px-4 py-8 text-center bg-white rounded-2xl shadow-sm">
                <Link to="/groeiplan" className="inline-flex items-center text-gray-600 hover:text-purple-700 mb-6 group">
                    <ArrowLeftIcon className="h-5 w-5 mr-2" />
                    Terug naar overzicht
                </Link>
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <PlayIcon className="w-8 h-8 text-slate-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Schema nog niet gestart</h2>
                <p className="text-slate-600 mt-2">
                    {isTeacherOrAdmin ? `${leerlingProfiel?.naam || 'De leerling'}` : 'Je'} is nog niet begonnen aan "{schemaDetails.naam}".
                </p>
            </div>
        );
    }
    
    const progressStats = getProgressStats();
    const isVolledig = progressStats.completed === progressStats.total;

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header, progress bar, etc. */}
            <div className="mb-6">
                <Link to="/groeiplan" className="inline-flex items-center text-gray-600 hover:text-purple-700 group">
                    <ArrowLeftIcon className="h-5 w-5 mr-2" />
                    Terug naar overzicht
                </Link>
            </div>
            {/* ... (Voeg hier de header en progress bar JSX in van je vorige versie) ... */}

            {/* Weken overzicht */}
            <div className="space-y-8">
                {schemaDetails.weken.map((week) => (
                    <WeekCard 
                        key={week.week_nummer}
                        week={week}
                        actiefSchema={actiefSchema}
                        onTaakVoltooien={handleTaakVoltooien}
                        onValidatieTaak={handleValidatieTaak}
                        isCurrentUser={isCurrentUser}
                        isTeacherOrAdmin={isTeacherOrAdmin}
                    />
                ))}
            </div>
        </div>
    );
}


// --- SUB-COMPONENTEN ---

function WeekCard({ week, actiefSchema, onTaakVoltooien, onValidatieTaak, isCurrentUser, isTeacherOrAdmin }) {
    const isCurrentWeek = week.week_nummer === actiefSchema.huidige_week;
    // ... (rest van de WeekCard JSX, ongewijzigd)
}

function TaakCard({ taak, weekNummer, taakIndex, actiefSchema, onTaakVoltooien, onValidatieTaak, isCurrentUser, isTeacherOrAdmin }) {
    const [showForm, setShowForm] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [oefeningDetails, setOefeningDetails] = useState(null);
    const [loadingOefening, setLoadingOefening] = useState(false);
    const [formData, setFormData] = useState({
        datum: new Date().toISOString().split('T')[0],
        ervaring: ''
    });

    useEffect(() => {
        if (!showInstructions || !taak.oefening_id || oefeningDetails) return;
        
        const fetchOefeningDetails = async () => {
            setLoadingOefening(true);
            try {
                const oefeningRef = doc(db, 'oefeningen', taak.oefening_id);
                const oefeningSnap = await getDoc(oefeningRef);
                if (oefeningSnap.exists()) {
                    setOefeningDetails({ id: oefeningSnap.id, ...oefeningSnap.data() });
                }
            } catch (error) { console.error("Fout bij ophalen oefening:", error); }
            finally { setLoadingOefening(false); }
        };
        fetchOefeningDetails();
    }, [showInstructions, taak.oefening_id, oefeningDetails]);
    
    const taakId = `week${weekNummer}_taak${taakIndex}`;
    const taakData = actiefSchema.voltooide_taken?.[taakId];
    const status = taakData?.status || 'niet_gestart';

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.ervaring.trim()) {
            onTaakVoltooien(weekNummer, taakIndex, formData);
            setShowForm(false);
        } else {
            toast.error("Vul je ervaring in.");
        }
    };
    
    // --- START CORRECTION: Removed duplicated JSX blocks ---
    return (
        <div className={`relative rounded-2xl border-2 p-6 transition-all duration-300 ${
            status === 'gevalideerd' ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' : 
            status === 'wacht_op_validatie' ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200' : 
            'bg-white border-slate-200 hover:border-purple-200'
        }`}>
            {status === 'gevalideerd' && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-2 shadow-lg">
                    <StarIcon className="h-5 w-5 text-white" />
                </div>
            )}
            <div className="mb-4">
                <h4 className="font-bold text-slate-800 text-lg mb-2">{taak.dag}: {taak.omschrijving}</h4>
                {/* Status badge */}
                {/* ... (Status badge JSX) ... */}
            </div>
            {taak.oefening_id && (
                <button 
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="flex items-center text-purple-600 hover:text-purple-700 font-medium text-sm mb-4"
                >
                    <InformationCircleIcon className="h-4 w-4 mr-1" />
                    {showInstructions ? 'Verberg instructies' : 'Toon instructies'}
                </button>
            )}
            {showInstructions && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                    {/* ... (Instructions panel JSX, ongewijzigd) ... */}
                </div>
            )}
            {taakData && (
                 <div className="bg-white/70 rounded-xl p-4 space-y-2 text-sm">
                     {/* ... (Task completion info JSX, ongewijzigd) ... */}
                 </div>
            )}
            {/* Action buttons */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200">
                {/* ... (Action buttons JSX, ongewijzigd) ... */}
            </div>
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                     {/* ... (Form JSX, ongewijzigd) ... */}
                </div>
            )}
        </div>
    );
     // --- END CORRECTION ---
}