/**
 * SHPanel — Screenhouse zero-dependency control panel.
 * Drop-in replacement for Tweakpane / lil-gui.
 *
 * Usage:
 *   const panel = new SHPanel(containerEl);
 *   const f = panel.folder('Particles');
 *   f.slider(params, 'count', { min: 0, max: 5000, step: 1 })
 *    .on('change', e => rebuild());
 *   f.color(params, 'tint').on('change', e => mat.color.set(e.value));
 *   f.toggle(params, 'enabled');
 *   f.button('Reset', () => reset());
 *   f.select(params, 'mode', { options: ['push','pull'] });
 *   f.file({ accept: 'image/*' }).on('change', e => load(e.file));
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'sh-panel-collapsed';

  function label(prop, opts) {
    if (opts && opts.label) return opts.label;
    return prop
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .trim();
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function precision(step) {
    if (!step || step >= 1) return 0;
    const s = String(step);
    const dot = s.indexOf('.');
    return dot < 0 ? 0 : s.length - dot - 1;
  }

  function fmt(val, step) {
    const p = precision(step);
    return Number(val).toFixed(p);
  }

  class Emitter {
    constructor() { this._handlers = {}; }
    on(evt, fn) { (this._handlers[evt] || (this._handlers[evt] = [])).push(fn); return this; }
    _emit(evt, data) { (this._handlers[evt] || []).forEach(fn => fn(data)); }
  }

  // ── Controls ──────────────────────────────────────────────

  class SHSlider extends Emitter {
    constructor(obj, prop, opts, parentEl) {
      super();
      const o = Object.assign({ min: 0, max: 100, step: 1 }, opts);
      this._obj = obj; this._prop = prop; this._opts = o;

      const row = document.createElement('div');
      row.className = 'sh-ctrl sh-slider';

      const head = document.createElement('div');
      head.className = 'sh-ctrl-head';

      const lbl = document.createElement('span');
      lbl.className = 'sh-label';
      lbl.textContent = label(prop, opts);

      const val = document.createElement('span');
      val.className = 'sh-value';
      val.textContent = fmt(obj[prop], o.step);
      this._valEl = val;

      head.append(lbl, val);

      const range = document.createElement('input');
      range.type = 'range';
      range.min = o.min; range.max = o.max; range.step = o.step;
      range.value = obj[prop];
      this._input = range;

      range.addEventListener('input', () => {
        const v = parseFloat(range.value);
        obj[prop] = v;
        val.textContent = fmt(v, o.step);
        this._emit('change', { value: v });
      });

      row.append(head, range);
      parentEl.appendChild(row);
    }
    setValue(v) {
      v = clamp(v, this._opts.min, this._opts.max);
      this._obj[this._prop] = v;
      this._input.value = v;
      this._valEl.textContent = fmt(v, this._opts.step);
    }
  }

  class SHColor extends Emitter {
    constructor(obj, prop, opts, parentEl) {
      super();
      this._obj = obj; this._prop = prop;

      const row = document.createElement('div');
      row.className = 'sh-ctrl sh-color';

      const lbl = document.createElement('span');
      lbl.className = 'sh-label';
      lbl.textContent = label(prop, opts);

      const swatch = document.createElement('input');
      swatch.type = 'color';
      swatch.value = obj[prop];
      this._input = swatch;

      swatch.addEventListener('input', () => {
        obj[prop] = swatch.value;
        this._emit('change', { value: swatch.value });
      });

      row.append(lbl, swatch);
      parentEl.appendChild(row);
    }
    setValue(v) {
      this._obj[this._prop] = v;
      this._input.value = v;
    }
  }

  class SHToggle extends Emitter {
    constructor(obj, prop, opts, parentEl) {
      super();
      this._obj = obj; this._prop = prop;

      const row = document.createElement('div');
      row.className = 'sh-ctrl sh-toggle';

      const lbl = document.createElement('span');
      lbl.className = 'sh-label';
      lbl.textContent = label(prop, opts);

      const track = document.createElement('label');
      track.className = 'sh-switch';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!obj[prop];
      this._input = cb;

      const knob = document.createElement('span');
      knob.className = 'sh-knob';

      track.append(cb, knob);

      cb.addEventListener('change', () => {
        obj[prop] = cb.checked;
        this._emit('change', { value: cb.checked });
      });

      row.append(lbl, track);
      parentEl.appendChild(row);
    }
    setValue(v) {
      this._obj[this._prop] = !!v;
      this._input.checked = !!v;
    }
  }

  class SHButton extends Emitter {
    constructor(titleText, fn, parentEl) {
      super();
      const btn = document.createElement('button');
      btn.className = 'sh-btn';
      btn.textContent = titleText;
      btn.addEventListener('click', () => {
        if (fn) fn();
        this._emit('click', {});
      });
      parentEl.appendChild(btn);
    }
  }

  class SHSelect extends Emitter {
    constructor(obj, prop, opts, parentEl) {
      super();
      this._obj = obj; this._prop = prop;
      const o = opts || {};

      const row = document.createElement('div');
      row.className = 'sh-ctrl sh-select';

      const lbl = document.createElement('span');
      lbl.className = 'sh-label';
      lbl.textContent = label(prop, o);

      const sel = document.createElement('select');
      this._input = sel;

      const options = o.options || [];
      if (Array.isArray(options)) {
        options.forEach(v => {
          const opt = document.createElement('option');
          opt.value = v; opt.textContent = v;
          if (v === obj[prop]) opt.selected = true;
          sel.appendChild(opt);
        });
      } else {
        Object.keys(options).forEach(k => {
          const opt = document.createElement('option');
          opt.value = options[k]; opt.textContent = k;
          if (options[k] === obj[prop]) opt.selected = true;
          sel.appendChild(opt);
        });
      }

      sel.addEventListener('change', () => {
        obj[prop] = sel.value;
        this._emit('change', { value: sel.value });
      });

      row.append(lbl, sel);
      parentEl.appendChild(row);
    }
    setValue(v) {
      this._obj[this._prop] = v;
      this._input.value = v;
    }
  }

  class SHFile extends Emitter {
    constructor(opts, parentEl) {
      super();
      const o = opts || {};

      const row = document.createElement('div');
      row.className = 'sh-ctrl sh-file';

      const btn = document.createElement('button');
      btn.className = 'sh-btn';
      btn.textContent = o.label || 'Choose File';

      const input = document.createElement('input');
      input.type = 'file';
      input.style.display = 'none';
      if (o.accept) input.accept = o.accept;

      btn.addEventListener('click', () => input.click());
      input.addEventListener('change', () => {
        const file = input.files[0];
        if (file) this._emit('change', { file, value: file });
      });

      row.append(btn, input);
      parentEl.appendChild(row);
    }
  }

  // ── Folder ────────────────────────────────────────────────

  class SHFolder {
    constructor(titleText, parentEl, opts) {
      const o = Object.assign({ expanded: true }, opts);

      this.el = document.createElement('div');
      this.el.className = 'sh-folder' + (o.expanded ? '' : ' collapsed');

      const header = document.createElement('div');
      header.className = 'sh-folder-head';

      const arrow = document.createElement('span');
      arrow.className = 'sh-arrow';
      arrow.textContent = '\u25BE';

      const t = document.createElement('span');
      t.textContent = titleText;

      header.append(arrow, t);
      header.addEventListener('click', () => {
        this.el.classList.toggle('collapsed');
      });

      this._body = document.createElement('div');
      this._body.className = 'sh-folder-body';

      this.el.append(header, this._body);
      parentEl.appendChild(this.el);
    }

    slider(obj, prop, opts)  { return new SHSlider(obj, prop, opts, this._body); }
    color(obj, prop, opts)   { return new SHColor(obj, prop, opts, this._body); }
    toggle(obj, prop, opts)  { return new SHToggle(obj, prop, opts, this._body); }
    button(title, fn)        { return new SHButton(title, fn, this._body); }
    select(obj, prop, opts)  { return new SHSelect(obj, prop, opts, this._body); }
    file(opts)               { return new SHFile(opts, this._body); }
    folder(title, opts)      { return new SHFolder(title, this._body, opts); }
  }

  // ── Panel ─────────────────────────────────────────────────

  class SHPanel {
    constructor(container) {
      this._container = container;
      if (!container.classList.contains('sh-panel')) {
        container.classList.add('sh-panel');
      }

      this._body = document.createElement('div');
      this._body.className = 'sh-panel-body';
      container.appendChild(this._body);

      this._setupToggle();
      this._setupHint();
    }

    _setupToggle() {
      let collapsed = sessionStorage.getItem(STORAGE_KEY) === 'true';
      if (collapsed) this._container.classList.add('collapsed');

      const toggle = () => {
        collapsed = !collapsed;
        sessionStorage.setItem(STORAGE_KEY, String(collapsed));
        this._container.classList.toggle('collapsed', collapsed);
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new CustomEvent('sh-panel-toggle', { detail: { collapsed } }));
      };

      document.addEventListener('keydown', (e) => {
        if (e.code === 'Backquote') {
          e.preventDefault();
          toggle();
        }
      });
    }

    _setupHint() {
      let hint = document.querySelector('.sh-panel-hint');
      if (!hint) {
        hint = document.createElement('div');
        hint.className = 'sh-panel-hint';
        hint.setAttribute('aria-hidden', 'true');
        hint.textContent = '~ toggle panel';
        document.body.appendChild(hint);
      }
      setTimeout(() => hint.classList.add('hidden'), 3000);
    }

    folder(title, opts)      { return new SHFolder(title, this._body, opts); }
    slider(obj, prop, opts)  { return new SHSlider(obj, prop, opts, this._body); }
    color(obj, prop, opts)   { return new SHColor(obj, prop, opts, this._body); }
    toggle(obj, prop, opts)  { return new SHToggle(obj, prop, opts, this._body); }
    button(title, fn)        { return new SHButton(title, fn, this._body); }
    select(obj, prop, opts)  { return new SHSelect(obj, prop, opts, this._body); }
    file(opts)               { return new SHFile(opts, this._body); }
  }

  window.SHPanel = SHPanel;
})();
