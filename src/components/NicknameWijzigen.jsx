// src/components/NicknameWijzigen.jsx
import { useState } from 'react';
import { Pencil, Check, X, RefreshCw } from 'lucide-react';

const ADJECTIEVEN = ['Snelle','Sterke','Vlotte','Felle','Stoere','Wilde','Scherpe','Vinnige','Flinke','Rake','Koene','Ferme','Pittige','Kwieke','Moedige','Taaie'];
const DIEREN = ['Tijger','Arend','Lynx','Haai','Panter','Valk','Wolf','Cobra','Leeuw','Adelaar','Jaguar','Buffel','Condor','Mamba','Stier','Horzel'];

const generateNickname = () => {
    const adj = ADJECTIEVEN[Math.floor(Math.random() * ADJECTIEVEN.length)];
    const dier = DIEREN[Math.floor(Math.random() * DIEREN.length)];
    const num = Math.floor(Math.random() * 99) + 1;
    return `${adj}${dier}${num}`;
};

export default function NicknameWijzigen({ profile, onNicknameUpdated, isOnboarding = false }) {
    const [editing, setEditing] = useState(isOnboarding);
    const [value, setValue] = useState(profile?.nickname || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleSave = async () => {
        setError(null);
        setLoading(true);
        try {
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${profile._token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: 'update_nickname', nickname: value }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Fout bij opslaan');

            setSuccess(true);
            setEditing(false);
            onNicknameUpdated?.(data.nickname);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRandomize = () => {
        setValue(generateNickname());
        setError(null);
    };

    if (isOnboarding) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto text-center">
                <div className="mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🏃</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Welkom bij SportScores!</h2>
                    <p className="text-slate-600">
                        Je hebt een nickname gekregen. Je kunt die nu aanpassen of later wijzigen via je instellingen.
                    </p>
                </div>

                <div className="mb-6">
                    <p className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wide">Jouw nickname</p>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={value}
                            onChange={e => { setValue(e.target.value); setError(null); }}
                            maxLength={20}
                            className="flex-1 text-xl font-bold text-center border-2 border-purple-300 rounded-xl px-4 py-3 focus:border-purple-500 focus:outline-none"
                            placeholder="Jouw nickname..."
                        />
                        <button
                            onClick={handleRandomize}
                            className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                            title="Willekeurige nickname"
                        >
                            <RefreshCw className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    <p className="text-xs text-slate-400 mt-2">3-20 tekens, enkel letters en cijfers</p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading || !value.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
                >
                    {loading ? 'Opslaan...' : 'Doorgaan met deze nickname →'}
                </button>

                <p className="text-xs text-slate-400 mt-4">
                    Je nickname is zichtbaar op het scorebord. Je echte naam blijft privé.
                </p>
            </div>
        );
    }

    // Inline edit mode (voor instellingen)
    return (
        <div className="flex items-center gap-3">
            {editing ? (
                <>
                    <input
                        type="text"
                        value={value}
                        onChange={e => { setValue(e.target.value); setError(null); }}
                        maxLength={20}
                        className="border-2 border-purple-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:border-purple-500 focus:outline-none w-40"
                        autoFocus
                    />
                    <button onClick={handleRandomize} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Willekeurig">
                        <RefreshCw className="w-4 h-4 text-slate-500" />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading || !value.trim()}
                        className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50"
                    >
                        <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setEditing(false); setValue(profile?.nickname || ''); setError(null); }} className="p-1.5 hover:bg-slate-100 rounded-lg">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                    {error && <p className="text-red-500 text-xs">{error}</p>}
                </>
            ) : (
                <>
                    <span className="font-bold text-slate-800">{profile?.nickname || '—'}</span>
                    {success && <span className="text-green-500 text-xs">✓ Opgeslagen</span>}
                    <button
                        onClick={() => setEditing(true)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg"
                        title="Nickname wijzigen"
                    >
                        <Pencil className="w-4 h-4 text-slate-400" />
                    </button>
                </>
            )}
        </div>
    );
}