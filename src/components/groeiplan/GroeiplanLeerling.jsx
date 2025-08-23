// src/components/groeiplan/GroeiplanLeerling.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getStudentEvolutionData } from '../../utils/firebaseUtils.js';
import { analyseerEvolutieData } from '../../utils/analyseUtils.js';
import FocusPuntKaart from './FocusPuntKaart';

// De component accepteert nu een 'studentProfile' prop
export default function GroeiplanLeerling({ studentProfile }) {
    const context = useOutletContext(); // We halen nog steeds de context op

    // Bepaal welk profiel we moeten gebruiken:
    // 1. Het doorgegeven profiel (als een leerkracht zoekt)
    // 2. Anders, het profiel van de ingelogde gebruiker (als een leerling zelf kijkt)
    const profile = studentProfile || context.profile;

    const [focusPunt, setFocusPunt] = useState(null);
    const [gekoppeldSchema, setGekoppeldSchema] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // De rest van de code blijft exact hetzelfde, 
        // het gebruikt nu automatisch de juiste 'profile' variabele.
        if (!profile?.id) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            const evolutionData = await getStudentEvolutionData(profile.id);
            const zwaksteTest = analyseerEvolutieData(evolutionData);
            setFocusPunt(zwaksteTest);

            if (zwaksteTest) {
                const schemasQuery = query(
                    collection(db, 'trainingsschemas'),
                    where('gekoppelde_test_id', '==', zwaksteTest.test_id)
                );
                const querySnapshot = await getDocs(schemasQuery);
                if (!querySnapshot.empty) {
                    const schemaDoc = querySnapshot.docs[0];
                    setGekoppeldSchema({ id: schemaDoc.id, ...schemaDoc.data() });
                } else {
                    setGekoppeldSchema(null); // Zorg ervoor dat schema gereset wordt
                }
            }
            setLoading(false);
        };

        fetchData();
    }, [profile]); // De hook reageert nu op wijzigingen in het profiel

    if (loading) {
        return <div className="text-center p-12">Persoonlijk groeiplan wordt berekend...</div>;
    }

    if (!focusPunt || !gekoppeldSchema) {
        return (
            <div className="bg-white rounded-2xl p-8 text-center max-w-2xl mx-auto">
                <h3 className="text-xl font-bold text-slate-800 mb-2">Alles Ziet Er Goed Uit!</h3>
                <p className="text-slate-600">Geen specifiek focuspunt gevonden voor {profile?.naam}.</p>
            </div>
        );
    }
    
    return <FocusPuntKaart test={focusPunt} schema={gekoppeldSchema} student={profile} />;
}