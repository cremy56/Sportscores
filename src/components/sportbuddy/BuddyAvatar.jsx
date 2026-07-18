// src/components/sportbuddy/BuddyAvatar.jsx
// Buddy-weergave op de hoofdpagina — nu de 3D-mannequin (zelfde look als in de
// Sparring Kooi) i.p.v. de oude vector-tekening. Speelt de idle-animatie in een
// zachte loop ("de buddy ademt"). Deelt sprite-/overlay-definities met de game
// via data/sportbuddy/sprites, zodat kleding/uiterlijk overal consistent zijn.
//
// Betekenisvolle toestanden blijven leesbaar (zonder lichaamskritiek):
//   • graad     → lichaamslengte (schaal), net als in de game
//   • conditie  → 'fris' (neutraal) | 'top' (lichte gloed) | 'moe' / 'uitgeput'
//                 (iets gedempt/donkerder — vermoeidheid in uitstraling, nooit vorm)
//   • blessure  → subtiel rood accent onderaan (verband volgt later als overlay)
//   • huid/haar/gezicht → volgen als overlay-sheets zodra die er zijn (shop / stap 3)
// Datavrij: puur cosmetische weergave van het fictieve personage.

import { useRef, useEffect } from 'react';
import { SPRITE_BASE, SPRITE_DEFS, spriteVan, overlaySheet, sorteerUitrusting, getinteMannequin, huidHex, HUID_TINTEN } from '../../data/sportbuddy/sprites';

// Keuzelijsten voor de AanmaakWizard. HUID_TINTEN komt nu uit de gedeelde sprites-module
// (zodat game, avatar en wizard exact dezelfde tinten gebruiken) en wordt hier
// doorge-exporteerd zodat bestaande imports blijven werken.
export { HUID_TINTEN };
export const HAAR_KLEUREN = ['#2d2a26', '#6b4a2b', '#b0813f', '#d9c169', '#a33b2e'];
export const HAAR_STIJLEN = ['spikes', 'krullen', 'lang', 'kuif', 'kaal'];
export const GEZICHTEN = ['blij', 'focus', 'ontspannen', 'guitig'];
export const LICHAMEN = ['m', 'v', 'neutraal'];

const GRAAD_SCHAAL = { 1: 0.88, 2: 0.95, 3: 1 };

export default function BuddyAvatar({
  gezicht = 0, huid = 0, haar = 0, haarkleur = 0,
  graad = 1, lichaam = 'm', kracht = 10,
  conditie = 'fris', blessure = false,
  uitrusting = [],
  className = '',
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    // logische tekengrootte; het canvas schaalt mee via CSS (w-full)
    const CW = 220, CH = 300;
    canvas.width = CW * DPR;
    canvas.height = CH * DPR;
    ctx.scale(DPR, DPR);

    const def = SPRITE_DEFS.idle;
    const schaal = GRAAD_SCHAAL[graad] || GRAAD_SCHAAL[1];
    const items = sorteerUitrusting(uitrusting);
    startRef.current = performance.now();

    const teken = (nu) => {
      const img = spriteVan('blauw', 'idle');
      ctx.clearRect(0, 0, CW, CH);

      if (!img) {                                   // sheet laadt nog → subtiele placeholder
        ctx.fillStyle = 'rgba(148,163,184,0.15)';
        ctx.beginPath();
        ctx.arc(CW / 2, CH * 0.5, 40, 0, 7);
        ctx.fill();
        rafRef.current = requestAnimationFrame(teken);
        return;
      }

      const t = (nu - startRef.current) / 1000;
      const idx = Math.floor(t * def.fps) % def.frames;
      const fw = img.width / def.frames, fh = img.height;
      // avatar vullend maar met wat lucht boven/onder; voeten iets boven de onderrand
      const doelH = CH * 0.82 * schaal;
      const sc = doelH / fh, dw = fw * sc, dh = fh * sc;
      const cx = CW / 2, grond = CH * 0.96;

      // conditie → uitstraling (nooit lichaamsvorm)
      let filter = 'none', alpha = 1;
      if (conditie === 'moe') { filter = 'saturate(0.8) brightness(0.94)'; }
      else if (conditie === 'uitgeput') { filter = 'saturate(0.6) brightness(0.86)'; alpha = 0.94; }

      // 'top' → zachte gloed achter de buddy
      if (conditie === 'top') {
        const g = ctx.createRadialGradient(cx, grond - dh * 0.55, 10, cx, grond - dh * 0.55, dw * 1.1);
        g.addColorStop(0, 'rgba(74,163,255,0.28)');
        g.addColorStop(1, 'rgba(74,163,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, grond - dh * 0.55, dw * 1.1, 0, 7); ctx.fill();
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      if (filter !== 'none' && 'filter' in ctx) ctx.filter = filter;
      ctx.imageSmoothingEnabled = true;
      // mannequin, getint naar de gekozen huidskleur (gecachet); val terug op neutrale sheet
      const getint = getinteMannequin('blauw', 'idle', huidHex(huid));
      ctx.drawImage(getint || img, idx * fw, 0, fw, fh, cx - dw / 2, grond - dh, dw, dh);
      // overlay-lagen (kleding/gezicht/haar zodra shop-items bestaan) — zelfde frame/transform
      for (const key of items) {
        const ov = overlaySheet(key, 'idle', 'blauw');
        if (!ov) continue;
        const ofw = ov.width / def.frames;
        ctx.drawImage(ov, idx * ofw, 0, ofw, ov.height, cx - dw / 2, grond - dh, dw, dh);
      }
      ctx.restore();

      // blessure → subtiel rood accent onderaan (tot er een verband-overlay is)
      if (blessure) {
        ctx.fillStyle = 'rgba(239,68,68,0.85)';
        ctx.beginPath();
        ctx.arc(cx + dw * 0.18, grond - dh * 0.52, 5, 0, 7);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(teken);
    };

    rafRef.current = requestAnimationFrame(teken);
    return () => cancelAnimationFrame(rafRef.current);
  }, [graad, conditie, blessure, huid, haar, haarkleur, gezicht, lichaam, kracht, JSON.stringify(uitrusting)]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: 'auto', aspectRatio: '220 / 300', display: 'block' }}
      aria-label="Je Sportbuddy"
    />
  );
}
