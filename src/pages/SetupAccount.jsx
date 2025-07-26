// src/pages/SetupAccount.jsx
import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

export default function SetupAccount() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.currentUser) {
      setUserEmail(auth.currentUser.email);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('Wachtwoord moet minstens 6 tekens lang zijn.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('De wachtwoorden komen niet overeen.');
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Geen gebruiker gevonden.");

      // STAP 1: Update het wachtwoord in Firebase Auth
      await updatePassword(user, password);

      // STAP 2: Markeer de onboarding als voltooid in Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        onboarding_complete: true
      });

      toast.success('Uw account is succesvol ingesteld!');
      navigate('/');

    } catch (error) {
      toast.error(error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Toaster position="top-center" />
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-center">Account Instellen</h2>
        <p className="text-center text-gray-600">
          Welkom <span className="font-bold">{userEmail}</span>! Stel een wachtwoord in om uw account te activeren.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium">Nieuw Wachtwoord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 border rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Bevestig Wachtwoord</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 border rounded-md"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 font-bold text-white bg-purple-700 rounded-md hover:bg-purple-800 disabled:bg-gray-400"
          >
            {loading ? 'Bezig...' : 'Account Activeren'}
          </button>
        </form>
      </div>
    </div>
  );
}
