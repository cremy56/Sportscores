import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowLeftIcon, PlayIcon, PauseIcon, CheckIcon, XMarkIcon, ClockIcon, PhoneIcon, MapPinIcon, ExclamationTriangleIcon, AcademicCapIcon, TrophyIcon, StarIcon } from '@heroicons/react/24/outline';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useEnhancedScenario, useAdaptiveAnalysis, useAccessibilityFeatures } from '../hooks/useEnhancedEHBO';
import { EnhancedUIComponents } from '../utils/enhancedEHBO.jsx';
import { RoleBasedScenarios, ComplicationSystem } from '../utils/advancedEnhancedEHBO';
import { Phase3UIComponents } from '../components/EHBO/EnhancedScenarioManager';

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const EHBODetail = () => {
  const { profile } = useOutletContext();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeScenario, setActiveScenario] = useState(null);
 

  const [userProgress, setUserProgress] = useState({
    completedScenarios: [],
    certificates: [],
    totalScore: 0,
    streak: 0
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [scenarioResults, setScenarioResults] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);

  const [gameState, setGameState] = useState({
  role: null,
  complications: [],
  resources: { time: 100, stress: 0, effectiveness: 100 }
});
const [showRoleIntro, setShowRoleIntro] = useState(false);
const [showComplication, setShowComplication] = useState(null);
const [activeChain, setActiveChain] = useState(null);
const [chainProgress, setChainProgress] = useState(null);
// NIEUW: Enhanced hooks toevoegen
  const {
    enhancedMode,
    setEnhancedMode,
    enhancedScenario,
    startEnhancedScenario,
    completeEnhancedScenario,
    toggleHint,
    showHints,
    insights,
    isEnhanced
  } = useEnhancedScenario(profile);

  const {
    userAnalysis,
    shouldShowTimeAdjustment,
    shouldShowHints
  } = useAdaptiveAnalysis(profile);

  const {
    accessibilityMode,
    setAccessibilityMode,
    features: accessibilityFeatures
  } = useAccessibilityFeatures(profile);

  // Dit blok laadt de opgeslagen voortgang wanneer de component laadt
   useEffect(() => {
    if (!profile?.id) return;

    // Luister direct naar wijzigingen in het gebruikersdocument
    const userRef = doc(db, 'users', profile.id);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setUserProgress({
          completedScenarios: userData.completed_ehbo_scenarios || [],
          certificates: [], // Logica voor certificaten nog te implementeren
          totalScore: userData.ehbo_total_score || 0,
          streak: userData.ehbo_streak || 0
        });
      }
    });

    // Stop de listener wanneer de component wordt verlaten
    return () => unsubscribe();
    
  }, [profile?.id]);
  
  // Scenario data - Uitgebreid met meer leerplandoel-relevante scenario's
 const scenarios = [
   
    // --- SCENARIO 1: BEWUSTELOOS ---
    {
      id: 'bewusteloos',
      title: 'Bewusteloze persoon',
      difficulty: 'Gemiddeld',
      duration: '3-4 min',
      description: 'Je vindt iemand bewusteloos op de grond',
      image: '🚨',
      color: 'red',
      steps: [
        { 
          id: 1, 
          question: 'Je ziet een persoon roerloos op de grond liggen. Wat doe je EERST?', 
          options: [
            { id: 'b', text: 'Controleren of de omgeving veilig is', correct: true, feedback: 'Correct! Eigen veiligheid eerst.', nextStepId: 2 },
            { id: 'a', text: 'Schudden aan de persoon', correct: false, feedback: 'Voorzichtig! Eerst zorgen voor je eigen veiligheid.', nextStepId: '1_consequence' },
            { id: 'c', text: 'Meteen 112 bellen', correct: false, feedback: 'Te vroeg. Eerst de situatie inschatten.', nextStepId: 2 },
            { id: 'd', text: 'Naar ademhaling luisteren', correct: false, feedback: 'Eerst veiligheid controleren.', nextStepId: '1_consequence' }
          ], 
          timeLimit: 15, 
          explanation: 'Bij elke noodsituatie geldt: EIGEN VEILIGHEID EERST.' 
        },
        {
          id: '1_consequence',
          question: 'Je bent te snel naar het slachtoffer gegaan. In je haast struikel je over een losliggende kabel en val je zelf. De situatie is nu complexer. Wat had je moeten doen?',
          options: [ { id: 'a', text: 'Eerst de omgeving controleren op gevaren', correct: true, feedback: 'Precies. Laten we opnieuw beginnen, met veiligheid als prioriteit.', nextStepId: 2 } ],
          timeLimit: 10,
          explanation: 'Een onveilige omgeving kan van één slachtoffer twee maken. Controleer altijd eerst op gevaren.'
        },
        { 
          id: 2, 
          question: 'De omgeving is veilig. De persoon reageert niet op aanspreken. Wat nu?', 
          options: [
            { id: 'a', text: 'Voorzichtig schudden aan de schouders en luid roepen', correct: true, feedback: 'Correct! Probeer bewustzijn te controleren.', nextStepId: 3 },
            { id: 'b', text: 'Meteen beginnen met hartmassage', correct: false, feedback: 'Te vroeg! Controleer eerst de ademhaling.', nextStepId: '2_consequence' },
            { id: 'c', text: 'In stabiele zijligging leggen', correct: false, feedback: 'Eerst de ademhaling controleren.', nextStepId: 3 }
          ], 
          timeLimit: 10, 
          explanation: 'Controleer het bewustzijn door aan te spreken en zachtjes aan de schouders te schudden.' 
        },
        {
          id: '2_consequence',
          question: 'Je bent onnodig met hartmassage begonnen. Het slachtoffer kreunt en reageert met pijn. Je hebt een cruciale stap overgeslagen. Wat doe je nu om je fout te herstellen?',
          options: [ { id: 'a', text: 'Stoppen en de ademhaling opnieuw controleren', correct: true, feedback: 'Correct. Herken je fout en ga terug naar de basis: controleer de vitale functies.', nextStepId: 3 } ],
          timeLimit: 15,
          explanation: 'Een fout maken kan gebeuren. Het is cruciaal om de fout te herkennen, te stoppen en de juiste procedure te hervatten.'
        },
        { 
          id: 3, 
          question: 'Geen reactie. Je controleert de ademhaling. De persoon ademt normaal. Wat doe je?', 
          options: [
            { id: 'b', text: 'In stabiele zijligging leggen en 112 bellen', correct: true, feedback: 'Perfect! Stabiele zijligging voorkomt verstikking.', nextStepId: null },
            { id: 'a', text: 'Laten liggen en 112 bellen', correct: false, feedback: 'Risico op verstikking door tong of braaksel!', nextStepId: '3b_consequence' }
          ], 
          timeLimit: 12, 
          explanation: 'Een bewusteloos slachtoffer dat normaal ademt, moet in stabiele zijligging worden gelegd om de luchtweg vrij te houden.' 
        },
        {
            id: '3b_consequence',
            question: 'Terwijl je aan de telefoon bent met 112, hoor je een rochelend geluid. De luchtweg van het slachtoffer is geblokkeerd door de tong. Wat had je moeten doen om dit te voorkomen?',
            options: [ { id: 'a', text: 'De persoon in stabiele zijligging leggen', correct: true, feedback: 'Inderdaad. Deze houding houdt de luchtweg vrij. Laten we het scenario afronden.', nextStepId: null } ],
            timeLimit: 10,
            explanation: 'De stabiele zijligging is een cruciale, levensreddende handeling bij een bewusteloos slachtoffer dat nog ademt.'
        }
      ]
    },
    // --- SCENARIO 2: VERSLIKKING ---
    {
      id: 'choking',
      title: 'Verslikking',
      difficulty: 'Makkelijk',
      duration: '2-3 min',
      description: 'Iemand versikt zich en kan niet meer ademen',
      image: '🫁',
      color: 'orange',
      steps: [
        { 
          id: 1, 
          question: 'Iemand houdt zijn keel vast en kan geen geluid maken. Wat betekent dit?', 
          options: [
            { id: 'b', text: 'Totale verslikking - luchtwegen zijn geblokkeerd', correct: true, feedback: 'Correct! Geen geluid = complete blokkering!', nextStepId: 2 },
            { id: 'd', text: 'Geef wat water te drinken', correct: false, feedback: 'Gevaarlijk! Water kan de blokkade erger maken.', nextStepId: '1_consequence' }
          ], 
          timeLimit: 8, 
          explanation: 'Universeel teken van verslikking: handen aan de keel, geen geluid kunnen maken.' 
        },
        {
          id: '1_consequence',
          question: 'Je geeft water, maar het slachtoffer verslikt zich nog erger en begint in paniek te raken. Het water blokkeert de luchtweg verder. Wat had je moeten doen?',
          options: [ { id: 'a', text: '5 klappen tussen de schouderbladen geven', correct: true, feedback: 'Juist, dat is de eerste stap.', nextStepId: 2 } ],
          timeLimit: 10,
          explanation: 'Geef nooit drinken bij een verslikking. De eerste stap is altijd rugklappen.'
        },
        { 
          id: 2, 
          question: 'De persoon staat nog rechtop maar kan niet ademen. Wat doe je?', 
          options: [
            { id: 'a', text: '5 ferme klappen tussen de schouderbladen', correct: true, feedback: 'Juist! Begin altijd met rugklappen.', nextStepId: 3 },
            { id: 'b', text: 'Meteen de Heimlich manoeuvre', correct: false, feedback: 'Eerst proberen met rugklappen.', nextStepId: '2_consequence' }
          ], 
          timeLimit: 10, 
          explanation: 'Bij een staande, bewuste persoon: begin met 5 ferme klappen tussen de schouderbladen.' 
        },
        {
            id: '2_consequence',
            question: 'Je past de Heimlich manoeuvre toe, maar het protocol schrijft voor om eerst met de minder ingrijpende techniek te beginnen. Welke techniek is dat?',
            options: [ { id: 'a', text: 'Rugklappen', correct: true, feedback: 'Inderdaad. Hoewel je keuze effectief kan zijn, volgen we de richtlijnen.', nextStepId: 3 } ],
            timeLimit: 10,
            explanation: 'De officiële richtlijn is: eerst 5 rugklappen, en als dat niet werkt, dan pas 5 buikstoten (Heimlich).'
        },
        { 
          id: 3, 
          question: 'Rugklappen helpen niet. De persoon wordt blauw. Nu?', 
          options: [
            { id: 'b', text: 'Heimlich manoeuvre (buikstoten)', correct: true, feedback: 'Correct! Dit is de volgende stap als rugklappen falen.', nextStepId: null },
            { id: 'a', text: 'Blijven proberen met rugklappen', correct: false, feedback: 'Je ziet dat het niet werkt, je moet escaleren naar de volgende techniek.', nextStepId: '3_consequence' }
          ], 
          timeLimit: 15, 
          explanation: 'Als rugklappen niet werken, pas je 5 buikstoten toe (Heimlich manoeuvre).' 
        },
        {
            id: '3_consequence',
            question: 'Je blijft rugklappen geven zonder succes. De persoon verliest het bewustzijn en zakt op de grond. Wat doe je nu?',
            options: [ { id: 'a', text: 'Start de reanimatie en bel 112', correct: true, feedback: 'Correct. Een bewusteloos slachtoffer met geblokkeerde luchtweg behandel je als een reanimatie.', nextStepId: null } ],
            timeLimit: 10,
            explanation: 'Als een slachtoffer van verslikking het bewustzijn verliest, alarmeer je onmiddellijk 112 en start je de reanimatie.'
        }
      ]
    },
   {
      id: 'hartaanval',
      title: 'Hartaanval',
      difficulty: 'Moeilijk',
      duration: '4-5 min',
      description: 'Persoon heeft pijn op de borst en wordt onwel',
      image: '💔',
      color: 'red',
      steps: [
        { 
          id: 1, 
          question: 'Een 50-jarige man klaagt over drukkende pijn op de borst die uitstraalt naar zijn arm. Hij zweet en is misselijk. Wat denk je?', 
          options: [
            { id: 'b', text: 'Mogelijk hartaanval - dit is een noodsituatie', correct: true, feedback: 'Correct! Deze klassieke symptomen moet je altijd serieus nemen.', nextStepId: 2 },
            { id: 'a', text: 'Waarschijnlijk stress, even rusten', correct: false, feedback: 'Gevaarlijk! Deze symptomen negeren kan fataal zijn.', nextStepId: '1_consequence' },
            { id: 'c', text: 'Gewoon indigestie van het eten', correct: false, feedback: 'Hoewel mogelijk, is de combinatie van symptomen te alarmerend om dit aan te nemen.', nextStepId: 2 },
            { id: 'd', text: 'Spierpijn van sporten', correct: false, feedback: 'Spierpijn gaat zelden gepaard met zweten en misselijkheid.', nextStepId: 2 }
          ], 
          timeLimit: 12, 
          explanation: 'De combinatie van drukkende borstpijn, uitstraling naar de arm, zweten en misselijkheid zijn alarmbellen voor een mogelijke hartaanval.' 
        },
        {
          id: '1_consequence',
          question: 'Je stelt de persoon gerust en zegt dat het stress is. Na enkele minuten wordt de pijn erger en wordt de persoon lijkbleek. Tijd is cruciaal bij een hartaanval. Wat had je moeten herkennen?',
          options: [
            { id: 'a', text: 'De combinatie van symptomen als een noodgeval', correct: true, feedback: 'Precies. Bij twijfel, behandel het altijd als het ergste scenario.', nextStepId: 2 }
          ],
          timeLimit: 10,
          explanation: 'Bij een hartaanval telt elke minuut. Het verkeerd inschatten van de symptomen kan leiden tot onherstelbare schade aan de hartspier.'
        },
        { 
          id: 2, 
          question: 'Je vermoedt een hartaanval. Wat is je EERSTE en belangrijkste actie?', 
          options: [
            { id: 'b', text: 'Meteen 112 bellen', correct: true, feedback: 'Juist! Professionele medische hulp is de absolute prioriteit.', nextStepId: 3 },
            { id: 'a', text: 'De persoon laten gaan wandelen', correct: false, feedback: 'Zeer gevaarlijk! Inspanning belast het hart extra.', nextStepId: '2_consequence' },
            { id: 'c', text: 'Een glas water geven', correct: false, feedback: 'Dit helpt niet en verspilt kostbare tijd.', nextStepId: 3 },
            { id: 'd', text: 'Zelf naar het ziekenhuis rijden', correct: false, feedback: 'Niet doen. De ambulance heeft medische apparatuur aan boord en is sneller ter plaatse.', nextStepId: 3 }
          ], 
          timeLimit: 8, 
          explanation: 'Bij een vermoeden van een hartaanval is de eerste en enige juiste stap: ONMIDDELLIJK 112 bellen.' 
        },
        {
            id: '2_consequence',
            question: 'Je moedigt de persoon aan te wandelen \'om het los te maken\'. Na een paar stappen zakt hij in elkaar en verliest het bewustzijn. De inspanning was te veel voor het hart. Wat had je absoluut moeten doen?',
            options: [
              { id: 'a', text: '112 bellen en de persoon in rust houden', correct: true, feedback: 'Inderdaad. Rust is essentieel om het hart niet verder te belasten.', nextStepId: 3 }
            ],
            timeLimit: 10,
            explanation: 'Elke vorm van fysieke inspanning moet vermeden worden tijdens een hartaanval.'
        },
        { 
          id: 3, 
          question: '112 is gebeld. Hoe help je de persoon het best in afwachting van de ambulance?', 
          options: [
            { id: 'b', text: 'Half rechtop zetten, knieën gebogen, losse kleding', correct: true, feedback: 'Perfect! Deze houding ontlast het hart en vergemakkelijkt de ademhaling.', nextStepId: null },
            { id: 'a', text: 'Laten liggen met benen omhoog', correct: false, feedback: 'Dit verhoogt de druk op de borstkas.', nextStepId: '3_consequence' },
            { id: 'c', text: 'Laten rondlopen om de bloedsomloop te stimuleren', correct: false, feedback: 'Beweging belast het hart extra!', nextStepId: '2_consequence' },
            { id: 'd', text: 'De persoon koud water in het gezicht gooien', correct: false, feedback: 'Dit veroorzaakt een schrikreactie die het hart extra kan belasten.', nextStepId: null }
          ], 
          timeLimit: 15, 
          explanation: 'De \'harthouding\' (half rechtop, knieën gebogen) is de meest comfortabele en veilige positie voor iemand met hartklachten.'
        },
        {
            id: '3_consequence',
            question: 'Je legt de persoon plat met de benen omhoog. Hij begint te kreunen en zegt dat hij moeilijk kan ademen en meer druk op de borst voelt. Welke houding ontlast het hart wél?',
            options: [
              { id: 'a', text: 'Half rechtop zitten met gebogen knieën', correct: true, feedback: 'Correct, deze houding vermindert de druk op het hart.', nextStepId: null }
            ],
            timeLimit: 12,
            explanation: 'Plat liggen kan bij hartproblemen de ademhaling bemoeilijken. Een halfzittende houding is altijd beter.'
        }
      ]
    },
   
    {
      id: 'bloeding',
      title: 'Ernstige bloeding',
      difficulty: 'Gemiddeld',
      duration: '3 min',
      description: 'Iemand heeft een diepe snijwond met veel bloedverlies',
      image: '🩸',
      color: 'red',
      steps: [
        { 
          id: 1, 
          question: 'Je ziet iemand met een diepe snee in de arm die hevig bloedt. Wat is je absolute eerste prioriteit?', 
          options: [
            { id: 'a', text: 'Handschoenen aantrekken voor eigen bescherming', correct: true, feedback: 'Juist! Bescherm jezelf altijd tegen bloedcontact.', nextStepId: 2 },
            { id: 'b', text: 'Meteen druk uitoefenen op de wond', correct: false, feedback: 'Begrijpelijk, maar je slaat een cruciale veiligheidsstap over.', nextStepId: '1_consequence' },
            { id: 'c', text: 'De arm omhoog houden', correct: false, feedback: 'Dit helpt, maar is niet de allereerste prioriteit. Veiligheid eerst.', nextStepId: 2 },
            { id: 'd', text: 'Een schoon verband zoeken', correct: false, feedback: 'Goed idee, maar eerst je handschoenen aan.', nextStepId: 2 }
          ], 
          timeLimit: 10, 
          explanation: 'Eigen veiligheid is altijd de eerste stap. Draag handschoenen om jezelf te beschermen tegen bloedoverdraagbare aandoeningen.' 
        },
        {
          id: '1_consequence',
          question: 'Je oefent druk uit met je blote handen en stopt de bloeding, maar je handen zitten vol bloed. Je hebt jezelf nu blootgesteld aan mogelijke infectieziekten. Wat had je absoluut eerst moeten doen?',
          options: [
            { id: 'a', text: 'Handschoenen aantrekken', correct: true, feedback: 'Precies. Laten we verdergaan alsof je dat gedaan hebt.', nextStepId: 2 }
          ],
          timeLimit: 10,
          explanation: 'Zelfs in een noodgeval is je eigen veiligheid cruciaal. Gebruik handschoenen of, indien niet beschikbaar, een plastic zak als barrière.'
        },
        { 
          id: 2, 
          question: 'Je bent beschermd. Hoe stop je de bloeding nu het meest effectief?', 
          options: [
            { id: 'b', text: 'Directe, harde druk op de wond uitoefenen met een steriel gaas of schone doek', correct: true, feedback: 'Correct! Directe druk is de standaard en meest effectieve methode.', nextStepId: 3 },
            { id: 'a', text: 'Een tourniquet (knelverband) aanleggen boven de wond', correct: false, feedback: 'Dit is een extreme maatregel voor catastrofale bloedingen en vereist training.', nextStepId: '2_consequence' },
            { id: 'c', text: 'De wond deppen met ontsmettingsmiddel', correct: false, feedback: 'Ontsmetten is voor later, nu telt het stoppen van het bloedverlies.', nextStepId: 3 }
          ], 
          timeLimit: 12, 
          explanation: 'Oefen stevige, directe druk uit op de wond. Dit helpt de bloedvaten samen te drukken en bevordert de stolling.' 
        },
        {
          id: '2_consequence',
          question: 'Je legt een knelverband aan. Dit stopt de bloedtoevoer volledig en kan tot permanent letsel of amputatie leiden als het niet correct wordt gebruikt. Wat is de standaard eerstehulptechniek die je had moeten toepassen?',
          options: [
            { id: 'a', text: 'Directe druk uitoefenen op de wond', correct: true, feedback: 'Inderdaad, dat is de juiste eerste stap.', nextStepId: 3 }
          ],
          timeLimit: 12,
          explanation: 'Een tourniquet is een laatste redmiddel. Begin altijd met directe druk, tenzij de situatie catastrofaal is (bv. afgerukte ledemaat).'
        },
        { 
          id: 3, 
          question: 'De wond blijft door het verband heen bloeden. Wat doe je?', 
          options: [
            { id: 'a', text: 'Het eerste verband laten zitten en een nieuw drukverband eroverheen aanleggen', correct: true, feedback: 'Perfect! Zo behoud je de druk en verstoor je de beginnende stolling niet.', nextStepId: null },
            { id: 'b', text: 'Het doorweekte verband weghalen en een nieuw, schoon verband aanleggen', correct: false, feedback: 'Fout! Hiermee trek je de beginnende bloedprop los.', nextStepId: '3_consequence' },
            { id: 'c', text: 'De druk wegnemen en de wond aan de lucht laten drogen', correct: false, feedback: 'Absoluut niet, de bloeding zal onmiddellijk verergeren.', nextStepId: null }
          ], 
          timeLimit: 15, 
          explanation: 'Verwijder nooit het eerste verband. Leg extra verbanden bovenop het eerste en blijf druk uitoefenen.' 
        },
        {
          id: '3_consequence',
          question: 'Je haalt het verband weg. De beginnende bloedstolling scheurt open en de wond begint nog heviger te bloeden. Je hebt de situatie verergerd. Wat had je moeten doen met het eerste verband?',
          options: [
            { id: 'a', text: 'Het eerste verband laten zitten en er een nieuw overheen leggen', correct: true, feedback: 'Juist. Dit is een cruciale regel bij wondzorg.', nextStepId: null }
          ],
          timeLimit: 10,
          explanation: 'Het eerste verband fungeert als een basis voor de bloedstolling. Verwijder het nooit.'
        }
      ]
    },
    {
      id: 'reanimatie',
      title: 'Reanimatie',
      difficulty: 'Moeilijk',
      duration: '5-6 min',
      description: 'Persoon is bewusteloos en ademt niet',
      image: '🫀',
      color: 'red',
      steps: [
        { 
          id: 1, 
          question: 'Je vindt iemand bewusteloos. Na de veiligheidscheck reageert de persoon niet en ademt niet normaal. Wat is nu de juiste volgorde van acties?', 
          options: [
            { id: 'a', text: '(Laat) 112 bellen, haal een AED en start dan met hartmassage', correct: true, feedback: 'Correct! Hulp alarmeren is even belangrijk als de reanimatie zelf.', nextStepId: 2 },
            { id: 'b', text: 'Meteen beginnen met hartmassage zonder te bellen', correct: false, feedback: 'Je hebt professionele hulp nodig, anders is je inspanning tevergeefs.', nextStepId: '1_consequence' },
            { id: 'c', text: 'Eerst beademen, dan pas hartmassage', correct: false, feedback: 'Bij volwassenen is de bloedsomloop (hartmassage) de absolute prioriteit.', nextStepId: 2 },
            { id: 'd', text: 'De persoon in stabiele zijligging leggen', correct: false, feedback: 'Niet doen! Dit is alleen voor mensen die wél normaal ademen.', nextStepId: null }
          ], 
          timeLimit: 10, 
          explanation: 'De overlevingsketen: Alarmeren (112) -> Starten met reanimatie (compressies) -> AED gebruiken.' 
        },
        {
          id: '1_consequence',
          question: 'Je bent 2 minuten aan het reanimeren, maar er is geen hulp onderweg omdat niemand 112 heeft gebeld. Je bent uitgeput en alleen. Wat had je als allereerste moeten doen?',
          options: [
            { id: 'a', text: 'De hulpdiensten alarmeren', correct: true, feedback: 'Inderdaad. Zelfs de beste reanimatie is een overbrugging naar professionele hulp.', nextStepId: 2 }
          ],
          timeLimit: 10,
          explanation: 'Zonder 112 te bellen, komt er geen ambulance. Alarmeren is een levensreddende stap.'
        },
        { 
          id: 2, 
          question: 'Je start met borstcompressies. Wat is de juiste techniek voor een volwassene?', 
          options: [
            { id: 'a', text: 'Hielen van de handen op elkaar, in het midden van de borstkas, 5-6 cm diep, 100-120 keer per minuut', correct: true, feedback: 'Perfect! Dit is de correcte diepte en snelheid.', nextStepId: 3 },
            { id: 'b', text: 'Zachtjes duwen om geen ribben te breken', correct: false, feedback: 'Ribben kunnen breken, maar dat is minder erg dan sterven. Je moet diep genoeg duwen.', nextStepId: '2_consequence' },
            { id: 'c', text: 'Op de maag duwen om het hart te stimuleren', correct: false, feedback: 'Extreem gevaarlijk en nutteloos. Dit kan interne organen beschadigen.', nextStepId: 3 },
            { id: 'd', text: 'Eén hand gebruiken en ongeveer 2 cm diep duwen', correct: false, feedback: 'Dit is de techniek voor een baby, niet voor een volwassene.', nextStepId: 3 }
          ], 
          timeLimit: 12, 
          explanation: 'Effectieve borstcompressies zijn snel (bijna 2x per seconde) en diep (5-6 cm) om het bloed krachtig rond te pompen.' 
        },
        {
          id: '2_consequence',
          question: 'Je duwt zacht op de borstkas. De compressies zijn te oppervlakkig om het bloed effectief naar de hersenen te pompen. De persoon blijft levenloos. Hoe diep moet je duwen bij een volwassene?',
          options: [
            { id: 'a', text: 'Ongeveer 5 tot 6 centimeter diep', correct: true, feedback: 'Correct. Wees niet bang om kracht te gebruiken, het is levensnoodzakelijk.', nextStepId: 3 }
          ],
          timeLimit: 12,
          explanation: 'Ondiepe compressies zijn ineffectief. Een diepte van 5-6 cm is nodig om het hart voldoende samen te drukken.'
        },
        { 
          id: 3, 
          question: 'Na 30 borstcompressies geef je 2 beademingen. Wat is de juiste techniek?', 
          options: [
            { id: 'a', text: 'Hoofd naar achteren kantelen (kinlift), neus dichtknijpen, 1 seconde blazen tot borstkas omhoog komt', correct: true, feedback: 'Juist! Dit zorgt voor een vrije luchtweg en effectieve beademing.', nextStepId: null },
            { id: 'b', text: 'Zo hard en snel mogelijk lucht inblazen', correct: false, feedback: 'Te veel lucht kan in de maag belanden en braken veroorzaken.', nextStepId: '3_consequence' },
            { id: 'c', text: 'Beademen zonder de neus dicht te knijpen', correct: false, feedback: 'De lucht zal via de neus ontsnappen en niet in de longen komen.', nextStepId: null }
          ], 
          timeLimit: 15, 
          explanation: 'Een correcte beademing is rustig (1 seconde) en zorgt ervoor dat de borstkas net zichtbaar omhoog komt.'
        },
        {
          id: '3_consequence',
          question: 'Je blaast te hard en ziet de maag van het slachtoffer opzwellen. Dit betekent dat er lucht in de maag komt, wat de kans op braken vergroot. Hoe geef je een effectieve beademing?',
          options: [
            { id: 'a', text: 'Rustig blazen over 1 seconde, net tot de borstkas omhoog komt', correct: true, feedback: 'Precies. Het gaat om de techniek, niet om de kracht.', nextStepId: null }
          ],
          timeLimit: 10,
          explanation: 'Te veel of te hard blazen is een veelgemaakte fout. Een rustige, beheerste beademing is effectiever en veiliger.'
        }
      ]
    },
    {
      id: 'anafylaxie',
      title: 'Allergische reactie',
      difficulty: 'Moeilijk',
      duration: '3-4 min',
      description: 'Ernstige allergische reactie na bijensteek',
      image: '🐝',
      color: 'orange',
      steps: [
        { 
          id: 1, 
          question: 'Iemand wordt gestoken door een bij. Na 5 minuten krijgt diegene uitslag over het hele lichaam, een gezwollen gezicht en ademnood. Wat gebeurt er?', 
          options: [
            { id: 'b', text: 'Anafylactische shock - een levensbedreigende allergische reactie', correct: true, feedback: 'Correct! Deze snelle en hevige reactie vereist onmiddellijke actie.', nextStepId: 2 },
            { id: 'a', text: 'Een normale, lokale reactie op een bijensteek', correct: false, feedback: 'Niet correct. Ademhalingsproblemen en uitslag over het hele lichaam zijn geen lokale reactie.', nextStepId: '1_consequence' },
            { id: 'c', text: 'Een paniekaanval door de schrik van de steek', correct: false, feedback: 'Hoewel de symptomen kunnen overlappen, verklaart dit de wijdverspreide uitslag en zwelling niet.', nextStepId: 2 },
            { id: 'd', text: 'Een zonnesteek', correct: false, feedback: 'Niet waarschijnlijk, de symptomen zijn te specifiek en direct gelinkt aan de steek.', nextStepId: 2 }
          ], 
          timeLimit: 12, 
          explanation: 'Anafylaxie is een ernstige, systemische allergische reactie die fataal kan zijn als ze niet onmiddellijk wordt behandeld.' 
        },
        {
          id: '1_consequence',
          question: 'Je wacht af, maar de ademhaling van de persoon wordt steeds moeilijker en hij begint te piepen. Dit is veel ernstiger dan een normale reactie. Wat is hier aan de hand?',
          options: [
            { id: 'a', text: 'Het is een anafylactische shock', correct: true, feedback: 'Inderdaad. Het is cruciaal om dit snel te herkennen.', nextStepId: 2 },
            { id: 'b', text: 'Een astma-aanval, uitgelokt door de steek', correct: false, feedback: 'Hoewel het piepen lijkt op astma, verklaart dit de zwelling en uitslag niet.', nextStepId: 2 },
            { id: 'c', text: 'Hyperventilatie door de pijn', correct: false, feedback: 'Hyperventilatie veroorzaakt geen zwelling van het gezicht.', nextStepId: 2 }
          ],
          timeLimit: 10,
          explanation: 'Het negeren van systemische symptomen (ademnood, wijdverspreide uitslag) kan fatale gevolgen hebben.'
        },
        { 
          id: 2, 
          question: 'De persoon heeft moeite met ademen en wordt bleek. Wat is je absolute eerste prioriteit?', 
          options: [
            { id: 'a', text: 'Onmiddellijk 112 bellen', correct: true, feedback: 'Juist! Anafylaxie is een medisch noodgeval dat professionele hulp vereist.', nextStepId: 3 },
            { id: 'b', text: 'Een anti-allergiepil (antihistamine) geven en afwachten', correct: false, feedback: 'Een pil werkt veel te traag voor een levensbedreigende reactie.', nextStepId: '2_consequence' },
            { id: 'c', text: 'De angel van de bij proberen te verwijderen', correct: false, feedback: 'Dit is niet de prioriteit wanneer iemands leven in gevaar is.', nextStepId: 3 },
            { id: 'd', text: 'De persoon laten liggen en geruststellen', correct: false, feedback: 'Geruststellen is goed, maar actie ondernemen is nu levensnoodzakelijk.', nextStepId: 3 }
          ], 
          timeLimit: 10, 
          explanation: 'Bij tekenen van anafylaxie (vooral ademhalingsproblemen) is de eerste stap altijd 112 alarmeren.' 
        },
        {
            id: '2_consequence',
            question: 'Je geeft een anti-allergiepil. Na 5 minuten is er geen verbetering en zakt de persoon verder weg. Een pil werkt te traag. Wat had de absolute prioriteit moeten zijn?',
            options: [
              { id: 'a', text: '112 bellen voor dringende medische hulp', correct: true, feedback: 'Correct. Alleen een snelle medische interventie kan deze reactie stoppen.', nextStepId: 3 },
              { id: 'b', text: 'Een koud washandje op het gezicht leggen', correct: false, feedback: 'Dit helpt niet tegen de interne zwelling en lage bloeddruk.', nextStepId: 3 },
              { id: 'c', text: 'De persoon aanmoedigen om rustig te ademen', correct: false, feedback: 'Dit is onmogelijk als de luchtwegen fysiek aan het dichtzwellen zijn.', nextStepId: 3 }
            ],
            timeLimit: 10,
            explanation: 'Antihistaminica zijn nuttig voor milde allergieën, maar bij anafylaxie is snellere en krachtigere medicatie (adrenaline) nodig.'
        },
        { 
          id: 3, 
          question: 'De persoon heeft een adrenaline auto-injector (EpiPen) bij zich. Wat doe je?', 
          options: [
            { id: 'b', text: 'De EpiPen onmiddellijk in de buitenkant van de dijspier duwen en 10 seconden vasthouden', correct: true, feedback: 'Perfect! Een EpiPen kan levensreddend zijn en moet direct gebruikt worden.', nextStepId: null },
            { id: 'a', text: 'Wachten tot de ambulance er is om de pen toe te dienen', correct: false, feedback: 'Gevaarlijk! Elke seconde telt, de pen is ontworpen voor onmiddellijk gebruik door omstaanders.', nextStepId: '3_consequence' },
            { id: 'c', text: 'De EpiPen in de arm injecteren', correct: false, feedback: 'Verkeerde plaats! Altijd in de grote dijspier voor snelle opname.', nextStepId: null },
            { id: 'd', text: 'De pen aan de persoon geven zodat hij het zelf kan doen', correct: false, feedback: 'Onverstandig. De persoon kan te verward of zwak zijn om het correct te doen. Help hem.', nextStepId: null }
          ], 
          timeLimit: 12, 
          explanation: 'Een EpiPen toedienen: dop eraf, oranje kant tegen de buitenkant van de dij (mag door kleding), duwen tot je een klik hoort, en 10 seconden vasthouden.' 
        },
        {
            id: '3_consequence',
            question: 'Je wacht op de ambulance, maar de zwelling in de keel van het slachtoffer neemt toe en hij verliest het bewustzijn. De EpiPen had dit kunnen voorkomen. Hoe gebruik je hem alsnog correct?',
            options: [
              { id: 'a', text: 'In de buitenkant van de dijspier duwen en 10 seconden vasthouden', correct: true, feedback: 'Correct. Zelfs bij een bewusteloos slachtoffer kan de adrenaline nog levensreddend zijn.', nextStepId: null },
              { id: 'b', text: 'In de borst injecteren, dicht bij het hart', correct: false, feedback: 'Extreem gevaarlijk en absoluut niet de bedoeling!', nextStepId: null },
              { id: 'c', text: 'Het is nu te laat, de pen heeft geen zin meer', correct: false, feedback: 'Fout, adrenaline kan de reactie nog steeds omkeren. Geef het altijd.', nextStepId: null }
            ],
            timeLimit: 12,
            explanation: 'Een adrenaline auto-injector is ontworpen om de effecten van anafylaxie snel tegen te gaan en is cruciaal om de tijd tot de ambulance arriveert te overbruggen.'
        }
      ]
    },
    {
      id: 'brand',
      title: 'Brandwond',
      difficulty: 'Gemiddeld',
      duration: '3 min',
      description: 'Persoon heeft zich gebrand aan heet water',
      image: '🔥',
      color: 'orange',
      steps: [
        { 
          id: 1, 
          question: 'Iemand morst kokend water over zijn hand en onderarm. De huid wordt rood en er komen blaren. Wat doe je eerst?', 
          options: [
            { id: 'b', text: 'De brandwond 10-20 minuten koelen met lauw, zacht stromend water', correct: true, feedback: 'Correct! De "Eerst water, de rest komt later"-regel is cruciaal.', nextStepId: 2 },
            { id: 'a', text: 'IJs op de brandwond leggen om snel te koelen', correct: false, feedback: 'Niet doen! IJs kan de huid bevriezen en meer schade veroorzaken.', nextStepId: 2 },
            { id: 'c', text: 'Zalf of boter smeren op de wond', correct: false, feedback: 'Een gevaarlijk fabeltje! Dit sluit de hitte op.', nextStepId: '1_consequence' },
            { id: 'd', text: 'De natte kledij zo snel mogelijk uittrekken', correct: false, feedback: 'Koelen heeft voorrang. Trek kledij alleen uit als het niet aan de wond kleeft.', nextStepId: 2 }
          ], 
          timeLimit: 10, 
          explanation: 'Bij brandwonden is de eerste en belangrijkste stap altijd koelen met lauw, zacht stromend water om de verbranding te stoppen.' 
        },
        {
          id: '1_consequence',
          question: 'Je smeert zalf op de wond. De zalf vormt een isolerende laag die de hitte vasthoudt, waardoor de huid eronder verder verbrandt. De pijn wordt erger. Wat is de enige juiste eerste stap?',
          options: [
            { id: 'a', text: 'De zalf wegspoelen en koelen met lauw water', correct: true, feedback: 'Inderdaad. Eerst water, de rest komt later.', nextStepId: 2 },
            { id: 'b', text: 'De zalf afvegen met een droge doek', correct: false, feedback: 'Dit kan pijnlijk zijn en de huid beschadigen. Spoelen met water is beter.', nextStepId: 2 },
            { id: 'c', text: 'Een nat verband over de zalf aanleggen', correct: false, feedback: 'De zalf blokkeert nog steeds de warmteafgifte. Het moet eraf.', nextStepId: 2 }
          ],
          timeLimit: 12,
          explanation: 'Smeer nooit iets op een brandwond voordat deze grondig is gekoeld. Water is het enige juiste middel.'
        },
        { 
          id: 2, 
          question: 'Na 20 minuten koelen, zie je dat de brandwond op de hand groot is en vol blaren staat. Wat is de volgende stap?', 
          options: [
            { id: 'a', text: 'De wond afdekken met een schone, vochtige doek en medische hulp zoeken', correct: true, feedback: 'Juist! Grote brandwonden of brandwonden op gevoelige plekken vereisen altijd medische zorg.', nextStepId: 3 },
            { id: 'b', text: 'De blaren doorprikken om de druk te verlichten', correct: false, feedback: 'Absoluut niet! Blaren vormen een natuurlijke, steriele bescherming tegen infecties.', nextStepId: '2_consequence' },
            { id: 'c', text: 'De wond open laten aan de lucht om te drogen', correct: false, feedback: 'Een onbedekte brandwond is pijnlijk en zeer vatbaar voor infecties.', nextStepId: 3 },
            { id: 'd', text: 'Een strak, droog verband aanleggen', correct: false, feedback: 'Een vochtig verband is beter om afkoeling te behouden en vastkleven te voorkomen.', nextStepId: 3 }
          ], 
          timeLimit: 12, 
          explanation: 'Na het koelen, dek je een brandwond af om deze schoon te houden. Grote brandwonden moeten door een dokter worden gezien.'
        },
        {
          id: '2_consequence',
          question: 'Je prikt de blaren door. De open wonden beginnen te vochten en zijn nu extreem vatbaar voor bacteriën, wat kan leiden tot een ernstige infectie en littekens. Wat had je met de blaren moeten doen?',
          options: [
            { id: 'a', text: 'De blaren intact laten als bescherming', correct: true, feedback: 'Correct. Blaren vormen een natuurlijke barrière.', nextStepId: 3 },
            { id: 'b', text: 'De blaren voorzichtig afknippen met een schaartje', correct: false, feedback: 'Dit creëert een open wond en verhoogt het infectierisico.', nextStepId: 3 },
            { id: 'c', text: 'De blaren insmeren met ontsmettingsmiddel', correct: false, feedback: 'Dit is onnodig en pijnlijk als de blaar nog intact is.', nextStepId: 3 }
          ],
          timeLimit: 10,
          explanation: 'Prik blaren nooit door. Ze beschermen de onderliggende, nieuwe huid. Als ze vanzelf springen, dek je de wond af.'
        },
        { 
          id: 3, 
          question: 'Wanneer moet je bij een brandwond onmiddellijk 112 bellen?', 
          options: [
            { id: 'b', text: 'Bij grote brandwonden, of bij wonden op het gezicht, handen, voeten of geslachtsdelen', correct: true, feedback: 'Correct! Dit zijn ernstige situaties die onmiddellijke professionele hulp vereisen.', nextStepId: null },
            { id: 'a', text: 'Alleen als de persoon schreeuwt van de pijn', correct: false, feedback: 'Pijn is niet altijd een goede indicator. Derdegraads brandwonden doen soms geen pijn.', nextStepId: null },
            { id: 'c', text: 'Je hoeft nooit 112 te bellen voor een brandwond', correct: false, feedback: 'Zeer onjuist. Ernstige brandwonden kunnen levensbedreigend zijn.', nextStepId: '3_consequence' },
            { id: 'd', text: 'Alleen als de persoon het bewustzijn verliest', correct: false, feedback: 'Je moet bellen voordat dit gebeurt om shock te voorkomen.', nextStepId: null }
          ], 
          timeLimit: 15, 
          explanation: 'Alarmeer 112 bij grote (derdegraads) brandwonden, brandwonden door chemicaliën of elektriciteit, of als de luchtwegen zijn aangetast.' 
        },
        {
            id: '3_consequence',
            question: 'Je gaat ervan uit dat je dit zelf kan oplossen. Het slachtoffer wordt echter bleek, klam en voelt zich duizelig (tekenen van shock). Ernstige brandwonden zijn een medisch noodgeval. In welke gevallen had je 112 moeten bellen?',
            options: [
              { id: 'a', text: 'Bij grote wonden of wonden op risicovolle plaatsen', correct: true, feedback: 'Precies. Bij twijfel is het altijd beter om 112 te bellen.', nextStepId: null },
              { id: 'b', text: 'Zodra er blaren verschijnen', correct: false, feedback: 'Niet per se, kleine blaren kunnen thuis behandeld worden na doktersadvies.', nextStepId: null },
              { id: 'c', text: 'Onmiddellijk na het koelen, bij elke brandwond', correct: false, feedback: 'Dat is niet nodig voor kleine, eerstegraads brandwonden.', nextStepId: null }
            ],
            timeLimit: 12,
            explanation: 'Groot vochtverlies door ernstige brandwonden kan snel leiden tot shock, een levensbedreigende toestand.'
        }
      ]
    },
    {
      id: 'epilepsie',
      title: 'Epileptische aanval',
      difficulty: 'Gemiddeld',
      duration: '4 min',
      description: 'Iemand krijgt een epileptische aanval',
      image: '⚡',
      color: 'purple',
      steps: [
        { 
          id: 1, 
          question: 'Je ziet iemand plotseling vallen, verstijven en daarna hevig schokken met armen en benen. Wat is dit waarschijnlijk?', 
          options: [
            { id: 'b', text: 'Een epileptische aanval', correct: true, feedback: 'Correct! Plots vallen en schokken zijn typisch voor een tonisch-clonische aanval.', nextStepId: 2 },
            { id: 'a', text: 'Een hartaanval', correct: false, feedback: 'Bij een hartaanval is de persoon bij bewustzijn met pijn op de borst, zonder schokkende bewegingen.', nextStepId: 2 },
            { id: 'c', text: 'Een beroerte', correct: false, feedback: 'Een beroerte heeft andere symptomen zoals een scheve mond of verlamming, meestal zonder de hevige, symmetrische schokken.', nextStepId: 2 },
            { id: 'd', text: 'De persoon stelt zich aan', correct: false, feedback: 'Dit is een gevaarlijke aanname. Een epileptische aanval is een serieuze medische gebeurtenis.', nextStepId: '1_consequence' }
          ], 
          timeLimit: 10, 
          explanation: 'Een epileptische aanval (tonisch-clonisch) wordt gekenmerkt door een fase van verstijving, gevolgd door ritmische schokken.' 
        },
        {
          id: '1_consequence',
          question: 'Je negeert de persoon, denkend dat het theater is. De schokken zijn echt en de persoon kan zich ernstig verwonden door op de grond te slaan. Een epileptische aanval is een serieuze medische aandoening. Wat is de juiste inschatting?',
          options: [
            { id: 'a', text: 'Het is een epileptische aanval en de persoon heeft hulp nodig', correct: true, feedback: 'Precies. Ga er altijd van uit dat het echt is en bied hulp.', nextStepId: 2 },
            { id: 'b', text: 'Het is waarschijnlijk flauwvallen', correct: false, feedback: 'Bij flauwvallen zijn er geen aanhoudende, schokkende bewegingen.', nextStepId: 2 }
          ],
          timeLimit: 10,
          explanation: 'Behandel een mogelijke aanval altijd als een echte medische situatie. Je eerste rol is om de persoon te beschermen tegen verwondingen.'
        },
        { 
          id: 2, 
          question: 'De persoon schokt hevig op de grond. Wat is het allerbelangrijkste om NIET te doen?', 
          options: [
            { id: 'b', text: 'Iets tussen de tanden steken om een tongbeet te voorkomen', correct: true, feedback: 'Correct! Dit is een gevaarlijke mythe die tanden kan breken en verstikking kan veroorzaken. Dit mag je dus NOOIT doen.', nextStepId: '2_consequence_neg' }, // Dit is het juiste antwoord op de vraag "wat doe je NIET"
            { id: 'a', text: 'Tijd bijhouden hoe lang de aanval duurt', correct: false, feedback: 'Dit moet je juist wél doen. Het is cruciale informatie voor de hulpdiensten.', nextStepId: 3 },
            { id: 'c', text: 'Gevaarlijke voorwerpen (stoelen, tafels) wegschuiven', correct: false, feedback: 'Dit moet je juist wél doen om de persoon te beschermen.', nextStepId: 3 },
            { id: 'd', text: 'Proberen de bewegingen tegen te houden', correct: false, feedback: 'Dit is ook iets wat je NOOIT moet doen. De kracht is te groot en je kunt letsel veroorzaken.', nextStepId: '2_consequence_neg' }
          ], 
          timeLimit: 12, 
          explanation: 'De gouden regels bij een aanval: NIETS in de mond stoppen en de bewegingen NIET tegenhouden. Je belangrijkste taak is de omgeving veilig maken.'
        },
        {
            id: '2_consequence_neg',
            question: 'Je hebt correct geïdentificeerd wat je NIET moet doen. Laten we doorgaan naar de volgende fase: de aanval stopt. Wat is nu de juiste actie?',
            options: [ { id: 'a', text: 'Ok, ga verder', correct: true, feedback: 'Goed begrepen.', nextStepId: 3 } ],
            timeLimit: 5,
            explanation: 'Het herkennen van foute handelingen is even belangrijk als het kennen van de juiste.'
        },
        { 
          id: 3, 
          question: 'De aanval stopt na 2 minuten. De persoon is nog verward en suf. Wat is nu de beste actie?', 
          options: [
            { id: 'b', text: 'De persoon in stabiele zijligging leggen en rustig blijven praten', correct: true, feedback: 'Perfect! De zijligging houdt de luchtweg vrij voor speeksel of braaksel, en een kalme stem stelt gerust.', nextStepId: null },
            { id: 'a', text: 'De persoon proberen recht te zetten en te laten drinken', correct: false, feedback: 'Gevaarlijk! De persoon kan zich verslikken omdat de slikreflex nog verstoord kan zijn.', nextStepId: '3_consequence' },
            { id: 'c', text: 'Weglopen, want het gevaar is geweken', correct: false, feedback: 'Niet doen. De persoon is verward en heeft toezicht nodig tot hij/zij volledig bij bewustzijn is.', nextStepId: null },
            { id: 'd', text: 'Veel vragen stellen om te zien of hij/zij helder is', correct: false, feedback: 'Te veel prikkels kunnen de verwarring vergroten. Blijf rustig en stel simpele, geruststellende vragen.', nextStepId: null }
          ], 
          timeLimit: 15, 
          explanation: 'Na een aanval is de persoon vaak uitgeput en verward (de post-ictale fase). Stabiele zijligging en een rustige benadering zijn dan het beste.' 
        },
        {
            id: '3_consequence',
            question: 'Je probeert de verwarde persoon water te geven. Hij verslikt zich hevig en begint te hoesten en te proesten. De slikreflex is nog niet hersteld. Wat is de veiligste actie na een aanval?',
            options: [
              { id: 'a', text: 'De persoon in stabiele zijligging leggen', correct: true, feedback: 'Correct. Dit is de veiligste houding om de luchtweg vrij te houden.', nextStepId: null },
              { id: 'b', text: 'Op de rug kloppen', correct: false, feedback: 'Dit is voor een actieve verslikking, niet voor een verstoorde slikreflex.', nextStepId: null },
              { id: 'c', text: 'Proberen hem te laten braken', correct: false, feedback: 'Dit kan de situatie verergeren.', nextStepId: null }
            ],
            timeLimit: 12,
            explanation: 'Geef nooit eten of drinken aan iemand die niet volledig bij bewustzijn en alert is.'
        }
      ]
    },
    {
      id: 'ademstilstand',
      title: 'Ademhalingsstilstand',
      difficulty: 'Moeilijk',
      duration: '4-5 min',
      description: 'Persoon is bewusteloos en ademt niet, maar heeft nog pols.',
      image: '🌬️',
      color: 'blue',
      steps: [
        { 
          id: 1, 
          question: 'Je controleert de ademhaling en stelt vast dat er GEEN ademhaling is, maar je voelt WEL een duidelijke pols. Wat is je prioriteit?', 
          options: [
            { id: 'b', text: 'Starten met enkel beademing (1 keer per 5-6 seconden)', correct: true, feedback: 'Correct! Het hart klopt nog, het probleem is zuurstof. Beademen is de prioriteit.', nextStepId: 2 },
            { id: 'a', text: 'Meteen beginnen met hartmassage (30:2)', correct: false, feedback: 'Niet correct. Je zou op een kloppend hart duwen.', nextStepId: '1_consequence' },
            { id: 'c', text: 'De persoon in stabiele zijligging leggen en wachten', correct: false, feedback: 'Gevaarlijk! Zonder ademhaling zal het hart snel stoppen. Je moet ingrijpen.', nextStepId: 2 },
            { id: 'd', text: 'Een AED halen', correct: false, feedback: 'Een AED is voor een hartstilstand. Op dit moment is er geen hartstilstand.', nextStepId: 2 }
          ], 
          timeLimit: 15, 
          explanation: 'Geen ademhaling maar wel een hartslag is een ademhalingsstilstand. De behandeling is enkel beademing om zuurstof in het bloed te krijgen.' 
        },
        {
          id: '1_consequence',
          question: 'Je begint hartmassage te geven op een kloppend hart. Dit is medisch onjuist en kan letsel veroorzaken. Het echte, levensbedreigende probleem op dit moment is het gebrek aan zuurstof. Welke handeling levert direct zuurstof aan?',
          options: [
            { id: 'a', text: 'Beademen (mond-op-mond)', correct: true, feedback: 'Precies. De longen moeten gevuld worden met lucht.', nextStepId: 2 },
            { id: 'b', text: 'De buik masseren', correct: false, feedback: 'Dit heeft geen enkel effect op de zuurstofopname.', nextStepId: 2 },
            { id: 'c', text: 'De persoon met water besprenkelen', correct: false, feedback: 'Dit zal de ademhaling niet herstarten.', nextStepId: 2 }
          ],
          timeLimit: 12,
          explanation: 'Het is cruciaal om het verschil te kennen tussen een ademhalingsstilstand (wel pols, geen ademhaling -> beademen) en een hartstilstand (geen pols, geen ademhaling -> reanimeren).'
        },
        { 
          id: 2, 
          question: 'Je geeft beademingen. Hoe controleer je of je beademing effectief is?', 
          options: [
            { id: 'a', text: 'Je kijkt of de borstkas rustig omhoog en omlaag gaat', correct: true, feedback: 'Precies! Dit is de visuele bevestiging dat de lucht in de longen komt.', nextStepId: 3 },
            { id: 'b', text: 'Je blaast zo hard als je kan', correct: false, feedback: 'Te hard blazen kan lucht in de maag persen en longschade veroorzaken.', nextStepId: '2_consequence' },
            { id: 'c', 'text': 'Je voelt dat de polsslag sterker wordt', correct: false, feedback: 'Dit kan een gevolg zijn, maar het is geen directe, betrouwbare indicator voor een effectieve beademing.', nextStepId: 3 },
            { id: 'd', 'text': 'De persoon begint te hoesten', correct: false, feedback: 'Hoesten is een teken van leven, maar geen maatstaf voor jouw beademingstechniek.', nextStepId: 3 }
          ], 
          timeLimit: 12, 
          explanation: 'Een effectieve beademing duurt ongeveer 1 seconde en zorgt ervoor dat de borstkas zichtbaar en rustig omhoog komt.' 
        },
        {
          id: '2_consequence',
          question: 'Je blaast te hard en ziet de maag van het slachtoffer opzwellen. Dit betekent dat er lucht in de maag komt en niet in de longen, wat braken kan veroorzaken. Hoe geef je een *effectieve* beademing?',
          options: [
            { id: 'a', text: 'Rustig blazen over 1 seconde, net tot de borstkas omhoog komt', correct: true, feedback: 'Correct. Het gaat om de techniek, niet om brute kracht.', nextStepId: 3 },
            { id: 'b', text: 'Kortere, krachtigere pufjes geven', correct: false, feedback: 'Dit verhoogt de kans op lucht in de maag nog meer.', nextStepId: 3 },
            { id: 'c', text: 'De neus niet meer dichthouden', correct: false, feedback: 'Dan ontsnapt de lucht via de neus. De neus moet dicht.', nextStepId: 3 }
          ],
          timeLimit: 12,
          explanation: 'Zorg voor een goede kinlift om de luchtweg te openen en blaas rustig en gelijkmatig tot je de borstkas ziet rijzen.'
        },
        { 
          id: 3, 
          question: 'Na ongeveer 2 minuten beademen, controleer je opnieuw de pols. Je voelt niets meer. De situatie is veranderd. Wat doe je nu?', 
          options: [
            { id: 'c', text: 'Overschakelen op volledige reanimatie (30 compressies, 2 beademingen)', correct: true, feedback: 'Correct! De ademhalingsstilstand is een hartstilstand geworden. Start onmiddellijk met borstcompressies.', nextStepId: null },
            { id: 'a', text: 'Doorgaan met alleen beademing', correct: false, feedback: 'Niet meer voldoende. Zonder hartslag wordt de zuurstof niet meer rondgepompt.', nextStepId: '3_consequence' },
            { id: 'b', text: 'Stoppen en wachten op de ambulance', correct: false, feedback: 'Niet doen! De overlevingskans daalt nu elke seconde exponentieel.', nextStepId: null },
            { id: 'd', text: 'De persoon in stabiele zijligging leggen', correct: false, feedback: 'Dit is voor een bewusteloos slachtoffer dat NORMAAL ademt.', nextStepId: null }
          ], 
          timeLimit: 15, 
          explanation: 'Als de pols wegvalt, is onmiddellijk starten met borstcompressies (reanimatie) cruciaal om de bloedcirculatie naar de hersenen op gang te houden.'
        },
        {
            id: '3_consequence',
            question: 'Je gaat door met beademen, maar zonder hartslag wordt de zuurstof die je inblaast niet meer rondgepompt naar de hersenen. De situatie is nu veranderd in een hartstilstand. Welke handeling is nu absoluut noodzakelijk?',
            options: [
              { id: 'a', text: 'Starten met borstcompressies (volledige reanimatie)', correct: true, feedback: 'Inderdaad. De focus moet nu liggen op het rondpompen van bloed.', nextStepId: null },
              { id: 'b', text: 'Een AED zoeken', correct: false, feedback: 'Goed idee, maar start eerst met compressies. Laat iemand anders een AED halen.', nextStepId: null },
              { id: 'c', text: 'Controleren of de persoon koud aanvoelt', correct: false, feedback: 'Dit is niet relevant voor de acute behandeling.', nextStepId: null }
            ],
            timeLimit: 12,
            explanation: 'Zodra de hartslag wegvalt, zijn borstcompressies de enige manier om de vitale organen van zuurstofrijk bloed te voorzien.'
        }
      ]
    },

    {
      id: 'verdrinking',
      title: 'Verdrinking',
      difficulty: 'Moeilijk',
      duration: '5-6 min',
      description: 'Je haalt iemand uit het water die niet bij bewustzijn is.',
      image: '🌊',
      color: 'blue',
      steps: [
        { 
          id: 1, 
          question: 'Je hebt een persoon uit het water gehaald. Hij reageert niet en ademt niet. Wat is de belangrijkste eerste stap bij een drenkeling?', 
          options: [
            { id: 'c', text: 'Starten met 5 beademingen', correct: true, feedback: 'Correct! Bij verdrinking is zuurstoftekort het primaire probleem. Eerst beademen is cruciaal.', nextStepId: 2 },
            { id: 'a', text: 'Starten met 30 borstcompressies', correct: false, feedback: 'Niet de eerste stap bij verdrinking. Het protocol wijkt hier af van een standaard reanimatie.', nextStepId: 2 },
            { id: 'b', text: 'Proberen water uit de longen te duwen door op de buik te drukken', correct: false, feedback: 'Gevaarlijk en verouderd advies! Dit veroorzaakt braken en verspilt kostbare tijd.', nextStepId: '1_consequence' },
            { id: 'd', text: 'De persoon opwarmen met dekens', correct: false, feedback: 'Opwarmen is belangrijk, maar reanimatie heeft absolute voorrang.', nextStepId: 2 }
          ], 
          timeLimit: 12, 
          explanation: 'De reanimatierichtlijnen voor drenkelingen schrijven voor om te starten met 5 initiële beademingen voordat je met borstcompressies begint.' 
        },
        {
          id: '1_consequence',
          question: 'Je duwt op de buik. Er komt maaginhoud uit, wat de luchtweg verder kan blokkeren en de situatie verergert. Dit is een gevaarlijke en verouderde techniek. Wat is de correcte, eerste handeling bij een drenkeling?',
          options: [
            { id: 'a', text: '5 beademingen geven om zuurstof toe te dienen', correct: true, feedback: 'Juist. De prioriteit is altijd om zuurstof in de longen te krijgen.', nextStepId: 2 },
            { id: 'b', text: 'Hem in stabiele zijligging leggen', correct: false, feedback: 'Niet correct, de persoon ademt niet zelfstandig.', nextStepId: 2 },
            { id: 'c', text: 'Zijn benen omhoog houden', correct: false, feedback: 'Dit heeft geen effect op de ademhaling.', nextStepId: 2 }
          ],
          timeLimit: 12,
          explanation: 'Forceer nooit water uit de longen. De hoeveelheid is vaak klein en de tijd is te kostbaar. Begin met beademen.'
        },
        { 
          id: 2, 
          question: 'Na de 5 beademingen is er geen reactie. Wat is de volgende stap in de reanimatiecyclus?', 
          options: [
            { id: 'b', text: 'Starten met 30 borstcompressies, gevolgd door 2 beademingen', correct: true, feedback: 'Correct! Na de 5 startbeademingen volg je de standaard 30:2 reanimatiecyclus.', nextStepId: 3 },
            { id: 'a', text: 'Nog 5 beademingen geven', correct: false, feedback: 'Nee, na de initiële 5 start je de normale cyclus om de bloedsomloop op gang te brengen.', nextStepId: '2_consequence' },
            { id: 'c', text: 'De persoon in stabiele zijligging leggen', correct: false, feedback: 'Dit is alleen voor slachtoffers die zelfstandig en normaal ademen.', nextStepId: 3 },
            { id: 'd', text: 'Controleren op onderkoeling', correct: false, feedback: 'Reanimatie is levensreddend en heeft altijd voorrang op alles.', nextStepId: 3 }
          ], 
          timeLimit: 15, 
          explanation: 'Na de 5 initiële beademingen bij een drenkeling, schakel je onmiddellijk over op de standaard reanimatieverhouding van 30 borstcompressies en 2 beademingen.' 
        },
        {
            id: '2_consequence',
            question: 'Je geeft nog 5 beademingen, maar het slachtoffer blijft levenloos. De bloedsomloop staat stil en de hersenen krijgen geen zuurstof. Wat is de cruciale volgende stap in de normale reanimatiecyclus?',
            options: [
              { id: 'a', text: 'Starten met 30 borstcompressies en 2 beademingen', correct: true, feedback: 'Inderdaad, het bloed moet nu rondgepompt worden.', nextStepId: 3 },
              { id: 'b', text: 'Een AED zoeken', correct: false, feedback: 'Een AED is belangrijk, maar borstcompressies mogen niet worden uitgesteld.', nextStepId: 3 },
              { id: 'c', text: '112 bellen', correct: false, feedback: 'Dit had al moeten gebeuren. De reanimatiecyclus is nu de prioriteit.', nextStepId: 3 }
            ],
            timeLimit: 12,
            explanation: 'De initiële 5 beademingen zijn een eenmalige actie bij verdrinking. Daarna is de 30:2 cyclus leidend.'
        },
        { 
          id: 3, 
          question: 'Tijdens de borstcompressies komt er water en braaksel uit de mond van het slachtoffer. Wat doe je?', 
          options: [
            { id: 'c', text: 'Het hoofd snel opzij draaien om de mond leeg te laten lopen, en daarna doorgaan', correct: true, feedback: 'Perfect! Maak de luchtweg snel vrij en ga onmiddellijk verder.', nextStepId: null },
            { id: 'a', text: 'Doorgaan met de compressies en het negeren', correct: false, feedback: 'Gevaarlijk! De luchtweg kan hierdoor blokkeren, waardoor je beademingen niet meer effectief zijn.', nextStepId: '3_consequence' },
            { id: 'b', text: 'Stoppen met de reanimatie', correct: false, feedback: 'Niet stoppen! De hersenen hebben zuurstof nodig, onderbrekingen moeten minimaal zijn.', nextStepId: null },
            { id: 'd', text: 'Proberen alles uit de mond te vegen met je vingers', correct: false, feedback: 'Wees voorzichtig. Het hoofd kantelen is de snelste en veiligste manier.', nextStepId: null }
          ], 
          timeLimit: 12, 
          explanation: 'Als de luchtweg geblokkeerd raakt, draai je het hoofd snel opzij om de mondholte vrij te maken. Hervat de reanimatie onmiddellijk.' 
        },
        {
            id: '3_consequence',
            question: 'Je negeert het braaksel en gaat door. Hierdoor wordt de maaginhoud in de longen geduwd, wat een ernstige longontsteking kan veroorzaken. De luchtweg is nu geblokkeerd. Wat moet je onmiddellijk doen?',
            options: [
              { id: 'a', text: 'Hoofd opzij draaien en luchtweg vrijmaken', correct: true, feedback: 'Correct, een vrije luchtweg is essentieel voor effectieve reanimatie.', nextStepId: null },
              { id: 'b', text: 'Alleen doorgaan met compressies', correct: false, feedback: 'De luchtweg moet eerst vrij zijn, anders heeft beademen geen zin.', nextStepId: null },
              { id: 'c', text: 'Harder blazen bij de beademing', correct: false, feedback: 'Dit zal de blokkade alleen maar dieper duwen.', nextStepId: null }
            ],
            timeLimit: 12,
            explanation: 'Een vrije luchtweg (Airway) is de eerste prioriteit in de ABC-methode van eerste hulp.'
        }
      ]
    },
    {
      id: 'wondverzorging',
      title: 'Wondverzorging (Schaafwond)',
      difficulty: 'Makkelijk',
      duration: '2-3 min',
      description: 'Hoe verzorg je een alledaagse schaafwond correct?',
      image: '🩹',
      color: 'green',
      steps: [
        { 
          id: 1, 
          question: 'Een kind valt op de speelplaats en heeft een vuile schaafwond op de knie. Wat is de eerste stap?', 
          options: [
            { id: 'b', text: 'De wond schoonmaken met stromend water', correct: true, feedback: 'Perfect! Vuil en bacteriën moeten eerst weggespoeld worden.', nextStepId: 2 },
            { id: 'a', text: 'Meteen een pleister erop plakken', correct: false, feedback: 'Niet doen! Je sluit het vuil op, wat tot infecties kan leiden.', nextStepId: '1_consequence' },
            { id: 'c', text: 'Ontsmettingsalcohol erop gieten', correct: false, feedback: 'Alcohol kan pijnlijk zijn en weefsel beschadigen. Eerst spoelen met water.', nextStepId: 2 },
            { id: 'd', text: 'De wond laten drogen aan de lucht', correct: false, feedback: 'Eerst moet de wond proper gemaakt worden.', nextStepId: 2 }
          ], 
          timeLimit: 10, 
          explanation: 'Een vuile wond moet altijd eerst grondig gespoeld worden met proper, lauw water om infecties te voorkomen.' 
        },
        {
          id: '1_consequence',
          question: 'Je plakt een pleister op de vuile wond. De bacteriën zitten nu opgesloten in een warme, vochtige omgeving, wat een ideale broeihaard is voor een infectie. Wat had je absoluut eerst moeten doen?',
          options: [
            { id: 'a', text: 'De wond schoonspoelen met water', correct: true, feedback: 'Juist. Reinigen is de onmisbare eerste stap.', nextStepId: 2 },
            { id: 'b', text: 'Povidonjood (isobetadine) op de pleister doen', correct: false, feedback: 'Het vuil zit nog in de wond, dit helpt niet.', nextStepId: 2 },
            { id: 'c', text: 'Een grotere pleister gebruiken', correct: false, feedback: 'De grootte van de pleister lost het probleem van het vuil niet op.', nextStepId: 2 }
          ],
          timeLimit: 10,
          explanation: 'Sluit nooit vuil op in een wond. Reinigen onder stromend water is de gouden standaard.'
        },
        { 
          id: 2, 
          question: 'De wond is schoongespoeld met water. Wat is de volgende logische stap?', 
          options: [
            { id: 'b', text: 'De wond ontsmetten met een niet-prikkend ontsmettingsmiddel', correct: true, feedback: 'Correct! Na het reinigen is ontsmetten de volgende stap.', nextStepId: 3 },
            { id: 'a', text: 'Een strak verband aanleggen', correct: false, feedback: 'Een schaafwond bloedt meestal niet hevig. Een strak verband is niet nodig.', nextStepId: 3 },
            { id: 'c', text: 'De wond droogdeppen met wat keukenpapier', correct: false, feedback: 'Keukenpapier kan pluizen en vezels achterlaten in de wond.', nextStepId: '2_consequence' },
            { id: 'd', text: 'De wond insmeren met een hydraterende crème', correct: false, feedback: 'Nee, een open wond moet ontsmet worden, niet gehydrateerd.', nextStepId: 3 }
          ], 
          timeLimit: 12, 
          explanation: 'Na het spoelen van de wond, is het belangrijk om deze te ontsmetten met een geschikt product.' 
        },
        {
          id: '2_consequence',
          question: 'Je dept de wond droog met keukenpapier. Er blijven kleine vezels achter in de wond, wat de genezing kan hinderen en een infectierisico vormt. Wat is een betere stap na het reinigen met water?',
          options: [
            { id: 'a', text: 'Ontsmetten met een desinfecterend middel', correct: true, feedback: 'Inderdaad, dit doodt de overgebleven bacteriën.', nextStepId: 3 },
            { id: 'b', text: 'Droogblazen met een haardroger', correct: false, feedback: 'Dit kan bacteriën in de wond blazen en is pijnlijk.', nextStepId: 3 },
            { id: 'c', text: 'Voorzichtig droogdeppen met een steriel gaasje', correct: true, feedback: 'Dit is ook een goede optie. Een steriel gaasje laat geen vezels achter.', nextStepId: 3 }
          ],
          timeLimit: 12,
          explanation: 'Gebruik altijd schoon, niet-pluizend materiaal zoals een steriel gaasje om een wond droog te deppen.'
        },
        { 
          id: 3, 
          question: 'De wond is proper en ontsmet. Hoe werk je de verzorging af?', 
          options: [
            { id: 'b', text: 'Afdekken met een steriel kompres of een pleister', correct: true, feedback: 'Juist! Afdekken beschermt de wond tegen vuil en stoten.', nextStepId: null },
            { id: 'a', text: 'De wond open laten aan de lucht om sneller te genezen', correct: false, feedback: 'Dit is een mythe. Een open wond kan opnieuw vuil worden en droogt uit.', nextStepId: '3_consequence' },
            { id: 'c', text: 'De wond bedekken met wat watten', correct: false, feedback: 'Watten kunnen vastkleven in de wond en zijn moeilijk te verwijderen.', nextStepId: null },
            { id: 'd', text: 'De wond inpoederen met talkpoeder', correct: false, feedback: 'Dit kan de wond irriteren en infecties veroorzaken.', nextStepId: null }
          ], 
          timeLimit: 10, 
          explanation: 'Een propere, ontsmette wond wordt best afgedekt met een steriel verband of pleister om deze te beschermen.' 
        },
        {
            id: '3_consequence',
            question: 'Je laat de wond open. Het kind gaat verder spelen en stoot de knie opnieuw, waardoor de wond weer vuil wordt en begint te bloeden. Hoe kun je een wond het best beschermen?',
            options: [
              { id: 'a', text: 'Afdekken met een pleister of steriel verband', correct: true, feedback: 'Correct. Dit beschermt tegen vuil en bevordert een goede genezing.', nextStepId: null },
              { id: 'b', text: 'Een schone broek eroverheen doen', correct: false, feedback: 'Kleding kan tegen de wond schuren en is niet steriel.', nextStepId: null },
              { id: 'c', text: 'De wond constant blijven wassen', correct: false, feedback: 'Te veel wassen kan de genezing juist vertragen.', nextStepId: null }
            ],
            timeLimit: 10,
            explanation: 'Een wond afdekken creëert een beschermde, vochtige omgeving die ideaal is voor een snelle en nette genezing.'
        }
      ]
    },
    {
      id: 'verstuiking',
      title: 'Verstuiking (Enkel)',
      difficulty: 'Gemiddeld',
      duration: '3 min',
      description: 'Iemand verstuikt zijn enkel tijdens het sporten.',
      image: '🦶',
      color: 'purple',
      steps: [
        { 
          id: 1, 
          question: 'Tijdens de sportles zwikt een leerling zijn enkel om. De enkel wordt dik en pijnlijk. Wat is de juiste eerste hulp procedure?', 
          options: [
            { id: 'b', text: 'De RICE-methode toepassen: Rust, IJs, Compressie, Elevatie', correct: true, feedback: 'Correct! De RICE-methode is de standaardbehandeling om zwelling en pijn te beperken.', nextStepId: 2 },
            { id: 'a', text: 'De schoen uitdoen en de enkel masseren', correct: false, feedback: 'Massage kan de zwelling en de schade verergeren.', nextStepId: 2 },
            { id: 'c', text: 'Proberen verder te stappen om de spieren los te maken', correct: false, feedback: 'Gevaarlijk! Dit kan de blessure veel erger maken.', nextStepId: 2 },
            { id: 'd', text: 'Een warm kompres aanbrengen om de pijn te verlichten', correct: false, feedback: 'Warmte verhoogt de bloedtoevoer en dus de zwelling.', nextStepId: '1_consequence' }
          ], 
          timeLimit: 12, 
          explanation: 'Bij een verstuiking pas je de RICE-regel toe: Rust, IJs (koelen), Compressie (drukverband) en Elevatie (omhoog leggen).' 
        },
        {
          id: '1_consequence',
          question: 'Je legt een warm kompres op de enkel. De warmte verwijdt de bloedvaten, waardoor de zwelling en de pijn juist erger worden. Wat had je moeten gebruiken om de zwelling tegen te gaan?',
          options: [
            { id: 'a', text: 'IJs of een koud kompres (koelen)', correct: true, feedback: 'Inderdaad. Koude vernauwt de bloedvaten en beperkt de zwelling.', nextStepId: 2 },
            { id: 'b', text: 'Een pijnstillende zalf', correct: false, feedback: 'Zalf kan de pijn maskeren, maar doet niets tegen de zwelling. Koelen is de prioriteit.', nextStepId: 2 },
            { id: 'c', text: 'Niets, gewoon laten rusten', correct: false, feedback: 'Rust is goed, maar actief koelen is veel effectiever in de eerste fase.', nextStepId: 2 }
          ],
          timeLimit: 12,
          explanation: 'Gebruik bij een acute zwelling altijd koude, nooit warmte. Warmte is pas nuttig in een latere fase van herstel om de spieren te ontspannen.'
        },
        { 
          id: 2, 
          question: 'Je past de "I" van RICE toe (IJs). Hoe doe je dit correct?', 
          options: [
            { id: 'b', text: 'Een ijspack in een doek wikkelen en 15-20 minuten op de enkel leggen', correct: true, feedback: 'Perfect! Nooit direct contact met de huid en koel in intervallen.', nextStepId: 3 },
            { id: 'a', text: 'Een uur lang ijs direct op de huid leggen voor maximaal effect', correct: false, feedback: 'Gevaarlijk! Direct contact en te lang koelen kan vrieswonden veroorzaken.', nextStepId: '2_consequence' },
            { id: 'c', text: 'Koud water uit een fles erover gieten', correct: false, feedback: 'Dit is minder effectief dan een ijspack omdat het niet constant koud blijft.', nextStepId: 3 },
            { id: 'd', text: 'Een zak diepvrieserwten rechtstreeks op de enkel leggen', correct: false, feedback: 'Beter dan niets, maar nog steeds te koud voor direct huidcontact. Wikkel het in een doek.', nextStepId: 3 }
          ], 
          timeLimit: 12, 
          explanation: 'Koel een verstuiking altijd met een ijspack dat in een handdoek of T-shirt is gewikkeld, gedurende maximaal 15 tot 20 minuten per keer.' 
        },
        {
          id: '2_consequence',
          question: 'Je legt het ijs direct op de huid. Na een paar minuten wordt de huid rood en pijnlijk, en later wit. Je bent vrieswonden aan het veroorzaken. Hoe had je het ijs moeten aanbrengen?',
          options: [
            { id: 'a', text: 'In een doek wikkelen en maximaal 20 minuten gebruiken', correct: true, feedback: 'Correct. Dit beschermt de huid tegen de extreme kou.', nextStepId: 3 },
            { id: 'b', text: 'Het ijs in kleinere stukjes breken', correct: false, feedback: 'Dit verandert niets aan de temperatuur en het risico op vrieswonden.', nextStepId: 3 },
            { id: 'c', text: 'Het ijs snel over de huid bewegen', correct: false, feedback: 'Dit is nog steeds te koud en minder effectief dan constant koelen op één plek.', nextStepId: 3 }
          ],
          timeLimit: 12,
          explanation: 'Plaats ijs nooit rechtstreeks op de huid om bevriezing van de huid te voorkomen.'
        },
        { 
          id: 3, 
          question: 'Wanneer is het noodzakelijk om met een verstuikte enkel naar een dokter te gaan?', 
          options: [
            { id: 'b', text: 'Als je helemaal niet meer op de voet kan steunen of een "knak" hebt gehoord', correct: true, feedback: 'Correct! Dit kunnen tekenen zijn van een botbreuk.', nextStepId: null },
            { id: 'a', text: 'Enkel als de enkel blauw wordt', correct: false, feedback: 'Een blauwe plek is normaal bij een verstuiking en geen reden tot paniek.', nextStepId: null },
            { id: 'c', text: 'Je hoeft nooit naar de dokter voor een verstuiking', correct: false, feedback: 'Onverstandig. Soms is een verstuiking eigenlijk een breuk.', nextStepId: '3_consequence' },
            { id: 'd', text: 'Als de pijn na een uur nog niet weg is', correct: false, feedback: 'De pijn zal zeker langer dan een uur duren. De onmogelijkheid om te steunen is de belangrijkste indicator.', nextStepId: null }
          ], 
          timeLimit: 10, 
          explanation: 'Raadpleeg een arts als je niet meer op de enkel kan steunen, er een duidelijke misvorming is, je een "knak" hebt gehoord, of de pijn extreem is.' 
        },
        {
          id: '3_consequence',
          question: 'Je gaat ervan uit dat het vanzelf overgaat. Na een week is de enkel nog steeds enorm dik en pijnlijk, en blijkt dat er een bot gebroken was. De genezing is nu veel complexer. Welk signaal had je moeten herkennen?',
          options: [
            { id: 'a', text: 'Het onvermogen om op de voet te steunen', correct: true, feedback: 'Juist. Niet kunnen steunen is een rode vlag voor een mogelijke breuk.', nextStepId: null },
            { id: 'b', text: 'De kleur van de blauwe plek', correct: false, feedback: 'Blauwe plekken zijn normaal bij zowel verstuikingen als breuken.', nextStepId: null },
            { id: 'c', text: 'Het feit dat de zwelling niet direct wegging', correct: false, feedback: 'Zwelling kan dagen tot weken aanhouden, zelfs bij een simpele verstuiking.', nextStepId: null }
          ],
          timeLimit: 12,
          explanation: 'De "4-stappen regel" is een goede indicator: als je na de blessure geen 4 stappen kan zetten, is medisch advies nodig.'
        }
      ]
    },
    {
      id: 'bloedneus',
      title: 'Bloedneus',
      difficulty: 'Makkelijk',
      duration: '2 min',
      description: 'Hoe stop je een gewone neusbloeding correct?',
      image: '👃',
      color: 'red',
      steps: [
        { 
          id: 1, 
          question: 'Een leerling krijgt spontaan een bloedneus. Wat is de juiste houding?', 
          options: [
            { id: 'b', text: 'Rechtop zitten met het hoofd licht voorover gebogen', correct: true, feedback: 'Juist! Zo kan het bloed uit de neus lopen en niet in de keel.', nextStepId: 2 },
            { id: 'a', text: 'Hoofd achterover houden om geen bloed te morsen', correct: false, feedback: 'Fout! Het bloed loopt dan de keel in, wat misselijkheid kan veroorzaken.', nextStepId: '1_consequence' },
            { id: 'c', text: 'Plat op de rug gaan liggen', correct: false, feedback: 'Gevaarlijk, het bloed kan de luchtwegen instromen.', nextStepId: '1_consequence' },
            { id: 'd', text: 'Het hoofd tussen de knieën brengen', correct: false, feedback: 'Dit verhoogt de druk op het hoofd en kan de bloeding verergeren.', nextStepId: 2 }
          ], 
          timeLimit: 10, 
          explanation: 'De juiste houding bij een bloedneus is rechtop zitten en het hoofd licht naar voren buigen.' 
        },
        {
          id: '1_consequence',
          question: 'Je houdt het hoofd achterover. Het bloed loopt nu de keel in, wat misselijkheid veroorzaakt en de persoon doet kokhalzen. Dit kan de luchtweg blokkeren. Wat is de juiste, veilige houding?',
          options: [
            { id: 'a', text: 'Rechtop zitten en het hoofd voorover buigen', correct: true, feedback: 'Precies. Zo stroomt het bloed naar buiten, niet naar binnen.', nextStepId: 2 },
            { id: 'b', text: 'De neus spoelen met water', correct: false, feedback: 'Dit kan de bloedstolling verstoren.', nextStepId: 2 },
            { id: 'c', text: 'Een ijsblokje in de nek leggen', correct: false, feedback: 'Dit is een mythe en heeft weinig effect op de bloeding in de neus.', nextStepId: 2 }
          ],
          timeLimit: 10,
          explanation: 'Voorkom dat bloed de keel inloopt door het hoofd altijd voorover te buigen.'
        },
        { 
          id: 2, 
          question: 'Je hebt de juiste houding aangenomen. Wat doe je vervolgens met de neus zelf?', 
          options: [
            { id: 'c', text: 'Het zachte gedeelte van de neusvleugels dichtknijpen', correct: true, feedback: 'Perfect! Knijp de neusvleugels stevig dicht, net onder het neusbeen.', nextStepId: 3 },
            { id: 'a', text: 'Een watje diep in het bloedende neusgat duwen', correct: false, feedback: 'Niet doen. Bij het verwijderen kan de wonde weer openscheuren.', nextStepId: '2_consequence' },
            { id: 'b', text: 'Het harde, benige gedeelte bovenaan de neus dichtknijpen', correct: false, feedback: 'Dit heeft geen effect, de bloeding zit meestal lager in het zachte deel.', nextStepId: 3 },
            { id: 'd', text: 'Niets, gewoon het bloed laten druppen op een doekje', correct: false, feedback: 'Door de neus dicht te knijpen help je de bloeding actief te stoppen.', nextStepId: 3 }
          ], 
          timeLimit: 10, 
          explanation: 'Knijp het zachte gedeelte van de neus (de neusvleugels) stevig dicht met duim en wijsvinger.' 
        },
        {
          id: '2_consequence',
          question: 'Je duwt een prop watten in de neus. De bloeding stopt, maar als je het watje later verwijdert, trek je de bloedprop mee en begint de neus opnieuw te bloeden. Wat is een betere manier?',
          options: [
            { id: 'a', text: 'De neusvleugels van buitenaf dichtknijpen', correct: true, feedback: 'Correct. Dit stopt de bloeding zonder iets in de neus te stoppen.', nextStepId: 3 },
            { id: 'b', text: 'Een kleiner watje gebruiken', correct: false, feedback: 'Het probleem is het watje zelf, niet de grootte.', nextStepId: 3 },
            { id: 'c', text: 'Het watje nat maken voor je het erin stopt', correct: false, feedback: 'Dit helpt niet en kan onhygiënisch zijn.', nextStepId: 3 }
          ],
          timeLimit: 12,
          explanation: 'Vermijd het stoppen van objecten in de neus. Druk van buitenaf is veiliger en effectiever.'
        },
        { 
          id: 3, 
          question: 'Hoe lang moet je de neus onafgebroken dichtgeknepen houden?', 
          options: [
            { id: 'c', text: 'Minstens 10 minuten continu', correct: true, feedback: 'Correct! Houd de druk minstens 10 minuten constant aan zonder los te laten.', nextStepId: null },
            { id: 'a', text: 'Ongeveer 2 minuten', correct: false, feedback: 'Te kort. De bloedstolling heeft meer tijd nodig.', nextStepId: null },
            { id: 'b', text: 'Elke minuut even loslaten om te controleren', correct: false, feedback: 'Niet doen! Elke keer dat je loslaat, verstoor je de stolling.', nextStepId: '3_consequence' },
            { id: 'd', text: 'Tot de persoon zich beter voelt', correct: false, feedback: 'Dit is niet specifiek genoeg. Een vaste tijd is een betere richtlijn.', nextStepId: null }
          ], 
          timeLimit: 10, 
          explanation: 'Houd de druk constant aan gedurende 10 minuten. Controleer pas daarna of de bloeding gestopt is.' 
        },
        {
          id: '3_consequence',
          question: 'Je laat elke minuut los om te kijken. Hierdoor geef je de bloedstolling geen kans om zich te vormen en blijft de neus bloeden. Hoe lang moet je de druk onafgebroken aanhouden?',
          options: [
            { id: 'a', text: 'Minstens 10 minuten', correct: true, feedback: 'Precies. Geduld is hierbij cruciaal.', nextStepId: null },
            { id: 'b', text: '5 minuten zou genoeg moeten zijn', correct: false, feedback: 'De aanbeveling is 10 minuten om zeker te zijn van een goede stolling.', nextStepId: null },
            { id: 'c', text: 'Zo lang als je het volhoudt', correct: false, feedback: 'Probeer de 10 minuten aan te houden voor het beste resultaat.', nextStepId: null }
          ],
          timeLimit: 10,
          explanation: 'Het onderbreken van de druk is de meest gemaakte fout bij het stelpen van een bloedneus. Houd minstens 10 minuten constant druk.'
        }
      ]
    },
    {
      id: 'aed_gebruik',
      title: 'Gebruik van een AED',
      difficulty: 'Moeilijk',
      duration: '4-5 min',
      description: 'Hoe gebruik je een Automatische Externe Defibrillator?',
      image: '⚡️',
      color: 'red',
      steps: [
        { 
          id: 1, 
          question: 'Je bent aan het reanimeren en iemand brengt een AED. Wat is je allereerste stap met het toestel zelf?', 
          options: [
            { id: 'b', text: 'Het toestel aanzetten', correct: true, feedback: 'Correct! Stap 1 is altijd het toestel aanzetten. Volg daarna de gesproken instructies.', nextStepId: 2 },
            { id: 'a', text: 'Meteen de elektroden op de borstkas plakken', correct: false, feedback: 'Het toestel staat nog niet aan en kan dus geen instructies geven.', nextStepId: '1_consequence' },
            { id: 'c', text: 'De schokknop alvast indrukken om te testen', correct: false, feedback: 'Extreem gevaarlijk! De AED moet eerst het hartritme analyseren.', nextStepId: 2 },
            { id: 'd', text: 'De reanimatie stoppen en wachten op de instructies', correct: false, feedback: 'Ga door met reanimeren terwijl de AED wordt klaargemaakt en aangezet.', nextStepId: 2 }
          ], 
          timeLimit: 10, 
          explanation: 'Zodra een AED beschikbaar is, is de eerste stap altijd het toestel aanzetten. Onderbreek de reanimatie zo kort mogelijk.' 
        },
        {
          id: '1_consequence',
          question: 'Je plakt de elektroden op de borstkas, maar er gebeurt niets. Het toestel staat niet aan en kan dus geen instructies geven of het hartritme analyseren. Wat is de absolute eerste stap?',
          options: [
            { id: 'a', text: 'Het toestel aanzetten met de aan/uit-knop', correct: true, feedback: 'Precies. De AED zal je vanaf dan begeleiden.', nextStepId: 2 },
            { id: 'b', text: 'De batterij controleren', correct: false, feedback: 'Een goede gedachte, maar de eerste stap is altijd aanzetten.', nextStepId: 2 },
            { id: 'c', text: 'De elektroden opnieuw plakken', correct: false, feedback: 'Het probleem is niet de positie, maar het feit dat het toestel uit staat.', nextStepId: 2 }
          ],
          timeLimit: 10,
          explanation: 'Een AED is ontworpen om je door het proces te leiden, maar daarvoor moet het wel eerst aangezet worden.'
        },
        { 
          id: 2, 
          question: 'De AED instrueert je om de elektroden te bevestigen. Waar plak je ze op de ontblote borstkas van een volwassene?', 
          options: [
            { id: 'c', text: 'Eén onder het rechter sleutelbeen en één op de linkerzij, onder de oksel', correct: true, feedback: 'Perfect! Deze diagonale plaatsing zorgt ervoor dat de elektrische schok door het hart gaat.', nextStepId: 3 },
            { id: 'a', text: 'Allebei naast elkaar in het midden van de borstkas', correct: false, feedback: 'Fout. De elektrische stroom moet door het hart kunnen vloeien.', nextStepId: '2_consequence' },
            { id: 'b', text: 'Eén op de linkerschouder en één op de rechterschouder', correct: false, feedback: 'Fout. Dit is te hoog, de stroom zal het hart missen.', nextStepId: 3 },
            { id: 'd', text: 'Eén op de buik en één op de rug', correct: false, feedback: 'Dit is de plaatsing voor kinderen, niet voor volwassenen.', nextStepId: 3 }
          ], 
          timeLimit: 15, 
          explanation: 'De elektroden worden diagonaal over het hart geplakt: één rechtsboven op de borst, de ander linksonder op de zij.' 
        },
        {
          id: '2_consequence',
          question: 'Je plakt beide elektroden in het midden van de borstkas. De AED geeft een foutmelding: "Controleer elektroden". De elektrische stroom kan zo niet effectief door het hart vloeien. Wat is de correcte, diagonale plaatsing?',
          options: [
            { id: 'a', text: 'Eén rechtsboven, één linksonder', correct: true, feedback: 'Juist, zodat de stroom de hartspier kan bereiken.', nextStepId: 3 },
            { id: 'b', text: 'Eén linksboven, één rechtsonder', correct: false, feedback: 'Dit is de spiegelbeeldige, foute plaatsing.', nextStepId: 3 },
            { id: 'c', text: 'Beide op de rug', correct: false, feedback: 'Dit heeft geen effect op het hart.', nextStepId: 3 }
          ],
          timeLimit: 12,
          explanation: 'De plaatsing van de elektroden is cruciaal om de elektrische schok door de juiste delen van het hart te sturen.'
        },
        { 
          id: 3, 
          question: 'De AED analyseert en zegt: "Schok aangeraden. Raak de patiënt niet aan." Wat is nu het allerbelangrijkste?', 
          options: [
            { id: 'd', text: 'Controleren dat niemand het slachtoffer aanraakt en luid roepen "Iedereen los!"', correct: true, feedback: 'Correct! Veiligheid voor jezelf en omstaanders is cruciaal.', nextStepId: null },
            { id: 'a', text: 'Zo snel mogelijk op de schokknop drukken', correct: false, feedback: 'Bijna! Er is nog één cruciale veiligheidsstap die je moet uitvoeren.', nextStepId: null },
            { id: 'b', text: 'Doorgaan met borstcompressies tijdens de schok', correct: false, feedback: 'Extreem gevaarlijk! Je zou zelf een elektrische schok krijgen.', nextStepId: '3_consequence' },
            { id: 'c', text: 'De kinlift toepassen om de luchtweg open te houden', correct: false, feedback: 'Dan raak je de patiënt aan. Je moet nu afstand houden.', nextStepId: null }
          ], 
          timeLimit: 10, 
          explanation: 'Voordat je een schok toedient, moet je er absoluut zeker van zijn dat niemand (inclusief jijzelf) het slachtoffer aanraakt.'
        },
        {
            id: '3_consequence',
            question: 'Je blijft borstcompressies geven terwijl de schok wordt toegediend. Je krijgt zelf een hevige elektrische schok en wordt achteruit geworpen. Je bent nu zelf een slachtoffer. Wat is de gouden regel vlak voor de schok?',
            options: [
              { id: 'a', text: 'Zorgen dat niemand het slachtoffer aanraakt', correct: true, feedback: 'Precies. Jouw veiligheid en die van anderen is essentieel.', nextStepId: null },
              { id: 'b', text: 'De patiënt goed vasthouden', correct: false, feedback: 'Absoluut niet, dit is levensgevaarlijk.', nextStepId: null },
              { id: 'c', text: 'De ogen van het slachtoffer bedekken', correct: false, feedback: 'Dit is niet relevant en gevaarlijk omdat je het slachtoffer aanraakt.', nextStepId: null }
            ],
            timeLimit: 12,
            explanation: 'Het aanraken van een slachtoffer tijdens een defibrillatieschok is levensgevaarlijk. Houd altijd afstand.'
        }
      ]
    },
    {
      id: 'communicatie_hulpdiensten',
      title: 'Communicatie met 112',
      difficulty: 'Makkelijk',
      duration: '3 min',
      description: 'Hoe communiceer je effectief met de noodcentrale?',
      image: '☎️',
      color: 'blue',
      steps: [
        { 
          id: 1, 
          question: 'Je belt 112 voor een noodgeval. Wat is de allerbelangrijkste informatie die je als eerste doorgeeft?', 
          options: [
            { id: 'b', text: 'De exacte locatie van het noodgeval', correct: true, feedback: 'Correct! Zelfs als de verbinding wegvalt, weten de hulpdiensten dan waar ze moeten zijn.', nextStepId: 2 },
            { id: 'a', text: 'Je eigen naam', correct: false, feedback: 'Je naam is nuttig, maar de locatie is de absolute prioriteit.', nextStepId: 2 },
            { id: 'c', text: 'Wat er precies gebeurd is', correct: false, feedback: 'Dit is de tweede belangrijkste vraag, maar de locatie komt eerst.', nextStepId: '1_consequence' },
            { id: 'd', text: 'Het aantal slachtoffers', correct: false, feedback: 'Ook heel belangrijk, maar komt na de locatie.', nextStepId: 2 }
          ], 
          timeLimit: 12, 
          explanation: 'De gouden regel bij een noodoproep: begin altijd met de exacte locatie (adres, gemeente, herkenningspunten).' 
        },
        {
          id: '1_consequence',
          question: 'Je begint in paniek het hele verhaal te vertellen. De operator onderbreekt je en vraagt: "Meneer/mevrouw, waar bent u?". Als de verbinding nu wegvalt, weten ze niet waar ze heen moeten. Wat had u als eerste moeten zeggen?',
          options: [
            { id: 'a', text: 'De locatie: straat, nummer en gemeente', correct: true, feedback: 'Inderdaad. Locatie is altijd de eerste en belangrijkste informatie.', nextStepId: 2 },
            { id: 'b', text: 'De naam van het slachtoffer', correct: false, feedback: 'Niet de prioriteit. De ambulance moet eerst weten waarheen.', nextStepId: 2 },
            { id: 'c', text: 'Je telefoonnummer', correct: false, feedback: 'De operator ziet je nummer al. Locatie is belangrijker.', nextStepId: 2 }
          ],
          timeLimit: 10,
          explanation: 'Professionele hulpdiensten kunnen niets doen als ze de locatie niet weten. Dit is altijd stap 1.'
        },
        { 
          id: 2, 
          question: 'De operator heeft de locatie. Welke kerninformatie wil hij/zij daarna weten?', 
          options: [
            { id: 'b', text: 'Wat er gebeurd is, het aantal slachtoffers, en of ze bij bewustzijn zijn', correct: true, feedback: 'Juist! Dit helpt de operator de juiste middelen (politie, MUG, brandweer) te sturen.', nextStepId: 3 },
            { id: 'a', text: 'Het weer en de verkeerssituatie', correct: false, feedback: 'Dit is niet jouw taak om door te geven.', nextStepId: 3 },
            { id: 'c', text: 'Je persoonlijke mening over wie er in fout was', correct: false, feedback: 'Blijf bij de feiten. De operator heeft objectieve informatie nodig.', nextStepId: '2_consequence' },
            { id: 'd', text: 'Of je een EHBO-diploma hebt', correct: false, feedback: 'Dit kan later nuttig zijn, maar de toestand van het slachtoffer is belangrijker.', nextStepId: 3 }
          ], 
          timeLimit: 15, 
          explanation: 'Na de locatie, geef je de aard van het noodgeval (ongeval, medisch?), het aantal slachtoffers en hun toestand.' 
        },
        {
          id: '2_consequence',
          question: 'Je begint te speculeren over wie er in fout was. De operator vraagt je om bij de feiten te blijven. De toestand van het slachtoffer is nu cruciaal. Welke feitelijke informatie heeft de operator nodig?',
          options: [
            { id: 'a', text: 'De aard van het ongeval en de toestand van het slachtoffer', correct: true, feedback: 'Correct. Blijf kalm en objectief.', nextStepId: 3 },
            { id: 'b', text: 'De nummerplaat van de betrokken voertuigen', correct: false, feedback: 'Dat is informatie voor de politie later, niet voor de medische hulp nu.', nextStepId: 3 },
            { id: 'c', text: 'Een schatting van de kosten van de schade', correct: false, feedback: 'Totaal irrelevant voor de noodcentrale.', nextStepId: 3 }
          ],
          timeLimit: 12,
          explanation: 'In een noodoproep is het essentieel om kalm te blijven en enkel de feitelijke, relevante informatie te geven die de operator vraagt.'
        },
        { 
          id: 3, 
          question: 'Je hebt alle informatie doorgegeven. Wanneer mag je de verbinding verbreken?', 
          options: [
            { id: 'b', text: 'Wanneer de operator expliciet zegt dat je mag inhaken', correct: true, feedback: 'Correct! Verbreek nooit zelf de verbinding. De operator kan je nog belangrijke instructies geven.', nextStepId: null },
            { id: 'a', text: 'Zodra je de sirenes in de verte hoort', correct: false, feedback: 'Niet doen. De operator kan je nog belangrijke instructies geven.', nextStepId: '3_consequence' },
            { id: 'c', text: 'Na ongeveer 3 minuten, want dan hebben ze genoeg informatie', correct: false, feedback: 'De operator bepaalt wanneer het gesprek eindigt, niet jij.', nextStepId: null },
            { id: 'd', text: 'Zodra je het te eng vindt worden', correct: false, feedback: 'Probeer kalm te blijven. De operator is er om je te helpen en te begeleiden.', nextStepId: null }
          ], 
          timeLimit: 10, 
          explanation: 'Verbreek nooit de verbinding met de noodcentrale totdat de operator je daarvoor de toestemming geeft.' 
        },
        {
            id: '3_consequence',
            question: 'Je hoort sirenes en hangt op. De operator was je net instructies aan het geven om een bloeding te stelpen. Deze begeleiding is nu verloren. Wat is de gouden regel voor het beëindigen van een noodoproep?',
            options: [
              { id: 'a', text: 'Wachten op toestemming van de operator', correct: true, feedback: 'Precies. Hun begeleiding kan levensreddend zijn.', nextStepId: null },
              { id: 'b', text: 'Ophangen als de ambulance in zicht is', correct: false, feedback: 'Zelfs dan kan de operator nog cruciale info doorgeven.', nextStepId: null },
              { id: 'c', text: 'Ophangen en terugbellen als de situatie verergert', correct: false, feedback: 'Blijf aan de lijn. Het is sneller dan opnieuw bellen.', nextStepId: null }
            ],
            timeLimit: 12,
            explanation: 'De operator kan je tot de aankomst van de hulpdiensten begeleiden met levensreddende instructies. Blijf dus altijd aan de lijn.'
        }
      ]
    }
  ];
      

  // Emergency contacts data
  const emergencyContacts = [
    { number: '112', description: 'Algemeen noodnummer (ambulance, brandweer, politie)', icon: '🚨' },
    { number: '101', description: 'Niet-dringende hulp politie', icon: '👮' },
    { number: '1733', description: 'Huisartsenpost (buiten kantooruren)', icon: '👨‍⚕️' },
    { number: '070-245 245', description: 'Vergiftigingen informatie', icon: '☠️' }
  ];

  // Calculate progress
  const totalScenarios = scenarios.length;
  const completedCount = userProgress.completedScenarios.length;
  const progressPercentage = (completedCount / totalScenarios) * 100;

  // Timer effect
useEffect(() => {
    let interval;
    // ALLEEN timer starten als accessibility mode UIT staat
    if (timeRemaining > 0 && activeScenario && !showResults && !accessibilityMode) {
      interval = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && activeScenario && !accessibilityMode) {
      handleTimeUp();
    }
    return () => clearInterval(interval);
  }, [timeRemaining, activeScenario, showResults, accessibilityMode]);


  const handleTimeUp = () => {
    setShowResults(true);
  };

  const startScenario = async (scenario) => {
    // Als er een nieuwe keten start, initialiseer deze
    if (!chainState && Math.random() < 0.3) { // 30% kans op een keten
      const chainTypes = Object.keys(ScenarioChainSystem.chains);
      const chainType = chainTypes[Math.floor(Math.random() * chainTypes.length)];
      const newChain = ScenarioChainSystem.initializeChain(chainType, profile);
      if (newChain) {
        setActiveChain(newChain);
        // Start met het eerste scenario uit de nieuwe keten
        const firstScenarioId = newChain.scenarios[0].id;
        scenario = scenarios.find(s => s.id === firstScenarioId);
      }
    }
    // 1. Maak een diepe kopie om de originele data niet te wijzigen.
    const scenarioCopy = JSON.parse(JSON.stringify(scenario));
    
    // 2. Shuffle de antwoordopties voor elke stap in de kopie.
    scenarioCopy.steps.forEach(step => {
      if (step.options) { // Controleer of er opties zijn om te shuffelen
        step.options = shuffleArray(step.options);
      }
    });
    // 3. De rest van de functie gebruikt nu de 'scenarioCopy'
    if (enhancedMode) {
      // Gebruik enhanced system
      const enhanced = await startEnhancedScenario(scenarioCopy);
      if (enhanced) {
        const role = RoleBasedScenarios.assignRole(enhanced, profile);
      const roleEnhanced = RoleBasedScenarios.adaptScenarioForRole(enhanced, role);
      // Genereer complicaties
      const complications = ComplicationSystem.generateComplications(enhanced, profile, {});
      
      setGameState({
        role: role,
        complications: [],
        resources: { time: 100, stress: role.stressLevel, effectiveness: 100 }
      });
      
      if (role) {
        setShowRoleIntro(true);
        setActiveScenario(roleEnhanced);
        return; // Wacht op rol intro
      }
      setActiveScenario(roleEnhanced);
        setCurrentStep(0);
        setScenarioResults({});
        setShowResults(false);
        // Tijd instellen - enhanced scenarios kunnen aangepaste tijden hebben
        const firstStep = enhanced.steps[0];
        setTimeRemaining(
          accessibilityMode ? null : 
          firstStep.timeLimit || scenario.steps[0].timeLimit
        );
      }
    } else {
      // Je bestaande logica blijft hetzelfde
      setActiveScenario(scenarioCopy);
      setCurrentStep(0);
      setScenarioResults({});
      setShowResults(false);
      setTimeRemaining(accessibilityMode ? null : scenario.steps[0].timeLimit);
    }
    setShowNextButton(false);
  };

const handleAnswer = (selectedOption, step) => {
  setTimeRemaining(null);
  const newResults = {
    ...scenarioResults,
    [step.id]: {
      selected: selectedOption,
      correct: selectedOption.correct,
      timeUsed: accessibilityMode ? 0 : (step.timeLimit - timeRemaining)
    }
  };
  setScenarioResults(newResults);

  // Check for complications in enhanced mode
  if (isEnhanced && gameState.complications.length > 0) {
    const activeComplications = gameState.complications.filter(
      comp => comp.triggerStep === currentStep && !comp.resolved
    );

    if (activeComplications.length > 0) {
      setShowComplication(activeComplications[0]);
      return;
    }
  }

  // Update resources in enhanced mode
  if (isEnhanced) {
    setGameState(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        stress: Math.min(100, prev.resources.stress + (selectedOption.correct ? -5 : 10)),
        effectiveness: selectedOption.correct ? 
          Math.min(100, prev.resources.effectiveness + 5) :
          Math.max(0, prev.resources.effectiveness - 10),
        time: Math.max(0, prev.resources.time - 2)
      }
    }));
  }
    
  // Show immediate feedback
  setTimeout(() => {
    setShowNextButton(true);
  }, 500); // Kort genoeg om feedback te tonen, lang genoeg om te lezen
};

// Nieuwe functie voor volgende stap
// in EHBODetail.jsx

  const goToNextStep = () => {
    setShowNextButton(false);

    // Haal de data van de huidige stap en het gegeven antwoord op
    const currentStepData = activeScenario.steps[currentStep];
    const resultForCurrentStep = scenarioResults[currentStepData.id];

    if (!resultForCurrentStep) {
      // Fallback als er iets misgaat
      console.error("Kon het resultaat voor de huidige stap niet vinden.");
      resetScenario();
      return;
    }
    
    // Haal de ID van de volgende stap uit de gekozen optie
    const nextStepId = resultForCurrentStep.selected.nextStepId;

    if (nextStepId) {
      // Zoek de index van de volgende stap in de array
      const nextStepIndex = activeScenario.steps.findIndex(step => step.id === nextStepId);

      if (nextStepIndex !== -1) {
        // Ga naar de volgende stap
        setCurrentStep(nextStepIndex);
        const nextStep = activeScenario.steps[nextStepIndex];
        setTimeRemaining(accessibilityMode ? null : nextStep.timeLimit);
      } else {
        // Volgende stap niet gevonden, beëindig het scenario
        completeScenario(scenarioResults);
      }
    } else {
      // Geen nextStepId gedefinieerd (bv. `null`), dus het scenario is voorbij
      completeScenario(scenarioResults);
    }
  };

// Role intro completion handler (voeg toe na je goToNextStep functie)
const handleRoleIntroComplete = () => {
  setShowRoleIntro(false);
  if (activeScenario) {
    setCurrentStep(0);
    setScenarioResults({});
    setShowResults(false);
    
    const firstStep = activeScenario.steps[0];
    setTimeRemaining(accessibilityMode ? null : firstStep.timeLimit);
  }
};

  // in EHBODetail.jsx

 const completeScenario = async (results) => {
  // Check of er een actieve keten is
    if (activeChain) {
      const scenarioResult = { score: Math.round((Object.values(results).filter(r => r.correct).length / activeScenario.steps.length) * 100) };
      const nextChainStep = ScenarioChainSystem.getNextScenario(activeChain, scenarioResult);

      if (nextChainStep && nextChainStep.nextScenarioId) {
        // Er is een volgend scenario in de keten, laad dit
        const nextScenario = scenarios.find(s => s.id === nextChainStep.nextScenarioId);
        if (nextScenario) {
          setChainProgress(nextChainStep.chainProgress);
          startScenario(nextScenario, activeChain); // Herstart met het volgende scenario
          return; // Stop hier, toon nog geen resultaten
        }
      }
    }

    // Als er geen actieve keten is, of de keten is voorbij, toon de resultaten
    const correctAnswers = Object.values(results).filter(r => r.correct).length;
    const totalQuestions = activeScenario.steps.length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    
    // Bestaande logica voor normale scenarios
    if (!userProgress.completedScenarios.includes(activeScenario.id)) {
      setUserProgress(prev => ({
        ...prev,
        completedScenarios: [...prev.completedScenarios, activeScenario.id],
        totalScore: prev.totalScore + score,
        streak: prev.streak + 1
      }));
      
      handleScenarioCompletion(activeScenario.id);
      
      try {
        const saveProgress = httpsCallable(functions, 'saveEHBOProgress');
        await saveProgress({
          userId: profile.id,
          scenarioId: activeScenario.id,
          score: score,
          isEnhanced: isEnhanced // NIEUW: Track enhanced scenarios
        });
      } catch (error) {
        console.error("Opslaan EHBO voortgang mislukt:", error);
      }
    }

    // NIEUW: Enhanced scenario completion
    if (isEnhanced) {
      const enhancedCompletion = await completeEnhancedScenario(Object.values(results));
      if (enhancedCompletion?.insights) {
        // Enhanced insights worden later getoond in ScenarioResults
      }
    }
    
    setShowResults(true);
  };

  const resetScenario = () => {
  setActiveScenario(null);
  setCurrentStep(0);
  setScenarioResults({});
  setShowResults(false);
  setTimeRemaining(null);
  // NIEUW: Reset enhanced state
  setGameState({
    role: null,
    complications: [],
    resources: { time: 100, stress: 0, effectiveness: 100 }
  });
  setShowRoleIntro(false);
  setShowComplication(null);
};
// Header met toegankelijkheidsopties
 const AccessibilityControls = () => (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
      <h3 className="font-semibold text-blue-800 mb-3">Leer Modi & Toegankelijkheid</h3>
      
      {/* Bestaande accessibility toggle */}
      <label className="flex items-center gap-3 cursor-pointer mb-3">
        <input
          type="checkbox"
          checked={accessibilityMode}
          onChange={(e) => setAccessibilityMode(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
        />
        <div>
          <span className="font-medium text-blue-700">Basis Toegankelijkheid</span>
          <p className="text-sm text-blue-600">
            Geen tijdsdruk + aangepaste interface
          </p>
        </div>
      </label>

      {/* NIEUW: Enhanced mode toggle */}
      <label className="flex items-center gap-3 cursor-pointer mb-3">
        <input
          type="checkbox"
          checked={enhancedMode}
          onChange={(e) => setEnhancedMode(e.target.checked)}
          className="w-4 h-4 text-purple-600 border-purple-300 rounded focus:ring-purple-500"
        />
        <div>
          <span className="font-medium text-purple-700">Enhanced Leren</span>
          <p className="text-sm text-purple-600">
            Adaptieve scenarios met realistische complicaties
          </p>
        </div>
      </label>

      {/* NIEUW: Toon welke adaptaties actief zijn */}
      {(enhancedMode || accessibilityMode) && (
        <div className="mt-3 p-3 bg-white/50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Actieve Aanpassingen:</h4>
          <div className="flex flex-wrap gap-2">
            {accessibilityMode && (
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                Uitgebreide tijd
              </span>
            )}
            {enhancedMode && shouldShowTimeAdjustment && (
              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded">
                Slim tijdsbeheer
              </span>
            )}
            {enhancedMode && shouldShowHints && (
              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">
                Hint systeem
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const Dashboard = () => (
    <div className="space-y-8">
        <AccessibilityControls />
      {/* Progress Overview - Compacter en subtieler */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">EHBO Voortgang</h2>
            <p className="text-slate-600 text-sm">Leer levensreddende vaardigheden</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-800">{completedCount}/{totalScenarios}</div>
            <div className="text-xs text-slate-500">scenario's voltooid</div>
          </div>
        </div>
        
        <div className="w-full bg-slate-200 rounded-full h-2 mb-4">
          <div 
            className="bg-emerald-500 rounded-full h-2 transition-all duration-1000"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-slate-700">{userProgress.totalScore}</div>
            <div className="text-xs text-slate-500">Totale Score</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-slate-700">{userProgress.streak}</div>
            <div className="text-xs text-slate-500">Streak</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-slate-700">{userProgress.certificates.length}</div>
            <div className="text-xs text-slate-500">Certificaten</div>
          </div>
        </div>
      </div>

      {/* Scenario Grid */}
      <div>
        <h3 className="text-xl font-bold mb-6">Interactieve Scenario's</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {scenarios.map(scenario => {
            const isCompleted = userProgress.completedScenarios.includes(scenario.id);
            const colorClass = {
              red: 'from-red-500 to-pink-500',
              orange: 'from-orange-500 to-amber-500',
              blue: 'from-blue-500 to-indigo-500',
              green: 'from-green-500 to-emerald-500',
              purple: 'from-purple-500 to-violet-500'
            }[scenario.color];

            return (
              <div 
                key={scenario.id}
                className={`relative bg-gradient-to-br ${colorClass} rounded-2xl p-6 text-white cursor-pointer transform transition-all hover:scale-105 ${isCompleted ? 'ring-4 ring-yellow-400' : ''}`}
                onClick={() => startScenario(scenario)}
              >
                {isCompleted && (
                  <div className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-900 rounded-full p-2">
                    <CheckIcon className="w-6 h-6" />
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-4">
                  <div className="text-6xl">{scenario.image}</div>
                  <div className="text-right">
                    <div className="text-sm opacity-90">{scenario.difficulty}</div>
                    <div className="text-sm opacity-90">{scenario.duration}</div>
                  </div>
                </div>
                
                <h4 className="text-xl font-bold mb-2">{scenario.title}</h4>
                <p className="text-sm opacity-90 mb-4">{scenario.description}</p>
                
                <div className="flex items-center justify-between">
                  <button className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-white/30 transition-colors">
                    <PlayIcon className="w-4 h-4" />
                    {isCompleted ? 'Opnieuw spelen' : 'Start scenario'}
                  </button>
                  <div className="flex items-center gap-1">
                    <ClockIcon className="w-4 h-4" />
                    <span className="text-sm">{scenario.duration}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const ScenarioView = () => {
    if (!activeScenario) return null;
    
    const currentStepData = activeScenario.steps[currentStep];
    const selectedAnswer = scenarioResults[currentStepData.id]?.selected;
    
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <Phase3UIComponents.ChainProgressDisplay chainProgress={chainProgress} />
          {/* Enhanced status display */}
            {isEnhanced && (
              <EnhancedUIComponents.ResourceStatusDisplay 
                adaptations={activeScenario.adaptations}
                timeRemaining={timeRemaining}
              />
            )}

            {/* Enhanced resource display */}
            {isEnhanced && (
              <Phase3UIComponents.EnhancedResourceDisplay 
                resources={gameState.resources}
                role={gameState.role}
                complications={gameState.complications}
              />
            )}

          {/* Header */}
          <div className={`bg-gradient-to-r from-${activeScenario.color}-500 to-${activeScenario.color}-600 p-6 text-white`}>
            <div className="flex items-center justify-between mb-4">
             <h2 className="text-2xl font-bold">
                {activeScenario.title}
                {/* NIEUW: Enhanced indicator */}
                {isEnhanced && (
                  <span className="ml-2 text-sm bg-white/20 px-2 py-1 rounded">
                    Enhanced
                  </span>
                )}
              </h2>
             <button 
                onClick={resetScenario}
                className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            {/* NIEUW: Context beschrijving voor enhanced scenarios */}
            {isEnhanced && activeScenario.contextDescription && (
              <div className="mb-4 p-3 bg-white/10 rounded-lg">
                <p className="text-sm">{activeScenario.contextDescription}</p>
              </div>
            )}
            {/* Role context */}
            {isEnhanced && gameState.role && (
              <div className="mb-4 p-3 bg-white/10 rounded-lg">
                <p className="text-sm font-medium">{gameState.role.description}</p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-lg">Stap {currentStep + 1} van {activeScenario.steps.length}</span>
                <div className="flex gap-1">
                  {activeScenario.steps.map((_, index) => (
                    <div 
                      key={index}
                      className={`w-3 h-3 rounded-full ${index <= currentStep ? 'bg-white' : 'bg-white/30'}`}
                    />
                  ))}
                </div>
              </div>
              
              {/* TIMER ALLEEN TONEN ALS ACCESSIBILITY MODE UIT STAAT */}
              {timeRemaining && !accessibilityMode && (
                <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1">
                  <ClockIcon className="w-4 h-4" />
                  <span className="font-mono">{timeRemaining}s</span>
                </div>
              )}

              {/* ALTERNATIEVE INDICATOR BIJ ACCESSIBILITY MODE */}
              {accessibilityMode && (
                <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1">
                  <span className="text-sm">Geen tijdsdruk</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Question Content */}
          <div className="p-8">
            {!showResults ? (
              <>
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4">{currentStepData.question}</h3>
                  {/* Role considerations */}
                  {isEnhanced && currentStepData.roleConsiderations && currentStepData.roleConsiderations.length > 0 && (
                    <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <h4 className="font-semibold text-purple-800 mb-2">Denk hierbij aan:</h4>
                      <ul className="text-sm text-purple-700 space-y-1">
                        {currentStepData.roleConsiderations.map((consideration, index) => (
                          <li key={index}>• {consideration}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="space-y-3">
                    {currentStepData.options.map(option => (
                      <button
                        key={option.id}
                        onClick={() => handleAnswer(option, currentStepData)}
                        disabled={selectedAnswer}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          selectedAnswer
                            ? selectedAnswer.id === option.id
                              ? option.correct
                                ? 'border-green-500 bg-green-50 text-green-800'
                                : 'border-red-500 bg-red-50 text-red-800'
                              : option.correct
                              ? 'border-green-500 bg-green-50 text-green-800'
                              : 'border-gray-200 bg-gray-50 text-gray-500'
                            : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{option.text}</span>
                          {selectedAnswer && (
                            <div className="ml-4">
                              {option.correct ? (
                                <CheckIcon className="w-5 h-5 text-green-600" />
                              ) : selectedAnswer.id === option.id ? (
                                <XMarkIcon className="w-5 h-5 text-red-600" />
                              ) : null}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                {/* NIEUW: Hint systeem voor enhanced scenarios */}
                  {isEnhanced && currentStepData.hint && shouldShowHints && (
                    <EnhancedUIComponents.HintDisplay
                      hint={currentStepData.hint}
                      showHint={showHints[currentStepData.id]}
                      onToggleHint={() => toggleHint(currentStepData.id)}
                    />
                  )}
                </div>
                
                {selectedAnswer && (
                  <div className={`p-4 rounded-xl ${selectedAnswer.correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <p className={`font-medium ${selectedAnswer.correct ? 'text-green-800' : 'text-red-800'}`}>
                      {selectedAnswer.feedback}
                    </p>
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-1">Uitleg:</h4>
                      <p className="text-blue-700 text-sm">{currentStepData.explanation}</p>
                    </div>
                    {/* NIEUW: Volgende knop */}
                      {showNextButton && (
                        <div className="mt-4 text-center">
                          <button
                            onClick={goToNextStep}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors font-medium"
                          >
                            {currentStep < activeScenario.steps.length - 1 ? 'Volgende Vraag' : 'Toon Resultaten'}
                          </button>
                        </div>
                      )}
                  </div>
                )}
              </>
            ) : (
              <ScenarioResults />
            )}
          </div>
        </div>
        {/* Role Introduction Modal */}
{showRoleIntro && gameState.role && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl p-8 max-w-lg mx-4">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🎭</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Je Rol in dit Scenario</h2>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold text-purple-700 mb-2">{gameState.role.name}</h3>
        <p className="text-gray-600 mb-4">{gameState.role.description}</p>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <h4 className="font-semibold text-purple-800 mb-2">Je Verantwoordelijkheden:</h4>
          <ul className="text-sm text-purple-700 space-y-1">
            {gameState.role.responsibilities.map((resp, index) => (
              <li key={index}>• {resp}</li>
            ))}
          </ul>
        </div>

        {gameState.role.challenges.length > 0 && (
          <div className="bg-orange-50 rounded-lg p-4 mt-3">
            <h4 className="font-semibold text-orange-800 mb-2">Extra Uitdagingen:</h4>
            <ul className="text-sm text-orange-700 space-y-1">
              {gameState.role.challenges.map((challenge, index) => (
                <li key={index}>• {challenge}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleRoleIntroComplete}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
        >
          Start Scenario
        </button>
        <button
          onClick={() => setShowRoleIntro(false)}
          className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Overslaan
        </button>
      </div>
    </div>
  </div>
)}
      </div>
    );
  };

  const ScenarioResults = () => {
    const correctAnswers = Object.values(scenarioResults).filter(r => r.correct).length;
    const totalQuestions = activeScenario.steps.length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    
    return (
      <div className="text-center">
        <div className="mb-8">
          <div className="text-6xl mb-4">
            {score >= 80 ? '🏆' : score >= 60 ? '🥉' : '📚'}
          </div>
          <h3 className="text-2xl font-bold mb-2">Scenario Voltooid!</h3>
          <p className="text-gray-600 mb-4">Je hebt {correctAnswers} van de {totalQuestions} vragen correct beantwoord</p>
          
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl p-6 mb-6">
            <div className="text-4xl font-bold mb-2">{score}%</div>
            <div className="text-lg">
              {score >= 90 ? 'Uitstekend! Je bent klaar voor echte noodsituaties.' :
               score >= 70 ? 'Goed gedaan! Nog wat oefening en je bent er klaar voor.' :
               score >= 50 ? 'Niet slecht, maar meer oefening is nodig.' :
               'Dit scenario vraagt meer studie. Probeer het opnieuw!'}
            </div>
          </div>
        </div>
        
        <div className="space-y-4 mb-8">
          <h4 className="font-bold text-lg">Resultaten per vraag:</h4>
          {activeScenario.steps.map((step, index) => {
            const result = scenarioResults[step.id];
            return (
              <div key={step.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span>Vraag {index + 1}</span>
               <div className="flex items-center gap-2">
                    {!accessibilityMode && (
                        <span className="text-sm text-gray-600">{result?.timeUsed}s</span>
                    )}
                    {result?.correct ? (
                        <CheckIcon className="w-5 h-5 text-green-600" />
                    ) : (
                        <XMarkIcon className="w-5 h-5 text-red-600" />
                    )}
                    </div>
              </div>
            );
          })}
        </div>
        {/* NIEUW: Enhanced insights */}
        {isEnhanced && insights && insights.length > 0 && (
          <div className="mb-8">
            <EnhancedUIComponents.PerformanceInsights insights={insights} />
          </div>
        )}
        {/* Je bestaande action buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => startScenario(activeScenario)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl transition-colors"
          >
            Opnieuw Proberen
          </button>
          <button
            onClick={resetScenario}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl transition-colors"
          >
            Terug naar Overzicht
          </button>
        </div>
      </div>
    );
  };

  const EmergencyTab = () => (
    <div className="space-y-8">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
          <h2 className="text-xl font-bold text-red-800">Echte Noodsituatie?</h2>
        </div>
        <p className="text-red-700 mb-4">
          Als je dit leest tijdens een echte noodsituatie: STOP met lezen en bel onmiddellijk 112!
        </p>
        <a 
          href="tel:112" 
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-colors"
        >
          <PhoneIcon className="w-5 h-5" />
          BEL 112 NU
        </a>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-6">Belangrijke Nummers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {emergencyContacts.map((contact, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{contact.icon}</span>
                <div>
                  <a 
                    href={`tel:${contact.number}`}
                    className="text-2xl font-bold text-blue-600 hover:text-blue-800"
                  >
                    {contact.number}
                  </a>
                </div>
              </div>
              <p className="text-gray-600 text-sm">{contact.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-blue-800 mb-4">Wanneer 112 bellen?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold text-blue-700 mb-2">Levensbedreigende situaties:</h4>
            <ul className="space-y-1 text-blue-600">
              <li>• Bewusteloze persoon</li>
              <li>• Geen ademhaling/hartslag</li>
              <li>• Ernstige bloeding</li>
              <li>• Vermoeden hartaanval</li>
              <li>• Verslikking</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-blue-700 mb-2">Andere noodsituaties:</h4>
            <ul className="space-y-1 text-blue-600">
              <li>• Brand</li>
              <li>• Ernstig ongeval</li>
              <li>• Geweld/bedreiging</li>
              <li>• Persoon in gevaar</li>
              <li>• Bij twijfel: gewoon bellen!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  
const handleScenarioCompletion = async (scenarioId) => {
  if (!profile?.id || !functions) return;
  
  try {
    // Ken 30 XP toe voor EHBO scenario
    const awardEHBOXP = httpsCallable(functions, 'awardEHBOXP');
    await awardEHBOXP({ 
      userId: profile.id, 
      scenarioId: scenarioId,
      xpAmount: 30
    });
    
    toast.success('Scenario voltooid! +30 XP verdiend!');
  } catch (error) {
    console.error('EHBO XP fout:', error);
    // Laat scenario voltooiing niet falen door XP probleem
  }
};

const TheoryTab = () => (
  <div className="space-y-8">
    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-8 text-white">
      <h2 className="text-2xl font-bold mb-4">EHBO Basisprincipes</h2>
      <p className="text-purple-100">
        Leer de fundamentele principes die bij elke noodsituatie gelden
      </p>
    </div>

    {/* Basisprincipes uitgebreid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">🛡️</div>
        <h3 className="text-lg font-bold mb-3">1. Eigen Veiligheid</h3>
        <p className="text-gray-600 text-sm mb-3">
          Altijd eerst controleren of de situatie veilig is. Een dode held helpt niemand.
        </p>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Check verkeer, brand, instorting</li>
          <li>• Gebruik persoonlijke bescherming</li>
          <li>• Roep hulp als onveilig</li>
        </ul>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">📞</div>
        <h3 className="text-lg font-bold mb-3">2. Hulp Oproepen</h3>
        <p className="text-gray-600 text-sm mb-3">
          Bij ernstige situaties altijd 112 bellen. Hoe eerder professionele hulp, hoe beter.
        </p>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Blijf kalm en spreek duidelijk</li>
          <li>• Geef locatie, situatie, aantal gewonden</li>
          <li>• Luister naar instructies</li>
        </ul>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">🤝</div>
        <h3 className="text-lg font-bold mb-3">3. Eerste Hulp</h3>
        <p className="text-gray-600 text-sm mb-3">
          Pas je kennis toe om het slachtoffer te helpen tot professionele hulp arriveert.
        </p>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• ABC: Airway, Breathing, Circulation</li>
          <li>• Kalmeer het slachtoffer</li>
          <li>• Monitor vitale functies</li>
        </ul>
      </div>
    </div>

    {/* Gerestaureerde Reanimatie Keten */}
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-xl font-bold mb-6">De Reanimatie Keten</h3>
      <p className="text-gray-600 mb-4 text-sm">
        De overlevingsketen bij hartstilstand. Elke minuut vertraging vermindert overlevingskans met 10%.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { step: '1', title: 'Herkenning', desc: 'Bewusteloosheid + geen normale ademhaling', icon: '👁️', detail: 'Roep luid, schud schouders. Check 10 sec ademhaling.' },
          { step: '2', title: 'Alarm', desc: '112 bellen + AED halen', icon: '📱', detail: 'Bel zelf of laat anderen bellen. Vraag om AED.' },
          { step: '3', title: 'Reanimatie', desc: '30 borstcompressies + 2 beademingen', icon: '💪', detail: '5-6cm diep, 100-120/min. Volledig loslaten tussen compressies.' },
          { step: '4', title: 'AED', desc: 'Defibrillator zo snel mogelijk', icon: '⚡', detail: 'Volg stemcommandos. Zorg dat niemand het slachtoffer aanraakt.' }
        ].map((item, index) => (
          <div key={index} className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">{item.icon}</span>
            </div>
            <h4 className="font-bold text-red-600 mb-1">Stap {item.step}</h4>
            <h5 className="font-semibold mb-2">{item.title}</h5>
            <p className="text-sm text-gray-600 mb-2">{item.desc}</p>
            <p className="text-xs text-gray-500">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Uitgebreide specifieke scenario's */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">🔥</div>
        <h3 className="text-lg font-bold mb-3">Brandwonden</h3>
        <p className="text-gray-600 text-sm mb-3">
          Koelen met lauw water (15-25°C), 10-20 minuten. Geen ijs, zalf of boter.
        </p>
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong>1e graad:</strong> Rood, pijnlijk (zonnebrend)</p>
          <p><strong>2e graad:</strong> Blaren, zeer pijnlijk</p>
          <p><strong>3e graad:</strong> Wit/zwart, geen pijn</p>
          <p><strong>112 bij:</strong> handpalm, gezicht/hals, 3e graad</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">🐝</div>
        <h3 className="text-lg font-bold mb-3">Anafylaxie</h3>
        <p className="text-gray-600 text-sm mb-3">
          Levensbedreigende allergische reactie. EpiPen direct gebruiken, altijd 112.
        </p>
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong>Symptomen:</strong> Uitslag, zwelling, ademnood, bewusteloosheid</p>
          <p><strong>EpiPen:</strong> Oranje kant in dijspier, 10 sec vasthouden</p>
          <p><strong>Na EpiPen:</strong> Alsnog 112 bellen, tweede dosis mogelijk</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">⚡</div>
        <h3 className="text-lg font-bold mb-3">Epilepsie</h3>
        <p className="text-gray-600 text-sm mb-3">
          Bescherm de persoon, tijd bijhouden. Nooit tegenhouden of mond openen.
        </p>
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong>Tijdens aanval:</strong> Omgeving veilig, tijd bijhouden</p>
          <p><strong>Na aanval:</strong> Stabiele zijligging, rustig praten</p>
          <p><strong>112 bij:</strong> 5 min, eerste aanval, letsel</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">🩸</div>
        <h3 className="text-lg font-bold mb-3">Bloedingen</h3>
        <p className="text-gray-600 text-sm mb-3">
          Eigen bescherming eerst. Directe druk op wond, gewonde deel omhoog.
        </p>
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong>Methode:</strong> Druk  verhoging  extra lagen</p>
          <p><strong>Nooit:</strong> Eerste verband weghalen</p>
          <p><strong>Infectiepreventie:</strong> Handschoenen, geen direct contact</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">🫁</div>
        <h3 className="text-lg font-bold mb-3">Verslikking</h3>
        <p className="text-gray-600 text-sm mb-3">
          Geen geluid = complete blokkering. Rugklappen eerst, dan Heimlich.
        </p>
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong>Herkenning:</strong> Handen aan keel, geen geluid</p>
          <p><strong>Stap 1:</strong> 5 ferme klappen tussen schouderbladen</p>
          <p><strong>Stap 2:</strong> Heimlich manoeuvre (vuist onder borstbeen)</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-4xl mb-4">💔</div>
        <h3 className="text-lg font-bold mb-3">Hartaanval</h3>
        <p className="text-gray-600 text-sm mb-3">
          Drukkende pijn op borst met uitstraling. Onmiddellijk 112, rust en kalmte.
        </p>
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong>Symptomen:</strong> Borstpijn, zweten, misselijkheid</p>
          <p><strong>Houding:</strong> Half rechtop, knieën gebogen</p>
          <p><strong>Niet:</strong> Laten bewegen, aspirine zonder toestemming</p>
        </div>
      </div>
    </div>

    {/* 112 Prioriteiten */}
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-xl font-bold mb-6">Wanneer onmiddellijk 112 bellen?</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-red-600 mb-3">Absoluut levensgevaarlijk (minuten tellen):</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Geen ademhaling of hartslag (reanimatie)</li>
            <li>• Anafylactische shock (EpiPen + 112)</li>
            <li>• Ernstige bloeding (niet te stoppen)</li>
            <li>• Vermoeden hartaanval</li>
            <li>• Bewusteloosheid onbekende oorzaak</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-orange-600 mb-3">Urgent maar meer tijd:</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Epileptische aanval 5 minuten</li>
            <li>• Grote brandwonden (handpalm)</li>
            <li>• Brandwonden gezicht/hals/geslachtsdelen</li>
            <li>• Vermoeden vergiftiging</li>
            <li>• Bij twijfel: altijd bellen!</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

  return (
    <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-6">
        
        {/* Header */}
        <div className="mb-8">
          <Link to="/gezondheid" className="inline-flex items-center text-gray-600 hover:text-emerald-700 mb-6 group">
            <ArrowLeftIcon className="h-5 w-5 mr-2 transition-transform group-hover:-translate-x-1" />
            Terug naar Mijn Gezondheid
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">EHBO & Veiligheid</h1>
              <p className="text-slate-500">Leer levensreddende vaardigheden door interactieve scenario's</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 bg-white rounded-xl p-2 shadow-sm border border-gray-200">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: AcademicCapIcon },
            { id: 'emergency', label: 'Noodcontacten', icon: PhoneIcon },
            { id: 'theory', label: 'Theorie', icon: TrophyIcon }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-emerald-500 text-white' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {!activeScenario && (
          <>
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'emergency' && <EmergencyTab />}
            {activeTab === 'theory' && <TheoryTab />}
          </>
        )}
        
        {activeScenario && <ScenarioView />}
      </div>
    </div>
  );
};

export default EHBODetail;