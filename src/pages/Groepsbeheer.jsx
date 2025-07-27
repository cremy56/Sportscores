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
        {/* Header Section - Same style as Highscores */}
        <div className="max-w-7xl mx-auto mb-12">
          <div className="text-center">
          
            {/* Subtitle */}
            <p className="text-xl text-gray-600 font-medium">
              Beheer uw klassen en leerlingengroepen
            </p>
            
            {/* Decorative Line */}
            <div className="mt-8 flex justify-center">
              <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-7xl mx-auto">
          {/* Action Button */}
          <div className="flex justify-center mb-12">
            <button
              onClick={() => setShowModal(true)}
              className="group bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-2xl shadow-1xl hover:shadow-2xl transform transition-all duration-300 hover:scale-105 border border-white/20 backdrop-blur-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors">
                  <PlusIcon className="h-6 w-6" />
                </div>
                <span className="text-lg font-semibold">Nieuwe Groep Aanmaken</span>
              </div>
            </button>
          </div>

          {/* Empty State */}
          {groepen.length === 0 && (
            <div className="bg-white/80 backdrop-blur-lg text-center p-12 rounded-3xl shadow-2xl border border-white/20 max-w-2xl mx-auto">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UsersIcon className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Geen Groepen Gevonden</h3>
                <p className="text-gray-600 leading-relaxed">
                  Er zijn nog geen groepen aangemaakt. Klik op de knop hierboven om uw eerste groep te creëren 
                  en begin met het organiseren van uw leerlingen.
                </p>
              </div>
            </div>
          )}
          
          {/* Groups Grid */}
          {groepen.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
              {groepen.map((groep) => (
                <Link 
                  to={`/groep/${groep.id}`} 
                  key={groep.id} 
                  className="group block transform transition-all duration-300 hover:scale-105"
                >
                  <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-lg border border-white/20 overflow-hidden group-hover:shadow-2xl transition-all duration-300">
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6 border-b border-white/10">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h2 className="text-xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors duration-300 line-clamp-2">
                            {groep.naam}
                          </h2>
                        </div>
                        <div className="bg-gradient-to-br from-purple-100 to-blue-100 p-3 rounded-2xl ml-4">
                          <AcademicCapIcon className="h-6 w-6 text-purple-600" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Card Content */}
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <UsersIcon className="h-5 w-5" />
                          <span className="text-sm font-medium">
                            {groep.leerling_ids.length} {groep.leerling_ids.length === 1 ? 'leerling' : 'leerlingen'}
                          </span>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-800">
                            {groep.leerling_ids.length}
                          </div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">
                            Actief
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Card Action */}
                    <div className="px-6 pb-6">
                      <div className="flex items-center text-purple-600 group-hover:text-purple-700 transition-colors">
                        <span className="text-sm font-semibold">Groep beheren</span>
                        <svg className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          
          {/* Stats Footer */}
          {groepen.length > 0 && (
            <div className="mt-16 text-center">
              <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-6 border border-white/20 inline-block">
                <div className="flex items-center space-x-8 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                    <span>{groepen.length} {groepen.length === 1 ? 'Groep' : 'Groepen'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full"></div>
                    <span>{groepen.reduce((total, groep) => total + groep.leerling_ids.length, 0)} Totaal Leerlingen</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal voor het aanmaken van een nieuwe groep */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20 w-full max-w-md transform transition-all duration-300 scale-100">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <PlusIcon className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Nieuwe Groep Aanmaken</h2>
              <p className="text-gray-600 mt-2">Voeg een nieuwe leerlingengroep toe aan uw dashboard</p>
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
                  placeholder="bv. Klas 5B Lichamelijke Opvoeding"
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