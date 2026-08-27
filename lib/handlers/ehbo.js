// lib/handlers/ehbo.js
// Afgesplitst uit lib/handlers/welzijn.js (verwijderd bij ontmanteling welzijnsmodule, jul 2026).
// EHBO is een kenniscompetentie (leeractiviteit), geen gezondheidsdata — blijft bestaan.
import { db } from '../firebaseAdmin.js';
import { getSchoolId, decryptName } from '../apiHelpers.js';
import { getMasterKey } from '../keyManager.js';

// ─── GET EHBO STATS ───────────────────────────────────────────────────────────
export async function handleGetEhboStats(req, res, decodedToken) {
    const { schoolId: sId, classId, studentId } = req.body;
    const verifiedSchoolId = await getSchoolId(decodedToken.uid);
    if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });

    try {
        let leerlingIds = [];
        if (studentId) {
            leerlingIds = [studentId];
        } else if (classId) {
            const groepDoc = await db.collection('groepen').doc(classId).get();
            if (!groepDoc.exists) return res.status(404).json({ error: 'Groep niet gevonden' });
            if (groepDoc.data().school_id !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
            leerlingIds = groepDoc.data().leerling_ids || [];
        } else {
            return res.status(400).json({ error: 'classId of studentId vereist' });
        }

        if (leerlingIds.length === 0) {
            return res.status(200).json({
                success: true,
                classStats: { totalStudents: 0, studentsCompleted: 0, averageScore: 0, topPerformers: [], strugglingStudents: [] },
                students: []
            });
        }

        const masterKey = await getMasterKey();
        const chunks = [];
        for (let i = 0; i < leerlingIds.length; i += 30) chunks.push(leerlingIds.slice(i, i + 30));

        const toegestaneData = new Map();
        // FIX (aug 2026): de voortgang werd gezocht in een collectie
        // 'ehbo_progress' die NIET BESTAAT — saveEHBOProgress schrijft naar
        // users/{uid}.ehbo_completion_stats (tellers) en .ehbo_scores (beste
        // score per scenario). Daardoor toonde de monitor elke leerling als
        // 'niet geregistreerd', ook na een afgerond scenario.
        // We halen de users-documenten hier op, gekoppeld via
        // toegestane_gebruikers_id (het veld dat auth.js schrijft).
        const userData = new Map();
        for (const chunk of chunks) {
            const snap = await db.collection('toegestane_gebruikers').where('__name__', 'in', chunk).get();
            snap.docs.forEach(d => toegestaneData.set(d.id, d.data()));

            const uSnap = await db.collection('users').where('toegestane_gebruikers_id', 'in', chunk).get();
            uSnap.docs.forEach(d => userData.set(d.data().toegestane_gebruikers_id, d.data()));
        }

        // Totaal aantal scenario's waarop de voortgang wordt afgezet.
        const TOTAAL_SCENARIOS = 18;

        const studentResults = [];
        let totalScore = 0, studentsCompleted = 0;
        const topPerformers = [], strugglingStudents = [];

        for (const uid of leerlingIds) {
            const tgData = toegestaneData.get(uid);
            const naam = tgData?.encrypted_name ? decryptName(tgData.encrypted_name, masterKey) : '[Onbekend]';

            const uData = userData.get(uid);
            const stats  = uData?.ehbo_completion_stats || {};
            const scores = uData?.ehbo_scores || {};
            const afgerond = Object.keys(stats);

            if (afgerond.length === 0) {
                studentResults.push({ id: uid, name: naam, isRegistered: false, progressPercentage: 0, averageScore: 0, completedScenarios: 0, certificationReady: false, lastActivity: null });
                continue;
            }

            const completedScenarios = afgerond.length;
            const progressPercentage = Math.round((completedScenarios / TOTAAL_SCENARIOS) * 100);

            // Gemiddelde over de scenario's waarvoor een score bekend is.
            // Scenario's van vóór deze fix hebben er geen; die tellen niet mee
            // in plaats van als nul, anders zou het gemiddelde onterecht kelderen.
            const scoreWaarden = Object.values(scores).filter(v => typeof v === 'number');
            const averageScore = scoreWaarden.length > 0
                ? Math.round(scoreWaarden.reduce((a, b) => a + b, 0) / scoreWaarden.length)
                : 0;

            const certificationReady = progressPercentage >= 80 && averageScore >= 70;

            totalScore += averageScore;
            if (certificationReady) studentsCompleted++;
            if (averageScore >= 80) topPerformers.push({ name: naam, averageScore, completedScenarios });
            if (averageScore < 50 || progressPercentage < 30) {
                strugglingStudents.push({
                    name: naam,
                    issue: averageScore < 50 ? 'low_scores' : 'inactive',
                    recommendation: averageScore < 50 ? 'Extra oefening nodig' : 'Nog niet gestart'
                });
            }

            studentResults.push({ id: uid, name: naam, isRegistered: true, progressPercentage, averageScore, completedScenarios, certificationReady, lastActivity: uData?.last_activity?.toDate?.()?.toISOString() || null });
        }

        const registered = studentResults.filter(s => s.isRegistered);
        return res.status(200).json({
            success: true,
            classStats: {
                totalStudents: leerlingIds.length,
                studentsCompleted,
                averageScore: registered.length > 0 ? Math.round(totalScore / registered.length) : 0,
                topPerformers: topPerformers.sort((a, b) => b.averageScore - a.averageScore).slice(0, 5),
                strugglingStudents: strugglingStudents.slice(0, 5),
            },
            students: studentResults
        });
    } catch (err) {
        console.error('❌ handleGetEhboStats:', err);
        return res.status(500).json({ error: err.message });
    }
}