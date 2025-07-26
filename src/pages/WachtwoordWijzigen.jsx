// src/pages/WachtwoordWijzigen.jsx
import { useState } from 'react';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function WachtwoordWijzigen() {
  const [nieuwWachtwoord, setNieuwWachtwoord] = useState('');
  const [bevestigWachtwoord, setBevestigWachtwoord] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (nieuwWachtwoord !== bevestigWachtwoord) {
      toast.error('Wachtwoorden komen niet overeen.');
      return;
    }

    if (nieuwWachtwoord.length < 6) {
      toast.error('Wachtwoord moet minstens 6 tekens bevatten.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: nieuwWachtwoord });

    if (error) {
      toast.error('Fout bij bijwerken wachtwoord.');
      console.error(error);
    } else {
      toast.success('Wachtwoord gewijzigd!');
      navigate('/');
    }

    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white shadow-md rounded-xl p-6 mt-8">
      <h2 className="text-xl font-bold text-purple-700 mb-4">Wachtwoord wijzigen</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nieuw wachtwoord</label>
          <input
            type="password"
            value={nieuwWachtwoord}
            onChange={(e) => setNieuwWachtwoord(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-purple-500 focus:border-purple-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Bevestig nieuw wachtwoord</label>
          <input
            type="password"
            value={bevestigWachtwoord}
            onChange={(e) => setBevestigWachtwoord(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-purple-500 focus:border-purple-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-700 text-white py-2 px-4 rounded-md hover:bg-purple-800 transition-colors disabled:opacity-50"
        >
          {loading ? 'Bezig...' : 'Wachtwoord wijzigen'}
        </button>
      </form>
    </div>
  );
}
