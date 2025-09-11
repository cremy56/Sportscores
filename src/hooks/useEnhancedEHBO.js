// /hooks/useEnhancedEHBO.js
import { useState, useEffect, useCallback } from 'react';
import { EnhancedEHBOController, EnhancedUIComponents } from '../utils/enhancedEHBO';

// Hook voor enhanced scenario state management
export const useEnhancedScenario = (profile) => {
  const [enhancedMode, setEnhancedMode] = useState(false);
  const [enhancedScenario, setEnhancedScenario] = useState(null);
  const [enhancedResults, setEnhancedResults] = useState([]);
  const [insights, setInsights] = useState([]);
  const [showHints, setShowHints] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Check of enhanced mode gesuggereerd moet worden
  useEffect(() => {
    if (profile && EnhancedEHBOController.shouldSuggestEnhanced(profile)) {
      // Je kunt hier een toast of modal tonen om enhanced mode aan te bevelen
      console.log('Enhanced mode wordt aanbevolen voor deze gebruiker');
    }
  }, [profile]);

  // Start enhanced scenario
  const startEnhancedScenario = useCallback(async (baseScenario) => {
    if (!enhancedMode || !profile) {
      return null;
    }

    setIsLoading(true);
    try {
      const result = await EnhancedEHBOController.enhanceScenario(baseScenario, profile);
      
      if (result.success) {
        setEnhancedScenario(result.scenario);
        setEnhancedResults([]);
        setInsights([]);
        setShowHints({});
        return result.scenario;
      } else {
        console.error('Enhanced scenario creation failed:', result.error);
        return result.fallback; // Gebruik fallback scenario
      }
    } catch (error) {
      console.error('Error starting enhanced scenario:', error);
      return baseScenario; // Fallback naar origineel
    } finally {
      setIsLoading(false);
    }
  }, [enhancedMode, profile]);

  // Complete enhanced scenario
  const completeEnhancedScenario = useCallback(async (results) => {
    if (!enhancedScenario || !profile) {
      return null;
    }

    try {
      const completion = await EnhancedEHBOController.completeEnhancedScenario(
        profile.id,
        enhancedScenario,
        results
      );

      if (completion.success) {
        setInsights(completion.insights);
        return completion;
      }
    } catch (error) {
      console.error('Error completing enhanced scenario:', error);
    }
    
    return null;
  }, [enhancedScenario, profile]);

  // Toggle hint voor specifieke stap
  const toggleHint = useCallback((stepId) => {
    setShowHints(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  }, []);

  // Reset enhanced state
  const resetEnhanced = useCallback(() => {
    setEnhancedScenario(null);
    setEnhancedResults([]);
    setInsights([]);
    setShowHints({});
  }, []);

  return {
    // State
    enhancedMode,
    enhancedScenario,
    enhancedResults,
    insights,
    showHints,
    isLoading,
    
    // Actions
    setEnhancedMode,
    startEnhancedScenario,
    completeEnhancedScenario,
    toggleHint,
    resetEnhanced,
    
    // Computed
    isEnhanced: enhancedMode && enhancedScenario?.isEnhanced
  };
};

// Hook voor adaptive user analysis
export const useAdaptiveAnalysis = (profile) => {
  const [userAnalysis, setUserAnalysis] = useState(null);
  const [adaptiveFeatures, setAdaptiveFeatures] = useState({});

  useEffect(() => {
    if (profile) {
      const analysis = EnhancedEHBOController.initializeEnhanced(profile);
      analysis.then(result => {
        setUserAnalysis(result.userAnalysis);
        setAdaptiveFeatures(result.adaptiveFeatures);
      });
    }
  }, [profile]);

  return {
    userAnalysis,
    adaptiveFeatures,
    shouldShowTimeAdjustment: adaptiveFeatures.timeAdjustment,
    shouldShowHints: adaptiveFeatures.hintSystem,
    shouldPersonalizeDifficulty: adaptiveFeatures.difficultyPersonalization
  };
};

// Hook voor performance insights
export const usePerformanceInsights = (completedScenarios = []) => {
  const [insights, setInsights] = useState([]);
  const [trends, setTrends] = useState({});

  useEffect(() => {
    if (completedScenarios.length > 0) {
      // Analyseer trends in prestaties
      const newTrends = analyzeTrends(completedScenarios);
      setTrends(newTrends);
      
      // Genereer insights
      const newInsights = generateInsights(newTrends);
      setInsights(newInsights);
    }
  }, [completedScenarios]);

  const analyzeTrends = (scenarios) => {
    const recentScenarios = scenarios.slice(-5); // Laatste 5 scenarios
    
    return {
      averageScore: recentScenarios.reduce((acc, s) => acc + (s.score || 0), 0) / recentScenarios.length,
      improvement: calculateImprovement(scenarios),
      consistentWeakness: findConsistentWeakness(scenarios),
      timeManagement: analyzeTimeManagement(recentScenarios)
    };
  };

  const calculateImprovement = (scenarios) => {
    if (scenarios.length < 3) return 0;
    
    const recent = scenarios.slice(-3).reduce((acc, s) => acc + (s.score || 0), 0) / 3;
    const older = scenarios.slice(0, -3).slice(-3).reduce((acc, s) => acc + (s.score || 0), 0) / 3;
    
    return recent - older;
  };

  const findConsistentWeakness = (scenarios) => {
    // Placeholder - in een echte implementatie zou je specifieke topics analyseren
    return scenarios.length > 3 && trends.averageScore < 60 ? 'basic_techniques' : null;
  };

  const analyzeTimeManagement = (scenarios) => {
    const hasTimeouts = scenarios.some(s => s.timeouts > 0);
    const averageTime = scenarios.reduce((acc, s) => acc + (s.averageTime || 0), 0) / scenarios.length;
    
    return {
      hasTimeouts,
      averageTime,
      needsMoreTime: hasTimeouts || averageTime > 20
    };
  };

  const generateInsights = (trends) => {
    const newInsights = [];
    
    if (trends.improvement > 10) {
      newInsights.push({
        type: 'positive',
        title: 'Goede Vooruitgang',
        description: `Je scores zijn gemiddeld ${Math.round(trends.improvement)} punten verbeterd!`
      });
    }
    
    if (trends.consistentWeakness) {
      newInsights.push({
        type: 'focus',
        title: 'Aandachtsgebied',
        description: 'Focus op basisvaardigheden voor betere resultaten.'
      });
    }
    
    if (trends.timeManagement.needsMoreTime) {
      newInsights.push({
        type: 'accessibility',
        title: 'Tijd Management',
        description: 'Overweeg uitgebreide tijdslimieten voor betere prestaties.'
      });
    }
    
    return newInsights;
  };

  return {
    insights,
    trends,
    hasInsights: insights.length > 0
  };
};

// Hook voor accessibility features
export const useAccessibilityFeatures = (profile) => {
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [features, setFeatures] = useState({
    extendedTime: false,
    dyslexiaSupport: false,
    audioSupport: false,
    visualAids: false
  });

  useEffect(() => {
    if (profile?.accessibility_needs) {
      const needs = profile.accessibility_needs;
      setFeatures({
        extendedTime: needs.includes('extended_time') || needs.includes('slow_reading'),
        dyslexiaSupport: needs.includes('dyslexia'),
        audioSupport: needs.includes('audio_support'),
        visualAids: needs.includes('visual_aids')
      });
      
      // Auto-enable accessibility mode if user has needs
      if (needs.length > 0) {
        setAccessibilityMode(true);
      }
    }
  }, [profile]);

  const toggleFeature = useCallback((featureName) => {
    setFeatures(prev => ({
      ...prev,
      [featureName]: !prev[featureName]
    }));
  }, []);

  return {
    accessibilityMode,
    setAccessibilityMode,
    features,
    toggleFeature,
    hasAccessibilityNeeds: Object.values(features).some(Boolean)
  };
};