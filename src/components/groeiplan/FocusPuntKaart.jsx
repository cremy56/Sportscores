// src/components/groeiplan/FocusPuntKaart.jsx
import { useNavigate } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Target } from 'lucide-react';
import { useState } from 'react';
import { deleteDoc, X } from 'lucide-react'; // X ontbreekt
import ConfirmModal from '../ConfirmModal';

// De component is nu veel simpeler en heeft geen eigen state of useEffect meer.
export default function FocusPuntKaart({ test, schema, student, isVerplicht = false, isActief = false,
    isImproved = false }) {
    const navigate = useNavigate();
    const { profile } = useOutletContext();
    const [showConfirmRemove, setShowConfirmRemove] = useState(false);
    
    const isTeacherOrAdmin = profile?.rol === 'leerkracht' || profile?.rol === 'administrator' || profile?.rol === 'super-administrator';
    const studentIdentifier = student?.email;

    if (!studentIdentifier) {
        console.error('Geen geldige student identifier gevonden:', student);
        return <div className="text-red-500">Error: Geen geldige student informatie</div>;
    }

    const schemaInstanceId = `${studentIdentifier}_${schema.id}`;


    const handleRemoveImproved = async () => {
        try {
            await deleteDoc(doc(db, 'leerling_schemas', schemaInstanceId));
            toast.success("Trainingsschema verwijderd - goed gedaan!");
            window.location.reload(); // Of gebruik callback naar parent
        } catch (error) {
            toast.error("Kon schema niet verwijderen");
            console.error(error);
        }
        setShowConfirmRemove(false);
    };

    const handleStartSchema = async () => {
        const actiefSchemaRef = doc(db, 'leerling_schemas', schemaInstanceId);
        try {
            await setDoc(actiefSchemaRef, {
                leerling_id: studentIdentifier,
                schema_id: schema.id,
                start_datum: serverTimestamp(),
                huidige_week: 1,
                voltooide_taken: {},
                type: isVerplicht ? 'verplicht' : 'optioneel'
            });
            toast.success("Schema gestart! Veel succes!");
            handleContinueSchema();
        } catch (error) {
            console.error("Fout bij starten schema:", error);
            toast.error("Kon het schema niet starten.");
        }
    };

    const handleContinueSchema = () => {
        sessionStorage.setItem('currentSchema', JSON.stringify({
            userId: studentIdentifier,
            schemaTemplateId: schema.id,
            timestamp: Date.now()
        }));
        navigate('/groeiplan/schema');
    };
    
    // AANGEPAST: Styling op basis van verbeterde status
    const theme = {
        border: isImproved ? 'border-orange-300' : (isVerplicht ? 'border-red-300' : 'border-blue-200'),
        background: isImproved ? 'bg-gradient-to-br from-orange-50 to-yellow-50' : '',
        badgeBg: isImproved ? 'bg-orange-500' : (isVerplicht ? 'bg-red-600' : 'bg-blue-500'),
        badgeText: isImproved ? 'Doel Bereikt' : (isVerplicht ? 'Verplichte Focus' : 'Zelfgekozen'),
        titleColor: isImproved ? 'text-orange-600' : (isVerplicht ? 'text-red-600' : 'text-purple-600'),
        buttonBg: isImproved ? 'bg-orange-600 hover:bg-orange-700' : (isVerplicht ? 'bg-red-600 hover:bg-red-700' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700')
    };

    return (
        <>
            <div className={`bg-white rounded-2xl shadow-lg p-8 max-w-2xl mx-auto relative border-2 ${theme.border} ${theme.background}`}>
                <div className={`absolute -top-3 left-6 flex items-center text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg ${theme.badgeBg}`}>
                    {isVerplicht && <Target size={14} className="mr-2" />}
                    {theme.badgeText}
                </div>

                {/* NIEUW: X-knop voor verbeterde schema's */}
                {isImproved && !isTeacherOrAdmin && (
                    <button 
                        onClick={() => setShowConfirmRemove(true)}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-orange-500 text-white rounded-full hover:bg-orange-600 shadow-lg flex items-center justify-center transition-colors"
                    >
                        <X size={16} />
                    </button>
                )}

                <div className="text-center pt-4">
                    {isVerplicht && (
                        <>
                            <p className={`text-sm font-semibold uppercase mb-2 ${theme.titleColor}`}>
                                {isTeacherOrAdmin ? `Focuspunt voor ${student.naam}` : 'Jouw Focuspunt'}
                            </p>
                            <h2 className="text-3xl font-bold text-slate-800 mb-2">{test.test_naam || test.naam}</h2>
                        </>
                    )}
                    <h2 className={`text-3xl font-bold text-slate-800 mb-2 ${isVerplicht ? '' : 'mt-4'}`}>{schema.naam}</h2>
                    <p className="text-slate-500 mb-6">{schema.omschrijving}</p>
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                    <div className="flex justify-between items-center text-sm font-medium text-slate-600">
                        <span>Duur: {schema.duur_weken} weken</span>
                        <span>Categorie: {schema.categorie}</span>
                    </div>
                </div>

                <div className="text-center mt-8">
                    {isTeacherOrAdmin ? (
                        <button onClick={handleContinueSchema} className="px-8 py-3 bg-slate-600 text-white rounded-xl shadow-lg font-medium">
                            Bekijk Voortgang
                        </button>
                    ) : isActief ? (
                        <button onClick={handleContinueSchema} className={`px-8 py-3 text-white rounded-xl shadow-lg font-medium ${theme.buttonBg}`}>
                            Ga verder met je {schema.duur_weken}-wekenplan
                        </button>
                    ) : (
                        <button onClick={handleStartSchema} className={`px-8 py-3 text-white rounded-xl shadow-lg font-medium ${theme.buttonBg}`}>
                            Start mijn {schema.duur_weken}-wekenplan
                        </button>
                    )}
                </div>
            </div>

            {/* NIEUW: Confirm modal */}
            <ConfirmModal
                isOpen={showConfirmRemove}
                onClose={() => setShowConfirmRemove(false)}
                onConfirm={handleRemoveImproved}
                title="Schema Verwijderen"
            >
                Je hebt je doel bereikt voor <strong>{test.test_naam || test.naam}</strong>! 
                Wil je dit trainingsschema verwijderen?
            </ConfirmModal>
        </>
    );
}