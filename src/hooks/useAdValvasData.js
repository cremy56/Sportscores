// src/hooks/useAdValvasData.js
// MARKER_USE_ADVALVAS_DATA
// Bundelt het ophalen van de dashboarddata (/api/content) en de sportnieuws-
// feed. Houdt alle netwerk- en intervalzorgen uit de presentatielaag.

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiCall } from '../utils/api';
import { fetchLiveSportsData } from '../utils/sportNewsFeed.js';
import { DATA_REFRESH_MS, FEED_REFRESH_MS } from '../data/adValvasConfig.js';

export function useAdValvasData(profile) {
  // Dashboarddata
  const [testHighscores, setTestHighscores] = useState([]);
  const [mededelingenData, setMededelingenData] = useState([]);
  const [breakingNewsItems, setBreakingNewsItems] = useState([]);
  const [activeTests, setActiveTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(false);

  // Sportnieuwsfeed
  const [liveNewsData, setLiveNewsData] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedStatus, setFeedStatus] = useState('connecting');
  const [lastFeedRefresh, setLastFeedRefresh] = useState(null);

  const schoolId = profile?.school_id;

  // Houdt de laatste abort-controller vast zodat een handmatige refresh
  // netjes kan worden afgebroken bij unmount.
  const feedControllerRef = useRef(null);

  // apiCall() kent geen AbortSignal, dus bewaken we met een vlag dat we niet
  // meer in state schrijven nadat de component ontkoppeld is.
  const gemonteerdRef = useRef(true);
  useEffect(() => {
    gemonteerdRef.current = true;
    return () => { gemonteerdRef.current = false; };
  }, []);

  // Dashboarddata via de centrale apiCall()-helper (projectregel: nooit
  // profile._token of eigen fetch). apiCall haalt per call een vers token,
  // doet bij 401 één geforceerde refresh + retry, en toont bij 429 een toast.
  // Dat vers-token-gedrag is precies wat dit scherm nodig heeft: het draait
  // dagenlang aan een stuk en een token verloopt na ~1 uur.
  const fetchDashboardData = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    try {
      // stil: true → geen 429-toast op een scherm dat publiek in de gang
      // hangt; de poll van 15 min zit ruim onder de leeslimiet (120/60s),
      // dus een 429 hier is hoe dan ook uitzonderlijk.
      const data = await apiCall('/api/content', null, { method: 'GET', stil: true });
      if (!gemonteerdRef.current) return;

      setTestHighscores(data.testHighscores || []);
      setMededelingenData(data.mededelingen || []);
      setBreakingNewsItems(data.breakingNews || []);
      setActiveTests(data.activeTests || []);
      setDataError(false);
    } catch (error) {
      if (!gemonteerdRef.current) return;
      // Technisch detail blijft in de console; het ad valvas-scherm hangt
      // publiek in de gang, dus GEEN servermeldingen/stacktraces in de UI.
      console.error('Error fetching AdValvas data:', error);
      setDataError(true);
    } finally {
      if (gemonteerdRef.current) setLoading(false);
    }
  }, [schoolId]);

  const loadFeed = useCallback(async (signal, status = 'connecting') => {
    setFeedLoading(true);
    setFeedStatus(status);
    try {
      const feedData = await fetchLiveSportsData(signal);
      if (feedData.offline) {
        setFeedStatus('offline');
        setLiveNewsData([]);
      } else {
        setFeedStatus('online');
        setLiveNewsData(feedData.news || []);
        setLastFeedRefresh(new Date());
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Fout bij laden live feed:', error);
      setFeedStatus('error');
      setLiveNewsData([]);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  // Dashboarddata: initieel + periodiek verversen zodat een permanent
  // scherm bij blijft zonder handmatige refresh.
  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchDashboardData();

    const dataInterval = setInterval(fetchDashboardData, DATA_REFRESH_MS);
    return () => clearInterval(dataInterval);
  }, [schoolId, fetchDashboardData]);

  // Sportnieuwsfeed: initieel + elk uur.
  useEffect(() => {
    const controller = new AbortController();
    feedControllerRef.current = controller;
    loadFeed(controller.signal);

    const feedInterval = setInterval(() => {
      loadFeed(controller.signal);
    }, FEED_REFRESH_MS);

    return () => {
      controller.abort();
      clearInterval(feedInterval);
    };
  }, [loadFeed]);

  const refreshData = useCallback(() => fetchDashboardData(), [fetchDashboardData]);

  const refreshFeed = useCallback(
    () => loadFeed(feedControllerRef.current?.signal, 'refreshing'),
    [loadFeed]
  );

  return {
    testHighscores,
    mededelingenData,
    breakingNewsItems,
    activeTests,
    loading,
    dataError,
    liveNewsData,
    feedLoading,
    feedStatus,
    lastFeedRefresh,
    refreshData,
    refreshFeed
  };
}
