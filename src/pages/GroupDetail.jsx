// src/pages/GroupDetail.jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import { TrashIcon, PlusIcon, ArrowLeftIcon, UserPlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

// --- Modal om leerlingen toe te voegen ---
function AddStudentModal({ group, isOpen, onClose, onStudentAdded }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchTerm.length < 2) {
      toast.error('Voer minstens 2 karakters in om te zoeken.');
      return;
    }
    setLoading(true);
    try {
      const usersRef = collection(db, 'toegestane_gebruikers');
      // Zoek naar leerlingen op naam (case-insensitive)
      const q = query(usersRef, 
        where('rol', '==', 'leerling'),
        where('naam', '>=', searchTerm),
        where('naam', '<=', searchTerm + '\uf8ff')
      );
      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        // Filter leerlingen die al in de groep zitten
        .filter(student => !group.leerling_ids.includes(student.id));
        
      setSearchResults(results);
    } catch (error) {
      console.error("Fout bij zoeken naar leerlingen:", error);
      toast.error("Kon niet zoeken naar leerlingen.");
    }
    setLoading(false);
  };

  const handleAddStudent = async (studentId) => {
    const groupRef = doc(db, 'groepen', group.id);
    try {
      await updateDoc(groupRef, {
        leerling_ids: arrayUnion(studentId)
      });
      toast.success('Leerling toegevoegd!');
      onStudentAdded(); // Herlaad de groepsdata
      // Reset de zoekresultaten en het zoekveld
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
        <form onSubmit={handleSearch}>
          <div className="flex gap-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Zoek op naam..."
              className="flex-grow px-4 py-3 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
            />
            <button type="submit" className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-2xl shadow-lg">
              Zoek
            </button>
          </div>
        </form>
        <div className="mt-6 max-h-60 overflow-y-auto">
          {loading && <p>Zoeken...</p>}
          {!loading && searchResults.length > 0 && (
            <ul className="space-y-2">
              {searchResults.map(student => (
                <li key={student.id} className="flex justify-between items-center p-3 bg-gray-50/70 rounded-lg">
                  <span>{student.naam}</span>
                  <button onClick={() => handleAddStudent(student.id)} className="text-purple-600 hover:text-purple-800 p-1 rounded-full hover:bg-purple-100">
                    <UserPlusIcon className="h-6 w-6" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!loading && searchTerm && searchResults.length === 0 && <p className="text-center text-gray-600 py-4">Geen leerlingen gevonden die nog niet in de groep zitten.</p>}
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

  const fetchGroupData = useCallback(async () => {
    if (!groepId) return;
    const groupRef = doc(db, 'groepen', groepId);
    
    try {
      const docSnap = await getDoc(groupRef);
      if (docSnap.exists()) {
        const groupData = { id: docSnap.id, ...docSnap.data() };
        setGroup(groupData);

        if (groupData.leerling_ids && groupData.leerling_ids.length > 0) {
          const membersPromises = groupData.leerling_ids.map(id => getDoc(doc(db, 'toegestane_gebruikers', id)));
          const membersDocs = await Promise.all(membersPromises);
          const membersData = membersDocs.filter(doc => doc.exists()).map(doc => ({ id: doc.id, ...doc.data() }));
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
    setLoading(true);
    fetchGroupData();
  }, [fetchGroupData]);

  const handleRemoveStudent = async (studentId) => {
    const groupRef = doc(db, 'groepen', groepId);
    try {
      await updateDoc(groupRef, {
        leerling_ids: arrayRemove(studentId)
      });
      toast.success('Leerling verwijderd!');
      fetchGroupData(); // Herlaad de data
    } catch (error) {
      console.error("Fout bij verwijderen leerling:", error);
      toast.error("Kon leerling niet verwijderen.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="text-lg font-medium text-gray-700">Groepsdetails laden...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return <div className="text-center p-8">Groep niet gevonden.</div>;
  }

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <Link to="/groepsbeheer" className="inline-flex items-center text-gray-600 hover:text-purple-700 mb-6 group">
            <ArrowLeftIcon className="h-5 w-5 mr-2 transition-transform group-hover:-translate-x-1" />
            Terug naar groepenoverzicht
          </Link>
          
          <div className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h1 className="text-3xl font-bold text-gray-900">{group.naam}</h1>
              <button
                onClick={() => setIsAddStudentModalOpen(true)}
                className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded-full sm:px-5 sm:py-3 sm:rounded-2xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105"
              >
                <PlusIcon className="h-6 w-6" />
                <span className="hidden sm:inline sm:ml-2">Leerling Toevoegen</span>
              </button>
            </div>
            
            <h2 className="font-bold text-xl text-gray-800 mb-4">Groepsleden</h2>
            <div className="flow-root">
              <ul className="-my-4 divide-y divide-gray-200/70">
                {members.length > 0 ? (
                  members.map((lid) => (
                    <li key={lid.id} className="flex items-center py-4 space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-md font-medium text-gray-900 truncate">{lid.naam}</p>
                        <p className="text-sm text-gray-500 truncate">{lid.email}</p>
                      </div>
                      <button onClick={() => handleRemoveStudent(lid.id)} className="p-2 text-gray-500 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="text-center text-gray-500 py-8">
                    Deze groep heeft nog geen leden. Voeg leerlingen toe om te beginnen.
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
