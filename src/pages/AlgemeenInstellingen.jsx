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

// Mobile-vriendelijke Toggle Component
const MobileToggle = ({ id, name, checked, onChange, label, description }) => {
    console.log(`🔘 Toggle ${name}: ${checked}`); // Debug log
    
    return (
        <div className="flex items-start justify-between py-4">
            <div className="flex-1 mr-4">
                <label htmlFor={id} className="font-semibold text-gray-800 block cursor-pointer">{label}</label>
                <p className="text-sm text-gray-500 mt-1">{description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                    type="checkbox"
                    id={id}
                    name={name}
                    checked={checked}
                    onChange={(e) => {
                        console.log(`🔄 Toggle change for ${name}: ${e.target.checked}`); // Debug log
                        onChange(e);
                    }}
                    className="sr-only peer"
                />
                <div className="w-14 h-8 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-purple-300 peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600 touch-manipulation"></div>
            </label>
        </div>
    );
};

export default function AlgemeenInstellingen() {
    const context = useOutletContext();
    const { profile } = context || {};
    const [settings, setSettings] = useState({
        sportdashboardAsHomepage: false,
        teachersCanPostAnnouncements: true,
        evaluationMethod: 'punten',
    });
    const [initialSettings, setInitialSettings] = useState(settings);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Debug log settings changes
    useEffect(() => {
        console.log('⚙️ Settings state updated:', settings);
    }, [settings]);

    // Haal de huidige instellingen op
    const fetchSettings = useCallback(async () => {
        if (!profile?.school_id) return;
        console.log('📥 Fetching settings for school:', profile.school_id);
        
        setLoading(true);
        try {
            const schoolRef = doc(db, 'scholen', profile.school_id);
            const schoolSnap = await getDoc(schoolRef);
            
            if (schoolSnap.exists()) {
                const schoolData = schoolSnap.data();
                console.log('🏫 School data:', schoolData);
                
                if (schoolData.instellingen) {
                    const fetchedSettings = schoolData.instellingen;
                    console.log('⚙️ Fetched settings:', fetchedSettings);
                    setSettings(fetchedSettings);
                    setInitialSettings(fetchedSettings);
                } else {
                    console.log('⚠️ No settings found, creating defaults');
                    const defaultSettings = {
                        sportdashboardAsHomepage: false,
                        teachersCanPostAnnouncements: true,
                        evaluationMethod: 'punten',
                    };
                    
                    // Sla defaults op in database
                    await updateDoc(schoolRef, {
                        instellingen: defaultSettings
                    });
                    
                    setSettings(defaultSettings);
                    setInitialSettings(defaultSettings);
                    console.log('✅ Default settings created and saved');
                }
            }
        } catch (error) {
            console.error('❌ Error fetching settings:', error);
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
        const newValue = type === 'checkbox' ? checked : value;
        
        console.log(`🔄 Handle change - ${name}: ${newValue}`);
        
        setSettings(prev => {
            const newSettings = {
                ...prev,
                [name]: newValue,
            };
            console.log('📝 New settings state will be:', newSettings);
            return newSettings;
        });
    };

    const handleSave = async () => {
        if (!profile?.school_id) {
            console.error('❌ No school_id found');
            return toast.error("Geen school gevonden.");
        }
        
        console.log('💾 Starting save process...');
        console.log('💾 Settings to save:', settings);
        
        setIsSaving(true);
        const loadingToast = toast.loading("Instellingen opslaan...");
        
        try {
            const schoolRef = doc(db, 'scholen', profile.school_id);
            
            console.log('📤 Updating document with settings:', settings);
            
            await updateDoc(schoolRef, {
                instellingen: settings
            });
            
            setInitialSettings(settings);
            console.log('✅ Settings saved successfully');
            toast.success("Instellingen succesvol opgeslagen!");
            
        } catch (error) {
            console.error('❌ Save error:', error);
            toast.error("Fout bij het opslaan van de instellingen.");
        } finally {
            setIsSaving(false);
            toast.dismiss(loadingToast);
        }
    };
    
    // Controleer of er wijzigingen zijn
    const isDirty = JSON.stringify(settings) !== JSON.stringify(initialSettings);
    
    console.log('🔍 isDirty:', isDirty);
    console.log('🔍 Current settings:', settings);
    console.log('🔍 Initial settings:', initialSettings);

    if (loading) {
        return (
            <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="text-gray-500">Instellingen laden...</div>
            </div>
        );
    }

    return (
        <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Algemene Instellingen</h2>
                <p className="text-sm sm:text-base text-gray-600">Beheer hier de algemene configuratie voor de hele school.</p>
            </div>

            <div className="space-y-6 sm:space-y-8">
                {/* --- Instelling 1: Sportdashboard als Homepagina --- */}
                <MobileToggle
                    id="sportdashboardAsHomepage"
                    name="sportdashboardAsHomepage"
                    checked={settings.sportdashboardAsHomepage}
                    onChange={handleChange}
                    label="Sportdashboard als homepagina"
                    description="Indien aangevinkt, wordt het sportdashboard de standaard startpagina i.p.v. Ad Valvas."
                />

                <hr className="border-gray-200" />

                {/* --- Instelling 2: Mededelingen door Leerkrachten --- */}
                <MobileToggle
                    id="teachersCanPostAnnouncements"
                    name="teachersCanPostAnnouncements"
                    checked={settings.teachersCanPostAnnouncements}
                    onChange={handleChange}
                    label="Leerkrachten mogen mededelingen plaatsen"
                    description="Geef leerkrachten de mogelijkheid om berichten op het Ad Valvas-bord te plaatsen."
                />

                <hr className="border-gray-200" />

                {/* --- Instelling 3: Evaluatiemethode --- */}
                <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Evaluatiemethode</h3>
                    <p className="text-sm text-gray-500 mb-4 sm:mb-6">Kies de standaardmethode voor het evalueren van testen en opdrachten.</p>
                    
                    <fieldset className="space-y-3 sm:space-y-4">
                        {evaluationOptions.map((option) => (
                            <label 
                                key={option.id} 
                                className="flex items-start p-4 sm:p-4 border border-gray-200 rounded-xl cursor-pointer has-[:checked]:bg-purple-50 has-[:checked]:border-purple-300 transition-colors touch-manipulation"
                            >
                                <input
                                    type="radio"
                                    name="evaluationMethod"
                                    value={option.id}
                                    checked={settings.evaluationMethod === option.id}
                                    onChange={handleChange}
                                    className="h-5 w-5 mt-0.5 border-gray-300 text-purple-600 focus:ring-purple-500 flex-shrink-0 touch-manipulation"
                                />
                                <div className="ml-3 sm:ml-4 text-sm">
                                    <span className="font-medium text-gray-900 block">{option.label}</span>
                                    <p className="text-gray-500 mt-1">{option.description}</p>
                                </div>
                            </label>
                        ))}
                    </fieldset>
                </div>
            </div>

            {/* --- Opslaan Knop --- */}
            <div className="mt-8 sm:mt-10 pt-6 border-t border-gray-200 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={!isDirty || isSaving}
                    className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 sm:px-6 py-3 rounded-xl shadow-lg disabled:opacity-50 hover:scale-105 transition-all duration-200 touch-manipulation w-full sm:w-auto"
                >
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    {isSaving ? 'Opslaan...' : 'Wijzigingen Opslaan'}
                </button>
            </div>
        </div>
    );
}