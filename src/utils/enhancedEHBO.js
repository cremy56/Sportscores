// /utils/enhancedEHBO.js
// Core Enhanced EHBO System voor geleidelijke integratie

// Scenario Variation Generator - Vereenvoudigde versie voor Fase 1
export const ScenarioVariationGenerator = {
  generateVariation(baseScenario, userProfile) {
    // Basis variatie - start simpel
    const variation = {
      ...baseScenario,
      id: `${baseScenario.id}_enhanced_${Date.now()}`,
      isEnhanced: true,
      adaptations: {
        timeLimitsAdjusted: false,
        difficultyPersonalized: false,
        roleBasedChallenges: false
      }
    };

    // Pas tijdslimieten aan voor toegankelijkheid
    if (userProfile.accessibilityNeeds?.includes('extended_time') || userProfile.readingSpeed === 'slow') {
      variation.steps = variation.steps.map(step => ({
        ...step,
        timeLimit: Math.round(step.timeLimit * 1.5), // 50% meer tijd
        originalTimeLimit: step.timeLimit
      }));
      variation.adaptations.timeLimitsAdjusted = true;
    }

    return variation;
  },

  // Eenvoudige context variatie
  addContextVariation(scenario, context = 'school') {
    const contextMappings = {
      school: {
        locations: ['in de schoolgang', 'op de speelplaats', 'in de gymzaal'],
        witnesses: ['klasgenoten', 'een leerkracht', 'de conciërge']
      },
      home: {
        locations: ['thuis in de keuken', 'in de tuin', 'op de trap'],
        witnesses: ['je ouders', 'je broer/zus', 'de buren']
      }
    };

    const mapping = contextMappings[context] || contextMappings.school;
    const location = mapping.locations[Math.floor(Math.random() * mapping.locations.length)];
    const witness = mapping.witnesses[Math.floor(Math.random() * mapping.witnesses.length)];

    return {
      ...scenario,
      context: context,
      contextDescription: `De situatie speelt zich af ${location}. ${witness} is aanwezig.`,
      steps: scenario.steps.map(step => ({
        ...step,
        question: step.question.replace(/op de grond/, location)
      }))
    };
  }
};

// Adaptieve Intelligentie - Basis versie
export const AdaptiveIntelligenceSystem = {
  analyzeUserProfile(profile) {
    // Bepaal leerpatronen uit bestaande data
    const completedScenarios = profile.completed_ehbo_scenarios || [];
    const totalScore = profile.ehbo_total_score || 0;
    
    return {
      readingSpeed: this.determineReadingSpeed(completedScenarios),
      difficultyPreference: this.determineDifficultyPreference(totalScore, completedScenarios.length),
      strugglingTopics: this.identifyStrugglingTopics(completedScenarios),
      accessibilityNeeds: profile.accessibility_needs || []
    };
  },

  determineReadingSpeed(completedScenarios) {
    if (completedScenarios.length < 3) return 'normal';
    
    // Analyseer gemiddelde tijd per scenario (placeholder logica)
    return 'normal'; // Voor nu - later uitbreiden met echte analyse
  },

  determineDifficultyPreference(totalScore, scenarioCount) {
    if (scenarioCount === 0) return 'beginner';
    
    const averageScore = totalScore / scenarioCount;
    if (averageScore >= 80) return 'advanced';
    if (averageScore >= 60) return 'intermediate';
    return 'beginner';
  },

  identifyStrugglingTopics(completedScenarios) {
    // Placeholder - later uitbreiden met echte analyse
    return [];
  },

  // Pas scenario aan voor gebruiker
  personalizeScenario(scenario, userProfile) {
    const analyzed = this.analyzeUserProfile(userProfile);
    let personalized = { ...scenario };

    // Voeg hints toe voor beginners
    if (analyzed.difficultyPreference === 'beginner') {
      personalized.steps = personalized.steps.map(step => ({
        ...step,
        hint: this.generateHint(step),
        showHint: false
      }));
    }

    // Voeg extra uitdagingen toe voor gevorderden
    if (analyzed.difficultyPreference === 'advanced') {
      personalized.complications = ['time_pressure'];
    }

    return personalized;
  },

  generateHint(step) {
    const hints = {
      'veiligheid': 'Denk aan de veiligheidsregel: eigen veiligheid eerst!',
      'bewustzijn': 'Probeer contact te maken voordat je verdere actie onderneemt.',
      'ademhaling': 'Kijk, luister en voel of de persoon ademt.',
      '112': 'Bij twijfel of ernstige situaties altijd professionele hulp inschakelen.'
    };

    // Simpele keyword matching voor hints
    for (const [keyword, hint] of Object.entries(hints)) {
      if (step.question.toLowerCase().includes(keyword)) {
        return hint;
      }
    }

    return 'Neem de tijd om goed na te denken over de veiligste optie.';
  }
};

// Performance Tracking - Basis versie
export const PerformanceTracker = {
  trackScenarioCompletion(userId, scenarioData, results) {
    const performance = {
      userId: userId,
      scenarioId: scenarioData.id,
      isEnhanced: scenarioData.isEnhanced || false,
      timestamp: Date.now(),
      score: this.calculateScore(results),
      adaptations: scenarioData.adaptations || {},
      timeData: this.extractTimeData(results),
      insights: this.generateBasicInsights(results)
    };

    return performance;
  },

  calculateScore(results) {
    const correctAnswers = results.filter(r => r.correct).length;
    return Math.round((correctAnswers / results.length) * 100);
  },

  extractTimeData(results) {
    return {
      totalTime: results.reduce((acc, r) => acc + (r.timeUsed || 0), 0),
      averageTime: results.reduce((acc, r) => acc + (r.timeUsed || 0), 0) / results.length,
      timeouts: results.filter(r => r.timedOut).length
    };
  },

  generateBasicInsights(results) {
    const insights = [];
    
    const score = this.calculateScore(results);
    if (score >= 90) {
      insights.push({
        type: 'success',
        message: 'Uitstekende prestatie! Je beheerst deze vaardigheden goed.',
        recommendation: 'Probeer complexere scenarios voor meer uitdaging.'
      });
    } else if (score < 60) {
      insights.push({
        type: 'improvement',
        message: 'Er is ruimte voor verbetering. Herhaling kan helpen.',
        recommendation: 'Bestudeer de uitleg bij de vragen die fout gingen.'
      });
    }

    const timeData = this.extractTimeData(results);
    if (timeData.timeouts > 0) {
      insights.push({
        type: 'time_management',
        message: 'Je had moeite met de tijdslimiet.',
        recommendation: 'Overweeg de toegankelijkheidsoptie voor meer tijd.'
      });
    }

    return insights;
  }
};

// Enhanced UI Components - Basis versie
export const EnhancedUIComponents = {
  // Resource status (vereenvoudigd)
  ResourceStatusDisplay: ({ adaptations, timeRemaining, stressLevel = 0 }) => {
    if (!adaptations.timeLimitsAdjusted && stressLevel === 0) return null;

    return (
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 mb-4 border border-purple-200">
        <h4 className="font-semibold text-purple-800 mb-3">Enhanced Mode Actief</h4>
        
        <div className="grid grid-cols-2 gap-4">
          {adaptations.timeLimitsAdjusted && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-purple-700">Tijd aangepast</span>
            </div>
          )}
          
          {timeRemaining && (
            <div className="flex items-center gap-2">
              <div className="text-lg">⏱️</div>
              <span className="text-sm font-mono text-purple-700">{timeRemaining}s</span>
            </div>
          )}
        </div>
      </div>
    );
  },

  // Prestatie insights display
  PerformanceInsights: ({ insights = [] }) => {
    if (insights.length === 0) return null;

    return (
      <div className="space-y-3 mt-4">
        <h4 className="font-semibold text-gray-800">Persoonlijke Inzichten</h4>
        {insights.map((insight, index) => (
          <div 
            key={index}
            className={`p-3 rounded-lg border-l-4 ${
              insight.type === 'success' ? 'bg-green-50 border-green-400 text-green-800' :
              insight.type === 'improvement' ? 'bg-yellow-50 border-yellow-400 text-yellow-800' :
              'bg-blue-50 border-blue-400 text-blue-800'
            }`}
          >
            <p className="font-medium text-sm">{insight.message}</p>
            <p className="text-xs mt-1 opacity-75">{insight.recommendation}</p>
          </div>
        ))}
      </div>
    );
  },

  // Hint system
  HintDisplay: ({ hint, showHint, onToggleHint }) => {
    if (!hint) return null;

    return (
      <div className="mt-4">
        <button
          onClick={onToggleHint}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          <span>💡</span>
          {showHint ? 'Verberg hint' : 'Toon hint'}
        </button>
        
        {showHint && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">{hint}</p>
          </div>
        )}
      </div>
    );
  }
};

// Main Enhanced System Controller
export const EnhancedEHBOController = {
  // Initialize enhanced mode
  async initializeEnhanced(profile) {
    const userAnalysis = AdaptiveIntelligenceSystem.analyzeUserProfile(profile);
    
    return {
      isReady: true,
      userAnalysis: userAnalysis,
      adaptiveFeatures: {
        timeAdjustment: userAnalysis.accessibilityNeeds.length > 0,
        difficultyPersonalization: true,
        hintSystem: userAnalysis.difficultyPreference === 'beginner'
      }
    };
  },

  // Process scenario for enhanced mode
  async enhanceScenario(baseScenario, profile) {
    try {
      // Stap 1: Genereer variatie
      let enhanced = ScenarioVariationGenerator.generateVariation(baseScenario, profile);
      
      // Stap 2: Voeg context toe
      enhanced = ScenarioVariationGenerator.addContextVariation(enhanced, 'school');
      
      // Stap 3: Personaliseer
      enhanced = AdaptiveIntelligenceSystem.personalizeScenario(enhanced, profile);
      
      return {
        success: true,
        scenario: enhanced,
        metadata: {
          originalId: baseScenario.id,
          enhancedId: enhanced.id,
          adaptationsApplied: enhanced.adaptations
        }
      };
    } catch (error) {
      console.error('Error enhancing scenario:', error);
      return {
        success: false,
        error: error.message,
        fallback: baseScenario // Fallback naar origineel scenario
      };
    }
  },

  // Process scenario completion
  async completeEnhancedScenario(userId, scenarioData, results) {
    try {
      const performance = PerformanceTracker.trackScenarioCompletion(userId, scenarioData, results);
      
      // Save to backend (placeholder)
      // await this.saveToBackend(performance);
      
      return {
        success: true,
        performance: performance,
        insights: performance.insights,
        recommendations: this.generateRecommendations(performance)
      };
    } catch (error) {
      console.error('Error completing enhanced scenario:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  generateRecommendations(performance) {
    const recommendations = [];
    
    if (performance.score < 70) {
      recommendations.push({
        type: 'practice',
        title: 'Extra Oefening',
        description: 'Herhaal soortgelijke scenarios om je vaardigheden te versterken.'
      });
    }
    
    if (performance.timeData.timeouts > 0) {
      recommendations.push({
        type: 'accessibility',
        title: 'Tijd Aanpassing',
        description: 'Overweeg langere tijdslimieten voor betere prestaties.'
      });
    }
    
    return recommendations;
  },

  // Check if enhanced mode should be suggested
  shouldSuggestEnhanced(profile) {
    const completedCount = (profile.completed_ehbo_scenarios || []).length;
    const averageScore = profile.ehbo_total_score / Math.max(completedCount, 1);
    
    // Stel enhanced mode voor als:
    // - Gebruiker heeft al enkele scenarios gedaan
    // - OF gebruiker heeft toegankelijkheidsbehoeften
    // - OF gebruiker presteert goed en wil meer uitdaging
    
    return (
      completedCount >= 2 ||
      profile.accessibility_needs?.length > 0 ||
      averageScore >= 80
    );
  }
};

// Export everything for easy importing
export default {
  ScenarioVariationGenerator,
  AdaptiveIntelligenceSystem,
  PerformanceTracker,
  EnhancedUIComponents,
  EnhancedEHBOController
};