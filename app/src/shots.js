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
  // its own set: the strip hero is a two-photo diptych (panels 0 and 1, each
  // cover-fit into its half — each half is ~2:1, so the hat and the face both
  // fit, which a single cover-fill of the ~4:1 hero could not do). The second
  // panel carries a separate hero framing (heroZoom/heroOx/heroOy) for its
  // hero-half crop, distinct from its bottom-row framing; the woman's hero
  // crop is a tighter face-and-shoulders shot (measured: her face sits at
  // source y≈86–241, hair top y≈58). The strip's pier close-up is loosened
  // to zoom 1.15 for a touch more headroom (the hat sits at the very top of
  // the source, y≈7, so the geometry caps it), and the woman's tight face is
  // loosened to zoom 1.3 with oy -25 so her hair top and chin both stay in
  // frame. The split's first panel is cover-fill (the tall frame crops the
  // sides, never the top, so the hat stays in frame) with an extra tint pass
  // so its cool daylight photo reads as warm as the other panels, panned to
  // ox 22 so the hat's left brim clears the frame edge; its third panel is
  // now the fishing-rod shot — the right side of the pier photo (the rod
  // lives at source x≈438–720, the face ends at x≈436), so it shows rod +
  // reel + sea and no face, reading as a different image. The strip's pier
  // close-up is capped at zoom 1.25: the man's chin sits at y≈256/720,
  // so a tighter zoom would cut it (measured, not guessed).
  const framings = layout === 'strip'
    ? [{ zoom: 1, ox: 0, oy: 0, wash: 0.45, anchorTop: true, tintBoost: 1 }, { zoom: 1, ox: 0, oy: 0, wash: 1, anchorTop: true, heroZoom: 1.25, heroOx: -8, heroOy: -27 }, { zoom: 1.15, ox: 0, oy: 0, wash: 1, anchorTop: true }, { zoom: 1.3, ox: -8, oy: -25, wash: 1, anchorTop: true }]
    : layout === 'split'
      ? [{ zoom: 1, ox: 22, oy: 0, wash: 1, anchorTop: true, tintBoost: 1 }, { zoom: 1, ox: 10, oy: 0, wash: 1, anchorTop: true }, { zoom: 1.15, ox: -79, oy: 0, wash: 1, anchorTop: true, tintBoost: 1 }, { zoom: 1, ox: 0, oy: 0, wash: 1, anchorTop: true }]
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
