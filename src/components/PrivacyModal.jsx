// src/components/PrivacyModal.jsx
import { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

// ─── Sub-components ───────────────────────────────────────────────────────────
const Section = ({ id, title, children }) => (
    <section id={id} className="mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">{title}</h2>
        <div className="text-slate-600 space-y-3 leading-relaxed text-sm">{children}</div>
    </section>
);

const Table = ({ rows }) => (
    <div className="overflow-x-auto rounded-xl border border-slate-200 mt-3">
        <table className="w-full text-xs">
            <thead className="bg-slate-50">
                <tr>
                    {rows[0].map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left font-semibold text-slate-700 border-b border-slate-200">{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {rows.slice(1).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                        {row.map((cell, j) => (
                            <td key={j} className="px-3 py-2 text-slate-600 align-top">{cell}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const RightCard = ({ icon, title, desc }) => (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
        <div className="flex items-start gap-2">
            <span className="text-lg flex-shrink-0">{icon}</span>
            <div>
                <p className="font-semibold text-slate-800 text-xs">{title}</p>
                <p className="text-slate-600 text-xs mt-1">{desc}</p>
            </div>
        </div>
    </div>
);

// ─── Modal ────────────────────────────────────────────────────────────────────
export default function PrivacyModal({ isOpen, onClose }) {
    const lastUpdated = '27 april 2026';

    // Sluit bij Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">🔒</span>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900">Privacyverklaring SportScores</h1>
                            <p className="text-xs text-slate-500">Laatste update: {lastUpdated} · Versie 1.0</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                        aria-label="Sluiten"
                    >
                        <XMarkIcon className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Scrollbare inhoud */}
                <div className="overflow-y-auto flex-1 px-6 py-6">

                    {/* Samenvatting */}
                    <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-sm font-semibold text-amber-900 mb-2">📋 Samenvatting in eenvoudige taal</p>
                        <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                            <li>SportScores bewaart jouw sportresultaten en een zelfgekozen bijnaam (nickname).</li>
                            <li>Je echte naam is versleuteld — leerkrachten zien je naam, maar ze staat nooit op een scherm of ranking.</li>
                            <li>Op het scorebord staat enkel jouw nickname, nooit je echte naam.</li>
                            <li>Je kan je nickname op elk moment wijzigen via je profiel.</li>
                            <li>Je kan altijd vragen om je gegevens in te zien of te verwijderen.</li>
                        </ul>
                    </div>

                    <Section id="verantwoordelijke" title="1. Verwerkingsverantwoordelijke">
                        <p>SportScores is een digitaal platform voor sportprestatieopvolging, ontwikkeld en beheerd door:</p>
                        <div className="bg-slate-50 rounded-xl p-4 mt-2 text-xs space-y-1">
                            <p className="font-semibold text-slate-800">Christoph Remy — SportScores</p>
                            <p>Eenmanszaak · Ondernemingsnummer: BE 0766.639.993 <em>(fictief)</em></p>
                            <p>Van Eykpark 17, 9250 Waasmunster</p>
                            <p>E-mail: <a href="mailto:privacy@sportscores.be" className="text-blue-600 hover:underline">privacy@sportscores.be</a></p>
                        </div>
                        <p>Christoph Remy treedt op als <strong>verwerkingsverantwoordelijke</strong> (Art. 4(7) AVG). Met elke school wordt een afzonderlijke <strong>verwerkersovereenkomst (DPA)</strong> gesloten conform Art. 28 AVG.</p>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs">
                            <p className="font-semibold text-blue-900 mb-1">ℹ️ Geen DPO aangesteld</p>
                            <p className="text-blue-800">Gezien de huidige schaal is er nog geen Functionaris voor Gegevensbescherming aangesteld. Voor alle privacyvragen: <a href="mailto:privacy@sportscores.be" className="underline">privacy@sportscores.be</a>. Wij antwoorden binnen 5 werkdagen.</p>
                        </div>
                    </Section>

                    <Section id="gegevens" title="2. Welke persoonsgegevens verwerken wij?">
                        <Table rows={[
                            ['Categorie', 'Gegevens', 'Opslag'],
                            ['Identificatie', 'Smartschool-ID', 'SHA-256 hash — eenrichtingsversleuteld'],
                            ['Naam', 'Voor- en achternaam', 'AES-256-GCM versleuteld'],
                            ['Profiel', 'Nickname, klas, geslacht', 'Nickname is pseudoniem en zelfgekozen'],
                            ['Sportprestaties', 'Scores, testresultaten, datums', 'Gekoppeld aan hash — niet aan naam'],
                            ['Technisch', 'Loginmoment, laatste activiteit', 'Geen locatie of apparaatinfo'],
                            ['Welzijn (optioneel)', 'Slaap, stappen, humeur', 'Enkel bij actieve invoer door leerling'],
                        ]} />
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mt-3 text-xs">
                            <p className="font-semibold text-orange-900 mb-1">⚠️ Welzijnsmodule — Art. 9 AVG</p>
                            <p className="text-orange-800">Welzijnsgegevens worden enkel verwerkt op basis van uitdrukkelijke toestemming bij elke invoer. Leerkrachten zien enkel anonieme statistieken. De module kan door de school worden uitgeschakeld.</p>
                        </div>
                    </Section>

                    <Section id="doeleinden" title="3. Doeleinden en rechtsgrond">
                        <Table rows={[
                            ['Doel', 'Rechtsgrond', 'Toelichting'],
                            ['Sportprestaties opvolgen', 'Art. 6(1)(e) — taak algemeen belang', 'Kern van lichamelijke opvoeding'],
                            ['Authenticatie', 'Art. 6(1)(e) — taak algemeen belang', 'Veilige login via Smartschool'],
                            ['Highscores (nickname)', 'Art. 6(1)(f) — gerechtvaardigd belang', 'Enkel pseudonieme nicknames — nooit echte namen'],
                            ['Groeiplan', 'Art. 6(1)(e) — taak algemeen belang', 'Individuele opvolging door leerkracht'],
                            ['Welzijnsmodule', 'Art. 6(1)(a) + Art. 9(2)(a) — toestemming', 'Uitdrukkelijke toestemming per invoer'],
                            ['Beveiliging', 'Art. 6(1)(c) — wettelijke verplichting', 'Audit logs voor toegangscontrole'],
                        ]} />
                    </Section>

                    <Section id="bewaartermijnen" title="4. Bewaartermijnen">
                        <Table rows={[
                            ['Gegevens', 'Termijn', 'Na termijn'],
                            ['Actief profiel', 'Duur inschrijving + 30 dagen', 'Deactivatie na Smartschool sync'],
                            ['Gedeactiveerd profiel', 'Tot virtueel afstudeerjaar + 1 jaar', 'Definitieve verwijdering in januari'],
                            ['Sportscores', 'Max. 10 jaar na inschrijving', 'Ontkoppeld van identiteit'],
                            ['Alltime top 5', 'Permanent (gearchiveerd)', 'Enkel nickname — geen ID'],
                            ['Welzijnsgegevens', 'Schooljaar + 1 jaar', 'Of eerder op verzoek'],
                            ['Audit logs', '1 jaar', 'Automatisch gewist'],
                        ]} />
                        <div className="bg-slate-50 rounded-xl p-3 mt-3 text-xs border border-slate-200">
                            <p className="font-semibold text-slate-800 mb-1">📅 Virtueel afstudeerjaar</p>
                            <p className="text-slate-600">Een leerling die in het 4de leerjaar vertrekt heeft een virtueel afstudeerjaar van huidig jaar + 2. Gegevens worden gewist in januari van het jaar ná dat afstudeerjaar. Bij terugkeer wordt het profiel automatisch opnieuw geactiveerd.</p>
                        </div>
                    </Section>

                    <Section id="ontvangers" title="5. Ontvangers">
                        <Table rows={[
                            ['Ontvanger', 'Rol', 'Gegevens'],
                            ['Leerkrachten', 'Intern — eigen klassen', 'Ontsleutelde naam + scores'],
                            ['Schooladministrator', 'Intern — eigen school', 'Alle gegevens eigen school'],
                            ['Vercel Inc.', 'Verwerker (Art. 28)', 'Technische hosting — EU servers'],
                            ['Google Firebase', 'Verwerker (Art. 28)', 'Versleutelde opslag — EU regio'],
                            ['Smartschool', 'Authenticatiebron', 'Enkel login-token — geen sportdata'],
                        ]} />
                        <p>Gegevens worden <strong>nooit</strong> verkocht of gedeeld met advertentiepartners.</p>
                    </Section>

                    <Section id="rechten" title="6. Uw rechten">
                        <p>Uitoefenen via <a href="mailto:privacy@sportscores.be" className="text-blue-600 hover:underline">privacy@sportscores.be</a> — wij antwoorden binnen 30 dagen.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                            <RightCard icon="👁️" title="Inzage (Art. 15)" desc="Opvragen welke gegevens wij verwerken." />
                            <RightCard icon="✏️" title="Rectificatie (Art. 16)" desc="Onjuiste gegevens laten corrigeren. Nickname zelf wijzigen in de app." />
                            <RightCard icon="🗑️" title="Verwijdering (Art. 17)" desc="Gegevens laten verwijderen. Top 5 scores blijven anoniem bewaard." />
                            <RightCard icon="⏸️" title="Beperking (Art. 18)" desc="Verwerking tijdelijk laten beperken." />
                            <RightCard icon="📦" title="Overdraagbaarheid (Art. 20)" desc="Gegevens opvragen in leesbaar formaat (JSON/CSV)." />
                            <RightCard icon="🚫" title="Bezwaar (Art. 21)" desc="Bezwaar tegen verwerking op basis van gerechtvaardigd belang." />
                            <RightCard icon="↩️" title="Toestemming intrekken" desc="Welzijnstoestemming te allen tijde intrekbaar." />
                            <RightCard icon="🤖" title="Geen geautomatiseerde beslissingen" desc="SportScores neemt geen beslissingen met rechtsgevolgen." />
                        </div>
                    </Section>

                    <Section id="minderjarigen" title="7. Bescherming minderjarigen">
                        <ul className="list-disc list-inside space-y-1">
                            <li>Echte namen nooit zichtbaar op schermen — enkel zelfgekozen nicknames.</li>
                            <li>Leerkrachten zien enkel eigen klassen.</li>
                            <li>Geen advertenties, geen commerciële profilering.</li>
                            <li>Toegang enkel via Smartschool OAuth.</li>
                        </ul>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-3 text-xs">
                            <p className="font-semibold text-blue-900 mb-1">🇧🇪 Belgische leeftijdsgrens</p>
                            <p className="text-blue-800">Minimumleeftijd 13 jaar (Art. 8 AVG, Belgische Privacywet). Basisfunctionaliteit is gebaseerd op de onderwijstaak (Art. 6(1)(e)) — geen afzonderlijke ouderlijke toestemming vereist voor kernfunctionaliteit. School informeert ouders via schoolreglement.</p>
                        </div>
                    </Section>

                    <Section id="beveiliging" title="8. Beveiliging (Art. 32 AVG)">
                        <ul className="list-disc list-inside space-y-1">
                            <li><strong>AES-256-GCM</strong> voor naamversleuteling — sleutel in Google Secret Manager.</li>
                            <li><strong>SHA-256 hash</strong> voor Smartschool-ID's — eenrichtingsversleuteld.</li>
                            <li><strong>Rol-gebaseerde toegang</strong> — leerkrachten zien enkel eigen klassen.</li>
                            <li><strong>API-first</strong> — geen directe databasetoegang vanuit browser.</li>
                            <li><strong>TLS 1.3</strong> voor alle verbindingen.</li>
                            <li><strong>Audit logs</strong> voor alle administratieve handelingen.</li>
                        </ul>
                        <p>Bij een datalek: GBA verwittigd binnen 72u (Art. 33) en betrokkenen bij hoog risico (Art. 34).</p>
                    </Section>

                    <Section id="klacht" title="9. Klacht indienen">
                        <p>Klacht indienen bij de <strong>Gegevensbeschermingsautoriteit (GBA)</strong>:</p>
                        <div className="bg-slate-50 rounded-xl p-3 mt-2 text-xs space-y-1">
                            <p>Persstraat 35, 1000 Brussel · +32 (0)2 274 48 00</p>
                            <p><a href="https://www.gegevensbeschermingsautoriteit.be" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.gegevensbeschermingsautoriteit.be</a></p>
                            <p><a href="mailto:contact@apd-gba.be" className="text-blue-600 hover:underline">contact@apd-gba.be</a></p>
                        </div>
                    </Section>

                    {/* Footer */}
                    <div className="mt-6 pt-4 border-t border-slate-200 text-center">
                        <p className="text-xs text-slate-400">
                            SportScores · Christoph Lemaire · BE 0123.456.789 · Versie 1.0 · {lastUpdated}
                        </p>
                    </div>
                </div>

                {/* Footer met sluitknop */}
                <div className="flex justify-end px-6 py-4 border-t border-slate-200 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors"
                    >
                        Sluiten
                    </button>
                </div>
            </div>
        </div>
    );
}