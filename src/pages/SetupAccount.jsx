// src/pages/SetupAccount.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import NicknameWijzigen from '../components/NicknameWijzigen';

export default function SetupAccount() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        
        const user = auth.currentUser;
        
        
        if (!user) {
            
            setError('Geen gebruiker gevonden');
            return;
        }

        const unsub = onSnapshot(
            doc(db, 'users', user.uid),
            async (snap) => {
                
                if (!snap.exists()) {
                    setError('Profiel niet gevonden in Firestore');
                    return;
                }
                const data = snap.data();
                
                const token = await user.getIdToken();
                setProfile({ id: snap.id, ...data, _token: token });

                if (data.onboarding_complete) {
                    
                    navigate('/', { replace: true });
                }
            },
            (err) => {
                console.error('Firestore error:', err);
                setError(err.message);
            }
        );

        return () => unsub();
    }, [navigate]);

    if (error) {
        return (
            <div className="fixed inset-0 bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md">
                    <h2 className="text-red-800 font-bold mb-2">Fout</h2>
                    <p className="text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <p className="text-slate-500">Profiel laden...</p>
                </div>
            </div>
        );
    }


    if (profile.rol !== 'leerling') {
        return (
            <div className="fixed inset-0 bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl p-6 max-w-md text-center">
                    <p className="text-slate-600">Rol: {profile.rol} — geen onboarding nodig.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
            <NicknameWijzigen
                profile={profile}
                isOnboarding={true}
                onNicknameUpdated={() => {}}
            />
        </div>
    );
}
