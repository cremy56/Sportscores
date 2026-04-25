// src/components/groeiplan/GroeiplanLeerling.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import FocusPuntKaart from './FocusPuntKaart';
import { getStudentEvolutionData } from '../../utils/firebaseUtils';
import { analyseerEvolutieData } from '../../utils/analyseUtils';

// ─── API helper (zelfde patroon als rest van de app) ──────────────────────────
async function apiPost(action, body, token) {
    const response = await fetch('/api/tests', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...body }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'API fout');
    return data;
}

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
            const token = profile._token;
            const schoolId = profile.school_id;
            if (!token || !schoolId) { setLoading(false); return; }

            const evolutionData = await getStudentEvolutionData(profile.id, schoolId, token);

            // 1. Haal lijst van zwakke testen op
            const zwakkeTesten = analyseerEvolutieData(evolutionData);
            setFocusPunten(zwakkeTesten);

            if (zwakkeTesten.length > 0) {
                // 2. Zoek voor ELKE zwakke test een bijbehorend schema via API
                //    (was: directe Firestore query op 'trainingsschemas' collection)
                const schemaPromises = zwakkeTesten.map(test =>
                    apiPost('get_trainingsschema_for_test', {
                        schoolId,
                        testId: test.test_id,
                    }, token).catch(() => null) // null als er geen schema bestaat
                );

                const schemaResults = await Promise.all(schemaPromises);

                const schemas = schemaResults
                    .map((result, index) => {
                        if (result?.schema) {
                            return {
                                gekoppeldAanTestId: zwakkeTesten[index].test_id,
                                ...result.schema,
                            };
                        }
                        return null;
                    })
                    .filter(Boolean); // Verwijder null-waarden

                setGekoppeldeSchemas(schemas);
            }
            setLoading(false);
        };

        fetchData();
    }, [profile]);

    if (loading) {
        return <div className="text-center p-12">Je persoonlijke groeiplan wordt berekend...</div>;
    }

    if (focusPunten.length === 0 || gekoppeldeSchemas.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-8 text-center max-w-2xl mx-auto">
                <h3 className="text-xl font-bold text-slate-800 mb-2">Alles Ziet Er Goed Uit!</h3>
                <p className="text-slate-600">Geen specifiek focuspunt gevonden voor {profile?.naam}.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {focusPunten.map(punt => {
                const bijbehorendSchema = gekoppeldeSchemas.find(s => s.gekoppeldAanTestId === punt.test_id);
                if (!bijbehorendSchema) return null;

                return (
                    <FocusPuntKaart
                        key={punt.test_id}
                        test={{ ...punt, test_naam: punt.naam }}
                        schema={bijbehorendSchema}
                        student={profile}
                        isVerplicht={true}
                    />
                );
            })}
        </div>
    );
}