// scripts/seed-sportlab-content.js
// Vult de sport_lab_content collectie in Firestore met content voor alle rollen en sporten.
// Idempotent: veilig om meerdere keren te runnen.
//
// Sporten: basketbal, volleybal, voetbal, badminton, padel, handbal, hockey, tafeltennis, andere
//
// Gebruik:
//   node scripts/seed-sportlab-content.js

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const CONTENT = {

    basketbal: {
        arbiter: {
            level1: {
                uitleg: 'De Basis — deze regels vormen de kern van het spel. Zonder dit is het geen basketbal.',
                spelregels: [
                    'Dribbelen: Je mag de bal alleen verplaatsen door te dribbelen (stuiteren met één hand). Zodra je de bal met twee handen vastpakt, moet je stoppen met lopen.',
                    'Scoren: Een worp binnen de grote boog is 2 punten. Een worp van achter de boog is 3 punten. Een vrije worp telt voor 1 punt.',
                    'Lopen (Travel): Je mag niet meer dan twee stappen zetten met de bal in je handen zonder te dribbelen.',
                    'Double Dribble: Als je stopt met dribbelen en de bal vastpakt, mag je niet opnieuw beginnen. Ook met twee handen tegelijk dribbelen is verboden.',
                    'Out-of-bounds: De bal is "uit" als deze de lijn of de grond buiten het veld raakt, of als de speler op of over de lijn stapt.',
                ],
                taken: [
                    'Houd de score bij voor beide teams.',
                    'Roep luid "Travel!", "Double dribble!" of "Uit!" bij overtredingen.',
                    'Noteer wie er gescoord heeft (team, geen naam).',
                    'Zorg dat beide teams altijd de stand kennen.',
                ],
            },
            level2: {
                uitleg: 'Fouten en Overtredingen — fysiek contact en de grenzen van sportiviteit.',
                spelregels: [
                    'Persoonlijke fout: Je mag een tegenstander niet slaan, vasthouden, duwen of blokkeren. Bij een fout tijdens een schotpoging krijgt de aanvaller vrije worpen.',
                    'Pivoteren: Als je stopt met dribbelen, moet één voet (de pivotvoet) op de grond blijven. Je mag wel om je as draaien.',
                    'Goaltending: Je mag de bal niet aanraken als deze in een dalende lijn naar de ring gaat. Dit telt als een score voor de tegenstander.',
                    'Aanvallende fout (Charge): Als een verdediger stilstaat op een legale positie en de aanval loopt hem omver, krijgt de aanval een fout.',
                    'Bonus-vrije worpen: Na een bepaald aantal teamfouten per kwart leidt elke volgende fout automatisch tot vrije worpen.',
                ],
                taken: [
                    'Start en stop de timer bij elke onderbreking.',
                    'Wijs vrije worpen toe bij fouten tijdens een schotpoging.',
                    'Houd persoonlijke fouten per speler bij (max 5 = uitgespeeld).',
                    'Geef een time-out toe als een coach erom vraagt (max 2 per team per helft).',
                    'Beslis wie de bal mag uitnemen bij een uitbal.',
                ],
                beslissingen: [
                    'Een speler grijpt de arm van een tegenstander tijdens een schietbeweging — hoeveel vrije worpen?',
                    'De verdediger staat stil maar de aanvaller loopt hem omver — charge of fout op de verdediger?',
                    'De bal raakt de ring van boven maar een verdediger tikt hem weg — goaltending?',
                    'Een speler heeft 5 persoonlijke fouten — moet hij het veld verlaten?',
                    'Twee spelers claimen allebei dat zij de bal eerst raakten — hoe los je dit op?',
                ],
            },
            level3: {
                uitleg: 'De Klok en Tactiek — deze regels zorgen voor de hoge snelheid van het moderne basketbal.',
                spelregels: [
                    '24-secondenregel: Een team heeft 24 seconden om een schot te lossen dat de ring raakt. Lukt dit niet, gaat de bal naar de tegenstander.',
                    '8-secondenregel: Na een score of overtreding heeft een team 8 seconden om de bal over de middellijn te brengen.',
                    '3-secondenregel: Een aanvallende speler mag niet langer dan 3 seconden in de "bucket" staan.',
                    'Backcourt violation: Zodra de aanval de bal over de middellijn heeft gebracht, mogen ze hem niet meer terugspelen.',
                    '5-secondenregel: Bij het uitnemen van de bal heb je 5 seconden om de bal naar een medespeler te passen.',
                ],
                taken: [
                    'Positioneer jezelf zodat je het spel altijd goed ziet — volg de bal.',
                    'Communiceer beslissingen met duidelijke handgebaren én mondelinge uitleg.',
                    'Houd de 24-secondenklok in de gaten.',
                    'Beheer conflicten tussen spelers kalm en neutraal.',
                    'Geef na de wedstrijd een korte terugkoppeling aan beide teams.',
                ],
                beslissingen: [
                    'Het team heeft 23 seconden gedribbeld maar raakt de ring niet — 24-seconde schending?',
                    'De bal gaat na een schot over de middellijn terug — backcourt violation?',
                    'Een aanvaller staat 4 seconden in de bucket — wanneer fluit je?',
                    'Beide teams protesteren een beslissing tegelijk — hoe pak je dit aan?',
                    'Het scorebord klopt niet meer — hoe herstel je dit zonder discussie?',
                ],
            },
            },
            coach: {
            level1: {
                uitleg: 'De Spotter — Observeer één speler en turf de acties uit de kijkwijzer. Kijk goed naar de uitvoering en keuzes.',
                kijkwijzer: [
                    'Passen en vangen gebeurt met 2 handen',
                    'Neemt een shot als hij/zij vrij staat (zonder te forceren)',
                    'Beweegt direct naar een vrije ruimte ná een pass (give-and-go)',
                    'Neemt de juiste basishouding aan in verdediging (door de knieën, armen breed)'
                ],
                taken: [
                    'Kies 1 speler uit je team om te observeren.',
                    'Turf de acties: tik op (+) bij een goede actie en (-) als het beter kon.',
                    'Maak na enkele minuten een rapport op in je hoofd.',
                    'Stap het veld in en geef de speler 1 concrete, positieve tip.'
                ]
            },
            level2: {
                uitleg: 'De Analist — Kijk verder dan goed of fout: probeer het spelinzicht te doorgronden. Wáárom mislukt een actie?',
                kijkwijzer: [
                    'Passen en vangen gebeurt met 2 handen',
                    'Neemt een shot als hij/zij vrij staat (zonder te forceren)',
                    'Beweegt direct naar een vrije ruimte ná een pass (give-and-go)',
                    'Neemt de juiste basishouding aan in verdediging'
                ],
                analyse_opties: [
                    'Keek niet goed naar de situatie (gebrek aan overzicht)',
                    'Te weinig ruimte (verdediger zat te dichtbij)',
                    'Te gehaast / nam te veel risico',
                    'Verkeerde looplijn gekozen of bleef stilstaan na de pas'
                ],
                taken: [
                    'Kies 1 speler om te observeren.',
                    'Geef bij een minnetje (-) aan wát volgens jou de oorzaak is.',
                    'Bespreek je analyse achteraf met de speler: focus op het wegnemen van de oorzaak.'
                ]
            },
            level3: {
                uitleg: 'De Interveniënt — Observeer nu het héle team. Stuur bij op algemene tactiek en onderlinge samenwerking.',
                tactiek: [
                    'Spelers gebruiken de volledige breedte en diepte van het veld (spacing)',
                    'Er is duidelijke onderlinge communicatie op het veld',
                    'De balcirculatie is hoog (de bal doet het werk, niet dribbelen)',
                    'Het team schakelt snel om bij balverlies of balwinst'
                ],
                taken: [
                    'Observeer het team als geheel.',
                    'Druk op de "Time-Out" knop als de tactiek structureel niet gevolgd wordt.',
                    'Spreek de groep kort toe en geef 1 duidelijk werkpunt mee voor de volgende aanval.'
                ]
            }
        }
    },

    volleybal: {
        arbiter: {
            level1: {
                uitleg: 'De Basis — de fundamentele spelprincipes van volleybal.',
                spelregels: [
                    'Drie keer raken: Je moet de bal in maximaal 3 contacten over het net krijgen.',
                    'Niet vangen: De bal moet altijd kort en kaatsend geraakt worden — geen gooien of dragen.',
                    'Grond is punt: De bal is "in" als hij de vloer binnen de lijnen raakt, inclusief de lijn zelf.',
                    'Rotatie: Spelers draaien één positie door met de klok mee als ze de service terugwinnen.',
                    'Setwinst: Je wint een set bij 25 punten, met minimaal 2 punten verschil.',
                ],
                taken: [
                    'Houd de puntenstand bij voor beide teams.',
                    'Roep "Uit!", "Net!" of "Vier keer!" bij overtredingen.',
                    'Noteer wanneer de service wisselt.',
                    'Zorg dat beide teams weten wanneer ze moeten roteren.',
                ],
            },
            level2: {
                uitleg: 'Overtredingen — contact met het net, de service en positiefouten.',
                spelregels: [
                    'Netfout: Je mag het net niet aanraken terwijl je actief deelneemt aan het spel.',
                    'Voetfout (Service): Bij de opslag mag je de achterlijn niet aanraken voordat je de bal slaat.',
                    'Lijnfout (Midden): Je mag de helft van de tegenstander niet betreden met de hele voet over de middellijn.',
                    'Dubbel: Een speler mag de bal niet twee keer achter elkaar raken, behalve na een blok.',
                    'Gedragen bal: De bal te lang contact laten maken met de handen (duwen/vangen) is verboden.',
                ],
                taken: [
                    'Controleer actief of spelers het net aanraken.',
                    'Wijs de eerste service toe na een time-out.',
                    'Geef een time-out toe (max 2 per team per set).',
                    'Controleer of spelers op de juiste positie staan bij de service.',
                ],
                beslissingen: [
                    'Een speler speelt de bal met zijn voet — geldig of niet?',
                    'De bal raakt de bovenkant van het net en valt aan de overkant — punt of let?',
                    'Een speler raakt het net na de slag maar de bal is al uit — fout of niet?',
                    'Twee spelers van hetzelfde team raken de bal tegelijk — telt dat als één of twee aanrakingen?',
                ],
            },
            level3: {
                uitleg: 'Tactiek & Techniek — antennes, libero en achterspeler-aanval.',
                spelregels: [
                    'Antennes: De bal moet volledig tussen de verticale antennes door over het net gaan.',
                    'Achterspeler aanval: Een achterspeler mag de bal niet boven nethoogte aanvallen binnen de 3-meterlijn.',
                    'Blokkeren: Een blok-contact telt niet mee als één van de drie toegestane aanrakingen.',
                    'Libero: Een gespecialiseerde verdediger in een afwijkend shirt die alleen achterin mag staan en niet mag serveren.',
                    'Service-volgorde: Foutief doordraaien leidt direct tot een punt voor de tegenstander.',
                ],
                taken: [
                    'Houd bij welke set gespeeld wordt en wie van kant wisselt.',
                    'In een beslissende set: wissel bij 8 punten van kant.',
                    'Controleer of de libero-wisselregels correct gevolgd worden.',
                    'Communiceer met beide teams over de regels bij twijfel.',
                ],
                beslissingen: [
                    'Een achterspeler valt aan vanuit vóór de 3-meterlijn boven nethoogte — punt voor de tegenstander?',
                    'De libero wil serveren — mag dat?',
                    'De bal gaat via de antenne over het net — in of uit?',
                    'Bij 24-24: hoe gaat het verder?',
                ],
            },
            },
       coach: {
            level1: {
                uitleg: 'De Spotter — Let op de basishouding en de bereidheid van de speler om de bal te spelen.',
                kijkwijzer: [
                    'Beweegt naar de bal toe (in plaats van te wachten)',
                    'Buigt goed door de knieën bij de onderhandse receptie',
                    'Speelt de bal in een boog omhoog (tijd winnen)',
                    'Communiceert duidelijk ("Los!" of "Ik!")'
                ],
                taken: [
                    'Kies 1 speler om te observeren.',
                    'Turf de acties: (+) voor een goede uitvoering, (-) voor een werkpunt.',
                    'Geef de speler 1 duidelijke tip om de volgende beurt toe te passen.'
                ]
            },
            level2: {
                uitleg: 'De Analist — Fouten in volleybal ontstaan vaak vóór de bal wordt geraakt. Analyseer de voorbereiding.',
                kijkwijzer: [
                    'Beweegt naar de bal toe (in plaats van te wachten)',
                    'Buigt goed door de knieën bij de onderhandse receptie',
                    'Speelt de bal in een boog omhoog',
                    'Communiceert duidelijk ("Los!" of "Ik!")'
                ],
                analyse_opties: [
                    'Stond stil in plaats van in beweging te blijven (voetenwerk)',
                    'Armen niet goed gestrekt of verkeerde hoek',
                    'Te laat vertrokken / verkeerde inschatting van de bal',
                    'Er was twijfel door gebrek aan communicatie'
                ],
                taken: [
                    'Kies 1 speler om te observeren.',
                    'Kies bij een (-) wat de onderliggende fout was.',
                    'Ga naar de speler en leg uit wáárom de bal niet goed aankwam.'
                ]
            },
            level3: {
                uitleg: 'De Interveniënt — Kijk naar de samenwerking in de driehoeken op het veld.',
                tactiek: [
                    'Spelers dekken elkaars ruimtes goed af (geen gaten)',
                    'De spelverdeler wordt steevast goed aangespeeld',
                    'Er is variatie in de aanval (niet steeds dezelfde persoon)',
                    'De spelers roepen elkaar bij naam'
                ],
                taken: [
                    'Observeer de opstelling en beweging van het héle team.',
                    'Roep een "Time-Out" in als de organisatie wegvalt.',
                    'Geef het team één duidelijke tactische afspraak mee.'
                ]
            }
        }
    },
    voetbal: {
        arbiter: {
            level1: {
                uitleg: 'De Basis — de fundamentele regels zonder dewelke het geen voetbal is.',
                spelregels: [
                    'Geen handen: Alleen de keeper mag de bal met de handen aanraken, en enkel in de eigen 16-meter.',
                    'Scoren: De bal moet in zijn geheel over de doellijn tussen de palen zijn geweest.',
                    'Inworp: Als de bal over de zijlijn gaat, gooit het andere team met twee handen boven het hoofd in.',
                    'Corner / uittrap: Over de achterlijn via de verdediging is een corner; via de aanval een uittrap.',
                    'Speeltijd: Een wedstrijd duurt 90 minuten (2x45), plus eventuele blessuretijd.',
                ],
                taken: [
                    'Houd de score bij voor beide teams.',
                    'Wijs inworp, corner of uittrap toe bij een uitbal.',
                    'Roep "Handen!" of "Fout!" bij overtredingen.',
                    'Noteer wie er gescoord heeft (team, geen naam).',
                ],
            },
            level2: {
                uitleg: 'Overtredingen — vrije trappen, kaarten en de penalty.',
                spelregels: [
                    'Vrije trappen: Overtredingen worden bestraft met een directe of indirecte vrije trap.',
                    'Geel & Rood: Geel is een waarschuwing; twee gele = rood. Rood betekent het veld verlaten.',
                    'Penalty: Een zware overtreding in de eigen 16-meter leidt tot een strafschop vanaf 11 meter.',
                    'Terugspeelbal: De keeper mag een bewuste pass met de voet van een teamgenoot niet oppakken.',
                    'Voordeel: De scheidsrechter mag doorspelen na een fout als de benadeelde partij de bal behoudt.',
                ],
                taken: [
                    'Houd de speeltijd bij en geef blessuretijd.',
                    'Wijs vrije trappen toe bij overtredingen.',
                    'Beslis of een fout in de zestien een penalty verdient.',
                    'Geef een gele kaart bij protesteren of gevaarlijk spel.',
                ],
                beslissingen: [
                    'Een verdediger raakt de bal met zijn arm in de zestien — penalty of niet?',
                    'Een speler valt na contact maar er was nauwelijks aanraking — simulatie of echte fout?',
                    'De keeper pakt een terugspeelbal op met de handen — directe of indirecte vrije trap?',
                    'De scheidsrechter ziet een overtreding maar het andere team heeft een grote kans — voordeel of fluiten?',
                ],
            },
            level3: {
                uitleg: 'Tactiek & Techniek — buitenspel, speciale regels en wedstrijdleiding.',
                spelregels: [
                    'Buitenspel: Je staat buitenspel als je achter de laatste verdediger staat op het moment dat de bal naar je gepasst wordt.',
                    'Buitenspel-uitzonderingen: Geen buitenspel bij inworp, corner of als je op je eigen helft staat.',
                    'Indirecte vrije trap: Bij gevaarlijk spel zonder contact moet de bal eerst aangeraakt worden voor er gescoord mag worden.',
                    'Keeper-6 seconden: Een keeper mag de bal maximaal 6 seconden in de handen houden.',
                    'Wisselbeleid: In officiële wedstrijden mag je tot 5 keer wisselen, maar alleen op 3 wisselmomenten.',
                ],
                taken: [
                    'Positioneer jezelf altijd diagonaal ten opzichte van het spel.',
                    'Volg de bal en houd alle spelers in het zicht voor buitenspelbeoordeling.',
                    'Beheer conflicten — grijp snel in bij ophitsing.',
                    'Noteer alle kaarten en wisselmomenten correct.',
                ],
                beslissingen: [
                    'Een aanvaller staat op gelijke hoogte met de laatste verdediger — buitenspel?',
                    'De keeper houdt de bal al 7 seconden vast — indirecte vrije trap?',
                    'Twee spelers krijgen ruzie — hoe deëscaleer je?',
                    'Een speler beweert dat de bal over de lijn was maar jij zag het niet — wat doe je?',
                ],
            },
            },
     coach: {
            level1: {
                uitleg: 'De Spotter — Observeer de balcontrole en de keuzes die een speler maakt.',
                kijkwijzer: [
                    'Kijkt over de schouder (scant de ruimte) vóór hij/zij de bal krijgt',
                    'Maakt zich goed aanspeelbaar (komt uit de dekking)',
                    'Neemt de bal aan en legt hem direct speelklaar',
                    'Passt zuiver met de binnenkant van de voet'
                ],
                taken: [
                    'Kies 1 speler om te observeren.',
                    'Turf met (+) en (-) hoe goed de kijkwijzer wordt gevolgd.',
                    'Geef de speler kort een compliment én een werkpuntje.'
                ]
            },
            level2: {
                uitleg: 'De Analist — Balverlies ontstaat door een gebrek aan overzicht of techniek. Analyseer waarom.',
                kijkwijzer: [
                    'Kijkt over de schouder (scant de ruimte) vóór hij/zij de bal krijgt',
                    'Maakt zich goed aanspeelbaar (komt uit de dekking)',
                    'Neemt de bal aan en legt hem direct speelklaar',
                    'Passt zuiver met de binnenkant van de voet'
                ],
                analyse_opties: [
                    'Keek pas rond nádat de bal ontvangen was (te traag)',
                    'Zocht te weinig de vrije ruimte op / bleef achter de verdediger',
                    'Balcontrole was te onrustig of sprong te ver weg',
                    'Verkeerde traptechniek of onvoldoende balsnelheid'
                ],
                taken: [
                    'Kies 1 speler om te observeren.',
                    'Registreer bij elke fout (-) direct de oorzaak.',
                    'Stap na enkele minuten af op de speler om je analyse te delen.'
                ]
            },
            level3: {
                uitleg: 'De Interveniënt — Kijk of het team als een blok beweegt in aanval en verdediging.',
                tactiek: [
                    'Bij balbezit: speelveld zo groot mogelijk maken (breedte en diepte)',
                    'Bij balverlies: compact verdedigen en het centrum sluiten',
                    'Er wordt actief druk gezet op de balbezitter',
                    'Snel omschakelen tussen aanval en verdediging'
                ],
                taken: [
                    'Observeer de veldbezetting van je team.',
                    'Druk op de "Time-Out" knop als ze als "kluitje" spelen.',
                    'Leg de tactiek stil en positioneer de spelers beter.'
                ]
            }
        }
    },

    badminton: {
        arbiter: {
            level1: {
                uitleg: 'De Basis — de kern van het badmintonspel.',
                spelregels: [
                    'Onderhands serveren: De shuttle moet bij de opslag onder de taille geraakt worden.',
                    'Niet in het net: Als de shuttle in het net slaat of eronderdoor gaat, is het een punt voor de tegenstander.',
                    'In is in: De lijnen horen bij het veld. Raakt de shuttle de lijn? Dan is hij "in".',
                    'Niet twee keer raken: Je mag de shuttle maar één keer raken per beurt.',
                    'Winnen: Je speelt tot 21 punten; je moet met 2 punten verschil winnen (max 30-29).',
                ],
                taken: [
                    'Roep de stand uit na elk punt (server eerst: "11-9").',
                    'Wijs servicefouten aan.',
                    'Noteer wanneer de service wisselt.',
                    'Registreer de eindstand per set.',
                ],
            },
            level2: {
                uitleg: 'Overtredingen — servicevakken, nettouches en hinderen.',
                spelregels: [
                    'Servicevak: Je serveert altijd diagonaal naar het vak van de tegenstander.',
                    'Stand bepaalt kant: Bij een even score serveer je vanaf rechts, bij een oneven score vanaf links.',
                    'Net aanraken: Je mag met je racket of lichaam het net niet aanraken tijdens de rally.',
                    'Over het net: Je mag de shuttle niet aan de kant van de tegenstander raken (je racket mag er na de slag wel overheen zwaaien).',
                    'Hinderen: Je mag de tegenstander niet afleiden door te roepen of expres voor zijn neus te zwaaien.',
                ],
                taken: [
                    'Controleer of de service in het juiste vak landt.',
                    'Beslis bij twijfelgevallen of de shuttle in of uit was.',
                    'Geef een "let" als er een externe verstoring is.',
                    'Geef bij 29-29 aan dat het volgende punt de winnaar bepaalt.',
                ],
                beslissingen: [
                    'De shuttle raakt het net en valt aan de andere kant — punt voor de aanvaller?',
                    'Een speler raakt het net met zijn racket na de slag — fout?',
                    'De shuttle valt op de lijn — in of uit?',
                    'Een speler serveert vanaf de verkeerde kant bij een oneven stand — serviceovertreding?',
                ],
            },
            level3: {
                uitleg: 'Tactiek & Techniek — dubbelspel, "let" en shuttle-regels.',
                spelregels: [
                    'De "Let": Als er onverwacht iets gebeurt (shuttle uit ander veld), wordt de punt opnieuw gespeeld.',
                    'Shuttle op het racket: De shuttle mag niet op het racket blijven liggen of "meegesleurd" worden.',
                    'Dubbelspel lijnen: Bij de service is het veld kort en breed; tijdens de rally lang en breed.',
                    'Service-ontvangst: De ontvanger mag pas bewegen nadat de serveerder de shuttle heeft geraakt.',
                    'Plafond: Het raken van het plafond of de balken is een directe fout.',
                ],
                taken: [
                    'Communiceer de stand duidelijk na elk punt.',
                    'Bewaak de tijdslimiet per wedstrijd bij meerdere velden.',
                    'Noteer de eindstand en meld de winnaar aan de toernooileider.',
                    'Beheer de rusttijd (60 sec bij 11 punten in een beslissende set).',
                ],
                beslissingen: [
                    'Beide spelers beweren dat de shuttle in was — hoe beslis je?',
                    'Een speler vraagt een "let" omdat hij afgeleid was — accepteer je dit?',
                    'De shuttle is beschadigd tijdens het spel — wat doe je?',
                    'In dubbelspel: welke lijnen gelden bij de service en welke tijdens de rally?',
                ],
            },
        },
        coach: {
            level1: {
                uitleg: 'De Spotter — Let op het voetenwerk en de slagvoorbereiding van je speler.',
                kijkwijzer: [
                    'Keert na élke slag direct terug naar de centrale basispositie',
                    'Slaat de shuttle op het hoogst mogelijke punt (arm gestrekt)',
                    'Gebruikt licht en verend voetenwerk',
                    'Heeft het racket klaar en omhoog vóór de shuttle aankomt'
                ],
                taken: [
                    'Kies 1 speler om te observeren.',
                    'Turf met (+) en (-) tijdens de rally.',
                    'Stap na een punt naar de speler en geef 1 gerichte tip.'
                ]
            },
            level2: {
                uitleg: 'De Analist — Slechte slagen zijn vaak het gevolg van traag voetenwerk. Zoek de fout.',
                kijkwijzer: [
                    'Keert na élke slag direct terug naar de centrale basispositie',
                    'Slaat de shuttle op het hoogst mogelijke punt (arm gestrekt)',
                    'Gebruikt licht en verend voetenwerk',
                    'Heeft het racket klaar en omhoog vóór de shuttle aankomt'
                ],
                analyse_opties: [
                    'Bleef na de slag stilstaan aan de rand van het veld',
                    'Liet de shuttle te ver zakken (bal onder nethoogte geraakt)',
                    'Stond plat op de voeten en was daardoor te traag',
                    'Gebruikte een verkeerde greep (grip) voor de slag'
                ],
                taken: [
                    'Kies 1 speler om te observeren.',
                    'Geef bij een (-) de oorzaak aan.',
                    'Geef feedback tussen twee punten door: richt je op het oplossen van de oorzaak.'
                ]
            },
            level3: {
                uitleg: 'De Interveniënt — Kijk naar de tactische slagen en de opbouw van een rally.',
                tactiek: [
                    'De speler zoekt bewust de hoeken en dwingt de tegenstander te lopen',
                    'Korte (drops) en diepe (clears) slagen worden onvoorspelbaar afgewisseld',
                    'Fouten van de tegenstander worden herkend en uitgebuit',
                    'Bij dubbelspel: er is een duidelijke taakverdeling en communicatie'
                ],
                taken: [
                    'Kijk naar de speler of het duo als geheel.',
                    'Vraag een "Time-Out" aan (tussen 2 rally\'s) als er tactiekloos geslagen wordt.',
                    'Geef een duidelijke tactische opdracht (bijv. "Speel hem nu naar zijn backhand").'
                ]
            }
        }
    },

    padel: {
        arbiter: {
            level1: {
                uitleg: 'De Basis — veiligheid en de fundamentele spelregels van padel.',
                spelregels: [
                    'Racket-koordje: Het is verplicht om het veiligheidskoordje van je racket om je pols te dragen.',
                    'Altijd dubbelspel: Padel speel je officieel 2-tegen-2.',
                    'Onderhandse service: Je laat de bal eerst één keer stuiteren achter de servicelijn en raakt hem op of onder middelhoogte.',
                    'Telling: 15, 30, 40, Game — zoals tennis. Bij 40-40 wordt een "Golden Point" gespeeld.',
                    'Eén stuit: De bal mag maar één keer op jouw helft stuiteren voordat je hem over het net slaat.',
                ],
                taken: [
                    'Houd de score bij (games en sets).',
                    'Roep servicefouten aan.',
                    'Controleer of het racket-koordje gedragen wordt.',
                    'Zorg dat beide teams de stand kennen.',
                ],
            },
            level2: {
                uitleg: 'De Wanden en het Hek — de unieke regelgeving rond de kooi.',
                spelregels: [
                    'Eerst de grond: De bal moet aan de overkant altijd eerst de grond raken. Raakt de bal eerst het glas? Dan is hij "uit".',
                    'Service-vak: Raakt de bal na de stuit het hekwerk? Foute service. Raakt de bal na de stuit het glas? Goede service.',
                    'Gebruik van eigen glas: Je mag de bal via je eigen glazen wanden naar de overkant slaan, maar nooit via het hekwerk.',
                    'Draadgaas (Hek): Als de bal tijdens een rally de grond raakt en dan het hekwerk, blijft hij in het spel.',
                    'Het net: Je mag het net met je lichaam of racket nooit aanraken tijdens een punt.',
                ],
                taken: [
                    'Beoordeel of de bal eerst de grond of eerst het glas raakte aan de overkant.',
                    'Controleer of de service in het juiste vak landt.',
                    'Geef een "let" als de service het net raakt en goed landt.',
                    'Houd bij hoeveel games gewonnen zijn per set.',
                ],
                beslissingen: [
                    'De bal raakt aan de overkant eerst het glas en dan de grond — in of uit?',
                    'Na de service stuitert de bal in het vak en raakt dan het hekwerk — goede of foute service?',
                    'Een speler slaat de bal via zijn eigen glas naar de overkant — geldig?',
                    'De bal stuitert op de grond en raakt dan het hekwerk — blijft hij in het spel?',
                ],
            },
            level3: {
                uitleg: 'Tactiek & Techniek — de kooi uit, vrijgave en wisselregels.',
                spelregels: [
                    'De kooi uit: Als de bal via de grond over de wand de kooi uit stuitert, mag je via de deur naar buiten rennen om hem terug te slaan.',
                    'Vrijgave van het net: Je mag de bal pas aanraken als deze over het net op jouw helft is.',
                    'Net-service (Let): Raakt de bal bij de service het net en valt hij goed? Dan mag de service opnieuw, tenzij hij daarna het hek raakt.',
                    'Dubbele aanraking: Je mag de bal niet twee keer raken met je racket.',
                    'Wissel van helft: Je wisselt van kant bij elke oneven stand in games.',
                ],
                taken: [
                    'Houd de volledige score bij: punten, games en sets.',
                    'Leid een tiebreak correct: spelen tot 7 punten, afwisselend serveren.',
                    'Geef de einduitslag door met de volledige setstand.',
                    'Bewaak de rusttijd tussen sets.',
                ],
                beslissingen: [
                    'Een speler loopt de kooi uit om de bal te retourneren — mag dat?',
                    'Een speler raakt de bal als die via het eigen glas terugstuitert naar de andere kant — punt voor de tegenstander?',
                    'Bij 6-6 in games — hoe speel je een tiebreak?',
                    'De service raakt het net, landt goed maar raakt daarna het hek — let of fout?',
                ],
            },
        },
    coach: {
            level1: {
                uitleg: 'De Spotter — Focus op de basishouding en het verdedigende geduld van de speler.',
                kijkwijzer: [
                    'Houdt het racket in de \'ready positie\' (voor de borst)',
                    'Buigt goed door de knieën bij lage ballen (geen bolle rug)',
                    'Laat de bal indien nodig eerst het glas raken om tijd te winnen',
                    'Plaatst de bal gecontroleerd terug (controle is belangrijker dan kracht)'
                ],
                taken: [
                    'Kies 1 speler om te observeren.',
                    'Turf met (+) of (-) hoe de speler presteert op de kijkwijzer.',
                    'Geef tijdens een pauze een technische tip over hun houding.'
                ]
            },
            level2: {
                uitleg: 'De Analist — In padel is positie en geduld alles. Waarom verliest de speler het punt?',
                kijkwijzer: [
                    'Houdt het racket in de \'ready positie\'',
                    'Buigt goed door de knieën bij lage ballen',
                    'Laat de bal indien nodig eerst het glas raken',
                    'Plaatst de bal gecontroleerd terug'
                ],
                analyse_opties: [
                    'Racket hing te laag of te ontspannen vóór de slag',
                    'Stond te recht op en schepte de bal de lucht in',
                    'Raakte in paniek door de naderende achterwand (verkeerde timing)',
                    'Sloeg te hard en ongecontroleerd in plaats van geplaatst'
                ],
                taken: [
                    'Kies 1 speler om te observeren.',
                    'Als de bal in het net belandt (-), noteer direct waarom.',
                    'Bespreek je observaties rustig met de speler.'
                ]
            },
            level3: {
                uitleg: 'De Interveniënt — Kijk naar de samenwerking en veldbezetting van het duo.',
                tactiek: [
                    'Het duo beweegt als één lijn op en neer (lijn houden)',
                    'Er wordt actief gebruik gemaakt van de lob om het net over te nemen',
                    'Ze dwingen de tegenstander diep in de hoeken',
                    'Goede communicatie bij ballen in het midden ("Ik", "Jij", "Laat")'
                ],
                taken: [
                    'Observeer het samenspel van het duo.',
                    'Gebruik een "Time-Out" als het duo niet meer opschuift naar het net.',
                    'Leg tactisch uit waar het gat valt en hoe ze dit oplossen.'
                ]
            }
        }
    },

    handbal: {
        arbiter: {
            level1: {
                uitleg: 'De Basis — de fundamentele spelregels van handbal.',
                spelregels: [
                    'Drie stappen: Je mag maximaal 3 stappen zetten met de bal in je hand.',
                    'De Cirkel: Alleen de keeper mag in het doelgebied staan.',
                    'Dribbelen: Je mag niet stoppen, de bal vastnemen en dan opnieuw beginnen met dribbelen.',
                    'Scoren: De hele bal moet over de doellijn zijn voor een geldig doelpunt.',
                    'Tijd: Een wedstrijd duurt 2x 30 minuten.',
                ],
                taken: [
                    'Houd de score bij voor beide teams.',
                    'Wijs de correcte hervatting toe bij een uitbal.',
                    'Roep "Stap!", "Cirkel!" of "Drie seconden!" bij overtredingen.',
                    'Noteer gele en rode kaarten per speler.',
                ],
            },
            level2: {
                uitleg: 'Overtredingen — fouten, tijdstraffen en de 7-meter.',
                spelregels: [
                    '3-secondenregel: Je mag de bal maximaal 3 seconden vasthouden zonder te passen, te schieten of te dribbelen.',
                    '7-meter: Een strafworp wordt gegeven als een duidelijke scoringskans wordt ontnomen.',
                    'Progressieve bestraffing: Geel (waarschuwing), 2 minuten tijdstraf, en dan Rood (uitsluiting).',
                    'Voet: Veldspelers mogen de bal niet met hun voet of onderbeen raken.',
                    'Aanvallende fout: Je mag niet met je schouder door een verdediger heen rennen.',
                ],
                taken: [
                    'Beslis of contact een fout is of normaal spelcontact.',
                    'Wijs een 7-meter toe bij een duidelijke scoringskans die werd verhinderd.',
                    'Geef een tijdstraf (2 minuten) bij flagrante overtredingen.',
                    'Houd bij hoeveel spelers tijdelijk zijn uitgesloten.',
                ],
                beslissingen: [
                    'Een keeper verlaat zijn doelgebied en raakt de bal — geldig of niet?',
                    'Een aanvaller springt boven de cirkel maar raakt de keeper — 7-meter?',
                    'Een verdediger gooit de bal weg na het fluiten — gele kaart?',
                    'Een speler heeft al 3 tijdstraffen — wanneer geef je een rode kaart?',
                ],
            },
            level3: {
                uitleg: 'Tactiek & Techniek — passief spel, inspringen en bijzondere situaties.',
                spelregels: [
                    'Passief spel: Als de scheidsrechter zijn hand opsteekt, moet de aanval binnen maximaal 6 passes op doel schieten.',
                    'Inspringen: Een aanvaller mag in de lucht boven de cirkel zijn, zolang hij de bal loslaat vóór hij de grond raakt.',
                    'Vrije worp lijn: Kleine overtredingen worden hervat op de 9-meterlijn.',
                    'Keeper als veldspeler: De keeper mag mee aanvallen maar de cirkel niet in met de bal.',
                    'Time-out: Elk team heeft recht op drie time-outs per wedstrijd.',
                ],
                taken: [
                    'Houd de speeltijd bij (2 helften van 30 minuten).',
                    'Beheer de uitsluitingstijden correct (2 minuten per tijdstraf).',
                    'Steek je hand op bij passief spel en tel de passes.',
                    'Coördineer de 7-meterprocedure correct.',
                ],
                beslissingen: [
                    'De scheidsrechter heeft zijn hand opgestoken — hoeveel passes mag het team nog?',
                    'De keeper speelt als veldspeler en loopt met de bal de cirkel in — wat nu?',
                    'Bij een 7-meter staat een verdediger te dicht — herhaling?',
                    'Een team vraagt een time-out maar heeft ze al allemaal gebruikt — wat doe je?',
                ],
            },
        },
    coach: {
            level1: {
                uitleg: 'De Spotter — Observeer de balhandeling en de dreiging naar het doel.',
                kijkwijzer: [
                    'Vangt de bal met 2 handen en vormt een stevige \'W\' met de duimen',
                    'Dribbelt niet onnodig maar zoekt direct de pass',
                    'Durft de ruimte tussen twee verdedigers aan te vallen (diepte)',
                    'Houdt de werparm hoog en achter het hoofd bij een worp'
                ],
                taken: [
                    'Kies 1 veldspeler om op te focussen.',
                    'Turf met (+) en (-) de handelingen.',
                    'Stap na een wisselmoment af op de speler voor een snelle tip.'
                ]
            },
            level2: {
                uitleg: 'De Analist — Handbal is snel. Waarom verliest de speler de bal of de snelheid?',
                kijkwijzer: [
                    'Vangt de bal veilig met 2 handen',
                    'Dribbelt niet onnodig maar zoekt de pass',
                    'Valt de ruimte tussen verdedigers aan',
                    'Houdt de werparm hoog en gereed'
                ],
                analyse_opties: [
                    'Ving de bal met gestrekte vingers in plaats van de W-vorm',
                    'Dribbelde zichzelf vast of vertraagde de tegenaanval',
                    'Liep recht op een verdediger af in plaats van in het "gat"',
                    'Schoot of passte vanuit een te lage, voorspelbare armpositie'
                ],
                taken: [
                    'Kies 1 speler om te observeren.',
                    'Duid bij fouten (-) de oorzaak aan in de app.',
                    'Coach de speler specifiek op zijn/haar grootste werkpunt.'
                ]
            },
            level3: {
                uitleg: 'De Interveniënt — Kijk of het team als een machine functioneert in aanval/verdediging.',
                tactiek: [
                    'Aanval wordt goed in de breedte opgezet (spelers staan niet samen)',
                    'Snelle balcirculatie dwingt de verdediging om te schuiven',
                    'Er wordt uitgestapt door de verdediger op de balbezitter',
                    'Duidelijke afspraken achterin (overnemen van elkaars mannetjes)'
                ],
                taken: [
                    'Kijk naar de organisatie van het hele team.',
                    'Roep een "Time-Out" als ze te statisch worden.',
                    'Geef één duidelijke afspraak door over balcirculatie of verdediging.'
                ]
            }
        }
    },

    hockey: {
        arbiter: {
            level1: {
                uitleg: 'De Basis — de fundamentele regels van veldhockey.',
                spelregels: [
                    'Platte kant: Je mag de bal alleen spelen met de platte kant van de stick.',
                    'Geen voeten: Alleen de keeper mag de bal met de voeten of het lichaam raken.',
                    'Scoren: Je mag alleen scoren vanuit de "cirkel" (de halve cirkel rond het doel).',
                    'Niet slaan naar de stick: Je mag alleen de bal raken, niet de stick van de tegenstander.',
                    'Vrije slag: Bij een overtreding krijgt de andere partij een vrije slag op de plek van de fout.',
                ],
                taken: [
                    'Houd de score bij voor beide teams.',
                    'Wijs de correcte hervatting toe (vrije slag, strafcorner, hoekschop).',
                    'Roep "Gevaarlijk!", "Voet!" of "Backstick!" bij overtredingen.',
                    'Controleer of doelpunten vanuit de cirkel gescoord werden.',
                ],
            },
            level2: {
                uitleg: 'Overtredingen — gevaarlijk spel, strafcorners en kaarten.',
                spelregels: [
                    'Backstick: De bal met de ronde kant van de stick raken is een overtreding.',
                    'Gevaarlijke bal: De bal mag niet hoog gespeeld worden als er spelers binnen 5 meter staan.',
                    'Afhouden: Je mag je lichaam niet tussen de tegenstander en de bal plaatsen om de bal af te schermen.',
                    'Voetfout: Als de bal de voet raakt en je hebt daar voordeel van, is het een fout.',
                    'Kaarten: Groen = 2 min, geel = 5-10 min, rood = definitief het veld af.',
                ],
                taken: [
                    'Beslis of een stickbal gevaarlijk is of niet.',
                    'Wijs een strafcorner toe bij overtredingen in de cirkel.',
                    'Controleer of doelpunten volledig de achterlijn overschreden.',
                    'Bewaak de afstand van 5 meter bij een vrije slag.',
                ],
                beslissingen: [
                    'De bal raakt een aanvaller in de cirkel — strafcorner?',
                    'Een stick gaat boven schouderhoogte — gevaarlijk of acceptabel?',
                    'Een doelpunt werd gescoord van buiten de cirkel — geldig?',
                    'De bal raakt de voet van een verdediger in de cirkel — strafcorner of vrije slag?',
                ],
            },
            level3: {
                uitleg: 'Tactiek & Techniek — self-pass, strafbal en 5-meter regel.',
                spelregels: [
                    'Self-pass: Je mag bij een vrije slag de bal zelf meenemen zonder eerst naar iemand anders te passen.',
                    'Strafcorner: Bij een overtreding in de cirkel volgt een corner waarbij de verdediging uit het doel komt.',
                    'Strafbal: Een zware overtreding in de cirkel die een doelpunt voorkomt leidt tot een strafbal.',
                    '5-meter regel: Bij een vrije slag moeten alle tegenstanders op minimaal 5 meter afstand staan.',
                    'Lange corner: Als de verdediger de bal onopzettelijk over de eigen achterlijn speelt, krijgt de aanval een corner op de 23-meterlijn.',
                ],
                taken: [
                    'Houd de speeltijd bij (2 helften van 35 minuten).',
                    'Coördineer de strafcornerprocedure correct.',
                    'Bewaak de veiligheid van alle spelers.',
                    'Noteer kaarten en geef ze door aan de coach.',
                ],
                beslissingen: [
                    'Beide teams claimen dat de bal in/uit het doel was — hoe beslis je?',
                    'Bij een strafcorner staat een verdediger te vroeg op — herhaling?',
                    'Een vrije slag: een tegenstander staat op 3 meter — wat doe je?',
                    'Een speler raakt de bal met zijn voet in de cirkel maar de keeper had het ook gestopt — voordeel of strafcorner?',
                ],
            },
        },
    coach: {
            level1: {
                uitleg: 'De Spotter — Focus op basistechniek, want fouten in techniek zijn gevaarlijk in hockey.',
                kijkwijzer: [
                    'Houdt de stick veilig en laag bij de grond',
                    'Kijkt op voor de pass (in plaats van alleen naar de bal te staren)',
                    'Neemt de bal aan met een dempende beweging ("stick zacht maken")',
                    'Zet direct een nieuwe loopactie in na de pass'
                ],
                taken: [
                    'Kies 1 speler om te observeren.',
                    'Turf met (+) en (-) hoe veilig en effectief de speler is.',
                    'Geef een compliment en 1 tip voor balcontrole.'
                ]
            },
            level2: {
                uitleg: 'De Analist — Beoordeel waarom de bal wegsprong of het spel vertraagde.',
                kijkwijzer: [
                    'Houdt de stick veilig en laag',
                    'Kijkt op voor de pass',
                    'Aanname van de bal gebeurt verend/dempend',
                    'Zet nieuwe actie in na de pass'
                ],
                analyse_opties: [
                    'Stick zat te hoog (risico op fouten of trage reactie)',
                    'Passte blind in het drukste gebied (turnover)',
                    'Hield de stick te stijf, waardoor de bal ver weg sprong bij aanname',
                    'Bleef stilstaan en bewonderde de eigen pass'
                ],
                taken: [
                    'Kies 1 speler om te observeren.',
                    'Geef bij balverlies de juiste oorzaak op.',
                    'Bespreek hoe de techniek het spel kan versnellen.'
                ]
            },
            level3: {
                uitleg: 'De Interveniënt — Kijk naar het gebruik van de ruimte en balverplaatsing.',
                tactiek: [
                    'De bal wordt rustig in een \'kom\' achterin rondgespeeld tot er ruimte is',
                    'Het veld wordt maximaal in de breedte én diepte gebruikt',
                    'Verdedigers sluiten elkaars passlijnen goed af',
                    'Het team beslist samen wanneer ze massaal voorwaarts druk zetten'
                ],
                taken: [
                    'Observeer de opbouw van achteruit.',
                    'Vraag een "Time-Out" als het een kluitjes-hockey wordt.',
                    'Herstel de posities en wijs het team op de flanken.'
                ]
            }
        }
    },

    tafeltennis: {
        arbiter: {
            level1: {
                uitleg: 'De Basis — de kern van het tafeltennisspel.',
                spelregels: [
                    '11 punten: Een game gaat tot 11 punten; je moet met 2 punten verschil winnen.',
                    'Service wissel: Om de 2 punten wisselt de beurt om te serveren.',
                    'Eerst eigen helft: Bij de service moet de bal eerst op je eigen helft stuiteren en dan op die van de ander.',
                    'Rally: Tijdens de rally sla je de bal direct naar de helft van de tegenstander.',
                    'Niet steunen: Je mag met je vrije hand de tafel niet aanraken tijdens een punt.',
                ],
                taken: [
                    'Roep de stand uit na elk punt (server eerst).',
                    'Wijs service-fouten aan.',
                    'Noteer wanneer de service wisselt.',
                    'Registreer de eindstand per game.',
                ],
            },
            level2: {
                uitleg: 'Overtredingen — serviceregels, randbal en dubbelspel.',
                spelregels: [
                    'Service opgooi: De bal moet minimaal 16 cm recht omhoog gegooid worden vanuit een open handpalm.',
                    'Zichtbare bal: De tegenstander moet de bal tijdens de hele service kunnen zien — niet verbergen met je lichaam.',
                    'Net-service: Als de bal het net raakt bij de service maar wel goed landt, moet het opnieuw.',
                    'Randbal: De bovenkant van de tafelrand is "in", de zijkant is "uit".',
                    'Dubbelspel-service: Je moet altijd diagonaal serveren (van rechts naar rechts).',
                ],
                taken: [
                    'Controleer of de service correct is (hand open, bal zichtbaar omhoog gooien).',
                    'Beslis of een "let" gerechtvaardigd is.',
                    'Houd bij hoeveel games gewonnen zijn.',
                    'Geef een waarschuwing bij opzettelijk vertragen of afleiden.',
                ],
                beslissingen: [
                    'Een speler gooit de bal niet 16 cm omhoog — fout?',
                    'De bal raakt het net en stuitert over — let of punt?',
                    'De bal raakt de zijkant van de tafel — in of uit?',
                    'Een speler verbergt de service met zijn lichaam — overtreding?',
                ],
            },
            level3: {
                uitleg: 'Tactiek & Techniek — dubbelspel-volgorde, expedite en time-outs.',
                spelregels: [
                    'Slagvolgorde dubbel: Bij dubbelspel moeten de spelers de bal om de beurt slaan.',
                    'Expedite systeem: Als een game langer dan 10 minuten duurt, moet de serveerder direct het punt winnen als de ontvanger 13 keer retourneert.',
                    'Batje-kleuren: Het rubber moet aan de ene kant zwart zijn en aan de andere kant rood.',
                    'Time-out: Je mag per wedstrijd één time-out van 1 minuut aanvragen.',
                    'Afdrogen: Spelers mogen alleen om de 6 punten hun handen/gezicht afdrogen.',
                ],
                taken: [
                    'Beheer meerdere tafels als toernooischeidsrechter.',
                    'Noteer de eindstand en geef die door aan de toernooileider.',
                    'Activeer het expedite systeem als een game te lang duurt.',
                    'Los protestsituaties kalm op.',
                ],
                beslissingen: [
                    'In dubbelspel slaat een speler tweemaal achter elkaar — fout?',
                    'Een game duurt 11 minuten — wanneer activeer je het expedite systeem?',
                    'Een speler wil zijn handdoek afdrogen na 4 punten — mag dat?',
                    'Twee spelers hebben verschillende scores onthouden — hoe herstel je de juiste stand?',
                ],
            },
        },
   coach: {
            level1: {
                uitleg: 'De Spotter — Observeer de houding en de basisbeweging van de speler.',
                kijkwijzer: [
                    'Heeft een goede basispositie (licht gebogen benen, vlak achter de tafel)',
                    'Slaat vloeiend door de bal heen (follow-through van het batje)',
                    'Houdt de ogen op de bal én op de beweging van de tegenstander',
                    'Gebruikt actief de pols bij de service'
                ],
                taken: [
                    'Kies 1 speler aan de tafel om te observeren.',
                    'Turf met (+) en (-) tijdens het spelen.',
                    'Geef tussen twee games of momenten een technische aanwijzing.'
                ]
            },
            level2: {
                uitleg: 'De Analist — Veel punten gaan verloren door verkeerd te reageren op effect.',
                kijkwijzer: [
                    'Heeft een goede actieve basispositie',
                    'Slaat vloeiend door de bal heen',
                    'Houdt goed overzicht op de bal en tegenstander',
                    'Gebruikt goed polswerk'
                ],
                analyse_opties: [
                    'Stond te recht op of reikte te ver over de tafel',
                    'De armbeweging was te "hakkerig" of stopte te abrupt',
                    'Slaagde er niet in het inkomende effect van de tegenstander te "lezen"',
                    'Raakte de bal te laat (liet hem te ver vallen achter de tafel)'
                ],
                taken: [
                    'Kies 1 speler om te observeren.',
                    'Noteer bij een fout in het net of buiten tafel de oorzaak.',
                    'Laat de speler weten welk effect of houding het probleem is.'
                ]
            },
            level3: {
                uitleg: 'De Interveniënt — Ontdek de zwakte van de tegenstander en pas de strategie aan.',
                tactiek: [
                    'Speler plaatst de bal bewust diep, kort of wijd (laat de ander lopen)',
                    'Er is variatie in service en slagen om ritme te breken',
                    'Speler merkt op of de tegenstander slechter is in forehand of backhand',
                    'Speler blijft mentaal rustig na een fout en past zich aan'
                ],
                taken: [
                    'Observeer de match vanuit tactisch standpunt.',
                    'Gebruik de 1-minuut time-out (expedite) om bij te sturen.',
                    'Fluister een tactiek in: "Sla nu alles op zijn backhand".'
                ]
            }
        }
    },

    andere: {
        arbiter: {
            level1: {
                uitleg: 'De Basis — vraag aan je leerkracht welke regels gelden voor vandaag.',
                spelregels: [
                    'Vraag aan de leerkracht welke specifieke regels gelden voor vandaag.',
                    'Zorg dat je de scoring begrijpt voordat het spel begint.',
                    'Weet hoe het spel hervat wordt na een overtreding.',
                    'Ken het verschil tussen een kleine en een ernstige overtreding.',
                    'Weet wanneer een punt geldig is en wanneer niet.',
                ],
                taken: [
                    'Houd de score bij voor beide teams.',
                    'Roep overtredingen duidelijk aan.',
                    'Wijs de correcte hervatting toe.',
                    'Noteer de stand na elk punt.',
                ],
            },
            level2: {
                uitleg: 'Overtredingen — neem actieve beslissingen en communiceer duidelijk.',
                spelregels: [
                    'Beslis snel en duidelijk bij twijfelgevallen.',
                    'Houd de tijd bij.',
                    'Geef waarschuwingen bij herhaalde overtredingen.',
                    'Communiceer beslissingen naar beide teams.',
                    'Zorg voor een eerlijk en vlot spelverloop.',
                ],
                taken: [
                    'Beslis snel bij twijfelgevallen.',
                    'Houd de tijd bij.',
                    'Geef waarschuwingen bij herhaalde overtredingen.',
                    'Communiceer beslissingen duidelijk naar beide teams.',
                ],
                beslissingen: [
                    'Een speler protesteert jouw beslissing — hoe reageer je?',
                    'De score is betwist — hoe herstel je de juiste stand?',
                    'Een speler maakt een gevaarlijke actie — wat doe je?',
                ],
            },
            level3: {
                uitleg: 'Wedstrijdleiding — beheer het volledige spelverloop professioneel.',
                spelregels: [
                    'Coördineer het wedstrijdverloop van begin tot einde.',
                    'Communiceer de eindstand aan alle betrokkenen.',
                    'Geef feedback na de wedstrijd aan beide teams.',
                    'Beheer conflicten kalm en neutraal.',
                    'Zorg voor de veiligheid van alle deelnemers.',
                ],
                taken: [
                    'Coördineer het wedstrijdverloop.',
                    'Communiceer de eindstand.',
                    'Geef feedback na de wedstrijd.',
                    'Beheer conflicten kalm en neutraal.',
                ],
                beslissingen: [
                    'Beide teams zijn het niet eens over de eindstand — hoe los je dit op?',
                    'Een speler is geblesseerd — wat zijn jouw taken?',
                    'Het spel moet gestopt worden — hoe doe je dit?',
                ],
            },
        },
   coach: {
            level1: {
                uitleg: 'De Spotter — Observeer de basisacties die de leerkracht voor dit spel heeft uitgelegd.',
                kijkwijzer: [
                    'Kijkt goed naar de medespeler vóór de actie',
                    'Voert de afgesproken basistechniek correct en veilig uit',
                    'Beweegt zich vrij nadat de actie is voltooid',
                    'Toont inzet en doet actief mee met het spel'
                ],
                taken: [
                    'Kies 1 speler om te observeren.',
                    'Turf de acties: (+) voor goed, (-) voor werkpunt.',
                    'Geef de speler 1 concrete en positieve tip op basis van je lijst.'
                ]
            },
            level2: {
                uitleg: 'De Analist — Probeer te begrijpen wáárom een spelmoment slaagt of mislukt.',
                kijkwijzer: [
                    'Kijkt goed naar de medespeler vóór de actie',
                    'Voert de basistechniek correct en veilig uit',
                    'Beweegt zich vrij nadat de actie is voltooid',
                    'Speelt samen'
                ],
                analyse_opties: [
                    'Actie werd te gehaast en onder druk uitgevoerd',
                    'Ging voor de moeilijke optie in plaats van de makkelijke (verkeerde beslissing)',
                    'De uitgelegde techniek werd niet toegepast of vergeten',
                    'Er was onvoldoende communicatie of de spelers liepen in elkaars weg'
                ],
                taken: [
                    'Kies 1 speler om te observeren.',
                    'Als je een (-) geeft, denk na wáárom het misging en vul dit in.',
                    'Bespreek de oorzaken rustig met de speler.'
                ]
            },
            level3: {
                uitleg: 'De Interveniënt — Focus op de teamtactiek en grijp in indien de afspraken niet nageleefd worden.',
                tactiek: [
                    'Het team gebruikt de ruimte goed en staat niet op een kluitje',
                    'Iedereen is betrokken bij het spel (niemand wordt uitgesloten)',
                    'De taken tussen aanval en verdediging (of de rollen van het spel) zijn duidelijk verdeeld',
                    'Spelers peppen elkaar op bij verlies'
                ],
                taken: [
                    'Observeer het team als geheel.',
                    'Leg het spel kort stil (Time-Out) als het doel van het spel verloren gaat.',
                    'Geef het team 1 duidelijke, constructieve opdracht mee om direct aan te passen.'
                ]
            }
        }
    }
};

// ─── SEEDING FUNCTIE ──────────────────────────────────────────────────────────
async function seedSportLabContent() {
    console.log('🌱 Start seeding sport_lab_content...\n');

    const sporten = Object.keys(CONTENT);
    let succes = 0;
    let fouten = 0;

    for (const sport of sporten) {
        try {
            await db.collection('sport_lab_content').doc(sport).set(
                CONTENT[sport],
                { merge: true }
            );
            console.log(`✅ ${sport}`);
            succes++;
        } catch (error) {
            console.error(`❌ ${sport}: ${error.message}`);
            fouten++;
        }
    }

    console.log(`\n📊 Klaar: ${succes} sporten geseed, ${fouten} fouten.`);
    console.log('📁 Collectie: sport_lab_content');
    console.log('📝 Rollen: arbiter (level 1, 2 en 3) voor alle 9 sporten');

    process.exit(0);
}

seedSportLabContent().catch(err => {
    console.error('Kritieke fout:', err);
    process.exit(1);
});