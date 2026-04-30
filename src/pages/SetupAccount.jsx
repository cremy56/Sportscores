// src/pages/SetupAccount.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import NicknameWijzigen from '../components/NicknameWijzigen';
import InfoScherm from '../components/InfoScherm';

export default function SetupAccount() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState(null);
    const [infoGezien, setInfoGezien] = useState(null); // null = laden, false = tonen, true = gezien

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
                setProfile({ id: snap.id, uid: user.uid, ...data, _token: token });

                if (data.onboarding_complete) {
                    navigate('/', { replace: true });
                }
            },
            (err) => {
                setError('Er ging iets mis bij het laden van je profiel.');
            }
        );

        return () => unsub();
    }, [navigate]);

    // Check of infоscherm al gezien is zodra profiel geladen is
    useEffect(() => {
        if (!profile?.uid) return;

        const checkInfo = async () => {
            try {
                const snap = await getDoc(
                    doc(db, 'users', profile.uid, 'consent_records', 'info_v1')
                );
                setInfoGezien(snap.exists());
            } catch {
                setInfoGezien(true); // Bij fout: niet blokkeren
            }
        };

        checkInfo();
    }, [profile?.uid]);

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

    // Profiel nog niet geladen
    if (!profile || infoGezien === null) {
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

    // Stap 1 — Infоscherm (Art. 13 AVG — eenmalig bij eerste login)
    if (!infoGezien) {
        return (
            <InfoScherm
                profile={profile}
                onDone={() => setInfoGezien(true)}
            />
        );
    }

    // Stap 2 — Nickname kiezen
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