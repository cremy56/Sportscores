// src/components/groeiplan/FocusPuntKaart.jsx
import { useNavigate } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

// De component accepteert nu 'student' (het profiel van de leerling)
export default function FocusPuntKaart({ test, schema, student }) {
    const navigate = useNavigate();
    const { profile } = useOutletContext(); // Dit is de ingelogde gebruiker
    
    // De leerkracht ziet de kaart, maar niet de knop.
    const isTeacherOrAdmin = profile?.rol === 'leerkracht' || profile?.rol === 'administrator';

    const handleStartSchema = async () => {
        // Genereer een unieke ID voor dit actieve schema
        const newSchemaInstanceId = `${student.id}_${schema.id}`;
        const actiefSchemaRef = doc(db, 'leerling_schemas', newSchemaInstanceId);

        try {
            await setDoc(actiefSchemaRef, {
                leerling_id: student.id,
                schema_id: schema.id,
                start_datum: serverTimestamp(),
                huidige_week: 1,
                voltooide_taken: {}
            });
            toast.success("Schema gestart! Veel succes!");
            
            // Navigeer naar de nieuwe detailpagina
            navigate(`/groeiplan/${newSchemaInstanceId}`);

        } catch (error) {
            console.error("Fout bij starten schema:", error);
            toast.error("Kon het schema niet starten.");
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-2xl mx-auto">
            <div className="text-center">
                {/* De titel verandert op basis van wie er kijkt */}
                <p className="text-sm font-semibold text-purple-600 uppercase mb-2">
                    {isTeacherOrAdmin ? `Focuspunt voor ${student.naam}` : 'Jouw Focuspunt'}
                </p>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">{test.test_naam || test.naam}</h2>
                 <p className="text-slate-500 mb-6">
                    Hier is de meeste vooruitgang te boeken. Er staat een plan klaar!
                </p>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                 {/* ... (deze inhoud blijft hetzelfde) ... */}
            </div>

            {/* De knop wordt alleen getoond aan de leerling */}
            {!isTeacherOrAdmin && (
                <div className="text-center mt-8">
                    <button 
                        onClick={handleStartSchema}
                        className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 font-medium"
                    >
                        Start mijn {schema.duur_weken}-wekenplan
                    </button>
                </div>
            )}
        </div>
    );
}