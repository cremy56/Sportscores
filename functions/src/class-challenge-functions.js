// functions/src/class-challenge-functions.js
const {onCall} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const {FieldValue} = require('firebase-admin/firestore');
const db = admin.firestore();
const { getWeekStart, getWeekEnd, getWeekNumber, logXPTransaction } = require('./utils');

// =============================================
// SCHEDULED: Maak wekelijkse class challenges aan
// ✅ Correct: leerling_ids?.length al aanwezig
// =============================================
exports.createWeeklyClassChallenge = onSchedule('0 6 * * 1', async (event) => {
    try {
        const groupsSnapshot = await db.collection('groepen').get();

        for (const groupDoc of groupsSnapshot.docs) {
            const groupData = groupDoc.data();
            const groupId = groupDoc.id;

            // ✅ Correct: leerling_ids (niet leerlingen)
            const studentsCount = groupData.leerling_ids?.length || 0;
            if (studentsCount === 0) continue;

            const xpTarget = Math.max(2000, studentsCount * 150);
            const trainingTarget = Math.max(10, studentsCount * 2);

            const now = new Date();
            const weekStart = getWeekStart(now);
            const weekEnd = getWeekEnd(now);
            const weekId = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;

            await db.collection('class_challenges').doc(`${groupId}_${weekId}`).set({
                group_id: groupId,
                group_name: groupData.naam,
                school_id: groupData.school_id,
                week_id: weekId,
                week_start: weekStart,
                week_end: weekEnd,
                targets: { total_xp: xpTarget, total_trainings: trainingTarget },
                current_progress: { total_xp: 0, total_trainings: 0, participants: [] },
                reward_xp: 40,
                status: 'active',
                created_at: FieldValue.serverTimestamp()
            });
        }

        return { success: true };

    } catch (error) {
        console.error('Error creating weekly class challenges:', error);
        throw error;
    }
});

// =============================================
// CALLABLE: Update challenge voortgang
// ✅ FIX: userData.groepen bestaat niet!
//         Zoek groepen via leerling_ids in groepen collectie
// =============================================
exports.updateClassChallengeProgress = onCall(async (request) => {
    try {
        const { userId, xpEarned, action } = request.data;

        // Haal user op (userId = Firebase UID)
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return { success: false, error: 'User not found' };

        const userData = userDoc.data();

        // ✅ FIX: Zoek groepen via smartschool_id_hash in leerling_ids
        // userData.groepen bestaat niet → query groepen collectie
        const studentHash = userData.smartschool_id_hash;
        if (!studentHash) return { success: true }; // Geen hash → geen groepen

        const groepenQuery = await db.collection('groepen')
            .where('school_id', '==', userData.school_id)
            .where('leerling_ids', 'array-contains', studentHash)
            .get();

        if (groepenQuery.empty) return { success: true };

        // Huidige week ID
        const now = new Date();
        const weekStart = getWeekStart(now);
        const weekId = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;

        // Update challenge voor elke groep van de leerling
        for (const groupDoc of groepenQuery.docs) {
            const groupId = groupDoc.id;
            const challengeId = `${groupId}_${weekId}`;
            const challengeRef = db.collection('class_challenges').doc(challengeId);
            const challengeDoc = await challengeRef.get();

            if (!challengeDoc.exists) continue;

            const currentProgress = challengeDoc.data().current_progress;
            const updates = {};

            if (action === 'xp' && xpEarned) {
                updates['current_progress.total_xp'] = (currentProgress.total_xp || 0) + xpEarned;
            }
            if (action === 'training') {
                updates['current_progress.total_trainings'] = (currentProgress.total_trainings || 0) + 1;
            }

            // Track participant via Firebase UID (voor XP toekenning later)
            const participants = currentProgress.participants || [];
            if (!participants.includes(userId)) {
                updates['current_progress.participants'] = [...participants, userId];
            }

            if (Object.keys(updates).length > 0) {
                await challengeRef.update(updates);
                await checkChallengeCompletion(challengeId);
            }
        }

        return { success: true };

    } catch (error) {
        console.error('Error updating class challenge progress:', error);
        throw error;
    }
});

// =============================================
// HELPER: Check of challenge voltooid is
// =============================================
async function checkChallengeCompletion(challengeId) {
    const challengeRef = db.collection('class_challenges').doc(challengeId);
    const challengeDoc = await challengeRef.get();

    if (!challengeDoc.exists) return;

    const challengeData = challengeDoc.data();
    const { current_progress: progress, targets } = challengeData;

    const xpComplete = progress.total_xp >= targets.total_xp;
    const trainingComplete = progress.total_trainings >= targets.total_trainings;

    if (xpComplete && trainingComplete && challengeData.status === 'active') {
        await challengeRef.update({
            status: 'completed',
            completed_at: FieldValue.serverTimestamp()
        });

        const rewardXP = challengeData.reward_xp || 40;
        for (const userId of progress.participants) {
            await awardClassChallengeReward(userId, rewardXP, challengeData);
        }
    }
}

// =============================================
// HELPER: XP toekennen aan challenge deelnemers

// ✅ FIX: ongebruikte newXP/newSparks variabelen verwijderd
// =============================================
async function awardClassChallengeReward(userId, xpAmount, challengeData) {
    try {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) return;

        await userRef.update({
            xp: FieldValue.increment(xpAmount),
            xp_current_period: FieldValue.increment(xpAmount),
            xp_current_school_year: FieldValue.increment(xpAmount)
        });

        
        await logXPTransaction({
            user_id: userId,
            amount: xpAmount,
            reason: 'class_challenge_completion',
            source_id: challengeData.week_id,
            metadata: {
                group_name: challengeData.group_name,
                week_id: challengeData.week_id
            }
        });

    } catch (error) {
        console.error('Error awarding class challenge reward:', error);
    }
}