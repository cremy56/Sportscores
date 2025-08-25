// src/components/groeiplan/GroeiplanLeerling.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import FocusPuntKaart from './FocusPuntKaart';

export default function GroeiplanLeerling({ studentProfile }) {
    const context = useOutletContext();
    const profile = studentProfile || context.profile;

    const [focusPunten, setFocusPunten] = useState([]);
    const [gekoppeldeSchemas, setGekoppeldeSchemas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.id) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            const evolutionData = await getStudentEvolutionData(profile.id, profile);
            
            // 1. Haalt nu een LIJST van zwakke testen op
            const zwakkeTesten = analyseerEvolutieData(evolutionData);
            setFocusPunten(zwakkeTesten);

            if (zwakkeTesten.length > 0) {
                // 2. Zoek voor ELKE zwakke test een bijbehorend schema
                const schemaPromises = zwakkeTesten.map(test => {
                    const schemasQuery = query(
                        collection(db, 'trainingsschemas'),
                        where('gekoppelde_test_id', '==', test.test_id)
                    );
                    return getDocs(schemasQuery);
                });

                const schemaSnapshots = await Promise.all(schemaPromises);

                const schemas = schemaSnapshots.map((snapshot, index) => {
                    if (!snapshot.empty) {
                        const schemaDoc = snapshot.docs[0];
                        return { 
                            gekoppeldAanTestId: zwakkeTesten[index].test_id,
                            ...schemaDoc.data(),
                            id: schemaDoc.id
                        };
                    }
                    return null;
                }).filter(Boolean); // Verwijder null-waarden

                setGekoppeldeSchemas(schemas);
            }
            setLoading(false);
        };

        fetchData();
    }, [profile]);

    if (loading) {
        return <div className="text-center p-12">Je persoonlijke groeiplan wordt berekend...</div>;
    }

    // Aangepast: toon de "Alles goed" boodschap als de LIJST leeg is
    if (focusPunten.length === 0 || gekoppeldeSchemas.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-8 text-center max-w-2xl mx-auto">
                <h3 className="text-xl font-bold text-slate-800 mb-2">Alles Ziet Er Goed Uit!</h3>
                <p className="text-slate-600">Geen specifiek focuspunt gevonden voor {profile?.naam}.</p>
            </div>
        );
    }
    
    // We moeten 'test_naam' gebruiken omdat de 'naam' in het test-object zit
   return (
        <div className="space-y-8">
            {focusPunten.map(punt => {
                const bijbehorendSchema = gekoppeldeSchemas.find(s => s.gekoppeldAanTestId === punt.test_id);
                if (!bijbehorendSchema) return null;

                return (
                    <FocusPuntKaart 
                        key={punt.test_id}
                        test={{...punt, test_naam: punt.naam}}
                        schema={bijbehorendSchema}
                        student={profile}
                        isVerplicht={true} // Markeer deze als verplicht
                    />
                );
            })}
        </div>
    );
}