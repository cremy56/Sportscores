// FASE 3: Complete Integration - Finale Componenten
// /components/EHBO/EnhancedScenarioManager.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { RoleBasedScenarios, ComplicationSystem, ScenarioChainSystem } from '../../utils/advancedEnhancedEHBO';
import { EnhancedEHBOController } from '../../utils/enhancedEHBO';

export const EnhancedScenarioManager = ({ 
  profile, 
  activeScenario, 
  setActiveScenario,
  enhancedMode,
  onScenarioComplete 
}) => {
  const [gameState, setGameState] = useState({
    role: null,
    complications: [],
    chainState: null,
    resources: { time: 100, stress: 0, effectiveness: 100 },
    dynamicEvents: []
  });

  const [showRoleIntro, setShowRoleIntro] = useState(false);
  const [showComplication, setShowComplication] = useState(null);
  const [chainProgress, setChainProgress] = useState(null);

  // Initialize enhanced scenario
  const initializeEnhancedScenario = useCallback(async (baseScenario) => {
    if (!enhancedMode) return baseScenario;

    try {
      // Step 1: Assign role
      const role = RoleBasedScenarios.assignRole(baseScenario, profile);
      
      // Step 2: Generate complications
      const complications = ComplicationSystem.generateComplications(baseScenario, profile, gameState);
      
      // Step 3: Check for scenario chains
      const shouldChain = profile.difficultyPreference === 'advanced' && Math.random() < 0.3;
      let chainState = null;
      
      if (shouldChain) {
        const chainTypes = Object.keys(ScenarioChainSystem.chains);
        const chainType = chainTypes[Math.floor(Math.random() * chainTypes.length)];
        chainState = ScenarioChainSystem.initializeChain(chainType, profile);
      }

      // Step 4: Adapt scenario
      let enhancedScenario = RoleBasedScenarios.adaptScenarioForRole(baseScenario, role);
      
      if (chainState) {
        enhancedScenario = ScenarioChainSystem.adaptScenarioBasedOnChain(enhancedScenario, chainState);
      }

      // Step 5: Update game state
      setGameState({
        role: role,
        complications: complications,
        chainState: chainState,
        resources: { 
          time: 100, 
          stress: role.stressLevel, 
          effectiveness: 100 
        },
        dynamicEvents: []
      });

      // Show role introduction
      setShowRoleIntro(true);
      
      if (chainState) {
        setChainProgress({
          current: 1,
          total: chainState.scenarios.length,
          name: chainState.name
        });
      }

      return enhancedScenario;

    } catch (error) {
      console.error('Error initializing enhanced scenario:', error);
      return baseScenario;
    }
  }, [enhancedMode, profile, gameState]);

  // Handle step completion with complications
  const handleStepCompletion = useCallback((stepResult, stepIndex) => {
    // Check if complications should trigger
    const activeComplications = gameState.complications.filter(
      comp => comp.triggerStep === stepIndex && !comp.resolved
    );

    if (activeComplications.length > 0) {
      const complication = activeComplications[0];
      const complicationEvent = ComplicationSystem.applyComplication(
        complication, 
        stepResult, 
        gameState
      );
      
      setShowComplication(complicationEvent);
      return false; // Pause scenario for complication
    }

    // Update resources based on step result
    setGameState(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        stress: Math.min(100, prev.resources.stress + (stepResult.correct ? -5 : 10)),
        effectiveness: stepResult.correct ? 
          Math.min(100, prev.resources.effectiveness + 5) :
          Math.max(0, prev.resources.effectiveness - 10)
      }
    }));

    return true; // Continue scenario
  }, [gameState]);

  // Handle complication resolution
  const handleComplicationResolution = useCallback((choice) => {
    if (!showComplication) return;

    // Apply choice effects
    const effects = choice.effect;
    setGameState(prev => ({
      ...prev,
      resources: {
        time: Math.max(0, prev.resources.time + (effects.time || 0)),
        stress: Math.max(0, Math.min(100, prev.resources.stress + (effects.stress || 0))),
        effectiveness: Math.max(0, Math.min(100, prev.resources.effectiveness + (effects.effectiveness || 0)))
      },
      complications: prev.complications.map(comp => 
        comp === showComplication.complication ? { ...comp, resolved: true } : comp
      )
    }));

    setShowComplication(null);
  }, [showComplication]);

  // Handle scenario chain progression
  const handleChainProgression = useCallback(async (scenarioResult) => {
    if (!gameState.chainState) return null;

    const nextChainStep = ScenarioChainSystem.getNextScenario(gameState.chainState, scenarioResult);
    
    if (nextChainStep && nextChainStep.nextScenarioId) {
      // Load next scenario in chain
      const nextScenario = await loadScenarioById(nextChainStep.nextScenarioId);
      if (nextScenario) {
        const adaptedNext = ScenarioChainSystem.adaptScenarioBasedOnChain(nextScenario, gameState.chainState);
        
        setChainProgress({
          current: nextChainStep.chainProgress.current,
          total: nextChainStep.chainProgress.total,
          name: gameState.chainState.name
        });

        return adaptedNext;
      }
    } else {
      // Chain complete
      setChainProgress(null);
      return null;
    }
  }, [gameState.chainState]);

  // Helper function to load scenario by ID (implement based on your data structure)
  const loadScenarioById = async (scenarioId) => {
    // This would fetch from your scenarios data
    // For now, return null to indicate not implemented
    return null;
  };

  return {
    gameState,
    showRoleIntro,
    setShowRoleIntro,
    showComplication,
    chainProgress,
    initializeEnhancedScenario,
    handleStepCompletion,
    handleComplicationResolution,
    handleChainProgression
  };
};

// Enhanced UI Components voor Fase 3
export const Phase3UIComponents = {
  // Role Introduction Modal
  RoleIntroduction: ({ role, onContinue, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-lg mx-4">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎭</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Je Rol in dit Scenario</h2>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-semibold text-purple-700 mb-2">{role.name}</h3>
          <p className="text-gray-600 mb-4">{role.description}</p>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="font-semibold text-purple-800 mb-2">Je Verantwoordelijkheden:</h4>
            <ul className="text-sm text-purple-700 space-y-1">
              {role.responsibilities.map((resp, index) => (
                <li key={index}>• {resp}</li>
              ))}
            </ul>
          </div>

          {role.challenges.length > 0 && (
            <div className="bg-orange-50 rounded-lg p-4 mt-3">
              <h4 className="font-semibold text-orange-800 mb-2">Extra Uitdagingen:</h4>
              <ul className="text-sm text-orange-700 space-y-1">
                {role.challenges.map((challenge, index) => (
                  <li key={index}>• {challenge}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onContinue}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
          >
            Start Scenario
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Annuleren
          </button>
        </div>
      </div>
    </div>
  ),

  // Complication Modal
  ComplicationModal: ({ complication, onChoose, onSkip }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-800">{complication.complication.name}</h3>
            <p className="text-sm text-red-600">Nieuwe complicatie</p>
          </div>
        </div>
        
        <p className="text-gray-700 mb-6">{complication.description}</p>
        
        <div className="space-y-3 mb-6">
          <h4 className="font-semibold text-gray-800">Hoe ga je hiermee om?</h4>
          {complication.choices.map((choice, index) => (
            <button
              key={index}
              onClick={() => onChoose(choice)}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              <span className="font-medium">{choice.text}</span>
              {choice.effect && (
                <div className="text-xs text-gray-500 mt-1">
                  Effect: {Object.entries(choice.effect).map(([key, value]) => 
                    `${key}: ${value > 0 ? '+' : ''}${value}`
                  ).join(', ')}
                </div>
              )}
            </button>
          ))}
        </div>
        
        <button
          onClick={onSkip}
          className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
        >
          Negeren (niet aanbevolen)
        </button>
      </div>
    </div>
  ),

  // Enhanced Resource Display
  EnhancedResourceDisplay: ({ resources, role, complications }) => (
    <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-800">Status Dashboard</h4>
        <div className="text-sm text-gray-600">
          {role?.name && `Rol: ${role.name}`}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${
            resources.stress < 30 ? 'bg-green-100 text-green-600' :
            resources.stress < 70 ? 'bg-yellow-100 text-yellow-600' :
            'bg-red-100 text-red-600'
          }`}>
            💭
          </div>
          <div className="text-sm font-medium">Stress</div>
          <div className={`text-xs ${
            resources.stress < 30 ? 'text-green-600' :
            resources.stress < 70 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {resources.stress}%
          </div>
        </div>

        <div className="text-center">
          <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${
            resources.effectiveness > 70 ? 'bg-green-100 text-green-600' :
            resources.effectiveness > 40 ? 'bg-yellow-100 text-yellow-600' :
            'bg-red-100 text-red-600'
          }`}>
            ⚡
          </div>
          <div className="text-sm font-medium">Effectiviteit</div>
          <div className={`text-xs ${
            resources.effectiveness > 70 ? 'text-green-600' :
            resources.effectiveness > 40 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {resources.effectiveness}%
          </div>
        </div>

        <div className="text-center">
          <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${
            resources.time > 70 ? 'bg-green-100 text-green-600' :
            resources.time > 30 ? 'bg-yellow-100 text-yellow-600' :
            'bg-red-100 text-red-600'
          }`}>
            ⏱️
          </div>
          <div className="text-sm font-medium">Tijd</div>
          <div className={`text-xs ${
            resources.time > 70 ? 'text-green-600' :
            resources.time > 30 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {resources.time}%
          </div>
        </div>
      </div>

      {complications && complications.length > 0 && (
        <div className="border-t border-gray-200 pt-3">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Actieve Complicaties:</h5>
          <div className="flex flex-wrap gap-2">
            {complications.filter(c => !c.resolved).map((comp, index) => (
              <span key={index} className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded">
                {comp.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  ),

  // Chain Progress Display
  ChainProgressDisplay: ({ chainProgress }) => {
    if (!chainProgress) return null;

    return (
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold">Scenario Ketting</h4>
          <span className="text-sm opacity-90">
            {chainProgress.current}/{chainProgress.total}
          </span>
        </div>
        
        <h5 className="text-lg mb-3">{chainProgress.name}</h5>
        
        <div className="w-full bg-white/20 rounded-full h-2">
          <div 
            className="bg-white rounded-full h-2 transition-all duration-500"
            style={{ width: `${(chainProgress.current / chainProgress.total) * 100}%` }}
          />
        </div>
        
        <p className="text-sm opacity-90 mt-2">
          Je acties in dit scenario beïnvloeden wat er hierna gebeurt
        </p>
      </div>
    );
  },

  // Enhanced Results Display
  EnhancedResults: ({ results, role, gameState, chainComplete = false }) => (
    <div className="space-y-6">
      {/* Standard Results */}
      <div className="text-center">
        <div className="text-6xl mb-4">
          {results.score >= 80 ? '🏆' : results.score >= 60 ? '🥉' : '📚'}
        </div>
        <h3 className="text-2xl font-bold mb-2">
          {chainComplete ? 'Scenario Ketting Voltooid!' : 'Scenario Voltooid!'}
        </h3>
        <p className="text-gray-600 mb-4">
          Jouw score: <span className="font-bold text-2xl text-blue-600">{results.score}%</span>
        </p>
      </div>

      {/* Role Performance */}
      {role && (
        <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
          <h4 className="text-lg font-bold text-purple-800 mb-4">Rol Prestatie: {role.name}</h4>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <h5 className="font-semibold text-purple-700 mb-2">Sterk Punten:</h5>
              <ul className="text-sm text-purple-600 space-y-1">
                <li>✓ Situatie beoordeeld volgens rol</li>
                <li>✓ Verantwoordelijkheden erkend</li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-semibold text-purple-700 mb-2">Verbeterpunten:</h5>
              <ul className="text-sm text-purple-600 space-y-1">
                <li>• Rol-specifieke training</li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-lg p-3">
            <h6 className="font-medium text-purple-800 mb-2">Rol Impact Score:</h6>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-purple-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 rounded-full h-2 transition-all duration-500"
                  style={{ width: `${Math.min(100, (results.score + (gameState.resources.effectiveness - 50)) / 1.5)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-purple-700">
                {Math.round(Math.min(100, (results.score + (gameState.resources.effectiveness - 50)) / 1.5))}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Resource Final State */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h4 className="text-lg font-bold text-gray-800 mb-4">Finale Status</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-700">{100 - gameState.resources.stress}%</div>
            <div className="text-sm text-gray-600">Kalmte Behoud</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-700">{gameState.resources.effectiveness}%</div>
            <div className="text-sm text-gray-600">Effectiviteit</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-700">{gameState.resources.time}%</div>
            <div className="text-sm text-gray-600">Tijd Management</div>
          </div>
        </div>
      </div>
    </div>
  )
};

export default Phase3UIComponents;