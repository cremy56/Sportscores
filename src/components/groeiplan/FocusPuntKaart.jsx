// src/components/groeiplan/FocusPuntKaart.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Target } from 'lucide-react';

export default function FocusPuntKaart({ test, schema, student, isVerplicht = false }) {
    const navigate = useNavigate();
    const { profile } = useOutletContext(); // Dit is de ingelogde gebruiker
    const [schemaExists, setSchemaExists] = useState(false);
    const [loading, setLoading] = useState(true);
    
    const isTeacherOrAdmin = profile?.rol === 'leerkracht' || profile?.rol === 'administrator';

    // We gebruiken het juiste ID veld - waarschijnlijk email in plaats van id
    const studentIdentifier = student?.id || student?.email;
    
    if (!studentIdentifier) {
        console.error('Geen geldige student identifier gevonden:', student);
        return <div className="text-red-500">Error: Geen geldige student informatie</div>;
    }

    // We construeren de unieke ID voor het actieve schema
    const schemaInstanceId = `${studentIdentifier}_${schema.id}`;

    // Controleer bij het laden van de component of het schema al bestaat
    useEffect(() => {
        const checkSchemaExists = async () => {
            if (!isTeacherOrAdmin) { // Alleen controleren voor leerlingen
                try {
                    const actiefSchemaRef = doc(db, 'leerling_schemas', schemaInstanceId);
                    const docSnap = await getDoc(actiefSchemaRef);
                    setSchemaExists(docSnap.exists());
                } catch (error) {
                    console.error("Fout bij controleren schema:", error);
                }
            }
            setLoading(false);
        };

        checkSchemaExists();
    }, [schemaInstanceId, isTeacherOrAdmin]);

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
                leerling_id: studentIdentifier,
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

    const handleContinueSchema = () => {
        navigate(`/groeiplan/${schemaInstanceId}`);
    };
// --- START STYLING AANPASSINGEN ---
    if (isVerplicht) {
        return (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-red-300 p-8 max-w-2xl mx-auto relative">
                {/* Rode badge */}
                <div className="absolute -top-3 left-6 flex items-center bg-red-600 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                    <Target size={14} className="mr-2" />
                    Verplichte Focus
                </div>

                <div className="text-center pt-4">
                    <p className="text-sm font-semibold text-red-600 uppercase mb-2">
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

                <div className="text-center mt-8">
                    {isTeacherOrAdmin ? (
                        <Link
                            to={`/groeiplan/${schemaInstanceId}`}
                            className="px-8 py-3 bg-slate-600 text-white rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 font-medium"
                        >
                            Bekijk Voortgang
                        </Link>
                    ) : loading ? (
                        <div className="px-8 py-3 bg-gray-300 text-gray-500 rounded-xl font-medium cursor-not-allowed">Laden...</div>
                    ) : schemaExists ? (
                        <button 
                            onClick={handleContinueSchema}
                            className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 font-medium"
                        >
                            Ga verder met je {schema.duur_weken}-wekenplan
                        </button>
                    ) : (
                        <button 
                            onClick={handleStartSchema}
                            className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 font-medium"
                        >
                            Start mijn {schema.duur_weken}-wekenplan
                        </button>
                    )}
                </div>
            </div>
        );
    }
    // --- EINDE STYLING AANPASSINGEN (Hieronder de oude, ongewijzigde code voor andere kaarten) ---
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

            <div className="text-center mt-8">
                {isTeacherOrAdmin ? (
                    // Knop voor de leerkracht
                    <Link
                        to={`/groeiplan/${schemaInstanceId}`}
                        className="px-8 py-3 bg-slate-600 text-white rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 font-medium"
                    >
                        Bekijk Voortgang
                    </Link>
                ) : loading ? (
                    // Loading state voor leerlingen
                    <div className="px-8 py-3 bg-gray-300 text-gray-500 rounded-xl font-medium cursor-not-allowed">
                        Laden...
                    </div>
                ) : schemaExists ? (
                    // Knop voor leerling die al begonnen is
                    <button 
                        onClick={handleContinueSchema}
                        className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 font-medium"
                    >
                        Ga verder met je {schema.duur_weken}-wekenplan
                    </button>
                ) : (
                    // Knop voor leerling die nog niet begonnen is
                    <button 
                        onClick={handleStartSchema}
                        className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 font-medium"
                    >
                        Start mijn {schema.duur_weken}-wekenplan
                    </button>
                )}
            </div>
        </div>
    );
}
