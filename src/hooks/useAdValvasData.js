// src/hooks/useAdValvasData.js
// MARKER_USE_ADVALVAS_DATA
// Bundelt het ophalen van de dashboarddata (/api/content) en de sportnieuws-
// feed. Houdt alle netwerk- en intervalzorgen uit de presentatielaag.

import { useState, useEffect, useCallback, useRef } from 'react';
import { auth } from '../firebase';
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

  // Haalt de dashboarddata op met een VERSE Firebase ID-token.
  // Firebase-tokens verlopen na ~1 uur; een ad valvas-scherm draait dagen
  // aan een stuk. profile._token (1x gelezen bij mount) liep daardoor af.
  // getIdToken() ververst automatisch wanneer nodig.
  const fetchDashboardData = useCallback(async (signal) => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Geen gebruiker ingelogd.');
      const token = await user.getIdToken();

      const response = await fetch('/api/content', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        signal
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Kon dashboard data niet laden');
      }

      setTestHighscores(data.testHighscores || []);
      setMededelingenData(data.mededelingen || []);
      setBreakingNewsItems(data.breakingNews || []);
      setActiveTests(data.activeTests || []);
      setDataError(false);
    } catch (error) {
      if (error.name === 'AbortError') return;
      // Technisch detail blijft in de console; het ad valvas-scherm hangt
      // publiek in de gang, dus GEEN servermeldingen/stacktraces in de UI.
      console.error('Error fetching AdValvas data:', error);
      setDataError(true);
    } finally {
      setLoading(false);
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
    const controller = new AbortController();
    setLoading(true);
    fetchDashboardData(controller.signal);

    const dataInterval = setInterval(() => {
      fetchDashboardData(controller.signal);
    }, DATA_REFRESH_MS);

    return () => {
      controller.abort();
      clearInterval(dataInterval);
    };
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
