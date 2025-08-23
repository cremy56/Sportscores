// src/components/groeiplan/FocusPuntKaart.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function FocusPuntKaart({ test, schema, student }) {
    const navigate = useNavigate();
    const { profile } = useOutletContext(); // Dit is de ingelogde gebruiker
    
    const isTeacherOrAdmin = profile?.rol === 'leerkracht' || profile?.rol === 'administrator';

    // We construeren de unieke ID voor het actieve schema
    const schemaInstanceId = `${student.id}_${schema.id}`;

    const handleStartSchema = async () => {
        const actiefSchemaRef = doc(db, 'leerling_schemas', schemaInstanceId);

        try {
            // Controleer eerst of het document niet al bestaat
            const docSnap = await getDoc(actiefSchemaRef);
            if (docSnap.exists()) {
                toast('Je volgt dit schema al.', { icon: '💡' });
                navigate(`/groeiplan/${schemaInstanceId}`);
                return;
            }

            await setDoc(actiefSchemaRef, {
                leerling_id: student.id,
                schema_id: schema.id,
                start_datum: serverTimestamp(),
                huidige_week: 1,
                voltooide_taken: {}
            });
            toast.success("Schema gestart! Veel succes!");
            navigate(`/groeiplan/${schemaInstanceId}`);

        } catch (error) {
            console.error("Fout bij starten schema:", error);
            toast.error("Kon het schema niet starten.");
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-2xl mx-auto">
            <div className="text-center">
                <p className="text-sm font-semibold text-purple-600 uppercase mb-2">
                    {isTeacherOrAdmin ? `Focuspunt voor ${student.naam}` : 'Jouw Focuspunt'}
                </p>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">{test.test_naam || test.naam}</h2>
                 <p className="text-slate-500 mb-6">
                    Hier is de meeste vooruitgang te boeken. Er staat een plan klaar!
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

            {/* --- START VAN DE WIJZIGING --- */}
            <div className="text-center mt-8">
                {isTeacherOrAdmin ? (
                    // Knop voor de leerkracht
                    <Link
                        to={`/groeiplan/${schemaInstanceId}`}
                        className="px-8 py-3 bg-slate-600 text-white rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 font-medium"
                    >
                        Bekijk Voortgang
                    </Link>
                ) : (
                    // Knop voor de leerling
                    <button 
                        onClick={handleStartSchema}
                        className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 font-medium"
                    >
                        Start mijn {schema.duur_weken}-wekenplan
                    </button>
                )}
            </div>
            {/* --- EINDE VAN DE WIJZIGING --- */}
        </div>
    );
}