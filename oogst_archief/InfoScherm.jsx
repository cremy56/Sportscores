// src/components/InfoScherm.jsx
// Getoond bij eerste login (Art. 13 AVG — informatieverplichting)
// Geen toestemming vragen — alleen informeren
// Wordt opgeslagen in users/{uid}/consent_records/info_v1

import { useState } from 'react';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const ITEMS = [
    {
        icon: '🏃',
        titel: 'Je sportscores',
        tekst: 'Je leerkracht LO voert je testresultaten in. Je kan je eigen scores en evolutie altijd bekijken.',
    },
    {
        icon: '🎭',
        titel: 'Anonieme nickname',
        tekst: 'In rangschikkingen verschijn je nooit met je echte naam — alleen met je nickname. Die kies je zelf.',
    },
    {
        icon: '🏆',
        titel: 'XP en rankings',
        tekst: 'Je verdient XP-punten voor prestaties. Rankings tonen enkel nicknames, nooit echte namen.',
    },
    {
        icon: '🔒',
        titel: 'Jouw privacy',
        tekst: 'Je naam wordt versleuteld opgeslagen. Alleen jouw leerkracht LO ziet jouw scores — niemand anders.',
    },
    {
        icon: '💚',
        titel: 'Welzijnsmodule (optioneel)',
        tekst: 'Er is een optionele module voor slaap, voeding en welzijn. Die activeer je zelf. Niemand anders ziet die gegevens.',
    },
];

export default function InfoScherm({ profile, onDone }) {
    const [loading, setLoading] = useState(false);

    const handleBevestig = async () => {
        setLoading(true);
        try {
            // Sla op dat leerling het infоscherm gezien heeft (Art. 13 AVG)
            await setDoc(
                doc(db, 'users', profile.uid, 'consent_records', 'info_v1'),
                {
                    versie: 'info_v1',
                    gezien_op: serverTimestamp(),
                    user_agent: navigator.userAgent,
                }
            );
        } catch (err) {
            // Niet-kritiek — infоscherm mag de onboarding niet blokkeren
            console.warn('InfoScherm record niet opgeslagen:', err.message);
        } finally {
            setLoading(false);
            onDone();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="bg-purple-600 px-6 py-5 text-white flex-shrink-0">
                    <div className="text-2xl font-bold">Welkom bij SportScores 👋</div>
                    <div className="text-purple-200 text-sm mt-1">
                        Even kort uitleggen hoe dit werkt
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
                    {ITEMS.map((item, i) => (
                        <div key={i} className="flex gap-3 items-start">
                            <div className="text-2xl flex-shrink-0 mt-0.5">{item.icon}</div>
                            <div>
                                <div className="font-semibold text-gray-800 text-sm">{item.titel}</div>
                                <div className="text-gray-500 text-sm leading-snug">{item.tekst}</div>
                            </div>
                        </div>
                    ))}

                    {/* Privacy link */}
                    <div className="border-t border-gray-100 pt-3 mt-2">
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Jouw gegevens worden verwerkt door Christoph Lemaire (SportScores).
                            De school is niet verantwoordelijk voor de verwerking.{' '}
                            <a
                                href="/privacy"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-600 underline hover:text-purple-700"
                            >
                                Lees het volledige privacybeleid
                            </a>
                            .
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 flex-shrink-0 border-t border-gray-100">
                    <button
                        onClick={handleBevestig}
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3 transition-colors"
                    >
                        {loading ? 'Even geduld...' : 'Begrepen, ga verder →'}
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-2">
                        Dit scherm verschijnt eenmalig bij je eerste login.
                    </p>
                </div>
            </div>
        </div>
    );
}