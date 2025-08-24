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
        if (!profile) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setFocusPunt(null);
            setGekoppeldSchema(null);
            
            console.log(`--- START GROEIPLAN BEREKENING VOOR: ${profile.naam} ---`);
            
            // Gebruik het juiste ID veld - waarschijnlijk email
            const profileIdentifier = profile.id || profile.email;
            
            if (!profileIdentifier) {
                console.error('Geen geldige profile identifier gevonden:', profile);
                setLoading(false);
                return;
            }

            const scoresQuery = query(
                collection(db, 'scores'),
                where('leerling_id', '==', profileIdentifier)
            );
            const scoresSnapshot = await getDocs(scoresQuery);
            const allScores = scoresSnapshot.docs.map(doc => doc.data());

            console.log('Stap 1: Alle scores gevonden:', allScores);

            if (allScores.length > 0) {
                const scoresMetPunt = allScores.filter(score => 
                    score.rapportpunt !== null && score.rapportpunt !== undefined
                );

                console.log('Stap 2: Scores met een geldig rapportpunt:', scoresMetPunt);

                if (scoresMetPunt.length > 0) {
                    const sortedByPunt = scoresMetPunt.sort((a, b) => a.rapportpunt - b.rapportpunt);
                    const zwaksteScore = sortedByPunt[0];

                    console.log('Stap 3: Zwakste score gevonden:', zwaksteScore);
                    
                    if (zwaksteScore && zwaksteScore.rapportpunt <= 10) {
                        console.log(`Stap 4: SUCCES - Zwakste score (${zwaksteScore.rapportpunt}) is <= 10. Zoeken naar schema voor test ID: ${zwaksteScore.test_id}`);
                        
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
                                console.log('Stap 5: SUCCES - Gekoppeld schema gevonden:', schemaDoc.data().naam);
                            } else {
                                console.log(`Stap 5: FOUT - Geen schema gevonden met gekoppelde_test_id: ${zwaksteScore.test_id}`);
                            }
                        }
                    } else {
                        console.log(`Stap 4: FOUT - Zwakste score (${zwaksteScore?.rapportpunt}) is NIET <= 10.`);
                    }
                }
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