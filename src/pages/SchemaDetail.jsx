// src/pages/SchemaDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeftIcon, PlayIcon } from '@heroicons/react/24/solid';

export default function SchemaDetail() {
    const { schemaId } = useParams(); // Dit is de 'leerlingID_schemaTemplateID'
    const { profile } = useOutletContext(); // Profiel van de ingelogde gebruiker
    const [actiefSchema, setActiefSchema] = useState(null);
    const [schemaDetails, setSchemaDetails] = useState(null);
    const [leerlingProfiel, setLeerlingProfiel] = useState(null);
    const [loading, setLoading] = useState(true);

    const isTeacherOrAdmin = profile?.rol === 'leerkracht' || profile?.rol === 'administrator';

    useEffect(() => {
        // Wacht tot we ZEKER alle benodigde IDs hebben
        if (!profile?.id || !schemaId) {
            return; // Doe nog niets als de data niet compleet is
        }

        const fetchData = async () => {
            setLoading(true);

            // 1. Haal de ID's uit de URL
            const [leerlingId, schemaTemplateId] = schemaId.split('_');

            // 2. Haal het profiel op van de leerling die we bekijken
            const leerlingRef = doc(db, 'users', leerlingId);
            const leerlingSnap = await getDoc(leerlingRef);
            if (leerlingSnap.exists()) {
                setLeerlingProfiel(leerlingSnap.data());
            }

            // 3. Haal de details van het trainingsschema (het 'kookboek') op
            const schemaDetailsRef = doc(db, 'trainingsschemas', schemaTemplateId);
            const schemaDetailsSnap = await getDoc(schemaDetailsRef);
            if (schemaDetailsSnap.exists()) {
                setSchemaDetails({ id: schemaDetailsSnap.id, ...schemaDetailsSnap.data() });
            }

            // 4. Probeer het actieve schema van de leerling te vinden (de 'plaknotitie')
            const actiefSchemaRef = doc(db, 'leerling_schemas', schemaId);
            const actiefSchemaSnap = await getDoc(actiefSchemaRef);
            if (actiefSchemaSnap.exists()) {
                setActiefSchema({ id: actiefSchemaSnap.id, ...actiefSchemaSnap.data() });
            }

            setLoading(false);
        };

        fetchData();
    }, [profile, schemaId]); // Deze hook draait opnieuw als de data binnenkomt

    if (loading) {
        return <div className="text-center p-12">Schema wordt geladen...</div>;
    }

    if (!schemaDetails) {
        return <div className="text-center p-12">Kon de details van het trainingsschema niet vinden.</div>;
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

    const huidigeWeekData = schemaDetails.weken.find(
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
                    {huidigeWeekData?.taken.map((taak, index) => (
                        <div key={index} className="bg-slate-50 rounded-xl p-4 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-slate-800">{taak.dag}: {taak.omschrijving}</p>
                                <p className="text-sm text-slate-500">Status: NOG TE IMPLEMENTEREN</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}