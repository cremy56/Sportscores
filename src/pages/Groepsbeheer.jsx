// src/pages/Groepsbeheer.jsx
import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import GroupCard from '../components/GroupCard'; 
import CreateGroupModal from '../components/CreateGroupModal';
import toast from 'react-hot-toast';

export default function Groepsbeheer() {
    const { profile } = useOutletContext();
    const [groepen, setGroepen] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);

    const fetchGroepen = useCallback(async () => {
        // We tonen de groepen alleen als de gebruiker een leerkracht of admin is
        if (!profile || !(profile.rol === 'leerkracht' || profile.rol === 'administrator')) {
            setLoading(false);
            return;
        };
        
        setLoading(true);
        const { data, error } = await supabase.rpc('get_groups_with_members', { 
            p_leerkracht_id: profile.id
        });

        if (error) {
            console.error("Fout bij ophalen groepen:", error);
            toast.error("Kon de groepen niet laden.");
        } else {
            setGroepen(data);
        }
        setLoading(false);
    }, [profile]);

    useEffect(() => {
        fetchGroepen();
    }, [fetchGroepen]);

    return (
        <div className="max-w-7xl mx-auto">
           
            
            <div className="bg-white/60 p-6 rounded-2xl shadow-xl border border-white/30 backdrop-blur-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Mijn Groepen</h2>
                    <button onClick={() => setIsCreateGroupModalOpen(true)} className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-2 px-4 rounded-lg">
                        + Nieuwe Groep
                    </button>
                </div>
                
                {loading ? <p>Groepen laden...</p> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groepen.length > 0 ? groepen.map(groep => (
                            <GroupCard 
                                key={groep.groep_id} 
                                group={groep} 
                            />
                        )) : (
                            <p className="col-span-full text-center text-gray-500 py-8">
                                Je hebt nog geen groepen aangemaakt. Klik op '+ Nieuwe Groep' om te beginnen.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* De CreateGroupModal wordt alleen gerenderd als de modal open moet zijn */}
            {isCreateGroupModalOpen && (
                <CreateGroupModal 
                    isOpen={isCreateGroupModalOpen}
                    onRequestClose={() => setIsCreateGroupModalOpen(false)}
                    onGroupCreated={fetchGroepen}
                    profile={profile}
                />
            )}
        </div>
    );
}