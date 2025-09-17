import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

// De beschikbare evaluatiemethoden
const evaluationOptions = [
    { id: 'punten', label: 'Punten', description: 'Traditionele score op 10, 20, etc.' },
    { id: 'rubrics', label: 'Rubrics', description: 'Gedetailleerde evaluatiecriteria.' },
    { id: 'smileys', label: 'Smileys', description: 'Eenvoudige visuele feedback.' },
    { id: 'sam-schalen', label: 'SAM-schalen', description: 'Zelf-evaluatie van vaardigheden.' },
];

export default function AlgemeenInstellingen() {
    const { profile } = useOutletContext();
    const [settings, setSettings] = useState({
        sportdashboardAsHomepage: false,
        teachersCanPostAnnouncements: true,
        evaluationMethod: 'punten',
    });
    const [initialSettings, setInitialSettings] = useState(settings);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Haal de huidige instellingen op
    const fetchSettings = useCallback(async () => {
        if (!profile?.school_id) return;
        setLoading(true);
        try {
            const schoolRef = doc(db, 'scholen', profile.school_id);
            const schoolSnap = await getDoc(schoolRef);
            if (schoolSnap.exists() && schoolSnap.data().instellingen) {
                const fetchedSettings = schoolSnap.data().instellingen;
                setSettings(fetchedSettings);
                setInitialSettings(fetchedSettings); // Bewaar de initiële staat
            }
        } catch (error) {
            toast.error("Kon de schoolinstellingen niet laden.");
        } finally {
            setLoading(false);
        }
    }, [profile?.school_id]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSave = async () => {
        if (!profile?.school_id) return toast.error("Geen school gevonden.");
        setIsSaving(true);
        const loadingToast = toast.loading("Instellingen opslaan...");
        try {
            const schoolRef = doc(db, 'scholen', profile.school_id);
            await updateDoc(schoolRef, {
                instellingen: settings
            });
            setInitialSettings(settings); // Update de initiële staat na opslaan
            toast.success("Instellingen succesvol opgeslagen!");
        } catch (error) {
            toast.error("Fout bij het opslaan van de instellingen.");
        } finally {
            setIsSaving(false);
            toast.dismiss(loadingToast);
        }
    };
    
    // Controleer of er wijzigingen zijn
    const isDirty = JSON.stringify(settings) !== JSON.stringify(initialSettings);

    if (loading) {
        return <div className="text-gray-500">Instellingen laden...</div>;
    }

    return (
        <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Algemene Instellingen</h2>
            <p className="text-gray-600 mb-8">Beheer hier de algemene configuratie voor de hele school.</p>

            <div className="space-y-8">
                {/* --- Instelling 1: Sportdashboard als Homepagina --- */}
                <div className="flex items-start justify-between">
                    <div>
                        <label htmlFor="sportdashboardAsHomepage" className="font-semibold text-gray-800">Sportdashboard als homepagina</label>
                        <p className="text-sm text-gray-500 mt-1">Indien aangevinkt, wordt het sportdashboard de standaard startpagina i.p.v. Ad Valvas.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            id="sportdashboardAsHomepage"
                            name="sportdashboardAsHomepage"
                            checked={settings.sportdashboardAsHomepage}
                            onChange={handleChange}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-purple-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>

                <hr />

                {/* --- Instelling 2: Mededelingen door Leerkrachten --- */}
                <div className="flex items-start justify-between">
                    <div>
                        <label htmlFor="teachersCanPostAnnouncements" className="font-semibold text-gray-800">Leerkrachten mogen mededelingen plaatsen</label>
                        <p className="text-sm text-gray-500 mt-1">Geef leerkrachten de mogelijkheid om berichten op het Ad Valvas-bord te plaatsen.</p>
                    </div>
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            id="teachersCanPostAnnouncements"
                            name="teachersCanPostAnnouncements"
                            checked={settings.teachersCanPostAnnouncements}
                            onChange={handleChange}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-purple-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>

                <hr />

                {/* --- Instelling 3: Evaluatiemethode --- */}
                <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Evaluatiemethode</h3>
                    <p className="text-sm text-gray-500 mb-4">Kies de standaardmethode voor het evalueren van testen en opdrachten.</p>
                    <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {evaluationOptions.map((option) => (
                            <label key={option.id} className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer has-[:checked]:bg-purple-50 has-[:checked]:border-purple-300">
                                <input
                                    type="radio"
                                    name="evaluationMethod"
                                    value={option.id}
                                    checked={settings.evaluationMethod === option.id}
                                    onChange={handleChange}
                                    className="h-4 w-4 mt-1 border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <div className="ml-3 text-sm">
                                    <span className="font-medium text-gray-900">{option.label}</span>
                                    <p className="text-gray-500">{option.description}</p>
                                </div>
                            </label>
                        ))}
                    </fieldset>
                </div>
            </div>

            {/* --- Opslaan Knop --- */}
            <div className="mt-10 pt-6 border-t border-gray-200 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={!isDirty || isSaving}
                    className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl shadow-lg disabled:opacity-50 hover:scale-105"
                >
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    {isSaving ? 'Opslaan...' : 'Wijzigingen Opslaan'}
                </button>
            </div>
        </div>
    );
}