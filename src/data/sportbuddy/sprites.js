// src/data/sportbuddy/sprites.js
// Gedeelde sprite- en overlay-definities voor de mannequin-avatar.
// Gebruikt door zowel de Sparring Kooi (game) als BuddyAvatar (hoofdpagina),
// zodat de buddy overal EXACT hetzelfde oogt en shop-items maar op één plek
// geregistreerd hoeven te worden. Bevat GEEN game-logica (state/physics/AI),
// alleen cosmetica-definities + stateless loaders.

/* ===== SPRITE-LAAG =====
   Sheets staan in /public/sparring/blauw|rood/. Elke sheet = horizontale strip:
   frames naast elkaar, voeten onderaan, avatar gecentreerd. */
export const SPRITE_BASE = "/sparring/";
export const SPRITE_HOOGTE = 118;                // doelhoogte van de avatar in wereld-pixels

// Huidtinten (index -> hex). Gedeeld door wizard, game en avatar zodat de gekozen
// huidskleur overal identiek getint wordt. Accepteert al een hex? dan ongewijzigd terug.
export const HUID_TINTEN = ['#e8b98a', '#d4a373', '#a5744f', '#7a5238'];
export function huidHex(v) {
  if (typeof v === "string" && v.startsWith("#")) return v;    // al een hex
  const i = Number(v);
  return HUID_TINTEN[Number.isInteger(i) ? i : 0] || HUID_TINTEN[0];
}

export const SPRITE_DEFS = {
  idle:        { file: "idle.png",        frames: 11, fps: 12, loop: true },
  walk:        { file: "walk.png",        frames: 10, fps: 14, loop: true },
  slag:        { file: "jab.png",         frames: 9,  fps: 18, loop: false },
  slag_hoog:   { file: "jab_hoog.png",    frames: 8,  fps: 20, loop: false },
  slag_mid:    { file: "jab_mid.png",     frames: 8,  fps: 20, loop: false },
  slag_laag:   { file: "jab_laag.png",    frames: 8,  fps: 20, loop: false },
  schop:       { file: "kick_mid.png",    frames: 12, fps: 18, loop: false },
  schop_hoog:  { file: "kick_hoog.png",   frames: 10, fps: 20, loop: false },
  schop_mid:   { file: "kick_mid.png",    frames: 12, fps: 18, loop: false },
  schop_laag:  { file: "kick_laag.png",   frames: 10, fps: 20, loop: false },
  uppercut:    { file: "uppercut.png",    frames: 12, fps: 20, loop: false },
  hoofdstoot:  { file: "hoofdstoot.png",  frames: 15, fps: 22, loop: false },
  blok:        { file: "blok.png",        frames: 4,  fps: 12, loop: false },
  blok_hoog:   { file: "blok_hoog.png",   frames: 4,  fps: 12, loop: false },
  blok_mid:    { file: "blok_mid.png",    frames: 4,  fps: 12, loop: false },
  blok_laag:   { file: "blok_laag.png",   frames: 4,  fps: 12, loop: false },
  stagger:     { file: "stagger.png",     frames: 11, fps: 16, loop: false },
  dash:        { file: "dash.png",        frames: 6,  fps: 18, loop: false },
  sprong:      { file: "sprong.png",      frames: 13, fps: 14, loop: false, ankerH: 439 },
};

const _spriteCache = {};                         // cache-key (url) -> Image | "laden" | "mist"
// generieke sheet-loader: cachet elke URL. Basis-mannequin en overlays gebruiken dezelfde weg.
export function laadSheet(url) {
  if (typeof Image === "undefined") return null;  // SSR-veilig
  const c = _spriteCache[url];
  if (c instanceof Image) return c;
  if (c === undefined) {
    _spriteCache[url] = "laden";
    const im = new Image();
    im.onload = () => { _spriteCache[url] = im; };
    im.onerror = () => { _spriteCache[url] = "mist"; };
    im.src = url;
  }
  return null;
}
export function spriteVan(team, naam) {
  if (!SPRITE_BASE || !SPRITE_DEFS[naam]) return null;
  return laadSheet(SPRITE_BASE + team + "/" + SPRITE_DEFS[naam].file);
}

/* ===== HUIDTINT-LAAG =====
   De mannequin is neutraal (blauwgroen). Elke buddy krijgt zijn eigen huidskleur
   via een luminantie-remap: de helderheid (= 3D-schaduw) van de mannequin wordt
   hergebruikt, de kleur wordt vervangen door een huid-gradient (donker->licht).
   Resultaat wordt per (naam + huidHex) éénmalig naar een offscreen canvas gebakken
   en gecachet, zodat de tint niet elke frame herberekend wordt. Geen extra sheets. */
const _huidCache = {};                            // "naam|hex|team" -> canvas | "bezig"

function hexNaarGradient(hex) {
  const h = (hex || "#d4a373").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const donker = [Math.round(r * 0.60), Math.round(g * 0.56), Math.round(b * 0.53)];
  const licht = [Math.min(255, Math.round(r * 1.14 + 6)), Math.min(255, Math.round(g * 1.11 + 6)), Math.min(255, Math.round(b * 1.08 + 6))];
  return { donker, licht };
}

// Geeft een getint canvas terug (of null als de bron-sheet nog laadt / geen tint gevraagd).
// huidHex leeg/undefined => geen tint (retourneert null, teken dan gewoon de bron-sheet).
export function getinteMannequin(team, naam, huidHex) {
  if (!huidHex) return null;
  if (typeof document === "undefined") return null;   // SSR-veilig
  const key = naam + "|" + huidHex + "|" + team;
  const c = _huidCache[key];
  if (c && c !== "bezig") return c;
  if (c === "bezig") return null;

  const img = spriteVan(team, naam);
  if (!img) return null;                               // bron laadt nog -> volgende frame opnieuw

  _huidCache[key] = "bezig";
  const cv = document.createElement("canvas");
  cv.width = img.width; cv.height = img.height;
  const cx = cv.getContext("2d");
  cx.drawImage(img, 0, 0);
  let data;
  try { data = cx.getImageData(0, 0, cv.width, cv.height); }
  catch (e) { _huidCache[key] = null; return null; }   // getImageData kan falen (CORS); val terug op ongetint
  const px = data.data;

  // luminantie-range van de mannequin bepalen (voor stretch)
  let lmin = 255, lmax = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 40) continue;
    const l = 0.3 * px[i] + 0.5 * px[i + 1] + 0.2 * px[i + 2];
    if (l < lmin) lmin = l; if (l > lmax) lmax = l;
  }
  const span = Math.max(1, lmax - lmin);
  const { donker, licht } = hexNaarGradient(huidHex);

  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 40) continue;
    let ln = (0.3 * px[i] + 0.5 * px[i + 1] + 0.2 * px[i + 2] - lmin) / span;
    ln = Math.pow(Math.min(1, Math.max(0, ln)), 1.05);  // lichte gamma; highlight blijft getemperd (geen bleek)
    px[i]     = donker[0] + (licht[0] - donker[0]) * ln;
    px[i + 1] = donker[1] + (licht[1] - donker[1]) * ln;
    px[i + 2] = donker[2] + (licht[2] - donker[2]) * ln;
    // alpha ongemoeid -> zachte randen behouden
  }
  cx.putImageData(data, 0, 0);
  _huidCache[key] = cv;
  return cv;
}

/* ===== OVERLAY-LAAG (kleding, hoofd, gezicht, accessoires - shop-items) =====
   Elk item = een map met overlay-sheets die 1-op-1 dezelfde naam/frames/timing
   hebben als de mannequin-sheets (walk.png = 10 fr, idle.png = 11 fr, ...).
   ASSET-EIS: een overlay-sheet MOET exact dezelfde afmetingen (breedte x hoogte en
   dus frame-breedte) hebben als de mannequin-sheet met dezelfde naam, anders
   wordt de overlay uitgerekt en loopt hij uit de pas. Render de overlay op net
   hetzelfde skelet/dezelfde camera als de mannequin en trim op dezelfde bbox.
   Ze worden met exact dezelfde transform over de mannequin getekend, dus ze
   bewegen automatisch mee. Ontbreekt een overlay-sheet voor een animatie, dan
   wordt die laag voor dat ene frame simpelweg overgeslagen (geen crash).
   'laag' bepaalt de tekenvolgorde: hoger = meer vooraan. De shop vult dit object. */
export const OVERLAY_BASE = SPRITE_BASE + "overlay/";
export const OVERLAY_ITEMS = {
  // Hoofdbescherming: draagt de teamkleur (blauw/rood). perTeam=true -> map wordt
  // "helm/blauw" of "helm/rood", afhankelijk van de vechter.
  helm: { map: "helm", laag: 60, perTeam: true },
  // shop-items komen hier (voorbeeld-structuur):
  // gi_boks_rood:   { map: "gi_boks_rood",   laag: 20 },
  // gezicht_type1:  { map: "gezicht_type1",  laag: 50 },
  // handschoen:     { map: "handschoen",     laag: 70, perTeam: true },
};
// overlay-sheet voor een item + animatie ophalen (zelfde bestandsnaam als de mannequin-sheet).
// team is nodig voor perTeam-items (helm, handschoenen dragen de teamkleur).
export function overlaySheet(itemKey, naam, team) {
  const item = OVERLAY_ITEMS[itemKey];
  const def = SPRITE_DEFS[naam];
  if (!item || !def) return null;
  const map = item.perTeam ? item.map + "/" + (team || "blauw") : item.map;
  return laadSheet(OVERLAY_BASE + map + "/" + def.file);
}

// uitrusting (item-sleutels) sorteren op tekenlaag: achter -> voor
export function sorteerUitrusting(keys) {
  return (keys || [])
    .filter((k) => OVERLAY_ITEMS[k])
    .sort((a, b) => (OVERLAY_ITEMS[a].laag || 0) - (OVERLAY_ITEMS[b].laag || 0));
}
