// src/pages/Groeiplan.jsx
import { useOutletContext } from 'react-router-dom';
import { useState } from 'react';
import GroeiplanLeerling from '../components/groeiplan/GroeiplanLeerling';
import GroeiplanOverzichtLeerkracht from '../components/groeiplan/GroeiplanOverzichtLeerkracht';
import StudentSearch from '../components/StudentSearch';

export default function Groeiplan() {
    const { profile } = useOutletContext();
    const [selectedStudent, setSelectedStudent] = useState(null);

    const isTeacherOrAdmin = profile?.rol === 'leerkracht' || profile?.rol === 'administrator';

    const handleStudentSelect = (student) => {
        setSelectedStudent(student);
    };

    return (
        <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 py-4 lg:px-8 space-y-4">
                
                {/* Header zoals Evolutie - zonder card */}
                {isTeacherOrAdmin ? (
                    <div className="mb-8 mt-20">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            {/* Titel sectie */}
                            <div className="text-center lg:text-left lg:flex-1">
                                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
                                    {selectedStudent ? selectedStudent.naam : 'Overzicht Schema\'s'}
                                </h1>
                                <p className="text-sm text-slate-600 mb-3">
                                    {selectedStudent 
                                        ? 'Bekijk en valideer de voortgang van deze leerling.'
                                        : 'Selecteer een leerling om het groeiplan te bekijken'
                                    }
                                </p>
                            </div>
                            
                            {/* Controls sectie */}
                            <div className="lg:flex-shrink-0 lg:w-[300px]">
                                <div className="grid grid-cols-1 gap-3">
                                    <div>
                                        <label className="inline-block text-sm font-medium text-slate-700 mb-2">
                                            Zoek Leerling
                                        </label>
                                        <StudentSearch 
                                            onStudentSelect={handleStudentSelect}
                                            schoolId={profile?.school_id}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mb-8 mt-20">
                        <div className="text-center lg:text-left">
                            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
                                Mijn Groeiplan
                            </h1>
                            <p className="text-sm text-slate-600 mb-3">
                                Focus op je zwakste punt en word elke dag beter!
                            </p>
                            <div className="flex justify-center lg:justify-start">
                                <div className="w-20 h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* De 'verkeerswisselaar': toon de juiste component op basis van de rol */}
                {isTeacherOrAdmin ? (
                    <GroeiplanOverzichtLeerkracht selectedStudent={selectedStudent} />
                ) : (
                    <GroeiplanLeerling />
                )}
            </div>
        </div>
    );
}