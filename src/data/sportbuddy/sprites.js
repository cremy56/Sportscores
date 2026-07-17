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
  // shop-items komen hier (voorbeeld-structuur):
  // gi_boks_rood:   { map: "gi_boks_rood",   laag: 20 },
  // gezicht_type1:  { map: "gezicht_type1",  laag: 50 },
  // hoofdband_wit:  { map: "hoofdband_wit",  laag: 60 },
};
// overlay-sheet voor een item + animatie ophalen (zelfde bestandsnaam als de mannequin-sheet)
export function overlaySheet(itemKey, naam) {
  const item = OVERLAY_ITEMS[itemKey];
  const def = SPRITE_DEFS[naam];
  if (!item || !def) return null;
  return laadSheet(OVERLAY_BASE + item.map + "/" + def.file);
}

// uitrusting (item-sleutels) sorteren op tekenlaag: achter -> voor
export function sorteerUitrusting(keys) {
  return (keys || [])
    .filter((k) => OVERLAY_ITEMS[k])
    .sort((a, b) => (OVERLAY_ITEMS[a].laag || 0) - (OVERLAY_ITEMS[b].laag || 0));
}
