// Vice Panels wiring: state, panel cards, presets, export, and screenshot scenes.
// Photos are read on the user's own machine (FileReader / object URLs) and never uploaded.
import { drawCover, layoutPanelCount } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const SIZES = { '1080x1080': [1080, 1080], '1080x1350': [1080, 1350], '1920x1080': [1920, 1080] };

export const state = {
  layout: 'grid',
  size: '1080x1080',
  grade: 'sunset',
  title: 'VICE CITY NIGHTS',
  subtitle: 'ONE LAST SCORE',
  tag: 'VICE CITY · 2026',
  panels: [
    { img: null, sample: 'pier', zoom: 1, ox: 0, oy: 0, anchorTop: true },
    { img: null, sample: 'boulevard', zoom: 1, ox: 0, oy: 0, anchorTop: true },
    { img: null, sample: 'boulevard', zoom: 1.15, ox: 0, oy: 0, anchorTop: true },
    { img: null, sample: 'pier', zoom: 1.15, ox: 0, oy: 0, anchorTop: true },
  ],
};

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSample(panel, name) {
  panel.sample = name;
  panel.img = await loadImage(`samples/${name}.jpg`);
}

let fontsReady = false;
async function redraw() {
  const [w, h] = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  if (!fontsReady) {
    try { await document.fonts.load('100px Anton'); await document.fonts.ready; } catch { /* system font fallback */ }
    fontsReady = true;
  }
  drawCover(canvas, state);
  refreshPanelCards();
}

function panelLabel(i) {
  return ['Top left', 'Top right', 'Bottom left', 'Bottom right'][i] || `Panel ${i + 1}`;
}

function buildPanelCards() {
  const host = document.getElementById('panels');
  host.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const card = document.createElement('div');
    card.className = 'panel-card';
    card.id = `panel-${i}`;
    card.innerHTML = `
      <h3>Panel ${i + 1} · <span>${panelLabel(i)}</span></h3>
      <div class="file-row">
        <input type="file" accept="image/*" aria-label="Photo for panel ${i + 1}">
        <button type="button" data-sample="pier">Sample: Pier</button>
        <button type="button" data-sample="boulevard">Sample: Blvd</button>
        <button type="button" data-fill-all>Fill all panels</button>
      </div>
      <div class="sliders">
        <span>Zoom</span><input type="range" min="1" max="2.5" step="0.05" value="${panel.zoom}" data-k="zoom" aria-label="Zoom panel ${i + 1}">
        <span>Pan X</span><input type="range" min="-50" max="50" step="1" value="${panel.ox}" data-k="ox" aria-label="Pan panel ${i + 1} horizontally">
        <span>Pan Y</span><input type="range" min="-50" max="50" step="1" value="${panel.oy}" data-k="oy" aria-label="Pan panel ${i + 1} vertically">
      </div>`;
    card.querySelector('input[type=file]').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      panel.sample = null;
      panel.img = await loadImage(URL.createObjectURL(file));
      redraw();
    });
    card.querySelectorAll('[data-sample]').forEach((b) => b.addEventListener('click', async () => {
      await loadSample(panel, b.dataset.sample);
      redraw();
    }));
    card.querySelector('[data-fill-all]').addEventListener('click', () => {
      if (!panel.img) return;
      state.panels.forEach((p) => { p.img = panel.img; p.sample = panel.sample; });
      redraw();
      status.textContent = `Panel ${i + 1}'s photo now fills every panel.`;
    });
    card.querySelectorAll('input[type=range]').forEach((s) => s.addEventListener('input', () => {
      panel[s.dataset.k] = Number(s.value);
      redraw();
    }));
    host.appendChild(card);
  });
}

function refreshPanelCards() {
  const count = layoutPanelCount(state.layout);
  state.panels.forEach((panel, i) => {
    const card = document.getElementById(`panel-${i}`);
    if (!card) return;
    card.classList.toggle('disabled', i >= count);
    card.querySelectorAll('input[type=range]').forEach((s) => { s.value = panel[s.dataset.k]; });
  });
}

function wireGroup(id, key, fn) {
  document.getElementById(id).addEventListener('click', (e) => {
    const b = e.target.closest('button[data-' + key + ']');
    if (!b) return;
    document.querySelectorAll(`#${id} button`).forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
    fn(b.dataset[key]);
    redraw();
  });
}

const PRESETS = {
  heist: { layout: 'grid', grade: 'sunset', title: 'SUNSET HEIST', subtitle: 'ONE LAST SCORE', tag: 'VICE CITY · 2026', samples: ['pier', 'boulevard', 'boulevard', 'pier'] },
  queen: { layout: 'strip', grade: 'sunset', title: 'BOULEVARD QUEEN', subtitle: 'SHE RUNS THIS TOWN', tag: 'OCEAN DRIVE · 2026', samples: ['boulevard', 'pier', 'boulevard', 'pier'] },
  neon: { layout: 'split', grade: 'neon', title: 'NEON NIGHTS', subtitle: 'VICE CITY AFTER DARK', tag: 'MALIBU CLUB · 2 AM', samples: ['pier', 'boulevard', 'pier', 'boulevard'] },
};

async function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  state.layout = p.layout;
  state.grade = p.grade;
  state.title = p.title;
  state.subtitle = p.subtitle;
  state.tag = p.tag;
  document.getElementById('title').value = p.title;
  document.getElementById('subtitle').value = p.subtitle;
  document.getElementById('tag').value = p.tag;
  for (const [key, id] of [['layout', 'layouts'], ['grade', 'grades']]) {
    document.querySelectorAll(`#${id} button`).forEach((x) => x.classList.toggle('on', x.dataset[key] === p[key]));
  }
  for (let i = 0; i < 4; i++) await loadSample(state.panels[i], p.samples[i]);
  // Same layout-specific framings as the screenshot scenes, tuned for each
  // preset's own photo assignment (the queen preset leads with boulevard,
  // the 1-cover shot with pier, so the strip values differ between the two).
  // The strip hero is a two-photo diptych (panels 0 and 1, each cover-fit
  // into its half); the second panel carries a separate hero framing
  // (heroZoom/heroOx/heroOy) for its hero-half crop. The split's third
  // panel is the fishing-rod shot (ox -79 reaches the rod at the right edge
  // of the pier photo — hence the Pan sliders now span -100..100), and its
  // first panel is panned to ox 22 so the hat's left brim clears the frame.
  const framings = p.layout === 'strip'
    ? [{ zoom: 1, ox: 0, oy: 0, wash: 0.45, anchorTop: true }, { zoom: 1, ox: 0, oy: 0, wash: 1, anchorTop: true, heroZoom: 1, heroOx: 0, heroOy: 0, tintBoost: 1 }, { zoom: 1.15, ox: 0, oy: -22, wash: 1, anchorTop: true }, { zoom: 1.3, ox: 0, oy: 0, wash: 1, anchorTop: true }]
    : p.layout === 'split'
      ? [{ zoom: 1, ox: 22, oy: 0, wash: 1, anchorTop: true, tintBoost: 1 }, { zoom: 1, ox: 10, oy: 0, wash: 1, anchorTop: true }, { zoom: 1.15, ox: -79, oy: 0, wash: 1, anchorTop: true, tintBoost: 1 }, { zoom: 1, ox: 0, oy: 0, wash: 1, anchorTop: true }]
      : [{ zoom: 1, ox: 0, oy: 0, wash: 1, anchorTop: true }, { zoom: 1, ox: 0, oy: 0, wash: 1, anchorTop: true }, { zoom: 1.35, ox: 14, oy: 0, wash: 1, anchorTop: true }, { zoom: 1.35, ox: -14, oy: 0, wash: 1, anchorTop: true }];
  state.panels.forEach((panel, i) => Object.assign(panel, framings[i]));
  redraw();
}

document.getElementById('presets').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-preset]');
  if (b) applyPreset(b.dataset.preset);
});
wireGroup('layouts', 'layout', (v) => { state.layout = v; });
wireGroup('sizes', 'size', (v) => { state.size = v; });
wireGroup('grades', 'grade', (v) => { state.grade = v; });

for (const [id, key] of [['title', 'title'], ['subtitle', 'subtitle'], ['tag', 'tag']]) {
  document.getElementById(id).addEventListener('input', (e) => { state[key] = e.target.value; redraw(); });
}

document.getElementById('export').addEventListener('click', () => {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-panels-${state.size}.png`;
    a.click();
    status.textContent = `Saved vice-panels-${state.size}.png (${state.size.replace('x', ' × ')}).`;
  }, 'image/png');
});

buildPanelCards();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    state, loadSample, redraw,
    setCaption: (t, s) => {
      if (t !== null) { state.title = t; document.getElementById('title').value = t; }
      if (s !== null) { state.subtitle = s; document.getElementById('subtitle').value = s; }
    },
  });
} else {
  (async () => {
    for (let i = 0; i < 4; i++) await loadSample(state.panels[i], state.panels[i].sample);
    redraw();
  })();
}
