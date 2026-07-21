const {onRequest} = require('firebase-functions/v2/https');

// ==============================================
// PUBLIEKE SPORT NEWS PROXY (getSportNews)
// ==============================================
// Dit is een van de twee bewust publieke https-endpoints. Zonder auth-check
// betekent dat: iedereen die de URL kent kan hem aanroepen. Beschermingen
// (jul 2026):
//   1. CORS beperkt tot eigen domeinen  → weert browser-misbruik
//   2. Server-side cache (CACHE_TTL_MS) → 1 externe fetch-ronde per venster,
//      ongeacht het aantal bezoekers. Dit is de belangrijkste maatregel:
//      zonder cache haalde ELKE aanroep 4 externe RSS-feeds op.
//   3. In-memory rate limit per gehasht IP → begrenst hameren per bron
//   4. maxInstances → harde bovengrens op kosten bij een floodpoging
//   5. Payload-begrenzing (titel/omschrijving/aantal) → een gekaapte of
//      ontspoorde RSS-bron kan het ad valvas-scherm niet volgooien
//
// LET OP: de cache en de rate-limitteller leven per instance (in-memory).
// Met maxInstances=3 betekent dat maximaal 3 fetch-rondes per venster.
// Bewuste keuze: geen Redis-afhankelijkheid in een publieke cloudfunctie.

const crypto = require('crypto');

const CACHE_TTL_MS = 5 * 60 * 1000;      // 5 min — matcht de Cache-Control
const RL_VENSTER_MS = 60 * 1000;         // rate-limit venster
const RL_MAX_PER_IP = 20;                // max verzoeken per IP per venster
const MAX_TITEL_LENGTE = 200;            // begrenst wat op het scherm past
const MAX_OMSCHRIJVING = 200;
const MAX_ITEMS = 25;

// ─── Server-side cache ───────────────────────────────────────────────────────
let cacheData = null;
let cacheTijd = 0;

// ─── Eenvoudige in-memory rate limit (per gehasht IP) ────────────────────────
// IP's zijn persoonsgegevens: nooit ruw bijhouden. We hashen ze en bewaren
// enkel een teller die vanzelf verloopt.
const rlMap = new Map();

function hashIp(ip) {
  return crypto.createHash('sha256').update(String(ip)).digest('hex').substring(0, 16);
}

function rateLimitOverschreden(req) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress || 'onbekend';
  const key = hashIp(ip);
  const nu = Date.now();

  // Opruimen van verlopen entries (houdt de Map klein)
  if (rlMap.size > 1000) {
    for (const [k, v] of rlMap) {
      if (nu - v.start > RL_VENSTER_MS) rlMap.delete(k);
    }
  }

  const entry = rlMap.get(key);
  if (!entry || nu - entry.start > RL_VENSTER_MS) {
    rlMap.set(key, { start: nu, aantal: 1 });
    return false;
  }
  entry.aantal += 1;
  return entry.aantal > RL_MAX_PER_IP;
}

exports.getSportNews = onRequest({
  // Ingebouwde CORS-handler van Firebase: enkel eigen domeinen.
  cors: [
    'https://sportscores-app.firebaseapp.com',
    'https://sportscores-app.web.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://www.sportscores.be'
  ],
  region: 'europe-west1',
  // Harde bovengrens op kosten: zonder dit kan een floodpoging de functie
  // ongelimiteerd laten opschalen.
  maxInstances: 3,
  timeoutSeconds: 30,
  memory: '256MiB'
}, async (req, res) => {
  res.set('Access-Control-Allow-Methods', 'GET');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Cache-Control', 'public, max-age=300'); // 5 minuten browser-cache

  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  // Alleen GET: dit endpoint leest enkel.
  if (req.method !== 'GET') {
    res.set('Allow', 'GET');
    res.status(405).json({ success: false, error: 'Methode niet toegestaan' });
    return;
  }

  if (rateLimitOverschreden(req)) {
    res.set('Retry-After', '60');
    res.status(429).json({
      success: false,
      error: 'Te veel verzoeken. Probeer het over een minuutje opnieuw.',
      news: []
    });
    return;
  }

  // Cache-hit: geen enkele externe fetch nodig.
  if (cacheData && (Date.now() - cacheTijd) < CACHE_TTL_MS) {
    res.status(200).json({ ...cacheData, cached: true });
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
      .slice(0, MAX_ITEMS);

    // Fallback als geen nieuws
    if (sortedNews.length === 0) {
      sortedNews.push({
        title: "🏃‍♂️ Sport dashboard actief - wachtend op live updates...",
        source: "Sport Dashboard",
        publishedAt: new Date().toISOString(),
        url: "#"
      });
    }

    const payload = {
      success: true,
      news: sortedNews,
      totalFetched: allNews.length,
      timestamp: new Date().toISOString()
    };

    // Cache vullen: volgende bezoekers binnen CACHE_TTL_MS raken de externe
    // feeds niet meer aan.
    cacheData = payload;
    cacheTijd = Date.now();

    res.status(200).json(payload);

  } catch (error) {
    console.error('Sport nieuws proxy fout:', error);

    // Liever verouderd nieuws dan een leeg scherm in de gang: als er nog een
    // (verlopen) cache is, serveren we die met een 200.
    if (cacheData) {
      res.status(200).json({ ...cacheData, cached: true, stale: true });
      return;
    }

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
          const datum = new Date(pubDate);
          // Ongeldige pubDate zou 'Invalid Date' opleveren en later de
          // sortering en de 24u-filter stukmaken.
          if (isNaN(datum.getTime())) continue;

          items.push({
            // Titels worden begrensd: een ontspoorde of gekaapte bron mag
            // het ad valvas-scherm niet volgooien.
            title: formatNewsTitle(title).slice(0, MAX_TITEL_LENGTE),
            source: sourceName,
            publishedAt: datum.toISOString(),
            url: veiligeUrl(link),
            description: stripHtml(description).slice(0, MAX_OMSCHRIJVING)
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

// Alleen http(s)-links doorlaten. De url wordt vandaag niet gerenderd, maar
// als dat ooit gebeurt mag een feed geen javascript:- of data:-URI kunnen
// binnensmokkelen.
function veiligeUrl(url) {
  if (!url) return '';
  try {
    const geparsed = new URL(url);
    if (geparsed.protocol !== 'http:' && geparsed.protocol !== 'https:') return '';
    return geparsed.toString().slice(0, 500);
  } catch {
    return '';
  }
}

// HTML tags strippen
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}

// Herkent een geciteerde uitspraak van enige lengte in een titel. Gebruikt
// charCodes i.p.v. een regex-literal zodat de diverse soorten aanhalingstekens
// (recht, links/rechts krullend) eenduidig te vergelijken zijn.
function bevatLangCitaat(titel) {
  if (!titel) return false;
  const QUOTES = [0x22, 0x201C, 0x201D, 0x2018, 0x2019, 0xAB, 0xBB];
  let eerste = -1;
  for (let i = 0; i < titel.length; i++) {
    if (QUOTES.includes(titel.charCodeAt(i))) {
      if (eerste === -1) {
        eerste = i;
      } else if (i - eerste >= 15) {
        return true;
      }
    }
  }
  return false;
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

  // ── Schoolscherm-filter ────────────────────────────────────────────────────
  // Het ad valvas hangt publiek in een school. De sportcheck hierboven kijkt
  // enkel of er ERGENS een sportwoord in de tekst staat: een smeuig interview
  // met een atleet haalt die check dus moeiteloos. Deze lijst blokkeert los
  // van het sportgehalte. Bij twijfel: niet tonen.
  const nietVoorSchool = [
    // lichamelijk/plat
    'poep', 'kak', 'pis', 'plas', 'kots', 'braak', 'scheet', 'toilet',
    // seksueel / relationeel geroddel
    'seks', 'sex', 'naakt', 'nude', 'vreemdgaan', 'affaire',
    'liefdesleven', 'scheiding', 'echtscheiding', 'ex-vriendin', 'ex-vrouw',
    'onenightstand', 'pikant', 'intiem', 'sexy', 'lingerie',
    'ontrouw', 'bedrogen', 'datingleven', 'relatiebreuk',
    // zware/gevoelige onderwerpen
    'overleden', 'sterft', 'stierf', 'begrafenis', 'zelfmoord',
    'suicide', 'doodgereden', 'verkracht', 'aanranding', 'misbruik',
    'mishandeling', 'geweld', 'moord', 'drugs', 'doping', 'alcohol',
    'dronken', 'gokken', 'gokverslaving',
    // clickbait-registers
    'schandaal', 'ruzie', 'uithaal', 'sneer', 'afgekraakt'
  ];

  return items.filter(item => {
    const content = `${item.title} ${item.description || ''}`.toLowerCase();
    
    const hasSportContent = sportKeywords.some(keyword => 
      content.includes(keyword.toLowerCase())
    );
    
    const hasExcludedContent = excludeKeywords.some(keyword =>
      content.includes(keyword.toLowerCase())
    );

    // Ongeschikt voor een schoolscherm -> altijd weg, ook al is het sport.
    const ongeschikt = nietVoorSchool.some(woord => content.includes(woord));
    if (ongeschikt) return false;

    // Een geciteerde uitspraak in de titel duidt bijna altijd op een
    // interviewkop; dat is het genre waar de smeuige koppen zitten. Een
    // sportverslag ("Club wint met 3-0") heeft aanhalingstekens zelden nodig.
    if (bevatLangCitaat(item.title)) return false;
    
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
