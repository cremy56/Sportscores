// src/utils/sportNewsFeed.js
// MARKER_SPORTNEWS_FEED
// Haalt het sportnieuws op via de publieke cloudfunctie getSportNews
// (europe-west1). Was voorheen een class in useState; een stateloze
// fetch-wrapper hoeft geen instantie te zijn.
//
// LET OP: getSportNews is een van de twee bewust publieke https-endpoints.
// De teruggegeven titels zijn ONVERTROUWDE externe data (RSS) en worden
// uitsluitend als tekstnode gerenderd — nooit via dangerouslySetInnerHTML.

const SPORT_NEWS_URL =
  'https://europe-west1-sportscore-6774d.cloudfunctions.net/getSportNews';

export async function fetchLiveSportsData(signal) {
  try {
    const response = await fetch(SPORT_NEWS_URL, { signal });

    if (!response.ok) {
      console.error('Proxy Error:', response.statusText);
      return { news: [], scores: [], offline: true };
    }

    const data = await response.json();

    if (data.success) {
      return { news: data.news || [], scores: [], offline: false };
    }
    return { news: [], scores: [], offline: true };
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    console.error('Fout bij ophalen live feed via proxy:', error);
    return { news: [], scores: [], offline: true };
  }
}
