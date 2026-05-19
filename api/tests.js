// api/tests.js — dunne router
// Frontend roept nog steeds /api/tests aan — geen wijzigingen in de client nodig.
import { verifyToken } from '../lib/firebaseAdmin.js';

import {
    handleGetTests, handleGetLeaderboard, handleGetSetupData,
    handleGetLeerlingenVoorGroep, handleGetNormen, handleGetRecentScores,
    handleSaveScores, handleGetTestafnameDetail, handleUpdateScore,
    handleDeleteScore, handleUpdateScoreDate, handleDeleteTestafname,
    handleGetEvaluaties, handleDeleteTest, handleGetStudentEvolution,
    handleGetScoreNorms, handleGetStudentProfile, handleGetTestRanking,
} from './handlers/testen.js';

import {
    handleSaveNorm, handleUpdateNorm, handleDeleteNormen, handleImportNormen,
} from './handlers/normen.js';

import {
    handleGetGroepen, handleGetMijnKlassen, handleCreateGroep, handleUpdateGroep,
    handleDeleteGroep, handleGetGroepDetail, handleAddLeerling, handleRemoveLeerling,
    handleGetKlasDetail, handleSetVrijstelling,
} from './handlers/groepen.js';

import {
    handleGetGroeiplanData, handleGetTrainingsschemas, handleGetTrainingsschemaForTest,
    handleAddOptioneelSchema, handleRemoveOptioneelSchema, handleCheckSchemaExists,
    handleStartSchema, handleDeleteLeerlingSchema, handleSaveSchema, handleSaveOefening,
    handleGetOefeningDetail, handleGetOefeningen, handleGetSchemaDetail,
    handleGetSchemaActief, handleVoltooienTaak, handleValideerWeek,
} from './handlers/schemas.js';

import {
    handleSaveTest, handleSaveSchool, handleGetSchoolSettings, handleSaveSchoolSettings,
    handleGetScholen, handleGetRapportperioden, handleDeleteSchool,
    handleDeleteRapportperiode, handleSaveRapportperiode,
} from './handlers/scholen.js';

import {
    handleGetEhboStats, handleGetWelzijnStats,
} from './handlers/welzijn.js';

import {
    handleStartSportLabSessie, handleSluitSportLabSessie,
    handleGetActieveSportLabSessie, handleGetSportLabSessies,
    handleJoinSportLabSessie, handleSubmitZelfreflectie,
    handleValideerLevelUp, handleGetSportLabContent,
    handleSaveSportLabScore, handleSportlabObservatieKlaar,
    handleGetSportLabToernooiSpelers, handleStartToernooi,
    handleUpdateMatchScore, handleStopToernooi, handleVolgendeRonde,
    handleGetBlessureContent,
    handleSubmitWaarnemerMetingen, handleGetWaarnemerMetingen, handleMarkeerWaarnemerGekoppeld,
} from './handlers/sportlab.js';

// ─── HOOFD HANDLER ────────────────────────────────────────────────────────────
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
        const decodedToken = await verifyToken(req.headers.authorization);
        const { action } = req.body;

        switch (action) {
            // ── Testen & Scores ────────────────────────────────────────────────
            case 'get_tests':               return await handleGetTests(req, res, decodedToken);
            case 'get_leaderboard':         return await handleGetLeaderboard(req, res, decodedToken);
            case 'get_setup_data':          return await handleGetSetupData(req, res, decodedToken);
            case 'get_leerlingen_voor_groep': return await handleGetLeerlingenVoorGroep(req, res, decodedToken);
            case 'get_normen':              return await handleGetNormen(req, res, decodedToken);
            case 'get_recent_scores':       return await handleGetRecentScores(req, res, decodedToken);
            case 'save_scores':             return await handleSaveScores(req, res, decodedToken);
            case 'get_testafname_detail':   return await handleGetTestafnameDetail(req, res, decodedToken);
            case 'update_score':            return await handleUpdateScore(req, res, decodedToken);
            case 'delete_score':            return await handleDeleteScore(req, res, decodedToken);
            case 'update_score_date':       return await handleUpdateScoreDate(req, res, decodedToken);
            case 'delete_testafname':       return await handleDeleteTestafname(req, res, decodedToken);
            case 'get_evaluaties':          return await handleGetEvaluaties(req, res, decodedToken);
            case 'delete_test':             return await handleDeleteTest(req, res, decodedToken);
            case 'get_student_evolution':   return await handleGetStudentEvolution(req, res, decodedToken);
            case 'get_score_norms':         return await handleGetScoreNorms(req, res, decodedToken);
            case 'get_student_profile':     return await handleGetStudentProfile(req, res, decodedToken);
            case 'get_test_ranking':        return await handleGetTestRanking(req, res, decodedToken);

            // ── Normen ─────────────────────────────────────────────────────────
            case 'save_norm':               return await handleSaveNorm(req, res, decodedToken);
            case 'update_norm':             return await handleUpdateNorm(req, res, decodedToken);
            case 'delete_normen':           return await handleDeleteNormen(req, res, decodedToken);
            case 'import_normen':           return await handleImportNormen(req, res, decodedToken);

            // ── Groepen & Klassen ──────────────────────────────────────────────
            case 'get_groepen':             return await handleGetGroepen(req, res, decodedToken);
            case 'get_mijn_klassen':        return await handleGetMijnKlassen(req, res, decodedToken);
            case 'create_groep':            return await handleCreateGroep(req, res, decodedToken);
            case 'update_groep':            return await handleUpdateGroep(req, res, decodedToken);
            case 'delete_groep':            return await handleDeleteGroep(req, res, decodedToken);
            case 'get_groep_detail':        return await handleGetGroepDetail(req, res, decodedToken);
            case 'add_leerling':            return await handleAddLeerling(req, res, decodedToken);
            case 'remove_leerling':         return await handleRemoveLeerling(req, res, decodedToken);
            case 'get_klas_detail':         return await handleGetKlasDetail(req, res, decodedToken);
            case 'set_vrijstelling': return handleSetVrijstelling(req, res, decodedToken);

            // ── Trainingsschemas & Oefeningen ──────────────────────────────────
            case 'get_groeiplan_data':          return await handleGetGroeiplanData(req, res, decodedToken);
            case 'get_trainingsschemas':        return await handleGetTrainingsschemas(req, res, decodedToken);
            case 'get_trainingsschema_for_test': return await handleGetTrainingsschemaForTest(req, res, decodedToken);
            case 'add_optioneel_schema':        return await handleAddOptioneelSchema(req, res, decodedToken);
            case 'remove_optioneel_schema':     return await handleRemoveOptioneelSchema(req, res, decodedToken);
            case 'check_schema_exists':         return await handleCheckSchemaExists(req, res, decodedToken);
            case 'start_schema':                return await handleStartSchema(req, res, decodedToken);
            case 'delete_leerling_schema':      return await handleDeleteLeerlingSchema(req, res, decodedToken);
            case 'save_schema':                 return await handleSaveSchema(req, res, decodedToken);
            case 'save_oefening':               return await handleSaveOefening(req, res, decodedToken);
            case 'get_oefening_detail':         return await handleGetOefeningDetail(req, res, decodedToken);
            case 'get_oefeningen':              return await handleGetOefeningen(req, res, decodedToken);
            case 'get_schema_detail':           return await handleGetSchemaDetail(req, res, decodedToken);
            case 'get_schema_actief':           return await handleGetSchemaActief(req, res, decodedToken);
            case 'voltooien_taak':              return await handleVoltooienTaak(req, res, decodedToken);
            case 'valideer_week':               return await handleValideerWeek(req, res, decodedToken);

            // ── School admin ───────────────────────────────────────────────────
            case 'save_test':               return await handleSaveTest(req, res, decodedToken);
            case 'save_school':             return await handleSaveSchool(req, res, decodedToken);
            case 'get_school_settings':     return await handleGetSchoolSettings(req, res, decodedToken);
            case 'save_school_settings':    return await handleSaveSchoolSettings(req, res, decodedToken);
            case 'get_scholen':             return await handleGetScholen(req, res, decodedToken);
            case 'get_rapportperioden':     return await handleGetRapportperioden(req, res, decodedToken);
            case 'delete_school':           return await handleDeleteSchool(req, res, decodedToken);
            case 'delete_rapportperiode':   return await handleDeleteRapportperiode(req, res, decodedToken);
            case 'save_rapportperiode':     return await handleSaveRapportperiode(req, res, decodedToken);

            // ── Welzijn & EHBO stats (leerkracht view) ─────────────────────────
            case 'get_ehbo_stats':          return await handleGetEhboStats(req, res, decodedToken);
            case 'get_welzijn_stats':       return await handleGetWelzijnStats(req, res, decodedToken);

            // ── SportLab ──────────────────────────────────────────────────────
            case 'start_sportlab_sessie':        return await handleStartSportLabSessie(req, res, decodedToken);
            case 'sluit_sportlab_sessie':        return await handleSluitSportLabSessie(req, res, decodedToken);
            case 'get_actieve_sportlab_sessie':  return await handleGetActieveSportLabSessie(req, res, decodedToken);
            case 'get_sportlab_sessies':         return await handleGetSportLabSessies(req, res, decodedToken);
            case 'join_sportlab_sessie':         return await handleJoinSportLabSessie(req, res, decodedToken);
            case 'submit_zelfreflectie':         return await handleSubmitZelfreflectie(req, res, decodedToken);
            case 'valideer_level_up':            return await handleValideerLevelUp(req, res, decodedToken);
            case 'get_sportlab_content':         return await handleGetSportLabContent(req, res, decodedToken);
            case 'save_sportlab_score':          return await handleSaveSportLabScore(req, res, decodedToken); // <--- NIEUW
            case 'sportlab_observatie_klaar':    return await handleSportlabObservatieKlaar(req, res, decodedToken); // <--- DEZE REGEL TOEVOEGEN
            case 'get_sportlab_toernooi_spelers': return await handleGetSportLabToernooiSpelers(req, res, decodedToken);
            case 'start_toernooi': return await handleStartToernooi(req, res, decodedToken);
            case 'update_match_score': return await handleUpdateMatchScore(req, res, decodedToken);
            case 'stop_toernooi': return await handleStopToernooi(req, res, decodedToken);
            case 'volgende_ronde': return await handleVolgendeRonde(req, res, decodedToken);
            case 'get_blessure_content':         return await handleGetBlessureContent(req, res, decodedToken);
            case 'submit_waarnemer_metingen':    return await handleSubmitWaarnemerMetingen(req, res, decodedToken);
            case 'get_waarnemer_metingen':       return await handleGetWaarnemerMetingen(req, res, decodedToken);
            case 'markeer_waarnemer_gekoppeld':  return await handleMarkeerWaarnemerGekoppeld(req, res, decodedToken);
            default:
                return res.status(400).json({ error: `Onbekende action: ${action}` });
        }

    } catch (error) {
        if (error.message?.includes('token')) {
            return res.status(401).json({ error: 'Niet geauthenticeerd: ' + error.message });
        }
        console.error('❌ API Hoofd-error in /tests:', error);
        return res.status(500).json({ error: 'Fout bij verwerken test data' });
    }
}