#!/usr/bin/env node
/*
 * kleur-rood.cjs — zet alle sprite-sheets uit public/sparring/blauw/ om naar
 * een rode variant in public/sparring/rood/ via een absolute hue-verschuiving.
 *
 * Waarom absoluut i.p.v. relatief: het lichaam zit strak rond hue 190 (cyaan),
 * dus we forceren elke gekleurde pixel naar de doel-hue en behouden sat/val
 * (= schaduwmodellering) en alpha (= silhouetrand). Bijna-grijze pixels
 * (lage saturatie) laten we ongemoeid zodat zwarte accentstrepen niet verkleuren.
 *
 * Repo-root scripts zijn .cjs (package.json heeft "type":"module").
 * Dependency: pngjs  ->  npm install pngjs --no-save
 *
 * Gebruik:
 *   node kleur-rood.cjs                 (alle sheets, doel-hue 358)
 *   node kleur-rood.cjs 210             (andere doel-hue in graden, bv. blauw)
 *   node kleur-rood.cjs 358 blauw groen (bron- en doelmap overschrijven)
 */
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const HUE_DOEL = Number(process.argv[2] || 358);     // graden 0-360
const BRON = process.argv[3] || "blauw";
const DOEL = process.argv[4] || "rood";
const SAT_BOOST = 1.12;                               // rood leest anders wat flets
const SAT_DREMPEL = 0.15;                             // onder deze sat -> ongemoeid (zwart/wit/grijs)

const bronDir = path.join(__dirname, "public", "sparring", BRON);
const doelDir = path.join(__dirname, "public", "sparring", DOEL);

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 1e-6) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  const s = mx === 0 ? 0 : d / mx;
  return [h, s, mx];
}
function hsvToRgb(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function verwerk(bestand) {
  const png = PNG.sync.read(fs.readFileSync(path.join(bronDir, bestand)));
  const { data } = png;
  let veranderd = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;                 // volledig transparant
    const [, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2]);
    if (s < SAT_DREMPEL) continue;                   // grijs/zwart/wit ongemoeid
    const [r, g, b] = hsvToRgb(HUE_DOEL, Math.min(1, s * SAT_BOOST), v);
    data[i] = r; data[i + 1] = g; data[i + 2] = b;
    veranderd++;
  }
  fs.writeFileSync(path.join(doelDir, bestand), PNG.sync.write(png));
  return veranderd;
}

if (!fs.existsSync(bronDir)) { console.error("Bronmap ontbreekt:", bronDir); process.exit(1); }
if (!fs.existsSync(doelDir)) fs.mkdirSync(doelDir, { recursive: true });

const sheets = fs.readdirSync(bronDir).filter((f) => f.toLowerCase().endsWith(".png"));
if (sheets.length === 0) { console.error("Geen PNG's in", bronDir); process.exit(1); }

console.log("Hue-doel " + HUE_DOEL + " graden | " + BRON + " -> " + DOEL + " (" + sheets.length + " sheets)");
for (const s of sheets) {
  const n = verwerk(s);
  console.log("  " + s.padEnd(18) + n + " pixels omgekleurd");
}
console.log("Klaar. Rode sheets in public/sparring/" + DOEL + "/");
