// src/pages/TestafnameDetail.jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { TrashIcon, PencilSquareIcon, CheckIcon, XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';

function formatSecondsToMinutes(seconds) {
  if (seconds == null) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}'${secs.toString().padStart(2, '0')}`;
}

export default function TestafnameDetail() {
    const { groepId, testId, datum } = useParams();
    const navigate = useNavigate();
    const [details, setDetails] = useState({ groep_naam: '', test_naam: '', leerlingen: [] });
    const [loading, setLoading] = useState(true);
    const [editingScore, setEditingScore] = useState({ leerling_id: null, score: '' });
const [isEditingDate, setIsEditingDate] = useState(false);
    const [newDate, setNewDate] = useState(datum);

    const fetchDetails = useCallback(async () => {
        if (!groepId || !testId || !datum) return;
        setLoading(true);

        const [groupRes, testRes] = await Promise.all([
            supabase.rpc('get_single_group_with_members', { p_groep_id: groepId }),
            supabase.from('testen').select('naam, eenheid, max_punten').eq('id', testId).single(),
        ]);
        
        const { data: scoresData, error: scoresError } = await supabase.from('scores')
            .select('leerling_id, score')
            .eq('test_id', testId)
            .eq('datum', datum);

        if (groupRes.error || testRes.error || scoresError) {
            toast.error("Details van testafname konden niet worden geladen.");
        } else {
            const scoresMap = (scoresData || []).reduce((acc, s) => { acc[s.leerling_id] = s.score; return acc; }, {});
            
            const pointPromises = (groupRes.data[0]?.leden || []).map(lid => {
                const score = scoresMap[lid.leerling_id];
                if (score !== null && score !== undefined) {
                    return supabase.rpc('get_punt_for_score', {
                        p_leerling_id: lid.leerling_id,
                        p_test_id: testId,
                        p_score: score,
                        p_test_datum: datum
                    });
                }
                return Promise.resolve({ data: null });
            });

            const pointResults = await Promise.all(pointPromises);

            const leerlingenMetScoresEnPunten = (groupRes.data[0]?.leden || []).map((lid, index) => ({
                ...lid, 
                score: scoresMap[lid.leerling_id] ?? null,
                punt: pointResults[index].data
            }));
            
            setDetails({
                groep_naam: groupRes.data[0]?.groep_naam,
                test_naam: testRes.data?.naam,
                eenheid: testRes.data?.eenheid,
                max_punten: testRes.data?.max_punten,
                leerlingen: leerlingenMetScoresEnPunten
            });
        }
        setLoading(false);
    }, [groepId, testId, datum]);

    useEffect(() => { fetchDetails(); }, [fetchDetails]);

    const handleUpdateScore = async () => {
        const scoreValue = editingScore.score;
        if (scoreValue === '' || isNaN(Number(scoreValue))) {
            toast.error("Voer een geldige score in.");
            return;
        }
        const { error } = await supabase.from('scores')
            .update({ score: Number(scoreValue) })
            .eq('leerling_id', editingScore.leerling_id)
            .eq('test_id', testId)
            .eq('datum', datum);
        
        if (error) {
            toast.error(`Fout bij bijwerken: ${error.message}`);
        } else {
            toast.success("Score succesvol bijgewerkt!");
            fetchDetails();
        }
        setEditingScore({ leerling_id: null, score: '' });
    };

    const handleDeleteScore = async (leerlingId) => {
        if (!window.confirm("Weet je zeker dat je deze score wilt verwijderen?")) return;
        const { error } = await supabase.from('scores').delete()
            .eq('leerling_id', leerlingId)
            .eq('test_id', testId)
            .eq('datum', datum);
        if (error) {
            toast.error(`Fout bij verwijderen: ${error.message}`);
        } else {
            toast.success("Score succesvol verwijderd!");
            fetchDetails();
        }
    };
const handleUpdateEvaluationDate = async () => {
        if (newDate === datum) {
            setIsEditingDate(false);
            return; // Geen wijziging nodig
        }

        const promise = supabase.rpc('update_evaluation_date', {
            p_groep_id: groepId,
            p_test_id: testId,
            p_old_datum: datum,
            p_new_datum: newDate
        });

        toast.promise(promise, {
            loading: 'Datum bijwerken...',
            success: () => {
                setIsEditingDate(false);
                // Stuur de gebruiker door naar de nieuwe URL met de bijgewerkte datum
                navigate(`/testafname/${groepId}/${testId}/${newDate}`);
                return "Datum succesvol bijgewerkt!";
            },
            error: (err) => `Fout: ${err.message}`
        });
    };
    if (loading) return <p>Details laden...</p>;
    if (!details.groep_naam) return <div><p>Testafname niet gevonden.</p><Link to="/scores">Terug</Link></div>;

    return (
        <div className="max-w-4xl mx-auto">
            <Link to="/scores" className="flex items-center text-sm text-gray-600 hover:text-purple-700 mb-4 font-semibold">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Terug naar score overzicht
            </Link>
            <div className="bg-white/60 p-6 rounded-2xl shadow-xl border border-white/30 backdrop-blur-lg">
                
                {/* --- VERBETERDE HEADER LAYOUT --- */}
                <div className="flex justify-between items-center mb-2">
                    <h1 className="text-2xl font-bold">{details.test_naam}</h1>
                    {!isEditingDate && (
                        <button onClick={() => { setIsEditingDate(true); setNewDate(datum); }} title="Datum wijzigen" className="text-blue-600 bg-transparent hover:text-blue-800">
                            <PencilSquareIcon className="h-5 w-5"/>
                        </button>
                    )}
                </div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl text-gray-600">{details.groep_naam}</h2>
                    {isEditingDate ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                className="p-1 border rounded-md shadow-sm"
                            />
                            <button onClick={handleUpdateEvaluationDate} title="Opslaan" className="text-green-600"><CheckIcon className="h-6 w-6"/></button>
                            <button onClick={() => setIsEditingDate(false)} title="Annuleren" className="text-red-600"><XMarkIcon className="h-6 w-6"/></button>
                        </div>
                    ) : (
                        <h2 className="text-xl text-gray-600">{new Date(datum).toLocaleDateString('nl-BE')}</h2>
                    )}
                </div>
                {/* ----------------------------- */}
                <ul className="space-y-2">
                    {details.leerlingen?.map(lid => (
                        <li key={lid.leerling_id} className="bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-md shadow-sm min-h-[56px] gap-2"
>                            <span className="font-medium truncate w-full sm:w-1/3">{lid.naam}</span>

                            <div className="text-center w-full sm:w-1/3">
                                {editingScore.leerling_id === lid.leerling_id ? (
                                    <input
                                    type="number"
                                    step="any"
                                    value={editingScore.score}
                                    onChange={e => setEditingScore({...editingScore, score: e.target.value})}
                                    className="w-24 p-1 border-purple-500 c border-2 rounded-md text-right mx-auto"
                                    autoFocus
                                    />
                                ) : (
                                    <span className="font-bold text-lg text-purple-700">
                                    {lid.score !== null
                                        ? details.test_naam === '5km loop'
                                        ? formatSecondsToMinutes(lid.score)
                                        : lid.score
                                        : '-'} {lid.score !== null ? details.eenheid : ''}
                                    </span>
                                )}
                                </div>

                                {/* Punt + Acties */}
                         <div className="w-full sm:w-1/3 flex justify-between items-center">
                            <span className="font-bold text-gray-600 text-sm whitespace-nowrap">
                                {lid.punt !== null ? `${lid.punt}/${details.max_punten || 20}` : '-'}
                            </span>

                          {/* Acties */}   
                            <div className="flex items-center space-x-1">
                             {editingScore.leerling_id === lid.leerling_id ? (
                               <>
                                <button
                                onClick={handleUpdateScore}
                                title="Opslaan"
                                className="p-0 m-0 text-green-600 bg-transparent hover:text-green-800"
                                >
                                <CheckIcon className="h-5 w-5" />
                                </button>
                                <button
                                onClick={() => setEditingScore({ leerling_id: null, score: '' })}
                                title="Annuleren"
                                className="p-0 m-0 text-red-600 bg-transparent hover:text-red-800"
                                >
                                <XMarkIcon className="h-5 w-5" />
                                </button>
                            </>
                            ) : (
                            <>
                                <button
                                onClick={() =>
                                    setEditingScore({ leerling_id: lid.leerling_id, score: lid.score ?? '' })
                                }
                                title="Wijzigen"
                                className="p-0 m-0 text-blue-600 bg-transparent hover:text-blue-800"
                                >
                                <PencilSquareIcon className="h-5 w-5" />
                                </button>
                                {lid.score !== null && (
                                <button
                                    onClick={() => handleDeleteScore(lid.leerling_id)}
                                    title="Verwijderen"
                                    className="p-0 m-0 text-red-500 bg-transparent hover:text-red-700"
                                >
                                    <TrashIcon className="h-5 w-5" />
                                </button>
        )}
      </>
    )}
  </div>
</div>


                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
