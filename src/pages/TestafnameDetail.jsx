// src/pages/TestafnameDetail.jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { TrashIcon, PencilSquareIcon, CheckIcon, XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';

function formatScore(score, eenheid) {
    if (eenheid === 'seconden' || eenheid === 'minuten') {
        const mins = Math.floor(score / 60);
        const secs = Math.round(score % 60);
        return `${mins}'${secs.toString().padStart(2, '0')}"`;
    }
    return score;
}

export default function TestafnameDetail() {
    const { groepId, testId, datum } = useParams();
    const navigate = useNavigate();
    const [details, setDetails] = useState({ groep_naam: '', test_naam: '', leerlingen: [] });
    const [loading, setLoading] = useState(true);
    const [editingScore, setEditingScore] = useState({ id: null, score: '' });

    const fetchDetails = useCallback(async () => {
        if (!groepId || !testId || !datum) return;
        setLoading(true);

        try {
            const [groupSnap, testSnap] = await Promise.all([
                getDoc(doc(db, 'groepen', groepId)),
                getDoc(doc(db, 'testen', testId)),
            ]);

            if (!groupSnap.exists() || !testSnap.exists()) {
                throw new Error("Groep of test niet gevonden");
            }

            const groupData = groupSnap.data();
            const testData = testSnap.data();
            
            const scoresQuery = query(collection(db, 'scores'), 
                where('groep_id', '==', groepId),
                where('test_id', '==', testId),
                where('datum', '==', datum)
            );
            const scoresSnap = await getDocs(scoresQuery);
            const scoresMap = new Map(scoresSnap.docs.map(d => [d.data().leerling_id, { id: d.id, ...d.data() }]));

            const leerlingIds = groupData.leerling_ids || [];
            let leerlingenData = [];
            if (leerlingIds.length > 0) {
                const leerlingenQuery = query(collection(db, 'toegestane_gebruikers'), where('__name__', 'in', leerlingIds));
                const leerlingenSnap = await getDocs(leerlingenQuery);
                leerlingenData = leerlingenSnap.docs.map(d => {
                    const scoreInfo = scoresMap.get(d.id);
                    return {
                        id: d.id,
                        naam: d.data().naam,
                        score: scoreInfo?.score ?? null,
                        punt: scoreInfo?.rapportpunt ?? null,
                        score_id: scoreInfo?.id
                    };
                });
            }
            
            setDetails({
                groep_naam: groupData.naam,
                test_naam: testData.naam,
                eenheid: testData.eenheid,
                leerlingen: leerlingenData.sort((a,b) => a.naam.localeCompare(b.naam))
            });

        } catch (error) {
            toast.error("Details konden niet worden geladen.");
            console.error(error);
        }
        setLoading(false);
    }, [groepId, testId, datum]);

    useEffect(() => { fetchDetails(); }, [fetchDetails]);

    const handleUpdateScore = async () => {
        if (!editingScore.id) return;
        
        const scoreValue = parseFloat(editingScore.score.replace(',', '.'));
        if (isNaN(scoreValue)) {
            toast.error("Voer een geldige score in.");
            return;
        }

        const scoreRef = doc(db, 'scores', editingScore.id);
        const promise = updateDoc(scoreRef, { score: scoreValue });

        toast.promise(promise, {
            loading: 'Score bijwerken...',
            success: () => {
                fetchDetails();
                setEditingScore({ id: null, score: '' });
                return "Score succesvol bijgewerkt!";
            },
            error: (err) => `Fout: ${err.message}`
        });
    };

    const handleDeleteScore = async (scoreId) => {
        if (!window.confirm("Weet je zeker dat je deze score wilt verwijderen?")) return;
        
        const promise = deleteDoc(doc(db, 'scores', scoreId));
        toast.promise(promise, {
            loading: 'Score verwijderen...',
            success: () => {
                fetchDetails();
                return "Score succesvol verwijderd!";
            },
            error: (err) => `Fout: ${err.message}`
        });
    };

    if (loading) return <p className="text-center p-8">Details laden...</p>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 p-4 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <Link to="/scores" className="flex items-center text-sm text-gray-600 hover:text-purple-700 mb-4 font-semibold">
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Terug naar overzicht
                </Link>
                <div className="bg-white/80 p-6 rounded-3xl shadow-2xl border border-white/20 backdrop-blur-lg">
                    <div className="border-b pb-4 mb-4">
                        <h1 className="text-2xl font-bold text-gray-800">{details.test_naam}</h1>
                        <p className="text-lg text-gray-600">{details.groep_naam}</p>
                        <p className="text-sm text-gray-500">{new Date(datum).toLocaleDateString('nl-BE')}</p>
                    </div>
                    
                    <ul className="space-y-2">
                        {details.leerlingen?.map(lid => (
                         <li key={lid.id} className="bg-white p-3 rounded-md shadow-sm">
                            <div className="grid grid-cols-3 items-center gap-4">
                                <span className="font-medium truncate">{lid.naam}</span>
                                <div className="text-center">
                                  {editingScore.id === lid.score_id ? (
                                    <input
                                      type="number"
                                      step="any"
                                      value={editingScore.score}
                                      onChange={e => setEditingScore({ ...editingScore, score: e.target.value })}
                                      className="w-24 p-1 border-purple-500 border-2 rounded-md text-right mx-auto"
                                      autoFocus
                                    />
                                  ) : (
                                    <span className="font-bold text-lg text-purple-700">
                                      {lid.score !== null ? formatScore(lid.score, details.eenheid) : '-'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex justify-end items-center gap-2">
                                  <span className="font-bold text-gray-600 text-sm hidden sm:inline-block whitespace-nowrap">
                                    {lid.punt !== null ? `${lid.punt} pt` : '-'}
                                  </span>
                                  <div className="flex items-center space-x-1">
                                    {editingScore.id === lid.score_id ? (
                                      <>
                                        <button onClick={handleUpdateScore} title="Opslaan" className="p-1 text-green-600"><CheckIcon className="h-5 w-5"/></button>
                                        <button onClick={() => setEditingScore({ id: null, score: '' })} title="Annuleren" className="p-1 text-red-600"><XMarkIcon className="h-5 w-5"/></button>
                                      </>
                                    ) : (
                                      <>
                                        <button onClick={() => setEditingScore({ id: lid.score_id, score: lid.score ?? '' })} title="Wijzigen" className="p-1 text-blue-600"><PencilSquareIcon className="h-5 w-5"/></button>
                                        {lid.score !== null && (
                                          <button onClick={() => handleDeleteScore(lid.score_id)} title="Verwijderen" className="p-1 text-red-500"><TrashIcon className="h-5 w-5"/></button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                            </div>
                        </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
