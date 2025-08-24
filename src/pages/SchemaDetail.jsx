// src/pages/SchemaDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc } from 'firebase/firestore';
import { ArrowLeftIcon, PlayIcon, CheckCircleIcon, ClockIcon, CameraIcon, StarIcon, TrophyIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

export default function SchemaDetail() {
    const { schemaId } = useParams();
    const { profile } = useOutletContext();
    const [actiefSchema, setActiefSchema] = useState(null);
    const [schemaDetails, setSchemaDetails] = useState(null);
    const [leerlingProfiel, setLeerlingProfiel] = useState(null);
    const [loading, setLoading] = useState(true);

    const isTeacherOrAdmin = profile?.rol === 'leerkracht' || profile?.rol === 'administrator';
    const isCurrentUser = profile?.id === leerlingProfiel?.id || profile?.email === leerlingProfiel?.email;

    useEffect(() => {
        const fetchData = async () => {
            if (!profile || !schemaId) {
                console.log("Wachten op profiel en schemaId...");
                return;
            }

            setLoading(true);
            
            const [leerlingId, schemaTemplateId] = schemaId.split('_');
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

                // Zoek leerling data
                if (leerlingSnap.exists()) {
                    setLeerlingProfiel(leerlingSnap.data());
                } else {
                    // Fallback zoeken in verschillende collecties
                    const toegestaneQuery = query(
                        collection(db, 'toegestane_gebruikers'),
                        where('email', '==', actualLeerlingId)
                    );
                    const toegestaneSnapshot = await getDocs(toegestaneQuery);
                    
                    if (!toegestaneSnapshot.empty) {
                        setLeerlingProfiel(toegestaneSnapshot.docs[0].data());
                    } else {
                        const toegestaneRef = doc(db, 'toegestane_gebruikers', actualLeerlingId);
                        const toegestaneSnap = await getDoc(toegestaneRef);
                        if (toegestaneSnap.exists()) {
                            setLeerlingProfiel(toegestaneSnap.data());
                        }
                    }
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
                    gevalideerd: false,
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

            toast.success("Taak gemarkeerd als voltooid! Wacht op validatie van je leerkracht.");
        } catch (error) {
            console.error("Fout bij voltooien taak:", error);
            toast.error("Kon de taak niet markeren als voltooid.");
        }
    };

    const handleValidatieTaak = async (weekNummer, taakIndex, gevalideerd) => {
        if (!actiefSchema || !isTeacherOrAdmin) return;

        try {
            const taakId = `week${weekNummer}_taak${taakIndex}`;
            const updatedVoltooide = {
                ...actiefSchema.voltooide_taken,
                [taakId]: {
                    ...actiefSchema.voltooide_taken[taakId],
                    gevalideerd: gevalideerd,
                    gevalideerd_door: profile.naam || profile.email,
                    gevalideerd_op: new Date().toISOString()
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

            // Als de taak gevalideerd is, geef badge
            if (gevalideerd) {
                await geefTrainingsbadge(taakId);
                toast.success("Taak gevalideerd! Leerling ontvangt een trainingsbadge.");
            } else {
                toast.success("Validatie bijgewerkt.");
            }
        } catch (error) {
            console.error("Fout bij valideren taak:", error);
            toast.error("Kon de taak niet valideren.");
        }
    };

    const geefTrainingsbadge = async (taakId) => {
        try {
            const leerlingId = actiefSchema.leerling_id;
            const badgeId = `${schemaId}_${taakId}`;
            
            const badgeRef = doc(db, 'gebruiker_badges', badgeId);
            await setDoc(badgeRef, {
                leerling_id: leerlingId,
                badge_type: 'trainingsbadge',
                schema_id: schemaDetails.id,
                taak_id: taakId,
                behaald_op: new Date().toISOString(),
                titel: `Training Voltooid: ${schemaDetails.naam}`,
                beschrijving: `Taak succesvol voltooid in week ${taakId.split('_')[0].replace('week', '')}`
            });
        } catch (error) {
            console.error("Fout bij toekennen badge:", error);
        }
    };

    const checkVolledigheid = () => {
        if (!actiefSchema || !schemaDetails) return false;
        
        const totaleTaken = schemaDetails.weken.reduce((total, week) => 
            total + week.taken.length, 0
        );
        
        const gevalideerdeTaken = Object.values(actiefSchema.voltooide_taken || {})
            .filter(taak => taak.gevalideerd).length;
            
        return gevalideerdeTaken === totaleTaken;
    };

    if (loading) {
        return <div className="text-center p-12">Schema wordt geladen...</div>;
    }

    if (!schemaDetails) {
        return (
            <div className="text-center p-12">
                <p>Kon de details van het trainingsschema niet vinden.</p>
                <Link to="/groeiplan" className="text-purple-600 hover:text-purple-700 mt-4 inline-block">
                    Terug naar overzicht
                </Link>
            </div>
        );
    }

    // Schema nog niet gestart
    if (!actiefSchema) {
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
                    {isTeacherOrAdmin ? `${leerlingProfiel?.naam || 'De leerling'}` : 'Je'} is nog niet begonnen aan het <span className="font-semibold">"{schemaDetails.naam}"</span>.
                </p>
            </div>
        );
    }

    const isVolledig = checkVolledigheid();

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <Link to="/groeiplan" className="inline-flex items-center text-gray-600 hover:text-purple-700 mb-6 group">
                <ArrowLeftIcon className="h-5 w-5 mr-2 transition-transform group-hover:-translate-x-1" />
                Terug naar overzicht
            </Link>
            
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">{schemaDetails.naam}</h1>
                <p className="text-slate-500 mt-2">
                    Voortgang van {leerlingProfiel?.naam} - Week {actiefSchema.huidige_week} van {schemaDetails.duur_weken}
                </p>
                
                {/* Volledigheids indicator */}
                {isVolledig && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center">
                            <TrophyIcon className="h-6 w-6 text-green-600 mr-2" />
                            <div>
                                <h3 className="font-bold text-green-800">Training Voltooid! 🎉</h3>
                                <p className="text-green-700 text-sm mt-1">
                                    Alle taken zijn succesvol afgerond. Je kunt nu een nieuwe evaluatie aanvragen bij je leerkracht.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Instructies voor leerlingen */}
            {isCurrentUser && !isTeacherOrAdmin && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start">
                        <CameraIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold text-blue-800 mb-1">Belangrijk voor jouw training:</h4>
                            <p className="text-blue-700 text-sm">
                                Film jezelf tijdens het uitvoeren van de oefeningen en toon deze aan je leerkracht. 
                                Alleen dan kan je leerkracht je prestatie valideren en ontvang je een trainingsbadge!
                            </p>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Weken overzicht */}
            <div className="space-y-6">
                {schemaDetails.weken.map((week) => (
                    <WeekCard 
                        key={week.week_nummer}
                        week={week}
                        actiefSchema={actiefSchema}
                        onTaakVoltooien={handleTaakVoltooien}
                        onValidatieTaak={handleValidatieTaak}
                        isCurrentUser={isCurrentUser}
                        isTeacherOrAdmin={isTeacherOrAdmin}
                        profile={profile}
                    />
                ))}
            </div>
        </div>
    );
}

// Separate WeekCard component
function WeekCard({ week, actiefSchema, onTaakVoltooien, onValidatieTaak, isCurrentUser, isTeacherOrAdmin, profile }) {
    const isCurrentWeek = week.week_nummer === actiefSchema.huidige_week;
    
    return (
        <div className={`bg-white rounded-2xl shadow-sm border-2 p-6 ${
            isCurrentWeek ? 'border-purple-200 bg-purple-50' : 'border-slate-200'
        }`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-800">
                    Week {week.week_nummer}
                    {isCurrentWeek && <span className="ml-2 text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Huidige week</span>}
                </h3>
            </div>
            
            <p className="text-slate-600 mb-6">{week.doel_van_de_week}</p>
            
            <div className="space-y-4">
                {week.taken?.map((taak, index) => (
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
                        profile={profile}
                    />
                ))}
            </div>
        </div>
    );
}

// Separate TaakCard component
function TaakCard({ taak, weekNummer, taakIndex, actiefSchema, onTaakVoltooien, onValidatieTaak, isCurrentUser, isTeacherOrAdmin, profile }) {
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        datum: new Date().toISOString().split('T')[0],
        ervaring: ''
    });

    const taakId = `week${weekNummer}_taak${taakIndex}`;
    const taakData = actiefSchema.voltooide_taken?.[taakId];
    const isVoltooid = !!taakData;
    const isGevalideerd = taakData?.gevalideerd || false;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.ervaring.trim()) {
            onTaakVoltooien(weekNummer, taakIndex, formData);
            setShowForm(false);
            setFormData({ datum: new Date().toISOString().split('T')[0], ervaring: '' });
        } else {
            toast.error("Vul je ervaring in voordat je de taak indient.");
        }
    };

    return (
        <div className={`border rounded-lg p-4 ${
            isGevalideerd ? 'bg-green-50 border-green-200' : 
            isVoltooid ? 'bg-yellow-50 border-yellow-200' : 
            'bg-slate-50 border-slate-200'
        }`}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <p className="font-bold text-slate-800 mb-1">
                        {taak.dag}: {taak.omschrijving}
                    </p>
                    
                    {/* Status indicator */}
                    <div className="flex items-center space-x-2 text-sm">
                        {isGevalideerd ? (
                            <div className="flex items-center text-green-600">
                                <CheckCircleIcon className="h-4 w-4 mr-1" />
                                <span>Gevalideerd</span>
                                <StarIcon className="h-4 w-4 ml-2 text-yellow-500" />
                            </div>
                        ) : isVoltooid ? (
                            <div className="flex items-center text-yellow-600">
                                <ClockIcon className="h-4 w-4 mr-1" />
                                <span>Wacht op validatie</span>
                            </div>
                        ) : (
                            <span className="text-slate-500">Nog niet voltooid</span>
                        )}
                    </div>

                    {/* Taak details */}
                    {taakData && (
                        <div className="mt-2 text-xs text-slate-600 space-y-1">
                            <p><strong>Voltooid op:</strong> {new Date(taakData.voltooid_op).toLocaleDateString('nl-NL')}</p>
                            <p><strong>Ervaring:</strong> {taakData.ervaring}</p>
                            <p><strong>Door:</strong> {taakData.ingevuld_door}</p>
                            {taakData.gevalideerd_door && (
                                <p><strong>Gevalideerd door:</strong> {taakData.gevalideerd_door}</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                    {/* Leerling acties */}
                    {isCurrentUser && !isTeacherOrAdmin && !isVoltooid && (
                        <button 
                            onClick={() => setShowForm(true)}
                            className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                        >
                            Markeer als voltooid
                        </button>
                    )}

                    {/* Leerkracht validatie */}
                    {isTeacherOrAdmin && isVoltooid && (
                        <div className="flex items-center space-x-2">
                            <button 
                                onClick={() => onValidatieTaak(weekNummer, taakIndex, true)}
                                className={`px-2 py-1 rounded text-xs ${
                                    isGevalideerd 
                                        ? 'bg-green-600 text-white' 
                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                                disabled={isGevalideerd}
                            >
                                ✓ Valideer
                            </button>
                            {isVoltooid && !isGevalideerd && (
                                <button 
                                    onClick={() => onValidatieTaak(weekNummer, taakIndex, false)}
                                    className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                                >
                                    ✗ Afwijzen
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Formulier voor taak voltooien */}
            {showForm && (
                <form onSubmit={handleSubmit} className="mt-4 p-4 bg-white border border-purple-200 rounded-lg">
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Wanneer heb je deze oefening gedaan?
                            </label>
                            <input 
                                type="date"
                                value={formData.datum}
                                onChange={(e) => setFormData({...formData, datum: e.target.value})}
                                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                                max={new Date().toISOString().split('T')[0]}
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Hoe ging het? Vertel over je ervaring:
                            </label>
                            <textarea 
                                value={formData.ervaring}
                                onChange={(e) => setFormData({...formData, ervaring: e.target.value})}
                                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm h-20 resize-none"
                                placeholder="Beschrijf hoe de oefening ging, wat je moeilijk vond, wat goed ging..."
                                required
                            />
                        </div>
                        
                        <div className="flex space-x-2">
                            <button 
                                type="submit"
                                className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700"
                            >
                                Opslaan
                            </button>
                            <button 
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 bg-slate-300 text-slate-700 rounded-md text-sm hover:bg-slate-400"
                            >
                                Annuleren
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
}