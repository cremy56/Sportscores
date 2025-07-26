// src/components/CreateGroupModal.jsx
import { useState } from 'react';
import Modal from 'react-modal';
import { db } from '../firebase';
import toast from 'react-hot-toast';

export default function CreateGroupModal({ isOpen, onRequestClose, onGroupCreated, profile }) {
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast.error("Groepsnaam mag niet leeg zijn.");
      return;
    }
    
    setLoading(true);
    const promise = supabase.from('groepen').insert({
      naam: groupName,
      leerkracht_id: profile.id
    });

    toast.promise(promise, {
      loading: 'Groep aanmaken...',
      success: () => {
        onGroupCreated(); // Zeg tegen de ouder-pagina dat de data ververst moet worden
        onRequestClose(); // Sluit de modal
        return `Groep '${groupName}' succesvol aangemaakt!`;
      },
      error: (err) => `Fout: ${err.message}`
    });

    setLoading(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Nieuwe Groep Aanmaken"
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
      <h2 className="text-2xl font-bold mb-4">Nieuwe Groep Aanmaken</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="groupName" className="block text-sm font-medium text-gray-700">Naam van de groep</label>
          <input
            id="groupName"
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button type="button" onClick={onRequestClose} className="bg-gray-200 py-2 px-4 rounded-lg">Annuleren</button>
          <button type="submit" disabled={loading} className="bg-purple-700 text-white py-2 px-4 rounded-lg hover:bg-purple-800">
            {loading ? 'Opslaan...' : 'Groep Opslaan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}