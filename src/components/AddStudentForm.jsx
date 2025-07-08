// src/components/AddStudentForm.jsx
import { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function AddStudentForm({ onStudentAdded }) {
  const [naam, setNaam] = useState('');
  const [email, setEmail] = useState('');
  const [geboortedatum, setGeboortedatum] = useState('');
  const [geslacht, setGeslacht] = useState('M');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Roep de nieuwe, simpele database functie aan
    const promise = supabase.rpc('add_student_profile', {
      p_naam: naam,
      p_email: email,
      p_geboortedatum: geboortedatum,
      p_geslacht: geslacht
    });

    toast.promise(promise, {
      loading: 'Leerlingprofiel aanmaken...',
      success: () => {
        onStudentAdded(); // Ververs de lijst
        return 'Leerlingprofiel succesvol aangemaakt!';
      },
      error: (err) => `Fout: ${err.message}`,
    });

    // Reset de velden
    setNaam('');
    setEmail('');
    setGeboortedatum('');
    setLoading(false);
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Nieuwe Leerling Toevoegen</h3>
      <p className="text-sm text-gray-500 mb-4">
        Voeg hier een leerling toe. De leerling kan daarna zelf inloggen met zijn/haar e-mailadres om een wachtwoord in te stellen.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Volledige Naam</label>
          <input type="text" value={naam} onChange={(e) => setNaam(e.target.value)} required className="w-full mt-1 p-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium">E-mailadres</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full mt-1 p-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium">Geboortedatum</label>
          <input type="date" value={geboortedatum} onChange={(e) => setGeboortedatum(e.target.value)} required className="w-full mt-1 p-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium">Geslacht</label>
          <select value={geslacht} onChange={(e) => setGeslacht(e.target.value)} required className="w-full mt-1 p-2 border rounded-md">
            <option value="M">M</option>
            <option value="V">V</option>
          </select>
        </div>
        <button type="submit" disabled={loading} className="w-full bg-purple-700 text-white py-2 rounded-md hover:bg-purple-800 disabled:bg-gray-400">
          {loading ? 'Aanmaken...' : 'Leerling Toevoegen'}
        </button>
      </form>
    </div>
  );
}