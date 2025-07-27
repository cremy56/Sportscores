// src/components/AddStudentToGroupModal.jsx
import Modal from 'react-modal';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'; // Belangrijke imports voor Firestore
import toast from 'react-hot-toast';
import StudentSearch from './StudentSearch';

export default function AddStudentToGroupModal({ isOpen, onRequestClose, group, onStudentAdded }) {
  if (!group) return null;

  const handleStudentSelect = async (student) => {
    const loadingToast = toast.loading('Bezig met toevoegen...');

    try {
      // Definieer de referentie naar het specifieke groepsdocument
      const groupRef = doc(db, 'groepen', group.id);

      // Voeg de ID van de leerling toe aan de 'leerling_ids' array in Firestore
      await updateDoc(groupRef, {
        leerling_ids: arrayUnion(student.id)
      });
      
      toast.dismiss(loadingToast);
      toast.success('Leerling succesvol toegevoegd!');
      onStudentAdded(); // Ververs de lijst in de ouder-component

    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Kon de leerling niet toevoegen.');
      console.error("Fout bij toevoegen leerling:", error);
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
      <h2 className="text-2xl font-bold mb-4">Voeg leerling toe aan "{group.naam}"</h2>
      <StudentSearch onStudentSelect={handleStudentSelect} />
      <div className="flex justify-end mt-6">
        <button onClick={onRequestClose} className="bg-gray-200 py-2 px-4 rounded-lg">Klaar</button>
      </div>
    </Modal>
  );
}