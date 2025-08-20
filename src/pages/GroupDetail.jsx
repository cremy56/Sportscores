// src/pages/GroupDetail.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import { TrashIcon, PlusIcon, ArrowLeftIcon, UserPlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/solid';

// --- HELPER FUNCTIE: Bepaal start/eind van het schooljaar ---
function getSchoolYear(date) {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    
    // Schooljaar loopt van 1 september tot 31 augustus
    const startYear = month >= 8 ? year : year - 1; // Als het sep of later is, start het schooljaar dit jaar. Anders vorig jaar.
    
    return {
        start: new Date(startYear, 8, 1), // 1 september
        end: new Date(startYear + 1, 7, 31, 23, 59, 59) // 31 augustus
    };
}


// --- Modal om leerlingen toe te voegen ---
function AddStudentModal({ group, isOpen, onClose, onStudentAdded }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchTerm.length < 2 || !group?.school_id) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const searchTermLower = searchTerm.toLowerCase();
        const usersRef = collection(db, 'toegestane_gebruikers');
        
        const q = query(
          usersRef,
          where('school_id', '==', group.school_id),
          where('rol', '==', 'leerling'),
          where('naam_keywords', 'array-contains', searchTermLower)
        );

        const querySnapshot = await getDocs(q);
        const results = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(student => !group.leerling_ids.includes(student.id));
        
        setSearchResults(results);
      } catch (error) {
        console.error("Fout bij zoeken naar leerlingen:", error);
        toast.error("Kon niet zoeken naar leerlingen.");
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, group]);

  const handleAddStudent = async (student) => {
    const groupRef = doc(db, 'groepen', group.id);
    try {
      await updateDoc(groupRef, {
        leerling_ids: arrayUnion(student.id)
      });
      toast.success('Leerling toegevoegd!');
      onStudentAdded();
      setSearchTerm('');
      setSearchResults([]);
    } catch (error) {
      console.error("Fout bij toevoegen leerling:", error);
      toast.error("Kon leerling niet toevoegen.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20 w-full max-w-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Leerling Toevoegen</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Zoek op voor- of achternaam..."
          className="w-full px-4 py-3 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
        />
        
        <div className="mt-6 max-h-60 overflow-y-auto">
          {loading && <p className="text-center text-gray-500 py-4">Zoeken...</p>}
          {!loading && searchResults.length > 0 && (
            <ul className="space-y-2">
              {searchResults.map(student => (
                <li key={student.id} className="flex justify-between items-center p-3 bg-gray-50/70 rounded-lg">
                  <span>{student.naam}</span>
                  <button onClick={() => handleAddStudent(student)} className="text-purple-600 hover:text-purple-800 p-1 rounded-full hover:bg-purple-100">
                    <UserPlusIcon className="h-6 w-6" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!loading && searchTerm.length > 1 && searchResults.length === 0 && <p className="text-center text-gray-600 py-4">Geen leerlingen gevonden.</p>}
        </div>
      </div>
    </div>
  );
}

// --- Hoofdcomponent ---
export default function GroupDetail() {
  const { groepId } = useParams();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  
  // AANGEPAST: State voor de scores en laadstatus
  const [scoresByLeerling, setScoresByLeerling] = useState(new Map());
  const [loadingScores, setLoadingScores] = useState(true);

  const fetchGroupData = useCallback(async () => {
    if (!groepId) return;
    setLoading(true);
    const groupRef = doc(db, 'groepen', groepId);
    
    try {
      const docSnap = await getDoc(groupRef);
      if (docSnap.exists()) {
        const groupData = { id: docSnap.id, ...docSnap.data() };
        setGroup(groupData);

        if (groupData.leerling_ids && groupData.leerling_ids.length > 0) {
          const membersPromises = groupData.leerling_ids.map(id => getDoc(doc(db, 'toegestane_gebruikers', id)));
          const membersDocs = await Promise.all(membersPromises);
          const membersData = membersDocs
            .filter(doc => doc.exists())
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a,b) => a.naam.localeCompare(b.naam)); // Sorteer leerlingen op naam
          setMembers(membersData);
        } else {
          setMembers([]);
        }
      } else {
        toast.error("Groep niet gevonden.");
      }
    } catch (error) {
      toast.error("Groepsdetails konden niet worden geladen.");
      console.error(error);
    }
    setLoading(false);
  }, [groepId]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);
  
  // AANGEPAST: Nieuwe useEffect om scores op te halen zodra de leden bekend zijn
  useEffect(() => {
    const fetchScoresForGroup = async () => {
        if (members.length === 0) {
            setLoadingScores(false);
            return;
        }

        setLoadingScores(true);
        try {
            const leerlingIds = members.map(m => m.id);
            const schoolYear = getSchoolYear(new Date());

            // Haal alle scores op voor de hele groep in dit schooljaar
            const scoresQuery = query(collection(db, 'scores'),
                where('leerling_id', 'in', leerlingIds),
                where('datum', '>=', schoolYear.start),
                where('datum', '<=', schoolYear.end)
            );
            const scoresSnapshot = await getDocs(scoresQuery);
            const scoresData = scoresSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            // Haal de namen van de testen op
            const testIds = [...new Set(scoresData.map(s => s.test_id))];
            let testNamen = new Map();
            if (testIds.length > 0) {
                const testenQuery = query(collection(db, 'testen'), where('__name__', 'in', testIds));
                const testenSnapshot = await getDocs(testenQuery);
                testenSnapshot.docs.forEach(d => testNamen.set(d.id, d.data().naam));
            }
            
            // Groepeer scores per leerling
            const scoresMap = new Map();
            scoresData.forEach(score => {
                const leerlingScores = scoresMap.get(score.leerling_id) || [];
                scoresMap.set(score.leerling_id, [
                    ...leerlingScores, 
                    { 
                        ...score, 
                        test_naam: testNamen.get(score.test_id) || 'Onbekende Test' 
                    }
                ]);
            });

            setScoresByLeerling(scoresMap);
        } catch (error) {
            console.error("Fout bij ophalen scores:", error);
            toast.error("Kon de testgeschiedenis niet laden.");
        } finally {
            setLoadingScores(false);
        }
    };

    fetchScoresForGroup();
  }, [members]);


  const handleRemoveStudent = async (studentId) => {
    const groupRef = doc(db, 'groepen', groepId);
    try {
      await updateDoc(groupRef, {
        leerling_ids: arrayRemove(studentId)
      });
      toast.success('Leerling verwijderd!');
      fetchGroupData();
    } catch (error) {
      console.error("Fout bij verwijderen leerling:", error);
      toast.error("Kon leerling niet verwijderen.");
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="text-gray-700 font-medium">Groepsdetails laden...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 pt-20 pb-6 lg:px-8 lg:pt-24 lg:pb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 text-center p-12 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Groep niet gevonden</h3>
            <p className="text-gray-600 mb-4">De opgevraagde groep bestaat niet of u heeft geen toegang.</p>
            <Link to="/groepsbeheer" className="inline-flex items-center text-purple-600 hover:text-purple-700">
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Terug naar groepenoverzicht
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />
      <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 pt-20 pb-6 lg:px-8 lg:pt-24 lg:pb-8">
          
          <div className="lg:hidden mb-8">
            <div className="flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <Link to="/groepsbeheer" className="inline-flex items-center text-gray-600 hover:text-purple-700 mb-2 group">
                  <ArrowLeftIcon className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" />
                  <span className="text-sm">Terug</span>
                </Link>
                <h1 className="text-2xl font-bold text-gray-800 truncate">{group.naam}</h1>
              </div>
              <button
                onClick={() => setIsAddStudentModalOpen(true)}
                className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded-full shadow-lg ml-4"
              >
                <PlusIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="hidden lg:block mb-12">
            <Link to="/groepsbeheer" className="inline-flex items-center text-gray-600 hover:text-purple-700 mb-6 group">
              <ArrowLeftIcon className="h-5 w-5 mr-2 transition-transform group-hover:-translate-x-1" />
              Terug naar groepenoverzicht
            </Link>
            <div className="flex justify-between items-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{group.naam}</h1>
              <button
                onClick={() => setIsAddStudentModalOpen(true)}
                className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105"
              >
                <PlusIcon className="h-6 w-6" />
                <span className="ml-2">Leerling Toevoegen</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
            <h2 className="font-bold text-xl text-gray-800 mb-6">Groepsleden ({members.length})</h2>
            <div className="flow-root">
              <ul className="-my-4 divide-y divide-gray-200">
                {members.length > 0 ? (
                  members.map((lid) => {
                    const afgenomenTesten = scoresByLeerling.get(lid.id) || [];
                    return (
                        <li key={lid.id} className="flex items-center py-4 space-x-4">
                            <div className="flex-1 min-w-0">
                                <p className="text-md font-medium text-gray-900 truncate">{lid.naam}</p>
                      
                                {/* AANGEPAST: Weergave van afgenomen testen */}
                                {loadingScores ? (
                                    <p className="text-xs text-gray-400 mt-2">Testgeschiedenis laden...</p>
                                ) : (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {afgenomenTesten.length > 0 ? (
                                            afgenomenTesten.map(score => (
                                                <span key={score.id} className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full font-medium">
                                                    {score.test_naam} ({score.datum.toDate().toLocaleDateString('nl-BE')})
                                                </span>
                                            ))
                                        ) : (
                                            <p className="text-xs text-gray-500 italic">Nog geen testen afgenomen dit schooljaar.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={() => handleRemoveStudent(lid.id)} 
                                className="p-2 text-gray-500 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
                            >
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </li>
                    );
                  })
                ) : (
                  <li className="text-center text-gray-500 py-12">
                    <div className="mb-4">
                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UserPlusIcon className="w-8 h-8 text-purple-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">Geen Groepsleden</h3>
                      <p className="text-gray-600">Deze groep heeft nog geen leden. Voeg leerlingen toe om te beginnen.</p>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <AddStudentModal 
        group={group}
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        onStudentAdded={fetchGroupData}
      />
    </>
  );
}