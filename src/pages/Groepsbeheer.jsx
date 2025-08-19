// src/pages/Groepsbeheer.jsx
import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import { PlusIcon, UsersIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

export default function Groepsbeheer() {
  const { profile } = useOutletContext();
  const [groepen, setGroepen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Stop als het profiel (en dus de school_id) nog niet geladen is.
    if (!auth.currentUser || !profile?.school_id) {
      // Als er geen school_id is, stop met laden en toon een lege lijst.
      setLoading(false);
      return;
    }

    const groepenCollectionRef = collection(db, 'groepen');
    const q = query(
        groepenCollectionRef, 
        where('school_id', '==', profile.school_id), 
        where('leerkracht_id', '==', auth.currentUser.uid)
    );

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

    return () => unsubscribe();
  }, [profile?.school_id]); // Voeg profile.school_id toe aan de dependency array

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      toast.error("Groepsnaam mag niet leeg zijn.");
      return;
    }
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'groepen'), {
        naam: newGroupName,
        leerkracht_id: auth.currentUser.uid,
        school_id: profile.school_id, // <-- TOEGEVOEGD
        leerling_ids: [],
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
        <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-sm">
                <div className="flex items-center space-x-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <span className="text-gray-700 font-medium">Groepen laden...</span>
                </div>
            </div>
        </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />
      <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 lg:px-8 lg:py-8">
        
          {/* --- MOBILE HEADER: Zichtbaar op kleine schermen, verborgen op lg en groter --- */}
          <div className="lg:hidden mb-8">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800 pt-8">Mijn groepen</h1>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded-full shadow-lg"
              >
                <PlusIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* --- DESKTOP HEADER: Verborgen op kleine schermen, zichtbaar op lg en groter --- */}
          <div className="hidden lg:block mb-12">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                          Mijn groepen
                      </h1>
                      <button
                onClick={() => setShowModal(true)}
                className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105"
              >
                <PlusIcon className="h-6 w-6" />
                <span className="ml-2">Nieuwe Groep</span>
              </button>
            </div>
          </div>

          {/* --- DESKTOP BUTTON: Verborgen op kleine schermen, zichtbaar op lg en groter --- */}
         

          {groepen.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 text-center p-12 max-w-2xl mx-auto">
              <div className="mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UsersIcon className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Geen Groepen Gevonden</h3>
                <p className="text-gray-600 leading-relaxed">
                  Er zijn nog geen groepen aangemaakt. Klik op de knop hierboven om uw eerste groep te creëren 
                  en begin met het organiseren van uw leerlingen.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
              {groepen.map((groep) => {
                const studentCount = (groep.leerling_ids || []).length;
                return (
                  <Link 
                    to={`/groep/${groep.id}`} 
                    key={groep.id} 
                    className="group block transform transition-all duration-300 hover:scale-105"
                  >
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group-hover:shadow-lg transition-all duration-300">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors duration-300 line-clamp-2 flex-1">
                            {groep.naam}
                          </h2>
                          <div className="bg-purple-100 p-3 rounded-2xl ml-4">
                            <AcademicCapIcon className="h-6 w-6 text-purple-600" />
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-gray-600">
                          <UsersIcon className="h-5 w-5" />
                          <span className="text-sm font-medium">
                            {studentCount} {studentCount === 1 ? 'leerling' : 'leerlingen'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
          
          {groepen.length > 0 && (
            <div className="mt-16 text-center">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-4 inline-block">
                <div className="flex items-center justify-center space-x-8 text-sm text-slate-600 flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                    <span>{groepen.length} {groepen.length === 1 ? 'Groep' : 'Groepen'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full"></div>
                    <span>{groepen.reduce((total, groep) => total + (groep.leerling_ids || []).length, 0)} Totaal Leerlingen</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20 w-full max-w-md transform transition-all duration-300 scale-100">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <PlusIcon className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Nieuwe Groep Aanmaken</h2>
            </div>
            
            <form onSubmit={handleCreateGroup} className="space-y-6">
              <div>
                <label htmlFor="group-name" className="block text-sm font-semibold text-gray-700 mb-3">
                  Groepsnaam
                </label>
                <input
                  type="text"
                  id="group-name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 text-gray-900 placeholder-gray-500"
                  placeholder="bv. Algemene Sport derde graad"
                />
              </div>
              
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-800 font-semibold rounded-2xl hover:bg-gray-200 transition-all duration-200 transform hover:scale-105"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-2xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Aanmaken...</span>
                    </div>
                  ) : (
                    'Groep Aanmaken'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}