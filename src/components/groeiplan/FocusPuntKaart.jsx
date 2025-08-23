// src/components/groeiplan/FocusPuntKaart.jsx
import { Link } from 'react-router-dom'; // Later voor de detailpagina

export default function FocusPuntKaart({ test, schema }) {
    return (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-2xl mx-auto">
            <div className="text-center">
                <p className="text-sm font-semibold text-purple-600 uppercase mb-2">Jouw Focuspunt</p>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">{test.test_naam}</h2>
                <p className="text-slate-500 mb-6">
                    Hier kun je de meeste vooruitgang boeken. We hebben een plan voor je gevonden!
                </p>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-700 mb-1">{schema.naam}</h3>
                <p className="text-sm text-slate-500 mb-4">{schema.omschrijving}</p>
                
                <div className="flex justify-between items-center text-sm font-medium text-slate-600">
                    <span>Duur: {schema.duur_weken} weken</span>
                    <span>Categorie: {schema.categorie}</span>
                </div>
            </div>

            <div className="text-center mt-8">
                <button 
                    onClick={() => alert(`Start schema: ${schema.naam}`)} // Tijdelijke actie
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 font-medium"
                >
                    Start mijn {schema.duur_weken}-wekenplan
                </button>
            </div>
        </div>
    );
}