// lib/sportbuddy/statusberichten.js
// BUDDY-CONTEXT: kleine dagverhalen over hoe je buddy zich voelt, afgeleid uit
// zijn toestand + de wereldcontext + gewogen (geseed) toeval. Individueel per
// leerling: het bericht weerspiegelt JOUW keuzes van de voorbije dagen.
// Elke entry: conditie(buddy, ctx) → bool, tekst, hint (naar welke keuze/tile),
// gewicht. Inhoudelijke bronnen: OOGST_KENNISLAGEN_SPORTBUDDY.md.

import { hashString, maakRng } from './seed.js';

const DECK = [
  // ── Vermoeidheid & herstel ──────────────────────────────────────────────────
  { id: 'zware_benen', gewicht: 3,
    conditie: (b) => b.vermoeidheid > 55,
    tekst: 'Je buddy wordt wakker met zware benen. Zijn lichaam schreeuwt om herstel.',
    hint: 'Kies vandaag een rustdag of hersteltraining.' },
  { id: 'rustpols_hoog', gewicht: 3,
    conditie: (b) => b.vermoeidheid > 45,
    tekst: 'De rustpols van je buddy ligt vanochtend hoger dan normaal — zijn zenuwstelsel is nog aan het herstellen van de inspanning.',
    hint: 'Na zware training blijft de rustpols 12-24 u verhoogd. Doseer vandaag.' },
  { id: 'kramp', gewicht: 4,
    conditie: (b) => (b.laatste_keuzes?.water === 'weinig') && ['interval', 'match', 'kracht'].includes(b.laatste_keuzes?.training || ''),
    tekst: 'Spierkramp vannacht! Je buddy schoot wakker met een verkrampte kuit.',
    hint: 'Gisteren zwaar getraind én weinig gedronken — vocht en mineralen aanvullen.' },
  { id: 'fris_na_rust', gewicht: 3,
    conditie: (b) => (b.laatste_keuzes?.training === 'rust' || b.laatste_keuzes?.training === 'herstel') && b.vermoeidheid < 30,
    tekst: 'Je buddy springt fris uit bed. Die rust van gisteren heeft deugd gedaan — dat is supercompensatie in actie.',
    hint: 'Vandaag is een prima dag om stevig te trainen.' },
  { id: 'stijf_na_kracht', gewicht: 3,
    conditie: (b) => b.laatste_keuzes?.training === 'kracht',
    tekst: 'Spierpijn! Je buddy voelt zijn spieren van de krachttraining van gisteren.',
    hint: 'Normaal: microscheurtjes herstellen en maken de spier sterker. Lichte beweging en eiwitten helpen.' },

  // ── Slaap ───────────────────────────────────────────────────────────────────
  { id: 'kort_geslapen', gewicht: 4,
    conditie: (b) => b.laatste_keuzes?.slaap === 'kort',
    tekst: 'Je buddy geeuwt de hele ochtend. Die korte nacht laat zich voelen: trager reageren, minder zin.',
    hint: 'Tieners hebben 8-10 u slaap nodig — groeihormoon piekt \'s nachts.' },
  { id: 'lang_geslapen', gewicht: 2,
    conditie: (b) => b.laatste_keuzes?.slaap === 'lang',
    tekst: 'Tien uur slaap — je buddy voelt zich herboren. Zijn spieren hebben de nacht goed gebruikt.',
    hint: null },

  // ── Stress & mentaal ────────────────────────────────────────────────────────
  { id: 'gespannen', gewicht: 3,
    conditie: (b) => b.stress > 50,
    tekst: 'Je buddy is prikkelbaar en gejaagd. De spanning stapelt zich op.',
    hint: 'Een ademhalingsoefening brengt het zenuwstelsel tot rust.' },
  { id: 'ontspannen_dag', gewicht: 2,
    conditie: (b) => b.stress < 15,
    tekst: 'Je buddy fluit een deuntje. Hoofd leeg, lichaam klaar.',
    hint: null },

  // ── Vorm & seizoen ──────────────────────────────────────────────────────────
  { id: 'topvorm', gewicht: 3,
    conditie: (b, ctx) => (b.fitheid - b.vermoeidheid) >= 25,
    tekst: 'Je buddy voelt zich onklopbaar — alles lukt op training. Dit is de vorm van zijn leven!',
    hint: null },
  { id: 'overtraind', gewicht: 4,
    conditie: (b) => (b.fitheid - b.vermoeidheid) < -20,
    tekst: 'Je buddy sleept zich vooruit. Alles doet pijn en niets lukt: dit is overtraining.',
    hint: 'Alleen rust en slaap lossen dit op. Doortrainen maakt het erger.' },
  { id: 'detraining_terug', gewicht: 3,
    conditie: (b) => b.fitheid < 10 && (b.seizoen?.dag || 1) > 14,
    tekst: 'De conditie van je buddy is weggezakt na de pauze. Rustig weer opbouwen is de boodschap.',
    hint: 'Na stilstand: begin met herstel- en techniektraining, niet meteen voluit.' },

  // ── Wereldcontext (weer & kalender) ─────────────────────────────────────────
  { id: 'hittedag', gewicht: 5,
    conditie: (b, ctx) => ctx.heet,
    tekst: (ctx) => `${ctx.weer.emoji} ${ctx.weer.tempMax}°C vandaag! Je buddy zweet al bij het ontbijt.`,
    hint: 'Hitte = extra drinken: het hart moet harder werken om te koelen.' },
  { id: 'koudedag', gewicht: 4,
    conditie: (b, ctx) => ctx.koud,
    tekst: (ctx) => `${ctx.weer.emoji} Amper ${ctx.weer.tempMax}°C. Koude spieren zijn kwetsbare spieren.`,
    hint: 'Extra lange warming-up vandaag — blessurepreventie begint daar.' },
  { id: 'matchdag', gewicht: 10,
    conditie: (b, ctx) => ctx.matchdag,
    tekst: '🏟️ WEDSTRIJDDAG! Je buddy is er klaar voor — of toch niet? Vandaag telt de hele week mee.',
    hint: 'Kies "Wedstrijd" als training. Wie goed getaperd heeft, piekt vandaag.' },
  { id: 'match_morgen', gewicht: 6,
    conditie: (b, ctx) => ctx.dagenTotMatch === 1,
    tekst: 'Morgen wedstrijd. Je buddy voelt de gezonde spanning al kriebelen.',
    hint: 'Taperen: licht of niet trainen, goed eten, vroeg slapen — zo piek je morgen.' },
  { id: 'week_start', gewicht: 2,
    conditie: (b, ctx) => ctx.weekdag === 1,
    tekst: 'Maandag: een nieuwe trainingsweek. Zaterdag staat er weer een match op de kalender.',
    hint: 'Plan je week: zwaar begin, lichter naar het weekend toe.' },

  // ── Blessure ────────────────────────────────────────────────────────────────
  { id: 'blessure_actief', gewicht: 10,
    conditie: (b) => !!b.gezondheid?.blessure,
    tekst: 'Het verband zit er nog. Je buddy wil koste wat het kost spelen, maar zijn lichaam is nog niet klaar.',
    hint: 'Respecteer de hersteltijd — te vroeg hervatten verdubbelt het herblessurerisico.' },

];

// Kies deterministisch (uid + datum) één bericht uit de geldige kandidaten,
// gewogen naar belang. Zelfde dag = zelfde bericht, geen reroll mogelijk.
export function kiesStatusbericht(buddy, ctxVlaggen, uid, datum) {
  const kandidaten = DECK.filter((s) => {
    try { return s.conditie(buddy, ctxVlaggen); } catch { return false; }
  });
  if (kandidaten.length === 0) return null;
  const totaal = kandidaten.reduce((som, s) => som + s.gewicht, 0);
  const rng = maakRng(hashString(`status_${uid}_${datum}`));
  let lot = rng() * totaal;
  for (const s of kandidaten) {
    lot -= s.gewicht;
    if (lot <= 0) {
      const tekst = typeof s.tekst === 'function' ? s.tekst(ctxVlaggen) : s.tekst;
      return { id: s.id, tekst, hint: s.hint };
    }
  }
  const s = kandidaten[kandidaten.length - 1];
  return { id: s.id, tekst: typeof s.tekst === 'function' ? s.tekst(ctxVlaggen) : s.tekst, hint: s.hint };
}
