// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos loaded;
// ?shot=cover shows the cover alone. Query params: photo (pier|boulevard), caption,
// subtitle, layout, grade, size. window.__shotReady is set once painted.
export async function runShot(shot, query, api) {
  const { state, loadSample, redraw, setCaption } = api;
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');
  const photo = query.get('photo') ?? 'pier';
  const other = photo === 'pier' ? 'boulevard' : 'pier';
  const layout = query.get('layout') ?? 'grid';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? '1080x1080';
  state.layout = layout;
  state.grade = grade;
  state.size = size;
  setCaption(query.get('caption') ?? 'VICE CITY NIGHTS', query.get('subtitle') ?? 'ONE LAST SCORE');
  const samples = layout === 'grid'
    ? [photo, other, other, photo]
    // Strip and split alternate the two sample photos so no two adjacent
    // panels share a photo; the grid keeps its original assignment (its
    // 2x2 passed review as-is).
    : [photo, other, photo, other];
  for (let i = 0; i < 4; i++) await loadSample(state.panels[i], samples[i]);
  // Give repeated photos visibly different framings, so no two panels look cloned.
  // anchorTop keeps heads in frame on the wide/short panels. Each layout gets
  // its own set: the strip hero is contained (full photo, sharp) with a weaker
  // wash so the face keeps natural skin tones; the strip's second pier panel
  // is a tight face close-up, clearly different from the wide hero; the
  // split's first panel is cover-fill (the tall frame crops the sides, never
  // the top, so the hat stays in frame) with an extra tint pass so its cool
  // daylight photo reads as warm as the other panels, and its third panel is
  // a tight face close-up panned to centre the face with margin. The strip's
  // pier close-up is capped at zoom 1.25: the man's chin sits at y≈256/720,
  // so a tighter zoom would cut it (measured, not guessed).
  const framings = layout === 'strip'
    ? [{ zoom: 1, ox: 0, oy: 0, wash: 0.45 }, { zoom: 1, ox: 0, oy: 0, wash: 1, anchorTop: true }, { zoom: 1.25, ox: 0, oy: 0, wash: 1, anchorTop: true }, { zoom: 1.45, ox: -15, oy: -28, wash: 1, anchorTop: true }]
    : layout === 'split'
      ? [{ zoom: 1, ox: 12, oy: 0, wash: 1, anchorTop: true, tintBoost: 1 }, { zoom: 1, ox: 10, oy: 0, wash: 1, anchorTop: true }, { zoom: 1.35, ox: 18, oy: 0, wash: 1, anchorTop: true }, { zoom: 1, ox: 0, oy: 0, wash: 1, anchorTop: true }]
      : [{ zoom: 1, ox: 0, oy: 0, wash: 1, anchorTop: true }, { zoom: 1, ox: 0, oy: 0, wash: 1, anchorTop: true }, { zoom: 1.35, ox: 14, oy: 0, wash: 1, anchorTop: true }, { zoom: 1.35, ox: -14, oy: 0, wash: 1, anchorTop: true }];
  state.panels.forEach((p, i) => Object.assign(p, framings[i]));
  // Reflect the chosen layout/grade/size in the control buttons.
  for (const [key, id] of [['layout', 'layouts'], ['grade', 'grades'], ['size', 'sizes']]) {
    document.querySelectorAll(`#${id} button`).forEach((x) => x.classList.toggle('on', x.dataset[key] === state[key]));
  }
  await redraw();
  // The editor shot shows the page from the top (presets, caption, Export PNG)
  // — the viewport is tall enough to hold the whole controls column, and the
  // preview is vertically centred by the shot-editor style. No scrolling.
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
