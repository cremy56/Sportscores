// src/pages/Privacy.jsx
import { useEffect } from 'react';

const Section = ({ id, title, children }) => (
    <section id={id} className="mb-10 scroll-mt-24">
        <h2 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">{title}</h2>
        <div className="text-slate-600 space-y-3 leading-relaxed">{children}</div>
    </section>
);

const Table = ({ rows }) => (
    <div className="overflow-x-auto rounded-xl border border-slate-200 mt-4">
        <table className="w-full text-sm">
            <thead className="bg-slate-50">
                <tr>
                    {rows[0].map((h, i) => (
                        <th key={i} className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-200">{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {rows.slice(1).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                        {row.map((cell, j) => (
                            <td key={j} className="px-4 py-3 text-slate-600 align-top">{cell}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const TOCItem = ({ href, label }) => (
    <li>
        <a href={href} className="text-blue-600 hover:text-blue-800 hover:underline text-sm">
            {label}
        </a>
    </li>
);

const RightCard = ({ icon, title, desc }) => (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">{icon}</span>
            <div>
                <p className="font-semibold text-slate-800 text-sm">{title}</p>
                <p className="text-slate-600 text-sm mt-1">{desc}</p>
            </div>
        </div>
    </div>
);

export default function Privacy() {
    useEffect(() => {
        document.title = 'Privacyverklaring | SportScores';
    }, []);

    const lastUpdated = '27 april 2026';

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-xs font-bold">SS</span>
                    </div>
                    <span className="font-semibold text-slate-800">SportScores</span>
                    <span className="text-slate-400">—</span>
                    <span className="text-slate-600 text-sm">Privacyverklaring</span>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-10">
                <div className="flex gap-8">

                    {/* Inhoudsopgave — desktop */}
                    <aside className="hidden lg:block w-56 flex-shrink-0">
                        <div className="sticky top-24 bg-white rounded-xl border border-slate-200 p-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Inhoud</p>
                            <ul className="space-y-2">
                                <TOCItem href="#verantwoordelijke" label="1. Verwerkingsverantwoordelijke" />
                                <TOCItem href="#gegevens" label="2. Welke gegevens" />
                                <TOCItem href="#doeleinden" label="3. Doeleinden & rechtsgrond" />
                                <TOCItem href="#bewaartermijnen" label="4. Bewaartermijnen" />
                                <TOCItem href="#ontvangers" label="5. Ontvangers" />
                                <TOCItem href="#doorgifte" label="6. Doorgifte buiten EU" />
                                <TOCItem href="#rechten" label="7. Uw rechten" />
                                <TOCItem href="#minderjarigen" label="8. Minderjarigen" />
                                <TOCItem href="#beveiliging" label="9. Beveiliging" />
                                <TOCItem href="#klacht" label="10. Klacht indienen" />
                                <TOCItem href="#wijzigingen" label="11. Wijzigingen" />
                            </ul>
                        </div>
                    </aside>

                    {/* Hoofdinhoud */}
                    <main className="flex-1 min-w-0">
                        <div className="bg-white rounded-2xl border border-slate-200 p-8">

                            {/* Titel */}
                            <div className="mb-10">
                                <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full mb-4">
                                    🔒 AVG / GDPR conform
                                </div>
                                <h1 className="text-3xl font-bold text-slate-900 mb-3">Privacyverklaring SportScores</h1>
                                <p className="text-slate-500 text-sm">Laatste update: {lastUpdated} · Versie 1.0</p>

                                {/* Samenvatting voor leerlingen */}
                                <div className="mt-6 p-5 bg-amber-50 border border-amber-200 rounded-xl">
                                    <p className="text-sm font-semibold text-amber-900 mb-2">📋 Samenvatting in eenvoudige taal</p>
                                    <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                                        <li>SportScores bewaart jouw sportresultaten en een zelfgekozen bijnaam (nickname).</li>
                                        <li>Je echte naam is versleuteld opgeslagen — leerkrachten zien je naam, maar ze staat nooit op een scherm of ranking.</li>
                                        <li>Op het scorebord en de highscores staat enkel jouw nickname, nooit je echte naam.</li>
                                        <li>Je kan je nickname op elk moment wijzigen via je profiel.</li>
                                        <li>Je kan altijd vragen om je gegevens in te zien of te verwijderen.</li>
                                    </ul>
                                </div>
                            </div>

                            {/* 1. Verwerkingsverantwoordelijke */}
                            <Section id="verantwoordelijke" title="1. Verwerkingsverantwoordelijke">
                                <p>
                                    SportScores is een digitaal platform voor sportprestatieopvolging binnen scholen, ontwikkeld en beheerd door:
                                </p>
                                <div className="bg-slate-50 rounded-xl p-4 mt-3 text-sm space-y-1">
                                    <p className="font-semibold text-slate-800">Christoph Lemaire — SportScores</p>
                                    <p>Eenmanszaak · Ondernemingsnummer: BE 0123.456.789 <em>(fictief)</em></p>
                                    <p>Fictief Adres 1, 9120 Beveren</p>
                                    <p>E-mail: <a href="mailto:privacy@sportscores.be" className="text-blue-600 hover:underline">privacy@sportscores.be</a></p>
                                    <p>Website: <a href="https://www.sportscores.be" className="text-blue-600 hover:underline">www.sportscores.be</a></p>
                                </div>

                                <p className="mt-4">
                                    Als ontwikkelaar en beheerder van SportScores treedt Christoph Lemaire op als <strong>verwerkingsverantwoordelijke</strong> in de zin van Art. 4(7) AVG:
                                    hij bepaalt de doeleinden en middelen van de verwerking van persoonsgegevens via het platform.
                                </p>

                                <p>
                                    De scholen die SportScores gebruiken (zoals Koninklijk Atheneum Beveren) verstrekken leerlingendata aan SportScores
                                    in het kader van hun onderwijsopdracht. Met elke school wordt een afzonderlijke
                                    <strong> verwerkersovereenkomst (Data Processing Agreement)</strong> gesloten conform Art. 28 AVG.
                                </p>

                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4 text-sm">
                                    <p className="font-semibold text-blue-900 mb-1">ℹ️ Geen DPO aangesteld</p>
                                    <p className="text-blue-800">
                                        Gezien de huidige schaal van de verwerking (één school, beperkt aantal leerlingen) is er nog geen
                                        Functionaris voor Gegevensbescherming (DPO) aangesteld. Bij opschaling naar meerdere scholen
                                        zal dit worden herzien conform Art. 37(1)(b) AVG.
                                        Voor alle privacyvragen kunt u rechtstreeks contact opnemen via{' '}
                                        <a href="mailto:privacy@sportscores.be" className="underline">privacy@sportscores.be</a>.
                                        Wij antwoorden binnen 5 werkdagen.
                                    </p>
                                </div>
                            </Section>

                            {/* 2. Welke gegevens */}
                            <Section id="gegevens" title="2. Welke persoonsgegevens verwerken wij?">
                                <p>
                                    SportScores verwerkt uitsluitend de gegevens die strikt noodzakelijk zijn voor de werking van het platform
                                    (dataminimalisatie, Art. 5(1)(c) AVG):
                                </p>

                                <Table rows={[
                                    ['Categorie', 'Concrete gegevens', 'Hoe opgeslagen'],
                                    ['Identificatie', 'Smartschool-gebruikers-ID', 'Eenrichtingsversleuteld (SHA-256 hash) — nooit in originele vorm opgeslagen'],
                                    ['Naam', 'Voor- en achternaam', 'AES-256-GCM versleuteld — enkel leerkrachten zien de ontsleutelde naam'],
                                    ['Profiel', 'Zelfgekozen nickname, klas, geslacht', 'Nickname is pseudoniem en zelfgekozen — geen echte naam'],
                                    ['Sportprestaties', 'Testresultaten, scores, datums, groep', 'Gekoppeld aan gehashte ID — niet aan naam'],
                                    ['Technisch', 'Aanmeldmoment, laatste login', 'Geen locatiegegevens, geen apparaatinformatie, geen cookies'],
                                    ['Welzijn (optioneel)', 'Slaapuren, stappen, humeur (zelfgerapporteerd)', 'Enkel bij actieve invoer door de leerling zelf — zie §3'],
                                ]} />

                                <p className="mt-4">
                                    <strong>Wij verwerken uitdrukkelijk géén:</strong> geboortedatum, rijksregisternummer, financiële gegevens,
                                    biometrische gegevens, locatiegegevens of gegevens over ras, geloof of politieke overtuiging.
                                    De leeftijd van een leerling wordt afgeleid uit de klas (bv. "3A" = leerjaar 3), niet uit de geboortedatum.
                                </p>

                                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mt-4 text-sm">
                                    <p className="font-semibold text-orange-900 mb-1">⚠️ Welzijnsmodule — bijzondere categorie (Art. 9 AVG)</p>
                                    <p className="text-orange-800">
                                        De welzijnsmodule laat leerlingen toe vrijwillig gegevens over slaap, stappen en humeur bij te houden.
                                        Dit zijn mogelijk gegevens over gezondheid in de zin van Art. 9 AVG.
                                        Deze gegevens worden enkel verwerkt op basis van de <strong>uitdrukkelijke toestemming</strong> van de leerling
                                        bij elke afzonderlijke invoer (Art. 9(2)(a) AVG).
                                        Leerkrachten zien enkel geaggregeerde, anonieme statistieken — nooit individuele gezondheidsdata.
                                        De welzijnsmodule kan door de schooladministrator worden uitgeschakeld.
                                    </p>
                                </div>
                            </Section>

                            {/* 3. Doeleinden */}
                            <Section id="doeleinden" title="3. Doeleinden en rechtsgrond voor de verwerking">
                                <Table rows={[
                                    ['Doel', 'Rechtsgrond (Art. 6 AVG)', 'Toelichting'],
                                    [
                                        'Sportprestaties opvolgen en rapporteren',
                                        'Art. 6(1)(e) — taak van algemeen belang',
                                        'Ondersteuning van lichamelijke opvoeding als kerntaak van de school'
                                    ],
                                    [
                                        'Authenticatie en toegangscontrole',
                                        'Art. 6(1)(e) — taak van algemeen belang',
                                        'Veilige login via Smartschool OAuth — enkel geautoriseerde gebruikers krijgen toegang'
                                    ],
                                    [
                                        'Highscores en motivatie (nickname)',
                                        'Art. 6(1)(f) — gerechtvaardigd belang',
                                        'Enkel pseudonieme nicknames op schermen — nooit echte namen. Leerlingen kiezen en controleren hun nickname zelf.'
                                    ],
                                    [
                                        'Individueel groeiplan en trainingssuggesties',
                                        'Art. 6(1)(e) — taak van algemeen belang',
                                        'Leerkracht volgt individuele vooruitgang op en geeft gerichte feedback'
                                    ],
                                    [
                                        'Welzijnsmodule (optioneel)',
                                        'Art. 6(1)(a) + Art. 9(2)(a) — toestemming',
                                        'Leerling geeft bij elke invoer uitdrukkelijke toestemming. Toestemming is te allen tijde intrekbaar.'
                                    ],
                                    [
                                        'Beveiliging en audit',
                                        'Art. 6(1)(c) — wettelijke verplichting',
                                        'Audit logs voor toegangscontrole, incidentbeheer en naleving van beveiligingsverplichtingen'
                                    ],
                                    [
                                        'GDPR-archivering alltime rankings',
                                        'Art. 6(1)(f) — gerechtvaardigd belang',
                                        'Bevroren nickname (zonder persoonsgegevens) in historische rankings na afstuderen. Geen leerling-ID bewaard.'
                                    ],
                                ]} />

                                <p className="mt-4">
                                    <strong>Gerechtvaardigd belang (Art. 6(1)(f)) — afweging:</strong> het belang bij het tonen van pseudonieme rankings
                                    (motivatie, sportcultuur op school) weegt zwaarder dan de privacybelangen van leerlingen omdat (a) uitsluitend
                                    zelfgekozen nicknames zichtbaar zijn, (b) echte namen nooit op publieke schermen verschijnen, en (c) leerlingen
                                    hun nickname te allen tijde kunnen wijzigen of laten verwijderen.
                                </p>
                            </Section>

                            {/* 4. Bewaartermijnen */}
                            <Section id="bewaartermijnen" title="4. Bewaartermijnen">
                                <Table rows={[
                                    ['Gegevens', 'Bewaartermijn', 'Wat gebeurt er daarna'],
                                    [
                                        'Actief gebruikersprofiel',
                                        'Zolang de leerling actief is in Smartschool',
                                        'Bij detectie via Smartschool sync: 30 dagen overgangsperiode, dan deactivatie'
                                    ],
                                    [
                                        'Gedeactiveerd profiel',
                                        'Tot het "virtueel afstudeerjaar" + 1 jaar',
                                        'Definitieve verwijdering in januari van het jaar ná het virtueel afstudeerjaar'
                                    ],
                                    [
                                        'Sportscores (resultaten)',
                                        'Max. 10 jaar na het einde van de inschrijving',
                                        'Na verwijdering profiel: scores blijven bewaard maar zijn niet meer aan een identiteit gekoppeld'
                                    ],
                                    [
                                        'Alltime top 5 rankings (archief)',
                                        'Permanent',
                                        'Enkel nickname bewaard — geen persoonsgegevens, geen leerling-ID'
                                    ],
                                    [
                                        'Geblokkeerde nicknames',
                                        'Permanent',
                                        'Voorkomen dat een andere leerling dezelfde nickname kiest en zo verward wordt met iemand in de alltime ranking'
                                    ],
                                    [
                                        'Welzijnsgegevens',
                                        'Lopend schooljaar + 1 jaar',
                                        'Of eerder op verzoek van de leerling'
                                    ],
                                    [
                                        'Audit logs',
                                        '1 jaar',
                                        'Automatisch gewist'
                                    ],
                                ]} />

                                <div className="bg-slate-50 rounded-xl p-4 mt-4 text-sm border border-slate-200">
                                    <p className="font-semibold text-slate-800 mb-2">📅 Hoe werkt het "virtueel afstudeerjaar"?</p>
                                    <p className="text-slate-600">
                                        Wanneer een leerling de school verlaat (detecteerbaar via de Smartschool synchronisatie),
                                        berekenen wij op basis van de klas bij vertrek hoelang hij normaal gezien nog op school zou gebleven zijn.
                                    </p>
                                    <p className="text-slate-600 mt-2">
                                        <strong>Voorbeeld:</strong> een leerling verlaat de school in het 4de leerjaar.
                                        Hij zou normaal in het 6de afstuderen — dat zijn nog 2 jaar.
                                        Het virtueel afstudeerjaar is dus het huidige schooljaar + 2.
                                        De gegevens worden bewaard tot januari van het jaar <em>ná</em> dat afstudeerjaar,
                                        zodat een eventuele terugkeer naar de school nog mogelijk is.
                                    </p>
                                    <p className="text-slate-600 mt-2">
                                        <strong>Voorbeeld:</strong> verlaat in schooljaar 2024-2025 in het 4de →
                                        virtueel afstudeerjaar = 2026-2027 →
                                        gegevens worden gewist in <strong>januari 2028</strong>.
                                    </p>
                                    <p className="text-slate-600 mt-2">
                                        Keert de leerling terug naar de school vóór die datum, dan wordt het profiel automatisch
                                        opnieuw geactiveerd bij de eerstvolgende Smartschool synchronisatie.
                                    </p>
                                </div>

                                <p className="mt-4">
                                    De 30-daagse overgangsperiode bij deactivatie dient als veiligheidsmarge voor technische fouten
                                    bij de synchronisatie, tijdelijke administratieve vertragingen of leerlingen die tijdelijk niet
                                    in Smartschool geregistreerd staan (bv. bij een overschrijving tussen scholen).
                                </p>
                            </Section>

                            {/* 5. Ontvangers */}
                            <Section id="ontvangers" title="5. Ontvangers van persoonsgegevens">
                                <Table rows={[
                                    ['Ontvanger', 'Rol', 'Welke gegevens', 'Rechtsgrond'],
                                    [
                                        'Leerkrachten van de aangesloten school',
                                        'Intern — enkel eigen klassen',
                                        'Ontsleutelde naam + scores van eigen leerlingen',
                                        'Art. 6(1)(e)'
                                    ],
                                    [
                                        'Schooladministrator',
                                        'Intern — volledig overzicht eigen school',
                                        'Alle gegevens van eigen school',
                                        'Art. 6(1)(e)'
                                    ],
                                    [
                                        'Vercel Inc. (hosting)',
                                        'Verwerker (Art. 28 AVG)',
                                        'Technische verwerking — geen inhoudelijke toegang tot data',
                                        'Verwerkersovereenkomst'
                                    ],
                                    [
                                        'Google LLC (Firebase/Firestore)',
                                        'Verwerker (Art. 28 AVG)',
                                        'Versleutelde gegevensopslag',
                                        'Verwerkersovereenkomst'
                                    ],
                                    [
                                        'Smartschool (Vrije Tijd NV)',
                                        'Authenticatiebron',
                                        'Enkel authenticatietoken — geen sportdata wordt gedeeld met Smartschool',
                                        'Art. 6(1)(e)'
                                    ],
                                ]} />

                                <p className="mt-4">
                                    Persoonsgegevens worden <strong>nooit</strong> verkocht, verhuurd of doorgegeven aan derden
                                    voor commerciële, marketing- of andere doeleinden.
                                    SportScores werkt met geen enkele advertentiepartner samen en plaatst geen advertenties.
                                </p>
                            </Section>

                            {/* 6. Doorgifte buiten EU */}
                            <Section id="doorgifte" title="6. Doorgifte buiten de Europese Economische Ruimte">
                                <p>
                                    Twee van onze verwerkers zijn Amerikaanse ondernemingen. Wij hebben de nodige garanties ingebouwd:
                                </p>
                                <div className="space-y-3 mt-3">
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-sm">
                                        <p className="font-semibold text-slate-800">Vercel Inc. (hosting)</p>
                                        <p className="text-slate-600 mt-1">
                                            Alle data wordt verwerkt op Europese servers (Frankfurt, regio eu-west1).
                                            Vercel heeft Standard Contractual Clauses (SCC) ondertekend conform Art. 46(2)(c) AVG.
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-sm">
                                        <p className="font-semibold text-slate-800">Google LLC (Firebase/Firestore)</p>
                                        <p className="text-slate-600 mt-1">
                                            Data wordt opgeslagen in de EU-regio (europe-west1, België/Nederland).
                                            Google heeft eveneens SCC's ondertekend en is gecertificeerd onder de EU-US Data Privacy Framework.
                                        </p>
                                    </div>
                                </div>
                                <p className="mt-3">
                                    Er vindt <strong>geen andere doorgifte</strong> plaats naar landen buiten de EER.
                                </p>
                            </Section>

                            {/* 7. Rechten */}
                            <Section id="rechten" title="7. Uw rechten als betrokkene">
                                <p>
                                    Op basis van de AVG beschikt u over de volgende rechten.
                                    U oefent ze uit door een e-mail te sturen naar{' '}
                                    <a href="mailto:privacy@sportscores.be" className="text-blue-600 hover:underline">privacy@sportscores.be</a>{' '}
                                    met vermelding van uw naam en school. Wij behandelen uw verzoek binnen <strong>30 dagen</strong>.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                    <RightCard icon="👁️" title="Recht op inzage (Art. 15)"
                                        desc="U kunt opvragen welke gegevens over u worden verwerkt en een kopie hiervan ontvangen." />
                                    <RightCard icon="✏️" title="Recht op rectificatie (Art. 16)"
                                        desc="U kunt onjuiste of onvolledige gegevens laten corrigeren. Uw nickname kunt u zelf wijzigen in de app." />
                                    <RightCard icon="🗑️" title="Recht op verwijdering (Art. 17)"
                                        desc="U kunt vragen om uw gegevens te verwijderen. Let op: sportscores in de alltime top 5 worden geanonimiseerd bewaard (enkel nickname, geen naam of ID)." />
                                    <RightCard icon="⏸️" title="Recht op beperking (Art. 18)"
                                        desc="U kunt de verwerking tijdelijk laten beperken, bijvoorbeeld terwijl een correctieverzoek wordt behandeld." />
                                    <RightCard icon="📦" title="Recht op overdraagbaarheid (Art. 20)"
                                        desc="U kunt uw sportscores en profielgegevens opvragen in een gestructureerd, leesbaar formaat (JSON/CSV)." />
                                    <RightCard icon="🚫" title="Recht van bezwaar (Art. 21)"
                                        desc="U kunt bezwaar maken tegen verwerking op basis van gerechtvaardigd belang (bv. weergave nickname in rankings)." />
                                    <RightCard icon="↩️" title="Intrekking toestemming (welzijn)"
                                        desc="Toestemming voor de welzijnsmodule kan te allen tijde worden ingetrokken. Dit heeft geen terugwerkende kracht." />
                                    <RightCard icon="🤖" title="Geautomatiseerde beslissingen (Art. 22)"
                                        desc="SportScores neemt geen geautomatiseerde beslissingen met rechtsgevolgen of aanzienlijke impact." />
                                </div>

                                <p className="mt-4 text-sm">
                                    Alle rechten worden <strong>gratis</strong> uitgeoefend. Bij kennelijk ongegronde of buitensporige verzoeken
                                    kunnen wij een redelijke vergoeding vragen of het verzoek weigeren (Art. 12(5) AVG), mits motivering.
                                    In complexe gevallen kunnen wij de termijn van 30 dagen met 2 maanden verlengen, mits kennisgeving.
                                </p>
                            </Section>

                            {/* 8. Minderjarigen */}
                            <Section id="minderjarigen" title="8. Bijzondere bescherming van minderjarigen">
                                <p>
                                    SportScores is uitsluitend bestemd voor gebruik binnen de schoolcontext.
                                    De gebruikers zijn voor het overgrote deel minderjarigen (12–18 jaar).
                                    Wij passen de volgende extra beschermingsmaatregelen toe:
                                </p>
                                <ul className="list-disc list-inside space-y-2 mt-3">
                                    <li>Echte namen zijn <strong>nooit zichtbaar</strong> op publieke schermen of rankings — enkel zelfgekozen pseudonieme nicknames.</li>
                                    <li>Leerlingen kiezen hun eigen nickname bij eerste aanmelding en kunnen deze te allen tijde wijzigen.</li>
                                    <li>Leerkrachten zien enkel leerlingen van hun eigen toegewezen klassen.</li>
                                    <li>Er zijn geen advertenties, geen tracking voor commerciële doeleinden, geen profilering.</li>
                                    <li>De welzijnsmodule vereist een actieve, bewuste handeling van de leerling bij elke invoer.</li>
                                    <li>Toegang is enkel mogelijk via Smartschool OAuth — niet via sociale media of externe accounts.</li>
                                </ul>

                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4 text-sm">
                                    <p className="font-semibold text-blue-900 mb-1">🇧🇪 Belgische leeftijdsgrens (Art. 8 AVG)</p>
                                    <p className="text-blue-800">
                                        In België geldt 13 jaar als minimumleeftijd voor informatiesamenlevingsdiensten waarvoor toestemming als rechtsgrond wordt gebruikt.
                                        Omdat de basisfunctionaliteit van SportScores gebaseerd is op de onderwijstaak van de school (Art. 6(1)(e) AVG) —
                                        en niet op toestemming — is afzonderlijke ouderlijke toestemming voor de kernfunctionaliteit niet vereist.
                                        De welzijnsmodule vereist wel de uitdrukkelijke toestemming van de leerling zelf (Art. 9(2)(a) AVG).
                                        De school informeert ouders over het gebruik van SportScores via het schoolreglement en/of het schoolinformatieblad.
                                    </p>
                                </div>
                            </Section>

                            {/* 9. Beveiliging */}
                            <Section id="beveiliging" title="9. Beveiliging van persoonsgegevens">
                                <p>
                                    Wij nemen passende technische en organisatorische maatregelen conform Art. 32 AVG
                                    om persoonsgegevens te beschermen tegen ongeoorloofde toegang, verlies of vernietiging:
                                </p>
                                <ul className="list-disc list-inside space-y-2 mt-3">
                                    <li><strong>Naamversleuteling:</strong> Namen worden versleuteld met AES-256-GCM. De versleutelingssleutel is opgeslagen in Google Secret Manager, volledig gescheiden van de data.</li>
                                    <li><strong>Pseudonimisering van ID's:</strong> Smartschool-gebruikers-ID's worden eenrichtingsgehasht (SHA-256). Sportscores zijn gekoppeld aan de hash, niet aan de naam.</li>
                                    <li><strong>Rol-gebaseerde toegangscontrole:</strong> Leerkrachten zien enkel hun eigen klassen. Leerlingen zien enkel hun eigen data. Admins beheren enkel hun eigen school.</li>
                                    <li><strong>API-first architectuur:</strong> Geen directe databasetoegang vanuit de browser — alle data loopt via een beveiligde server-side API met tokenverificatie.</li>
                                    <li><strong>Transportbeveiliging:</strong> Alle verbindingen verlopen via TLS 1.3.</li>
                                    <li><strong>Audit logs:</strong> Alle administratieve handelingen worden gelogd met tijdstempel en gebruikers-ID.</li>
                                    <li><strong>Toegangsbeleid:</strong> Enkel via Smartschool OAuth — geen wachtwoordloze toegang of sociale media logins.</li>
                                </ul>

                                <p className="mt-4">
                                    Bij een inbreuk op de beveiliging die een risico inhoudt voor betrokkenen, zullen wij de{' '}
                                    <strong>Gegevensbeschermingsautoriteit (GBA) binnen 72 uur informeren</strong> (Art. 33 AVG)
                                    en betrokkenen zo snel mogelijk verwittigen indien het risico hoog is (Art. 34 AVG).
                                </p>
                            </Section>

                            {/* 10. Klacht */}
                            <Section id="klacht" title="10. Klacht indienen bij de toezichthoudende autoriteit">
                                <p>
                                    U heeft het recht een klacht in te dienen bij de Belgische toezichthoudende autoriteit als u
                                    van mening bent dat de verwerking van uw persoonsgegevens de AVG schendt.
                                    Wij verzoeken u echter om bezwaren eerst bij ons te melden via{' '}
                                    <a href="mailto:privacy@sportscores.be" className="text-blue-600 hover:underline">privacy@sportscores.be</a>{' '}
                                    zodat wij de gelegenheid krijgen het probleem op te lossen.
                                </p>
                                <div className="bg-slate-50 rounded-xl p-4 mt-3 text-sm space-y-1">
                                    <p className="font-semibold text-slate-800">Gegevensbeschermingsautoriteit (GBA)</p>
                                    <p>Persstraat 35, 1000 Brussel</p>
                                    <p>Tel: +32 (0)2 274 48 00</p>
                                    <p>
                                        Website:{' '}
                                        <a href="https://www.gegevensbeschermingsautoriteit.be" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                            www.gegevensbeschermingsautoriteit.be
                                        </a>
                                    </p>
                                    <p>E-mail: <a href="mailto:contact@apd-gba.be" className="text-blue-600 hover:underline">contact@apd-gba.be</a></p>
                                </div>
                            </Section>

                            {/* 11. Wijzigingen */}
                            <Section id="wijzigingen" title="11. Wijzigingen aan deze privacyverklaring">
                                <p>
                                    Wij kunnen deze privacyverklaring aanpassen wanneer de wetgeving, onze verwerkingen of de schaalgrootte
                                    van SportScores dit vereist. De datum van de laatste update staat bovenaan dit document.
                                </p>
                                <p>
                                    <strong>Wezenlijke wijzigingen</strong> — zoals een verandering in de identiteit van de verwerkingsverantwoordelijke,
                                    nieuwe verwerkingsdoeleinden of wijzigingen in de rechten van betrokkenen — worden actief gecommuniceerd
                                    via de SportScores-applicatie en/of het Smartschool-platform van de school.
                                </p>
                                <p>
                                    <strong>Niet-wezenlijke wijzigingen</strong> — zoals verbeteringen van de formulering of correcties van spelfouten —
                                    worden stilzwijgend doorgevoerd.
                                </p>
                            </Section>

                            {/* Footer */}
                            <div className="mt-10 pt-6 border-t border-slate-200 text-center">
                                <p className="text-xs text-slate-400 max-w-2xl mx-auto">
                                    Deze privacyverklaring werd opgesteld conform de Algemene Verordening Gegevensbescherming
                                    (AVG/GDPR, EU 2016/679), de Belgische wet van 30 juli 2018 betreffende de bescherming van
                                    natuurlijke personen met betrekking tot de verwerking van persoonsgegevens, en de richtlijnen
                                    van de Belgische Gegevensbeschermingsautoriteit (GBA).
                                </p>
                                <p className="text-xs text-slate-400 mt-2">
                                    SportScores · Christoph Lemaire · BE 0123.456.789 · Versie 1.0 · {lastUpdated}
                                </p>
                            </div>

                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}