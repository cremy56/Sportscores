import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowLeftIcon, PlayIcon, PauseIcon, CheckIcon, XMarkIcon, ClockIcon, PhoneIcon, MapPinIcon, ExclamationTriangleIcon, AcademicCapIcon, TrophyIcon, StarIcon } from '@heroicons/react/24/outline';

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
    if (timeRemaining > 0 && activeScenario && !showResults) {
      interval = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && activeScenario) {
      // Time's up
      handleTimeUp();
    }
    return () => clearInterval(interval);
  }, [timeRemaining, activeScenario, showResults]);

  const handleTimeUp = () => {
    setShowResults(true);
  };

  const startScenario = (scenario) => {
    setActiveScenario(scenario);
    setCurrentStep(0);
    setScenarioResults({});
    setShowResults(false);
    setTimeRemaining(scenario.steps[0].timeLimit);
  };

  const handleAnswer = (selectedOption, step) => {
    const newResults = {
      ...scenarioResults,
      [step.id]: {
        selected: selectedOption,
        correct: selectedOption.correct,
        timeUsed: step.timeLimit - timeRemaining
      }
    };
    setScenarioResults(newResults);
    
    // Show immediate feedback
    setTimeout(() => {
      if (currentStep < activeScenario.steps.length - 1) {
        setCurrentStep(currentStep + 1);
        setTimeRemaining(activeScenario.steps[currentStep + 1].timeLimit);
      } else {
        // Scenario completed
        completeScenario(newResults);
      }
    }, 2000);
  };

  const completeScenario = (results) => {
    const correctAnswers = Object.values(results).filter(r => r.correct).length;
    const totalQuestions = activeScenario.steps.length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    
    // Update progress
    if (!userProgress.completedScenarios.includes(activeScenario.id)) {
      setUserProgress(prev => ({
        ...prev,
        completedScenarios: [...prev.completedScenarios, activeScenario.id],
        totalScore: prev.totalScore + score,
        streak: prev.streak + 1
      }));
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

  const Dashboard = () => (
    <div className="space-y-8">
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
              green: 'from-green-500 to-emerald-500'
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
              
              {timeRemaining && (
                <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1">
                  <ClockIcon className="w-4 h-4" />
                  <span className="font-mono">{timeRemaining}s</span>
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
                  <span className="text-sm text-gray-600">{result?.timeUsed}s</span>
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

  const TheoryTab = () => (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-8 text-white">
        <h2 className="text-2xl font-bold mb-4">EHBO Basisprincipes</h2>
        <p className="text-purple-100">
          Leer de fundamentele principes die bij elke noodsituatie gelden
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-4xl mb-4">🛡️</div>
          <h3 className="text-lg font-bold mb-3">1. Eigen Veiligheid</h3>
          <p className="text-gray-600 text-sm">
            Altijd eerst controleren of de situatie veilig is. Een dode held helpt niemand.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-4xl mb-4">📞</div>
          <h3 className="text-lg font-bold mb-3">2. Hulp Oproepen</h3>
          <p className="text-gray-600 text-sm">
            Bij ernstige situaties altijd 112 bellen. Hoe eerder professionele hulp, hoe beter.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-4xl mb-4">🤝</div>
          <h3 className="text-lg font-bold mb-3">3. Eerste Hulp</h3>
          <p className="text-gray-600 text-sm">
            Pas je kennis toe om het slachtoffer te helpen tot professionele hulp arriveert.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-6">De Reanimatie Keten</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: '1', title: 'Herkenning', desc: 'Bewusteloosheid + geen ademhaling', icon: '👁️' },
            { step: '2', title: 'Alarm', desc: '112 bellen + AED halen', icon: '📱' },
            { step: '3', title: 'Reanimatie', desc: '30 borstcompressies + 2 beademingen', icon: '💪' },
            { step: '4', title: 'AED', desc: 'Defibrillator zo snel mogelijk', icon: '⚡' }
          ].map((item, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">{item.icon}</span>
              </div>
              <h4 className="font-bold text-red-600 mb-1">Stap {item.step}</h4>
              <h5 className="font-semibold mb-2">{item.title}</h5>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
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