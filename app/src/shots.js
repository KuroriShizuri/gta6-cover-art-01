// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos loaded;
// ?shot=cover shows the cover alone. Query params: photo (pier|boulevard), caption,
// subtitle, layout, grade, size. window.__shotReady is set once painted.
export async function runShot(shot, query, api) {
  const { state, loadSample, redraw, setCaption } = api;
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photo = query.get('photo') ?? 'pier';
  const other = photo === 'pier' ? 'boulevard' : 'pier';
  const layout = query.get('layout') ?? 'grid';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? '1080x1080';
  state.layout = layout;
  state.grade = grade;
  state.size = size;
  setCaption(query.get('caption') ?? 'VICE CITY NIGHTS', query.get('subtitle') ?? 'ONE LAST SCORE');
  const samples = [photo, other, other, photo];
  for (let i = 0; i < 4; i++) await loadSample(state.panels[i], samples[i]);
  // Give repeated photos visibly different framings, so no two panels look cloned.
  // anchorTop keeps heads in frame on the wide/short panels.
  const framings = layout === 'strip'
    ? [{ zoom: 1, ox: 0, oy: -50, anchorTop: true }, { zoom: 1.3, ox: 12, oy: 0, anchorTop: true }, { zoom: 1.3, ox: -12, oy: 0, anchorTop: true }, { zoom: 1, ox: 0, oy: 0, anchorTop: true }]
    : [{ zoom: 1, ox: 0, oy: 0, anchorTop: true }, { zoom: 1, ox: 0, oy: 0, anchorTop: true }, { zoom: 1.35, ox: 14, oy: 0, anchorTop: true }, { zoom: 1.35, ox: -14, oy: 0, anchorTop: true }];
  state.panels.forEach((p, i) => Object.assign(p, framings[i]));
  // Reflect the chosen layout/grade/size in the control buttons.
  for (const [key, id] of [['layout', 'layouts'], ['grade', 'grades'], ['size', 'sizes']]) {
    document.querySelectorAll(`#${id} button`).forEach((x) => x.classList.toggle('on', x.dataset[key] === state[key]));
  }
  await redraw();
  if (shot === 'editor') {
    // Scroll the "Photos & crop" group into view, so a panel card and its
    // crop controls are visible in the 1280x720 editor shot (they sit below
    // the fold otherwise). The preview stays put: it is position: sticky.
    document.getElementById('panels').closest('.group').scrollIntoView();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
