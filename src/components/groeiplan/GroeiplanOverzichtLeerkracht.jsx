// src/components/groeiplan/GroeiplanOverzichtLeerkracht.jsx
import { useState } from 'react';
import StudentSearch from '../StudentSearch'; // De zoekbalk die je al hebt
import GroeiplanLeerling from './GroeiplanLeerling'; // We hergebruiken de leerling-component!

export default function GroeiplanOverzichtLeerkracht() {
    const [selectedStudent, setSelectedStudent] = useState(null);

    // Een 'mock' context object om door te geven aan de leerling-component.
    // Dit zorgt ervoor dat de component denkt dat de geselecteerde leerling is ingelogd.
    const studentContext = {
        profile: selectedStudent
    };

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Zoek een leerling om het groeiplan te bekijken
                </label>
                <StudentSearch onStudentSelect={setSelectedStudent} />
            </div>

            {selectedStudent ? (
                // Zodra een leerling is gekozen, tonen we de leerling-component met de data van die leerling.
                // De 'key' zorgt ervoor dat de component volledig herlaadt als je een andere leerling kiest.
                <div key={selectedStudent.id}>
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