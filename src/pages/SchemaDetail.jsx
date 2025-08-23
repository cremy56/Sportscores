// src/pages/SchemaDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

// Dit wordt de detailpagina voor zowel de leerling als de leerkracht
export default function SchemaDetail() {
    const { schemaId } = useParams(); // Haalt de ID uit de URL
    const { profile } = useOutletContext();
    const [actiefSchema, setActiefSchema] = useState(null);
    const [schemaDetails, setSchemaDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const isTeacherOrAdmin = profile?.rol === 'leerkracht' || profile?.rol === 'administrator';

    useEffect(() => {
        const fetchData = async () => {
            if (!profile?.id || !schemaId) return;
            setLoading(true);

            // 1. Haal het actieve schema van de leerling op (de 'plaknotitie')
            // Belangrijk: De document ID is een combinatie, dus die moeten we opbouwen.
            // Dit moet later slimmer, maar voor nu zoeken we op de schemaId.
            // TODO: Beter ophalen op basis van leerling_id en schema_id
            const actiefSchemaRef = doc(db, 'leerling_schemas', schemaId);
            const actiefSchemaSnap = await getDoc(actiefSchemaRef);

            if (actiefSchemaSnap.exists()) {
                const data = actiefSchemaSnap.data();
                setActiefSchema({ id: actiefSchemaSnap.id, ...data });

                // 2. Haal de details van het trainingsschema zelf op (het 'kookboek')
                const schemaDetailsRef = doc(db, 'trainingsschemas', data.schema_id);
                const schemaDetailsSnap = await getDoc(schemaDetailsRef);

                if (schemaDetailsSnap.exists()) {
                    setSchemaDetails({ id: schemaDetailsSnap.id, ...schemaDetailsSnap.data() });
                }
            }
            setLoading(false);
        };
        fetchData();
    }, [profile, schemaId]);
    
    if (loading) {
        return <div className="text-center p-12">Schema wordt geladen...</div>;
    }
    
    if (!actiefSchema || !schemaDetails) {
        return <div className="text-center p-12">Kon het actieve schema niet vinden.</div>;
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
            <p className="text-slate-500 mt-2">Week {actiefSchema.huidige_week} van {schemaDetails.duur_weken}</p>
            
            <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <h2 className="font-bold text-xl mb-4">Doel van deze week:</h2>
                <p className="text-slate-600 mb-8">{huidigeWeekData.doel_van_de_week}</p>
                
                <h3 className="font-semibold text-lg mb-4">Taken</h3>
                <div className="space-y-4">
                    {huidigeWeekData.taken.map((taak, index) => (
                        <div key={index} className="bg-slate-50 rounded-xl p-4 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-slate-800">{taak.dag}: {taak.omschrijving}</p>
                                <p className="text-sm text-slate-500">Status: NOG TE IMPLEMENTEREN</p>
                            </div>
                            {/* Hier komen later de knoppen voor leerling/leerkracht */}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}