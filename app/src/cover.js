// Vice Panels cover renderer: draws the multi-panel GTA-style poster onto a canvas
// at the canvas's own size. Everything is drawn with the 2D API: panel photos with
// per-panel crop (zoom + pan), a sunset/neon grade, a retro sun and skyline, palm
// silhouettes, and bold Anton caption lettering with a gradient fill and hard outline.

const GRADES = {
  sunset: { sky: ['#1d0b3d', '#7b1e6e', '#ff5e62', '#ffb347'], sun: ['#fff3b0', '#ff9e00'], wash: ['rgba(255,110,60,0.28)', 'rgba(255,46,136,0.34)'], band: '#17082b', title: ['#ffffff', '#ffd166'], sub: '#ffe66d' },
  neon: { sky: ['#05021a', '#2b0a5e', '#c2187a', '#00e5ff'], sun: ['#e0fbff', '#ff2e88'], wash: ['rgba(0,229,255,0.22)', 'rgba(255,46,136,0.38)'], band: '#0a0224', title: ['#ffffff', '#7df9ff'], sub: '#ff5ea8' },
  noir: { sky: ['#0a0a0f', '#1c1c26', '#3a3a4a', '#6b6b7d'], sun: ['#e8e8e8', '#9a9aa8'], wash: ['rgba(0,0,0,0.30)', 'rgba(0,0,0,0.42)'], band: '#0b0b10', title: ['#ffffff', '#cfcfd8'], sub: '#e8e8e8' },
  clean: { sky: ['#123a6b', '#2f7fb8', '#f2a65a', '#ffd98a'], sun: ['#fffbe8', '#ffb347'], wash: ['rgba(255,180,80,0.16)', 'rgba(255,120,60,0.18)'], band: '#10233d', title: ['#ffffff', '#ffe9a8'], sub: '#fff3c4' },
};

/** Panel rectangles (fractions of W/H) for each layout. The title band starts at 0.74. */
export function layoutPanels(layout, w, h) {
  const g = 0.014; // gutter, as a fraction of the short side
  const gw = g * Math.min(w, h);
  const top = 0, bandTop = 0.74 * h, areaH = bandTop - top;
  const x0 = gw, y0 = gw, x1 = w - gw, y1 = bandTop - gw;
  const midX = (x0 + x1) / 2, midY = (y0 + y1) / 2;
  if (layout === 'strip') {
    const heroH = areaH * 0.58, rowY = y0 + heroH + gw;
    const cw = (x1 - x0 - 2 * gw) / 3;
    return [
      // Hero: cover-fill (sharp photo edge to edge) with anchor-top, so the
      // ultra-wide band is never padded with blurred backdrop bands.
      { x: x0, y: y0, w: x1 - x0, h: heroH, cover: true },
      { x: x0, y: rowY, w: cw, h: y1 - rowY },
      { x: x0 + cw + gw, y: rowY, w: cw, h: y1 - rowY },
      { x: x0 + 2 * (cw + gw), y: rowY, w: cw, h: y1 - rowY },
    ];
  }
  if (layout === 'split') {
    const cw = (x1 - x0 - 2 * gw) / 3;
    return [
      { x: x0, y: y0, w: cw, h: y1 - y0 },
      { x: x0 + cw + gw, y: y0, w: cw, h: y1 - y0 },
      { x: x0 + 2 * (cw + gw), y: y0, w: cw, h: y1 - y0 },
    ];
  }
  return [ // grid: 2 x 2
    { x: x0, y: y0, w: midX - x0 - gw / 2, h: midY - y0 - gw / 2 },
    { x: midX + gw / 2, y: y0, w: x1 - midX - gw / 2, h: midY - y0 - gw / 2 },
    { x: x0, y: midY + gw / 2, w: midX - x0 - gw / 2, h: y1 - midY - gw / 2 },
    { x: midX + gw / 2, y: midY + gw / 2, w: x1 - midX - gw / 2, h: y1 - midY - gw / 2 },
  ];
}

/** How many panels a layout shows. */
export function layoutPanelCount(layout) {
  return layout === 'split' ? 3 : 4;
}

// Deterministic pseudo-random, so the grain is identical on every redraw.
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawRetroSun(ctx, cx, cy, r, grade) {
  const g = ctx.createRadialGradient(cx, cy - r * 0.2, r * 0.1, cx, cy, r);
  g.addColorStop(0, grade.sun[0]);
  g.addColorStop(1, grade.sun[1]);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  // Retro slats across the sun's lower half.
  ctx.fillStyle = 'rgba(23,8,43,0.85)';
  for (let i = 0; i < 5; i++) {
    const y = cy + r * (0.05 + i * 0.17);
    ctx.fillRect(cx - r, y, 2 * r, r * (0.03 + i * 0.02));
  }
  ctx.restore();
}

function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(14, -52, 44, -84); // leaning trunk
  ctx.stroke();
  for (let i = 0; i < 6; i++) { // fronds fanning from the crown
    const a = Math.PI * (0.08 + i * 0.17);
    const tx = 44 + Math.cos(a) * 62;
    const ty = -84 - Math.sin(a) * 34 + (i > 2 ? 26 : 0);
    ctx.beginPath();
    ctx.moveTo(44, -84);
    ctx.quadraticCurveTo(44 + Math.cos(a) * 34, -84 - Math.sin(a) * 46, tx, ty);
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(50, -78, 6, 0, Math.PI * 2); // coconuts
  ctx.arc(38, -72, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSkyline(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  const rnd = mulberry32(20261119);
  let bx = x;
  while (bx < x + w) {
    const bw = w * (0.05 + rnd() * 0.08);
    const bh = h * (0.35 + rnd() * 0.6);
    ctx.fillRect(bx, y + h - bh, bw, bh);
    // A few lit windows.
    ctx.fillStyle = 'rgba(255,209,102,0.85)';
    for (let k = 0; k < 4; k++) {
      if (rnd() > 0.5) ctx.fillRect(bx + bw * (0.2 + rnd() * 0.6), y + h - bh + bh * (0.15 + rnd() * 0.6), 3, 4);
    }
    ctx.fillStyle = color;
    bx += bw + w * 0.012;
  }
}

function drawPhotoPanel(ctx, rect, panel, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const img = panel && panel.img;
  if (img) {
    const zoom = panel.zoom || 1;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const ox = ((panel.ox || 0) / 100) * w;
    const oy = ((panel.oy || 0) / 100) * h;
    const ratio = (iw / ih) / (w / h);
    if (!rect.cover && (rect.contain || ratio > 4 || ratio < 0.25)) {
      // Contained photo on a blurred cover-fill backdrop, so nobody's head is
      // cropped off. Panels flagged cover (the strip hero) skip this and use
      // sharp cover-fill with anchor-top instead.
      const cover = Math.max(w / iw, h / ih) * zoom;
      ctx.save();
      ctx.filter = 'blur(24px) brightness(0.6) saturate(1.3)';
      ctx.drawImage(img, x + (w - iw * cover) / 2 + ox, y + (h - ih * cover) / 2 + oy, iw * cover, ih * cover);
      ctx.restore();
      const fit = Math.min(w / iw, h / ih) * zoom;
      ctx.drawImage(img, x + (w - iw * fit) / 2 + ox, y + (h - ih * fit) / 2 + oy, iw * fit, ih * fit);
    } else {
      const base = Math.max(w / iw, h / ih) * zoom;
      const pw = iw * base, ph = ih * base;
      // anchorTop keeps heads in frame: crop from the bottom, not the top.
      const yOff = panel.anchorTop ? 0 : (h - ph) / 2;
      ctx.drawImage(img, x + (w - pw) / 2 + ox, y + yOff + oy, pw, ph);
    }
  } else {
    // Empty panel: a procedural sunset placeholder, never a borrowed photo.
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#3b1a63');
    g.addColorStop(0.6, '#c2187a');
    g.addColorStop(1, '#ff7a18');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    drawRetroSun(ctx, x + w * 0.68, y + h * 0.42, Math.min(w, h) * 0.22, grade);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `700 ${Math.round(Math.min(w, h) * 0.07)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD A PHOTO', x + w / 2, y + h * 0.86);
  }
  // Colour grade wash + bottom shade so the white panel frame reads.
  const wash = ctx.createLinearGradient(x, y, x + w * 0.25, y + h);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(1, grade.wash[1]);
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);
  const shade = ctx.createLinearGradient(x, y + h * 0.55, x, y + h);
  shade.addColorStop(0, 'rgba(10,2,24,0)');
  shade.addColorStop(1, 'rgba(10,2,24,0.35)');
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  // Thick white poster frame with a hard dark edge.
  ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.014);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(x, y, w, h);
  ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.004);
  ctx.strokeStyle = 'rgba(10,2,24,0.55)';
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
}

function fitFont(ctx, text, maxWidth, startSize, family) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

function drawSpacedText(ctx, text, cx, y, spacing) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let px = cx - total / 2;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, px, y);
    px += widths[i] + spacing;
  });
  ctx.textAlign = prev;
}

/** Draws the whole cover for `state` onto `canvas` (canvas size = export size). */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const bandTop = 0.74 * h;

  // Sunset / neon sky.
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Panels.
  const rects = layoutPanels(state.layout, w, h);
  const count = layoutPanelCount(state.layout);
  for (let i = 0; i < count; i++) drawPhotoPanel(ctx, rects[i], state.panels[i], grade);

  // Title band: dark base, skyline, palms at both ends, retro sun peeking behind.
  ctx.fillStyle = grade.band;
  ctx.fillRect(0, bandTop, w, h - bandTop);
  const bandGrad = ctx.createLinearGradient(0, bandTop, 0, h);
  bandGrad.addColorStop(0, 'rgba(255,46,136,0.25)');
  bandGrad.addColorStop(0.4, 'rgba(255,46,136,0)');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, bandTop, w, h - bandTop);
  drawSkyline(ctx, w * 0.02, bandTop + (h - bandTop) * 0.18, w * 0.96, (h - bandTop) * 0.82, 'rgba(8,2,20,0.9)');
  drawRetroSun(ctx, w * 0.965, bandTop + (h - bandTop) * 0.3, Math.min(w, h) * 0.045, grade);
  drawPalm(ctx, w * 0.015, h * 0.995, Math.min(w, h) / 900, 'rgba(8,2,20,0.95)');
  drawPalm(ctx, w * 0.985, h * 0.995, -Math.min(w, h) / 1100, 'rgba(8,2,20,0.95)');

  // Caption: subtitle, then the big title, then the tag line.
  const cx = w / 2;
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  const tag = (state.tag || '').trim().toUpperCase();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const bandH = h - bandTop;
  if (subtitle) {
    ctx.font = `700 ${Math.round(bandH * 0.13)}px system-ui, sans-serif`;
    ctx.fillStyle = grade.sub;
    drawSpacedText(ctx, subtitle, cx, bandTop + bandH * 0.2, bandH * 0.02);
  }
  if (title) {
    const fam = `'Anton', 'Arial Narrow', sans-serif`;
    const size = fitFont(ctx, title, w * 0.8, bandH * 0.52, fam);
    const ty = bandTop + bandH * (subtitle ? 0.68 : 0.62);
    ctx.save();
    ctx.translate(cx, ty);
    ctx.transform(1, 0, -0.05, 1, 0, 0); // slight forward lean
    ctx.font = `${size}px ${fam}`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.12;
    ctx.shadowOffsetY = size * 0.05;
    const fill = ctx.createLinearGradient(0, -size, 0, size * 0.2);
    fill.addColorStop(0, grade.title[0]);
    fill.addColorStop(1, grade.title[1]);
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.strokeStyle = '#12041f';
    ctx.lineJoin = 'round';
    ctx.strokeText(title, 0, 0);
    ctx.fillStyle = fill;
    ctx.fillText(title, 0, 0);
    ctx.restore();
  }
  if (tag) {
    ctx.font = `700 ${Math.round(bandH * 0.09)}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    drawSpacedText(ctx, tag, cx, h - bandH * 0.06, bandH * 0.015);
  }

  // Vignette + film grain for a printed-poster feel.
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(5,0,15,0.28)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  const rnd = mulberry32(7);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 900; i++) ctx.fillRect(rnd() * w, rnd() * h, 1.6, 1.6);
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  for (let i = 0; i < 900; i++) ctx.fillRect(rnd() * w, rnd() * h, 1.6, 1.6);
}
