const {onDocumentUpdated} = require('firebase-functions/v2/firestore');
const {onCall} = require('firebase-functions/v2/https');
const {onRequest} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');  // <- DEZE REGEL TOEVOEGEN
const {initializeApp} = require('firebase-admin/app');
const {getFirestore, FieldValue} = require('firebase-admin/firestore');
const admin = require('firebase-admin');
const { doc, getDoc } = require('firebase-admin/firestore');

if (admin.apps.length === 0) {
  initializeApp();
}
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
  const db = getFirestore();
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
  const db = getFirestore();
  
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
  const db = getFirestore();
  
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
  const userDoc = await getFirestore().collection('users').doc(uid).get();
  
  if (!userDoc.exists || userDoc.data().rol !== 'administrator') {
    throw new Error('Alleen administrators kunnen consistency checks uitvoeren');
  }
  
  const inconsistencies = [];
  
  try {
    // Check alle scores tegen user namen
    const scoresSnapshot = await getFirestore().collection('scores').get();
    
    for (const scoreDoc of scoresSnapshot.docs) {
      const scoreData = scoreDoc.data();
      const leerlingDoc = await getFirestore()
        .collection('users')
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
    await getFirestore().collection('consistency_reports').add({
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
  
  const beforeData = change.before.data();
  const afterData = change.after.data();
  
  console.log('Training schema updated:', schemaId);
  
  try {
    // Check alle weken in gevalideerde_weken om te zien welke nieuw gevalideerd zijn
    const beforeValidatedWeeks = beforeData.gevalideerde_weken || {};
    const afterValidatedWeeks = afterData.gevalideerde_weken || {};
    
    let newlyValidatedWeeks = [];
    
    // Zoek naar nieuw gevalideerde weken
    for (const [weekKey, weekData] of Object.entries(afterValidatedWeeks)) {
      const wasValidatedBefore = beforeValidatedWeeks[weekKey]?.gevalideerd || false;
      const isValidatedNow = weekData.gevalideerd || false;
      
      // Als deze week nu gevalideerd is maar dat voorheen niet was
      if (!wasValidatedBefore && isValidatedNow) {
        newlyValidatedWeeks.push({
          weekKey,
          weekData,
          trainingsXP: weekData.trainingsXP || 0
        });
        
        console.log(`Newly validated week: ${weekKey} with ${weekData.trainingsXP} XP`);
      }
    }
    
    // Als er nieuw gevalideerde weken zijn, ken XP toe
    if (newlyValidatedWeeks.length > 0) {
      await awardTrainingXP(afterData.leerling_id, newlyValidatedWeeks, schemaId);
    } else {
      console.log('No newly validated weeks found');
    }
    
  } catch (error) {
    console.error('Error processing training validation:', error);
    throw error;
  }
});

// Functie om XP toe te kennen aan een leerling
async function awardTrainingXP(leerlingEmail, validatedWeeks, schemaId) {
  console.log(`Awarding training XP to: ${leerlingEmail}`);
  const db = getFirestore();
  
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
    
    // Bereken totaal XP voor alle gevalideerde weken
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
    
    if (totalXP <= 0) {
      console.log('No XP to award (total XP is 0)');
      return;
    }
    
    // Update user document met nieuwe XP en Sparks
    const currentXP = userData.xp || 0;
    const currentSparks = userData.sparks || 0;
    const newXP = currentXP + totalXP;
    const newSparks = Math.floor(newXP / 100); // 100 XP = 1 Spark
    
    await userDoc.ref.update({
      xp: newXP,
      sparks: newSparks
    });
    
    console.log(`Successfully awarded ${totalXP} XP to ${userData.naam || leerlingEmail}`);
    console.log(`New totals: ${newXP} XP, ${newSparks} Sparks`);
    
    // Log de transactie voor audit trail
    await logXPTransaction(db, {
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
        validated_weeks: weekDetails
      }
    });
    
  } catch (error) {
    console.error('Error awarding training XP:', error);
    throw error;
  }
}

// Functie om XP transacties te loggen
async function logXPTransaction(db, transactionData) {
  try {
    const userId = transactionData.user_id;
    
    // Sla transactie op in subcollectie van de specifieke gebruiker
    await db.collection('users').doc(userId).collection('xp_transactions').add({
      amount: transactionData.amount,
      reason: transactionData.reason,
      source_id: transactionData.source_id,
      created_at: FieldValue.serverTimestamp()
    });
    
    console.log(`XP transaction logged for user ${userId}: +${transactionData.amount} XP`);
  } catch (error) {
    console.error('Error logging XP transaction:', error);
  }
}

// Handmatige XP toekenning functie (voor testing en admin gebruik)
exports.manualAwardTrainingXP = onCall(async (request) => {
  const db = getFirestore();
  
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
    
    await logXPTransaction(db, {
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
  const change = event.data;
  const userId = event.params.userId;
  const dateString = event.params.dateString;
  
  const beforeData = change.before.data() || {};
  const afterData = change.after.data() || {};
  
  console.log(`=== WELZIJN TRIGGER FIRED ===`);
  console.log(`UserId: ${userId}`);
  console.log(`DateString: ${dateString}`);
  console.log(`Before data:`, JSON.stringify(beforeData));
  console.log(`After data:`, JSON.stringify(afterData));
  
  // Check welke segmenten nieuw zijn ingevuld
  const newlyCompletedSegments = [];
  
  // Beweging segment (stappen > 0)
  const hadStappen = (beforeData.stappen || 0) > 0;
  const hasStappen = (afterData.stappen || 0) > 0;
  console.log(`Stappen: had=${hadStappen}, has=${hasStappen}, before=${beforeData.stappen}, after=${afterData.stappen}`);
  if (!hadStappen && hasStappen) {
    newlyCompletedSegments.push('beweging');
    console.log('Added beweging segment');
  }
    
    // Voeding segment (water > 0)
    const hadWater = (beforeData.water_intake || 0) > 0;
    const hasWater = (afterData.water_intake || 0) > 0;
    if (!hadWater && hasWater) {
      newlyCompletedSegments.push('voeding');
    }
    
    // Slaap segment (slaap_uren > 0)
    const hadSlaap = (beforeData.slaap_uren || 0) > 0;
    const hasSlaap = (afterData.slaap_uren || 0) > 0;
    if (!hadSlaap && hasSlaap) {
      newlyCompletedSegments.push('slaap');
    }
    
    // Mentaal segment (humeur ingevuld)
    const hadHumeur = beforeData.humeur ? true : false;
    const hasHumeur = afterData.humeur ? true : false;
    if (!hadHumeur && hasHumeur) {
      newlyCompletedSegments.push('mentaal');
    }
    
    // Hart segment (hartslag_rust > 0)
    const hadHartslag = (beforeData.hartslag_rust || 0) > 0;
    const hasHartslag = (afterData.hartslag_rust || 0) > 0;
    if (!hadHartslag && hasHartslag) {
      newlyCompletedSegments.push('hart');
    }
    
   console.log(`Newly completed segments:`, newlyCompletedSegments);
  
  if (newlyCompletedSegments.length > 0) {
    console.log('Awarding XP for segments:', newlyCompletedSegments);
    await awardWelzijnXP(userId, newlyCompletedSegments, dateString, afterData);
  } else {
    console.log('No newly completed segments detected');
  }
// NIEUW: Check voor completion bonus na elke update
  console.log('Checking for completion bonus...');
  await checkKompasCompletionBonus(userId, afterData, dateString);
});

// Functie om XP toe te kennen voor welzijn segmenten
async function awardWelzijnXP(userId, completedSegments, dateString, dayData) {
  console.log(`Awarding welzijn XP to user: ${userId}`);
  const db = getFirestore();
  
  try {
    // Zoek de user
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.error(`User not found: ${userId}`);
      return;
    }
    
    const userData = userDoc.data();
    
    // Check of dit een leerling is
    if (userData.rol !== 'leerling') {
      console.error(`User ${userId} is not a student, skipping XP award`);
      return;
    }
    
    // Bereken XP per segment
    const xpPerSegment = 4; // 4 XP per segment = 20 XP voor volledig kompas
    const totalXP = completedSegments.length * xpPerSegment;
    
    // Update user XP en Sparks
    const currentXP = userData.xp || 0;
    const currentSparks = userData.sparks || 0;
    const newXP = currentXP + totalXP;
    const newSparks = Math.floor(newXP / 100);
    
    // Update weekly stats
    const weeklyStats = userData.weekly_stats || {};
    const updatedWeeklyStats = {
      ...weeklyStats,
      kompas: (weeklyStats.kompas || 0) + completedSegments.length
    };
    
    await userRef.update({
      xp: newXP,
      sparks: newSparks,
      weekly_stats: updatedWeeklyStats,
      last_activity: FieldValue.serverTimestamp()
    });
    
    console.log(`Awarded ${totalXP} XP for ${completedSegments.length} segments to ${userData.naam || userId}`);
    console.log(`New totals: ${newXP} XP, ${newSparks} Sparks`);
    
    // Log transactie
    await logXPTransaction(db, {
      user_id: userId,
      user_email: userData.email,
      transaction_type: 'earn',
      reward_type: 'xp',
      amount: totalXP,
      reason: 'welzijn_segment_completion',
      source_id: `welzijn_${dateString}`,
      balance_after: { xp: newXP, sparks: newSparks },
      metadata: {
        date: dateString,
        completed_segments: completedSegments,
        xp_per_segment: xpPerSegment
      }
    });
    
  } catch (error) {
    console.error('Error awarding welzijn XP:', error);
    throw error;
  }
}

// Check voor volledig kompas bonus (extra XP als alle segmenten ingevuld zijn)
async function checkKompasCompletionBonus(userId, dayData, dateString) {
  const db = getFirestore();
  
  try {
    // Check of alle 5 segmenten ingevuld zijn
    const hasStappen = (dayData.stappen || 0) > 0;
    const hasWater = (dayData.water_intake || 0) > 0;
    const hasSlaap = (dayData.slaap_uren || 0) > 0;
    const hasHumeur = dayData.humeur ? true : false;
    const hasHartslag = (dayData.hartslag_rust || 0) > 0;
    
    const isKompasComplete = hasStappen && hasWater && hasSlaap && hasHumeur && hasHartslag;
    
    if (isKompasComplete) {
      console.log(`Complete kompas detected for ${userId} on ${dateString}`);
      
      // Check of bonus al is toegekend (via een completion_bonus veld)
      if (!dayData.completion_bonus_awarded) {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          const bonusXP = 10; // 16 XP bonus = totaal 20 XP voor volledig kompas
          
          const currentXP = userData.xp || 0;
          const newXP = currentXP + bonusXP;
          const newSparks = Math.floor(newXP / 100);
          
          await userRef.update({
            xp: newXP,
            sparks: newSparks
          });
          
          // Mark bonus als toegekend in dagelijkse data
          const dayRef = db.collection('welzijn').doc(userId).collection('dagelijkse_data').doc(dateString);
          await dayRef.update({
            completion_bonus_awarded: true,
            completion_bonus_xp: bonusXP
          });
          
          console.log(`Awarded ${bonusXP} completion bonus to ${userData.naam || userId}`);
          
          // Log transactie
          await logXPTransaction(db, {
            user_id: userId,
            user_email: userData.email,
            transaction_type: 'earn',
            reward_type: 'xp',
            amount: bonusXP,
            reason: 'welzijn_kompas_complete',
            source_id: `kompas_complete_${dateString}`,
            balance_after: { xp: newXP, sparks: newSparks },
            metadata: {
              date: dateString,
              all_segments_completed: true
            }
          });
          
          // Update streak
          await updateWelzijnStreak(userId, dateString);
        }
      }
    }
    
  } catch (error) {
    console.error('Error checking kompas completion bonus:', error);
  }
}

// Update welzijn streak (voor toekomstige streak beloningen)
async function updateWelzijnStreak(userId, dateString) {
  const db = getFirestore();
  
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
  const db = getFirestore();
  
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
  const db = getFirestore();
  
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
      getDoc(doc(db, 'users', userId)),
      getDoc(doc(db, 'testen', testId))
    ]);
    
    if (!userDoc.exists()) {
      console.log('User not found, checking toegestane_gebruikers...');
      const toegestaneUserDoc = await getDoc(doc(db, 'toegestane_gebruikers', userId));
      if (!toegestaneUserDoc.exists()) {
        throw new Error('User not found in users or toegestane_gebruikers');
      }
    }
    
    if (!testDoc.exists()) {
      throw new Error('Test not found');
    }
    
    const userData = userDoc.exists() ? userDoc.data() : {};
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
        
        console.log(`🏆 Personal Record! User ${userId}: ${newScore} (previous: ${prInfo.previousBest}, improvement: ${prInfo.improvement})`);
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
      if (userDoc.exists()) {
        await userDoc.ref.update(updateData);
      } else {
        const toegestaneUserRef = doc(db, 'toegestane_gebruikers', userId);
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
      await logXPTransaction(db, {
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

// Zorg er ook voor dat je checkPersonalRecord functie deze is:
async function checkPersonalRecord(userId, testId, newScore, testData) {
  const db = getFirestore();
  
  try {
    console.log('=== CHECK PERSONAL RECORD ===');
    console.log('User ID:', userId);
    console.log('Test ID:', testId);
    console.log('New Score:', newScore);
    
    // Haal alle historische scores op voor deze user + test combinatie
    const historicalQuery = query(
      collection(db, 'scores'),
      where('leerling_id', '==', userId),
      where('test_id', '==', testId),
      where('score', '!=', null)
    );
    
    const historicalScores = await getDocs(historicalQuery);
    console.log('Historical scores found:', historicalScores.size);
    
    // Als dit de eerste score is, is het automatisch een PR
    if (historicalScores.empty) {
      console.log(`First score for user ${userId} on test ${testId} - automatic PR`);
      return { isPersonalRecord: true, previousBest: null, improvement: null };
    }
    
    // Filter de huidige score uit (als die er al in staat)
    const previousScores = [];
    historicalScores.docs.forEach(doc => {
      const scoreData = doc.data();
      // Alleen toevoegen als het niet de score is die we net hebben ingevuld
      if (scoreData.score !== newScore) {
        previousScores.push(scoreData.score);
      }
    });
    
    console.log('Previous scores:', previousScores);
    
    if (previousScores.length === 0) {
      console.log('No previous different scores found - this is a PR');
      return { isPersonalRecord: true, previousBest: null, improvement: null };
    }
    
    // Bepaal wat "beter" betekent voor deze test
    const scoreRichting = testData.score_richting || 'hoog';
    console.log('Score richting:', scoreRichting);
    
    let previousBest;
    if (scoreRichting === 'hoog') {
      // Hoger = beter (bijv. verspringen, basketball shots)
      previousBest = Math.max(...previousScores);
      const isPersonalRecord = newScore > previousBest;
      const improvement = isPersonalRecord ? newScore - previousBest : null;
      
      console.log(`Higher is better: new=${newScore}, previous best=${previousBest}, is PR=${isPersonalRecord}`);
      return { isPersonalRecord, previousBest, improvement };
    } else {
      // Lager = beter (bijv. sprint tijden, cooper test tijd)  
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

// Wekelijkse bonussen check (elke maandag om 6:00)


exports.checkWeeklyBonuses = onSchedule('0 6 * * 1', async (event) => {
  const db = getFirestore();
  
  try {
    console.log('Starting weekly bonus check...');
    
    const usersSnapshot = await db.collection('users')
      .where('rol', '==', 'leerling')
      .get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const weeklyStats = userData.weekly_stats || {};
      
      const kompasDays = weeklyStats.kompas || 0;
      const trainingCount = weeklyStats.trainingen || 0;
      
      // Perfecte Week bonus (5x kompas + 2x training = 50 XP)
      if (kompasDays >= 5 && trainingCount >= 2 && !weeklyStats.perfectWeek) {
        await awardWeeklyBonus(userDoc, userData, 50, 'perfect_week_bonus');
      }
      
      // Training bonus (3x training = 25 XP)
      if (trainingCount >= 3 && !weeklyStats.trainingBonus) {
        await awardWeeklyBonus(userDoc, userData, 25, 'weekly_training_bonus');
      }
      
      // Reset weekly stats
      await userDoc.ref.update({
        weekly_stats: {
          kompas: 0,
          trainingen: 0,
          perfectWeek: false,
          trainingBonus: false
        }
      });
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Error in weekly bonus check:', error);
    throw error;
  }
});

async function awardWeeklyBonus(userDoc, userData, bonusXP, reason) {
  const db = getFirestore();
  const currentXP = userData.xp || 0;
  const newXP = currentXP + bonusXP;
  const newSparks = Math.floor(newXP / 100);
  
  await userDoc.ref.update({
    xp: newXP,
    sparks: newSparks
  });
  
  await logXPTransaction(db, {
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
  
  const db = getFirestore();
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
  const db = getFirestore();
  
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  const { userId, scenarioId, xpAmount = 30 } = request.data;
  
  if (!userId || !scenarioId) {
    throw new Error('userId and scenarioId required');
  }
  
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    if (userData.rol !== 'leerling') {
      throw new Error('Only students can receive EHBO XP');
    }
    
    const currentXP = userData.xp || 0;
    const newXP = currentXP + xpAmount;
    const newSparks = Math.floor(newXP / 100);
    
    await userRef.update({
      xp: newXP,
      sparks: newSparks,
      last_activity: FieldValue.serverTimestamp()
    });
    
    await logXPTransaction(db, {
      user_id: userId,
      user_email: userData.email,
      amount: xpAmount,
      reason: 'ehbo_scenario_completion',
      source_id: scenarioId
    });
    
    return {
      success: true,
      message: `Awarded ${xpAmount} XP for EHBO scenario`,
      newTotals: { xp: newXP, sparks: newSparks }
    };
    
  } catch (error) {
    console.error('Error awarding EHBO XP:', error);
    throw new Error('Failed to award EHBO XP: ' + error.message);
  }
});
// ==============================================
// PERSONAL RECORD DETECTION & XP SYSTEM
// ==============================================

async function checkPersonalRecord(userId, testId, newScore, testData) {
  const db = getFirestore();
  
  try {
    // Haal alle historische scores op voor deze user + test combinatie
    const historicalQuery = query(
      collection(db, 'scores'),
      where('leerling_id', '==', userId),
      where('test_id', '==', testId),
      where('score', '!=', null)
    );
    
    const historicalScores = await getDocs(historicalQuery);
    
    // Als dit de eerste score is, is het automatisch een PR
    if (historicalScores.empty) {
      console.log(`First score for user ${userId} on test ${testId} - automatic PR`);
      return { isPersonalRecord: true, previousBest: null, improvement: null };
    }
    
    // Bepaal wat "beter" betekent voor deze test
    const scoreRichting = testData.score_richting || 'hoog';
    const previousScores = historicalScores.docs.map(doc => doc.data().score);
    
    let previousBest;
    if (scoreRichting === 'hoog') {
      // Hoger = beter (bijv. verspringen, basketball shots)
      previousBest = Math.max(...previousScores);
      const isPersonalRecord = newScore > previousBest;
      const improvement = isPersonalRecord ? newScore - previousBest : null;
      
      return { isPersonalRecord, previousBest, improvement };
    } else {
      // Lager = beter (bijv. sprint tijden, cooper test tijd)
      previousBest = Math.min(...previousScores);
      const isPersonalRecord = newScore < previousBest;
      const improvement = isPersonalRecord ? previousBest - newScore : null;
      
      return { isPersonalRecord, previousBest, improvement };
    }
    
  } catch (error) {
    console.error('Error checking personal record:', error);
    return { isPersonalRecord: false, previousBest: null, improvement: null };
  }
}

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
async function checkPersonalRecord(db, userId, testId, newScore, testData) {
  try {
    const scoresRef = db.collection('scores');
    const query = scoresRef
      .where('leerling_id', '==', userId)
      .where('test_id', '==', testId);
    
    const snapshot = await query.get();
    
    const previousScores = [];
    snapshot.docs.forEach(doc => {
      const score = doc.data().score;
      if (score !== null && score !== newScore) {
        previousScores.push(score);
      }
    });
    
    console.log(`Found ${previousScores.length} previous scores:`, previousScores);
    
    if (previousScores.length === 0) {
      console.log('First score = automatic PR');
      return { isPersonalRecord: true, previousBest: null };
    }
    
    const scoreRichting = testData.score_richting || 'hoog';
    console.log('Score richting:', scoreRichting);
    
    if (scoreRichting === 'hoog') {
      const previousBest = Math.max(...previousScores);
      const isRecord = newScore > previousBest;
      console.log(`Higher is better: ${newScore} > ${previousBest} = ${isRecord}`);
      return { isPersonalRecord: isRecord, previousBest };
    } else {
      const previousBest = Math.min(...previousScores);
      const isRecord = newScore < previousBest;
      console.log(`Lower is better: ${newScore} < ${previousBest} = ${isRecord}`);
      return { isPersonalRecord: isRecord, previousBest };
    }
    
  } catch (error) {
    console.error('PR check failed:', error);
    return { isPersonalRecord: false, previousBest: null };
  }
}

async function checkPersonalRecord(db, userId, testId, newScore, testData) {
  try {
    const scoresRef = db.collection('scores');
    const query = scoresRef
      .where('leerling_id', '==', userId)
      .where('test_id', '==', testId);
    
    const snapshot = await query.get();
    
    const previousScores = [];
    snapshot.docs.forEach(doc => {
      const score = doc.data().score;
      if (score !== null && score !== newScore) {
        previousScores.push(score);
      }
    });
    
    console.log(`Found ${previousScores.length} previous scores:`, previousScores);
    
    if (previousScores.length === 0) {
      console.log('First score = automatic PR');
      return { isPersonalRecord: true, previousBest: null };
    }
    
    const scoreRichting = testData.score_richting || 'hoog';
    console.log('Score richting:', scoreRichting);
    
    if (scoreRichting === 'hoog') {
      const previousBest = Math.max(...previousScores);
      const isRecord = newScore > previousBest;
      console.log(`Higher is better: ${newScore} > ${previousBest} = ${isRecord}`);
      return { isPersonalRecord: isRecord, previousBest };
    } else {
      const previousBest = Math.min(...previousScores);
      const isRecord = newScore < previousBest;
      console.log(`Lower is better: ${newScore} < ${previousBest} = ${isRecord}`);
      return { isPersonalRecord: isRecord, previousBest };
    }
    
  } catch (error) {
    console.error('PR check failed:', error);
    return { isPersonalRecord: false, previousBest: null };
  }
}

// Maak een interne versie van de XP functie die geen HTTP/auth nodig heeft:
async function awardTestParticipationXPInternal(userId, testId, newScore) {
  const db = getFirestore();
  
  console.log('=== INTERNAL XP AWARD START ===');
  
  try {
    // Zoek user in beide collecties
    let userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      userDoc = await getDoc(doc(db, 'toegestane_gebruikers', userId));
    }
    
    const testDoc = await getDoc(doc(db, 'testen', testId));
    
    if (!userDoc.exists() || !testDoc.exists()) {
      throw new Error(`User or test not found. User exists: ${userDoc.exists()}, Test exists: ${testDoc.exists()}`);
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
  const db = getFirestore();
  
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