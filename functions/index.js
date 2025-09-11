const {onDocumentUpdated} = require('firebase-functions/v2/firestore');
const {onCall} = require('firebase-functions/v2/https');
const {onRequest} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');

// Firebase Admin SDK imports
const admin = require('firebase-admin');
const {FieldValue} = require('firebase-admin/firestore');

// Initialiseer Firebase Admin APP - dit gebeurt EENMAAL bij startup
admin.initializeApp();

// Maak globale database reference - gebruik dit overal in plaats van getDb()
const db = admin.firestore();

// ==============================================
// PRIVATE SPORT NEWS PROXY
// ==============================================

// Private proxy voor sport nieuws - vermijdt CORS issues
exports.getSportNews = onRequest({
  // Geef de lijst direct aan de ingebouwde CORS-handler van Firebase
  cors: [
    'https://sportscores-app.firebaseapp.com',
    'https://sportscores-app.web.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://www.sportscores.be'
  ],
  region: 'europe-west1'
}, async (req, res) => {
  // De handmatige check is nu niet meer nodig, Firebase regelt alles.
  // VERWIJDER de regels hieronder:
  // const allowedOrigins = [ ... ];
  // const origin = req.headers.origin;
  // if (allowedOrigins.includes(origin)) {
  //   res.set('Access-Control-Allow-Origin', origin);
  // }
  
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Cache-Control', 'public, max-age=300'); // 5 minuten cache
  
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    const sportFeeds = [
      {
        name: 'Sporza',
        url: 'https://www.sporza.be/nl/feeds/rss.xml',
        source: 'Sporza'
      },
      {
        name: 'HLN Sport',
        url: 'https://www.hln.be/sport/rss.xml',
        source: 'Het Laatste Nieuws'
      },
      {
        name: 'NOS Sport',
        url: 'https://nos.nl/rss/sport.xml',
        source: 'NOS Sport'
      },
      {
        name: 'VRT Sport',
        url: 'https://www.vrt.be/vrtnws/nl.rssfeeds.sport.xml',
        source: 'VRT NWS'
      }
    ];

    const allNews = [];
    const fetchPromises = sportFeeds.map(async (feed) => {
      try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(feed.url, {
          timeout: 8000,
          headers: {
            'User-Agent': 'SportDashboard/1.0 (Educational)',
            'Accept': 'application/rss+xml, application/xml, text/xml'
          }
        });
        
        if (!response.ok) {
          console.warn(`${feed.name} HTTP ${response.status}`);
          return [];
        }
        
        const xmlText = await response.text();
        const parsedNews = parseRSSFeed(xmlText, feed.source);
        
        console.log(`✅ ${feed.name}: ${parsedNews.length} artikelen`);
        return parsedNews;
        
      } catch (error) {
        console.warn(`❌ ${feed.name} fout:`, error.message);
        return [];
      }
    });

    const results = await Promise.allSettled(fetchPromises);
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allNews.push(...result.value);
      }
    });

    // Filter en sorteer sport nieuws
    const sportNews = filterSportContent(allNews);
    const uniqueNews = removeDuplicateNews(sportNews);
    const sortedNews = uniqueNews
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 25);

    // Fallback als geen nieuws
    if (sortedNews.length === 0) {
      sortedNews.push({
        title: "🏃‍♂️ Sport dashboard actief - wachtend op live updates...",
        source: "Sport Dashboard",
        publishedAt: new Date().toISOString(),
        url: "#"
      });
    }

    res.status(200).json({
      success: true,
      news: sortedNews,
      totalFetched: allNews.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Sport nieuws proxy fout:', error);
    res.status(500).json({
      success: false,
      error: 'Fout bij ophalen sport nieuws',
      news: [{
        title: "⚠️ Sport nieuws tijdelijk niet beschikbaar",
        source: "System",
        publishedAt: new Date().toISOString(),
        url: "#"
      }]
    });
  }
});

// RSS XML parser functie
function parseRSSFeed(xmlText, sourceName) {
  try {
    // Basis regex parsing voor RSS feeds
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/i;
    const linkRegex = /<link>(.*?)<\/link>/i;
    const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/i;
    const descriptionRegex = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/i;

    let match;
    while ((match = itemRegex.exec(xmlText)) !== null && items.length < 15) {
      const itemXml = match[1];
      
      const titleMatch = titleRegex.exec(itemXml);
      const linkMatch = linkRegex.exec(itemXml);
      const pubDateMatch = pubDateRegex.exec(itemXml);
      const descMatch = descriptionRegex.exec(itemXml);
      
      if (titleMatch && pubDateMatch) {
        const title = (titleMatch[1] || titleMatch[2] || '').trim();
        const link = (linkMatch?.[1] || '').trim();
        const pubDate = (pubDateMatch[1] || '').trim();
        const description = (descMatch?.[1] || descMatch?.[2] || '').trim();
        
        if (title && pubDate) {
          items.push({
            title: formatNewsTitle(title),
            source: sourceName,
            publishedAt: new Date(pubDate).toISOString(),
            url: link,
            description: stripHtml(description).slice(0, 200)
          });
        }
      }
    }
    
    return items;
    
  } catch (error) {
    console.error(`RSS parsing fout voor ${sourceName}:`, error);
    return [];
  }
}

// HTML tags strippen
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}

// Sport content filter
function filterSportContent(items) {
  const sportKeywords = [
    'sport', 'voetbal', 'football', 'tennis', 'basketbal', 'wielrennen', 
    'atletiek', 'zwemmen', 'hockey', 'volleyball', 'golf', 'racing',
    'marathon', 'olympisch', 'kampioen', 'competitie', 'wedstrijd',
    'match', 'tournament', 'league', 'red lions', 'red panthers', 
    'rode duivels', 'yellow tigers', 'belgian lions', 'jupiler pro league',
    'champions league', 'europa league', 'premier league', 'la liga'
  ];

  const excludeKeywords = [
    'politiek', 'politics', 'economie', 'crime', 'accident', 
    'weather', 'weer', 'verkeer', 'entertainment', 'showbizz', 'reality'
  ];

  return items.filter(item => {
    const content = `${item.title} ${item.description || ''}`.toLowerCase();
    
    const hasSportContent = sportKeywords.some(keyword => 
      content.includes(keyword.toLowerCase())
    );
    
    const hasExcludedContent = excludeKeywords.some(keyword =>
      content.includes(keyword.toLowerCase())
    );
    
    // Alleen recente content (laatste 24 uur)
    const isRecent = item.publishedAt && 
      (Date.now() - new Date(item.publishedAt).getTime()) < (24 * 60 * 60 * 1000);
    
    return hasSportContent && !hasExcludedContent && isRecent;
  });
}

// Duplicaten verwijderen
function removeDuplicateNews(items) {
  const seen = new Set();
  return items.filter(item => {
    const normalized = item.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

// Nieuws titel formatteren
function formatNewsTitle(title) {
  if (!title) return '';
  
// Schoon titel op
  let formatted = title
    .replace(/\s*-\s*(Sporza|HLN|NOS|RTL|VTM|Het Laatste Nieuws|Het Nieuwsblad|GVA|VRT).*$/i, '')
    .replace(/^\d{2}:\d{2}\s*-?\s*/, '')
    .replace(/\s*\|\s*.*$/, '')
    .trim();
  
  // Sport emoji's toevoegen
  const emojiMap = {
    'voetbal|football|soccer|jupiler|rode duivels|red devils|champions league|europa league': '⚽',
    'tennis|atp|wta|roland garros|wimbledon': '🎾',
    'basketbal|basket|lions': '🏀',  
    'wielrennen|cycling|tour de france|ronde van vlaanderen': '🚴‍♂️',
    'atletiek|athletics|memorial|marathon': '🏃‍♂️',
    'zwemmen|swimming': '🏊‍♀️',
    'hockey|red lions|red panthers': '🏑',
    'volleyball|yellow tigers': '🏐',
    'formule|f1|racing': '🏎️',
    'olympisch|olympic': '🏅',
    'goud|gold|kampioen|winner': '🥇',
    'transfer|contract': '💰',
    'blessure|injury': '🏥',
    'training|stage': '💪',
    'overwinning|victory|wint': '🎉'
  };

  for (const [keywords, emoji] of Object.entries(emojiMap)) {
    if (new RegExp(keywords, 'i').test(formatted)) {
      formatted = `${emoji} ${formatted}`;
      break;
    }
  }

  // Standaard sport emoji als geen match
  if (!/^[\u{1F300}-\u{1F9FF}]/u.test(formatted)) {
    formatted = `🏆 ${formatted}`;
  }

  return formatted;
}
// ==============================================
// DATA CONSISTENCY MONITORING
// ==============================================

// Cloud Function voor naam wijzigingen monitoren
exports.onUserNameChange = onDocumentUpdated('users/{userId}', async (event) => {
 
    const change = event.data;
    const userId = event.params.userId;

    const beforeData = change.before.data();
    const afterData = change.after.data();
    
    // Check of naam is gewijzigd
    if (beforeData.naam !== afterData.naam) {
      console.log(`Naam wijziging gedetecteerd voor ${userId}: ${beforeData.naam} -> ${afterData.naam}`);
      
      // Update alle scores met oude naam
      await updateDenormalizedNames(userId, beforeData.naam, afterData.naam);
      
      // Log voor monitoring
      await logNameChange(userId, beforeData.naam, afterData.naam);
    }
  });

async function updateDenormalizedNames(userId, oldName, newName) {
  

  const batch = db.batch();
  
  try {
    // Zoek alle scores met oude naam
    const scoresQuery = await db.collection('scores')
      .where('leerling_id', '==', userId)
      .where('leerling_naam', '==', oldName)
      .get();
    
    console.log(`Gevonden ${scoresQuery.docs.length} scores om bij te werken`);
    
    // Update in batches (max 500 per batch)
    scoresQuery.docs.forEach(doc => {
      batch.update(doc.ref, { 
        leerling_naam: newName,
        laatst_bijgewerkt: FieldValue.serverTimestamp()
      });
    });
    
    await batch.commit();
    console.log(`Succesvol ${scoresQuery.docs.length} scores bijgewerkt`);
    
  } catch (error) {
    console.error('Fout bij updaten denormalized names:', error);
    // Send alert to administrators
    await sendAlertToAdmins(userId, oldName, newName, error);
  }
}

async function logNameChange(userId, oldName, newName) {
 
  
  await db.collection('audit_log').add({
    type: 'name_change',
    userId: userId,
    oldName: oldName,
    newName: newName,
    timestamp: FieldValue.serverTimestamp(),
    status: 'completed'
  });
}

async function sendAlertToAdmins(userId, oldName, newName, error) {
 
  
  // Zoek alle administrators
  const adminsQuery = await db.collection('users')
    .where('rol', '==', 'administrator')
    .get();
  
  // Create notifications for admins
  const batch = db.batch();
  
  adminsQuery.docs.forEach(adminDoc => {
    const notificationRef = db.collection('notifications').doc();
    batch.set(notificationRef, {
      recipient: adminDoc.id,
      type: 'data_consistency_error',
      message: `Fout bij bijwerken naam van ${oldName} naar ${newName} voor gebruiker ${userId}`,
      error: error.message,
      timestamp: FieldValue.serverTimestamp(),
      read: false
    });
  });
  
  await batch.commit();
}

// ==============================================
// CONSISTENCY CHECK FUNCTIE
// ==============================================

// Handmatige consistency check (kan periodiek worden uitgevoerd)
exports.checkDataConsistency = onCall(async (request) => {

  
  // Verify user is admin
  const uid = request.auth.uid;
  const userDoc = await db.collection('users').doc(uid).get(); // ✅ Fix
  
  if (!userDoc.exists || userDoc.data().rol !== 'administrator') {
    throw new Error('Alleen administrators kunnen consistency checks uitvoeren');
  }
  
  const inconsistencies = [];
  
 try {
    // Check alle scores tegen user namen
    const scoresSnapshot = await db.collection('scores').get(); // ✅ Fix
    
    for (const scoreDoc of scoresSnapshot.docs) {
      const scoreData = scoreDoc.data();
      const leerlingDoc = await db.collection('users') // ✅ Fix
        .doc(scoreData.leerling_id)
        .get();
      
      if (leerlingDoc.exists) {
        const actualName = leerlingDoc.data().naam;
        const storedName = scoreData.leerling_naam;
        
        if (actualName !== storedName) {
          inconsistencies.push({
            scoreId: scoreDoc.id,
            leerlingId: scoreData.leerling_id,
            actualName: actualName,
            storedName: storedName
          });
        }
      }
    }
    
    // Log resultaten
    await db.collection('consistency_reports').add({ // ✅ Fix
      timestamp: FieldValue.serverTimestamp(),
      inconsistencies: inconsistencies,
      totalScoresChecked: scoresSnapshot.docs.length,
      performedBy: uid
    });
    
    return {
      success: true,
      inconsistenciesFound: inconsistencies.length,
      totalChecked: scoresSnapshot.docs.length,
      inconsistencies: inconsistencies
    };
    
  } catch (error) {
    console.error('Consistency check failed:', error);
    throw new Error('Consistency check failed');
  }
});
// ==============================================
// TRAINING VALIDATION XP SYSTEM
// ==============================================

// Cloud Function die triggert wanneer een leerling_schema document wordt geüpdatet
exports.onTrainingWeekValidated = onDocumentUpdated('leerling_schemas/{schemaId}', async (event) => {
 
  const change = event.data;
  const schemaId = event.params.schemaId;
  const afterData = change.after.data();
  const beforeData = change.before.data();

  try {
    // --- LOGICA VOOR DIRECTE UPDATE VAN TRAININGSTELLER ---
    const now = new Date();
    const weekStart = getWeekStart(now);
    const currentWeekKey = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;
    
    const trainingsBefore = beforeData.gevalideerde_weken?.[currentWeekKey]?.trainingen || {};
    const trainingsAfter = afterData.gevalideerde_weken?.[currentWeekKey]?.trainingen || {};
    
    // Als er een nieuwe trainingsdag is toegevoegd in de huidige week
    if (Object.keys(trainingsAfter).length > Object.keys(trainingsBefore).length) {
      console.log(`New training logged by ${afterData.leerling_id} for week ${currentWeekKey}`);
      
      const userQuery = await db.collection('users').where('email', '==', afterData.leerling_id).get();
      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        const userData = userDoc.data();
        const weeklyStats = userData.weekly_stats || { kompas_days: 0, trainingen: 0 };
        
        const newTrainingCount = (weeklyStats.trainingen || 0) + 1;
        
        await userDoc.ref.update({
          'weekly_stats.trainingen': newTrainingCount
        });
        
        // Check direct voor de bonus als het doel van 3 is bereikt
        if (newTrainingCount === 3 && !weeklyStats.trainingBonus) {
          await awardWeeklyBonus(userDoc, userData, 25, 'weekly_training_bonus');
          // Markeer de bonus als toegekend om dubbele toekenning te voorkomen
          await userDoc.ref.update({ 'weekly_stats.trainingBonus': true });
        }
      }
    }

    // --- BESTAANDE LOGICA VOOR XP-TOEKENNING NA VALIDATIE ---
    const beforeValidated = beforeData.gevalideerde_weken || {};
    const afterValidated = afterData.gevalideerde_weken || {};
    let newlyValidatedWeeks = [];

    for (const [weekKey, weekData] of Object.entries(afterValidated)) {
      if (weekData.gevalideerd && !beforeValidated[weekKey]?.gevalideerd) {
        newlyValidatedWeeks.push({
          weekKey,
          weekData,
          trainingsXP: weekData.trainingsXP || 0
        });
      }
    }

    if (newlyValidatedWeeks.length > 0) {
      await awardTrainingXP(afterData.leerling_id, newlyValidatedWeeks, schemaId);
    }
    
  } catch (error) {
    console.error('Error processing schema update:', error);
  }
});

// Functie om XP toe te kennen aan een leerling
async function awardTrainingXP(leerlingEmail, validatedWeeks, schemaId) {

  
  try {
    // Zoek de user op basis van email
    const usersRef = db.collection('users');
    const userQuery = await usersRef.where('email', '==', leerlingEmail).get();
    
    if (userQuery.empty) {
      console.error(`User not found with email: ${leerlingEmail}`);
      return;
    }
    
    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();
    
    // Check of dit een leerling is
    if (userData.rol !== 'leerling') {
      console.error(`User ${leerlingEmail} is not a student, skipping XP award`);
      return;
    }
     // --- LOGICA VOOR STREAKS & WEKELIJKSE STATS ---
    const newTrainingCount = validatedWeeks.reduce((count, week) => {
        return count + (week.weekData?.trainingen ? Object.keys(week.weekData.trainingen).length : 0);
    }, 0);

    const weeklyStats = userData.weekly_stats || { kompas: 0, trainingen: 0 };
    const currentStreak = userData.streak_days || 0;
    const lastActivityDate = userData.last_activity?.toDate();
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    let newStreak = currentStreak;
    if (lastActivityDate && lastActivityDate.toDateString() === yesterday.toDateString()) {
        newStreak++;
    } else if (!lastActivityDate || lastActivityDate.toDateString() !== today.toDateString()) {
        newStreak = 1;
    }
    
    const updatedWeeklyStats = {
      ...weeklyStats,
      trainingen: (weeklyStats.trainingen || 0) + newTrainingCount
    };

    // --- LOGICA VOOR XP BEREKENING & LOGGING DETAILS (jouw stuk code) ---
    let totalXP = 0;
    const weekDetails = [];
    validatedWeeks.forEach(week => {
      const weekXP = week.trainingsXP || 0;
      totalXP += weekXP;
      weekDetails.push({
        week: week.weekKey,
        xp: weekXP
      });
    });
    
    if (totalXP <= 0 && newTrainingCount <= 0) {
      console.log('No XP to award and no new trainings logged.');
      return;
    }
    
    // Update user document met nieuwe XP en Sparks
   const currentXP = userData.xp || 0;
    const newXP = currentXP + totalXP;
    const newSparks = Math.floor(newXP / 100);
    
    await userDoc.ref.update({
      xp: newXP,
      sparks: newSparks,
      weekly_stats: updatedWeeklyStats,
      streak_days: newStreak,
      last_activity: FieldValue.serverTimestamp()
    });
    
    console.log(`Successfully updated stats for ${userData.naam || leerlingEmail}`);
    
    if (totalXP > 0) {
      await logXPTransaction( {
        user_id: userDoc.id,
        user_email: leerlingEmail,
        transaction_type: 'earn',
        reward_type: 'xp',
        amount: totalXP,
        reason: 'training_validation',
        source_id: schemaId,
        balance_after: { xp: newXP, sparks: newSparks },
        metadata: {
          schema_id: schemaId,
          validated_weeks: weekDetails // Hier worden de details gebruikt
        }
      });
    }
    
    await updateClassChallengeProgressInternal( userDoc.id, totalXP, 'training');
    
  } catch (error) {
    console.error('Error awarding training XP:', error);
    throw error;
  }
}

// Functie om XP transacties te loggen
async function logXPTransaction(transactionData) {
  try {
    const userId = transactionData.user_id;
    const transactionRef = db.collection('users').doc(userId).collection('xp_transactions');
    
    await transactionRef.add({
      amount: transactionData.amount,
      reason: transactionData.reason,
      source_id: transactionData.source_id || null,
      balance_after: transactionData.balance_after || null,
      metadata: transactionData.metadata || null,
      created_at: FieldValue.serverTimestamp()
    });
    
    console.log(`XP transaction logged for user ${userId}: +${transactionData.amount} (${transactionData.reason})`);
  } catch (error) {
    console.error('Error logging XP transaction:', error);
  }
}


// Handmatige XP toekenning functie (voor testing en admin gebruik)
exports.manualAwardTrainingXP = onCall(async (request) => {
 
  
  // Check of gebruiker admin is
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  if (!userDoc.exists || !['administrator', 'super-administrator'].includes(userDoc.data().rol)) {
    throw new Error('Only administrators can manually award XP');
  }
  
  const { userEmail, xpAmount, reason } = request.data;
  
  if (!userEmail || !xpAmount || xpAmount <= 0) {
    throw new Error('Valid userEmail and positive xpAmount required');
  }
  
  try {
    const usersRef = db.collection('users');
    const userQuery = await usersRef.where('email', '==', userEmail).get();
    
    if (userQuery.empty) {
      throw new Error('User not found');
    }
    
    const targetUserDoc = userQuery.docs[0];
    const targetUserData = targetUserDoc.data();
    const currentXP = targetUserData.xp || 0;
    const currentSparks = targetUserData.sparks || 0;
    const newXP = currentXP + xpAmount;
    const newSparks = Math.floor(newXP / 100);
    
    await targetUserDoc.ref.update({
      xp: newXP,
      sparks: newSparks
    });
    
    await logXPTransaction( {
      user_id: targetUserDoc.id,
      user_email: userEmail,
      transaction_type: 'earn',
      reward_type: 'xp',
      amount: xpAmount,
      reason: reason || 'manual_award',
      source_id: 'manual',
      balance_after: { xp: newXP, sparks: newSparks },
      metadata: {
        awarded_by: request.auth.uid,
        manual: true
      }
    });
    
    return {
      success: true,
      message: `Awarded ${xpAmount} XP to ${targetUserData.naam || userEmail}`,
      newTotals: { xp: newXP, sparks: newSparks }
    };
    
  } catch (error) {
    console.error('Error in manual XP award:', error);
    throw new Error('Failed to award XP: ' + error.message);
  }
});
// Voeg deze functie toe aan je index.js, na de training validation code

// ==============================================
// WELZIJN KOMPAS XP SYSTEM
// ==============================================

// Cloud Function die triggert wanneer welzijn dagelijkse data wordt geüpdatet
exports.onWelzijnKompasUpdated = onDocumentUpdated('welzijn/{userId}/dagelijkse_data/{dateString}', async (event) => {
  const userId = event.params.userId;
  const dateString = event.params.dateString;
  const beforeData = event.data.before.data() || {};
  const afterData = event.data.after.data() || {};

  const newlyCompletedSegments = [];
  if (((afterData.stappen || 0) > 0) && !((beforeData.stappen || 0) > 0)) newlyCompletedSegments.push('beweging');
  if (((afterData.water_intake || 0) > 0) && !((beforeData.water_intake || 0) > 0)) newlyCompletedSegments.push('voeding');
  if (((afterData.slaap_uren || 0) > 0) && !((beforeData.slaap_uren || 0) > 0)) newlyCompletedSegments.push('slaap');
  if (afterData.humeur && !beforeData.humeur) newlyCompletedSegments.push('mentaal');
  if (((afterData.hartslag_rust || 0) > 0) && !((beforeData.hartslag_rust || 0) > 0)) newlyCompletedSegments.push('hart');

  if (newlyCompletedSegments.length > 0) {
    await awardWelzijnXP(userId, newlyCompletedSegments, dateString);
  }

  await checkKompasCompletionBonus(userId, afterData, dateString);
});

// Functie om XP toe te kennen voor welzijn segmenten

async function awardWelzijnXP(userId, completedSegments, dateString) {
  
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists || userDoc.data().rol !== 'leerling') return;

  const userData = userDoc.data();
  const xpPerSegment = 4;
  const totalXP = completedSegments.length * xpPerSegment;
  const newXP = (userData.xp || 0) + totalXP;

  // Update alleen XP, sparks en activiteit. Geen weekly_stats hier.
  await userRef.update({
    xp: newXP,
    sparks: Math.floor(newXP / 100),
    last_activity: FieldValue.serverTimestamp()
  });

  await logXPTransaction( { // ✅ Voeg db toe
  user_id: userId,
  user_email: userData.email,
  amount: totalXP,
  reason: 'welzijn_segment_completion',
  source_id: `welzijn_${dateString}`,
  balance_after: { xp: newXP, sparks: Math.floor(newXP / 100) },
  metadata: { completed_segments: completedSegments }
});
}


// Check voor volledig kompas bonus (extra XP als alle segmenten ingevuld zijn)
async function checkKompasCompletionBonus(userId, dayData, dateString) {
  

  const isKompasComplete = (dayData.stappen || 0) > 0 && (dayData.water_intake || 0) > 0 && (dayData.slaap_uren || 0) > 0 && dayData.humeur && (dayData.hartslag_rust || 0) > 0;

  if (isKompasComplete && !dayData.completion_bonus_awarded) {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      const bonusXP = 10;
      const newXP = (userData.xp || 0) + bonusXP;
      const weeklyStats = userData.weekly_stats || { kompas_days: 0, trainingen: 0 };
      const updatedWeeklyStats = { ...weeklyStats, kompas_days: (weeklyStats.kompas_days || 0) + 1 };

      await userRef.update({
        xp: newXP,
        sparks: Math.floor(newXP / 100),
        weekly_stats: updatedWeeklyStats
      });

      const dayRef = db.collection('welzijn').doc(userId).collection('dagelijkse_data').doc(dateString);
      await dayRef.update({
        completion_bonus_awarded: true,
        completion_bonus_xp: bonusXP
      });

      await updateWelzijnStreak(userId, dateString);
    }
  }
}
    


// Helper functie voor streak milestone checks
async function checkStreakMilestonesInternal(userId) {
 
  
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) return;
    
    const userData = userDoc.data();
    const currentStreak = userData.streak_days || 0;
    const rewardedMilestones = userData.streak_milestones_rewarded || [];
    
    const milestones = [
      { days: 7, sparks: 3, description: '7 dagen alle kompas segmenten' },
      { days: 30, sparks: 12, description: '30 dagen streak' },
      { days: 100, sparks: 40, description: '100 dagen streak' }
    ];
    
    let newRewards = [];
    
    for (const milestone of milestones) {
      if (currentStreak >= milestone.days && !rewardedMilestones.includes(milestone.days)) {
        // Award Sparks
        const currentSparks = userData.sparks || 0;
        const newSparks = currentSparks + milestone.sparks;
        
        await userRef.update({
          sparks: newSparks,
          [`streak_milestones_rewarded`]: [...rewardedMilestones, milestone.days]
        });
        
        // Log streak reward
        await db.collection('users').doc(userId).collection('streak_rewards').add({
          streak_days: milestone.days,
          sparks_awarded: milestone.sparks,
          description: milestone.description,
          awarded_at: FieldValue.serverTimestamp()
        });
        
        newRewards.push(milestone);
        console.log(`Awarded ${milestone.sparks} Sparks for ${milestone.days} day streak to ${userData.naam || userId}`);
      }
    }
    
    if (newRewards.length > 0) {
      console.log(`User ${userId} achieved ${newRewards.length} new streak milestones`);
    }
    
  } catch (error) {
    console.error('Error checking streak milestones:', error);
  }
}

// Update welzijn streak (voor toekomstige streak beloningen)
async function updateWelzijnStreak(userId, dateString) {

  
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      const currentStreak = userData.streak_days || 0;
      
      // Simpele streak update - check later voor gaten in data
      await userRef.update({
        streak_days: currentStreak + 1,
        last_activity: FieldValue.serverTimestamp()
      });
      
      console.log(`Updated streak for ${userId}: ${currentStreak + 1} days`);
    }
    
  } catch (error) {
    console.error('Error updating welzijn streak:', error);
  }
}

// Handmatige welzijn XP functie (voor testing)
exports.manualAwardWelzijnXP = onCall(async (request) => {
  
  
  // Check admin rechten
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  const adminDoc = await db.collection('users').doc(request.auth.uid).get();
  if (!adminDoc.exists || !['administrator', 'super-administrator'].includes(adminDoc.data().rol)) {
    throw new Error('Only administrators can manually award welzijn XP');
  }
  
  const { userId, segments, dateString } = request.data;
  
  if (!userId || !segments || !Array.isArray(segments)) {
    throw new Error('Valid userId and segments array required');
  }
  
  try {
    // Simuleer welzijn data voor testing
    const mockDayData = {
      stappen: segments.includes('beweging') ? 5000 : 0,
      water_intake: segments.includes('voeding') ? 1500 : 0,
      slaap_uren: segments.includes('slaap') ? 8 : 0,
      humeur: segments.includes('mentaal') ? 'Goed' : null,
      hartslag_rust: segments.includes('hart') ? 70 : 0
    };
    
    await awardWelzijnXP(userId, segments, dateString || getTodayString(), mockDayData);
    
    return {
      success: true,
      message: `Awarded welzijn XP for segments: ${segments.join(', ')}`,
      segments: segments
    };
    
  } catch (error) {
    console.error('Error in manual welzijn XP award:', error);
    throw new Error('Failed to award welzijn XP: ' + error.message);
  }
});

// Helper functie voor vandaag string
function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
// Test deelname XP (50 XP + 100 XP voor PR)


exports.awardTestParticipationXP = onCall({
  
  cors: [
    'https://sportscores-app.firebaseapp.com',
    'https://sportscores-app.web.app', 
    'https://www.sportscores.be',
    'http://localhost:3000',
    'http://localhost:5173'
  ]
}, async (request) => {

  
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  const { userId, testId, newScore } = request.data;
  
  console.log('=== AWARD TEST XP FUNCTION START ===');
  console.log('User ID:', userId);
  console.log('Test ID:', testId);
  console.log('New Score:', newScore);
  
  if (!userId || !testId) {
    throw new Error('userId and testId required');
  }
  
  try {
    // Haal user en test data op
   const [userDoc, testDoc] = await Promise.all([
    db.collection('users').doc(userId).get(),
    db.collection('testen').doc(testId).get()
  ]);
    
   if (!userDoc.exists) {
    console.log('User not found, checking toegestane_gebruikers...');
    const toegestaneUserDoc = await db.collection('toegestane_gebruikers').doc(userId).get(); // ✅ Fix
    if (!toegestaneUserDoc.exists) {
      throw new Error('User not found in users or toegestane_gebruikers');
    }
  }
    
    if (!testDoc.exists) {
      throw new Error('Test not found');
    }
    
    const userData = userDoc.exists ? userDoc.data() : {};
    const testData = testDoc.data();
    
    console.log('User data found:', !!userData);
    console.log('Test data found:', !!testData);
    console.log('Test score_richting:', testData.score_richting);
    
    let totalXP = 50; // Base XP voor test deelname
    const reasons = ['test_participation'];
    let prInfo = null;
    
    // Check voor Personal Record alleen als er een score is
    if (newScore !== null && newScore !== undefined) {
      console.log('Checking Personal Record...');
      prInfo = await checkPersonalRecord(userId, testId, newScore, testData);
      console.log('PR Result:', prInfo);
      
      if (prInfo.isPersonalRecord) {
        totalXP += 100; // Extra 100 XP voor PR
        reasons.push('personal_record');
        
        console.log(`Personal Record! User ${userId}: ${newScore} (previous: ${prInfo.previousBest}, improvement: ${prInfo.improvement})`);
      }
    }
    
    const currentXP = userData.xp || 0;
    const newXP = currentXP + totalXP;
    const newSparks = Math.floor(newXP / 100);
    
    // Update user stats - probeer eerst users, dan toegestane_gebruikers
    const updateData = {
      xp: newXP,
      sparks: newSparks,
      last_activity: FieldValue.serverTimestamp()
    };
    
    if (prInfo?.isPersonalRecord) {
      updateData.personal_records_count = (userData.personal_records_count || 0) + 1;
      updateData.last_personal_record = FieldValue.serverTimestamp();
    }
    
    try {
      if (userDoc.exists) {
        await userDoc.ref.update(updateData);
      } else {
        const toegestaneUserRef = db.collection('toegestane_gebruikers').doc(userId);
    await toegestaneUserRef.update(updateData);
      }
      console.log('User stats updated successfully');
    } catch (updateError) {
      console.error('Error updating user stats:', updateError);
      throw new Error('Failed to update user stats');
    }
    
    // Log transacties
    for (const reason of reasons) {
      const xpAmount = reason === 'test_participation' ? 50 : 100;
      await logXPTransaction( {
        user_id: userId,
        user_email: userData.email || userId,
        amount: xpAmount,
        reason: reason,
        source_id: testId,
        metadata: prInfo?.isPersonalRecord ? {
          previous_best: prInfo.previousBest,
          new_score: newScore,
          improvement: prInfo.improvement,
          test_name: testData.naam
        } : null
      });
    }
    
    // NIEUW: Check leaderboard positions and award Sparks
    if (newScore !== null && newScore !== undefined) {
      await checkLeaderboardPositionsInternal( userId, testId, newScore, userData.school_id);
    }
    
    // NIEUW: Update class challenge progress
    await updateClassChallengeProgressInternal( userId, totalXP, 'xp');
    
    console.log('=== AWARD TEST XP FUNCTION SUCCESS ===');
    console.log('Total XP awarded:', totalXP);
    console.log('Personal Record:', prInfo?.isPersonalRecord || false);
    
    return {
      success: true,
      message: `Awarded ${totalXP} XP for test${prInfo?.isPersonalRecord ? ' + PR' : ''}`,
      newTotals: { xp: newXP, sparks: newSparks },
      personalRecord: prInfo?.isPersonalRecord || false,
      improvement: prInfo?.improvement
    };
    
  } catch (error) {
    console.error('Error awarding test XP:', error);
    throw new Error('Failed to award test XP: ' + error.message);
  }
});

// Helper functies voor test XP functie
async function checkLeaderboardPositionsInternal(userId, testId, newScore, schoolId) { 

  
  if (!schoolId) return;

  
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const testDoc = await db.collection('testen').doc(testId).get();
    
    if (!userDoc.exists || !testDoc.exists) return;
    
    const userData = userDoc.data();
    const testData = testDoc.data();
    
    // Check school records (simplified version)
    const schoolScoresQuery = await db.collection('scores')
      .where('test_id', '==', testId)
      .where('school_id', '==', schoolId)
      .where('score', '!=', null)
      .get();
    
    const schoolScores = [];
    schoolScoresQuery.docs.forEach(doc => {
      schoolScores.push(doc.data().score);
    });
    
    // Sort based on score direction
    schoolScores.sort((a, b) => {
      return testData.score_richting === 'hoog' ? b - a : a - b;
    });
    
    // Find position
    let schoolPosition = getPositionInArray(newScore, schoolScores, testData.score_richting);
    
    // Award school record Sparks
    if (schoolPosition >= 1 && schoolPosition <= 5) {
      let sparksAwarded = 0;
      if (schoolPosition === 1) sparksAwarded = 15;
      else if (schoolPosition === 2) sparksAwarded = 10;
      else sparksAwarded = 5; // 3rd-5th place
      
      const currentSparks = userData.sparks || 0;
      await userDoc.ref.update({ 
        sparks: currentSparks + sparksAwarded,
        last_school_record: FieldValue.serverTimestamp()
      });
      
      // Log achievement
      await db.collection('users').doc(userId).collection('achievements').add({
        type: 'school_record',
        test_id: testId,
        test_name: testData.naam,
        position: schoolPosition,
        sparks_awarded: sparksAwarded,
        score: newScore,
        achieved_at: FieldValue.serverTimestamp()
      });
      
      console.log(`Awarded ${sparksAwarded} Sparks for school position ${schoolPosition} to ${userData.naam}`);
    }
  } catch (error) {
    console.error('Error checking leaderboard positions:', error);
  }
}

async function updateClassChallengeProgressInternal( userId, xpEarned, action) {
 
  
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return;
    
    const userData = userDoc.data();
    const userGroups = userData.groepen || [];
    
    // Get current week
    const now = new Date();
    const weekStart = new Date(now);
    const dayOfWeek = weekStart.getDay();
    const daysToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    weekStart.setDate(now.getDate() + daysToMonday);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekId = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;
    
    for (const groupId of userGroups) {
      const challengeRef = db.collection('class_challenges').doc(`${groupId}_${weekId}`);
      const challengeDoc = await challengeRef.get();
      
      if (!challengeDoc.exists) continue;
      
      const challengeData = challengeDoc.data();
      const currentProgress = challengeData.current_progress || {};
      const participants = currentProgress.participants || [];
      
      const updates = {};
      
      if (action === 'xp' && xpEarned) {
        updates['current_progress.total_xp'] = (currentProgress.total_xp || 0) + xpEarned;
      }
      
      if (action === 'training') {
        updates['current_progress.total_trainings'] = (currentProgress.total_trainings || 0) + 1;
      }
      
      // Add user to participants if not already included
      if (!participants.includes(userId)) {
        updates['current_progress.participants'] = [...participants, userId];
      }
      
      if (Object.keys(updates).length > 0) {
        await challengeRef.update(updates);
        console.log(`Updated class challenge progress for group ${groupId}`);
      }
    }
  } catch (error) {
    console.error('Error updating class challenge:', error);
  }
}

function getPositionInArray(newScore, existingScores, scoreRichting) {
  let position = 1;
  for (const score of existingScores) {
    if (scoreRichting === 'hoog' ? newScore > score : newScore < score) {
      break;
    }
    if (score !== newScore) {
      position++;
    }
  }
  return position;
}

function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}




// Wekelijkse bonussen check (elke maandag om 6:00)


exports.checkWeeklyBonuses = onSchedule('0 6 * * 1', async (event) => {
 
  
  try {
    const usersSnapshot = await db.collection('users').where('rol', '==', 'leerling').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const weeklyStats = userData.weekly_stats || {};
      const kompasDays = weeklyStats.kompas_days || 0;
      const trainingCount = weeklyStats.trainingen || 0;
      
      if (kompasDays >= 5 && trainingCount >= 2 && !weeklyStats.perfectWeek) {
        await awardWeeklyBonus(userDoc, userData, 50, 'perfect_week_bonus');
      }
      if (trainingCount >= 3 && !weeklyStats.trainingBonus) {
        await awardWeeklyBonus(userDoc, userData, 25, 'weekly_training_bonus');
      }
      
      // Reset met de ENIGE CORRECTE datastructuur
      await userDoc.ref.update({
        weekly_stats: {
          kompas_days: 0,
          trainingen: 0,
          perfectWeek: false,
          trainingBonus: false
        }
      });
    }
  } catch (error) {
    console.error('Error in weekly bonus check:', error);
  }
});

async function awardWeeklyBonus(userDoc, userData, bonusXP, reason) {
 
  const currentXP = userData.xp || 0;
  const newXP = currentXP + bonusXP;
  const newSparks = Math.floor(newXP / 100);
  
  await userDoc.ref.update({
    xp: newXP,
    sparks: newSparks
  });
  
  await logXPTransaction({
    user_id: userDoc.id,
    user_email: userData.email,
    amount: bonusXP,
    reason: reason
  });
  
  console.log(`Awarded ${bonusXP} XP (${reason}) to ${userData.naam || userDoc.id}`);
}
// Voeg dit tijdelijk toe aan het einde van je index.js
exports.testWelzijnXP = onCall(async (request) => {

  const { userId } = request.data;
  console.log('Test functie voor userId:', userId);
  
 
  const userDoc = await db.collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    return { error: 'User not found', userId };
  }
  
  const userData = userDoc.data();
  const currentXP = userData.xp || 0;
  
  await userDoc.ref.update({
    xp: currentXP + 10
  });
  
  return { 
    success: true, 
    message: `Added 10 XP to ${userData.naam}`,
    newXP: currentXP + 10
  };
});
// EHBO scenario XP
exports.awardEHBOXP = onCall(async (request) => {
  
  
  if (!request.auth) throw new Error('Authentication required');
  
  const { userId, scenarioId, xpAmount = 30 } = request.data;
  if (!userId || !scenarioId) throw new Error('userId and scenarioId required');
  
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists || userDoc.data().rol !== 'leerling') {
      throw new Error('User not found or is not a student');
    }
    
    const userData = userDoc.data();
    const currentXP = userData.xp || 0;
    const newXP = currentXP + xpAmount;
    
    // --- START WIJZIGING: Voeg 'last_activity' toe ---
    await userRef.update({
      xp: newXP,
      sparks: Math.floor(newXP / 100),
      last_activity: FieldValue.serverTimestamp() // Cruciaal voor streaks
    });
    // --- EINDE WIJZIGING ---
    
    await logXPTransaction( {
      user_id: userId,
      user_email: userData.email,
      amount: xpAmount,
      reason: 'ehbo_scenario_completion',
      source_id: scenarioId
    });
    
    return {
      success: true,
      message: `Awarded ${xpAmount} XP for EHBO scenario`,
      newTotals: { xp: newXP, sparks: Math.floor(newXP / 100) }
    };
    
  } catch (error) {
    console.error('Error awarding EHBO XP:', error);
    throw new Error('Failed to award EHBO XP: ' + error.message);
  }
});
// ==============================================
// PERSONAL RECORD DETECTION & XP SYSTEM
// ==============================================



// Trigger automatisch bij score updates (nieuwe Cloud Function)
exports.onScoreUpdated = onDocumentUpdated('scores/{scoreId}', async (event) => {
 
  console.log('TRIGGER START');
  
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  
  if (beforeData?.score === afterData?.score || !afterData?.score) {
    console.log('No score change');
    return;
  }
  
  try {
    const adminDb = admin.firestore();
    const userEmail = afterData.leerling_id; // Dit is eigenlijk een email
    
    console.log('Target user email:', userEmail);
    
    // Zoek in users collectie op email field
    console.log('Searching users by email...');
    const usersQuery = await adminDb.collection('users')
      .where('email', '==', userEmail)
      .get();
    
    let targetRef = null;
    let userData = null;
    let collectionUsed = '';
    
    if (!usersQuery.empty) {
      const userDoc = usersQuery.docs[0];
      targetRef = userDoc.ref;
      userData = userDoc.data();
      collectionUsed = 'users';
      console.log('Found in users collection by email');
      console.log('Current users XP:', userData.xp || 0);
    } else {
      console.log('Not found in users, trying toegestane_gebruikers...');
      // Fallback naar toegestane_gebruikers (met email als document ID)
      const toegestaneRef = adminDb.collection('toegestane_gebruikers').doc(userEmail);
      const toegestaneSnap = await toegestaneRef.get();
      
      if (toegestaneSnap.exists) {
        targetRef = toegestaneRef;
        userData = toegestaneSnap.data();
        collectionUsed = 'toegestane_gebruikers';
        console.log('Found in toegestane_gebruikers');
        console.log('Current toegestane XP:', userData.xp || 0);
      }
    }
    
    if (!targetRef || !userData) {
      console.log('User not found in either collection!');
      return;
    }
    
    // Rest van de update logica blijft hetzelfde
    const currentXP = userData.xp || 0;
    const newXP = currentXP + 150;
    
    console.log(`Collection: ${collectionUsed}`);
    console.log(`Attempting update: ${currentXP} -> ${newXP}`);
    
    await targetRef.update({
      xp: newXP,
      sparks: Math.floor(newXP / 100),
      last_update_test: new Date().toISOString(),
      last_collection_used: collectionUsed
    });
    
    console.log(`UPDATE SUCCESS in ${collectionUsed}`);
    
  } catch (error) {
    console.error('FUNCTION ERROR:', error);
  }
});

// Voeg ook de checkPersonalRecord functie toe zoals eerder gedefinieerd
// HOUD ALLEEN DEZE VERSIE - verwijder de andere duplicaten
async function checkPersonalRecord(userId, testId, newScore, testData) {
  
  
  try {
    console.log('=== CHECK PERSONAL RECORD ===');
    console.log('User ID:', userId);
    console.log('Test ID:', testId);
    console.log('New Score:', newScore);
    
    // Use admin SDK query methods
    const historicalScoresRef = db.collection('scores')
      .where('leerling_id', '==', userId)
      .where('test_id', '==', testId)
      .where('score', '!=', null);
    
    const historicalScores = await historicalScoresRef.get();
    console.log('Historical scores found:', historicalScores.size);
    
    // Rest of function remains the same...
    if (historicalScores.empty) {
      console.log(`First score for user ${userId} on test ${testId} - automatic PR`);
      return { isPersonalRecord: true, previousBest: null, improvement: null };
    }
    
    const previousScores = [];
    historicalScores.docs.forEach(doc => {
      const scoreData = doc.data();
      if (scoreData.score !== newScore) {
        previousScores.push(scoreData.score);
      }
    });
    
    console.log('Previous scores:', previousScores);
    
    if (previousScores.length === 0) {
      console.log('No previous different scores found - this is a PR');
      return { isPersonalRecord: true, previousBest: null, improvement: null };
    }
    
    const scoreRichting = testData.score_richting || 'hoog';
    console.log('Score richting:', scoreRichting);
    
    let previousBest;
    if (scoreRichting === 'hoog') {
      previousBest = Math.max(...previousScores);
      const isPersonalRecord = newScore > previousBest;
      const improvement = isPersonalRecord ? newScore - previousBest : null;
      
      console.log(`Higher is better: new=${newScore}, previous best=${previousBest}, is PR=${isPersonalRecord}`);
      return { isPersonalRecord, previousBest, improvement };
    } else {
      previousBest = Math.min(...previousScores);
      const isPersonalRecord = newScore < previousBest;
      const improvement = isPersonalRecord ? previousBest - newScore : null;
      
      console.log(`Lower is better: new=${newScore}, previous best=${previousBest}, is PR=${isPersonalRecord}`);
      return { isPersonalRecord, previousBest, improvement };
    }
    
  } catch (error) {
    console.error('Error checking personal record:', error);
    return { isPersonalRecord: false, previousBest: null, improvement: null };
  }
}

// Maak een interne versie van de XP functie die geen HTTP/auth nodig heeft:
async function awardTestParticipationXPInternal(userId, testId, newScore) {
  
  
  console.log('=== INTERNAL XP AWARD START ===');
  
  try {
    // Use admin SDK document references
    let userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      userDoc = await db.collection('toegestane_gebruikers').doc(userId).get();
    }
    
    const testDoc = await db.collection('testen').doc(testId).get();
    
    if (!userDoc.exists || !testDoc.exists) {
      throw new Error(`User or test not found. User exists: ${userDoc.exists}, Test exists: ${testDoc.exists}`);
    }
    
    const userData = userDoc.data();
    const testData = testDoc.data();
    
    // Check Personal Record
    const prInfo = await checkPersonalRecord(userId, testId, newScore, testData);
    
    let totalXP = 50; // Base XP
    if (prInfo.isPersonalRecord) {
      totalXP += 100; // PR bonus
    }
    
    // Update user XP
    const currentXP = userData.xp || 0;
    const newXP = currentXP + totalXP;
    const newSparks = Math.floor(newXP / 100);
    
    const updateData = {
      xp: newXP,
      sparks: newSparks,
      last_activity: FieldValue.serverTimestamp()
    };
    
    if (prInfo.isPersonalRecord) {
      updateData.personal_records_count = (userData.personal_records_count || 0) + 1;
    }
    
    await userDoc.ref.update(updateData);
    
    console.log(`Successfully awarded ${totalXP} XP to user ${userId}`);
    console.log(`Personal Record: ${prInfo.isPersonalRecord}`);
    
    return { success: true, totalXP, personalRecord: prInfo.isPersonalRecord };
    
  } catch (error) {
    console.error('Internal XP award error:', error);
    throw error;
  }
}
// Nieuwe Cloud Function voor bij registratie
exports.onUserRegistration = onCall(async (request) => {
 
  const { email } = request.data;
  
  
  try {
    // Check of er data is in toegestane_gebruikers
    const toegestaneRef = db.collection('toegestane_gebruikers').doc(email);
    const toegestaneSnap = await toegestaneRef.get();
    
    if (toegestaneSnap.exists) {
      const toegestaneData = toegestaneSnap.data();
      
      // Kopieer data naar users collectie
      const userRef = db.collection('users').doc(email);
      await userRef.set({
        ...toegestaneData,
        registered_at: FieldValue.serverTimestamp()
      });
      
      console.log(`Migrated data for ${email} from toegestane_gebruikers to users`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
});
// Add this to your index.js - Streak milestone rewards
exports.checkStreakMilestones = onCall(async (request) => {
  
  
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  const { userId } = request.data;
  
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    const currentStreak = userData.streak_days || 0;
    const rewardedMilestones = userData.streak_milestones_rewarded || [];
    
    const milestones = [
      { days: 7, sparks: 3, description: '7 dagen alle kompas segmenten' },
      { days: 30, sparks: 12, description: '30 dagen streak' },
      { days: 100, sparks: 40, description: '100 dagen streak' }
    ];
    
    let newRewards = [];
    
    for (const milestone of milestones) {
      if (currentStreak >= milestone.days && !rewardedMilestones.includes(milestone.days)) {
        // Award Sparks
        const currentSparks = userData.sparks || 0;
        const newSparks = currentSparks + milestone.sparks;
        
        await userRef.update({
          sparks: newSparks,
          [`streak_milestones_rewarded`]: [...rewardedMilestones, milestone.days]
        });
        
        // Log the reward
        await logStreakReward({
          user_id: userId,
          user_email: userData.email,
          streak_days: milestone.days,
          sparks_awarded: milestone.sparks,
          description: milestone.description
        });
        
        newRewards.push(milestone);
        console.log(`Awarded ${milestone.sparks} Sparks for ${milestone.days} day streak to ${userData.naam}`);
      }
    }
    
    return {
      success: true,
      newRewards: newRewards,
      currentStreak: currentStreak
    };
    
  } catch (error) {
    console.error('Error checking streak milestones:', error);
    throw error;
  }
});

async function logStreakReward( rewardData) {
 
  try {
    await db.collection('users').doc(rewardData.user_id).collection('streak_rewards').add({
      streak_days: rewardData.streak_days,
      sparks_awarded: rewardData.sparks_awarded,
      description: rewardData.description,
      awarded_at: FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging streak reward:', error);
  }
}

// Automated daily streak calculation and reward check
exports.updateDailyStreaks = onSchedule('0 1 * * *', async (event) => {
 
  
  try {
    console.log('Starting daily streak updates...');
    
    const usersSnapshot = await db.collection('users')
      .where('rol', '==', 'leerling')
      .get();
    
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // Check if user completed kompas yesterday
      const yesterdayKompasRef = db.collection('welzijn')
        .doc(userId)
        .collection('dagelijkse_data')
        .doc(yesterdayString);
        
      const yesterdayData = await yesterdayKompasRef.get();
      
      if (yesterdayData.exists && yesterdayData.data().completion_bonus_awarded) {
        // User completed kompas yesterday - increment streak
        const newStreak = (userData.streak_days || 0) + 1;
        await userDoc.ref.update({ streak_days: newStreak });
        
        // Check for milestone rewards
       await checkStreakMilestonesInternal(userId);
        
        console.log(`Updated streak for ${userData.naam}: ${newStreak} days`);
      } else {
        // User didn't complete kompas yesterday - reset streak
        if (userData.streak_days > 0) {
          await userDoc.ref.update({ streak_days: 0 });
          console.log(`Reset streak for ${userData.naam}`);
        }
      }
    }
    
    console.log('Daily streak updates completed');
    return { success: true };
    
  } catch (error) {
    console.error('Error updating daily streaks:', error);
    throw error;
  }
});
exports.checkLeaderboardPositions = onCall(async (request) => {

  
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  const { userId, testId, newScore, schoolId } = request.data;
  
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const testDoc = await db.collection('testen').doc(testId).get();
    
    if (!userDoc.exists || !testDoc.exists) {
      throw new Error('User or test not found');
    }
    
    const userData = userDoc.data();
    const testData = testDoc.data();
    const userAge = calculateAge(userData.geboortedatum);
    
    // Check school records
    const schoolRecords = await checkSchoolRecords(db, testId, schoolId, newScore, testData);
    // Check age records  
    const ageRecords = await checkAgeRecords(db, testId, userAge, newScore, testData);
    
    let totalSparks = 0;
    let achievements = [];
    
    // Award school record Sparks
    if (schoolRecords.position >= 1 && schoolRecords.position <= 5) {
      let sparksAwarded = 0;
      if (schoolRecords.position === 1) sparksAwarded = 15;
      else if (schoolRecords.position === 2) sparksAwarded = 10;
      else sparksAwarded = 5; // 3rd-5th place
      
      totalSparks += sparksAwarded;
      achievements.push({
        type: 'school_record',
        position: schoolRecords.position,
        sparks: sparksAwarded,
        description: `Schoolrecord ${schoolRecords.position}e plaats`
      });
    }
    
    // Award age record Sparks
    if (ageRecords.position >= 1 && ageRecords.position <= 5) {
      let sparksAwarded = 0;
      if (ageRecords.position <= 2) sparksAwarded = 5;
      else sparksAwarded = 3; // 3rd-5th place
      
      totalSparks += sparksAwarded;
      achievements.push({
        type: 'age_record', 
        position: ageRecords.position,
        sparks: sparksAwarded,
        description: `Leeftijdsrecord ${ageRecords.position}e plaats (${userAge} jaar)`
      });
    }
    
    // Award Sparks if any achievements
    if (totalSparks > 0) {
      const currentSparks = userData.sparks || 0;
      const newSparks = currentSparks + totalSparks;
      
      await userDoc.ref.update({
        sparks: newSparks,
        last_achievement: FieldValue.serverTimestamp()
      });
      
      // Log achievements
      for (const achievement of achievements) {
        await logLeaderboardAchievement( {
          user_id: userId,
          user_email: userData.email,
          test_id: testId,
          test_name: testData.naam,
          score: newScore,
          ...achievement
        });
      }
      
      console.log(`Awarded ${totalSparks} Sparks to ${userData.naam} for leaderboard positions`);
    }
    
    return {
      success: true,
      achievements: achievements,
      totalSparks: totalSparks,
      schoolPosition: schoolRecords.position,
      agePosition: ageRecords.position
    };
    
  } catch (error) {
    console.error('Error checking leaderboard positions:', error);
    throw error;
  }
});

async function checkSchoolRecords(db, testId, schoolId, newScore, testData) {
 
  const scoreRichting = testData.score_richting || 'hoog';
  
  // Query all scores for this test in this school
  const schoolScoresQuery = await db.collection('scores')
    .where('test_id', '==', testId)
    .where('school_id', '==', schoolId)
    .where('score', '!=', null)
    .get();
  
  const allScores = [];
  schoolScoresQuery.docs.forEach(doc => {
    const scoreData = doc.data();
    allScores.push({
      score: scoreData.score,
      userId: scoreData.leerling_id,
      datum: scoreData.datum
    });
  });
  
  // Sort scores based on test direction
  allScores.sort((a, b) => {
    return scoreRichting === 'hoog' ? b.score - a.score : a.score - b.score;
  });
  
  // Find position of new score
  let position = 1;
  for (const record of allScores) {
    if (scoreRichting === 'hoog' ? newScore > record.score : newScore < record.score) {
      break;
    }
    if (record.score !== newScore) {
      position++;
    }
  }
  
  return { position, totalScores: allScores.length + 1 };
}

async function checkAgeRecords(db, testId, userAge, newScore, testData) {
 
  const scoreRichting = testData.score_richting || 'hoog';
  
  // Query all users of the same age with scores for this test
  const usersOfAgeQuery = await db.collection('users')
    .where('rol', '==', 'leerling')
    .get();
  
  const sameAgeUserIds = [];
  usersOfAgeQuery.docs.forEach(doc => {
    const userData = doc.data();
    if (calculateAge(userData.geboortedatum) === userAge) {
      sameAgeUserIds.push(doc.id);
    }
  });
  
  if (sameAgeUserIds.length === 0) return { position: 1, totalScores: 1 };
  
  // Get scores for users of same age
  const ageScoresQuery = await db.collection('scores')
    .where('test_id', '==', testId)
    .where('leerling_id', 'in', sameAgeUserIds.slice(0, 10)) // Firestore 'in' limit
    .where('score', '!=', null)
    .get();
  
  const ageScores = [];
  ageScoresQuery.docs.forEach(doc => {
    const scoreData = doc.data();
    ageScores.push({
      score: scoreData.score,
      userId: scoreData.leerling_id
    });
  });
  
  // Sort and find position
  ageScores.sort((a, b) => {
    return scoreRichting === 'hoog' ? b.score - a.score : a.score - b.score;
  });
  
  let position = 1;
  for (const record of ageScores) {
    if (scoreRichting === 'hoog' ? newScore > record.score : newScore < record.score) {
      break;
    }
    if (record.score !== newScore) {
      position++;
    }
  }
  
  return { position, totalScores: ageScores.length + 1 };
}

function calculateAge(geboortedatum) {
  if (!geboortedatum) return 0;
  
  const birthDate = new Date(geboortedatum);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

async function logLeaderboardAchievement(achievementData) {
 
  try {
    await db.collection('users').doc(achievementData.user_id).collection('achievements').add({
      type: achievementData.type,
      test_id: achievementData.test_id,
      test_name: achievementData.test_name,
      position: achievementData.position,
      sparks_awarded: achievementData.sparks,
      score: achievementData.score,
      description: achievementData.description,
      achieved_at: FieldValue.serverTimestamp()
    });
    
    console.log(`Achievement logged: ${achievementData.description} for user ${achievementData.user_id}`);
  } catch (error) {
    console.error('Error logging leaderboard achievement:', error);
  }
}
// Add to index.js - Class Challenge System
exports.createWeeklyClassChallenge = onSchedule('0 6 * * 1', async (event) => {
  
  
  try {
    console.log('Creating weekly class challenges...');
    
    // Get all active classes/groups
    const groupsSnapshot = await db.collection('groepen').get();
    
    for (const groupDoc of groupsSnapshot.docs) {
      const groupData = groupDoc.data();
      const groupId = groupDoc.id;
      
      // Count active students in group
      const studentsCount = groupData.leerlingen?.length || 0;
      if (studentsCount === 0) continue;
      
      // Calculate challenge targets based on group size
      const xpTarget = Math.max(2000, studentsCount * 150); // Minimum 2000 XP, or 150 per student
      const trainingTarget = Math.max(10, studentsCount * 2); // Minimum 10 trainings, or 2 per student
      
      // Get current week dates
      const now = new Date();
      const weekStart = getWeekStart(now);
      const weekEnd = getWeekEnd(now);
      const weekId = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;
      
      // Create challenge
      const challengeData = {
        group_id: groupId,
        group_name: groupData.naam,
        school_id: groupData.school_id,
        week_id: weekId,
        week_start: weekStart,
        week_end: weekEnd,
        targets: {
          total_xp: xpTarget,
          total_trainings: trainingTarget
        },
        current_progress: {
          total_xp: 0,
          total_trainings: 0,
          participants: []
        },
        reward_xp: 40,
        status: 'active',
        created_at: FieldValue.serverTimestamp()
      };
      
      await db.collection('class_challenges').doc(`${groupId}_${weekId}`).set(challengeData);
      
      console.log(`Created challenge for group ${groupData.naam}: ${xpTarget} XP target`);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Error creating weekly class challenges:', error);
    throw error;
  }
});

// Function to update class challenge progress when students earn XP
exports.updateClassChallengeProgress = onCall(async (request) => {
 
  
  try {
    const { userId, xpEarned, action } = request.data; // action: 'xp', 'training', etc.
    
    // Get user's group
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return { success: false, error: 'User not found' };
    
    const userData = userDoc.data();
    const userGroups = userData.groepen || [];
    
    // Get current week ID
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekId = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;
    
    // Update progress for all user's groups
    for (const groupId of userGroups) {
      const challengeId = `${groupId}_${weekId}`;
      const challengeRef = db.collection('class_challenges').doc(challengeId);
      const challengeDoc = await challengeRef.get();
      
      if (!challengeDoc.exists) continue;
      
      const challengeData = challengeDoc.data();
      const currentProgress = challengeData.current_progress;
      
      // Update progress based on action type
      const updates = {};
      
      if (action === 'xp' && xpEarned) {
        updates['current_progress.total_xp'] = (currentProgress.total_xp || 0) + xpEarned;
      }
      
      if (action === 'training') {
        updates['current_progress.total_trainings'] = (currentProgress.total_trainings || 0) + 1;
      }
      
      // Track participant
      const participants = currentProgress.participants || [];
      if (!participants.includes(userId)) {
        updates['current_progress.participants'] = [...participants, userId];
      }
      
      // Update challenge
      if (Object.keys(updates).length > 0) {
        await challengeRef.update(updates);
        
        // Check if challenge is completed
        await checkChallengeCompletion(challengeId);
      }
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Error updating class challenge progress:', error);
    throw error;
  }
});

async function checkChallengeCompletion(challengeId) {
  
 
  const challengeRef = db.collection('class_challenges').doc(challengeId);
  const challengeDoc = await challengeRef.get();
  
  if (!challengeDoc.exists) return;
  
  const challengeData = challengeDoc.data();
  const progress = challengeData.current_progress;
  const targets = challengeData.targets;
  
  // Check if all targets are met
  const xpComplete = progress.total_xp >= targets.total_xp;
  const trainingComplete = progress.total_trainings >= targets.total_trainings;
  
  if (xpComplete && trainingComplete && challengeData.status === 'active') {
    // Challenge completed! Award XP to all participants
    await challengeRef.update({ 
      status: 'completed',
      completed_at: FieldValue.serverTimestamp()
    });
    
    // Award XP to participants
    const rewardXP = challengeData.reward_xp || 40;
    for (const userId of progress.participants) {
      await awardClassChallengeReward(userId, rewardXP, challengeData);
    }
    
    console.log(`Class challenge ${challengeId} completed! Awarded ${rewardXP} XP to ${progress.participants.length} students`);
  }
}

async function awardClassChallengeReward(userId, xpAmount, challengeData) {
  
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) return;
    
    const userData = userDoc.data();
    const currentXP = userData.xp || 0;
    const newXP = currentXP + xpAmount;
    const newSparks = Math.floor(newXP / 100);
    
    await userRef.update({
      xp: newXP,
      sparks: newSparks,
      last_class_challenge_reward: FieldValue.serverTimestamp()
    });
    
    // Log the reward
    await logXPTransaction( {
      user_id: userId,
      user_email: userData.email,
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

// Helper functions
function getWeekStart(date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Monday
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getWeekEnd(date) {
  const result = getWeekStart(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}
// Add to index.js - Training Program Completion Detection
exports.checkTrainingProgramCompletion = onDocumentUpdated('leerling_schemas/{schemaId}', async (event) => {
  
  const change = event.data;
  const schemaId = event.params.schemaId;
  
  const afterData = change.after.data();
  
  try {
    // Check if the entire training program is now completed
    const isFullyCompleted = checkIfProgramFullyCompleted(afterData);
    
    if (isFullyCompleted && !afterData.completion_reward_awarded) {
      await awardProgramCompletionReward(afterData.leerling_id, schemaId, afterData);
    }
    
  } catch (error) {
    console.error('Error checking training program completion:', error);
  }
});

function checkIfProgramFullyCompleted(schemaData) {
  const gevalideerdeWeken = schemaData.gevalideerde_weken || {};
  const totalWeken = schemaData.total_weken || 0;
  
  if (totalWeken === 0) return false;
  
  // Count validated weeks
  let validatedCount = 0;
  Object.values(gevalideerdeWeken).forEach(week => {
    if (week.gevalideerd === true) {
      validatedCount++;
    }
  });
  
  // Consider program completed if 90% of weeks are validated
  const completionThreshold = Math.ceil(totalWeken * 0.9);
  return validatedCount >= completionThreshold;
}

async function awardProgramCompletionReward(leerlingEmail, schemaId, schemaData) {

  
  try {
    // Find user
    const usersQuery = await db.collection('users')
      .where('email', '==', leerlingEmail)
      .where('rol', '==', 'leerling')
      .get();
      
    if (usersQuery.empty) {
      console.error(`Student not found: ${leerlingEmail}`);
      return;
    }
    
    const userDoc = usersQuery.docs[0];
    const userData = userDoc.data();
    
    // Award 8 Sparks for program completion
    const completionSparks = 8;
    const currentSparks = userData.sparks || 0;
    const newSparks = currentSparks + completionSparks;
    
    await userDoc.ref.update({
      sparks: newSparks,
      completed_programs: (userData.completed_programs || 0) + 1,
      last_program_completion: FieldValue.serverTimestamp()
    });
    
    // Mark reward as awarded in schema
    await db.collection('leerling_schemas').doc(schemaId).update({
      completion_reward_awarded: true,
      completion_reward_sparks: completionSparks,
      completion_reward_date: FieldValue.serverTimestamp()
    });
    
    // Log the achievement
    await logTrainingCompletion( {
      user_id: userDoc.id,
      user_email: leerlingEmail,
      schema_id: schemaId,
      sparks_awarded: completionSparks,
      program_name: schemaData.naam || 'Training Program'
    });
    
    console.log(`Awarded ${completionSparks} Sparks to ${userData.naam} for completing training program`);
    
    // Optional: Create notification for student
    await createCompletionNotification( userDoc.id, userData.naam, completionSparks);
    
  } catch (error) {
    console.error('Error awarding training program completion reward:', error);
  }
}

async function logTrainingCompletion(completionData) {

  try {
    await db.collection('users')
      .doc(completionData.user_id)
      .collection('training_completions')
      .add({
        schema_id: completionData.schema_id,
        program_name: completionData.program_name,
        sparks_awarded: completionData.sparks_awarded,
        completed_at: FieldValue.serverTimestamp()
      });
      
    console.log(`Training completion logged for user ${completionData.user_id}`);
  } catch (error) {
    console.error('Error logging training completion:', error);
  }
}

async function createCompletionNotification(userId, userName, sparksAwarded) {
  
  try {
    await db.collection('notifications').add({
      recipient_id: userId,
      type: 'training_completion',
      title: 'Training Program Voltooid!',
      message: `Gefeliciteerd ${userName}! Je hebt een volledig trainingsprogramma afgerond en ${sparksAwarded} Sparks verdiend.`,
      sparks_earned: sparksAwarded,
      read: false,
      created_at: FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating completion notification:', error);
  }
}

// Manual function to check and award retroactive rewards
exports.checkRetroactiveTrainingRewards = onCall(async (request) => {
  
  
  // Admin check
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  const adminDoc = await db.collection('users').doc(request.auth.uid).get();
  if (!adminDoc.exists || !['administrator', 'super-administrator'].includes(adminDoc.data().rol)) {
    throw new Error('Admin access required');
  }
  
  try {
    const schemasSnapshot = await db.collection('leerling_schemas').get();
    let rewardsAwarded = 0;
    
    for (const schemaDoc of schemasSnapshot.docs) {
      const schemaData = schemaDoc.data();
      
      // Skip if already awarded
      if (schemaData.completion_reward_awarded) continue;
      
      // Check if program is completed
      if (checkIfProgramFullyCompleted(schemaData)) {
        await awardProgramCompletionReward(
          schemaData.leerling_id, 
          schemaDoc.id, 
          schemaData
        );
        rewardsAwarded++;
      }
    }
    
    return {
      success: true,
      message: `Checked ${schemasSnapshot.docs.length} training programs, awarded ${rewardsAwarded} completion rewards`,
      rewardsAwarded
    };
    
  } catch (error) {
    console.error('Error checking retroactive training rewards:', error);
    throw error;
  }
});
// in index.js

exports.saveEHBOProgress = onCall(async (request) => {
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  const { userId, scenarioId, score } = request.data;
  if (!userId || !scenarioId) {
    throw new Error('userId and scenarioId are required');
  }
  
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists || userDoc.data().rol !== 'leerling') {
      throw new Error('User not found or is not a student');
    }
    
    const userData = userDoc.data();
    const completedScenarios = userData.completed_ehbo_scenarios || [];
    
    // Check if already completed
    if (completedScenarios.includes(scenarioId)) {
      throw new Error('EHBO scenario already completed');
    }
    
    // Update alleen progress data - GEEN XP (dat doet awardEHBOXP al)
    await userRef.update({
      completed_ehbo_scenarios: FieldValue.arrayUnion(scenarioId),
      ehbo_total_score: FieldValue.increment(score || 0),
      ehbo_streak: FieldValue.increment(1),
      last_activity: FieldValue.serverTimestamp() // Voor streak tracking
    });
    
    return { 
      success: true, 
      message: 'EHBO progress saved successfully'
    };
    
  } catch (error) {
    console.error('Error saving EHBO progress:', error);
    throw new Error('Failed to save EHBO progress: ' + error.message);
  }
});