import {glowDefaults,normalizeGlow} from './cable-glow-settings.js';
const NS = 'http://www.w3.org/2000/svg';
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const COUNT = 36;
const layouts = [
  { start: .18, end: .035, bend: .67 },
  { start: .29, end: .22, bend: .88 },
  { start: .40, end: .365, bend: 1.05 },
  { start: .64, end: .57, bend: .83 },
  { start: .54, end: .61, bend: .52 },
  { start: .75, end: .755, bend: .79 },
  { start: .86, end: .965, bend: .58 },
];

function svgElement(tag, attributes, parent) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  parent.append(node);
  return node;
}

function distanceToSweep(x, y, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = clamp(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(x - a.x - dx * t, y - a.y - dy * t);
}

// Smooth the simulated samples without moving either attachment point.
function curve(points) {
  let d = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i], next = points[i + 1];
    d += ` Q${p.x.toFixed(2)},${p.y.toFixed(2)} ${((p.x + next.x) / 2).toFixed(2)},${((p.y + next.y) / 2).toFixed(2)}`;
  }
  const end = points.at(-1);
  return d + ` L${end.x.toFixed(2)},${end.y.toFixed(2)}`;
}

export function createSignupCables(section, reduced) {
  const listeners=[]; let destroyed=false;
  let glow={...glowDefaults}, preview=false, glowTime=0;
  const listen=(target,type,callback,options)=>{target.addEventListener(type,callback,options);listeners.push(()=>target.removeEventListener(type,callback,options));};
  const field = section.querySelector('.booking-cables');
  const svg = field.querySelector('svg');
  const card = section.querySelector('[data-cable-anchor]');
  const wrap = section.querySelector('.signup-wrap');
  const scrollTrigger = matchMedia('(max-width:680px), (hover:none), (pointer:coarse)');
  let cardVisible = false;
  const isLit = () => preview || (scrollTrigger.matches ? cardVisible : hover || focused);
  const defs = svgElement('defs', {}, svg);
  const filter = svgElement('filter', { id: 'booking-cable-glow', x: '-35%', y: '-25%', width: '170%', height: '150%' }, defs);
  const blur=svgElement('feGaussianBlur', { stdDeviation: '5' }, filter);
  const baseLayer = svgElement('g', { class: 'cable-base' }, svg);
  const haloLayer = svgElement('g', { class: 'cable-halo', filter: 'url(#booking-cable-glow)' }, svg);
  const lightLayer = svgElement('g', { class: 'cable-light' }, svg);
  const coreLayer = svgElement('g', { class: 'cable-core' }, svg);
  const cables = layouts.map((layout, index) => ({
    ...layout, index, nodes: [],
    paths: [baseLayer, haloLayer, lightLayer, coreLayer].map(layer => svgElement('path', { fill: 'none', 'pathLength': '1' }, layer)),
  }));
  const gradients=cables.map(cable=>{
    const gradient=svgElement('linearGradient',{id:'cable-energy-'+cable.index,x1:'0%',y1:'0%',x2:'0%',y2:'100%'},defs);
    cable.paths[1].setAttribute('stroke','url(#cable-energy-'+cable.index+')');
    return Array.from({length:33},(_,i)=>svgElement('stop',{offset:i/32,'stop-color':'#ff162a'},gradient));
  });
  let visible = false, paused = false, frame = 0, lastTime = 0;
  let width = 0, height = 0, hover = false, focused = false;
  let charge = 0, brightness = 0, previousPointer = null;
  let lastScroll = scrollY, scrollVelocity = 0;
  let metal = null, loadingMetal = false;

  async function loadMetal() {
    if (metal || loadingMetal) return;
    loadingMetal = true;
    try {
      const { createMetalCables } = await import('./booking-cable-renderer.js');
      if (destroyed) return;
      metal = createMetalCables(field, cables.length, ready => {
        field.dataset.renderer = ready ? 'webgl' : 'svg';
        if (ready) { draw(); wake(); }
      });
      metal.resize(width, height);
      draw();
      field.dataset.renderer = 'webgl';
    } catch (error) {
      // The existing SVG cords remain fully usable if WebGL is unavailable.
      field.dataset.renderer = 'svg';
      console.warn('Metal cables unavailable; using the cable fallback.', error);
    }
  }

  function measure() {
    const rect = field.getBoundingClientRect(), anchor = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    width = rect.width; height = rect.height;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    metal?.resize(width, height);
    for (const cable of cables) {
      const startX = anchor.left - rect.left + anchor.width * cable.start;
      const endX = width * cable.end;
      cable.nodes = Array.from({ length: COUNT + 1 }, (_, i) => {
        const t = i / COUNT, u = 1 - t;
        const x = u * u * u * startX + 3 * u * u * t * startX + 3 * u * t * t * endX + t * t * t * endX;
        const y = 3 * u * u * t * height * cable.bend + 3 * u * t * t * height * .35 + t * t * t * (height + 2);
        // Small irregular bends make the unlit cords feel physical, not diagrammatic.
        const wobble = Math.sin(t * Math.PI) ** 2;
        return { x: x + Math.sin(t * 13 + cable.index * 1.8) * 2.5 * wobble, y,
          ox: 0, oy: 0, vx: 0, vy: 0, envelope: Math.sin(t * Math.PI) };
      }).map(p => ({ ...p, y: height - p.y })).reverse();
    }
    previousPointer = null;
    lastScroll = scrollY; scrollVelocity = 0;
    draw(); wake();
  }

  function syncCardGlow() {
    // Use the same advancing front as the rendered cables: light the card
    // when the first pulse reaches its attachment, never on the trigger itself.
    const arrived = isLit() && (reduced.matches || charge * 1.15 >= 1);
    const value = String(arrived);
    if (wrap.dataset.cableArrived !== value) wrap.dataset.cableArrived = value;
  }

  function draw() {
    syncCardGlow();
    blur.setAttribute('stdDeviation',String(glow.bloomSpread));
    haloLayer.style.strokeWidth=String(glow.haloWidth);
    haloLayer.style.strokeOpacity=String(glow.bloomStrength);
    gradients.forEach((stops,index)=>stops.forEach((stop,i)=>{
      const t=i/32, phase=t*glow.frequency*Math.PI*2+index*1.7-glowTime*glow.speed;
      const peak=Math.pow(.5+.5*Math.sin(phase+Math.sin(phase*1.73)*.7),3);
      stop.setAttribute('stop-opacity',String(1-glow.variation+glow.variation*(.08+.92*peak)));
    }));
    for (const cable of cables) {
      if (!cable.nodes.length) continue;
      const d = curve(cable.nodes.map(p => ({ x: p.x + p.ox, y: p.y + p.oy })));
      const progress = reduced.matches ? Number(isLit()) : clamp(charge * 1.15 - cable.index * .023, 0, 1);
      for (let i = 0; i < cable.paths.length; i++) {
        const path = cable.paths[i];
        path.setAttribute('d', d);
        if (i) {
          path.setAttribute('stroke-dasharray', '1 1');
          path.setAttribute('stroke-dashoffset', (1 - progress).toFixed(4));
        }
      }
    }
    const opacity = brightness.toFixed(4);
    for (const layer of [haloLayer, lightLayer, coreLayer]) layer.setAttribute('opacity', opacity);
    metal?.draw(cables, reduced.matches ? Number(isLit()) : charge, brightness, reduced.matches, glow, glowTime);
  }

  function wake() {
    if (!visible || paused || !width) return;
    if (reduced.matches) {
      charge = brightness = Number(isLit());
      draw(); return;
    }
    if (!frame) frame = requestAnimationFrame(animate);
  }

  function stop() {
    cancelAnimationFrame(frame); frame = 0; lastTime = 0;
    previousPointer = null; lastScroll = scrollY; scrollVelocity = 0;
  }

  function animate(now) {
    frame = 0;
    if (paused || !visible) { stop(); return; }
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 1 / 30) : 1 / 60;
    lastTime = now;
    glowTime += dt;
    const scrollDelta = scrollY - lastScroll;
    lastScroll = scrollY;
    // Both acceleration and braking impart a small impulse. Ignore navigation jumps.
    const speed = Math.abs(scrollDelta) > innerHeight * .45 ? 0 : clamp(scrollDelta / dt, -1800, 1800);
    const nextVelocity = scrollVelocity + (speed - scrollVelocity) * (1 - Math.exp(-dt * 18));
    const impulse = clamp(nextVelocity - scrollVelocity, -500, 500);
    scrollVelocity = nextVelocity;
    for (const cable of cables) for (const p of cable.nodes) {
      p.vy -= impulse * .055 * p.envelope;
      p.vx += impulse * .02 * Math.sin(cable.index * 1.7 + .4) * p.envelope;
    }

    let energy = 0;
    const steps = Math.ceil(dt * 120), h = dt / steps;
    for (let step = 0; step < steps; step++) {
      for (const cable of cables) {
        const nodes = cable.nodes;
        // Integrate velocities first so neighbor forces use one coherent pose.
        for (let i = 1; i < nodes.length - 1; i++) {
          const p = nodes[i], a = nodes[i - 1], b = nodes[i + 1];
          p.vx += (-45 * p.ox + 400 * (a.ox + b.ox - 2 * p.ox) - 5.2 * p.vx) * h;
          p.vy += (-45 * p.oy + 400 * (a.oy + b.oy - 2 * p.oy) - 5.2 * p.vy) * h;
        }
        for (let i = 1; i < nodes.length - 1; i++) {
          const p = nodes[i];
          p.ox = clamp(p.ox + p.vx * h, -48, 48);
          p.oy = clamp(p.oy + p.vy * h, -32, 32);
          energy = Math.max(energy, Math.abs(p.ox), Math.abs(p.oy), Math.abs(p.vx), Math.abs(p.vy));
        }
      }
    }
    const lit = isLit();
    if (lit) {
      charge = Math.min(1, charge + dt / .82);
      brightness = Math.min(1, brightness + dt * 7);
    } else {
      brightness = Math.max(0, brightness - dt * 2.8);
      if (!brightness) charge = 0;
    }
    draw();
    const changingLight = lit ? charge < 1 || brightness < 1 : brightness > 0;
    if (energy > .03 || Math.abs(scrollVelocity) > .5 || changingLight || (lit && glow.variation > 0 && glow.speed > 0)) frame = requestAnimationFrame(animate);
    else lastTime = 0;
  }

  function illuminate() {
    syncCardGlow();
    wake();
  }
  // Enter once a useful portion of the card is visible; stay lit until it
  // leaves completely so scrolling and the mobile keyboard cannot flicker it.
  const cardObserver = new IntersectionObserver(entries => {
    const entry = entries[0];
    cardVisible = entry.isIntersecting && (cardVisible || entry.intersectionRatio >= .25);
    illuminate();
  }, { threshold: [0, .25] });
  cardObserver.observe(card);
  listen(scrollTrigger, 'change', () => { hover = false; illuminate(); });
  listen(card, 'pointerenter', event => {
    if (scrollTrigger.matches || event.pointerType === 'touch') return;
    hover = true; illuminate();
  });
  listen(card, 'pointerleave', () => { hover = false; illuminate(); });
  listen(card, 'focusin', () => { focused = true; illuminate(); });
  listen(card, 'keydown', () => { focused = true; illuminate(); });
  listen(card, 'focusout', event => { if (!card.contains(event.relatedTarget)) { focused = false; illuminate(); } });
  listen(section, 'pointermove', event => {
    if (paused || !visible || reduced.matches || event.pointerType === 'touch') return;
    const rect = field.getBoundingClientRect();
    const current = { x: event.clientX - rect.left, y: event.clientY - rect.top, time: event.timeStamp };
    metal?.pointer(current.x, current.y);
    if (metal) wake();
    if (current.y < -10 || current.y > height + 10) { previousPointer = null; return; }
    const previous = previousPointer && current.time - previousPointer.time < 140 ? previousPointer : current;
    const dx = clamp(current.x - previous.x, -34, 34), dy = clamp(current.y - previous.y, -34, 34);
    let touched = false;
    for (const cable of cables) for (let i = 1; i < cable.nodes.length - 1; i++) {
      const p = cable.nodes[i];
      const distance = distanceToSweep(p.x + p.ox, p.y + p.oy, previous, current);
      if (distance >= 36) continue;
      const force = (1 - distance / 36) ** 2 * p.envelope;
      p.vx = clamp(p.vx + dx * 10 * force, -300, 300);
      p.vy = clamp(p.vy + dy * 7 * force, -220, 220);
      touched ||= force > 0 && (dx !== 0 || dy !== 0);
    }
    previousPointer = current;
    if (touched) wake();
  }, { passive: true });
  listen(section, 'pointerleave', () => { previousPointer = null; });
  listen(window, 'scroll', () => { previousPointer = null; wake(); }, { passive: true });
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) { lastScroll = scrollY; wake(); } else stop();
  });
  observer.observe(field);
  const preload = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { loadMetal(); preload.disconnect(); }
  }, { rootMargin: '300px' });
  preload.observe(field);
  const resize = new ResizeObserver(measure);
  resize.observe(field); resize.observe(card);
  listen(reduced, 'change', () => {
    stop();
    for (const cable of cables) for (const p of cable.nodes) p.ox = p.oy = p.vx = p.vy = 0;
    charge = brightness = Number(isLit());
    draw(); wake();
  });
  measure();
  return {
    getGlow() { return {...glow}; },
    setGlow(value) { glow=normalizeGlow(value); draw(); wake(); },
    setPreview(value) { preview=!!value; wake(); },
    destroy() { destroyed=true; paused=true; stop(); observer.disconnect(); cardObserver.disconnect(); preload.disconnect(); resize.disconnect(); delete wrap.dataset.cableArrived; listeners.forEach(remove=>remove()); metal?.destroy(); svg.replaceChildren(); }, setPaused(value) {
    if (paused === value) return;
    paused = value;
    if (paused) stop(); else { lastScroll = scrollY; wake(); }
  } };
}
