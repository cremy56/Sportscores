// src/components/groeiplan/GroeiplanLeerling.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import FocusPuntKaart from './FocusPuntKaart';

export default function GroeiplanLeerling({ studentProfile }) {
    const context = useOutletContext();
    const profile = studentProfile || context.profile;

    const [focusPunt, setFocusPunt] = useState(null);
    const [gekoppeldSchema, setGekoppeldSchema] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.id) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            
            // 1. Haal alle scores op voor deze leerling, gesorteerd op datum
            const scoresQuery = query(
                collection(db, 'scores'),
                where('leerling_id', '==', profile.id),
                orderBy('datum', 'desc')
            );
            const scoresSnapshot = await getDocs(scoresQuery);
            const allScores = scoresSnapshot.docs.map(doc => doc.data());

            if (allScores.length > 0) {
        // --- START WIJZIGING ---

        // 2. Filter eerst op scores die een geldig rapportpunt hebben
        const scoresMetPunt = allScores.filter(score => 
            score.rapportpunt !== null && score.rapportpunt !== undefined
        );

        if (scoresMetPunt.length > 0) {
            // 3. Sorteer de gefilterde scores van laag naar hoog
            const sortedByPunt = scoresMetPunt.sort((a, b) => a.rapportpunt - b.rapportpunt);
            const zwaksteScore = sortedByPunt[0];

            // 4. Pas de drempel aan naar <= 10 (een 10/20 is ook een focuspunt)
            if (zwaksteScore && zwaksteScore.rapportpunt <= 10) {
                const testRef = doc(db, 'testen', zwaksteScore.test_id);
                const testSnap = await getDoc(testRef);

                if (testSnap.exists()) {
                    setFocusPunt({ test_id: testSnap.id, ...testSnap.data() });

                    const schemasQuery = query(
                        collection(db, 'trainingsschemas'),
                        where('gekoppelde_test_id', '==', zwaksteScore.test_id)
                    );
                    const schemaSnapshot = await getDocs(schemasQuery);

                    if (!schemaSnapshot.empty) {
                        const schemaDoc = schemaSnapshot.docs[0];
                        setGekoppeldSchema({ id: schemaDoc.id, ...schemaDoc.data() });
                    }
                }
            }
        }
        // --- EINDE WIJZIGING ---
    }
            
            setLoading(false);
        };

        fetchData();
    }, [profile]);

    if (loading) {
        return <div className="text-center p-12">Je persoonlijke groeiplan wordt berekend...</div>;
    }

    if (!focusPunt || !gekoppeldSchema) {
        return (
            <div className="bg-white rounded-2xl p-8 text-center max-w-2xl mx-auto">
                <h3 className="text-xl font-bold text-slate-800 mb-2">Alles Ziet Er Goed Uit!</h3>
                <p className="text-slate-600">Geen specifiek focuspunt gevonden voor {profile?.naam}. Alle scores zijn voldoende!</p>
            </div>
        );
    }
    
    // We moeten 'test_naam' gebruiken omdat de 'naam' in het test-object zit
    return <FocusPuntKaart test={{...focusPunt, test_naam: focusPunt.naam}} schema={gekoppeldSchema} student={profile} />;
}