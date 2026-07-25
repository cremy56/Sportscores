// src/components/groeiplan/GroeiplanLeerling.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import FocusPuntKaart from './FocusPuntKaart';
import { analyseerEvolutieData } from '../../utils/analyseUtils';
import { apiCall } from '../../utils/api';

// Dunne wrapper rond de centrale apiCall(): vers token per call + 401-refresh
// + 429-toast. Verving de eigen fetch + doorgegeven token.
const apiPost = (action, body) => apiCall('/api/tests', { action, ...body });

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
            const schoolId = profile.school_id;
            if (!schoolId) { setLoading(false); return; }

            // Was: getStudentEvolutionData() uit firebaseUtils — een API-wrapper
            // die de datum-strings naar Date-objecten converteerde. Die conversie
            // doen we hier zelf, anders krijgt analyseerEvolutieData strings.
            const evoResult = await apiCall('/api/tests', {
                action: 'get_student_evolution', leerlingId: profile.id, schoolId
            });
            const evolutionData = (evoResult.evolutionData || []).map(test => ({
                ...test,
                all_scores: (test.all_scores || []).map(sc => ({
                    ...sc,
                    datum: sc.datum ? new Date(sc.datum) : new Date()
                })),
                personal_best_datum: test.personal_best_datum ? new Date(test.personal_best_datum) : null
            }));

            // 1. Haal lijst van zwakke testen op
            const zwakkeTesten = analyseerEvolutieData(evolutionData);
            setFocusPunten(zwakkeTesten);

            if (zwakkeTesten.length > 0) {
                // 2. Zoek voor ELKE zwakke test een bijbehorend schema via API
                const schemaPromises = zwakkeTesten.map(test =>
                    apiPost('get_trainingsschema_for_test', {
                        schoolId,
                        testId: test.test_id,
                    }).catch(() => null) // null als er geen schema bestaat
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