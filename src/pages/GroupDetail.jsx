// src/pages/GroupDetail.jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { TrashIcon, PlusCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import AddStudentToGroupModal from '../components/AddStudentToGroupModal';
import ConfirmModal from '../components/ConfirmModal';

export default function GroupDetail() {
  const { groepId } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState(null);

  const fetchGroupData = useCallback(async () => {
    if (!groepId) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('get_single_group_with_members', { p_groep_id: groepId });
    if (error) {
      toast.error("Groepsdetails konden niet worden geladen.");
      console.error(error);
    } else if (data && data.length > 0) {
      setGroup(data[0]);
    }
    setLoading(false);
  }, [groepId]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  // --- HIER STAAN DE FUNCTIES NU CORRECT OP HET HOOFDNIVEAU ---

  // Deze functie opent de modal en onthoudt wie we willen verwijderen
  const handleRemoveClick = (leerling) => {
    setStudentToRemove(leerling);
    setIsConfirmModalOpen(true);
  };

  // Deze functie wordt uitgevoerd als we in de modal op 'Bevestigen' klikken
  const handleConfirmRemove = async () => {
    if (!studentToRemove) return;

    const promise = supabase.rpc('remove_student_from_group', {
      p_groep_id: groepId,
      p_leerling_id: studentToRemove.leerling_id
    });
    
    toast.promise(promise, {
        loading: 'Bezig met verwijderen...',
        success: () => {
            fetchGroupData(); // Herlaad de data
            return `Leerling '${studentToRemove.naam}' verwijderd.`;
        },
        error: (err) => `Fout: ${err.message}`
    });

    // Sluit de modal en reset de state
    setIsConfirmModalOpen(false);
    setStudentToRemove(null);
  };

  // -----------------------------------------------------------

  if (loading || !group) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white/60 p-6 rounded-2xl shadow-xl border border-white/30 backdrop-blur-lg text-center">
        {loading ? <p className="text-gray-600">Laden...</p> : <p className="text-red-600">Groep niet gevonden.</p>}
      </div>
    </div>
  );
}

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-6 py-10">
      <Link to="/groepsbeheer" className="flex items-center text-sm text-gray-600 hover:text-purple-700 mb-4">
  <ArrowLeftIcon className="h-4 w-4 mr-1" />
  Terug naar groepenoverzicht
</Link>
      
      <div className="bg-white/60 p-6 rounded-2xl shadow-xl border border-white/30 backdrop-blur-lg">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">{group.groep_naam}</h1>
         <button
  onClick={() => setIsAddStudentModalOpen(true)}
  className="flex items-center justify-center bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg
             p-2 md:px-4 md:py-2"
  aria-label="Leerling toevoegen"
  title="Leerling toevoegen"
>
  {/* Plus icoon */}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6 md:mr-2"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>

  {/* Tekst alleen op md en groter tonen */}
  <span className="hidden md:inline">Leerling Toevoegen</span>
</button>

        </div>
        
        <h2 className="font-bold text-lg mb-2">Groepsleden</h2>
        <ul className="space-y-2">
          {group.leden && group.leden.length > 0 ? (
  group.leden.map((lid) => (
    <li key={lid.leerling_id} className="bg-white flex justify-between items-center flex-wrap gap-2 p-3 rounded-md shadow-sm">
      <span className="font-medium">{lid.naam}</span>
      <button onClick={() => handleRemoveClick(lid)} className="text-red-500 bg-transparent hover:text-red-700">
        <TrashIcon className="h-6 w-6" />
      </button>
    </li>
  ))
) : (
  <li className="text-center text-gray-500 py-4 w-full">Klik op '+ Leerling Toevoegen' om te beginnen.</li>
)}
        </ul>
        
        
      </div>

      <AddStudentToGroupModal 
        isOpen={isAddStudentModalOpen}
        onRequestClose={() => setIsAddStudentModalOpen(false)}
        group={group}
        onStudentAdded={fetchGroupData}
      />
      <ConfirmModal 
        isOpen={isConfirmModalOpen}
        onRequestClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmRemove}
        title="Leerling Verwijderen"
        message={`Weet je zeker dat je ${studentToRemove?.naam} wilt verwijderen uit de groep "${group.groep_naam}"?`}
      />
    </div>
  );
}