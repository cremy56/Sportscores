// src/pages/Groeiplan.jsx
import { useOutletContext } from 'react-router-dom';
import GroeiplanLeerling from '../components/groeiplan/GroeiplanLeerling';
import GroeiplanOverzichtLeerkracht from '../components/groeiplan/GroeiplanOverzichtLeerkracht';

export default function Groeiplan() {
    const { profile } = useOutletContext();

    const isTeacherOrAdmin = profile?.rol === 'leerkracht' || profile?.rol === 'administrator';

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="text-center mb-12">
                <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
                    {isTeacherOrAdmin ? 'Overzicht Groeiplannen' : 'Mijn Groeiplan'}
                </h1>
                <p className="text-slate-600">
                    {isTeacherOrAdmin 
                        ? 'Bekijk en valideer de voortgang van leerlingen.' 
                        : 'Focus op je zwakste punt en word elke dag beter!'}
                </p>
            </div>

            {/* De 'verkeerswisselaar': toon de juiste component op basis van de rol */}
            {isTeacherOrAdmin ? (
                <GroeiplanOverzichtLeerkracht />
            ) : (
                <GroeiplanLeerling />
            )}
        </div>
    );
}