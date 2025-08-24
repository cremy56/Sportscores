// src/pages/SchemaDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeftIcon, PlayIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

export default function SchemaDetail() {
    const { schemaId } = useParams();
    const { profile } = useOutletContext();
    const [actiefSchema, setActiefSchema] = useState(null);
    const [schemaDetails, setSchemaDetails] = useState(null);
    const [leerlingProfiel, setLeerlingProfiel] = useState(null);
    const [loading, setLoading] = useState(true);

    const isTeacherOrAdmin = profile?.rol === 'leerkracht' || profile?.rol === 'administrator';

    // Uitgebreide debug logging
    console.log('SchemaDetail rendert met:', { 
        profile: profile ? `Profiel geladen voor ${profile.naam}` : 'Profiel nog niet geladen',
        profileId: profile?.id,
        profileEmail: profile?.email,
        profileKeys: profile ? Object.keys(profile) : 'Geen profiel',
        schemaId: schemaId ? `SchemaId aanwezig: ${schemaId}` : 'SchemaId nog niet aanwezig'
    });

    useEffect(() => {
        const fetchData = async () => {
            // Verbeterde check - controleer op het bestaan van profile en schemaId
            console.log('fetchData aangeroepen met:', {
                hasProfile: !!profile,
                hasSchemaId: !!schemaId,
                profileId: profile?.id,
                profileEmail: profile?.email
            });

            if (!profile || !schemaId) {
                console.log("Wachten op profiel en schemaId...");
                return;
            }

            setLoading(true);
            
            console.log(`--- START FETCH met profiel: ${profile.naam} (${profile.id || profile.email}) en schemaId: ${schemaId} ---`);

            const [leerlingId, schemaTemplateId] = schemaId.split('_');
            console.log('Gesplitste IDs:', { leerlingId, schemaTemplateId });

            const leerlingRef = doc(db, 'users', leerlingId);
            const schemaDetailsRef = doc(db, 'trainingsschemas', schemaTemplateId);
            const actiefSchemaRef = doc(db, 'leerling_schemas', schemaId);

            try {
                console.log('Starten van Promise.all voor data ophalen...');
                
                const [
                    leerlingSnap, 
                    schemaDetailsSnap, 
                    actiefSchemaSnap
                ] = await Promise.all([
                    getDoc(leerlingRef),
                    getDoc(schemaDetailsRef),
                    getDoc(actiefSchemaRef)
                ]);

                console.log('Firebase responses:', {
                    leerlingExists: leerlingSnap.exists(),
                    schemaDetailsExists: schemaDetailsSnap.exists(),
                    actiefSchemaExists: actiefSchemaSnap.exists()
                });

                if (leerlingSnap.exists()) {
                    const leerlingData = leerlingSnap.data();
                    console.log('Leerling data gevonden:', leerlingData);
                    setLeerlingProfiel(leerlingData);
                } else {
                    console.error('Leerling niet gevonden met ID:', leerlingId);
                }

                if (schemaDetailsSnap.exists()) {
                    const schemaData = { id: schemaDetailsSnap.id, ...schemaDetailsSnap.data() };
                    console.log('Schema details gevonden:', schemaData);
                    setSchemaDetails(schemaData);
                } else {
                    console.error('Schema details niet gevonden met ID:', schemaTemplateId);
                }

                if (actiefSchemaSnap.exists()) {
                    const actiefSchemaData = { id: actiefSchemaSnap.id, ...actiefSchemaSnap.data() };
                    console.log('Actief schema gevonden:', actiefSchemaData);
                    setActiefSchema(actiefSchemaData);
                } else {
                    console.log('Actief schema niet gevonden - schema nog niet gestart');
                }

            } catch (error) {
                console.error("Fout bij ophalen schema data:", error);
                toast.error("Kon de schema gegevens niet laden.");
            } finally {
                console.log('fetchData voltooid, setting loading to false');
                setLoading(false);
            }
        };

        fetchData();
        
    }, [profile, schemaId]);

    if (loading) {
        return <div className="text-center p-12">Schema wordt geladen...</div>;
    }

    if (!schemaDetails) {
        return (
            <div className="text-center p-12">
                <p>Kon de details van het trainingsschema niet vinden.</p>
                <p className="text-sm text-gray-500 mt-2">Schema ID: {schemaId}</p>
                <Link to="/groeiplan" className="text-purple-600 hover:text-purple-700 mt-4 inline-block">
                    Terug naar overzicht
                </Link>
            </div>
        );
    }

    // --- Weergave als het schema NOG NIET GESTART is ---
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

    const huidigeWeekData = schemaDetails.weken?.find(
        week => week.week_nummer === actiefSchema.huidige_week
    );

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <Link to="/groeiplan" className="inline-flex items-center text-gray-600 hover:text-purple-700 mb-6 group">
                <ArrowLeftIcon className="h-5 w-5 mr-2 transition-transform group-hover:-translate-x-1" />
                Terug naar overzicht
            </Link>
            
            <h1 className="text-3xl font-bold text-slate-900">{schemaDetails.naam}</h1>
            <p className="text-slate-500 mt-2">
                Voortgang van {leerlingProfiel?.naam} - Week {actiefSchema.huidige_week} van {schemaDetails.duur_weken}
            </p>
            
            <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <h2 className="font-bold text-xl mb-4">Doel van deze week:</h2>
                <p className="text-slate-600 mb-8">{huidigeWeekData?.doel_van_de_week || 'Geen doel gespecificeerd.'}</p>
                
                <h3 className="font-semibold text-lg mb-4">Taken</h3>
                <div className="space-y-4">
                    {huidigeWeekData?.taken?.map((taak, index) => (
                        <div key={index} className="bg-slate-50 rounded-xl p-4 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-slate-800">{taak.dag}: {taak.omschrijving}</p>
                                <p className="text-sm text-slate-500">Status: NOG TE IMPLEMENTEREN</p>
                            </div>
                        </div>
                    )) || <p className="text-slate-500">Geen taken gevonden voor deze week</p>}
                </div>
            </div>
        </div>
    );
}