// src/pages/Groepsbeheer.jsx
import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import { PlusIcon, UsersIcon, AcademicCapIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ConfirmModal from '../components/ConfirmModal';

export default function Groepsbeheer() {
  const { profile } = useOutletContext();
  const [groepen, setGroepen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);

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
        school_id: profile.school_id,
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

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setEditGroupName(group.naam);
    setShowEditModal(true);
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    if (!editGroupName.trim()) {
      toast.error("Groepsnaam mag niet leeg zijn.");
      return;
    }
    setIsSubmitting(true);

    try {
      const groupRef = doc(db, 'groepen', editingGroup.id);
      await updateDoc(groupRef, {
        naam: editGroupName
      });
      toast.success(`Groepsnaam bijgewerkt naar "${editGroupName}"`);
      setShowEditModal(false);
      setEditingGroup(null);
      setEditGroupName('');
    } catch (error) {
      console.error("Fout bij wijzigen groep:", error);
      toast.error("Kon de groepsnaam niet wijzigen.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = (group) => {
    setGroupToDelete(group);
    setShowDeleteModal(true);
  };

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'groepen', groupToDelete.id));
      toast.success(`Groep "${groupToDelete.naam}" is verwijderd.`);
      setShowDeleteModal(false);
      setGroupToDelete(null);
    } catch (error) {
      console.error("Fout bij verwijderen groep:", error);
      toast.error("Kon de groep niet verwijderen.");
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
        <div className="max-w-7xl mx-auto px-4 pt-20 pb-6 lg:px-8 lg:pt-24 lg:pb-8">
        
          {/* --- MOBILE HEADER: Zichtbaar op kleine schermen, verborgen op lg en groter --- */}
          <div className="lg:hidden mb-8">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800">Mijn groepen</h1>
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
                  <div key={groep.id} className="group relative">
                    <Link 
                      to={`/groep/${groep.id}`} 
                      className="block transform transition-all duration-300 hover:scale-105"
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
                    
                    {/* Action buttons - appear on hover */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleEditGroup(groep);
                        }}
                        className="p-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-purple-600 rounded-full shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteGroup(groep);
                        }}
                        className="p-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-red-600 rounded-full shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
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

      {/* Create Group Modal */}
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

      {/* Edit Group Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20 w-full max-w-md transform transition-all duration-300 scale-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Groep Wijzigen</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-800">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateGroup} className="space-y-6">
              <div>
                <label htmlFor="edit-group-name" className="block text-sm font-semibold text-gray-700 mb-3">
                  Groepsnaam
                </label>
                <input
                  type="text"
                  id="edit-group-name"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="w-full px-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 text-gray-900 placeholder-gray-500"
                  placeholder="bv. Algemene Sport derde graad"
                />
              </div>
              
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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
                      <span>Wijzigen...</span>
                    </div>
                  ) : (
                    'Wijzigingen Opslaan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteGroup}
        title="Groep Verwijderen"
      >
        Weet u zeker dat u de groep "{groupToDelete?.naam}" wilt verwijderen? 
        Deze actie kan niet ongedaan gemaakt worden.
      </ConfirmModal>
    </>
  );
}