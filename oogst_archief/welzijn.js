// api/handlers/welzijn.js
// ⚠️ GDPR: enkel aggregaten naar leerkracht — geen raw gezondheidsdata
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
        for (const chunk of chunks) {
            const snap = await db.collection('toegestane_gebruikers').where('__name__', 'in', chunk).get();
            snap.docs.forEach(d => toegestaneData.set(d.id, d.data()));
        }

        const studentResults = [];
        let totalScore = 0, studentsCompleted = 0;
        const topPerformers = [], strugglingStudents = [];

        for (const uid of leerlingIds) {
            const tgData = toegestaneData.get(uid);
            const naam = tgData?.encrypted_name ? decryptName(tgData.encrypted_name, masterKey) : '[Onbekend]';

            const ehboDoc = await db.collection('ehbo_progress').doc(uid).get();
            if (!ehboDoc.exists) {
                studentResults.push({ id: uid, name: naam, isRegistered: false, progressPercentage: 0, averageScore: 0, completedScenarios: 0, certificationReady: false, lastActivity: null });
                continue;
            }

            const ehboData = ehboDoc.data();
            const completedScenarios = ehboData.completed_scenarios?.length || 0;
            const totalScenarios = ehboData.total_scenarios || 10;
            const progressPercentage = Math.round((completedScenarios / totalScenarios) * 100);
            const averageScore = ehboData.average_score || 0;
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

            studentResults.push({ id: uid, name: naam, isRegistered: true, progressPercentage, averageScore, completedScenarios, certificationReady, lastActivity: ehboData.last_activity?.toDate?.()?.toISOString() || null });
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

// ─── GET WELZIJN STATS ────────────────────────────────────────────────────────
// GDPR: enkel aggregaten — geen raw gezondheidsdata naar leerkracht
export async function handleGetWelzijnStats(req, res, decodedToken) {
    const { schoolId: sId, classId, studentId } = req.body;
    const verifiedSchoolId = await getSchoolId(decodedToken.uid);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const userRol = userDoc.data()?.rol || '';
    if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
    if (!['leerkracht', 'administrator', 'super-administrator'].includes(userRol)) {
        return res.status(403).json({ error: 'Geen toegang' });
    }

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
                groupStats: { totalStudents: 0, avgScore: 0, avgSleep: 0, avgSteps: 0, avgLogs7Days: 0, avgLogs30Days: 0, activeParticipation: 0 },
                studentData: []
            });
        }

        const masterKey = await getMasterKey();
        const chunks = [];
        for (let i = 0; i < leerlingIds.length; i += 30) chunks.push(leerlingIds.slice(i, i + 30));
        const toegestaneData = new Map();
        for (const chunk of chunks) {
            const snap = await db.collection('toegestane_gebruikers').where('__name__', 'in', chunk).get();
            snap.docs.forEach(d => toegestaneData.set(d.id, d.data()));
        }

        const now = new Date();
        const cutoff7 = new Date(now - 7 * 86400000).toISOString().split('T')[0];
        const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
        const humeurMap = { 'Slecht': 20, 'Matig': 40, 'Neutraal': 60, 'Goed': 80, 'Uitstekend': 100 };

        const studentDataArr = [];
        let totalScore = 0, totalSleep = 0, totalSteps = 0, totalLogs7 = 0, totalLogs30 = 0, activeCount = 0;

        for (const uid of leerlingIds) {
            const tgData = toegestaneData.get(uid);
            const naam = tgData?.encrypted_name ? decryptName(tgData.encrypted_name, masterKey) : '[Onbekend]';

            const logsSnap = await db.collection('welzijn').doc(uid)
                .collection('dagelijkse_data')
                .orderBy('__name__', 'desc')
                .limit(30)
                .get();

            const logs = logsSnap.docs.map(d => ({ date: d.id, ...d.data() }));
            const logs7 = logs.filter(l => l.date >= cutoff7).length;
            const logs30 = logs.length;

            const avgSleep = avg(logs.filter(l => l.slaap_uren).map(l => l.slaap_uren));
            const avgSteps = avg(logs.filter(l => l.stappen).map(l => l.stappen));
            const avgScore = avg(logs.filter(l => l.humeur).map(l => humeurMap[l.humeur] || 60));

            totalScore += avgScore;
            totalSleep += avgSleep;
            totalSteps += avgSteps;
            totalLogs7 += logs7;
            totalLogs30 += logs30;
            if (logs7 >= 3) activeCount++;

            studentDataArr.push({ id: uid, naam, avgScore, avgSleep, avgSteps, logs: { last7days: logs7, last30days: logs30 } });
        }

        const n = studentDataArr.length || 1;
        return res.status(200).json({
            success: true,
            groupStats: {
                totalStudents: leerlingIds.length,
                avgScore: Math.round(totalScore / n),
                avgSleep: Math.round((totalSleep / n) * 10) / 10,
                avgSteps: Math.round(totalSteps / n),
                avgLogs7Days: Math.round((totalLogs7 / n) * 10) / 10,
                avgLogs30Days: Math.round(totalLogs30 / n),
                activeParticipation: Math.round((activeCount / leerlingIds.length) * 100),
            },
            studentData: studentDataArr
        });
    } catch (err) {
        console.error('❌ handleGetWelzijnStats:', err);
        return res.status(500).json({ error: err.message });
    }
}
