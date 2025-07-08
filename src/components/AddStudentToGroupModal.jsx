// src/components/AddStudentToGroupModal.jsx
import Modal from 'react-modal';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import StudentSearch from './StudentSearch';

export default function AddStudentToGroupModal({ isOpen, onRequestClose, group, onStudentAdded }) {
  if (!group) return null;

  const handleStudentSelect = async (userId, studentName) => {
    const loadingToast = toast.loading('Bezig met toevoegen...');

    const { data, error } = await supabase.rpc('add_student_to_group', {
        p_groep_id: group.groep_id,
        p_user_id: userId
    });

    toast.dismiss(loadingToast); // Verwijder de "laden..." toast

    if (error) {
        toast.error(`Fout: ${error.message}`);
    } else {
        // Toon het bericht dat we van de functie terugkrijgen
        // 'data' bevat nu onze tekst, bv. "Succes: Leerling toegevoegd..."
        if (data.includes('Fout')) {
            toast.error(data);
        } else if (data.includes('Info')) {
            toast(data, { icon: 'ℹ️' }); // Een neutrale info-toast
        }
        else {
            toast.success(data);
        }
        // Ververs altijd de lijst in de ouder-component
        onStudentAdded(); 
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Leerling Toevoegen"
      style={{
          overlay: { backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 1000 },
          content: {
              top: '50%', left: '50%', right: 'auto', bottom: 'auto',
              marginRight: '-50%', transform: 'translate(-50%, -50%)',
              width: '90%', maxWidth: '500px',
              border: 'none', borderRadius: '1rem', padding: '2rem'
          }
      }}
    >
      <h2 className="text-2xl font-bold mb-4">Voeg leerling toe aan "{group.groep_naam}"</h2>
      <StudentSearch onStudentSelect={handleStudentSelect} />
      <div className="flex justify-end mt-6">
        <button onClick={onRequestClose} className="bg-gray-200 py-2 px-4 rounded-lg">Klaar</button>
      </div>
    </Modal>
  );
}