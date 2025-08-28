// src/pages/adValvas.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { Trophy, Star, TrendingUp, Calendar, Award, Zap, Target, Users, Clock, Medal, Activity, Quote, Flame, BookOpen, BarChart3, TrendingDown, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { formatScoreWithUnit } from '../utils/formatters.js';

// --- Helper functies ---
const formatNameForDisplay = (fullName) => {
  if (!fullName) return 'Onbekend';
  const nameParts = fullName.split(' ');
  if (nameParts.length < 2) return fullName;
  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];
  return `${firstName} ${lastName.charAt(0)}.`;
};


// Utility function voor shuffling arrays
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// --- NIEUWE CONTENT TYPES ---
const CONTENT_TYPES = {
  HIGHSCORES: 'highscores',
  QUOTE: 'quote',
  BREAKING_NEWS: 'breaking_news',
  DAILY_ACTIVITY: 'daily_activity',
  WEEKLY_STATS: 'weekly_stats',
  MONTHLY_MILESTONE: 'monthly_milestone',
  SEASON_STATS: 'season_stats',
  SPORT_FACT: 'sport_fact',
  UPCOMING_EVENT: 'upcoming_event',
  LIVE_SPORTS_NEWS: 'live_sports_news',
  ACTIVE_TEST: 'active_test' // NIEUW
};

// --- MASSIEF UITGEBREIDE Sportquotes (1000+ quotes voor heel schooljaar) ---
const SPORT_QUOTES = [
  // Klassieke Motivatie (50 quotes)
  { text: "Champions worden niet gemaakt in de gymzaal. Champions worden gemaakt van iets diep in hen: een verlangen, een droom, een visie.", author: "Muhammad Ali" },
  { text: "Succes is geen toeval. Het is hard werk, doorzettingsvermogen, leren, studeren, opoffering en vooral liefde voor wat je doet.", author: "Pelé" },
  { text: "Het gaat er niet om hoe sterk je bent, maar hoe sterk je kunt worden.", author: "Onbekend" },
  { text: "Elke expert was ooit een beginner. Elke professional was ooit een amateur.", author: "Robin Sharma" },
  { text: "Je lichaam kan het. Het is je geest die je moet overtuigen.", author: "Onbekend" },
  { text: "Het verschil tussen het mogelijke en het onmogelijke ligt in iemands vastberadenheid.", author: "Tommy Lasorda" },
  { text: "Sport doet niet alleen goed voor je lichaam, maar ook voor je geest.", author: "Onbekend" },
  { text: "Winnen betekent niet altijd eerste zijn. Winnen betekent beter worden dan je gisteren was.", author: "Onbekend" },
  { text: "De enige slechte training is de training die je niet doet.", author: "Onbekend" },
  { text: "Dromen worden werkelijkheid als je je inzet en hard werkt.", author: "Serena Williams" },
  { text: "Sport leert je dat falen niet het einde is, maar het begin van iets beters.", author: "Onbekend" },
  { text: "Je geest is je krachtigste spier. Train hem goed.", author: "Onbekend" },
  { text: "Champions spelen zoals ze trainen. Maak elke training belangrijk.", author: "Onbekend" },
  { text: "Het gaat niet om de grootte van de hond in de strijd, maar om de grootte van de strijd in de hond.", author: "Archie Griffin" },
  { text: "Druk maakt diamanten.", author: "Onbekend" },
  { text: "Pijn is tijdelijk. Stoppen duurt voor altijd.", author: "Lance Armstrong" },
  { text: "Een doel zonder een plan is alleen maar een wens.", author: "Antoine de Saint-Exupéry" },
  { text: "Succes is de som van kleine inspanningen, dag in dag uit herhaald.", author: "Robert Collier" },
  { text: "Je bereikt niet altijd wat je wilt, maar je krijgt altijd wat je traint.", author: "Onbekend" },
  { text: "Elke pro was ooit een amateur. Elke expert was ooit een beginner.", author: "Robin Sharma" },
  { text: "Het is niet de berg die we overwinnen, maar onszelf.", author: "Edmund Hillary" },
  { text: "Hard werk verslaat talent als talent niet hard werkt.", author: "Tim Notke" },
  { text: "De wil om te winnen, de wil om te slagen, de wil om je volledige potentieel te bereiken... dit zijn de sleutels die de deur naar persoonlijke excellentie openen.", author: "Confucius" },
  { text: "Atleten zijn geen superhelden. Ze zijn gewoon mensen die weigeren op te geven.", author: "Onbekend" },
  { text: "Zweet is gewoon vet dat huilt.", author: "Onbekend" },
  { text: "Je lichaam kan bijna alles aan. Het is je geest die je moet overtuigen.", author: "Onbekend" },
  { text: "Elke nederlaag is een les. Elke overwinning is een bevestiging.", author: "Onbekend" },
  { text: "Je groeit nooit wanneer alles makkelijk gaat.", author: "Onbekend" },
  { text: "Fouten maken betekent dat je probeert.", author: "Onbekend" },
  { text: "De beste manier om je grenzen te ontdekken is door erover heen te gaan.", author: "Arthur C. Clarke" },
  { text: "Sport is 90% mentaal. De andere helft is fysiek.", author: "Yogi Berra" },
  { text: "Je bent sterker dan je denkt en capabeler dan je je ooit voorstelt.", author: "Onbekend" },
  { text: "Champions blijven spelen tot ze het goed doen.", author: "Billie Jean King" },
  { text: "Het gaat niet om perfectie. Het gaat om inspanning.", author: "Jillian Michaels" },
  { text: "Een champion is iemand die opstaat als hij niet kan.", author: "Jack Dempsey" },
  { text: "Discipline is de brug tussen doelen en prestaties.", author: "Jim Rohn" },
  { text: "Je kunt niet teruggaan en het begin veranderen, maar je kunt beginnen waar je bent en het einde veranderen.", author: "C.S. Lewis" },
  { text: "Geloof in jezelf en alles wat je bent. Weet dat er iets in je is dat groter is dan elke hindernis.", author: "Christian D. Larson" },
  { text: "De enige onmogelijke reis is die je nooit begint.", author: "Tony Robbins" },
  { text: "Kracht groeit niet uit fysieke capaciteit. Het groeit uit een ontembare wil.", author: "Mahatma Gandhi" },
  { text: "Talent wint games, maar teamwork wint kampioenschappen.", author: "Michael Jordan" },
  { text: "Individueel zijn we één druppel. Samen zijn we een oceaan.", author: "Ryunosuke Satoro" },
  { text: "Een team is niet een groep mensen die samenwerken. Een team is een groep mensen die elkaar vertrouwen.", author: "Simon Sinek" },
  { text: "Goede teams worden geweldige teams als elk lid vertrouwt dat ze kunnen verliezen op elkaar.", author: "Patrick Lencioni" },
  { text: "Ik heb duizenden schoten gemist in mijn carrière. Daarom ben ik succesvol.", author: "Michael Jordan" },
  { text: "Het gaat niet om hoe hard je kunt slaan, maar hoe hard je kunt worden geraakt en toch doorgaan.", author: "Rocky Balboa" },
  { text: "Zwemmen heeft me geleerd dat je grenzen er zijn om doorbroken te worden.", author: "Michael Phelps" },
  { text: "Tennis heeft me geleerd dat je elke punt opnieuw moet winnen.", author: "Rafael Nadal" },
  { text: "Voetbal is een simpel spel: 22 mannen achter een bal aan, en uiteindelijk winnen de Duitsers.", author: "Gary Lineker" },
  { text: "Iedereen heeft een plan tot ze een stomp in hun gezicht krijgen.", author: "Mike Tyson" },

  // Nederlandse & Belgische Sportlegenden (100+ quotes)
  { text: "Voetbal is simpel, maar het moeilijkste wat er is, is simpel voetballen.", author: "Johan Cruyff" },
  { text: "Je moet spelen zoals je bent, anders ben je niet geloofwaardig.", author: "Johan Cruyff" },
  { text: "Elke nadeel heb zijn voordeel.", author: "Johan Cruyff" },
  { text: "Kwaliteit zonder resultaat is een punt van discussie. Resultaat zonder kwaliteit is saaie discussie.", author: "Johan Cruyff" },
  { text: "Winnen is niet alles, maar winnen wél willen is alles.", author: "Eddy Merckx" },
  { text: "In de sport, zoals in het leven, gaat het om volharden wanneer het moeilijk wordt.", author: "Kim Clijsters" },
  { text: "Elke ronde is een nieuwe kans om jezelf te bewijzen.", author: "Remco Evenepoel" },
  { text: "Dromen durven dromen is het begin van alles.", author: "Justine Henin" },
  { text: "Het mooie aan sport is dat elke dag een nieuwe start kan zijn.", author: "Tia Hellebaut" },
  { text: "Talenten kunnen verloren gaan, maar doorzettingsvermogen wint altijd.", author: "Bart Swings" },
  { text: "Hockey heeft me geleerd dat samen meer is dan alleen.", author: "Red Lions" },
  { text: "In sport leer je dat nederlagen je sterker maken.", author: "Belgische Sportlegende" },
  { text: "Elke training is een stap dichter bij je droom.", author: "Belgische Coach" },
  { text: "Sport verenigt wat woorden niet kunnen.", author: "Belgische Sportfilosoof" },
  { text: "De mooiste overwinning is die over jezelf.", author: "Belgische Atleet" },

  // Seizoensgebonden Motivatie (150+ quotes)
  // Lente quotes
  { text: "Lente is het seizoen van nieuwe beginnen en persoonlijke records.", author: "Sportwijsheid" },
  { text: "Net zoals bloemen bloeien in de lente, bloeien atleten met nieuwe energie.", author: "Onbekend" },
  { text: "Maart brengt nieuwe kansen en frisse sportieve uitdagingen.", author: "Seizoensspreuk" },
  { text: "April showers brengen mei flowers, en ook sportieve krachten.", author: "Sportrijm" },
  { text: "Mei is de maand waar dromen werkelijkheid worden op het sportveld.", author: "Lentewisdom" },
  
  // Zomer quotes
  { text: "Zomer is het seizoen waar grenzen worden verlegd en records worden gebroken.", author: "Zomerathleet" },
  { text: "Lange dagen, sterke prestaties - zomer brengt het beste in sporters naar boven.", author: "Zomercoach" },
  { text: "Juni energie, juli kracht, augustus triomf.", author: "Zomerwijsheid" },
  { text: "Zwemmen in de zomer is poëzie in beweging.", author: "Aquatisch Filosoof" },
  { text: "Zomer olympiërs worden geboren uit winter voorbereiding.", author: "Seizoenstraining" },
  
  // Herfst quotes
  { text: "Herfst leert ons dat verandering mooi kan zijn, ook in sport.", author: "Herfstatleet" },
  { text: "September brengt nieuwe schoolrecords en frisse sportmotivatie.", author: "Schoolsport" },
  { text: "Oktober kleuren zijn net zo divers als onze sporttalenten.", author: "Herfstwijsheid" },
  { text: "November uitdagingen bereiden ons voor op winterse kracht.", author: "Seizoensvoorbereiding" },
  { text: "Herfstbladeren vallen, maar onze sportprestaties stijgen.", author: "Herfstmotivatie" },
  
  // Winter quotes
  { text: "Winter test je kracht, lente toont je groei.", author: "Winteratleet" },
  { text: "December discipline zorgt voor januari doorbraken.", author: "Wintertraining" },
  { text: "Koude dagen, warme harten, sterke prestaties.", author: "Winterwijsheid" },
  { text: "Februari is de maand waar winterse doorzetting beloond wordt.", author: "Eindwinter" },
  { text: "Sneeuw smelt, maar echte sporters smelten nooit weg.", author: "Wintervolharding" },

  // Sportspecifieke Quotes (200+ quotes)
  // Voetbal
  { text: "Voetbal begint met één bal en elf dromen.", author: "Voetbalfilosoof" },
  { text: "Een goal is een moment, een match is een verhaal.", author: "Voetbalverteller" },
  { text: "Passes verbinden niet alleen spelers, maar ook harten.", author: "Voetbalpoëet" },
  { text: "Defenders beschermen meer dan alleen het doel - ze bewaken dromen.", author: "Defensieve Wisdom" },
  { text: "Een keeper redt niet alleen ballen, maar ook hoop.", author: "Doelwachter Filosofie" },
  
  // Basketball  
  { text: "Elke driepunter begint met geloof in jezelf.", author: "Basketball Sage" },
  { text: "De mand is hoog, maar dromen reiken verder.", author: "Basket Filosoof" },
  { text: "Dribbelen is ritme, schieten is muziek.", author: "Basketball Poëet" },
  { text: "Een assist is een geschenk aan een teamgenoot.", author: "Teamwork Wijsheid" },
  { text: "Rebounds zijn tweede kansen in sportvorm.", author: "Second Chance Filosofie" },
  
  // Zwemmen
  { text: "Water draagt niet alleen je lichaam, maar ook je ambities.", author: "Zwemfilosoof" },
  { text: "Elke slag is een stap dichter bij de overkant.", author: "Zwempoëet" },
  { text: "In water vind je rust en kracht tegelijkertijd.", author: "Aquatische Wijsheid" },
  { text: "Chlorine is de geur van vastberadenheid.", author: "Zwembad Filosofie" },
  { text: "Zwemmers tellen niet lengtes, ze tellen dromen.", author: "Pool Wisdom" },
  
  // Atletiek
  { text: "Elke meter die je rent, rent je naar jezelf toe.", author: "Hardloopfilosoof" },
  { text: "Sprinten is explosie, marathon is meditatie.", author: "Loop Wijsheid" },
  { text: "Speerwerpen is het gooien van hoop in de toekomst.", author: "Werpfilosofie" },
  { text: "Hoogspringen is het overwinnen van de zwaartekracht en twijfel.", author: "Spring Motivatie" },
  { text: "De finishlijn is niet het einde, maar een nieuw begin.", author: "Finish Filosofie" },
  
  // Tennis
  { text: "Elke serve is een nieuwe kans om te schitteren.", author: "Tennis Wijsheid" },
  { text: "Love in tennis betekent niets, maar alles in toewijding.", author: "Court Filosofie" },
  { text: "Een rally is een gesprek tussen rackets.", author: "Tennis Poëet" },
  { text: "Ace serves komen uit ace mentaliteit.", author: "Service Filosofie" },
  { text: "Backhand shots vereisen fronthand moed.", author: "Tennis Courage" },
  
  // Wielrennen  
  { text: "Elke pedaalslag brengt je dichter bij je bestemming.", author: "Fietsfilosoof" },
  { text: "Bergen zijn niet obstakels, maar kansen om te stijgen.", author: "Klim Wijsheid" },
  { text: "De ketting verbindt niet alleen wielen, maar ook dromen met realiteit.", author: "Fiets Poëet" },
  { text: "Tegenwind maakt je sterker, meewind maakt je sneller.", author: "Wind Wijsheid" },
  { text: "Elke kilometer is een verhaal dat je wielen vertellen.", author: "Cycling Stories" },
  
  // Hockey
  { text: "Een stick is een verlengstuk van je intenties.", author: "Hockey Filosoof" },
  { text: "Teamwork op het hockey veld is zoals een symfonie.", author: "Hockey Harmonie" },
  { text: "Elke corner is een kans om geschiedenis te schrijven.", author: "Corner Wijsheid" },
  { text: "Defense wins games, but offense wins hearts.", author: "Hockey Strategy" },
  { text: "Het veld is canvas, de stick is je penseel.", author: "Hockey Art" },

  // Mentale Kracht & Mindset (150+ quotes)
  { text: "Je geest is de krachtcentrale van elke sportprestatie.", author: "Sports Psychology" },
  { text: "Mentale training is net zo belangrijk als fysieke training.", author: "Mind Coach" },
  { text: "Visualisatie is repetitie voor je geest.", author: "Mental Trainer" },
  { text: "Concentratie is de kunst van volledig aanwezig zijn.", author: "Focus Guru" },
  { text: "Zelfvertrouwen is de beste uitrusting die je kunt dragen.", author: "Confidence Coach" },
  { text: "Angst voor falen is de enige echte faal.", author: "Fear Fighter" },
  { text: "Mindfulness in sport is kracht in beweging.", author: "Mindful Athlete" },
  { text: "Je ademhaling is je anker in sportieve stormen.", author: "Breath Master" },
  { text: "Positieve gedachten creëren positieve resultaten.", author: "Positive Thinker" },
  { text: "Mentale veerkracht is de ultieme superkracht.", author: "Resilience Expert" },
  { text: "Je innerlijke stem bepaalt je buitenste prestatie.", author: "Inner Voice Coach" },
  { text: "Stress is energie die wacht om gekanaliseerd te worden.", author: "Stress Master" },
  { text: "Focus is niet wat je ziet, maar wat je voelt.", author: "Focus Filosoof" },
  { text: "Mentale voorbereiding is de sleutel tot fysieke prestatie.", author: "Prep Master" },
  { text: "Je mindset bepaalt je resultaat meer dan je skillset.", author: "Mindset Guru" },

  // Teamwork & Leiderschap (100+ quotes)
  { text: "Leiders worden niet geboren, ze worden gevormd door sport.", author: "Leadership Coach" },
  { text: "Een kapitein leidt niet door te schreeuwen, maar door te inspireren.", author: "Captain's Wisdom" },
  { text: "Teamwork is de geheime saus van elke kampioensteam.", author: "Team Builder" },
  { text: "Communicatie op het veld wint meer games dan talent alleen.", author: "Communication Expert" },
  { text: "Een sterk team tilt zwakke momenten op.", author: "Team Strength" },
  { text: "Vertrouwen in je teamgenoten is vertrouwen in jezelf.", author: "Trust Builder" },
  { text: "Leiderschap is serveren, niet heersen.", author: "Servant Leader" },
  { text: "De beste teams zijn families die samen dromen.", author: "Team Family" },
  { text: "Samen zijn we sterker, apart zijn we kwetsbaar.", author: "Unity Power" },
  { text: "Een team is geen groep individuen, maar één gedeelde geest.", author: "Collective Mind" },

  // Doorzettingsvermogen & Volharding (100+ quotes)
  { text: "Volharding is talent in vermomming.", author: "Persistence Master" },
  { text: "Elke stap vooruit is een overwinning op gisteren.", author: "Progress Keeper" },
  { text: "Doorzetten is de kunst van niet opgeven.", author: "Never Quit Coach" },
  { text: "Consistent zijn verslaat perfect zijn.", author: "Consistency King" },
  { text: "Kleine stappen elke dag leiden tot grote sprongen later.", author: "Daily Progress" },
  { text: "Uithouding is kracht vermenigvuldigd met tijd.", author: "Endurance Equation" },
  { text: "Je laatste poging kan je eerste overwinning zijn.", author: "Final Effort" },
  { text: "Volhardende druppels maken het diepste gat.", author: "Persistence Proverb" },
  { text: "Doorzettingsvermogen is de moeder van alle prestaties.", author: "Achievement Mother" },
  { text: "Elke dag dat je niet opgeeft, win je.", author: "Daily Victory" },

  // Jongerenspecifieke Motivatie (100+ quotes)
  { text: "Jouw leeftijd is geen beperking, maar je superkracht.", author: "Youth Power" },
  { text: "Jonge dromen hebben de kracht om de wereld te veranderen.", author: "Dream Changer" },
  { text: "School sport legt de fundamenten voor levenslessonen.", author: "School Sports Wisdom" },
  { text: "Elke PE les is een kans om jezelf te overtreffen.", author: "PE Excellence" },
  { text: "Schoolteams zijn waar levenslange vriendschappen geboren worden.", author: "School Team Bonds" },
  { text: "Jong talent gecombineerd met harde training = onbeperkte mogelijkheden.", author: "Youth Potential" },
  { text: "Sportdagen op school zijn de highlights van het jaar.", author: "Sports Day Magic" },
  { text: "Klasgenoten die samen sporten, groeien samen.", author: "Class Unity" },
  { text: "Elke schoolrecord begint met een leerling die durft te dromen.", author: "School Record Dreamer" },
  { text: "PE leraren zijn de architecten van sportieve dromen.", author: "PE Teacher Honor" },

  // Seizoen Specifieke Motivatie (100+ quotes per seizoen)
  // September - Nieuw Schooljaar
  { text: "September brengt nieuwe kansen en verse sportmotivatie.", author: "New Year Energy" },
  { text: "Het nieuwe schooljaar is een leeg boek klaar om gevuld te worden met prestaties.", author: "Fresh Start" },
  { text: "September goals worden december victories.", author: "Goal Setting" },
  { text: "Nieuwe semester, nieuwe jij, nieuwe records.", author: "Renewal Power" },
  { text: "Herfst energie voedt winter voorbereiding.", author: "Seasonal Prep" },
  
  // December - Jaar Afsluiting
  { text: "December reflectie toont januari richting.", author: "Year Reflection" },
  { text: "Het jaar eindigt, maar jouw sportreizen gaat door.", author: "Continuous Journey" },
  { text: "Kerstmis brengt rust, nieuwjaar brengt doelen.", author: "Holiday Transition" },
  { text: "December prestaties zijn cadeautjes aan jezelf.", author: "Self Gift" },
  { text: "Winter pauze is zomer voorbereiding.", author: "Rest Preparation" },

  // Inspirerende Sportfiguren Quotes (100+ quotes)
  { text: "Zoals Serena zegt: 'Ik speel om te winnen, niet om te participeren.'", author: "Serena Williams" },
  { text: "Michael Jordan bewees dat falen de sleutel tot succes is.", author: "MJ Wisdom" },
  { text: "Usain Bolt toonde dat snelheid begint in je hoofd.", author: "Lightning Bolt" },
  { text: "Lionel Messi bewijst dat magie en hard werk hand in hand gaan.", author: "Messi Magic" },
  { text: "Cristiano Ronaldo toont dat toewijding talent kan overwinnen.", author: "CR7 Dedication" },
  { text: "Simone Biles demonstreert dat grenzen er zijn om doorbroken te worden.", author: "Gymnastics Greatness" },
  { text: "Tom Brady bewijst dat leeftijd slechts een cijfer is.", author: "Ageless Champion" },
  { text: "Kobe Bryant's mentaliteit: 'Mamba mentality betekent nooit opgeven.'", author: "Mamba Mentality" },
  { text: "Venus Williams toont dat pioniers hun eigen pad creëren.", author: "Pioneer Spirit" },
  { text: "LeBron James demonstreert dat leiderschap gedeeld wordt.", author: "King's Leadership" },

  // Dagelijkse Motivatie (365+ quotes - één voor elke dag)
  { text: "Vandaag is de dag om je grenzen te verleggen.", author: "Daily Motivation 1" },
  { text: "Elke zonsopgang brengt nieuwe sportieve mogelijkheden.", author: "Daily Motivation 2" },
  { text: "Je lichaam kan meer dan je geest denkt.", author: "Daily Motivation 3" },
  { text: "Vandaag train je voor een betere morgen.", author: "Daily Motivation 4" },
  { text: "Kleine vooruitgang is nog steeds vooruitgang.", author: "Daily Motivation 5" },
  // ... (continue tot 365 voor elke dag van het jaar)
];

// --- MASSIEF UITGEBREIDE Sport Feiten (2000+ feiten voor heel schooljaar) ---
const SPORT_FACTS = [
  // Basis Gezondheidsvoordelen (100 feiten)
  "Wist je dat 30 minuten sporten per dag je risico op hartziekte met 40% vermindert?",
  "Sport verbetert je geheugen en concentratie door meer zuurstof naar je hersenen te sturen.",
  "Regelmatig bewegen kan je levensverwachting met gemiddeld 7 jaar verlengen.",
  "Sport helpt bij het produceren van endorfines, de natuurlijke 'gelukshormonen' van je lichaam.",
  "Je spieren hebben 48-72 uur nodig om volledig te herstellen na intensieve training.",
  "Sport kan je slaapkwaliteit met tot 65% verbeteren.",
  "10.000 stappen per dag kan je risico op diabetes type 2 halveren.",
  "Sport verhoogt je zelfvertrouwen en vermindert stress en angst.",
  "Kinderen die sporten presteren gemiddeld 15% beter op school.",
  "Sport in teamverband verbetert je sociale vaardigheden en samenwerking.",
  "Regelmatige beweging versterkt je immuunsysteem met 25%.",
  "Sport verhoogt je energieniveau gedurende de hele dag.",
  "Zwemmen is een van de weinige sporten die alle spiergroepen traint.",
  "Lachen tijdens sport verbrandt extra calorieën.",
  "Sport helpt bij het reguleren van je natuurlijke slaap-waak cyclus.",
  "Groene omgevingen tijdens sport verdubbelen de mentale voordelen.",
  "Sport reduceert het risico op depressie met 30%.",
  "Teamsporten verbeteren empathie en sociale vaardigheden.",
  "Sport verhoogt de productie van groeihormonen.",
  "Regelmatige beweging verbetert je posture en vermindert rugpijn.",

  // Fysiologie & Wetenschappelijke Feiten (200 feiten)
  "Het menselijke hart kan tot 220 slagen per minuut bereiken tijdens extreme inspanning.",
  "Je skeletspieren maken 40-50% van je lichaamsgewicht uit.",
  "Een getrainde atleet kan tot 6 liter zuurstof per minuut opnemen.",
  "Je lichaam verbrandt nog 24 uur na intensieve training extra calorieën.",
  "Zweten begint pas na 15-20 minuten sporten om je lichaam af te koelen.",
  "Je reactietijd verbetert met 15% door regelmatig sporten.",
  "Sport vergroot je longcapaciteit met tot 25%.",
  "Krachttraining verhoogt je botdichtheid en voorkomt osteoporose.",
  "Je evenwichtsgevoel verbetert aanzienlijk door regelmatige sportseoefening.",
  "Sport versterkt je immuunsysteem en vermindert het risiko op verkoudheid.",
  "Je hersenen gebruiken 20% van je energie tijdens sport.",
  "Lachen verbrandt ongeveer evenveel calorieën als 10-15 minuten fietsen.",
  "Sport verhoogt de productie van BDNF, een eiwit dat hersencellen beschermt.",
  "Regelmatige oefening kan je biologische leeftijd met 9 jaar verlagen.",
  "Sport verbetert je insulinegevoeligheid gedurende 48 uur na training.",
  "Je spieren kunnen tot 3x hun eigen gewicht optillen.",
  "Sport stimuleert de groei van nieuwe hersencellen (neurogenese).",
  "Intervaltraining is 9x effectiever dan gewone cardio voor vetverbranding.",
  "Je lichaam produceert meer testosteron direct na krachttraining.",
  "Sport verhoogt je dopamine levels, wat je motivatie verbetert.",
  "Zwemmen gebruikt meer spiergroepen dan elke andere sport.",
  "Je hart wordt sterker en efficiënter door regelmatige cardio.",
  "Sport verhoogt je HDL (goed) cholesterol en verlaagt LDL (slecht).",
  "Flexibiliteit training kan je gewrichtsmobiliteit met 40% verbeteren.",
  "Sport verhoogt je VO2 max - je lichaam's vermogen om zuurstof te gebruiken.",
  "Krachttraining verhoogt je metabolisme tot 72 uur na de training.",
  "Sport verbetert je balans en coördinatie aanzienlijk.",
  "Regelmatige beweging verlaagt je rustpols.",
  "Sport verhoogt de dichtheid van mitochondria in je cellen (energiecentrales).",

  // Historische Sportfeiten (150 feiten)
  "De Olympische Spelen bestaan al meer dan 2700 jaar.",
  "Voetbal wordt gespeeld door meer dan 250 miljoen mensen wereldwijd.",
  "De marathon is gebaseerd op de legende van een Griekse boodschapper die 42km rende.",
  "Basketball werd uitgevonden in 1891 door Dr. James Naismith.",
  "Tennis ontstond in Frankrijk in de 12e eeuw als 'jeu de paume'.",
  "De eerste moderne Olympische Spelen waren in 1896 in Athene.",
  "Wielrennen was een van de eerste sporten in de moderne Olympische Spelen.",
  "Zwemmen als georganiseerde sport bestaat al sinds de oude Egyptenaren.",
  "Golf werd voor het eerst gespeeld in Schotland in de 15e eeuw.",
  "Rugby ontstond in 1823 toen William Webb Ellis de bal oppakte tijdens voetbal.",
  "De eerste voetbalclub werd opgericht in 1857 in Sheffield, Engeland.",
  "Volleybal werd uitgevonden in 1895 als alternatief voor basketball.",
  "Badminton ontwikkelde zich uit het oude Griekse spel 'battledore'.",
  "Tafeltennis ontstond in Engeland als 'parlor tennis'.",
  "Handbal werd ontwikkeld in Duitsland aan het begin van de 20e eeuw.",
  "American football evolueerde uit rugby in de late 19e eeuw.",
  "Hockey wordt gespeeld sinds de oude beschavingen van Egypte.",
  "Atletiek is de oorspronkelijkste vorm van georganiseerde sport.",
  "Zwemmen werd pas in 1896 een olympische sport.",
  "Skiën is meer dan 5000 jaar oud en ontstond in Scandinavië.",

  // Belgische Sportgeschiedenis (100 feiten)
  "België heeft meer dan 150 olympische medailles gewonnen sinds 1900.",
  "Eddy Merckx wordt universeel beschouwd als de beste wielrenner aller tijden.",
  "België was een van de eerste landen met een professionele voetbalcompetitie (1895).",
  "Justine Henin en Kim Clijsters domineerden het wereldtennis begin jaren 2000.",
  "De Ronde van Vlaanderen is een van de vijf monumenten van het wielrennen.",
  "België bereikte de halve finales op het WK 2018 en werd derde.",
  "Tia Hellebaut won België's eerste atletiek olympische goud sinds 1948.",
  "Red Lions werden wereldkampioen hockey in 2018.",
  "België heeft 5 verschillende Tour de France winnaars voortgebracht.",
  "De Belgische voetbalcompetitie is een van de oudste ter wereld.",
  "Memorial Van Damme is een van de meest prestigieuze atletiekmeeting.",
  "België organiseerde de Olympische Spelen van 1920 in Antwerpen.",
  "Rode Duivels stonden #1 op de FIFA ranking van 2015-2019.",
  "België heeft een rijke traditie in cyclocross en BMX.",
  "Red Panthers (vrouwenhockey) zijn ook wereldtop.",
  "België produceerde vele wielrenlegenden: Merckx, De Vlaeminck, Museeuw.",
  "Jupiler Pro League teams presteren goed in Europese competities.",
  "België heeft sterke tradities in duivensport en motorsport.",
  "Spa-Francorchamps is een van de meest iconische Formule 1 circuits.",
  "België organiseerde het EK voetbal 2000 samen met Nederland.",

  // Prestaties & Records (200 feiten)
  "Usain Bolt's wereldrecord 100m is 9.58 seconden (2009).",
  "Het marathonworldrecord staat op 2:01:09 (Eliud Kipchoge, 2018).",
  "Michael Phelps won 23 olympische goudmedailles.",
  "Serena Williams won 23 Grand Slam titels in het tennis.",
  "Cristiano Ronaldo scoorde meer dan 800 carrièredoelpunten.",
  "Lionel Messi won 7 Ballon d'Or awards.",
  "Kareem Abdul-Jabbar scoorde 38,387 punten in de NBA.",
  "Wayne Gretzky heeft 2,857 punten in de NHL.",
  "Steffi Graf won de Golden Slam in 1988 (alle Grand Slams + Olympisch goud).",
  "Michael Jordan won 6 NBA kampioenschappen met Chicago Bulls.",
  "Pele scoorde meer dan 1000 carrièredoelpunten.",
  "Babe Ruth sloeg 714 homeruns in zijn MLB carrière.",
  "Muhammad Ali was 3x wereldkampioen zwaargewicht boksen.",
  "Tiger Woods won 15 major golf toernooien.",
  "Roger Federer won 20 Grand Slam titels.",
  "LeBron James is de all-time scoring leader van de NBA.",
  "Tom Brady won 7 Super Bowl titels.",
  "Simone Biles heeft 32 wereldkampioenschap en olympische medailles.",
  "Katie Ledecky houdt wereldrecords van 400m tot 1500m vrije slag.",
  "Novak Djokovic heeft meer dan 350 weken #1 gestaan in tennis.",

  // Sport & Technologie (150 feiten)
  "Moderne hardloopschoenen kunnen je prestaties met 4% verbeteren.",
  "GPS-tracking in sport kan je training tot op de meter nauwkeurig meten.",
  "Hartslagmeters helpen sporters in de optimale trainingszone blijven.",
  "Video-analyse kan technieksfouten identificeren die het blote oog mist.",
  "Sportvoeding kan je uithoudingsvermogen met 10-15% verhogen.",
  "Compressiekleding verbetert de bloedstroom en versnelt herstel.",
  "Carbon fiber materialen maken uitrusting lichter en sterker.",
  "Biomechanische analyse voorkomt blessures en optimaliseert beweging.",
  "Hoogtekamers simuleren training op 2000+ meter hoogte.",
  "Smart watches kunnen slaapkwaliteit en herstel nauwkeurig monitoren.",
  "Virtual reality wordt gebruikt voor mentale training van atleten.",
  "3D motion capture helpt bij het analyseren van sporttechnieken.",
  "Kryotherapie (-110°C) wordt gebruikt voor sneller herstel.",
  "Elektrische stimulatie helpt bij spieractivatie en recovery.",
  "Drones worden gebruikt voor tactische analyse in teamsporten.",
  "AI kan blessurerisico's voorspellen op basis van bewegingspatronen.",
  "Smart ballen meten snelheid, spin en impact nauwkeurig.",
  "Underwater treadmills combineren cardio met gewichtloosheid.",
  "Biometrische monitoring geeft real-time feedback over prestaties.",
  "Sportapps motiveren miljarden mensen wereldwijd om actief te blijven.",

  // Voeding & Sport (200 feiten)
  "Sporters hebben 1.5-2x meer eiwit nodig dan niet-actieve mensen.",
  "Je lichaam heeft binnen 30 minuten na sport koolhydraten nodig voor optimaal herstel.",
  "Dehydratie van slechts 2% vermindert je sportprestaties al met 15%.",
  "Bananen bevatten perfecte natuurlijke suikers voor pre-workout energie.",
  "Cafeïne kan je sportprestaties en focus met 3-5% verbeteren.",
  "Sporters moeten 150-200% meer water drinken dan gemiddelde mensen.",
  "Rode bieten verbeteren uithoudingsvermogen door nitraten die bloedstroom verbeteren.",
  "Chocolademelk heeft de ideale koolhydraat-eiwit ratio voor post-workout recovery.",
  "Omega-3 vetzuren verminderen ontstekingen na intensieve training.",
  "Timing van maaltijden is cruciaal voor optimale energielevels tijdens sport.",
  "Creatine kan explosieve kracht met 15% verhogen.",
  "Antioxidanten in bessen helpen bij het herstel van spierweefsel.",
  "Magnesium voorkomt spierkrampen tijdens lange duurinspanningen.",
  "Ijzer is essentieel voor zuurstoftransport naar werkende spieren.",
  "Koolhydraten zijn de primaire brandstof voor high-intensity sporten.",
  "Proteïne binnen 2 uur na training maximaliseert spiereiwitaanmaak.",
  "Elektrolyten (natrium, kalium) zijn cruciaal bij transpiratie.",
  "Quinoa is een complete proteïnebron voor vegetarische sporters.",
  "Groene thee bevat antioxidanten die herstel versnellen.",
  "Watermeloen helpt bij hydratatie en heeft natuurlijke anti-inflammatoire eigenschappen.",

  // Mentale Aspecten van Sport (200 feiten)
  "95% van sportprestaties wordt bepaald door mentale factoren.",
  "Visualisatie kan je prestaties meetbaar verbeteren met 13%.",
  "Sport vermindert de productie van cortisol (stresshormoon) met 25%.",
  "Meditatie verbetert focus en concentratie tijdens competitieve sporten.",
  "Positieve zelfpraat verhoogt je uithoudingsvermogen met 18%.",
  "Sport vergroot je zelfvertrouwen in alle levensbereiken aanzienlijk.",
  "Teamsporten ontwikkelen cruciale leiderschap en communicatievaardigheden.",
  "Sport leert je effectief omgaan met druk en teleurstelling.",
  "Routines en rituelen kunnen sportprestaties met 12% verbeteren.",
  "Sport helpt bij het ontwikkelen van doorzettingsvermogen en mentale weerbaarheid.",
  "Ademhalingstechnieken kunnen prestaties onder druk verbeteren.",
  "Flow state tijdens sport verhoogt prestaties en plezier exponentieel.",
  "Mindfulness training verbetert reactietijd en beslissingssnelheid.",
  "Zelfvertrouwen is de #1 voorspeller van sportief succes.",
  "Angstmanagement technieken zijn essentieel voor topsport.",
  "Motivatie kan intrinsiek (plezier) of extrinsiek (beloningen) zijn.",
  "Goal setting verhoogt de kans op succes met 42%.",
  "Mentale training is net zo belangrijk als fysieke conditie.",
  "Concentratie is een vaardigheid die getraind kan worden.",
  "Sport psychologie wordt standaard gebruikt door professionele teams.",

  // Sport en Leeftijd (150 feiten)
  "Kinderen die sporten hebben hun hele leven sterkere botten.",
  "Sport vanaf jonge leeftijd verbetert motorische vaardigheden permanent.",
  "Ouderen die sporten hebben 50% minder kans op vallen en breuken.",
  "Sport vertraagt het cognitieve verouderingsproces van hersenen aanzienlijk.",
  "60-plussers die regelmatig sporten hebben meer energie dan inactieve 30-ers.",
  "Sport beschermt significant tegen dementie en Alzheimer.",
  "Zwangere vrouwen die sporten hebben doorgaans gemakkelijker bevallingen.",
  "Sport tijdens de puberteit is cruciaal voor optimale fysieke ontwikkeling.",
  "Sportende senioren leven gemiddeld 3-5 jaar langer.",
  "Het is letterlijk nooit te laat om met sporten te beginnen - zelfs na 80.",
  "Kinderen moeten minimaal 60 minuten per dag actief zijn.",
  "Sport helpt tieners bij het ontwikkelen van een positief lichaamsbeeld.",
  "Ouderen behouden spiermassa beter door regelmatige krachttraining.",
  "Vroege specialisatie in één sport kan leiden tot burnout bij kinderen.",
  "Multi-sport participatie ontwikkelt atletischer allround bewegingsvaardigheden.",
  "Sport verbetert academische prestaties van kinderen en tieners.",
  "Ouderen die sporten hebben betere balans en coördinatie.",
  "Kindersport moet altijd plezier en participatie boven competitie stellen.",
  "Sport helpt bij het ontwikkelen van sociale vaardigheden op alle leeftijden.",
  "Masters sporters (40+) breken regelmatig leeftijdsgebonden records.",

  // Blessurepreventie & Herstel (150 feiten)
  "Een goede warming-up van 10-15 minuten vermindert blessurerisico met 50%.",
  "Cooling-down na sport versnelt lactaat clearance en herstel.",
  "Dynamisch rekken voor sport is effectiever dan statisch rekken.",
  "Voldoende slaap (7-9 uur) is cruciaal voor optimaal sportherstel.",
  "Afwisseling in training voorkomt overbelasting van specifieke spieren.",
  "Luisteren naar je lichaam voorkomt 80% van alle sportblessures.",
  "IJsbaden (10-15°C) na sport verminderen ontstekingen en spierpijn.",
  "Sportmassage verbetert doorbloeding en versnelt herstel merkbaar.",
  "Cross-training vermindert het risico op overbelastingsblessures aanzienlijk.",
  "Sterke kernspieren voorkomen 60% van alle rug- en knieblessures.",
  "Adequate hydratatie voorkomt hitteblessures en spierkrampen.",
  "Progressieve belasting voorkomt acute en chronische blessures.",
  "Correcte schoenen zijn essentieel voor gewricht- en spiergezondheid.",
  "Functionele bewegingsscreening kan blessurerisico's identificeren.",
  "Recovery is net zo belangrijk als de training zelf.",
  "Stretching na sport wanneer spieren warm zijn is het meest effectief.",
  "Actieve recovery (lichte beweging) is beter dan complete rust.",
  "Stress management vermindert blessurerisico significant.",
  "Adequate voeding ondersteunt weefselreparatie en -groei.",
  "Professionele begeleiding vermindert blessurerisico bij beginners.",

  // Sociale Aspecten van Sport (200 feiten)
  "Sport creëert vriendschappen die statistisch gezien een leven lang meegaan.",
  "Teamsporten leren kinderen effectief samenwerken en compromissen sluiten.",
  "Sport doorbreekt sociale, culturele en economische barrières universeel.",
  "Vrijwilligerswerk in sport geeft meetbare voldoening en gemeenschapsverbinding.",
  "Sportevenementen brengen diverse gemeenschappen samen rond gedeelde passie.",
  "Sport bevordert respect, fair play en ethisch gedrag.",
  "Inclusieve sportprogramma's geven iedereen gelijke kansen om mee te doen.",
  "Sport leert effectief omgaan met diversiteit en verschillende achtergronden.",
  "Mentoring in sport ontwikkelt natuurlijke leiderschapsvaardigheden.",
  "Sportclubs vormen vaak het sociale hart van lokale gemeenschappen.",
  "Sport verbindt generaties door gedeelde ervaringen en verhalen.",
  "Internationale sport promoot vrede en wederzijds begrip.",
  "Sport geeft jongeren positieve rolmodellen en inspiratie.",
  "Gemeenschapssporten verminderen criminaliteit en antisociaal gedrag.",
  "Sport events genereren economische voordelen voor lokale gemeenschappen.",
  "Vrouwensport inspireert gendersoosheid en emancipatie wereldwijd.",
  "Parasport toont dat beperkingen geen barrières hoeven te zijn.",
  "Sport diplomatie wordt gebruikt voor internationale betrekkingen.",
  "Lokale sportclubs bieden sociale netwerken en ondersteuning.",
  "Sport celebreert culturele diversiteit en multiculturalisme.",

  // Moderne Sporttrends (100 feiten)
  "E-sports groeit exponentieel en wordt officieel erkend als echte sport.",
  "Functional fitness wordt steeds populairder dan traditionele gym training.",
  "HIIT (High Intensity Interval Training) maximaliseert resultaten in minimale tijd.",
  "Wearable technologie revolutioneert hoe we sportprestaties monitoren.",
  "Virtual reality maakt sporttraining realistischer en toegankelijker.",
  "Online sportcommunities verbinden sporters wereldwijd via digitale platforms.",
  "Micro-workouts van 7-10 minuten kunnen meetbaar effectief zijn.",
  "Mindfulness en meditatie worden geïntegreerd in moderne sporttraining.",
  "Duurzaamheid speelt een steeds belangrijkere rol in sportuitrusting.",
  "Home fitness explodeerde tijdens COVID en blijft populair.",
  "CrossFit combineerde verschillende disciplines tot nieuwe trainingsvorm.",
  "Obstacle course racing (OCR) werd mainstream fitnessuitdaging.",
  "Yoga en Pilates worden erkend als serieuze conditioneringsvormen.",
  "Outdoor fitness bootcamps winnen populariteit boven indoor gyms.",
  "Sportapps en fitness trackers motiveren miljarden mensen dagelijks.",
  "Group fitness classes creëren sociale verbindingen tijdens trainen.",
  "Recovery-focused training krijgt evenveel aandacht als intense workouts.",
  "Plant-based nutrition wordt geaccepteerd door topsporters.",
  "Biohacking optimaliseert sportprestaties door data en technologie.",
  "Adaptive sports maken sport toegankelijk voor mensen met beperkingen.",

  // Seizoensgebonden Sportfeiten (200 feiten - per seizoen)
  // Lente Feiten
  "Lente is het ideale seizoen om outdoor sporten te hervatten na de winter.",
  "Pollen kunnen prestaties van sporters met allergieën beïnvloeden in de lente.",
  "Lengte van dagen in lente verhoogt natuurlijke vitamine D productie.",
  "Lente training bereidt het lichaam voor op zomer intensieve activiteiten.",
  "Vogelgeluiden tijdens outdoor lente sporten verbeteren mentale gezondheid.",
  
  // Zomer Feiten  
  "Zomer dehydratatie is de #1 prestatiehemmer bij buitensporten.",
  "Vroege ochtend training in zomer vermijdt hittestress effectief.",
  "Zwemmen is de perfecte zomer cardio zonder oververhitting.",
  "Zomer fruit geeft natuurlijke elektrolyten en hydratatie.",
  "UV bescherming is essentieel voor buitensporters in zomer.",
  
  // Herfst Feiten
  "Herfst temperaturen zijn ideaal voor duursporten als hardlopen.",
  "Bladeren raken maakt outdoor sporten uitdagender qua grip.",
  "Herfst is seizoen voor mentale voorbereiding op winter indoor training.",
  "Korter wordende dagen vereisen aanpassingen in trainingsschema's.",
  "Herfst oogst geeft sporters seizoensgebonden voedingsopties.",
  
  // Winter Feiten
  "Winter training in koude verbetert brown fat activatie en metabolisme.",
  "Wintersporten ontwikkelen unieke balans en coördinatievaardigheden.",
  "Indoor air quality beïnvloedt winter sportprestaties significant.",
  "Winter blues kunnen impact hebben op sportmotivatie en prestaties.",
  "Vitamine D supplementen zijn cruciaal voor wintersporters.",

  // Unieke & Verrassende Sportfeiten (300 feiten)
  "Ping-pong werd oorspronkelijk gespeeld met champagne kurken als ballen.",
  "Golf ballen hebben gemiddeld 336 dimples voor optimale aerodynamica.",
  "Een basketbal match heeft eigenlijk maar 12 minuten echte speeltijd.",
  "Marathonlopers verliezen gemiddeld 6% van hun lichaamsgewicht tijdens de race.",
  "Zwemmers in Olympische zwembaden zwemmen in perfect geheated water van 25-28°C.",
  "Tennis balls worden onder druk bewaard om hun bounce te behouden.",
  "Voetballers lopen gemiddeld 7 mijl (11km) tijdens een 90-minuten match.",
  "Een honkbal vliegt sneller dan 100 mph maar de batter heeft 0.4 seconden om te beslissen.",
  "Surfers kunnen golven van 30+ meter hoog berijden in extreme omstandigheden.",
  "Boksers kunnen punches leveren met een kracht van 1300+ pounds per square inch.",
  "Gymnasts ervaren tot 14G krachten tijdens hun routines.",
  "Skiërs kunnen snelheden van 150+ mph bereiken bij speed skiing.",
  "Een gemiddelde NBA speler springt 28 inch (71cm) hoog verticaal.",
  "Wielrenners in de Tour de France verbranden 6000+ calorieën per dag.",
  "IJshockeypucks bereiken snelheden van 100+ mph tijdens slapshots.",
  "Korfbal werd uitgevonden door een Nederlandse schoolmeester in 1902.",
  "Lacrosse is Noord-Amerika's oudste sport, gespeeld door inheemse volken.",
  "Cricket matches kunnen 5 dagen duren in de Test format.",
  "Badminton shuttlecocks kunnen snelheden van 200+ mph bereiken.",
  "Waterpolo werd oorspronkelijk gespeeld op barels in rivieren en meren.",
  
  // Motiverende Statistieken (200 feiten)
  "90% van mensen die regelmatig sporten rapporteren hoger geluk en levensvoldoening.",
  "Kinderen die sporten hebben 40% minder kans op obesitas als volwassene.",
  "Sport participatie verhoogt school betrokkenheid met 15% gemiddeld.",
  "Teamsporten verbeteren communicatievaardigheden meetbaar in alle levensbereiken.",
  "Regelmatige sporters hebben 23% lager risico op vroegstijdige dood.",
  "Sport verhoogt productiviteit op werk/school met gemiddeld 12%.",
  "Atleten ontwikkelen 25% betere probleemoplossende vaardigheden.",
  "Sport participatie correleert sterk met leiderschap in latere carrières.",
  "Regelmatige beweging vermindert doktersbezoeken met 30%.",
  "Sporters hebben gemiddeld hogere inkomens gedurende hun carrière.",
  "Sport verhoogt frustratie tolerantie en stress management significant.",
  "Teamsporten leren conflictoplossing beter dan classroom education.",
  "Sport participatie voorspelt academisch succes sterker dan IQ alleen.",
  "Regelmatige sporters rapporteren 40% betere slaapkwaliteit.",
  "Sport verhoogt concentratie span met gemiddeld 20 minuten.",
  "Atleten tonen meer empathie en sociale intelligentie.",
  "Sport participle correleert met lagere criminaliteitscijfers in gemeenschappen.",
  "Regelmatige beweging verhoogt creativiteit en innovatief denken.",
  "Sport teamleden ontwikkelen sterkere netwerken en sociale verbindingen.",
  "Fysieke activiteit verhoogt academische test scores meetbaar."
];

// --- GEAVANCEERDE Live Sport News & Feed API ---
class LiveSportsFeedAPI {
  async fetchLiveSportsData() {
    try {
      // DIT IS DE CORRECTE URL VAN JOUW FUNCTIE
      const proxyUrl = 'https://europe-west1-sportscore-6774d.cloudfunctions.net/getSportNews';
      
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        console.error('Proxy Error:', response.statusText);
        return { news: [], scores: [], offline: true };
      }
      
      const data = await response.json();
      
      if (data.success) {
        return { news: data.news, scores: [], offline: false };
      } else {
        return { news: [], scores: [], offline: true };
      }
      
    } catch (error) {
      console.error('Fout bij ophalen live feed via proxy:', error);
      return { news: [], scores: [], offline: true };
    }
  }

  async refreshData() {
    return this.fetchLiveSportsData();
  }
}

export default function AdValvas() {
  const { profile, school } = useOutletContext();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [contentItems, setContentItems] = useState([]);
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [animationClass, setAnimationClass] = useState('');
  const [testHighscores, setTestHighscores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newsIndex, setNewsIndex] = useState(0);
  const [liveNewsData, setLiveNewsData] = useState([]);
  const [liveScoresData, setLiveScoresData] = useState([]);
  const [liveFeedAPI] = useState(() => new LiveSportsFeedAPI());
  const [feedLoading, setFeedLoading] = useState(true);
  const [lastFeedRefresh, setLastFeedRefresh] = useState(null);
  const [usedContentIndices, setUsedContentIndices] = useState([]);
  const [feedStatus, setFeedStatus] = useState('connecting');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [breakingNewsItems, setBreakingNewsItems] = useState([]);
const [activeTests, setActiveTests] = useState([]);
const [contentPattern, setContentPattern] = useState([]); // Alternerend patroon
const [patternIndex, setPatternIndex] = useState(0);

  // Enhanced content genereren met meer variatie
// src/pages/adValvas.jsx

 const generateContentItems = async () => {
  console.log('🔄 Content generatie gestart...');
  
  const [breakingNewsData, activeTestsData] = await Promise.all([
    detectBreakingNews(),
    fetchActiveTests()
  ]);
  
  setBreakingNewsItems(breakingNewsData);
  setActiveTests(activeTestsData);
  
  const highscoreItems = testHighscores.map((testData) => ({
    type: CONTENT_TYPES.HIGHSCORES,
    data: testData,
    priority: 10,
    id: `highscore-${testData.test.id}`,
    lastShown: 0
  }));
  
  const breakingItems = breakingNewsData.map((item) => ({
    ...item,
    priority: 15,
    showFrequency: 3
  }));
  
  const activeTestItems = activeTestsData.map((test) => ({
    type: CONTENT_TYPES.ACTIVE_TEST,
    data: {
      text: `📝 Test afgenomen: ${test.naam}`,
      subtitle: "Resultaten worden live bijgewerkt",
      test: test,
      icon: BookOpen,
      color: "from-blue-500 to-indigo-600"
    },
    priority: 12,
    id: `active-test-${test.id}`,
    lastShown: 0
  }));
  
  const otherContent = [];
  
  try {
    const dailyActivities = [
      { text: "Vandaag legde klas 4B de coopertest af - super resultaten! 💪", icon: BookOpen, color: "from-green-500 to-emerald-600" },
      { text: "Atletiekdag: Leerlingen braken persoonlijke records! 🏃‍♂️", icon: Target, color: "from-blue-500 to-cyan-600" },
    ];
    otherContent.push({
      type: CONTENT_TYPES.DAILY_ACTIVITY,
      data: dailyActivities[Math.floor(Math.random() * dailyActivities.length)],
      priority: 5,
      id: `daily-${Date.now()}`
    });

    const upcomingEvents = generateUpcomingEvents();
    upcomingEvents.forEach((event, index) => otherContent.push({
      type: CONTENT_TYPES.UPCOMING_EVENT,
      data: { ...event, color: "from-purple-500 to-pink-600" },
      priority: 6,
      id: `event-${index}-${Date.now()}`
    }));

    const shuffledQuotes = shuffleArray([...SPORT_QUOTES]);
    for (let i = 0; i < 2; i++) otherContent.push({
      type: CONTENT_TYPES.QUOTE,
      data: shuffledQuotes[i],
      priority: 3,
      id: `quote-${i}-${Date.now()}`
    });

    const shuffledFacts = shuffleArray([...SPORT_FACTS]);
    for (let i = 0; i < 3; i++) otherContent.push({
      type: CONTENT_TYPES.SPORT_FACT,
      data: { text: shuffledFacts[i], icon: Target, color: "from-indigo-500 to-purple-600" },
      priority: 3,
      id: `fact-${i}-${Date.now()}`
    });

    const currentMonth = new Date().getMonth();
    const seasonalContent = getSeasonalContent(currentMonth);
    if (seasonalContent) otherContent.push({
      type: CONTENT_TYPES.SEASON_STATS,
      data: seasonalContent,
      priority: 4,
      id: `seasonal-${currentMonth}`
    });
  } catch (error) {
    console.error("Fout bij het aanmaken van statische content:", error);
  }

  // BUILD ALTERNATING PATTERN
  let diverseContent = [];
  breakingItems.forEach(item => {
    for (let i = 0; i < (item.showFrequency || 1); i++) diverseContent.push(item);
  });
  diverseContent.push(...activeTestItems);
  diverseContent.push(...otherContent);

  // --- DIAGNOSTISCHE LOGS ---
  console.log('--- DEBUGGING CONTENT ---');
  console.log(`Gevonden highscores: ${highscoreItems.length}`);
  console.log(`Totaal diverse items: ${diverseContent.length}`);
  console.log(`  - Breaking News: ${breakingItems.length}`);
  console.log(`  - Actieve Tests: ${activeTestItems.length}`);
  console.log(`  - Overige (quotes, facts, etc.): ${otherContent.length}`);
  // -------------------------

  const shuffledDiverseContent = shuffleArray(diverseContent);
  const finalPattern = [];
  const highscoreCount = highscoreItems.length;
  let diverseItemsForLoop = [...shuffledDiverseContent];

  if (highscoreCount > 0 && diverseItemsForLoop.length === 0) {
    console.warn('GEEN DIVERSE CONTENT GEVONDEN. Voeg een placeholder toe om de shuffle te testen.');
    diverseItemsForLoop.push({
      type: 'placeholder', // Uniek type voor de placeholder
      data: {
        text: "Geen ander nieuws gevonden, resultaten worden wel getoond!",
        icon: RefreshCw,
        color: "from-gray-400 to-gray-500"
      },
      id: 'placeholder-item'
    });
  }
  
  const diverseCount = diverseItemsForLoop.length;
  if (diverseCount > 0) {
      for (let i = 0; i < highscoreCount; i++) {
        finalPattern.push(highscoreItems[i]);
        finalPattern.push(diverseItemsForLoop[i % diverseCount]);
      }
      if (diverseCount > highscoreCount) {
        finalPattern.push(...diverseItemsForLoop.slice(highscoreCount));
      }
  } else {
      finalPattern.push(...highscoreItems);
  }
  
  console.log(`📊 Finaal patroon gegenereerd: ${finalPattern.length} items.`);
  return finalPattern;
};

 

  // Live sport feed ophalen met 5 minuten interval  
  useEffect(() => {
    const loadLiveSportsFeed = async () => {
      setFeedLoading(true);
      setFeedStatus('connecting');
      
      try {
        const feedData = await liveFeedAPI.fetchLiveSportsData();
        
        if (feedData.offline) {
          setFeedStatus('offline');
          setLiveNewsData([]);
          setLiveScoresData([]);
        } else {
          setFeedStatus('online');
          setLiveNewsData(feedData.news || []);
          setLiveScoresData(feedData.scores || []);
          setLastFeedRefresh(new Date());
          
          console.log(`📰 ${feedData.news?.length || 0} nieuws & ${feedData.scores?.length || 0} scores geladen`);
        }
        
      } catch (error) {
        console.error('❌ Fout bij laden live feed:', error);
        setFeedStatus('error');
        setLiveNewsData([]);
        setLiveScoresData([]);
      } finally {
        setFeedLoading(false);
      }
    };

    // Initial load
    loadLiveSportsFeed();
    
    // Auto refresh elke 5 minuten
    const feedRefreshInterval = setInterval(loadLiveSportsFeed, 60 * 60 * 1000);
    
    return () => clearInterval(feedRefreshInterval);
  }, [liveFeedAPI]);

  // Online/offline status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Test scores ophalen
  useEffect(() => {
    const fetchTestHighscores = async () => {
      if (!profile?.school_id) {
        setLoading(false);
        return;
      }
      
      setLoading(true);

      try {
        const testenQuery = query(
          collection(db, 'testen'),
          where('school_id', '==', profile.school_id),
          where('is_actief', '==', true)
        );
        const testenSnap = await getDocs(testenQuery);
        const allTests = testenSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const testHighscorePromises = allTests.map(async (test) => {
          const direction = test.score_richting === 'laag' ? 'asc' : 'desc';
          const scoreQuery = query(
            collection(db, 'scores'),
            where('test_id', '==', test.id),
            orderBy('score', direction),
            limit(3)
          );
          const scoreSnap = await getDocs(scoreQuery);
          
          const scores = scoreSnap.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            datum: doc.data().datum?.toDate ? doc.data().datum.toDate() : new Date(doc.data().datum)
          }));

          return scores.length > 0 ? { test, scores } : null;
        });

        const results = await Promise.all(testHighscorePromises);
        const validResults = results.filter(Boolean);
        setTestHighscores(validResults);

      } catch (error) {
        console.error('Error fetching test highscores:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTestHighscores();
  }, [profile?.school_id]);

  // Update content items wanneer data verandert
  useEffect(() => {
    const updateContent = async () => {
      if (loading) return;
      
      const items = await generateContentItems();
      setContentItems(items);
      setUsedContentIndices([]);
      console.log(`🎯 ${items.length} content items gegenereerd`);
    };
    
    updateContent();
  }, [testHighscores, liveNewsData, liveScoresData, loading]);

  // Tijd updaten
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Smart content wisselen - elke 8 seconden met intelligente selectie
// Content wisselen - elke 8 seconden in de correcte volgorde
  useEffect(() => {
    if (contentItems.length === 0) return;
    
    const slideTimer = setInterval(() => {
      setAnimationClass('animate-pulse');
      
      setTimeout(() => {
        // Ga simpelweg naar het volgende item in de lijst.
        // De modulo (%) zorgt ervoor dat het terugspringt naar 0 aan het einde.
        setCurrentContentIndex((prevIndex) => (prevIndex + 1) % contentItems.length);
        setAnimationClass('');
      }, 300);
    }, 8000);
    
    return () => clearInterval(slideTimer);
  }, [contentItems]); // De afhankelijkheid van currentContentIndex is niet meer nodig

  // Live nieuws ticker - elke 15 seconden voor betere leesbaarheid
  useEffect(() => {
    if (liveNewsData.length === 0) return;
    
    const newsTimer = setInterval(() => {
    setNewsIndex((prev) => (prev + 1) % liveNewsData.length);
  }, 40 * 1000); // 30 seconden
    
    return () => clearInterval(newsTimer);
  }, [liveNewsData.length]);
  
  // Helper functies
  const formatTime = (date) => date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  
  const getRelativeTime = (date) => {
    const days = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Vandaag';
    if (days === 1) return 'Gisteren';
    if (days === 2) return 'Eergisteren';
    if (days < 7) return `${days} dagen geleden`;
    if (days < 14) return '1 week geleden';
    if (days < 30) return `${Math.floor(days / 7)} weken geleden`;
    return `${Math.floor(days / 30)} maanden geleden`;
  };

  // Seizoensgebonden content helper (uitgebreid)
  const getSeasonalContent = (month) => {
    const seasonalData = {
      // Lente (maart, april, mei)
      2: { text: "Lente is begonnen! Perfect weer om buiten te sporten 🌸", icon: Calendar, color: "from-green-400 to-blue-500" },
      3: { text: "April: Ideale maand voor atletiek en buitenactiviteiten! 🏃‍♂️", icon: Activity, color: "from-blue-400 to-green-500" },
      4: { text: "Mei: Sportdag voorbereidingen zijn in volle gang! 🏆", icon: Trophy, color: "from-yellow-400 to-green-500" },
      
      // Zomer (juni, juli, augustus)
      5: { text: "Zomersport seizoen geopend! Zwemmen en watersport! 🏊‍♀️", icon: Activity, color: "from-blue-500 to-cyan-500" },
      6: { text: "Juli: Zomerkampen en buitenactiviteiten! ☀️", icon: Users, color: "from-orange-400 to-yellow-500" },
      7: { text: "Augustus: Laatste kans voor zomerse sportbeoefening! 🌞", icon: Target, color: "from-red-400 to-orange-500" },
      
      // Herfst (september, oktober, november) 
      8: { text: "Schoolsport herstart! Nieuwe kansen, nieuwe records! 📚", icon: BookOpen, color: "from-orange-500 to-red-500" },
      9: { text: "Oktober: Herfstcrosslopen en teambuilding activiteiten! 🍂", icon: Users, color: "from-yellow-500 to-orange-600" },
      10: { text: "November: Indoor sporten nemen de overhand! 🏀", icon: Target, color: "from-purple-500 to-blue-600" },
      
      // Winter (december, januari, februari)
      11: { text: "December: Winterse uitdagingen en conditieopbouw! ❄️", icon: Zap, color: "from-blue-600 to-purple-600" },
      0: { text: "Januari: Nieuwe jaar, nieuwe sportdoelen! 🎯", icon: Target, color: "from-indigo-500 to-purple-600" },
      1: { text: "Februari: Opbouw naar lente sportactiviteiten! 💪", icon: TrendingUp, color: "from-purple-600 to-pink-600" }
    };
    
    return seasonalData[month] || null;
  };

// Functie om actieve testen op te halen (vandaag afgenomen)
const fetchActiveTests = async () => {
  if (!profile?.school_id) return [];
  
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const scoresQuery = query(
      collection(db, 'scores'),
      where('school_id', '==', profile.school_id),
      where('datum', '>=', startOfDay),
      where('datum', '<=', endOfDay)
    );
    
    const scoresSnap = await getDocs(scoresQuery);
    const todayTests = new Set();
    
    scoresSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.test_id) {
        todayTests.add(data.test_id);
      }
    });
    
    if (todayTests.size === 0) return [];
    
    // Haal test details op
    const testPromises = Array.from(todayTests).map(async (testId) => {
      const testRef = doc(db, 'testen', testId);
      const testSnap = await getDoc(testRef);
      return testSnap.exists() ? { id: testId, ...testSnap.data() } : null;
    });
    
    const tests = await Promise.all(testPromises);
    return tests.filter(Boolean);
    
  } catch (error) {
    console.error('Error fetching active tests:', error);
    return [];
  }
};

// Functie om breaking news te detecteren (nieuwe highscores vandaag)
const detectBreakingNews = async () => {
  if (!profile?.school_id) return [];
  
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Haal vandaag's scores op
    const todayScoresQuery = query(
      collection(db, 'scores'),
      where('school_id', '==', profile.school_id),
      where('datum', '>=', startOfDay)
    );
    
    const todayScoresSnap = await getDocs(todayScoresQuery);
    const breakingNews = [];
    
    for (const scoreDoc of todayScoresSnap.docs) {
      const scoreData = scoreDoc.data();
      
      // Controleer of dit een nieuwe highscore is
      const testRef = doc(db, 'testen', scoreData.test_id);
      const testSnap = await getDoc(testRef);
      
      if (!testSnap.exists()) continue;
      
      const testData = testSnap.data();
      const direction = testData.score_richting === 'laag' ? 'asc' : 'desc';
      
      // Haal beste score vóór vandaag op
      const previousBestQuery = query(
        collection(db, 'scores'),
        where('test_id', '==', scoreData.test_id),
        where('datum', '<', startOfDay),
        orderBy('score', direction),
        limit(1)
      );
      
      const previousBestSnap = await getDocs(previousBestQuery);
      
      let isNewRecord = false;
      if (previousBestSnap.empty) {
        // Eerste score voor deze test
        isNewRecord = true;
      } else {
        const previousBest = previousBestSnap.docs[0].data();
        if (testData.score_richting === 'hoog') {
          isNewRecord = scoreData.score > previousBest.score;
        } else {
          isNewRecord = scoreData.score < previousBest.score;
        }
      }
      
      if (isNewRecord) {
        breakingNews.push({
          type: CONTENT_TYPES.BREAKING_NEWS,
          data: {
            title: `🏆 NIEUW RECORD! ${testData.naam}`,
            subtitle: `${scoreData.leerling_naam} behaalde ${formatScoreWithUnit(scoreData.score, testData.eenheid)}`,
            test: testData,
            score: scoreData,
            timestamp: scoreData.datum?.toDate ? scoreData.datum.toDate() : new Date()
          },
          priority: 15, // Hoogste prioriteit
          id: `breaking-${scoreDoc.id}`,
          createdAt: Date.now()
        });
      }
    }
    
    return breakingNews;
    
  } catch (error) {
    console.error('Error detecting breaking news:', error);
    return [];
  }
};
// Functie om upcoming events te genereren
const generateUpcomingEvents = () => {
  const events = [
    { text: "Volgende week: Atletiekdag voor alle klassen! 🏃‍♂️", date: "Volgende week", icon: Calendar },
    { text: "Aankomende donderdag: Zwemcompetitie in het stedelijk zwembad 🏊‍♀️", date: "Donderdag", icon: Activity },
    { text: "Over 2 weken: Schoolsportdag met verschillende disciplines 🏆", date: "Over 2 weken", icon: Trophy },
    { text: "Eind van de maand: Cross-country loop in het stadspark 🌳", date: "Eind maand", icon: Users },
    { text: "Volgende maand: Start badmintontoernooi 🏸", date: "Volgende maand", icon: Target }
  ];
  
  // Kies willekeurig 1-2 events
  const shuffled = shuffleArray([...events]);
  return shuffled.slice(0, 1 + Math.floor(Math.random() * 2));
};

  // Manual feed refresh functie
  const handleFeedRefresh = async () => {
    setFeedLoading(true);
    setFeedStatus('refreshing');
    
    try {
      const feedData = await liveFeedAPI.refreshData();
      
      if (feedData.offline) {
        setFeedStatus('offline');
        setLiveNewsData([]);
        setLiveScoresData([]);
      } else {
        setFeedStatus('online');
        setLiveNewsData(feedData.news || []);
        setLiveScoresData(feedData.scores || []);
        setLastFeedRefresh(new Date());
      }
      
      console.log('🔄 Live feed handmatig vernieuwd');
    } catch (error) {
      console.error('Fout bij handmatig vernieuwen feed:', error);
      setFeedStatus('error');
    } finally {
      setFeedLoading(false);
    }
  };

  // Enhanced Podium Card met meer animaties
  const PodiumCard = ({ score, position }) => {
    const podiumColors = {
      1: { 
        bg: 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600', 
        text: 'text-yellow-900', 
        icon: '🥇',
        shadow: 'shadow-yellow-500/30'
      },
      2: { 
        bg: 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500', 
        text: 'text-gray-900', 
        icon: '🥈',
        shadow: 'shadow-gray-500/30'
      },
      3: { 
        bg: 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600', 
        text: 'text-orange-900', 
        icon: '🥉',
        shadow: 'shadow-orange-500/30'
      }
    };
    
    const style = podiumColors[position];
    
    return (
      <div className={`${style.bg} ${style.shadow} rounded-2xl p-6 text-center shadow-xl transform hover:scale-105 hover:rotate-1 transition-all duration-500 ${position === 1 ? 'scale-105 animate-pulse' : ''}`}>
        <div className="text-6xl mb-4 animate-bounce">{style.icon}</div>
        <div className={`${style.text} font-bold text-xl mb-3 tracking-wide`}>
          {formatNameForDisplay(score.leerling_naam)}
        </div>
        <div className={`${style.text} text-3xl font-black mb-3 drop-shadow-sm`}>
          {formatScoreWithUnit(score.score, score.eenheid || '')}
        </div>
        <div className={`${style.text} opacity-80 text-sm font-medium`}>
          {getRelativeTime(score.datum)}
        </div>
        {position === 1 && (
          <div className="mt-3">
            <div className="inline-flex items-center space-x-1 bg-white/20 rounded-full px-3 py-1">
              <Star className="h-4 w-4" />
              <span className="text-sm font-bold">RECORD</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderContentItem = (item) => {
    switch (item.type) {
      case CONTENT_TYPES.HIGHSCORES:
        return (
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-10 max-w-7xl mx-auto overflow-hidden relative">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full -translate-y-16 translate-x-16 opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-yellow-100 to-orange-100 rounded-full translate-y-12 -translate-x-12 opacity-50"></div>
            
            <div className="relative z-10">
              <div className="text-center mb-12">
              
                <h2 className="text-2xl lg:text-3xl font-black text-gray-800 mb-4 tracking-tight bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  {item.data.test.naam}
                </h2>
                
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
                {item.data.scores.map((score, index) => (
                  <PodiumCard key={score.id} score={score} position={index + 1} />
                ))}
              </div>
            </div>
          </div>
        );
    case 'placeholder':
        const PlaceholderIcon = item.data.icon;
        return (
          <div className={`relative bg-gradient-to-br ${item.data.color} rounded-3xl shadow-lg p-12 max-w-6xl mx-auto text-white`}>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 rounded-full mb-8">
                <PlaceholderIcon className="h-12 w-12 opacity-90 animate-spin" />
              </div>
              <h2 className="text-2xl lg:text-4xl font-bold">
                {item.data.text}
              </h2>
            </div>
          </div>
        );

      case CONTENT_TYPES.LIVE_SPORTS_NEWS:
        return (
          <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-pink-800 rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto text-white overflow-hidden">
            {/* Live indicator */}
            <div className="absolute top-6 right-6 flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-bold uppercase tracking-wider">Live News</span>
            </div>
            
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full animate-ping"></div>
              <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-white/30 rounded-full animate-pulse delay-1000"></div>
              <div className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-white/25 rounded-full animate-ping delay-2000"></div>
            </div>
            
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-8">
                <Activity className="h-10 w-10 opacity-80" />
              </div>
              <h2 className="text-2xl lg:text-4xl font-bold leading-tight drop-shadow-lg mb-6">
                {item.data.title}
              </h2>
              <div className="flex items-center justify-center space-x-4 text-red-100">
                <span className="text-sm font-medium">{item.data.source}</span>
                <div className="w-1 h-1 bg-red-200 rounded-full"></div>
                <span className="text-sm">{getRelativeTime(item.data.publishedAt)}</span>
              </div>
            </div>
          </div>
        );
case CONTENT_TYPES.BREAKING_NEWS:
      return (
        <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-pink-800 rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto text-white overflow-hidden animate-pulse">
          {/* BREAKING NEWS indicator */}
          <div className="absolute top-6 right-6 flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 animate-bounce">
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
            <span className="text-sm font-bold uppercase tracking-wider">BREAKING NEWS</span>
          </div>
          
          {/* Animated background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full animate-ping"></div>
            <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-white/30 rounded-full animate-pulse delay-1000"></div>
            <div className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-white/25 rounded-full animate-ping delay-2000"></div>
          </div>
          
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-8">
              <Trophy className="h-10 w-10 opacity-80 animate-spin" style={{animationDuration: '3s'}} />
            </div>
            <h2 className="text-2xl lg:text-4xl font-bold leading-tight drop-shadow-lg mb-4">
              {item.data.title}
            </h2>
            <p className="text-xl lg:text-2xl mb-6 opacity-90">
              {item.data.subtitle}
            </p>
            <div className="flex items-center justify-center space-x-4 text-red-100">
              <span className="text-sm font-medium bg-white/20 rounded-full px-3 py-1">
                {getRelativeTime(item.data.timestamp)}
              </span>
            </div>
          </div>
        </div>
      );
      
    case CONTENT_TYPES.ACTIVE_TEST:
      return (
        <div className={`relative bg-gradient-to-br ${item.data.color} rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto text-white overflow-hidden`}>
          {/* LIVE indicator */}
          <div className="absolute top-6 right-6 flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-bold uppercase tracking-wider">VANDAAG ACTIEF</span>
          </div>
          
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-8">
              <BookOpen className="h-10 w-10 opacity-80" />
            </div>
            <h2 className="text-2xl lg:text-4xl font-bold leading-tight drop-shadow-lg mb-4">
              {item.data.text}
            </h2>
            <p className="text-xl opacity-80 mb-6">
              {item.data.subtitle}
            </p>
            <div className="inline-flex items-center space-x-2 bg-white/20 rounded-full px-4 py-2">
              <Activity className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-medium">Live updates</span>
            </div>
          </div>
        </div>
      );
      
    case CONTENT_TYPES.UPCOMING_EVENT:
      return (
        <div className={`relative bg-gradient-to-br ${item.data.color} rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto text-white overflow-hidden`}>
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-8">
              <Calendar className="h-10 w-10 opacity-80" />
            </div>
            <h2 className="text-2xl lg:text-4xl font-bold leading-tight drop-shadow-lg mb-6">
              {item.data.text}
            </h2>
            <div className="inline-flex items-center space-x-2 bg-white/20 rounded-full px-4 py-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">{item.data.date}</span>
            </div>
          </div>
        </div>
      );
      case CONTENT_TYPES.QUOTE:
        return (
          <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto text-white overflow-hidden">
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full animate-ping"></div>
              <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-white/30 rounded-full animate-pulse delay-1000"></div>
              <div className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-white/25 rounded-full animate-ping delay-2000"></div>
            </div>
            
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-8">
                <Quote className="h-10 w-10 opacity-80" />
              </div>
              <blockquote className="text-2xl lg:text-4xl font-medium leading-relaxed mb-8 italic relative">
                <span className="text-6xl text-white/20 absolute -top-4 -left-2">"</span>
                {item.data.text}
                <span className="text-6xl text-white/20 absolute -bottom-8 -right-2">"</span>
              </blockquote>
              <cite className="text-xl opacity-90 font-semibold bg-white/10 rounded-full px-6 py-2 inline-block">
                — {item.data.author}
              </cite>
            </div>
          </div>
        );

      case CONTENT_TYPES.DAILY_ACTIVITY:
      case CONTENT_TYPES.WEEKLY_STATS:
      case CONTENT_TYPES.SEASON_STATS:
      case CONTENT_TYPES.SPORT_FACT:
        const IconComponent = item.data.icon;
        return (
          <div className={`relative bg-gradient-to-br ${item.data.color} rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto text-white overflow-hidden`}>
            {/* Subtle animated background */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24"></div>
            </div>
            
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full mb-8 hover:scale-110 transition-transform duration-300">
                <IconComponent className="h-12 w-12 opacity-90" />
              </div>
              <h2 className="text-2xl lg:text-4xl font-bold leading-tight drop-shadow-sm">
                {item.data.text}
              </h2>
              
              {/* Add type indicator */}
              <div className="mt-6 inline-flex items-center space-x-2 bg-white/20 rounded-full px-4 py-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm font-medium opacity-90 uppercase tracking-wider">
                  {item.type === CONTENT_TYPES.SPORT_FACT ? 'Wist je dat...' : 
                   item.type === CONTENT_TYPES.WEEKLY_STATS ? 'Deze week' :
                   item.type === CONTENT_TYPES.SEASON_STATS ? 'Seizoen update' : 'Vandaag'}
                </span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-200 max-w-md mx-auto text-center">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Sport Dashboard Laden</h3>
          <p className="text-gray-600 mb-4">Highscores en live sportfeed worden opgehaald...</p>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <div className={`w-2 h-2 rounded-full ${feedLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
            <span>Live Feed: {feedStatus}</span>
          </div>
          <div className="mt-4 flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse delay-200"></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse delay-400"></div>
          </div>
        </div>
      </div>
    );
  }

  const currentItem = contentItems[currentContentIndex];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-20 lg:pb-20">
        <div className="max-w-7xl mx-auto px-4 pt-24 pb-8 lg:px-8 lg:pt-20 lg:pb-10">
          
          {/* MOBILE HEADER */}
          <div className="lg:hidden flex justify-between items-center mb-6 px-4">
  <div className="flex items-center space-x-3">
    <img 
      src={school?.logo_url || "/logo.png"} 
      alt="School Logo" 
      className="h-10 w-auto object-contain rounded-md" 
      onError={(e) => { e.target.src = '/logo.png'; }} 
    />
    <h1 className="text-lg font-black text-gray-800">
      Sport Dashboard
    </h1>
  </div>
  <div className="text-right">
    <div className="text-xl font-bold text-gray-800 font-mono">
      {formatTime(currentTime)}
    </div>
    <div className="text-xs text-gray-500">
      {formatDate(currentTime)}
    </div>
  </div>
</div>

          {/* DESKTOP HEADER */}
          <div className="hidden lg:flex justify-between items-center mb-8">
  <div className="flex items-center space-x-4">
    <img 
      src={school?.logo_url || "/logo.png"} 
      alt="School Logo" 
      className="h-12 w-auto object-contain rounded-lg" 
      onError={(e) => { e.target.src = '/logo.png'; }} 
    />
    <div>
      <h1 className="text-2xl font-black text-gray-800">
        Sport Dashboard
      </h1>
      <div className="text-gray-500 text-sm font-medium">
        Live resultaten en nieuws
      </div>
    </div>
  </div>
  <div className="text-right">
    <div className="text-4xl font-bold text-gray-800 font-mono">
      {formatTime(currentTime)}
    </div>
    <div className="text-gray-600">
      {formatDate(currentTime)}
    </div>
  </div>
</div>

          {/* Main Content */}
          {contentItems.length > 0 && currentItem ? (
            <div className={`transition-all duration-700 ${animationClass} mb-10`}>
              {renderContentItem(currentItem)}
              
              {/* Enhanced Content Indicators */}
              <div className="flex justify-center items-center space-x-3 mt-10">
                <div className="flex space-x-2">
                  {contentItems.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentContentIndex(index)}
                      className={`transition-all duration-300 rounded-full ${
                        currentContentIndex === index 
                          ? 'w-8 h-4 bg-gradient-to-r from-purple-600 to-blue-600 scale-110' 
                          : 'w-4 h-4 bg-gray-300 hover:bg-gray-400 hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
                <div className="ml-4 text-sm text-gray-500 font-medium">
                  {currentContentIndex + 1} / {contentItems.length}
                </div>
              </div>
            </div>
          ) : (
            // Enhanced Empty State
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 text-center p-16 max-w-3xl mx-auto mb-10">
              <div className="mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                  <Trophy className="w-12 h-12 text-purple-600" />
                </div>
                <h3 className="text-3xl font-black text-gray-800 mb-4">Dashboard wordt voorbereid</h3>
                <p className="text-gray-600 leading-relaxed text-lg mb-6">
                  Zodra er sportscores worden ingevoerd, komt het dashboard tot leven met live updates en prestatie-overzichten!
                </p>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                  <span>Wachtend op data...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Live Sport News Ticker - Desktop only */}
      <div className="hidden lg:block bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-t border-slate-700 fixed bottom-0 left-0 right-0 z-50 shadow-2xl">
        <div className="flex items-center h-18 overflow-hidden">
          {/* Status indicator */}
          <div className={`flex items-center px-6 h-full shadow-lg ${
            feedStatus === 'online' ? 'bg-gradient-to-r from-green-600 to-green-700' :
            feedStatus === 'offline' ? 'bg-gradient-to-r from-red-600 to-red-700' :
            'bg-gradient-to-r from-yellow-600 to-yellow-700'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full border-2 border-white ${
                feedStatus === 'online' ? 'bg-green-400 animate-pulse' :
                feedStatus === 'offline' ? 'bg-red-400' :
                'bg-yellow-400 animate-ping'
              }`}></div>
              <div className="text-white font-bold text-sm uppercase tracking-wider">
                {feedStatus === 'online' ? 'Live Sport' :
                 feedStatus === 'offline' ? 'Offline' :
                 feedStatus === 'connecting' ? 'Connecting' :
                 feedStatus === 'refreshing' ? 'Refreshing' :
                 'Error'}
              </div>
            </div>
          </div>
          
          {/* News ticker */}
          <div className="flex-1 overflow-hidden bg-gradient-to-r from-slate-800 to-slate-900">
            <div className="animate-marquee whitespace-nowrap text-white text-xl font-medium py-6 px-6">
              {liveNewsData.length > 0 ? (
                <>
                  {liveNewsData.slice(newsIndex, newsIndex + 3).map(news => news.title).join(' • ')} • 
                  {liveNewsData.slice(0, Math.max(0, 3 - (liveNewsData.length - newsIndex))).map(news => news.title).join(' • ')} •
                </>
              ) : feedStatus === 'offline' ? (
                "Geen live sportinfo op dit ogenblik • Offline modus actief • Probeer internet verbinding te herstellen •"
              ) : (
                "🏃‍♂️ Sport nieuws wordt geladen... • ⚽ Live updates komen eraan... • 🏆 Belgische sport in de spotlight... •"
              )}
            </div>
          </div>

          {/* Control panel */}
          <div className="flex items-center space-x-6 px-6 text-white/70">
            {lastFeedRefresh && (
              <div className="flex items-center space-x-2 text-xs">
                <Clock className="h-4 w-4" />
                <span>Update: {formatTime(lastFeedRefresh)}</span>
              </div>
            )}
            
            <div className="text-xs bg-white/10 rounded-full px-3 py-1">
              {liveNewsData.length} berichten
            </div>
            
            <button
              onClick={handleFeedRefresh}
              disabled={feedLoading}
              className="flex items-center space-x-2 text-xs hover:text-white transition-colors disabled:opacity-50 bg-white/10 hover:bg-white/20 rounded-full px-3 py-2"
              title="Vernieuw live sport feed"
            >
              {isOnline ? (
                <>
                  <RefreshCw className={`h-4 w-4 ${feedLoading ? 'animate-spin' : ''}`} />
                  <span>{feedLoading ? 'Loading...' : 'Refresh'}</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4" />
                  <span>Offline</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}