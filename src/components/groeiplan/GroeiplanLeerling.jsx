// src/components/groeiplan/GroeiplanLeerling.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getStudentEvolutionData } from '../../utils/firebaseUtils';
import { analyseerEvolutieData } from '../utils/analyseUtils';
import FocusPuntKaart from './FocusPuntKaart';

export default function GroeiplanLeerling() {
    const { profile } = useOutletContext();
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
                <p className="text-slate-600">We hebben geen specifiek focuspunt voor je gevonden. Blijf zo doorgaan!</p>
            </div>
        );
    }
    
    // We geven hier ook de 'profile' mee, zodat de kaart weet voor welke leerling het is.
    return <FocusPuntKaart test={focusPunt} schema={gekoppeldSchema} student={profile} />;
}