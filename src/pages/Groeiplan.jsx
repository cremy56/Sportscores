// src/pages/Groeiplan.jsx
import { useOutletContext } from 'react-router-dom';
import GroeiplanLeerling from '../components/groeiplan/GroeiplanLeerling';
import GroeiplanOverzichtLeerkracht from '../components/groeiplan/GroeiplanOverzichtLeerkracht';

export default function Groeiplan() {
    const { profile } = useOutletContext();

    const isTeacherOrAdmin = profile?.rol === 'leerkracht' || profile?.rol === 'administrator';

    return (
        <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 py-4 lg:px-8 space-y-4">
                
                {/* Header zoals Evolutie - zonder card */}
                <div className="mb-8 mt-20">
                    <div className="text-center lg:text-left">
                        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
                            {isTeacherOrAdmin ? 'Overzicht Groeiplannen' : 'Mijn Groeiplan'}
                        </h1>
                        <p className="text-sm text-slate-600 mb-3">
                            {isTeacherOrAdmin 
                                ? 'Bekijk en valideer de voortgang van leerlingen.' 
                                : 'Focus op je zwakste punt en word elke dag beter!'}
                        </p>
                        {!isTeacherOrAdmin && (
                            <div className="flex justify-center lg:justify-start">
                                <div className="w-20 h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* De 'verkeerswisselaar': toon de juiste component op basis van de rol */}
                {isTeacherOrAdmin ? (
                    <GroeiplanOverzichtLeerkracht />
                ) : (
                    <GroeiplanLeerling />
                )}
            </div>
        </div>
    );
}