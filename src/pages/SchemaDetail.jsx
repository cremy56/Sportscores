// src/pages/SchemaDetail.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc } from 'firebase/firestore';
import { ArrowLeftIcon, PlayIcon, CheckCircleIcon, ClockIcon, CameraIcon, StarIcon, TrophyIcon, FireIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useState, useEffect, useMemo } from 'react'; // Voeg useMemo toe

export default function SchemaDetail() {
    
    const { profile } = useOutletContext();
    const getSchemaFromStorage = () => {
        const stored = sessionStorage.getItem('currentSchema');
        if (!stored) return null;
        
        const parsed = JSON.parse(stored);
        // Check if data is not too old (30 minutes)
        if (Date.now() - parsed.timestamp > 30 * 60 * 1000) {
            sessionStorage.removeItem('currentSchema');
            return null;
        }
        return parsed;
    };

    const schemaData = useMemo(() => getSchemaFromStorage(), []);
    
    // ALLE HOOKS EERST - ALTIJD IN DEZELFDE VOLGORDE
    const [actiefSchema, setActiefSchema] = useState(null);
    const [schemaDetails, setSchemaDetails] = useState(null);
    const [leerlingProfiel, setLeerlingProfiel] = useState(null);
    const [loading, setLoading] = useState(true);

    const isTeacherOrAdmin = profile?.rol === 'leerkracht' || profile?.rol === 'administrator';
    const isCurrentUser = profile?.id === leerlingProfiel?.id || profile?.email === leerlingProfiel?.email;

  useEffect(() => {
    const fetchData = async () => {
        console.log("=== FETCHDATA START ===");
        console.log("profile:", profile);
        console.log("schemaData:", schemaData);
        
        if (!profile || !schemaData) {
            console.log("Missing profile or schemaData - stopping");
            setLoading(false);
            return;
        }
        
        console.log("Starting data fetch...");
        setLoading(true);
        
        // Voeg timeout toe
        const timeoutId = setTimeout(() => {
            console.error("Fetch timeout - something is stuck");
            setLoading(false);
        }, 10000); // 10 seconden timeout
        
        try {
            const { userId, schemaTemplateId } = schemaData;
            console.log("userId:", userId);
            console.log("schemaTemplateId:", schemaTemplateId);
            const schemaId = `${userId}_${schemaTemplateId}`;

            const leerlingRef = doc(db, 'users', userId);
            const schemaDetailsRef = doc(db, 'trainingsschemas', schemaTemplateId);
            const actiefSchemaRef = doc(db, 'leerling_schemas', schemaId);

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
                    where('email', '==', userId)
                );
                const toegestaneSnapshot = await getDocs(toegestaneQuery);
                
                if (!toegestaneSnapshot.empty) {
                    setLeerlingProfiel(toegestaneSnapshot.docs[0].data());
                } else {
                    const toegestaneRef = doc(db, 'toegestane_gebruikers', userId);
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

            clearTimeout(timeoutId); // Cancel timeout als succesvol
            console.log("=== FETCHDATA SUCCESS ===");
            
        } catch (error) {
            clearTimeout(timeoutId);
            console.error("Fout bij ophalen schema data:", error);
            toast.error("Kon de schema gegevens niet laden.");
        } finally {
            setLoading(false); // DIT ONTBRAK - altijd loading op false zetten
        }
    };

    fetchData();
}, [profile, schemaData]);

    useEffect(() => {
        return () => {
            // Cleanup sessionStorage when component unmounts
            sessionStorage.removeItem('currentSchema');
        };
    }, []);

    // ALLE FUNCTIE DEFINITIES
    const handleTaakVoltooien = async (weekNummer, taakIndex, ervaringData) => {
        if (!schemaData) return;
        const schemaId = `${schemaData.userId}_${schemaData.schemaTemplateId}`;
        if (!actiefSchema || !isCurrentUser) return;

        try {
            const taakId = `week${weekNummer}_taak${taakIndex}`;
            const updatedVoltooide = {
                ...actiefSchema.voltooide_taken,
                [taakId]: {
                    voltooid_op: ervaringData.datum,
                    ervaring: ervaringData.ervaring,
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

            toast.success("Taak ingevuld! Je leerkracht kan nu de hele week valideren.", {
                duration: 4000,
                style: {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontWeight: 'bold'
                }
            });
        } catch (error) {
            console.error("Fout bij voltooien taak:", error);
            toast.error("Kon de taak niet markeren als voltooid.");
        }
    };

    let validatieQueue = Promise.resolve();
    let isProcessingValidation = false;

    const handleValidatieWeek = async (weekNummer, gevalideerd) => {
        if (!schemaData) return;
        const schemaId = `${schemaData.userId}_${schemaData.schemaTemplateId}`;
        if (!actiefSchema || !isTeacherOrAdmin) return;

        if (isProcessingValidation) {
            console.log("Validatie al bezig, wachten...");
            return;
        }

        validatieQueue = validatieQueue.then(async () => {
            isProcessingValidation = true;
            
            console.log("=== WEEK VALIDATION START ===");
            console.log("Week nummer:", weekNummer);
            console.log("Gevalideerd:", gevalideerd);

            try {
                // Haal fresh data op
                const actiefSchemaRef = doc(db, 'leerling_schemas', schemaId);
                const currentSchemaSnap = await getDoc(actiefSchemaRef);
                
                if (!currentSchemaSnap.exists()) {
                    throw new Error("Schema niet gevonden in database");
                }
                
                const freshSchemaData = currentSchemaSnap.data();
                console.log("Fresh data opgehaald - huidige week:", freshSchemaData.huidige_week);

                // Vind alle taken in deze week
                const weekData = schemaDetails.weken.find(w => w.week_nummer === weekNummer);
                if (!weekData) {
                    throw new Error(`Week ${weekNummer} niet gevonden`);
                }

                // Controleer of alle taken zijn ingevuld voor deze week
                const alleTakenIngevuld = weekData.taken.every((_, index) => {
                    const taakId = `week${weekNummer}_taak${index}`;
                    return freshSchemaData.voltooide_taken?.[taakId]?.voltooid_op;
                });

                if (gevalideerd && !alleTakenIngevuld) {
                    toast.error(`Alle taken van week ${weekNummer} moeten eerst worden ingevuld voordat de week kan worden gevalideerd.`);
                    return;
                }

                console.log(`Week ${weekNummer} taken alle ingevuld: ${alleTakenIngevuld}`);

                // Update gevalideerde weken
                const updatedGevalideerdeWeken = { ...freshSchemaData.gevalideerde_weken || {} };
                const weekXP = weekData.taken.length * 15; // 15 XP per taak
                
                if (gevalideerd) {
                    updatedGevalideerdeWeken[`week${weekNummer}`] = {
                        gevalideerd: true,
                        gevalideerd_door: profile.naam || profile.email,
                        gevalideerd_op: new Date().toISOString(),
                        trainingsXP: weekXP
                    };
                } else {
                    delete updatedGevalideerdeWeken[`week${weekNummer}`];
                }

                console.log(`Week ${weekNummer} validatie bijgewerkt naar gevalideerd: ${gevalideerd}`);

                // Bereken nieuwe huidige week
                let nieuweHuidigeWeek = freshSchemaData.huidige_week;

                if (gevalideerd) {
                    console.log("Validatie = true, herberekenen week progressie...");
                    
                    const gesorteerdeWeken = schemaDetails.weken.sort((a, b) => a.week_nummer - b.week_nummer);
                    
                    for (let i = 0; i < gesorteerdeWeken.length; i++) {
                        const week = gesorteerdeWeken[i];
                        
                        // Controleer of alle taken in deze week zijn ingevuld
                        const alleTakenIngevuld = week.taken.every((_, index) => {
                            const taakId = `week${week.week_nummer}_taak${index}`;
                            return freshSchemaData.voltooide_taken?.[taakId]?.voltooid_op;
                        });
                        
                        // Controleer of week is gevalideerd
                        const weekIsGevalideerd = updatedGevalideerdeWeken[`week${week.week_nummer}`]?.gevalideerd === true;
                        
                        console.log(`Week ${week.week_nummer}: taken ingevuld=${alleTakenIngevuld}, gevalideerd=${weekIsGevalideerd}`);
                        
                        if (!alleTakenIngevuld || !weekIsGevalideerd) {
                            nieuweHuidigeWeek = week.week_nummer;
                            console.log(`Week ${week.week_nummer} niet volledig -> huidige week = ${nieuweHuidigeWeek}`);
                            break;
                        } else {
                            // Week is volledig, ga naar volgende week (als die bestaat)
                            if (i + 1 < gesorteerdeWeken.length) {
                                nieuweHuidigeWeek = gesorteerdeWeken[i + 1].week_nummer;
                                console.log(`Week ${week.week_nummer} volledig -> next week = ${nieuweHuidigeWeek}`);
                            } else {
                                // Dit was de laatste week - training is klaar
                                nieuweHuidigeWeek = week.week_nummer;
                                console.log(`Training volledig voltooid! Laatste week: ${nieuweHuidigeWeek}`);
                            }
                        }
                    }
                }
                
                const weekIsVeranderd = nieuweHuidigeWeek !== freshSchemaData.huidige_week;
                console.log(`Week verandering: ${freshSchemaData.huidige_week} -> ${nieuweHuidigeWeek} (${weekIsVeranderd ? 'JA' : 'NEE'})`);
                
                // Update database
                await updateDoc(actiefSchemaRef, {
                    voltooide_taken: freshSchemaData.voltooide_taken,
                    gevalideerde_weken: updatedGevalideerdeWeken,
                    huidige_week: nieuweHuidigeWeek
                });

                console.log("Database atomic update voltooid");

                // Update lokale state
                setActiefSchema(prev => ({
                    ...prev,
                    gevalideerde_weken: updatedGevalideerdeWeken,
                    huidige_week: nieuweHuidigeWeek
                }));

                console.log("Lokale state bijgewerkt");

                // Feedback
                if (gevalideerd) {
                    if (weekIsVeranderd) {
                        toast.success(`Week ${weekNummer} voltooid! +${weekXP} TrainingsXP. Door naar week ${nieuweHuidigeWeek}!`, {
                            duration: 6000,
                            style: {
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                fontWeight: 'bold'
                            }
                        });
                    } else {
                        toast.success(`Week ${weekNummer} gevalideerd! +${weekXP} TrainingsXP toegekend!`, {
                            duration: 4000,
                            style: {
                                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                color: 'white',
                                fontWeight: 'bold'
                            }
                        });
                    }
                } else {
                    toast.success(`Week ${weekNummer} validatie ingetrokken.`);
                }

                console.log("=== WEEK VALIDATION END ===");
                
            } catch (error) {
                console.error("Fout bij valideren week:", error);
                toast.error("Kon de week niet valideren: " + error.message);
            } finally {
                isProcessingValidation = false;
            }
        });

        return validatieQueue;
    };

    const checkVolledigheid = () => {
        if (!actiefSchema || !schemaDetails) return false;
        
        return schemaDetails.weken.every(week => {
            const alleTakenIngevuld = week.taken.every((_, index) => {
                const taakId = `week${week.week_nummer}_taak${index}`;
                return actiefSchema.voltooide_taken?.[taakId]?.voltooid_op;
            });
            
            const weekIsGevalideerd = actiefSchema.gevalideerde_weken?.[`week${week.week_nummer}`]?.gevalideerd === true;
            
            return alleTakenIngevuld && weekIsGevalideerd;
        });
    };

    const getProgressStats = () => {
        if (!actiefSchema || !schemaDetails) return { completed: 0, total: 0, percentage: 0, badges: 0, trainingsXP: 0 };
        
        const totalWeken = schemaDetails.weken.length;
        
        const gevalideerdeWeken = schemaDetails.weken.filter(week => {
            const alleTakenIngevuld = week.taken.every((_, index) => {
                const taakId = `week${week.week_nummer}_taak${index}`;
                return actiefSchema.voltooide_taken?.[taakId]?.voltooid_op;
            });
            
            const weekIsGevalideerd = actiefSchema.gevalideerde_weken?.[`week${week.week_nummer}`]?.gevalideerd === true;
            
            return alleTakenIngevuld && weekIsGevalideerd;
        }).length;
        
        // NIEUW: Bereken totale trainingsXP
        const totalTrainingsXP = Object.values(actiefSchema.gevalideerde_weken || {})
            .reduce((total, week) => total + (week.trainingsXP || 0), 0);
        
        return {
            completed: gevalideerdeWeken,
            total: totalWeken,
            percentage: totalWeken > 0 ? Math.round((gevalideerdeWeken / totalWeken) * 100) : 0,
            badges: gevalideerdeWeken,
            trainingsXP: totalTrainingsXP
        };
    };

    // NU PAS DE CONDITIONELE RENDERS - NA ALLE HOOKS
    if (!schemaData) {
        return (
            <div className="fixed inset-0 bg-slate-50">
                <div className="max-w-2xl mx-auto px-4 py-20 text-center">
                    <div className="bg-white rounded-2xl shadow-sm p-8">
                        <p className="text-lg text-slate-600 mb-4">Deze pagina is niet direct toegankelijk.</p>
                        <Link to="/groeiplan" className="text-purple-600 hover:text-purple-700 font-medium">
                            Ga naar groeiplan overzicht
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-2xl shadow-sm">
                    <div className="flex items-center space-x-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        <span className="text-gray-700 font-medium">Training wordt geladen...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!schemaDetails) {
        return (
            <div className="fixed inset-0 bg-slate-50">
                <div className="max-w-2xl mx-auto px-4 py-20 text-center">
                    <div className="bg-white rounded-2xl shadow-sm p-8">
                        <p className="text-lg text-slate-600 mb-4">Kon de details van het trainingsschema niet vinden.</p>
                        <Link to="/groeiplan" className="text-purple-600 hover:text-purple-700 font-medium">
                            Terug naar overzicht
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Schema nog niet gestart
    if (!actiefSchema) {
        return (
            <div className="fixed inset-0 bg-slate-50">
                <div className="max-w-2xl mx-auto px-4 py-20">
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
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
                </div>
            </div>
        );
    }

    const isVolledig = checkVolledigheid();
    const progressStats = getProgressStats();

    return (
        <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 pt-20 pb-6 lg:px-8 lg:pt-24 lg:pb-8">
                
                {/* Back Button */}
                <div className="mb-6">
                    <Link to="/groeiplan" className="inline-flex items-center text-gray-600 hover:text-purple-700 group">
                        <ArrowLeftIcon className="h-5 w-5 mr-2 transition-transform group-hover:-translate-x-1" />
                        Terug naar overzicht
                    </Link>
                </div>

                {/* Header met Progress */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <div className="mb-4 lg:mb-0">
                            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">{schemaDetails.naam}</h1>
                            <p className="text-slate-600">
                                {isTeacherOrAdmin 
                                    ? `Voortgang van ${leerlingProfiel?.naam}` 
                                    : 'Jouw trainingsvoortgang'} - Week {actiefSchema.huidige_week} van {schemaDetails.duur_weken}
                            </p>
                        </div>
                        
                        {/* Progress Stats - Now based on weeks */}
                        <div className="flex items-center space-x-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">{progressStats.percentage}%</div>
                                <div className="text-sm text-slate-600">Voltooid</div>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center text-2xl font-bold text-orange-600">
                                    <FireIcon className="h-6 w-6 mr-1" />
                                    {progressStats.trainingsXP}
                                </div>
                                <div className="text-sm text-slate-600">TrainingsXP</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{progressStats.completed}/{progressStats.total}</div>
                                <div className="text-sm text-slate-600">Weken</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-6">
                        <div className="bg-slate-200 rounded-full h-3 overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-700 ease-out"
                                style={{ width: `${progressStats.percentage}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Volledigheids indicator */}
                {isVolledig && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 mb-8">
                        <div className="flex items-center">
                            <div className="bg-green-100 p-3 rounded-full mr-4">
                                <TrophyIcon className="h-8 w-8 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-green-800 mb-1">Training Voltooid!</h3>
                                <p className="text-green-700">
                                    Alle weken zijn succesvol afgerond. Je kunt nu een nieuwe evaluatie aanvragen bij je leerkracht.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Instructies voor leerlingen */}
                {isCurrentUser && !isTeacherOrAdmin && (
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6 mb-8">
                        <div className="flex items-start">
                            <div className="bg-blue-100 p-2 rounded-full mr-4 flex-shrink-0">
                                <CameraIcon className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h4 className="font-bold text-blue-800 mb-2 text-lg">Belangrijk voor jouw training:</h4>
                                <p className="text-blue-700 leading-relaxed">
                                    Film jezelf tijdens het uitvoeren van de oefeningen en toon deze aan je leerkracht. 
                                    Je leerkracht valideert hele weken in een keer. Na weekvalidatie ontvang je 
                                    <span className="font-semibold"> een weekbadge en XP punten</span>!
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Weken overzicht */}
                <div className="space-y-8">
                    {schemaDetails.weken.map((week) => (
                        <WeekCard 
                            key={week.week_nummer}
                            week={week}
                            actiefSchema={actiefSchema}
                            onTaakVoltooien={handleTaakVoltooien}
                            onValidatieWeek={handleValidatieWeek}
                            isCurrentUser={isCurrentUser}
                            isTeacherOrAdmin={isTeacherOrAdmin}
                            profile={profile}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// Updated WeekCard component
function WeekCard({ week, actiefSchema, onTaakVoltooien, onValidatieWeek, isCurrentUser, isTeacherOrAdmin, profile }) {
    const isCurrentWeek = week.week_nummer === actiefSchema.huidige_week;
    const weekTaken = week.taken || [];
    
    // Check if all tasks in this week are completed (have feedback)
    const alleTakenIngevuld = weekTaken.every((_, index) => {
        const taakId = `week${week.week_nummer}_taak${index}`;
        return actiefSchema.voltooide_taken?.[taakId]?.voltooid_op;
    });
    
    // Check if week is validated
    const weekIsGevalideerd = actiefSchema.gevalideerde_weken?.[`week${week.week_nummer}`]?.gevalideerd === true;
    
    const completedTasks = weekTaken.filter((_, index) => {
        const taakId = `week${week.week_nummer}_taak${index}`;
        return actiefSchema.voltooide_taken?.[taakId]?.voltooid_op;
    }).length;
    
    // Calculate XP for this week
    const weekXP = weekTaken.length * 15;
    
    return (
        <div className={`bg-white rounded-2xl shadow-sm border-2 p-6 ${
            weekIsGevalideerd ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50' :
            isCurrentWeek ? 'border-purple-300 bg-gradient-to-br from-purple-50 to-blue-50' : 'border-slate-200'
        }`}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                        weekIsGevalideerd ? 'bg-green-600 text-white' :
                        isCurrentWeek ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                        {weekIsGevalideerd ? <CheckCircleIcon className="h-6 w-6" /> : week.week_nummer}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">
                            Week {week.week_nummer}
                            {weekIsGevalideerd && (
                                <span className="ml-3 text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                                    <StarIcon className="inline h-4 w-4 mr-1" />
                                    Gevalideerd +{weekXP}XP
                                </span>
                            )}
                            {isCurrentWeek && !weekIsGevalideerd && (
                                <span className="ml-3 text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">
                                    <FireIcon className="inline h-4 w-4 mr-1" />
                                    Huidige week
                                </span>
                            )}
                        </h3>
                        <p className="text-slate-600 mt-1">{week.doel_van_de_week}</p>
                    </div>
                </div>
                
                {/* Week Progress and Validation */}
                <div className="text-right">
                    <div className="text-lg font-bold text-slate-800 mb-1">{completedTasks}/{weekTaken.length}</div>
                    <div className="text-sm text-slate-600 mb-3">taken ingevuld</div>
                    
                    {/* Teacher validation button */}
                    {isTeacherOrAdmin && alleTakenIngevuld && (
                        <div className="space-y-2">
                            {!weekIsGevalideerd ? (
                                <button 
                                    onClick={() => onValidatieWeek(week.week_nummer, true)}
                                    className="flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-medium hover:bg-green-200 transition-all duration-200 hover:scale-105"
                                >
                                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                                    Valideer Week
                                </button>
                            ) : (
                                <button 
                                    onClick={() => onValidatieWeek(week.week_nummer, false)}
                                    className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-medium hover:bg-red-200 transition-all duration-200"
                                >
                                    Trek validatie in
                                </button>
                            )}
                        </div>
                    )}
                    
                    {/* Status for students */}
                    {!isTeacherOrAdmin && alleTakenIngevuld && !weekIsGevalideerd && (
                        <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
                            <ClockIcon className="inline h-4 w-4 mr-1" />
                            Wacht op validatie
                        </div>
                    )}
                </div>
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
                        isCurrentUser={isCurrentUser}
                        isTeacherOrAdmin={isTeacherOrAdmin}
                        profile={profile}
                        weekIsGevalideerd={weekIsGevalideerd}
                    />
                ))}
            </div>
        </div>
    );
}

// Updated TaakCard component - simplified for weekly validation
function TaakCard({ taak, weekNummer, taakIndex, actiefSchema, onTaakVoltooien, isCurrentUser, isTeacherOrAdmin, profile, weekIsGevalideerd }) {
    const [showForm, setShowForm] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [oefeningDetails, setOefeningDetails] = useState(null);
    const [loadingOefening, setLoadingOefening] = useState(false);
    const [formData, setFormData] = useState({
        datum: new Date().toISOString().split('T')[0],
        ervaring: ''
    });

    // Haal oefening details op wanneer instructies worden getoond
    useEffect(() => {
        const fetchOefeningDetails = async () => {
            if (!showInstructions || !taak.oefening_id || oefeningDetails) return;
            
            setLoadingOefening(true);
            try {
                const oefeningRef = doc(db, 'oefeningen', taak.oefening_id);
                const oefeningSnap = await getDoc(oefeningRef);
                
                if (oefeningSnap.exists()) {
                    setOefeningDetails({ id: oefeningSnap.id, ...oefeningSnap.data() });
                } else {
                    console.error(`Oefening niet gevonden: ${taak.oefening_id}`);
                }
            } catch (error) {
                console.error("Fout bij ophalen oefening details:", error);
            } finally {
                setLoadingOefening(false);
            }
        };

        fetchOefeningDetails();
    }, [showInstructions, taak.oefening_id, oefeningDetails]);

    const taakId = `week${weekNummer}_taak${taakIndex}`;
    const taakData = actiefSchema.voltooide_taken?.[taakId];
    const isIngevuld = !!taakData?.voltooid_op;

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
        <div className={`relative rounded-2xl border-2 p-6 transition-all duration-300 ${
            weekIsGevalideerd ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' : 
            isIngevuld ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200' : 
            'bg-white border-slate-200 hover:border-purple-200 hover:shadow-md'
        }`}>
            
            {/* Badge indicator for validated week */}
            {weekIsGevalideerd && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full p-2 shadow-lg">
                    <StarIcon className="h-5 w-5 text-white" />
                </div>
            )}

            <div className="mb-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <h4 className="font-bold text-slate-800 text-lg mb-2">
                            {taak.dag}: {taak.omschrijving}
                        </h4>
                        
                        {/* Status badge */}
                        <div className="flex items-center space-x-2 mb-3">
                            {weekIsGevalideerd ? (
                                <div className="flex items-center bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                                    <span>Week gevalideerd</span>
                                    <SparklesIcon className="h-4 w-4 ml-2 text-yellow-500" />
                                </div>
                            ) : isIngevuld ? (
                                <div className="flex items-center bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                                    <span>Ingevuld</span>
                                </div>
                            ) : (
                                <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-medium">
                                    Nog te doen
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Instructions button */}
                <button 
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="flex items-center text-purple-600 hover:text-purple-700 font-medium text-sm mb-4"
                >
                    <InformationCircleIcon className="h-4 w-4 mr-1" />
                    {showInstructions ? 'Verberg instructies' : 'Toon instructies'}
                </button>

                {/* Instructions panel */}
                {showInstructions && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                        {loadingOefening ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
                                <p className="text-slate-600 text-sm">Instructies laden...</p>
                            </div>
                        ) : oefeningDetails ? (
                            <>
                                {/* GIF from database */}
                                <div className="bg-slate-200 rounded-lg mb-3 h-40 flex items-center justify-center overflow-hidden">
                                    {oefeningDetails.visuele_media_url ? (
                                        <img 
                                            src={oefeningDetails.visuele_media_url} 
                                            alt={`Demonstratie van ${oefeningDetails.naam || 'oefening'}`}
                                            className="rounded-lg max-h-full max-w-full object-contain" 
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'block';
                                            }}
                                        />
                                    ) : null}
                                    <div 
                                        className={`text-slate-500 text-sm text-center px-4 ${oefeningDetails.visuele_media_url ? 'hidden' : 'block'}`}
                                    >
                                        {oefeningDetails.naam || taak.omschrijving || 'Oefening'} - Geen demonstratie beschikbaar
                                    </div>
                                </div>
                                
                                {/* Oefening naam en categorie */}
                                {oefeningDetails.naam && (
                                    <div className="mb-3">
                                        <h5 className="font-bold text-slate-800 text-base">{oefeningDetails.naam}</h5>
                                        {oefeningDetails.categorie && (
                                            <span className="inline-block bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium mt-1">
                                                {oefeningDetails.categorie}
                                            </span>
                                        )}
                                    </div>
                                )}
                                
                                {/* Beschrijving */}
                                {oefeningDetails.beschrijving && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                                        <p className="text-blue-800 text-sm">{oefeningDetails.beschrijving}</p>
                                    </div>
                                )}
                                
                                {/* Stap-voor-stap instructies */}
                                <div className="text-sm text-slate-700">
                                    <h5 className="font-semibold mb-3 flex items-center">
                                        <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-2 py-1 rounded-md text-xs mr-2">
                                            INSTRUCTIES
                                        </span>
                                        Uitvoering:
                                    </h5>
                                    
                                    {oefeningDetails.instructies && Object.keys(oefeningDetails.instructies).length > 0 ? (
                                        <div className="space-y-3">
                                            {Object.entries(oefeningDetails.instructies)
                                                .sort(([a], [b]) => parseInt(a) - parseInt(b)) // Sorteer op nummer
                                                .map(([step, instructie], idx) => (
                                                <div key={step} className="flex items-start bg-white rounded-lg p-3 border border-slate-200">
                                                    <span className="inline-flex items-center justify-center w-7 h-7 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full text-xs font-bold mr-3 flex-shrink-0 mt-0.5">
                                                        {parseInt(step) + 1}
                                                    </span>
                                                    <p className="text-slate-700 leading-relaxed">{instructie}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                            <p className="text-yellow-800 text-sm">
                                                Geen instructies beschikbaar voor deze oefening. 
                                                Vraag je leerkracht om meer informatie.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-red-800 text-sm">
                                    Kon oefening details niet laden (ID: {taak.oefening_id})
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Task completion info */}
                {taakData && (
                    <div className="bg-white/70 rounded-xl p-4 space-y-2 text-sm">
                        <div className="grid grid-cols-1 gap-2">
                            <div><span className="font-medium text-slate-700">Voltooid op:</span> {new Date(taakData.voltooid_op).toLocaleDateString('nl-NL')}</div>
                            <div><span className="font-medium text-slate-700">Door:</span> {taakData.ingevuld_door}</div>
                            {weekIsGevalideerd && actiefSchema.gevalideerde_weken?.[`week${weekNummer}`] && (
                                <div><span className="font-medium text-slate-700">Week gevalideerd door:</span> {actiefSchema.gevalideerde_weken[`week${weekNummer}`].gevalideerd_door}</div>
                            )}
                        </div>
                        <div className="pt-2 border-t border-slate-200">
                            <span className="font-medium text-slate-700">Ervaring:</span>
                            <p className="text-slate-600 mt-1 italic">"{taakData.ervaring}"</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Action buttons - simplified for weekly validation */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div className="flex items-center space-x-3">
                    {/* Leerling acties */}
                    {isCurrentUser && !isTeacherOrAdmin && !isIngevuld && (
                        <button 
                            onClick={() => setShowForm(true)}
                            className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 transform transition-all duration-200 hover:scale-105 shadow-md"
                        >
                            <CheckCircleIcon className="h-4 w-4 mr-2" />
                            Opdracht voltooid
                        </button>
                    )}
                </div>

                {/* XP/Points indicator - only show for validated weeks */}
               {isIngevuld && (
                    <div className={`flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                        weekIsGevalideerd 
                            ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700' 
                            : 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700'
                    }`}>
                        <StarIcon className="h-4 w-4 mr-1" />
                        +15 XP
                    </div>
                )}
        </div>

            {/* Formulier voor taak voltooien */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md transform transition-all duration-300">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircleIcon className="w-8 h-8 text-purple-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Feedback Geven</h3>
                            <p className="text-gray-600 text-sm">Vertel ons hoe deze oefening ging!</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Wanneer heb je deze oefening gedaan?
                                </label>
                                <input 
                                    type="date"
                                    value={formData.datum}
                                    onChange={(e) => setFormData({...formData, datum: e.target.value})}
                                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    max={new Date().toISOString().split('T')[0]}
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Hoe ging het? Vertel over je ervaring:
                                </label>
                                <textarea 
                                    value={formData.ervaring}
                                    onChange={(e) => setFormData({...formData, ervaring: e.target.value})}
                                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Beschrijf hoe de oefening ging, wat je moeilijk vond, wat goed ging..."
                                    required
                                />
                            </div>
                            
                            <div className="flex space-x-3 pt-4">
                                <button 
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm font-semibold hover:from-purple-700 hover:to-blue-700 transform transition-all duration-200 hover:scale-105"
                                >
                                    Opslaan
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-300 transition-all duration-200"
                                >
                                    Annuleren
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}