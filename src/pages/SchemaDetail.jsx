// src/pages/SchemaDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
    const isCurrentUser = profile?.id === leerlingProfiel?.id;

    useEffect(() => {
        if (!profile || !schemaId) return;

        const fetchData = async () => {
            setLoading(true);
            
            const firstUnderscoreIndex = schemaId.indexOf('_');
            const leerlingId = schemaId.substring(0, firstUnderscoreIndex);
            const schemaTemplateId = schemaId.substring(firstUnderscoreIndex + 1);

            try {
                const [leerlingSnap, schemaDetailsSnap, actiefSchemaSnap] = await Promise.all([
                    getDoc(doc(db, 'users', leerlingId)),
                    getDoc(doc(db, 'trainingsschemas', schemaTemplateId)),
                    getDoc(doc(db, 'leerling_schemas', schemaId))
                ]);

                if (leerlingSnap.exists()) setLeerlingProfiel({ id: leerlingSnap.id, ...leerlingSnap.data() });
                if (schemaDetailsSnap.exists()) setSchemaDetails({ id: schemaDetailsSnap.id, ...schemaDetailsSnap.data() });
                if (actiefSchemaSnap.exists()) setActiefSchema({ id: actiefSchemaSnap.id, ...actiefSchemaSnap.data() });

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
                    status: 'wacht_op_validatie',
                    ingevuld_door: profile.naam || profile.email
                }
            };
            await updateDoc(doc(db, 'leerling_schemas', schemaId), { voltooide_taken: updatedVoltooide });
            setActiefSchema(prev => ({ ...prev, voltooide_taken: updatedVoltooide }));
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
                    status: isGevalideerd ? 'gevalideerd' : 'afgewezen',
                    gevalideerd_door: profile.naam || profile.email,
                    gevalideerd_op: serverTimestamp()
                }
            };
            await updateDoc(doc(db, 'leerling_schemas', schemaId), { voltooide_taken: updatedVoltooide });
            setActiefSchema(prev => ({ ...prev, voltooide_taken: updatedVoltooide }));
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
    
    if (!profile) return <div className="text-center p-12">Authenticatie controleren...</div>;

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
        const studentName = isTeacherOrAdmin ? (leerlingProfiel?.naam || 'De leerling') : 'Je';
        return (
            <div className="max-w-2xl mx-auto px-4 py-8 text-center bg-white rounded-2xl shadow-sm">
                <Link to="/groeiplan" className="inline-flex items-center text-gray-600 hover:text-purple-700 mb-6 group"><ArrowLeftIcon className="h-5 w-5 mr-2" />Terug</Link>
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><PlayIcon className="w-8 h-8 text-slate-500" /></div>
                <h2 className="text-xl font-bold text-slate-800">Schema nog niet gestart</h2>
                <p className="text-slate-600 mt-2">{studentName} is nog niet begonnen aan "{schemaDetails.naam}".</p>
            </div>
        );
    }
    
    const progressStats = getProgressStats();
    const isVolledig = progressStats.completed === progressStats.total;

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="mb-6"><Link to="/groeiplan" className="inline-flex items-center text-gray-600 hover:text-purple-700 group"><ArrowLeftIcon className="h-5 w-5 mr-2" />Terug</Link></div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
                 <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div className="mb-4 lg:mb-0">
                        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">{schemaDetails.naam}</h1>
                        <p className="text-slate-600">{isTeacherOrAdmin ? `Voortgang van ${leerlingProfiel?.naam}` : 'Jouw training'} - Week {actiefSchema.huidige_week}</p>
                    </div>
                    <div className="flex items-center space-x-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4">
                        <div className="text-center"><div className="text-2xl font-bold text-purple-600">{progressStats.percentage}%</div><div className="text-sm text-slate-600">Voltooid</div></div>
                        <div className="text-center"><div className="flex items-center text-2xl font-bold text-yellow-600"><StarIcon className="h-6 w-6 mr-1" />{progressStats.badges}</div><div className="text-sm text-slate-600">Badges</div></div>
                        <div className="text-center"><div className="text-2xl font-bold text-green-600">{progressStats.completed}/{progressStats.total}</div><div className="text-sm text-slate-600">Taken</div></div>
                    </div>
                </div>
                <div className="mt-6"><div className="bg-slate-200 rounded-full h-3 overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-500 to-blue-500" style={{ width: `${progressStats.percentage}%` }}></div></div></div>
            </div>
             {isVolledig && ( <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 mb-8"> {/* ... Volledigheids indicator ... */} </div> )}
            {isCurrentUser && !isTeacherOrAdmin && ( <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6 mb-8"> {/* ... Instructies voor leerlingen ... */} </div> )}
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

function WeekCard({ week, actiefSchema, onTaakVoltooien, onValidatieTaak, isCurrentUser, isTeacherOrAdmin }) {
    const isCurrentWeek = week.week_nummer === actiefSchema.huidige_week;
    const weekTaken = week.taken || [];
    const completedTasks = weekTaken.filter((_, index) => actiefSchema.voltooide_taken?.[`week${week.week_nummer}_taak${index}`]?.status === 'gevalideerd').length;
    
    return (
        <div className={`bg-white rounded-2xl shadow-sm border-2 p-6 ${isCurrentWeek ? 'border-purple-300' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${isCurrentWeek ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}`}> {week.week_nummer} </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Week {week.week_nummer} {isCurrentWeek && <span className="ml-3 text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">Huidige week</span>}</h3>
                        <p className="text-slate-600 mt-1">{week.doel_van_de_week}</p>
                    </div>
                </div>
                <div className="text-right"><div className="text-lg font-bold text-slate-800">{completedTasks}/{weekTaken.length}</div><div className="text-sm text-slate-600">taken voltooid</div></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {weekTaken.map((taak, index) => (
                    <TaakCard 
                        key={index}
                        taak={taak}
                        weekNummer={week.week_nummer}
                        taakIndex={index}
                        actiefSchema={actiefSchema}
                        onTaakVoltooien={onTaakVoltooien}
                        onValidatieTaak={onValidatieTaak}
                        isCurrentUser={isCurrentUser}
                        isTeacherOrAdmin={isTeacherOrAdmin}
                    />
                ))}
            </div>
        </div>
    );
}

function TaakCard({ taak, weekNummer, taakIndex, actiefSchema, onTaakVoltooien, onValidatieTaak, isCurrentUser, isTeacherOrAdmin }) {
    const [showForm, setShowForm] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [oefeningDetails, setOefeningDetails] = useState(null);
    const [loadingOefening, setLoadingOefening] = useState(false);
    const [formData, setFormData] = useState({ datum: new Date().toISOString().split('T')[0], ervaring: '' });

    useEffect(() => {
        const fetchOefeningDetails = async () => {
            if (!showInstructions || !taak.oefening_id || oefeningDetails) return;
            setLoadingOefening(true);
            try {
                const oefeningSnap = await getDoc(doc(db, 'oefeningen', taak.oefening_id));
                if (oefeningSnap.exists()) setOefeningDetails({ id: oefeningSnap.id, ...oefeningSnap.data() });
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
    
    return (
        <div className={`relative rounded-2xl border-2 p-6 transition-all duration-300 ${status === 'gevalideerd' ? 'bg-green-50 border-green-200' : status === 'wacht_op_validatie' ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-slate-200'}`}>
            {status === 'gevalideerd' && <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-2"><StarIcon className="h-5 w-5 text-white" /></div>}
            <div className="mb-4">
                <h4 className="font-bold text-slate-800 text-lg mb-2">{taak.dag}: {taak.omschrijving}</h4>
                <div className="flex items-center space-x-2 mb-3">
                    {/* Status badge logic */}
                </div>
            </div>

            {taak.oefening_id && <button onClick={() => setShowInstructions(!showInstructions)} className="flex items-center text-purple-600 text-sm mb-4"><InformationCircleIcon className="h-4 w-4 mr-1" />{showInstructions ? 'Verberg' : 'Toon'} instructies</button>}
            
            {showInstructions && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                    {/* Instructions panel JSX */}
                </div>
            )}
            
            {taakData && (
                <div className="bg-white/70 rounded-xl p-4 space-y-2 text-sm">
                    {/* Task completion info JSX */}
                </div>
            )}
            
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200">
                 {isCurrentUser && !isTeacherOrAdmin && status === 'niet_gestart' && <button onClick={() => setShowForm(true)} className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-xl font-medium">Markeer als voltooid</button>}
                 {isTeacherOrAdmin && status === 'wacht_op_validatie' && (
                     <div className="flex items-center space-x-2">
                        <button onClick={() => onValidatieTaak(weekNummer, taakIndex, true)} className="px-3 py-2 bg-green-100 text-green-700 rounded-xl text-sm">Valideer</button>
                        <button onClick={() => onValidatieTaak(weekNummer, taakIndex, false)} className="px-3 py-2 bg-red-100 text-red-700 rounded-xl text-sm">Afwijzen</button>
                    </div>
                 )}
                 {isTeacherOrAdmin && status === 'gevalideerd' && <div className="text-sm font-medium text-green-600">Gevalideerd</div>}
            </div>
            
            {showForm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Formulier JSX */}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}