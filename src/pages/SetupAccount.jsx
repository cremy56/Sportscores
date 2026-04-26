// src/pages/SetupAccount.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import NicknameWijzigen from '../components/NicknameWijzigen';

export default function SetupAccount() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        const unsub = onSnapshot(doc(db, 'users', user.uid), async (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            const token = await user.getIdToken();
            setProfile({ id: snap.id, ...data, _token: token });
            if (data.onboarding_complete) {
                navigate('/', { replace: true });
            }
        });
        return () => unsub();
    }, [navigate]);

    if (!profile) {
        return (
            <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (profile.rol !== 'leerling') return null;

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
