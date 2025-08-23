// src/pages/SchemaDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

export default function SchemaDetail() {
    const { schemaId } = useParams();
    const { profile } = useOutletContext();
    const [actiefSchema, setActiefSchema] = useState(null);
    const [schemaDetails, setSchemaDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchData = async () => {
            if (!profile?.id || !schemaId) {
                console.log("Fetch afgebroken: geen profiel of schemaId.");
                setLoading(false);
                return;
            }
            setLoading(true);
            
            console.log(`--- START SCHEMA DETAIL FETCH ---`);
            console.log(`Stap 1: Zoeken naar actief schema met Document ID: ${schemaId}`);

            const actiefSchemaRef = doc(db, 'leerling_schemas', schemaId);
            const actiefSchemaSnap = await getDoc(actiefSchemaRef);

            if (actiefSchemaSnap.exists()) {
                const data = actiefSchemaSnap.data();
                setActiefSchema({ id: actiefSchemaSnap.id, ...data });
                console.log('Stap 2: SUCCES - Actief schema gevonden:', data);

                const schemaTemplateId = data.schema_id;
                console.log(`Stap 3: Zoeken naar schema-template met ID: ${schemaTemplateId}`);

                const schemaDetailsRef = doc(db, 'trainingsschemas', schemaTemplateId);
                const schemaDetailsSnap = await getDoc(schemaDetailsRef);

                if (schemaDetailsSnap.exists()) {
                    setSchemaDetails({ id: schemaDetailsSnap.id, ...schemaDetailsSnap.data() });
                    console.log('Stap 4: SUCCES - Schema-template gevonden:', schemaDetailsSnap.data());
                } else {
                    console.log(`Stap 4: FOUT - Schema-template met ID '${schemaTemplateId}' NIET GEVONDEN.`);
                }
            } else {
                console.log(`Stap 2: FOUT - Actief schema met ID '${schemaId}' NIET GEVONDEN in 'leerling_schemas' collectie.`);
            }
            setLoading(false);
        };
        fetchData();
    }, [profile, schemaId]);
    
    // --- DE REST VAN DE CODE BLIJFT HETZELFDE ---

    if (loading) {
        return <div className="text-center p-12">Schema wordt geladen...</div>;
    }
    
    if (!actiefSchema || !schemaDetails) {
        return (
            <div className="text-center p-12 max-w-lg mx-auto bg-white rounded-xl shadow-sm">
                <h2 className="font-bold text-red-600">Fout bij laden</h2>
                <p className="text-slate-600 mt-2">Kon het actieve schema niet vinden. Controleer de console voor details.</p>
                 <Link to="/groeiplan" className="mt-4 inline-block text-purple-600 hover:underline">
                    Terug naar overzicht
                </Link>
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
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}