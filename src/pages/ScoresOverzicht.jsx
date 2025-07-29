// src/pages/ScoresOverzicht.jsx
import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase'; // auth hier importeren
import { collection, query, where, getDocs, writeBatch, doc, getDoc } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import { TrashIcon, PlusIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import ConfirmModal from '../components/ConfirmModal';

export default function ScoresOverzicht() {
  const { profile } = useOutletContext();
  const [evaluaties, setEvaluaties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ type: null, data: null });
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = auth.currentUser;
    // Wacht tot zowel het profiel als de ingelogde gebruiker beschikbaar zijn.
    if (!profile?.school_id || !currentUser) {
        setLoading(false);
        return;
    };

    const fetchEvaluaties = async () => {
        setLoading(true);
        try {
            const scoresRef = collection(db, 'scores');
            // --- GECORRIGEERDE QUERY ---
            // Gebruik auth.currentUser.uid in plaats van profile.id
            const q = query(
                scoresRef, 
                where('school_id', '==', profile.school_id),
                where('leerkracht_id', '==', currentUser.uid)
            );

            const scoresSnapshot = await getDocs(q);
            const scoresData = scoresSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));

            const grouped = scoresData.reduce((acc, score) => {
                const key = `${score.groep_id}-${score.test_id}-${score.datum}`;
                if (!acc[key]) {
                    acc[key] = {
                        groep_id: score.groep_id,
                        test_id: score.test_id,
                        datum: score.datum,
                        groep_naam: 'Laden...', 
                        test_naam: 'Laden...',
                        score_ids: []
                    };
                }
                acc[key].score_ids.push(score.id);
                return acc;
            }, {});

            const uniekeEvaluaties = Object.values(grouped);

            if (uniekeEvaluaties.length === 0) {
                setEvaluaties([]);
                setLoading(false);
                return;
            }

            const groepIds = [...new Set(uniekeEvaluaties.map(e => e.groep_id))];
            const testIds = [...new Set(uniekeEvaluaties.map(e => e.test_id))];

            // Voorkom fouten als er geen IDs zijn om op te zoeken
            const [groepenDocs, testenDocs] = await Promise.all([
                groepIds.length > 0 ? Promise.all(groepIds.map(id => getDoc(doc(db, 'groepen', id)))) : [],
                testIds.length > 0 ? Promise.all(testIds.map(id => getDoc(doc(db, 'testen', id)))) : []
            ]);

            const groepenMap = new Map(groepenDocs.map(d => [d.id, d.data()?.naam]));
            const testenMap = new Map(testenDocs.map(d => [d.id, d.data()?.naam]));

            uniekeEvaluaties.forEach(ev => {
                ev.groep_naam = groepenMap.get(ev.groep_id) || 'Onbekende Groep';
                ev.test_naam = testenMap.get(ev.test_id) || 'Onbekende Test';
            });

            uniekeEvaluaties.sort((a, b) => new Date(b.datum) - new Date(a.datum));
            
            setEvaluaties(uniekeEvaluaties);

        } catch (error) {
            console.error("Fout bij laden testafnames:", error);
            toast.error("Kon recente testafnames niet laden.");
        } finally {
            setLoading(false);
        }
    };

    fetchEvaluaties();
  }, [profile]); // useEffect blijft afhankelijk van het profiel

  const handleDelete = async () => {
    if (!modal.data) return;
    
    const loadingToast = toast.loading('Testafname verwijderen...');
    try {
        const batch = writeBatch(db);
        modal.data.score_ids.forEach(scoreId => {
            const docRef = doc(db, 'scores', scoreId);
            batch.delete(docRef);
        });
        await batch.commit();
        
        setEvaluaties(prev => prev.filter(ev => 
            !(ev.test_id === modal.data.test_id && ev.groep_id === modal.data.groep_id && ev.datum === modal.data.datum)
        ));
        toast.success("Testafname succesvol verwijderd.");
    } catch (error) {
        toast.error("Verwijderen mislukt.");
        console.error("Fout bij verwijderen:", error);
    } finally {
        toast.dismiss(loadingToast);
        setModal({ type: null, data: null });
    }
  };

  if (loading) {
    return <div className="text-center p-8">Laden...</div>;
  }

  return (
    <>
        <Toaster position="top-center" />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 p-4 lg:p-8">
            <div className="max-w-7xl mx-auto mb-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                        Scores & Testafnames
                    </h1>
                    <button
                        onClick={() => navigate('/nieuwe-testafname')}
                        className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded-full sm:px-5 sm:py-3 sm:rounded-2xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105"
                    >
                        <PlusIcon className="h-6 w-6" />
                        <span className="hidden sm:inline sm:ml-2">Nieuwe Afname</span>
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto">
                <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                    <ul className="divide-y divide-gray-200/70">
                        {evaluaties.length > 0 ? evaluaties.map((item, index) => (
                         <li key={index} className="group">
                             <div 
                                onClick={() => navigate(`/testafname/${item.groep_id}/${item.test_id}/${item.datum}`)}
                                className="flex items-center justify-between p-4 sm:p-6 cursor-pointer hover:bg-purple-50/50 transition-colors"
                            >
                                <div>
                                    <p className="font-semibold text-lg text-gray-900 group-hover:text-purple-700">{item.test_naam}</p>
                                    <p className="text-sm text-gray-600">{item.groep_naam}</p>
                                </div>
                                <div className="flex items-center gap-4 text-right">
                                    <p className="text-sm text-gray-500 whitespace-nowrap hidden sm:block">
                                        {new Date(item.datum).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </p>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setModal({ type: 'confirm', data: item });
                                        }}
                                        className="p-2 text-gray-400 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
                                        title="Verwijder testafname"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                    <ChevronRightIcon className="h-6 w-6 text-gray-400 group-hover:text-purple-700 transition-transform group-hover:translate-x-1" />
                                </div>
                            </div>
                        </li>
                        )) : (
                          <li className="text-center text-gray-500 p-12">
                              <h3 className="text-xl font-semibold mb-2">Geen Testafnames Gevonden</h3>
                              <p>Er zijn nog geen scores ingevoerd. Klik op "+ Nieuwe Afname" om te beginnen.</p>
                          </li>
                        )}
                    </ul>
                </div>
            </div>
        </div>

        <ConfirmModal
            isOpen={modal.type === 'confirm'}
            onClose={() => setModal({ type: null, data: null })}
            onConfirm={handleDelete}
            title="Testafname Verwijderen"
        >
            Weet u zeker dat u deze testafname en alle bijbehorende scores wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
        </ConfirmModal>
    </>
  );
}
