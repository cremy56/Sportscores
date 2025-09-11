import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowLeftIcon, PlayIcon, PauseIcon, CheckIcon, XMarkIcon, ClockIcon, PhoneIcon, MapPinIcon, ExclamationTriangleIcon, AcademicCapIcon, TrophyIcon, StarIcon } from '@heroicons/react/24/outline';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const EHBODetail = () => {
  const { profile } = useOutletContext();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeScenario, setActiveScenario] = useState(null);
  const [accessibilityMode, setAccessibilityMode] = useState(false);

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
            { id: 'a', text: 'Schudden aan de persoon om te zien of hij/zij reageert', correct: false, feedback: 'Voorzichtig! Eerst zorgen voor je eigen veiligheid.' },
            { id: 'b', text: 'Controleren of de omgeving veilig is', correct: true, feedback: 'Correct! Eigen veiligheid eerst, anders heb je straks twee slachtoffers.' },
            { id: 'c', text: 'Meteen 112 bellen', correct: false, feedback: 'Te vroeg. Eerst controleren wat er aan de hand is.' },
            { id: 'd', text: 'Naar ademhaling luisteren', correct: false, feedback: 'Eerst veiligheid controleren voordat je dichterbij komt.' }
          ],
          timeLimit: 15,
          explanation: 'Bij elke noodsituatie geldt: EIGEN VEILIGHEID EERST. Kijk rond: verkeer, brand, instortingsgevaar, agressieve personen?'
        },
        {
          id: 2,
          question: 'De omgeving is veilig. De persoon reageert niet op aanspreken. Wat nu?',
          options: [
            { id: 'a', text: 'Voorzichtig schudden aan de schouders en luid roepen', correct: true, feedback: 'Correct! Probeer bewustzijn te controleren.' },
            { id: 'b', text: 'Meteen beginnen met hartmassage', correct: false, feedback: 'Te vroeg! Eerst ademhaling controleren.' },
            { id: 'c', text: 'In stabiele zijligging leggen', correct: false, feedback: 'Eerst checken of de persoon ademt.' },
            { id: 'd', text: 'Water in het gezicht gooien', correct: false, feedback: 'Dit kan gevaarlijk zijn en helpt niet bij bewusteloosheid.' }
          ],
          timeLimit: 10,
          explanation: 'Bewustzijn controleren door luid te roepen: "Gaat het? Kun je me horen?" en voorzichtig schudden.'
        },
        {
          id: 3,
          question: 'Geen reactie. Je controleert de ademhaling. De persoon ademt normaal. Wat doe je?',
          options: [
            { id: 'a', text: 'Laten liggen en 112 bellen', correct: false, feedback: 'Risico op verstikking door tong of braaksel!' },
            { id: 'b', text: 'In stabiele zijligging leggen en 112 bellen', correct: true, feedback: 'Perfect! Stabiele zijligging voorkomt verstikking.' },
            { id: 'c', text: 'Rechtop zetten tegen een muur', correct: false, feedback: 'Gevaarlijk voor bewusteloze persoon.' },
            { id: 'd', text: 'Hartmassage beginnen', correct: false, feedback: 'Niet nodig als iemand normaal ademt.' }
          ],
          timeLimit: 12,
          explanation: 'Bewusteloos maar ademend = stabiele zijligging. Dit houdt de luchtwegen vrij.'
        }
      ]
    },
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
            { id: 'a', text: 'De persoon heeft keelpijn', correct: false, feedback: 'Bij keelpijn kan je nog wel praten.' },
            { id: 'b', text: 'Totale verslikking - luchtwegen zijn geblokkeerd', correct: true, feedback: 'Correct! Geen geluid = complete blokkering = levensgevaar!' },
            { id: 'c', text: 'De persoon houdt zich van de domme', correct: false, feedback: 'Neem dit altijd serieus - het kan levensgevaarlijk zijn.' },
            { id: 'd', text: 'Geef wat water te drinken', correct: false, feedback: 'Gevaarlijk! Water kan de verslikking erger maken.' }
          ],
          timeLimit: 8,
          explanation: 'Universeel teken van verslikking: handen aan de keel, geen geluid kunnen maken.'
        },
        {
          id: 2,
          question: 'De persoon staat nog rechtop maar kan niet ademen. Wat doe je?',
          options: [
            { id: 'a', text: '5 ferme klappen tussen de schouderbladen', correct: true, feedback: 'Juist! Begin altijd met rugklappen bij een staande persoon.' },
            { id: 'b', text: 'Meteen de Heimlich manoeuvre', correct: false, feedback: 'Eerst proberen met rugklappen.' },
            { id: 'c', text: 'De persoon op de rug leggen', correct: false, feedback: 'Niet als de persoon nog bij bewustzijn is.' },
            { id: 'd', text: 'Proberen het voorwerp eruit te pulken', correct: false, feedback: 'Gevaarlijk! Je duwt het mogelijk dieper naar binnen.' }
          ],
          timeLimit: 10,
          explanation: 'Bij staande persoon: 5 ferme klappen tussen de schouderbladen met vlakke hand.'
        },
        {
          id: 3,
          question: 'Rugklappen helpen niet. De persoon wordt blauw. Nu?',
          options: [
            { id: 'a', text: 'Blijven proberen met rugklappen', correct: false, feedback: 'Te traag, de persoon heeft zuurstof nodig!' },
            { id: 'b', text: 'Heimlich manoeuvre: vuist onder borstbeen, naar binnen en omhoog duwen', correct: true, feedback: 'Correct! Heimlich kan de verslikking wegpersen.' },
            { id: 'c', text: 'Meteen 112 bellen en wachten', correct: false, feedback: 'Geen tijd! Binnen minuten is er hersenschade.' },
            { id: 'd', text: 'Water geven', correct: false, feedback: 'Gevaarlijk bij verslikking!' }
          ],
          timeLimit: 15,
          explanation: 'Heimlich: sta achter de persoon, vuist onder het borstbeen, krachtig naar binnen en omhoog.'
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
            { id: 'a', text: 'Waarschijnlijk stress, even rusten', correct: false, feedback: 'Deze symptomen zijn klassiek voor een hartaanval!' },
            { id: 'b', text: 'Mogelijk hartaanval - dit is een noodsituatie', correct: true, feedback: 'Correct! Drukkende pijn, uitstraling, zweten = typische hartaanval symptomen.' },
            { id: 'c', text: 'Gewoon indigestie van het eten', correct: false, feedback: 'Combinatie van symptomen wijst op hartprobleem.' },
            { id: 'd', text: 'Spierpijn van sporten', correct: false, feedback: 'Spierpijn straalt niet uit en gaat niet gepaard met zweten/misselijkheid.' }
          ],
          timeLimit: 12,
          explanation: 'Hartaanval symptomen: drukkende pijn op borst, uitstraling naar arm/kaak/rug, zweten, misselijkheid, kortademigheid.'
        },
        {
          id: 2,
          question: 'Je vermoedt een hartaanval. Wat is je EERSTE actie?',
          options: [
            { id: 'a', text: 'De persoon laten gaan wandelen', correct: false, feedback: 'Inspanning is gevaarlijk bij een hartaanval!' },
            { id: 'b', text: 'Meteen 112 bellen', correct: true, feedback: 'Juist! Bij hartaanval telt elke minuut.' },
            { id: 'c', text: 'Aspirine geven', correct: false, feedback: 'Eerst hulpdiensten verwittigen.' },
            { id: 'd', text: 'Proberen te kalmeren met water', correct: false, feedback: 'Eerste prioriteit is professionele hulp.' }
          ],
          timeLimit: 8,
          explanation: 'Bij vermoeden hartaanval: ONMIDDELLIJK 112! Hoe sneller behandeling, hoe meer hartspier gered wordt.'
        },
        {
          id: 3,
          question: '112 is gebeld. Hoe help je de persoon in afwachting van de ambulance?',
          options: [
            { id: 'a', text: 'Laten liggen met benen omhoog', correct: false, feedback: 'Kan ademhaling bemoeilijken.' },
            { id: 'b', text: 'Half rechtop zetten, knieën gebogen, losse kleding', correct: true, feedback: 'Perfect! Deze houding ontlast het hart en vergemakkelijkt ademhaling.' },
            { id: 'c', text: 'Laten rondlopen om bloedsomloop te stimuleren', correct: false, feedback: 'Beweging belast het hart extra!' },
            { id: 'd', text: 'Massage geven om te ontspannen', correct: false, feedback: 'Geen fysieke inspanning, hart moet rust hebben.' }
          ],
          timeLimit: 15,
          explanation: 'Harthouding: half rechtop zitten, knieën licht gebogen, losse kleding. Dit ontlast het hart.'
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
          question: 'Je ziet iemand met een diepe snee in de arm die hevig bloedt. Eerste prioriteit?',
          options: [
            { id: 'a', text: 'Handschoenen aantrekken voor eigen bescherming', correct: true, feedback: 'Juist! Bescherm jezelf altijd tegen bloed en andere lichaamsvloeistoffen.' },
            { id: 'b', text: 'Meteen druk uitoefenen op de wond', correct: false, feedback: 'Eerst jezelf beschermen tegen bloedoverdracht.' },
            { id: 'c', text: 'De arm omhoog houden', correct: false, feedback: 'Eerst beschermingsmiddelen, dan behandeling.' },
            { id: 'd', text: 'Ontsmettingsmiddel zoeken', correct: false, feedback: 'Bij ernstige bloeding eerst de bloeding stoppen!' }
          ],
          timeLimit: 10,
          explanation: 'Eigen veiligheid eerst: handschoenen tegen HIV, Hepatitis en andere overdraagbare ziekten.'
        },
        {
          id: 2,
          question: 'Je bent beschermd. Hoe stop je de bloeding het beste?',
          options: [
            { id: 'a', text: 'Tourniquet aanleggen', correct: false, feedback: 'Alleen bij levensbedreigende bloeding en als je getraind bent.' },
            { id: 'b', text: 'Directe druk op de wond met steriel gaas', correct: true, feedback: 'Correct! Directe druk is de meest effectieve methode.' },
            { id: 'c', text: 'IJsblokjes op de wond', correct: false, feedback: 'Koud kan helpen maar directe druk is effectiever.' },
            { id: 'd', text: 'De wond laten bloeden om te "spoelen"', correct: false, feedback: 'Gevaarlijk! Stop altijd de bloeding zo snel mogelijk.' }
          ],
          timeLimit: 12,
          explanation: 'Directe druk op de wond stopt bloeding het snelst. Gebruik steriel gaas of schone doek.'
        },
        {
          id: 3,
          question: 'De bloeding stopt niet ondanks directe druk. Wat voeg je toe?',
          options: [
            { id: 'a', text: 'Meer druk en het gewonde lichaamsdeel omhoog houden', correct: true, feedback: 'Juist! Verhogen helpt de zwaartekracht mee en vermindert bloedtoevoer.' },
            { id: 'b', text: 'Het verband weghalen om opnieuw te beginnen', correct: false, feedback: 'Nooit! Je verstoort de stolling die al begonnen is.' },
            { id: 'c', text: 'Drukpunt in de lies indrukken', correct: false, feedback: 'Alleen bij extreme situaties en met training.' },
            { id: 'd', text: 'Aspirine geven tegen de pijn', correct: false, feedback: 'Aspirine verdunt het bloed en verergert bloeding!' }
          ],
          timeLimit: 15,
          explanation: 'Bij aanhoudende bloeding: meer druk + omhoog houden + extra lagen verband (zonder de eerste weg te halen).'
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
          question: 'Je vindt iemand bewusteloos. Na veiligheidscheck blijkt de persoon niet te ademen en geen pols te hebben. Wat nu?',
          options: [
            { id: 'a', text: 'Eerst 112 bellen, daarna beginnen met reanimatie', correct: true, feedback: 'Correct! Professionele hulp is cruciaal bij reanimatie.' },
            { id: 'b', text: 'Meteen beginnen met hartmassage zonder te bellen', correct: false, feedback: '112 bellen is essentieel - laat iemand anders dit doen of gebruik speaker.' },
            { id: 'c', text: 'Proberen de persoon wakker te maken', correct: false, feedback: 'De persoon heeft geen hartslag - tijd is cruciaal!' },
            { id: 'd', text: 'Zoeken naar een AED voordat je start', correct: false, feedback: 'Begin direct met hartmassage, laat iemand anders een AED zoeken.' }
          ],
          timeLimit: 10,
          explanation: 'Bij reanimatie: eerst hulp oproepen (112), dan direct starten met hartmassage. Elke seconde telt!'
        },
        {
          id: 2,
          question: 'Je start met hartmassage. Wat is de juiste techniek?',
          options: [
            { id: 'a', text: 'Handpalmen op de borst, armen gestrekt, 100-120 compressies per minuut', correct: true, feedback: 'Perfect! Harde, snelle compressies met volledige ontspanning tussen.' },
            { id: 'b', text: 'Zacht masseren om het hart niet te beschadigen', correct: false, feedback: 'Te zacht! Je moet minstens 5cm diep duwen.' },
            { id: 'c', text: 'Op de maag drukken om de bloedcirculatie te stimuleren', correct: false, feedback: 'Gevaarlijk en nutteloos! Alleen op het borstbeen masseren.' },
            { id: 'd', text: '60 compressies per minuut met lange pauzes', correct: false, feedback: 'Te traag! 100-120 per minuut zonder onderbrekingen.' }
          ],
          timeLimit: 12,
          explanation: 'Hartmassage: onderste helft borstbeen, 5-6cm diep, 100-120/min, volledig loslaten tussen compressies.'
        },
        {
          id: 3,
          question: 'Na 30 compressies moet je beademen. Hoe doe je dit?',
          options: [
            { id: 'a', text: 'Hoofd achterover, kin omhoog, 2 beademingen van 1 seconde', correct: true, feedback: 'Juist! Luchtwegen vrij maken en effectieve beademing geven.' },
            { id: 'b', text: 'Hoofd naar voren, veel lucht in één keer blazen', correct: false, feedback: 'Verkeerd! Hoofd achterover voor vrije luchtwegen.' },
            { id: 'c', text: 'Alleen hartmassage, geen beademing', correct: false, feedback: 'Beademing is belangrijk voor zuurstoftoevoer.' },
            { id: 'd', text: '10 snelle ademhalingen achter elkaar', correct: false, feedback: 'Te veel! 2 effectieve beademingen van 1 seconde elk.' }
          ],
          timeLimit: 15,
          explanation: '30 compressies : 2 beademingen. Hoofd achterover, kin omhoog, neus dichtknijpen, effectieve beademing.'
        }
      ]
    },
    {
      id: 'anafylaxie',
      title: 'Allergische reactie',
      difficulty: 'Moeilijk',
      duration: '3-4 min',
      description: 'Ernstige allergische reactie na bijensteeek',
      image: '🐝',
      color: 'orange',
      steps: [
        {
          id: 1,
          question: 'Iemand wordt gestoken door een bij. Na 5 minuten krijgt diegene uitslag, zwelling en ademnood. Wat gebeurt er?',
          options: [
            { id: 'a', text: 'Normale reactie op een bijensteeek', correct: false, feedback: 'Dit zijn tekenen van een ernstige allergische reactie!' },
            { id: 'b', text: 'Anafylactische shock - levensbedreigende allergische reactie', correct: true, feedback: 'Correct! Snelle systemische reactie die fataal kan zijn.' },
            { id: 'c', text: 'Gewoon even afwachten, gaat vanzelf over', correct: false, feedback: 'Gevaarlijk! Deze symptomen vereisen onmiddellijke actie.' },
            { id: 'd', text: 'Alleen lokale zwelling door het gif', correct: false, feedback: 'Systemische symptomen wijzen op ernstige allergie.' }
          ],
          timeLimit: 10,
          explanation: 'Anafylaxie: snelle allergische reactie met uitslag, zwelling, ademnood, mogelijk bewusteloosheid.'
        },
        {
          id: 2,
          question: 'De persoon heeft moeite met ademen en wordt bleek. Eerste actie?',
          options: [
            { id: 'a', text: 'Onmiddellijk 112 bellen', correct: true, feedback: 'Juist! Anafylaxie is een medisch noodgeval.' },
            { id: 'b', text: 'Antihistamine geven en afwachten', correct: false, feedback: 'Te traag bij anafylaxie! 112 eerst.' },
            { id: 'c', text: 'De angel proberen eruit te halen', correct: false, feedback: 'Niet de prioriteit nu - eerst 112.' },
            { id: 'd', text: 'Water geven om te kalmeren', correct: false, feedback: 'Kan verslikking veroorzaken bij ademnood.' }
          ],
          timeLimit: 8,
          explanation: 'Bij anafylaxie: onmiddellijk 112! Binnen minuten kan het levensgevaarlijk worden.'
        },
        {
          id: 3,
          question: 'De persoon heeft een EpiPen bij zich. Wat doe je?',
          options: [
            { id: 'a', text: 'Wachten tot de ambulance komt', correct: false, feedback: 'Te gevaarlijk! EpiPen kan levens redden.' },
            { id: 'b', text: 'EpiPen in de dijspier, oranje kant eerst, 10 seconden vasthouden', correct: true, feedback: 'Perfect! EpiPen direct gebruiken bij anafylaxie.' },
            { id: 'c', text: 'EpiPen in de arm injecteren', correct: false, feedback: 'Verkeerde plaats! Altijd in de dijspier.' },
            { id: 'd', text: 'Eerst instructies lezen', correct: false, feedback: 'Geen tijd! Bij anafylaxie direct gebruiken.' }
          ],
          timeLimit: 12,
          explanation: 'EpiPen: oranje kant in buitenkant dijspier, door kleding heen, 10 seconden vasthouden.'
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
            { id: 'a', text: 'IJs op de brandwond leggen', correct: false, feedback: 'Gevaarlijk! IJs kan verdere weefselbeschadiging veroorzaken.' },
            { id: 'b', text: 'De brandwond 10-20 minuten koelen met lauw water', correct: true, feedback: 'Correct! Lauw water stopt de verbranding en vermindert pijn.' },
            { id: 'c', text: 'Zalf of boter smeren op de wond', correct: false, feedback: 'Nooit! Dit houdt de hitte vast en vergroot infectierisico.' },
            { id: 'd', text: 'De blaren doorprikken', correct: false, feedback: 'Gevaarlijk! Blaren beschermen tegen infectie.' }
          ],
          timeLimit: 10,
          explanation: 'Brandwonden: eerst koelen met lauw water (15-25°C) gedurende 10-20 minuten.'
        },
        {
          id: 2,
          question: 'Na het koelen zie je dat de brandwond groot is en er veel blaren zijn. Wat nu?',
          options: [
            { id: 'a', text: 'Schone, vochtige doek erop en naar de dokter', correct: true, feedback: 'Juist! Grote brandwonden met blaren vereisen medische zorg.' },
            { id: 'b', text: 'Verband er stevig omheen wikkelen', correct: false, feedback: 'Niet te strak! Zwelling kan circulatie afknijpen.' },
            { id: 'c', text: 'Thuis verzorgen met brandwondenzalf', correct: false, feedback: 'Te risicovol bij grote brandwonden.' },
            { id: 'd', text: 'Aspirine geven tegen de pijn', correct: false, feedback: 'Niet de prioriteit. Eerst naar medische hulp.' }
          ],
          timeLimit: 12,
          explanation: 'Grote brandwonden (>handpalm) of met blaren: medische zorg nodig. Bedekken met schone, vochtige doek.'
        },
        {
          id: 3,
          question: 'Wanneer moet je bij een brandwond 112 bellen?',
          options: [
            { id: 'a', text: 'Alleen bij brandwonden in het gezicht', correct: false, feedback: 'Meer situaties vereisen 112!' },
            { id: 'b', text: 'Bij brandwonden groter dan een handpalm, of op gezicht/hals/geslachtsdelen', correct: true, feedback: 'Correct! Deze lokaties en grote brandwonden zijn gevaarlijk.' },
            { id: 'c', text: 'Nooit, brandwonden kunnen altijd thuis behandeld worden', correct: false, feedback: 'Gevaarlijk! Sommige brandwonden zijn levensbedreigeind.' },
            { id: 'd', text: 'Alleen bij elektrische brandwonden', correct: false, feedback: 'Ook andere ernstige brandwonden vereisen 112.' }
          ],
          timeLimit: 15,
          explanation: '112 bij: brandwonden >handpalm, op gezicht/hals/geslachtsdelen, door elektriciteit, of bij shocksymptomen.'
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
          question: 'Je ziet iemand plotseling vallen en hevig schokken. Wat is dit waarschijnlijk?',
          options: [
            { id: 'a', text: 'Een hartaanval', correct: false, feedback: 'Bij hartaanval geen schokkende bewegingen.' },
            { id: 'b', text: 'Een epileptische aanval', correct: true, feedback: 'Correct! Plots vallen en schokken zijn typisch voor epilepsie.' },
            { id: 'c', text: 'Een beroerte', correct: false, feedback: 'Beroerte toont andere symptomen.' },
            { id: 'd', text: 'Flauwvallen', correct: false, feedback: 'Bij flauwvallen geen schokkende bewegingen.' }
          ],
          timeLimit: 8,
          explanation: 'Epileptische aanval: plotse bewusteloosheid met ritmische schokkende bewegingen.'
        },
        {
          id: 2,
          question: 'De persoon schokt hevig op de grond. Wat doe je NIET?',
          options: [
            { id: 'a', text: 'Tijd bijhouden hoe lang de aanval duurt', correct: false, feedback: 'Dit is juist goed om te doen.' },
            { id: 'b', text: 'Proberen de bewegingen tegen te houden', correct: true, feedback: 'Correct! Nooit proberen iemand tegen te houden tijdens een aanval.' },
            { id: 'c', text: 'Gevaarlijke voorwerpen weghalen', correct: false, feedback: 'Dit is juist belangrijk voor veiligheid.' },
            { id: 'd', text: 'De omgeving veilig maken', correct: false, feedback: 'Dit is essentieel.' }
          ],
          timeLimit: 10,
          explanation: 'NOOIT doen: tegenhouden, iets in de mond stoppen, verplaatsen. WEL: beschermen, tijd bijhouden.'
        },
        {
          id: 3,
          question: 'De aanval stopt na 2 minuten. De persoon is nog verward. Wat nu?',
          options: [
            { id: 'a', text: 'Direct proberen rechtop te zetten', correct: false, feedback: 'Te vroeg! Persoon is nog verward.' },
            { id: 'b', text: 'In stabiele zijligging, rustig praten, ambulance als eerste aanval', correct: true, feedback: 'Perfect! Zijligging voor veilige ademhaling, kalmte en professionele beoordeling.' },
            { id: 'c', text: 'Water geven omdat ze dorst hebben', correct: false, feedback: 'Verslikingsgevaar als nog verward!' },
            { id: 'd', text: 'Stevig vastpakken om te kalmeren', correct: false, feedback: 'Kan angst vergroten. Rustig praten is beter.' }
          ],
          timeLimit: 15,
          explanation: 'Na aanval: stabiele zijligging, kalmerende woorden, 112 bij eerste aanval of aanval >5 minuten.'
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
          question: 'Je controleert de ademhaling (kinlift, kijken, luisteren, voelen) en stelt vast dat er GEEN ademhaling is, maar je voelt WEL een pols. Wat is je prioriteit?',
          options: [
            { id: 'a', text: 'Meteen beginnen met hartmassage (30:2)', correct: false, feedback: 'Niet correct. Het hart klopt nog, het probleem is de zuurstof.' },
            { id: 'b', text: 'Starten met enkel beademing (1 keer per 5-6 seconden)', correct: true, feedback: 'Correct! Dit is een ademhalingsstilstand, geen hartstilstand. Zuurstof toedienen is de prioriteit.' },
            { id: 'c', text: 'De persoon in stabiele zijligging leggen en wachten', correct: false, feedback: 'Gevaarlijk! Zonder ademhaling zal het hart snel stoppen. Je moet ingrijpen.' },
            { id: 'd', text: '112 bellen en niets doen tot de ambulance er is', correct: false, feedback: 'Elke seconde zonder zuurstof telt. Je moet de tijd overbruggen.' }
          ],
          timeLimit: 15,
          explanation: 'Geen ademhaling maar wel een hartslag betekent een ademhalingsstilstand. De behandeling is beademing om de 5-6 seconden om het bloed van zuurstof te voorzien.'
        },
        {
          id: 2,
          question: 'Je geeft beademingen. Hoe controleer je of je beademing effectief is?',
          options: [
            { id: 'a', text: 'Je kijkt of de borstkas omhoog komt', correct: true, feedback: 'Precies! Als de borstkas omhoog komt, weet je dat de lucht in de longen terechtkomt.' },
            { id: 'b', text: 'Je luistert of de persoon begint te hoesten', correct: false, feedback: 'Hoesten is een goed teken, maar geen directe maatstaf voor effectieve beademing.' },
            { id: 'c', text: 'Je voelt of de buik opzwelt', correct: false, feedback: 'Als de buik opzwelt, blaas je lucht in de maag. Controleer de kinlift opnieuw.' },
            { id: 'd', text: 'Je blaast zo hard als je kan', correct: false, feedback: 'Te hard blazen kan longschade veroorzaken. Blaas rustig gedurende 1 seconde.' }
          ],
          timeLimit: 12,
          explanation: 'Een effectieve beademing duurt ongeveer 1 seconde en zorgt ervoor dat de borstkas zichtbaar en rustig omhoog komt.'
        },
        {
          id: 3,
          question: 'Na ongeveer 2 minuten beademen, voel je geen pols meer. Wat doe je nu?',
          options: [
            { id: 'a', text: 'Doorgaan met alleen beademing', correct: false, feedback: 'Niet meer voldoende. De hartslag is nu ook weggevallen.' },
            { id: 'b', text: 'Stoppen en wachten op de ambulance', correct: false, feedback: 'Niet doen! De overlevingskans daalt nu snel.' },
            { id: 'c', text: 'Overschakelen op volledige reanimatie (30 compressies, 2 beademingen)', correct: true, feedback: 'Correct! De situatie is veranderd in een hartstilstand. Volledige reanimatie is nu nodig.' },
            { id: 'd', text: 'De persoon in stabiele zijligging leggen', correct: false, feedback: 'Dit is alleen voor bewusteloze slachtoffers die NORMAAL ademen.' }
          ],
          timeLimit: 15,
          explanation: 'Als de pols wegvalt tijdens beademing, is het een hartstilstand geworden. Start onmiddellijk met de cyclus van 30 borstcompressies en 2 beademingen.'
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
        { id: 'c', text: 'Starten met 5 beademingen', correct: true, feedback: 'Correct! Bij verdrinking is de hartstilstand het gevolg van zuurstoftekort. Eerst zuurstof toedienen is cruciaal.' },
        { id: 'a', text: 'Starten met 30 borstcompressies', correct: false, feedback: 'Bij verdrinking is de procedure net iets anders. Zuurstof is de prioriteit.' },
        { id: 'b', text: 'Proberen water uit de longen te duwen door op de buik te drukken', correct: false, feedback: 'Gevaarlijk en verouderd advies! Dit veroorzaakt braken en verspilt kostbare tijd.' },
        { id: 'd', text: 'De persoon opwarmen met dekens', correct: false, feedback: 'Opwarmen is belangrijk, maar reanimatie heeft absolute voorrang.' }
      ],
      timeLimit: 12,
      explanation: 'De reanimatierichtlijnen voor drenkelingen schrijven voor om te starten met 5 initiële beademingen voordat je met borstcompressies begint.'
    },
    {
      id: 2,
      question: 'Na de 5 beademingen is er geen reactie. Wat is de volgende stap in de reanimatiecyclus?',
      options: [
        { id: 'a', text: 'Nog 5 beademingen geven', correct: false, feedback: 'Nee, na de initiële 5 start je de normale cyclus.' },
        { id: 'b', text: 'Starten met 30 borstcompressies, gevolgd door 2 beademingen', correct: true, feedback: 'Correct! Na de 5 startbeademingen volg je de standaard 30:2 reanimatiecyclus.' },
        { id: 'c', text: 'De persoon in stabiele zijligging leggen', correct: false, feedback: 'Dit is alleen voor slachtoffers die zelfstandig en normaal ademen.' },
        { id: 'd', text: 'Controleren op onderkoeling', correct: false, feedback: 'Reanimatie is levensreddend en heeft altijd voorrang op alles.' }
      ],
      timeLimit: 15,
      explanation: 'Na de 5 initiële beademingen bij een drenkeling, schakel je onmiddellijk over op de standaard reanimatieverhouding van 30 borstcompressies en 2 beademingen.'
    },
    {
      id: 3,
      question: 'Tijdens de borstcompressies komt er water en braaksel uit de mond van het slachtoffer. Wat doe je?',
      options: [
        { id: 'a', text: 'Doorgaan met de compressies en het negeren', correct: false, feedback: 'Gevaarlijk! De luchtweg kan hierdoor blokkeren.' },
        { id: 'b', text: 'Stoppen met de reanimatie', correct: false, feedback: 'Niet stoppen! De hersenen hebben zuurstof nodig.' },
        { id: 'c', text: 'Het hoofd snel opzij draaien om de mond leeg te laten lopen, en daarna doorgaan', correct: true, feedback: 'Perfect! Maak de luchtweg snel vrij door het hoofd te kantelen, veeg de mond leeg indien nodig en ga onmiddellijk verder met de reanimatie.' },
        { id: 'd', text: 'Proberen alles uit de mond te vegen met je vingers', correct: false, feedback: 'Wees voorzichtig met je vingers in de mond te steken. Het hoofd kantelen is de snelste en veiligste manier.' }
      ],
      timeLimit: 12,
      explanation: 'Als de luchtweg geblokkeerd raakt door braaksel of water, draai je het hoofd snel opzij om de mondholte vrij te maken. Ga daarna onmiddellijk verder met de reanimatie.'
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
        { id: 'b', text: 'De wond schoonmaken met stromend water', correct: true, feedback: 'Perfect! Vuil en bacteriën moeten eerst weggespoeld worden met lauw, stromend water.' },
        { id: 'a', text: 'Meteen een pleister erop plakken', correct: false, feedback: 'Niet doen! Je sluit het vuil op, wat tot infecties kan leiden.' },
        { id: 'c', text: 'Ontsmettingsalcohol erop gieten', correct: false, feedback: 'Alcohol kan pijnlijk zijn en weefsel beschadigen. Eerst spoelen met water.' },
        { id: 'd', text: 'De wond laten drogen aan de lucht', correct: false, feedback: 'Eerst moet de wond proper gemaakt worden.' }
      ],
      timeLimit: 10,
      explanation: 'Een vuile wond moet altijd eerst grondig gespoeld worden met proper, lauw water om infecties te voorkomen.'
    },
    {
      id: 2,
      question: 'De wond is schoongespoeld met water. Wat is de volgende logische stap?',
      options: [
        { id: 'a', text: 'Een strak verband aanleggen om het bloeden te stoppen', correct: false, feedback: 'Een schaafwond bloedt meestal niet hevig. Een strak verband is niet nodig.' },
        { id: 'b', text: 'De wond ontsmetten met een niet-prikkend ontsmettingsmiddel', correct: true, feedback: 'Correct! Na het reinigen is ontsmetten de volgende stap om de laatste bacteriën te doden.' },
        { id: 'c', text: 'De wond droogdeppen met wat keukenpapier', correct: false, feedback: 'Keukenpapier kan pluizen en vezels achterlaten in de wond.' },
        { id: 'd', text: 'De wond insmeren met boter of zalf', correct: false, feedback: 'Dit is een fabeltje en kan infecties veroorzaken.' }
      ],
      timeLimit: 12,
      explanation: 'Na het spoelen van de wond, is het belangrijk om deze te ontsmetten met een geschikt product om infecties te voorkomen.'
    },
    {
      id: 3,
      question: 'De wond is proper en ontsmet. Hoe werk je de verzorging af?',
      options: [
        { id: 'a', text: 'De wond open laten aan de lucht om sneller te genezen', correct: false, feedback: 'Een vochtige wondgenezing is beter en een open wond kan opnieuw vuil worden.' },
        { id: 'b', text: 'Afdekken met een steriel kompres of een pleister', correct: true, feedback: 'Juist! Afdekken beschermt de wond tegen vuil, stoten en bacteriën, en bevordert de genezing.' },
        { id: 'c', text: 'De wond bedekken met wat watten', correct: false, feedback: 'Watten kunnen vastkleven in de wond en zijn moeilijk te verwijderen.' },
        { id: 'd', text: 'Er niets meer aan doen', correct: false, feedback: 'Een onbeschermde wond kan gemakkelijk infecteren.' }
      ],
      timeLimit: 10,
      explanation: 'Een propere, ontsmette wond wordt best afgedekt met een steriel verband of pleister om deze te beschermen.'
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
        { id: 'b', text: 'De RICE-methode toepassen: Rust, IJs, Compressie, Elevatie', correct: true, feedback: 'Correct! De RICE-methode is de standaardbehandeling om zwelling en pijn te beperken.' },
        { id: 'a', text: 'De schoen uitdoen en de enkel masseren', correct: false, feedback: 'Massage kan de zwelling verergeren. De schoen aanlaten geeft steun.' },
        { id: 'c', text: 'Proberen verder te stappen om de spieren los te maken', correct: false, feedback: 'Gevaarlijk! Dit kan de blessure veel erger maken.' },
        { id: 'd', text: 'Een warm kompres aanbrengen om de pijn te verlichten', correct: false, feedback: 'Warmte verhoogt de bloedtoevoer en de zwelling. Gebruik altijd koeling (ijs).' }
      ],
      timeLimit: 12,
      explanation: 'Bij een verstuiking pas je de RICE-regel toe: Rust, IJs (koelen), Compressie (drukverband) en Elevatie (omhoog leggen).'
    },
    {
      id: 2,
      question: 'Je past de "I" van RICE toe (IJs). Hoe doe je dit correct?',
      options: [
        { id: 'a', text: 'Een uur lang ijs direct op de huid leggen voor maximaal effect', correct: false, feedback: 'Gevaarlijk! Direct contact en te lang koelen kan vrieswonden veroorzaken.' },
        { id: 'b', text: 'Een ijspack in een doek wikkelen en 15-20 minuten op de enkel leggen', correct: true, feedback: 'Perfect! Nooit direct contact met de huid en koel in intervallen van maximaal 20 minuten.' },
        { id: 'c', text: 'Koud water uit een fles erover gieten', correct: false, feedback: 'Dit is minder effectief dan een ijspack omdat het niet constant koud blijft.' },
        { id: 'd', text: 'Helemaal geen ijs gebruiken, rust is genoeg', correct: false, feedback: 'Koelen is essentieel om de zwelling en pijn te verminderen.' }
      ],
      timeLimit: 12,
      explanation: 'Koel een verstuiking altijd met een ijspack dat in een handdoek of T-shirt is gewikkeld, gedurende maximaal 15 tot 20 minuten per keer.'
    },
    {
      id: 3,
      question: 'Wanneer is het noodzakelijk om met een verstuikte enkel naar een dokter te gaan?',
      options: [
        { id: 'a', text: 'Enkel als de enkel blauw wordt', correct: false, feedback: 'Een blauwe plek is normaal bij een verstuiking, maar niet de enige reden voor een doktersbezoek.' },
        { id: 'b', text: 'Als je helemaal niet meer op de voet kan steunen of een "knak" hebt gehoord', correct: true, feedback: 'Correct! Onmogelijkheid om te steunen of een krakend geluid kan wijzen op een breuk. Dit moet medisch onderzocht worden.' },
        { id: 'c', text: 'Alleen als de pijn na een week niet weg is', correct: false, feedback: 'Bij ernstige symptomen moet je niet een week wachten.' },
        { id: 'd', text: 'Je hoeft nooit naar de dokter voor een verstuiking', correct: false, feedback: 'Onjuist. Soms is een verstuiking eigenlijk een botbreuk.' }
      ],
      timeLimit: 10,
      explanation: 'Raadpleeg een arts als je niet meer op de enkel kan steunen, er een duidelijke misvorming is, je een "knak" hebt gehoord, of de pijn extreem is.'
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
        { id: 'b', text: 'Rechtop zitten met het hoofd licht voorover gebogen', correct: true, feedback: 'Juist! Zo kan het bloed uit de neus lopen en niet in de keel.' },
        { id: 'a', text: 'Hoofd achterover houden om geen bloed te morsen', correct: false, feedback: 'Fout! Het bloed loopt dan de keel in, wat misselijkheid en braken kan veroorzaken.' },
        { id: 'c', text: 'Plat op de rug gaan liggen', correct: false, feedback: 'Gevaarlijk, het bloed kan de luchtwegen instromen.' },
        { id: 'd', text: 'Rondlopen om de bloeddruk te verlagen', correct: false, feedback: 'Rust is beter. Beweging kan de bloeding verergeren.' }
      ],
      timeLimit: 10,
      explanation: 'De juiste houding bij een bloedneus is rechtop zitten en het hoofd licht naar voren buigen.'
    },
    {
      id: 2,
      question: 'Je hebt de juiste houding aangenomen. Wat doe je vervolgens met de neus zelf?',
      options: [
        { id: 'a', text: 'Een watje diep in het bloedende neusgat duwen', correct: false, feedback: 'Niet doen. Bij het verwijderen kan de wonde weer openscheuren.' },
        { id: 'b', text: 'Het harde, benige gedeelte bovenaan de neus dichtknijpen', correct: false, feedback: 'Dit heeft geen effect, de bloeding zit meestal lager in het zachte deel.' },
        { id: 'c', text: 'Het zachte gedeelte van de neusvleugels dichtknijpen', correct: true, feedback: 'Perfect! Knijp de neusvleugels stevig dicht, net onder het neusbeen.' },
        { id: 'd', text: 'Niets, gewoon het bloed laten druppen', correct: false, feedback: 'Door de neus dicht te knijpen help je de bloeding te stoppen.' }
      ],
      timeLimit: 10,
      explanation: 'Knijp het zachte gedeelte van de neus (de neusvleugels) stevig dicht met duim en wijsvinger.'
    },
    {
      id: 3,
      question: 'Hoe lang moet je de neus onafgebroken dichtgeknepen houden?',
      options: [
        { id: 'a', text: 'Slechts 1 minuut', correct: false, feedback: 'Te kort. De bloedstolling heeft meer tijd nodig.' },
        { id: 'b', text: 'Elke 30 seconden controleren of het gestopt is', correct: false, feedback: 'Niet doen! Elke keer dat je loslaat, kan de wonde opnieuw beginnen bloeden.' },
        { id: 'c', text: 'Minstens 10 minuten continu', correct: true, feedback: 'Correct! Houd de druk minstens 10 minuten constant aan zonder los te laten.' },
        { id: 'd', text: 'Tot de ambulance er is', correct: false, feedback: 'Een gewone bloedneus vereist meestal geen ambulance. 10 minuten is de richtlijn.' }
      ],
      timeLimit: 10,
      explanation: 'Houd de druk constant aan gedurende 10 minuten. Controleer pas daarna of de bloeding gestopt is. Zo niet, herhaal.'
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
      question: 'Je bent aan het reanimeren en iemand brengt een AED. Wat is je allereerste stap met het toestel?',
      options: [
        { id: 'b', text: 'Het toestel aanzetten', correct: true, feedback: 'Correct! Stap 1 is altijd het toestel aanzetten. Volg daarna de gesproken instructies.' },
        { id: 'a', text: 'Meteen de elektroden op de borstkas plakken', correct: false, feedback: 'Eerst moet het toestel aan. Het zal je dan zelf instructies geven.' },
        { id: 'c', text: 'De schokknop indrukken', correct: false, feedback: 'Gevaarlijk! De AED moet eerst het hartritme analyseren.' },
        { id: 'd', text: 'Wachten tot de ambulance er is', correct: false, feedback: 'Nee, een AED zo snel mogelijk gebruiken verhoogt de overlevingskans drastisch.' }
      ],
      timeLimit: 10,
      explanation: 'Zodra een AED beschikbaar is, is de eerste stap altijd het toestel aanzetten. Volg daarna nauwgezet de stemcommando\'s.'
    },
    {
      id: 2,
      question: 'De AED instrueert je om de elektroden te bevestigen. Waar plak je ze op de ontblote borstkas van een volwassene?',
      options: [
        { id: 'a', text: 'Allebei naast elkaar in het midden van de borstkas', correct: false, feedback: 'Fout. De elektrische stroom moet door het hart kunnen vloeien.' },
        { id: 'b', text: 'Eén op de linkerschouder en één op de rechterschouder', correct: false, feedback: 'Fout. Dit is te hoog, de stroom zal het hart missen.' },
        { id: 'c', text: 'Eén onder het rechter sleutelbeen en één op de linkerzij, onder de oksel', correct: true, feedback: 'Perfect! Deze diagonale plaatsing zorgt ervoor dat de elektrische schok door het hart gaat.' },
        { id: 'd', text: 'Eén op de buik en één op de rug', correct: false, feedback: 'Dit is de plaatsing voor kinderen, niet voor volwassenen.' }
      ],
      timeLimit: 15,
      explanation: 'De elektroden worden diagonaal over het hart geplakt: één rechtsboven op de borst, de ander linksonder op de zij.'
    },
    {
      id: 3,
      question: 'De AED analyseert en zegt: "Schok aangeraden. Raak de patiënt niet aan." Wat is nu het allerbelangrijkste?',
      options: [
        { id: 'a', text: 'Zo snel mogelijk op de schokknop drukken', correct: false, feedback: 'Bijna! Er is nog één cruciale veiligheidsstap.' },
        { id: 'b', text: 'Doorgaan met borstcompressies tijdens de schok', correct: false, feedback: 'Extreem gevaarlijk! Je zou zelf een elektrische schok krijgen.' },
        { id: 'c', text: 'De kinlift toepassen om de luchtweg open te houden', correct: false, feedback: 'Dan raak je de patiënt aan. Je moet afstand houden.' },
        { id: 'd', text: 'Controleren dat niemand het slachtoffer aanraakt en luid roepen "Iedereen los!"', correct: true, feedback: 'Correct! Veiligheid is cruciaal. Zorg ervoor dat niemand contact maakt met het slachtoffer voordat je de schok toedient.' }
      ],
      timeLimit: 10,
      explanation: 'Voordat je een schok toedient, moet je er absoluut zeker van zijn dat niemand (inclusief jijzelf) het slachtoffer aanraakt om elektrische schokken te voorkomen.'
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
        { id: 'b', text: 'De exacte locatie van het noodgeval', correct: true, feedback: 'Correct! Zelfs als de verbinding wegvalt, weten de hulpdiensten dan waar ze moeten zijn.' },
        { id: 'a', text: 'Je eigen naam', correct: false, feedback: 'Je naam is nuttig, maar de locatie is de absolute prioriteit.' },
        { id: 'c', text: 'Wat er precies gebeurd is', correct: false, feedback: 'Dit is de tweede belangrijkste vraag, maar de locatie komt eerst.' },
        { id: 'd', text: 'Het aantal slachtoffers', correct: false, feedback: 'Ook heel belangrijk, maar komt na de locatie.' }
      ],
      timeLimit: 12,
      explanation: 'De gouden regel bij een noodoproep: begin altijd met de exacte locatie. Geef het adres, de gemeente en eventuele herkenningspunten.'
    },
    {
      id: 2,
      question: 'De operator heeft de locatie. Welke kerninformatie wil hij/zij daarna weten?',
      options: [
        { id: 'a', text: 'Het weer en de verkeerssituatie', correct: false, feedback: 'Dit is niet de prioriteit voor de operator.' },
        { id: 'b', text: 'Wat er gebeurd is, het aantal slachtoffers, en of ze bij bewustzijn zijn', correct: true, feedback: 'Juist! De operator heeft deze informatie nodig om de juiste hulp (politie, brandweer, MUG) en het juiste aantal middelen te sturen.' },
        { id: 'c', text: 'Je persoonlijke mening over de oorzaak van het ongeval', correct: false, feedback: 'Blijf bij de feiten. De operator heeft objectieve informatie nodig.' },
        { id: 'd', text: 'Of je een EHBO-diploma hebt', correct: false, feedback: 'Dit kan nuttig zijn, maar de toestand van het slachtoffer is belangrijker.' }
      ],
      timeLimit: 15,
      explanation: 'Na de locatie, geef je de aard van het noodgeval (ongeval, brand, medisch?), het aantal slachtoffers en hun toestand (bewustzijn, ademhaling).'
    },
    {
      id: 3,
      question: 'Je hebt alle informatie doorgegeven. Wanneer mag je de verbinding verbreken?',
      options: [
        { id: 'a', text: 'Zodra je de sirenes in de verte hoort', correct: false, feedback: 'Niet doen. De operator kan je nog belangrijke instructies geven.' },
        { id: 'b', text: 'Wanneer de operator expliciet zegt dat je mag inhaken', correct: true, feedback: 'Correct! Verbreek nooit zelf de verbinding. De operator kan je aan de lijn houden om je te begeleiden bij de eerste hulp.' },
        { id: 'c', text: 'Na ongeveer 3 minuten, want dan hebben ze genoeg informatie', correct: false, feedback: 'De operator bepaalt wanneer het gesprek eindigt, niet jij.' },
        { id: 'd', text: 'Zodra je het te eng vindt worden', correct: false, feedback: 'Probeer kalm te blijven. De operator is er om je te helpen en te begeleiden.' }
      ],
      timeLimit: 10,
      explanation: 'Verbreek nooit de verbinding met de noodcentrale totdat de operator je daarvoor de toestemming geeft.'
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

    const startScenario = (scenario) => {
    setActiveScenario(scenario);
    setCurrentStep(0);
    setScenarioResults({});
    setShowResults(false);
    // Tijd alleen instellen als accessibility mode uit staat
    setTimeRemaining(accessibilityMode ? null : scenario.steps[0].timeLimit);
  };

  const handleAnswer = (selectedOption, step) => {
    const newResults = {
      ...scenarioResults,
      [step.id]: {
        selected: selectedOption,
        correct: selectedOption.correct,
        // Bij accessibility mode geen tijd bijhouden
        timeUsed: accessibilityMode ? 0 : (step.timeLimit - timeRemaining)
      }
    };
    setScenarioResults(newResults);
    
   // Show immediate feedback
    setTimeout(() => {
      if (currentStep < activeScenario.steps.length - 1) {
        setCurrentStep(currentStep + 1);
        // Tijd alleen instellen als accessibility mode uit staat
        setTimeRemaining(accessibilityMode ? null : activeScenario.steps[currentStep + 1].timeLimit);
      } else {
        completeScenario(newResults);
      }
    }, 2000);
  };

  // in EHBODetail.jsx

  const completeScenario = (results) => {
    const correctAnswers = Object.values(results).filter(r => r.correct).length;
    const totalQuestions = activeScenario.steps.length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    
    if (!userProgress.completedScenarios.includes(activeScenario.id)) {
      setUserProgress(prev => ({
        ...prev,
        completedScenarios: [...prev.completedScenarios, activeScenario.id],
        totalScore: prev.totalScore + score,
        streak: prev.streak + 1
      }));
      
      // Roep de XP functie aan
      handleScenarioCompletion(activeScenario.id);
      
      // --- START WIJZIGING ---
      // Roep de nieuwe functie aan om de voortgang op te slaan
      try {
        const saveProgress = httpsCallable(functions, 'saveEHBOProgress');
        saveProgress({
          userId: profile.id,
          scenarioId: activeScenario.id,
          score: score
        });
      } catch (error) {
        console.error("Opslaan EHBO voortgang mislukt:", error);
      }
      // --- EINDE WIJZIGING ---
    }
    
    setShowResults(true);
  };

  const resetScenario = () => {
    setActiveScenario(null);
    setCurrentStep(0);
    setScenarioResults({});
    setShowResults(false);
    setTimeRemaining(null);
  };
// Header met toegankelijkheidsopties
  const AccessibilityControls = () => (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
      <h3 className="font-semibold text-blue-800 mb-3">Toegankelijkheidsopties</h3>
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={accessibilityMode}
          onChange={(e) => setAccessibilityMode(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
        />
        <div>
          <span className="font-medium text-blue-700">Tijdsdruk uitschakelen</span>
          <p className="text-sm text-blue-600">
            Voor leerlingen met dyslexie of leesmoeilijkheden. Neemt alle tijdslimieten weg.
          </p>
        </div>
      </label>
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
          {/* Header */}
          <div className={`bg-gradient-to-r from-${activeScenario.color}-500 to-${activeScenario.color}-600 p-6 text-white`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">{activeScenario.title}</h2>
              <button 
                onClick={() => setActiveTab('dashboard')}
                className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
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
                  </div>
                )}
              </>
            ) : (
              <ScenarioResults />
            )}
          </div>
        </div>
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