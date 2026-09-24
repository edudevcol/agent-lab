(() => {
  if (window.__agentLab) return;

  const Z = 2147483647;
  const SIZE = 40;
  let SPEED = 1;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms / SPEED));

  // -------------------------------------------------------------------------
  // Estilos
  // -------------------------------------------------------------------------
  const style = document.createElement('style');
  style.textContent = `
    #al-layer { position:absolute; top:0; left:0; width:0; height:0; pointer-events:none; z-index:${Z}; isolation:isolate; }
    #al-layer.al-hide-marks .al-box { display:none; }
    .al-agent { position:absolute; top:0; left:0; width:${SIZE}px; height:${SIZE}px; border-radius:50%;
      display:grid; place-items:center; color:#fff; font:600 13px/1 system-ui, sans-serif;
      box-shadow:0 0 0 3px #fff, 0 4px 14px rgba(0,0,0,.35);
      transition:transform .7s cubic-bezier(.45,.05,.25,1); z-index:3; }
    .al-agent.al-fixed { position:fixed; top:0; left:0; }
    .al-avatar { position:relative; display:grid; place-items:center; width:32px; height:32px; overflow:hidden;
      border:2px solid #fff; border-radius:50%; color:#17202b; font:24px/1 "Apple Color Emoji", "Segoe UI Emoji", sans-serif;
      box-shadow:0 2px 6px #0003; transform:translateZ(0); }
    .al-avatar.al-face-0 { background:#dbeafe; } .al-avatar.al-face-1 { background:#fee2e2; }
    .al-avatar.al-face-2 { background:#dcfce7; } .al-avatar.al-face-3 { background:#fef3c7; }
    .al-avatar.al-face-4 { background:#ffedd5; } .al-avatar.al-face-5 { background:#cffafe; }
    .al-avatar .al-face-art { transform:translateY(1px); filter:drop-shadow(0 1px 1px #0002); }
    .al-agent.al-working { animation:al-pulse 1s ease-in-out infinite; }
    @keyframes al-pulse {
      0%,100% { box-shadow:0 0 0 3px #fff, 0 0 0 0 var(--c); }
      50% { box-shadow:0 0 0 3px #fff, 0 0 0 12px transparent; }
    }
    .al-box { position:absolute; border:2px solid var(--c); border-radius:4px; z-index:1;
      background:color-mix(in srgb, var(--c) 12%, transparent); }
    .al-box.al-ok { border-style:dashed; opacity:.4; background:none; }
    .al-bubble { position:absolute; top:0; left:0; width:max-content; max-width:260px; padding:6px 9px; border-radius:8px;
      background:#1d1f24; color:#fff; font:12px/1.35 system-ui, sans-serif; z-index:4;
      border-left:4px solid var(--c); opacity:0; transition:opacity .25s; }
    .al-bubble.al-show { opacity:1; }
    #al-panel { position:fixed; right:18px; bottom:18px; width:380px; max-height:78vh; overflow-x:hidden; overflow-y:auto;
      background:#101d1e; color:#e8f2ef; border:1px solid #2e4b47; border-radius:18px; box-shadow:0 22px 55px rgba(5,25,23,.4);
      z-index:${Z}; isolation:isolate; font:13px/1.4 system-ui, sans-serif; text-align:left; }
    #al-panel * { box-sizing:border-box; }
    #al-panel header { position:static; display:block; float:none; height:auto; padding:17px 18px 15px; border-bottom:1px solid #29443f; background:#152829; }
    #al-panel .al-kicker { color:#74d7b6; font-size:10px; font-weight:850; letter-spacing:.13em; text-transform:uppercase; }
    #al-panel h2 { margin:3px 0 1px; font:750 18px/1.3 system-ui, sans-serif; letter-spacing:-.02em; color:#f4faf8; }
    #al-panel .al-url { color:#91aaa4; font-size:11px; word-break:break-all; }
    #al-panel .al-phase { display:inline-flex; align-items:center; gap:7px; margin-top:14px; padding:5px 9px; border:1px solid #315b51; border-radius:99px; background:#183b34; font-size:11px; font-weight:700; }
    #al-panel .al-phase-dot { width:7px; height:7px; border-radius:50%; background:#62dcae; box-shadow:0 0 0 3px #62dcae33; }
    #al-panel.al-done .al-phase-dot { background:#89e68b; box-shadow:0 0 0 3px #89e68b33; }
    #al-panel .al-progress { height:6px; margin-top:13px; overflow:hidden; border-radius:99px; background:#29443f; }
    #al-panel .al-progress-bar { width:0; height:100%; background:#63d9b1; transition:width .3s ease; }
    #al-panel.al-done .al-progress-bar { background:#89e68b; }
    #al-panel .al-totals { margin-top:8px; color:#c6d8d3; font-size:12px; font-weight:650; }
    #al-panel button { display:block; width:max-content; margin-top:12px; padding:6px 10px; border:1px solid #41645d; border-radius:7px;
      background:#1d3534; color:#d8e9e4; font:11px system-ui, sans-serif; cursor:pointer; }
    #al-panel button:hover { background:#294743; }
    #al-panel .al-list-heading { padding:13px 18px 5px; color:#7fa49a; font-size:10px; font-weight:850; letter-spacing:.12em; text-transform:uppercase; }
    #al-panel ul { list-style:none; margin:0; padding:4px 14px 10px; }
    #al-panel .al-row { display:flex; align-items:center; gap:9px; margin:4px 0; padding:8px 8px; border:1px solid #29443f; border-radius:10px; background:#172728; transition:background .2s, border-color .2s; }
    #al-panel .al-row.al-active { border-color:#4b9c82; background:#1b3935; box-shadow:inset 3px 0 #62dcae; }
    #al-panel .al-row:hover { border-color:#4b7169; background:#1d3434; }
    #al-panel .al-avatar { flex:none; width:28px; height:28px; }
    #al-panel .al-name { flex:1; color:#e8f2ef; font-weight:700; }
    #al-panel .al-status { color:#91aaa4; font-size:10px; white-space:nowrap; }
    #al-panel .al-row.al-active .al-status { color:#78ddb9; }
    #al-panel .al-rating { display:none; color:#f2b84b; font-size:10px; letter-spacing:1px; white-space:nowrap; }
    #al-panel.al-done .al-rating { display:inline; }
    #al-panel .al-log { border-top:1px solid #29443f; background:#0d1819; }
    #al-panel .al-log li { display:flex; gap:7px; padding:5px 0; font-size:11px; color:#aac0ba; }
    #al-panel .al-sev { flex:none; width:8px; height:8px; margin-top:5px; border-radius:50%; }
    #al-panel .al-summary { width:100%; min-height:42px; padding:10px 16px; border-top:1px solid #29443f; background:#172728; white-space:normal; }
    #al-panel .al-ai-card { padding:8px 0; border-top:1px solid #29443f; }
    #al-panel .al-ai-card:first-of-type { border-top:0; }
    #al-panel .al-ai-heading { display:flex; justify-content:space-between; gap:8px; color:#e8f2ef; font-size:11px; font-weight:750; }
    #al-panel .al-ai-stars { color:#f2b84b; letter-spacing:1px; white-space:nowrap; }
    #al-panel .al-ai-comment { margin:3px 0 0; color:#aac0ba; font-size:11px; line-height:1.4; }
    #al-panel .al-report { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:7px; width:100%; padding:10px 14px; border-top:1px solid #29443f; }
    #al-panel .al-metric { min-width:0; padding:8px 5px; border:1px solid #29443f; border-radius:9px; background:#172728; text-align:center; }
    #al-panel .al-metric strong { display:block; color:#f4faf8; font-size:16px; }
    #al-panel .al-metric span { color:#91aaa4; font-size:10px; }
    @media (max-width:600px) { #al-panel { right:8px; bottom:8px; width:min(340px, calc(100vw - 16px)); max-height:68vh; } }
  `;

  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const tally = (errors, warns) => `${plural(errors, 'error', 'errores')}, ${plural(warns, 'aviso', 'avisos')}`;

  const SEV_COLOR = { error: '#dc2626', warn: '#d97706', ok: '#16a34a' };

  let layer, panel, rowsList, logList, totalsEl, phaseEl, progressBar, reportEl, currentAgents = [];

  function mount() {
    document.head.appendChild(style);

    layer = document.createElement('div');
    layer.id = 'al-layer';
    document.body.appendChild(layer);

    panel = document.createElement('div');
    panel.id = 'al-panel';

    const header = document.createElement('header');
    const kicker = document.createElement('div');
    kicker.className = 'al-kicker';
    kicker.textContent = 'Live audit · QA crew';
    const title = document.createElement('h2');
    title.textContent = 'Revisión de la página';
    const urlEl = document.createElement('div');
    urlEl.className = 'al-url';
    urlEl.textContent = location.href;
    totalsEl = document.createElement('div');
    totalsEl.className = 'al-totals';
    totalsEl.textContent = 'Preparando revisión...';
    const phase = document.createElement('div');
    phase.className = 'al-phase';
    const phaseDot = document.createElement('span');
    phaseDot.className = 'al-phase-dot';
    phaseEl = document.createElement('span');
    phaseEl.textContent = 'Preparando agentes';
    phase.append(phaseDot, phaseEl);
    const progress = document.createElement('div');
    progress.className = 'al-progress';
    progressBar = document.createElement('div');
    progressBar.className = 'al-progress-bar';
    progress.appendChild(progressBar);
    const toggle = document.createElement('button');
    toggle.textContent = 'Ocultar marcas';
    toggle.addEventListener('click', () => {
      const hidden = layer.classList.toggle('al-hide-marks');
      toggle.textContent = hidden ? 'Mostrar marcas' : 'Ocultar marcas';
    });
    header.append(kicker, title, urlEl, phase, progress, totalsEl, toggle);

    const teamHeading = document.createElement('div');
    teamHeading.className = 'al-list-heading';
    teamHeading.textContent = 'Equipo de agentes';
    rowsList = document.createElement('ul');
    const logHeading = document.createElement('div');
    logHeading.className = 'al-list-heading';
    logHeading.textContent = 'Actividad en vivo';
    logList = document.createElement('ul');
    logList.className = 'al-log';

    panel.append(header, teamHeading, rowsList, logHeading, logList);
    document.body.appendChild(panel);
  }

  function createAvatar(index, label, face) {
    const avatar = document.createElement('span');
    avatar.className = `al-avatar al-face-${index}`;
    avatar.title = label;
    avatar.setAttribute('aria-label', label);
    const faceArt = document.createElement('span');
    faceArt.className = 'al-face-art';
    faceArt.textContent = face;
    avatar.appendChild(faceArt);
    return avatar;
  }

  // -------------------------------------------------------------------------
  // Utilidades de DOM
  // -------------------------------------------------------------------------
  function visible(el) {
    if (el.closest('#al-layer, #al-panel')) return false;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  }

  const pick = (selector, max = 10) =>
    [...document.querySelectorAll(selector)].filter(visible).slice(0, max);

  function cssPath(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 4) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(`${part}#${CSS.escape(node.id)}`);
        break;
      }
      const siblings = node.parentElement
        ? [...node.parentElement.children].filter((c) => c.tagName === node.tagName)
        : [];
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(' > ');
  }

  function accessibleName(el) {
    const aria = el.getAttribute('aria-label');
    if (aria && aria.trim()) return aria.trim();
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const text = labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent || '')
        .join(' ')
        .trim();
      if (text) return text;
    }
    if (el.id) {
      const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (label && label.textContent.trim()) return label.textContent.trim();
    }
    const wrapper = el.closest('label');
    if (wrapper && wrapper.textContent.trim()) return wrapper.textContent.trim();
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
      return ['submit', 'button', 'reset'].includes(el.type) ? (el.value || '').trim() : '';
    }
    const text = (el.innerText || '').trim();
    if (text) return text;
    const img = el.querySelector('img[alt]');
    if (img && img.alt.trim()) return img.alt.trim();
    return (el.getAttribute('title') || '').trim();
  }

  // Escribe usando el setter nativo para que React/Vue detecten el cambio.
  function setValue(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  async function typeInto(el, text) {
    el.focus({ preventScroll: true });
    setValue(el, '');
    for (const ch of text) {
      setValue(el, el.value + ch);
      await sleep(55);
    }
  }

  // Varios agentes comparten una sola pantalla: el scroll se limita
  // para que la vista no salte de un lado a otro.
  let lastScroll = 0;
  async function ensureVisible(el) {
    const r = el.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight) return;
    if (Date.now() - lastScroll < 1500 / SPEED) return;
    lastScroll = Date.now();
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    await sleep(600);
  }

  function drawBox(el, color, severity) {
    const r = el.getBoundingClientRect();
    const box = document.createElement('div');
    box.className = `al-box${severity === 'ok' ? ' al-ok' : ''}`;
    box.style.setProperty('--c', severity === 'ok' ? color : SEV_COLOR[severity]);
    Object.assign(box.style, {
      left: `${r.left + scrollX - 3}px`,
      top: `${r.top + scrollY - 3}px`,
      width: `${r.width + 6}px`,
      height: `${r.height + 6}px`,
    });
    layer.appendChild(box);
  }

  function log(agent, finding) {
    const li = document.createElement('li');
    const sev = document.createElement('span');
    sev.className = 'al-sev';
    sev.style.background = SEV_COLOR[finding.severity];
    const text = document.createElement('span');
    text.textContent = `${agent.short}: ${finding.message}`;
    li.append(sev, text);
    logList.prepend(li);
    while (logList.children.length > 40) logList.lastChild.remove();
  }

  // -------------------------------------------------------------------------
  // Agente
  // -------------------------------------------------------------------------
  class Agent {
    constructor(def, index) {
      Object.assign(this, def);
      this.index = index;
      this.findings = [];
      this.startedAt = null;
      this.completedAt = null;

      this.dom = document.createElement('div');
      this.dom.className = 'al-agent';
      this.dom.style.background = def.color;
      this.dom.style.setProperty('--c', def.color);
      this.dom.appendChild(createAvatar(index, `${def.name} (${def.short})`, def.face));
      layer.appendChild(this.dom);

      this.bubble = document.createElement('div');
      this.bubble.className = 'al-bubble';
      this.bubble.style.setProperty('--c', def.color);
      layer.appendChild(this.bubble);

      const row = document.createElement('li');
      row.className = 'al-row';
      const dot = createAvatar(index, `${def.name} (${def.short})`, def.face);
      const name = document.createElement('span');
      name.className = 'al-name';
      name.textContent = def.name;
      this.row = row;
      this.statusEl = document.createElement('span');
      this.statusEl.className = 'al-status';
      this.statusEl.textContent = 'En espera';
      this.ratingEl = document.createElement('span');
      this.ratingEl.className = 'al-rating';
      row.append(dot, name, this.statusEl, this.ratingEl);
      rowsList.appendChild(row);

      this.goHome();
    }

    place(x, y) {
      this.x = x;
      this.y = y;
      this.dom.style.transform = `translate(${x}px, ${y}px)`;
    }

    goHome() {
      this.place(24 + this.index * (SIZE + 14) + scrollX, scrollY + innerHeight - SIZE - 24);
    }

    async goTo(el) {
      await ensureVisible(el);
      const r = el.getBoundingClientRect();
      const offset = (this.index - 2.5) * 5; // evita que dos agentes se tapen del todo
      this.place(
        r.left + scrollX + Math.min(r.width, 80) - SIZE / 2 + offset,
        r.top + scrollY - SIZE / 2 + offset
      );
      this.dom.classList.add('al-working');
      await sleep(750);
    }

    async goToPage() {
      // Hallazgos de página completa: cada agente tiene su propio carril vertical.
      this.place(scrollX + innerWidth * 0.45, scrollY + 40 + this.index * (SIZE + 14));
      this.dom.classList.add('al-working');
      await sleep(750);
    }

    say(message) {
      this.bubble.textContent = message;
      this.bubble.style.transform = `translate(${this.x + SIZE + 10}px, ${this.y + 4}px)`;
      this.bubble.classList.add('al-show');
      clearTimeout(this.bubbleTimer);
      this.bubbleTimer = setTimeout(() => this.bubble.classList.remove('al-show'), 1800 / SPEED);
    }

    record(el, severity, message) {
      const finding = { severity, message, selector: el ? cssPath(el) : 'página' };
      this.findings.push(finding);
      if (el) drawBox(el, this.color, severity);
      this.say(message);
      log(this, finding);
      this.setStatus(tally(this.count('error'), this.count('warn')));
    }

    async inspect(el, severity, message) {
      await this.goTo(el);
      this.record(el, severity, message);
      await sleep(severity === 'ok' ? 450 : 1100);
    }

    async inspectPage(severity, message) {
      await this.goToPage();
      this.record(null, severity, message);
      await sleep(severity === 'ok' ? 450 : 1100);
    }

    count(severity) {
      return this.findings.filter((f) => f.severity === severity).length;
    }

    setStatus(text) {
      this.statusEl.textContent = text;
      this.row.classList.toggle('al-active', text === 'Trabajando');
    }

    finish() {
      this.completedAt = new Date().toISOString();
      this.dom.classList.remove('al-working');
      this.dom.classList.add('al-fixed');
      this.bubble.classList.remove('al-show');
      this.place(24 + this.index * (SIZE + 14), innerHeight - SIZE - 24);
      this.setStatus(`Listo: ${tally(this.count('error'), this.count('warn'))}`);
    }
  }

  // -------------------------------------------------------------------------
  // Definición de los agentes. Cada uno tiene un rol, un color y una misión.
  // Para crear uno nuevo, copia un bloque y cambia la función run.
  // -------------------------------------------------------------------------
  const AGENTS = [
    {
      id: 'a11y',
      name: 'Accesibilidad',
      short: 'AC',
      color: '#2563eb',
      face: '👩🏻‍💻',
      async run(ag) {
        const lang = document.documentElement.getAttribute('lang');
        if (lang) await ag.inspectPage('ok', `Idioma declarado: ${lang}`);
        else await ag.inspectPage('warn', 'La página no declara idioma (<html lang>)');

        for (const img of pick('img', 8)) {
          if (!img.hasAttribute('alt')) await ag.inspect(img, 'error', 'Imagen sin texto alternativo (alt)');
          else await ag.inspect(img, 'ok', img.alt ? `alt: "${img.alt.slice(0, 40)}"` : 'Imagen decorativa (alt vacío)');
        }

        const fields = pick('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea', 8);
        for (const field of fields) {
          const name = accessibleName(field);
          if (name) await ag.inspect(field, 'ok', `Campo con etiqueta: "${name.slice(0, 40)}"`);
          else if (field.placeholder) await ag.inspect(field, 'warn', `Campo sin etiqueta, solo placeholder "${field.placeholder}"`);
          else await ag.inspect(field, 'error', 'Campo de formulario sin etiqueta accesible');
        }

        for (const btn of pick('button, [role=button], input[type=submit], input[type=button]', 6)) {
          const name = accessibleName(btn);
          if (name) await ag.inspect(btn, 'ok', `Botón con nombre: "${name.slice(0, 40)}"`);
          else await ag.inspect(btn, 'error', 'Botón sin nombre accesible');
        }

        const h1 = document.querySelectorAll('h1').length;
        if (h1 === 0) await ag.inspectPage('warn', 'No hay encabezado principal <h1>');
        else if (h1 > 1) await ag.inspectPage('warn', `Hay ${h1} encabezados <h1>; lo usual es uno`);
        else await ag.inspectPage('ok', 'Un solo encabezado <h1>');
      },
    },
    {
      id: 'security',
      name: 'Seguridad',
      short: 'SE',
      color: '#b91c1c',
      face: '🕵🏽',
      async run(ag, ctx) {
        const https = location.protocol === 'https:';
        if (https) await ag.inspectPage('ok', 'La página usa HTTPS');
        else await ag.inspectPage('error', 'La página no usa HTTPS');

        const h = ctx.headers || {};
        const csp = h['content-security-policy'] || '';
        const checks = [
          [csp, 'Content-Security-Policy'],
          [h['strict-transport-security'], 'Strict-Transport-Security (HSTS)'],
          [h['x-content-type-options'], 'X-Content-Type-Options'],
          [h['x-frame-options'] || csp.includes('frame-ancestors'), 'protección contra clickjacking'],
        ];
        for (const [present, label] of checks) {
          if (present) await ag.inspectPage('ok', `Cabecera presente: ${label}`);
          else await ag.inspectPage('warn', `Falta cabecera: ${label}`);
        }

        if (https) {
          const mixed = pick('img[src^="http:"], script[src^="http:"], iframe[src^="http:"]', 5);
          for (const el of mixed) await ag.inspect(el, 'error', 'Recurso cargado por HTTP en página HTTPS');
        }

        for (const a of pick('a[target=_blank]', 6)) {
          const rel = (a.getAttribute('rel') || '').toLowerCase();
          if (rel.includes('noopener') || rel.includes('noreferrer')) await ag.inspect(a, 'ok', 'Nueva pestaña con rel="noopener"');
          else await ag.inspect(a, 'warn', 'Abre nueva pestaña sin rel="noopener"');
        }

        for (const form of pick('form', 4)) {
          const action = form.getAttribute('action') || '';
          const hasPassword = form.querySelector('input[type=password]');
          if (action.startsWith('http:')) await ag.inspect(form, 'error', 'El formulario envía datos por HTTP');
          else if (hasPassword && !https) await ag.inspect(form, 'error', 'Pide contraseña en una página sin HTTPS');
          else await ag.inspect(form, 'ok', 'Envío del formulario por canal seguro');
        }

        for (const pwd of pick('input[type=password]', 3)) {
          if (pwd.getAttribute('autocomplete')) await ag.inspect(pwd, 'ok', `Contraseña con autocomplete="${pwd.getAttribute('autocomplete')}"`);
          else await ag.inspect(pwd, 'warn', 'Contraseña sin atributo autocomplete');
        }

        const external = [...document.querySelectorAll('script[src]')].filter(
          (s) => new URL(s.src, location.href).host !== location.host && !s.integrity
        );
        if (external.length) await ag.inspectPage('warn', `${external.length} scripts de otros dominios sin integridad (SRI)`);
        else await ag.inspectPage('ok', 'Sin scripts externos sin verificar');
      },
    },
    {
      id: 'links',
      name: 'Enlaces',
      short: 'EN',
      color: '#047857',
      face: '🧭',
      async run(ag) {
        const anchors = pick('a[href]', 12);
        if (!anchors.length) {
          await ag.inspectPage('warn', 'No hay enlaces visibles para revisar');
          return;
        }
        for (const a of anchors) {
          const raw = a.getAttribute('href').trim();
          if (!raw || raw === '#' || raw.toLowerCase().startsWith('javascript:')) {
            await ag.inspect(a, 'warn', 'Enlace sin destino real');
            continue;
          }
          if (/^(mailto|tel):/i.test(raw)) {
            await ag.inspect(a, 'ok', 'Enlace de contacto');
            continue;
          }
          await ag.goTo(a);
          ag.say('Comprobando...');
          const { status, error } = await window.agentCheckLink(a.href);
          if (status >= 400) ag.record(a, 'error', `Enlace roto (HTTP ${status})`);
          else if (status === 0) ag.record(a, 'warn', `Sin respuesta (${error})`);
          else ag.record(a, 'ok', `Responde HTTP ${status}`);
          await sleep(status >= 400 || status === 0 ? 1100 : 450);
        }
      },
    },
    {
      id: 'seo',
      name: 'SEO y contenido',
      short: 'SC',
      color: '#7e22ce',
      face: '🧑🏽‍🎨',
      async run(ag) {
        const title = document.title.trim();
        if (!title) await ag.inspectPage('error', 'La página no tiene <title>');
        else if (title.length < 10 || title.length > 65) await ag.inspectPage('warn', `Título de ${title.length} caracteres (ideal entre 10 y 65)`);
        else await ag.inspectPage('ok', `Título: "${title}"`);

        const desc = document.querySelector('meta[name="description"]')?.content?.trim();
        if (!desc) await ag.inspectPage('warn', 'Falta la meta description');
        else await ag.inspectPage('ok', `Meta description de ${desc.length} caracteres`);

        if (!document.querySelector('meta[name="viewport"]')) await ag.inspectPage('warn', 'Falta meta viewport (vista en móvil)');
        if (!document.querySelector('meta[property="og:title"]')) await ag.inspectPage('warn', 'Sin etiquetas Open Graph para compartir en redes');

        let previous = 0;
        for (const h of pick('h1, h2, h3, h4, h5, h6', 10)) {
          const level = Number(h.tagName[1]);
          const text = h.textContent.trim().slice(0, 35);
          if (previous && level > previous + 1) await ag.inspect(h, 'warn', `Salto de encabezado: h${previous} a h${level}`);
          else if (!text) await ag.inspect(h, 'warn', `Encabezado ${h.tagName} vacío`);
          else await ag.inspect(h, 'ok', `${h.tagName}: "${text}"`);
          previous = level;
        }
      },
    },
    {
      id: 'forms',
      name: 'Formularios',
      short: 'FO',
      color: '#c2410c',
      face: '🧑🏼‍💼',
      async run(ag) {
        const fields = pick(
          'input[type=text], input[type=email], input[type=password], input[type=search], input[type=tel], input:not([type]), textarea',
          6
        );
        if (!fields.length) {
          await ag.inspectPage('ok', 'No hay campos de texto en esta página');
          return;
        }
        for (const field of fields) {
          await ag.goTo(field);
          const original = field.value;
          const sample = field.type === 'email' ? 'no-es-un-email' : field.type === 'password' ? 'Agente123!' : 'probando agente';
          ag.say('Escribiendo...');
          await typeInto(field, sample);

          if (field.type === 'email') {
            if (field.checkValidity()) ag.record(field, 'warn', 'Acepta un email inválido');
            else ag.record(field, 'ok', 'Rechaza un email inválido');
          } else if (field.maxLength > 0) {
            ag.record(field, 'ok', `Acepta texto (máximo ${field.maxLength})`);
          } else {
            ag.record(field, 'ok', 'Acepta entrada de texto');
          }
          await sleep(500);
          setValue(field, original);
          field.blur();
        }
        for (const btn of pick('button[type=submit], input[type=submit], form button:not([type])', 3)) {
          await ag.inspect(btn, 'ok', 'Botón de envío detectado (no se envía)');
        }
      },
    },
    {
      id: 'perf',
      name: 'Rendimiento',
      short: 'RE',
      color: '#0e7490',
      face: '👨🏻‍🚀',
      async run(ag) {
        const nav = performance.getEntriesByType('navigation')[0];
        if (nav) {
          const load = Math.round(nav.loadEventEnd || nav.domContentLoadedEventEnd);
          if (load > 3000) await ag.inspectPage('warn', `Carga lenta: ${load} ms`);
          else await ag.inspectPage('ok', `Carga completa en ${load} ms`);
        }

        const resources = performance.getEntriesByType('resource');
        const kb = Math.round(resources.reduce((sum, r) => sum + (r.transferSize || 0), 0) / 1024);
        if (kb > 2048) await ag.inspectPage('warn', `${resources.length} recursos, ${kb} KB transferidos (pesado)`);
        else await ag.inspectPage('ok', `${resources.length} recursos, ${kb} KB transferidos`);

        for (const img of pick('img', 8)) {
          const belowFold = img.getBoundingClientRect().top + scrollY > innerHeight;
          if (img.naturalWidth > 400 && img.naturalWidth > img.clientWidth * 2) {
            await ag.inspect(img, 'warn', `Imagen sobredimensionada: ${img.naturalWidth}px para ${img.clientWidth}px`);
          } else if (belowFold && img.loading !== 'lazy') {
            await ag.inspect(img, 'warn', 'Imagen fuera de pantalla sin loading="lazy"');
          } else {
            await ag.inspect(img, 'ok', 'Tamaño de imagen adecuado');
          }
        }
      },
    },
  ];

  // -------------------------------------------------------------------------
  // API pública que usa Node
  // -------------------------------------------------------------------------
  async function run({ speed = 1, headers = {} } = {}) {
    SPEED = speed > 0 ? speed : 1;
    mount();
    const agents = AGENTS.map((def, i) => new Agent(def, i));
    currentAgents = agents;
    const startedAt = new Date();
    phaseEl.textContent = 'En curso';
    totalsEl.textContent = `0 de ${agents.length} agentes finalizados`;
    await sleep(800);

    // Todos arrancan casi a la vez: el pequeño desfase hace que se vean salir en fila.
    await Promise.all(
      agents.map(async (agent, i) => {
        await sleep(i * 350);
        agent.startedAt = new Date().toISOString();
        agent.setStatus('Trabajando');
        phaseEl.textContent = `En curso: ${agent.name}`;
        try {
          await agent.run(agent, { headers });
        } catch (error) {
          agent.record(null, 'warn', `El agente se detuvo: ${error.message}`);
        }
        agent.finish();
        const finished = agents.filter((item) => item.completedAt).length;
        progressBar.style.width = `${(finished / agents.length) * 100}%`;
        totalsEl.textContent = `${finished} de ${agents.length} agentes finalizados`;
      })
    );

    const completedAt = new Date();
    const report = {
      url: location.href,
      date: completedAt.toISOString(),
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - startedAt.getTime(),
      agents: agents.map((a) => ({
        id: a.id,
        name: a.name,
        face: a.face,
        startedAt: a.startedAt,
        completedAt: a.completedAt,
        durationMs: a.startedAt && a.completedAt ? Date.parse(a.completedAt) - Date.parse(a.startedAt) : null,
        findings: a.findings,
      })),
    };
    const all = report.agents.flatMap((a) => a.findings);
    const n = (sev) => all.filter((f) => f.severity === sev).length;
    report.summary = { errors: n('error'), warnings: n('warn'), passed: n('ok'), agents: agents.length };
    phaseEl.textContent = 'Revisión finalizada';
    panel.classList.add('al-done');
    totalsEl.textContent = `${tally(n('error'), n('warn'))}, ${plural(n('ok'), 'correcto', 'correctos')}`;
    reportEl = document.createElement('div');
    reportEl.className = 'al-report';
    for (const [label, value] of [['Errores', n('error')], ['Avisos', n('warn')], ['Correctos', n('ok')]]) {
      const metric = document.createElement('div');
      metric.className = 'al-metric';
      metric.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
      reportEl.appendChild(metric);
    }
    panel.insertBefore(reportEl, rowsList);
    panel.scrollTop = 0;
    return report;
  }

  function showSummary(text) {
    if (Array.isArray(text)) {
      for (const review of text) {
        const agent = currentAgents.find((item) => item.id === review.agentId);
        if (!agent) continue;
        agent.ratingEl.textContent = review.stars || `${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}`;
        agent.row.title = review.comment;
      }
    }
    panel.scrollTop = 0;
  }

  window.__agentLab = { run, showSummary };
})();
