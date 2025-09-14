// FASE 2: Geavanceerde Adaptive Features
// /utils/advancedEnhancedEHBO.js

import { EnhancedEHBOController } from './enhancedEHBO';

// Role-based Scenario Generator
export const RoleBasedScenarios = {
  roles: {
    first_responder: {
      name: 'Eerste Hulpverlener',
      description: 'Je bent de eerste ter plaatse en moet de leiding nemen',
      stressLevel: 20,
      responsibilities: ['situatie beoordelen', 'hulp coördineren', 'beslissingen nemen'],
      challenges: ['leiderschap', 'snelle beslissingen', 'anderen instrueren']
    },
    bystander: {
      name: 'Omstander',
      description: 'Je ziet het gebeuren en moet beslissen of en hoe je helpt',
      stressLevel: 15,
      responsibilities: ['assisteren', '112 bellen', 'ruimte maken'],
      challenges: ['wanneer ingrijpen', 'hoe helpen zonder hinderen']
    },
    family_member: {
      name: 'Familielid',
      description: 'Het slachtoffer is iemand die je kent - je broer, zus of vriend',
      stressLevel: 35,
      responsibilities: ['emoties beheersen', 'nuttige info geven', 'praktisch helpen'],
      challenges: ['objectief blijven', 'paniek onderdrukken', 'rationeel denken']
    },
    school_staff: {
      name: 'Schoolpersoneel',
      description: 'Je bent verantwoordelijk voor de veiligheid van leerlingen',
      stressLevel: 25,
      responsibilities: ['leerlingen kalmeren', 'ouders contacteren', 'protocol volgen'],
      challenges: ['meerdere leerlingen', 'ouders informeren', 'school procedures']
    }
  },

  assignRole(scenario, userProfile) {
    // Bepaal rol gebaseerd op gebruikersprofiel en scenario type
    const difficulty = userProfile.difficultyPreference || 'beginner';
    
    const random = Math.random();
  
  if (difficulty === 'beginner') {
    return random > 0.6 ? this.roles.bystander : 
           random > 0.3 ? this.roles.first_responder : this.roles.school_staff;
  } else if (difficulty === 'intermediate') {
    const options = [this.roles.first_responder, this.roles.bystander, this.roles.school_staff];
    return options[Math.floor(Math.random() * options.length)];
  } else {
    // Advanced users get all roles including challenging ones
    const allRoles = Object.values(this.roles);
    return allRoles[Math.floor(Math.random() * allRoles.length)];
  }
},

  adaptScenarioForRole(scenario, role) {
    return {
      ...scenario,
      role: role,
      initialStress: role.stressLevel,
      steps: scenario.steps.map(step => this.adaptStepForRole(step, role)),
      roleSpecificChallenges: this.generateRoleChallenges(scenario, role)
    };
  },

  adaptStepForRole(step, role) {
    let adaptedQuestion = step.question;
    
    // Voeg rol-context toe aan vragen
    if (role.name === 'family_member') {
      adaptedQuestion = adaptedQuestion.replace(/iemand|persoon/g, 'je broer/zus');
    } else if (role.name === 'school_staff') {
      adaptedQuestion = adaptedQuestion.replace(/iemand|persoon/g, 'een leerling');
    }

    // Voeg rol-specifieke overwegingen toe
    const roleConsiderations = this.getRoleConsiderations(step, role);

    return {
      ...step,
      question: adaptedQuestion,
      roleContext: `Als ${role.name}: ${role.description}`,
      roleConsiderations: roleConsiderations,
      options: step.options.map(option => ({
        ...option,
        roleImpact: this.calculateRoleImpact(option, role)
      }))
    };
  },

  getRoleConsiderations(step, role) {
    const considerations = {
      family_member: [
        'Hoe beheer je je emoties?',
        'Welke informatie kun je geven over medische geschiedenis?',
        'Hoe blijf je objectief?'
      ],
      school_staff: [
        'Hoe voorkom je paniek bij andere leerlingen?',
        'Welke procedures moet je volgen?',
        'Wie moet je informeren?'
      ],
      first_responder: [
        'Hoe neem je de leiding?',
        'Hoe delegeer je taken?',
        'Hoe prioriteer je acties?'
      ],
      bystander: [
        'Wanneer moet je ingrijpen?',
        'Hoe help je zonder te hinderen?',
        'Wat is je rol versus professionals?'
      ]
    };

    return considerations[role.name] || [];
  },

  calculateRoleImpact(option, role) {
    // Bepaal hoe een keuze de rol beïnvloedt
    const impacts = {
      stress: 0,
      authority: 0,
      effectiveness: 0
    };

    if (role.name === 'family_member' && option.text.includes('kalm')) {
      impacts.stress = -10; // Kalmte vermindert stress
    }

    if (role.name === 'first_responder' && option.text.includes('instructie')) {
      impacts.authority = 5; // Instructies geven verhoogt autoriteit
    }

    return impacts;
  },

  generateRoleChallenges(scenario, role) {
    const baseChallenges = [];
    
    switch (role.name) {
      case 'family_member':
        baseChallenges.push({
          type: 'emotional',
          description: 'Je ziet je broer/zus in nood - dit is emotioneel zwaar',
          effect: 'stress_increase',
          solution: 'Probeer objectief te blijven en focus op wat hij/zij nodig heeft'
        });
        break;
        
      case 'school_staff':
        baseChallenges.push({
          type: 'responsibility',
          description: 'Andere leerlingen kijken naar je voor leiderschap',
          effect: 'pressure_increase',
          solution: 'Verdeel taken: laat sommige leerlingen hulp halen terwijl jij helpt'
        });
        break;
        
      case 'first_responder':
        baseChallenges.push({
          type: 'leadership',
          description: 'Mensen verwachten dat jij de leiding neemt',
          effect: 'decision_pressure',
          solution: 'Neem snelle beslissingen en communiceer duidelijk wat iedereen moet doen'
        });
        break;
    }

    return baseChallenges;
  }
};

// Dynamic Complications System
export const ComplicationSystem = {
  complications: {
    environmental: {
      'bad_weather': {
        name: 'Slecht Weer',
        description: 'Het begint hard te regenen en wordt glad',
        effects: ['visibility_reduced', 'slippery_surface', 'hypothermia_risk'],
        adaptations: ['seek_shelter', 'extra_caution', 'speed_up_response'],
        probability: 0.2
      },
      'crowded_area': {
        name: 'Drukke Omgeving',
        description: 'Er verzamelt zich een menigte nieuwsgierigen',
        effects: ['space_limited', 'distractions', 'privacy_concerns'],
        adaptations: ['crowd_control', 'designate_helper', 'create_space'],
        probability: 0.3
      },
      'poor_lighting': {
        name: 'Slechte Verlichting',
        description: 'Het is donker en moeilijk om alles goed te zien',
        effects: ['assessment_difficult', 'increased_danger', 'communication_harder'],
        adaptations: ['use_phone_light', 'feel_carefully', 'ask_for_light'],
        probability: 0.15
      }
    },
    
    social: {
      'panic_bystanders': {
        name: 'Paniek bij Omstanders',
        description: 'Mensen om je heen raken in paniek en geven tegenstrijdige adviezen',
        effects: ['confusion', 'stress_increase', 'wrong_information'],
        adaptations: ['take_control', 'assign_tasks', 'ignore_bad_advice'],
        probability: 0.25
      },
      'language_barrier': {
        name: 'Taalbarrière',
        description: 'Het slachtoffer spreekt geen Nederlands',
        effects: ['communication_difficult', 'medical_history_unknown', 'instruction_problems'],
        adaptations: ['use_gestures', 'find_translator', 'basic_words'],
        probability: 0.1
      },
      'aggressive_family': {
        name: 'Emotionele Familie',
        description: 'Familie van het slachtoffer arriveert en is erg emotioneel',
        effects: ['interference', 'emotional_pressure', 'blame_assignment'],
        adaptations: ['calm_family', 'explain_actions', 'set_boundaries'],
        probability: 0.2
      }
    },

    medical: {
      'multiple_injuries': {
        name: 'Meerdere Verwondingen',
        description: 'Het slachtoffer blijkt meerdere verwondingen te hebben',
        effects: ['priority_decisions', 'complexity_increase', 'time_pressure'],
        adaptations: ['triage_principles', 'treat_life_threatening_first', 'systematic_approach'],
        probability: 0.15
      },
      'medical_complications': {
        name: 'Medische Complicaties',
        description: 'Het slachtoffer heeft diabetes/hartproblemen/andere medische geschiedenis',
        effects: ['treatment_modifications', 'medication_concerns', 'specialist_knowledge_needed'],
        adaptations: ['ask_about_medication', 'inform_112', 'monitor_closely'],
        probability: 0.2
      },
      'allergic_reaction': {
        name: 'Allergische Reactie',
        description: 'Het slachtoffer krijgt een allergische reactie',
        effects: ['escalation', 'breathing_problems', 'emergency_medication_needed'],
        adaptations: ['check_for_epipen', 'position_for_breathing', 'urgent_112'],
        probability: 0.1
      }
    },

    resource: {
      'limited_supplies': {
        name: 'Beperkte Materialen',
        description: 'De EHBO-doos is bijna leeg of niet beschikbaar',
        effects: ['improvisation_needed', 'effectiveness_reduced', 'creativity_required'],
        adaptations: ['use_alternatives', 'ask_for_materials', 'improvise_with_clothing'],
        probability: 0.2
      },
      'no_phone_signal': {
        name: 'Geen Telefoonsignaal',
        description: 'Je telefoon heeft geen bereik om 112 te bellen',
        effects: ['communication_blocked', 'isolation', 'self_reliance_needed'],
        adaptations: ['send_someone_for_help', 'move_to_signal', 'continue_treatment'],
        probability: 0.15
      },
      'transport_issues': {
        name: 'Transport Problemen',
        description: 'Ambulance heeft moeite om de locatie te bereiken',
        effects: ['extended_wait_time', 'continued_care_needed', 'evacuation_consideration'],
        adaptations: ['prepare_for_long_wait', 'consider_alternative_transport', 'continuous_monitoring'],
        probability: 0.1
      }
    }
  },

  generateComplications(scenario, userProfile, gameState) {
    const availableComplications = [];
    
    // Bepaal welke complicaties mogelijk zijn
    Object.values(this.complications).forEach(category => {
      Object.values(category).forEach(complication => {
        if (this.shouldApplyComplication(complication, scenario, userProfile, gameState)) {
          availableComplications.push(complication);
        }
      });
    });

    // Selecteer 0-2 complicaties gebaseerd op moeilijkheidsgraad
    const maxComplications = userProfile.difficultyPreference === 'advanced' ? 2 : 
                             userProfile.difficultyPreference === 'intermediate' ? 1 : 0;
    
    const selectedComplications = this.selectRandomComplications(availableComplications, maxComplications);
    
    return selectedComplications.map(comp => ({
      ...comp,
      triggerStep: Math.floor(Math.random() * scenario.steps.length),
      resolved: false
    }));
  },

  shouldApplyComplication(complication, scenario, userProfile, gameState) {
    // Check probability
    if (Math.random() > complication.probability) return false;
    
    // Check user level
    if (userProfile.difficultyPreference === 'beginner' && complication.probability < 0.2) {
      return false;
    }
    
    // Check scenario compatibility
    if (scenario.context === 'indoor' && complication.name === 'Slecht Weer') {
      return false;
    }
    
    return true;
  },

  selectRandomComplications(complications, maxCount) {
    return complications
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.min(maxCount, complications.length));
  },

  applyComplication(complication, currentStep, gameState) {
    const complicationEvent = {
      type: 'complication',
      complication: complication,
      description: complication.description,
      effects: complication.effects,
      choices: complication.adaptations.map(adaptation => ({
        text: this.getAdaptationText(adaptation),
        adaptation: adaptation,
        effect: this.getAdaptationEffect(adaptation, complication)
      }))
    };

    return complicationEvent;
  },

  getAdaptationText(adaptation) {
    const adaptationTexts = {
      'seek_shelter': 'Zoek beschutting voor jezelf en het slachtoffer',
      'crowd_control': 'Vraag iemand om de menigte op afstand te houden',
      'take_control': 'Neem duidelijk de leiding en negeer paniek',
      'use_phone_light': 'Gebruik je telefoon als zaklamp',
      'improvise_with_clothing': 'Gebruik kleding als verband of steun',
      'send_someone_for_help': 'Stuur iemand anders om hulp te halen'
    };
    
    return adaptationTexts[adaptation] || `Pas je aan voor: ${adaptation}`;
  },

  getAdaptationEffect(adaptation, complication) {
    // Bepaal effect van adaptatie op game state
    const effects = {
      stress: 0,
      time: 0,
      effectiveness: 0,
      resources: 0
    };

    if (adaptation === 'seek_shelter') {
      effects.time = -5; // Kost tijd
      effects.effectiveness = 10; // Maar verhoogt effectiviteit
    }

    if (adaptation === 'improvise_with_clothing') {
      effects.resources = -10; // Minder perfect materiaal
      effects.effectiveness = 5; // Maar nog steeds effectief
    }

    return effects;
  }
};

// Scenario Chain System - Enhanced
export const ScenarioChainSystem = {
  chains: {
    school_sports_injury: {
      name: 'Sportongeval op School',
      description: 'Een reeks gebeurtenissen tijdens de gymles',
      scenarios: [
        {
          id: 'initial_fall',
          type: 'sprain',
          description: 'Leerling valt tijdens voetbal en verstuikt enkel',
          triggerNext: 'pain_assessment'
        },
        {
          id: 'pain_assessment', 
          type: 'assessment',
          description: 'Bij nader onderzoek lijkt er meer aan de hand',
          triggerNext: (result) => result.score < 70 ? 'complications' : 'recovery'
        },
        {
          id: 'complications',
          type: 'multiple_injury',
          description: 'Leerling heeft ook hoofdpijn - mogelijk hersenschudding',
          triggerNext: 'emergency_response'
        },
        {
          id: 'emergency_response',
          type: 'coordination',
          description: 'Coördineer met school, ouders en ambulance',
          triggerNext: null
        }
      ]
    },

    kitchen_accident: {
      name: 'Keukenongeval',
      description: 'Escalerende situatie in de keuken',
      scenarios: [
        {
          id: 'burn_incident',
          type: 'burn',
          description: 'Iemand verbrandt zich aan kokend water',
          triggerNext: 'assessment'
        },
        {
          id: 'assessment',
          type: 'burn_assessment', 
          description: 'Beoordeel de ernst van de brandwond',
          triggerNext: (result) => result.severity === 'severe' ? 'shock_management' : 'basic_care'
        },
        {
          id: 'shock_management',
          type: 'shock',
          description: 'Slachtoffer raakt in shock door pijn en stress',
          triggerNext: 'family_communication'
        },
        {
          id: 'family_communication',
          type: 'communication',
          description: 'Familie arriveert in paniek - communiceer effectief',
          triggerNext: null
        }
      ]
    }
  },

  initializeChain(chainType, userProfile) {
    const chain = this.chains[chainType];
    if (!chain) return null;

    return {
      chainType: chainType,
      name: chain.name,
      description: chain.description,
      currentScenario: 0,
      scenarios: chain.scenarios,
      results: [],
      isComplete: false
    };
  },

getNextScenario(chainState, previousResult = null) {
  if (chainState.isComplete || chainState.currentScenario >= chainState.scenarios.length) {
    return null;
  }

  const currentScenario = chainState.scenarios[chainState.currentScenario];
  
  // Bepaal volgend scenario gebaseerd op prestatie
  let nextScenarioId = null;
  if (typeof currentScenario.triggerNext === 'function') {
    nextScenarioId = currentScenario.triggerNext(previousResult);
  } else {
    nextScenarioId = currentScenario.triggerNext;
  }

  // Update chain state
  chainState.currentScenario++;
  if (previousResult) {
    chainState.results.push(previousResult);
  }

  if (!nextScenarioId) {
    chainState.isComplete = true;
  }

  return {
    scenario: currentScenario,
    nextScenarioId: nextScenarioId,
    chainProgress: {
      current: chainState.currentScenario,
      total: chainState.scenarios.length,
      completion: (chainState.currentScenario / chainState.scenarios.length) * 100
    }
  };
},

  adaptScenarioBasedOnChain(scenario, chainState) {
    // Pas scenario aan gebaseerd op eerdere resultaten in de ketting
    const adaptedScenario = { ...scenario };
    
    if (chainState.results.length > 0) {
      const previousResults = chainState.results;
      const averageScore = previousResults.reduce((acc, r) => acc + r.score, 0) / previousResults.length;
      
      // Als eerdere prestaties slecht waren, voeg hints toe
      if (averageScore < 60) {
        adaptedScenario.helpLevel = 'high';
        adaptedScenario.steps = adaptedScenario.steps.map(step => ({
          ...step,
          hint: `Gebaseerd op de vorige stappen: ${this.generateChainHint(step, chainState)}`
        }));
      }
      
      // Als prestaties goed waren, voeg complicaties toe
      if (averageScore > 80) {
        adaptedScenario.complications = ['time_pressure', 'additional_factors'];
      }
    }

    // Voeg ketting-context toe
    adaptedScenario.chainContext = {
      name: chainState.name,
      step: chainState.currentScenario + 1,
      total: chainState.scenarios.length,
      previousEvents: this.summarizePreviousEvents(chainState.results)
    };

    return adaptedScenario;
  },

  generateChainHint(step, chainState) {
    const hints = {
      'assessment': 'Denk terug aan wat je hebt geleerd uit de vorige situatie',
      'communication': 'Gebruik je ervaring om duidelijk te communiceren',
      'coordination': 'Organiseer je acties zoals je eerder hebt gedaan'
    };
    
    return hints[step.type] || 'Bouw voort op je eerdere ervaring';
  },

  summarizePreviousEvents(results) {
    return results.map((result, index) => ({
      step: index + 1,
      score: result.score,
      keyLearnings: result.keyLearnings || [],
      decisions: result.majorDecisions || []
    }));
  }
};

// Export all Phase 2 components
export default {
  RoleBasedScenarios,
  ComplicationSystem,
  ScenarioChainSystem
};