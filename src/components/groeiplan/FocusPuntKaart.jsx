// src/components/groeiplan/FocusPuntKaart.jsx
import { useNavigate } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Target, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import ConfirmModal from '../ConfirmModal';
import { apiCall } from '../../utils/api';

export default function FocusPuntKaart({ test, schema, student, isVerplicht = false, isActief = false,
    isImproved = false }) {
    const navigate = useNavigate();
    const { profile } = useOutletContext();
    const [showConfirmRemove, setShowConfirmRemove] = useState(false);

    const isTeacherOrAdmin = profile?.rol === 'leerkracht' || profile?.rol === 'administrator' || profile?.rol === 'super-administrator';

    // Identifier voor leerling_schemas.leerling_id.
    // FIX: de server (training-functions.js/getUserByHash) matcht op
    // users.toegestane_gebruikers_id — 'smartschool_id_hash' bestaat NIET in users.
    // Gebruik dus toegestane_gebruikers_id, met id als fallback. Dit zorgt dat
    // SchemaDetail's isCurrentUser-check klopt en de leerling de 'Opdracht
    // voltooid'-knop ziet, óók bij een verplicht schema.
    const studentIdentifier = student?.toegestane_gebruikers_id || student?.id;

    // Voortgang (gevalideerde weken) tonen op de kaart. Alleen zinvol als het
    // schema al gestart is; anders blijft de balk op 0%. We halen het actieve
    // schema-document op via get_schema_actief en tellen gevalideerde weken.
    const [voortgangPct, setVoortgangPct] = useState(0);

    useEffect(() => {
        if (!isActief || !studentIdentifier || !schema?.id) return;
        let actief = true;

        (async () => {
            try {
                const data = await apiCall('/api/tests', {
                    action: 'get_schema_actief',
                    schoolId: profile?.school_id,
                    leerlingId: studentIdentifier,
                    schemaTemplateId: schema.id
                });
                const gevalideerd = data?.actiefSchema?.gevalideerde_weken || {};
                const aantalGevalideerd = Object.values(gevalideerd)
                    .filter(w => w?.gevalideerd === true).length;
                const totaal = schema?.duur_weken || 0;
                const pct = totaal > 0
                    ? Math.min(100, Math.round((aantalGevalideerd / totaal) * 100))
                    : 0;
                if (actief) setVoortgangPct(pct);
            } catch (err) {
                console.error('Kon voortgang niet laden:', err);
            }
        })();

        return () => { actief = false; };
    }, [isActief, studentIdentifier, schema?.id, schema?.duur_weken, profile?.school_id]);


    if (!studentIdentifier) {
        console.error('Geen geldige student identifier gevonden:', student);
        return <div className="text-red-500">Error: Geen geldige student informatie</div>;
    }

    const schemaInstanceId = `${studentIdentifier}_${schema.id}`;

   const handleRemoveImproved = async () => {
    try {
        await apiCall('/api/tests', {
            action: 'delete_leerling_schema',
            schoolId: profile.school_id,
            leerlingId: studentIdentifier,
            schemaTemplateId: schema.id
        });
        toast.success("Trainingsschema verwijderd - goed gedaan!");
        window.location.reload();
    } catch (error) {
        toast.error("Kon schema niet verwijderen");
        console.error(error);
    }
    setShowConfirmRemove(false);
};

    const handleStartSchema = async () => {
    try {
        await apiCall('/api/tests', {
            action: 'start_schema',
            schoolId: profile.school_id,
            leerlingId: studentIdentifier,
            schemaTemplateId: schema.id,
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
    navigate('/groeiplan/schema', {
        state: { userId: studentIdentifier, schemaTemplateId: schema.id }
    });
};

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

                {isImproved && !isTeacherOrAdmin && (
                    <button
                        onClick={() => setShowConfirmRemove(true)}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-orange-500 text-white rounded-full hover:bg-orange-600 shadow-lg flex items-center justify-center transition-colors"
                    >
                        <X size={16} />
                    </button>
                )}

                <div className="text-center pt-4">
                    <h2 className="text-3xl font-bold text-slate-800 mb-2 mt-4">{schema.naam}</h2>
                    <p className="text-slate-500 mb-6">{schema.omschrijving}</p>
                </div>

                <div className="relative overflow-hidden bg-slate-50 rounded-xl border border-slate-200 p-6">
                    {/* Subtiele voortgangsvulling: breedte = % gevalideerde weken */}
                    <div
                        className="absolute inset-y-0 left-0 bg-red-500/15 transition-all duration-500"
                        style={{ width: `${voortgangPct}%` }}
                        aria-hidden="true"
                    ></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-center text-sm font-medium text-slate-600">
                            <span>Duur: {schema.duur_weken} weken</span>
                            <span>Categorie: {schema.categorie}</span>
                        </div>
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