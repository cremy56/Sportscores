// src/pages/Groepsbeheer.jsx
import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import { PlusIcon, UsersIcon } from '@heroicons/react/24/outline';

export default function Groepsbeheer() {
  const { profile } = useOutletContext();
  const [groepen, setGroepen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Maak een query om alleen de groepen van de ingelogde leerkracht op te halen.
    const groepenCollectionRef = collection(db, 'groepen');
    const q = query(groepenCollectionRef, where('leerkracht_id', '==', auth.currentUser.uid));

    // Gebruik onSnapshot voor real-time updates.
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groepenData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroepen(groepenData);
      setLoading(false);
    }, (error) => {
      console.error("Fout bij ophalen groepen:", error);
      toast.error("Kon de groepen niet laden.");
      setLoading(false);
    });

    // Stop de listener als de component verdwijnt.
    return () => unsubscribe();
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      toast.error("Groepsnaam mag niet leeg zijn.");
      return;
    }
    setIsSubmitting(true);

    try {
      // Voeg een nieuw document toe aan de 'groepen' collectie.
      await addDoc(collection(db, 'groepen'), {
        naam: newGroupName,
        leerkracht_id: auth.currentUser.uid,
        leerling_ids: [], // Begin met een lege lijst leerlingen
        created_at: serverTimestamp()
      });
      toast.success(`Groep "${newGroupName}" succesvol aangemaakt!`);
      setShowModal(false);
      setNewGroupName('');
    } catch (error) {
      console.error("Fout bij aanmaken groep:", error);
      toast.error("Kon de groep niet aanmaken.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
                <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <p className="text-lg font-medium text-gray-700">Groepen laden...</p>
                </div>
            </div>
        </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 p-4 lg:p-8">
        {/* Header Section */}
        <div className="max-w-7xl mx-auto mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Groepsbeheer
            </h1>
            <p className="text-lg text-gray-600">
                Beheer uw klassen en groepen
            </p>
            <div className="mt-6 flex justify-center">
                <div className="w-20 h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
            </div>
        </div>

        {/* Content Section */}
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-end mb-8">
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105"
                    >
                    <PlusIcon className="h-6 w-6 mr-2" />
                    Nieuwe Groep Aanmaken
                </button>
            </div>

            {groepen.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-lg text-center p-12 rounded-3xl shadow-2xl border border-white/20 max-w-2xl mx-auto">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UsersIcon className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Geen Groepen Gevonden</h3>
                    <p className="text-gray-600 leading-relaxed">
                        Er zijn nog geen groepen aangemaakt. Klik op de knop hierboven om uw eerste groep te creëren.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {groepen.map((groep) => (
                    <Link to={`/groep/${groep.id}`} key={groep.id} className="block bg-white/70 backdrop-blur-lg rounded-3xl shadow-lg p-6 border border-white/20 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                        <h2 className="text-2xl font-bold text-gray-900 truncate">{groep.naam}</h2>
                        <div className="mt-4 flex items-center text-gray-600">
                            <UsersIcon className="h-5 w-5 mr-2" />
                            <span>{groep.leerling_ids.length} leerlingen</span>
                        </div>
                    </Link>
                ))}
                </div>
            )}
        </div>
      </div>

      {/* Modal voor het aanmaken van een nieuwe groep */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nieuwe Groep Aanmaken</h2>
            <form onSubmit={handleCreateGroup}>
              <div>
                <label htmlFor="group-name" className="block text-sm font-semibold text-gray-700 mb-2">Groepsnaam</label>
                <input
                  type="text"
                  id="group-name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300"
                  placeholder="bv. Klas 5B Lichamelijke Opvoeding"
                />
              </div>
              <div className="mt-8 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-800 font-semibold rounded-2xl hover:bg-gray-200 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-2xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {isSubmitting ? 'Aanmaken...' : 'Aanmaken'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
