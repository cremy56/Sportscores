// src/components/groeiplan/GroeiplanOverzichtLeerkracht.jsx
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom'; // <-- 1. Importeren
import StudentSearch from '../StudentSearch';
import GroeiplanLeerling from './GroeiplanLeerling';

export default function GroeiplanOverzichtLeerkracht() {
    const { profile } = useOutletContext(); // <-- 2. Profiel van leerkracht ophalen
    const [selectedStudent, setSelectedStudent] = useState(null);

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Zoek een leerling om het groeiplan te bekijken
                </label>
                <StudentSearch 
                    onStudentSelect={setSelectedStudent} 
                    schoolId={profile?.school_id} // <-- 3. School ID doorgeven
                />
            </div>

            {selectedStudent ? (
                <div key={selectedStudent.id}>
                    {/* 4. We geven het geselecteerde profiel door via een prop */}
                    <GroeiplanLeerling studentProfile={selectedStudent} />
                </div>
            ) : (
                <div className="text-center text-slate-500 pt-8">
                    <p>Selecteer een leerling om de voortgang te zien.</p>
                </div>
            )}
        </div>
    );
}