import 'dotenv/config';
import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.argv[2];
if (!url) {
  console.error('Uso: npm start -- https://www.saucedemo.com');
  process.exit(1);
}
const speed = Number(process.env.SPEED || 1);
const asBoolean = (value, fallback = false) =>
  value == null ? fallback : value.trim().toLowerCase() === 'true';
const headless = asBoolean(process.env.HEADLESS);
const keepOpen = asBoolean(process.env.KEEP_OPEN);
const startedAt = new Date();

// ---------------------------------------------------------------------------
// Herramientas que Node le presta a los agentes del navegador.
// Es la misma idea de MCP: el agente no sabe hacer peticiones fuera de la
// página (CORS lo bloquea), así que pide al "host" que lo haga por él.
// ---------------------------------------------------------------------------
async function fetchWithTimeout(target, options = {}, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(target, { ...options, redirect: 'follow', signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function checkLink(target) {
  try {
    let res = await fetchWithTimeout(target, { method: 'HEAD' });
    if (res.status === 405 || res.status === 403) {
      res = await fetchWithTimeout(target, { method: 'GET' });
    }
    return { status: res.status };
  } catch (error) {
    return { status: 0, error: error.name === 'AbortError' ? 'tiempo agotado' : error.message };
  }
}

// Resumen opcional con Gemini: solo se ejecuta si existe GEMINI_API_KEY.
async function summarizeWithGemini(report) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const agents = report.agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    face: agent.face,
    findings: agent.findings.map(({ severity, message, selector }) => ({ severity, message, selector })),
  }));

  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const prompt =
    `Eres una persona líder de QA revisando ${report.url}.\n` +
    'Analiza los resultados de cada agente y devuelve SOLO un JSON válido, sin markdown, ' +
    'con este formato: [{"agentId":"a11y","rating":4,"comment":"Comentario humano breve",' +
    '"priorities":["Acción concreta"]}].\n' +
    'Incluye exactamente un objeto por agente. rating debe ser un entero de 1 a 5 y reflejar ' +
    'la calidad de la página en ese aspecto: 5 significa sin problemas relevantes. comment debe ' +
    'sonar natural, específico y útil. priorities debe contener como máximo 3 acciones y puede ser [].\n\n' +
    JSON.stringify(agents);

  try {
    let res;
    let data;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 4096, responseMimeType: 'application/json' },
        }),
      });
      data = await res.json();
      if (![429, 500, 503].includes(res.status) || attempt === 2) break;
      console.warn(`Gemini HTTP ${res.status}; reintentando (${attempt + 1}/2)...`);
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
    if (!res.ok) {
      console.warn(`Gemini respondió HTTP ${res.status}: ${data?.error?.message || 'sin detalle'}`);
      return null;
    }
    const text = (data.candidates?.[0]?.content?.parts || [])
      .filter((p) => p.text && !p.thought)
      .map((p) => p.text)
      .join('\n')
      .trim();
    if (!text) return null;
    const jsonText = text.match(/\[[\s\S]*\]/)?.[0] || text;
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) return null;
    const review = report.agents.map((agent) => {
      const item = parsed.find((candidate) => candidate.agentId === agent.id) || {};
      const rating = Math.max(1, Math.min(5, Math.round(Number(item.rating) || 1)));
      return {
        agentId: agent.id,
        agentName: agent.name,
        face: agent.face,
        rating,
        stars: `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`,
        comment: String(item.comment || 'Sin comentario disponible.'),
        priorities: Array.isArray(item.priorities) ? item.priorities.slice(0, 3).map(String) : [],
      };
    });
    return review;
  } catch (error) {
    console.warn(`No se pudo obtener la revisión estructurada de Gemini: ${error.message}`);
    return null;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderHtmlReport(report) {
  const { errors, warnings, passed } = report.summary;
  const tabs = report.agents
    .map((agent, index) => {
      const issues = agent.findings.filter((finding) => finding.severity !== 'ok').length;
      return `<button class="agent-tab${index === 0 ? ' active' : ''}" data-agent-tab="${escapeHtml(agent.id)}">${escapeHtml(agent.name)} <b>${issues}</b></button>`;
    })
    .join('');
  const panes = report.agents
    .map(
      (agent, index) => `<div class="agent-pane${index === 0 ? ' active' : ''}" data-agent-pane="${escapeHtml(agent.id)}">
        <table><thead><tr><th>Resultado</th><th>Detalle</th><th>Selector</th></tr></thead><tbody>${agent.findings
          .map(
            (finding) => `<tr><td><span class="severity ${finding.severity}">${escapeHtml(finding.severity)}</span></td><td>${escapeHtml(finding.message)}</td><td><code>${escapeHtml(finding.selector)}</code></td></tr>`
          )
          .join('')}</tbody></table>
      </div>`
    )
    .join('');
  const agentCards = report.agents
    .map((agent) => {
      const errorsForAgent = agent.findings.filter((finding) => finding.severity === 'error').length;
      const warningsForAgent = agent.findings.filter((finding) => finding.severity === 'warn').length;
      const passedForAgent = agent.findings.filter((finding) => finding.severity === 'ok').length;
      return `<article class="agent-card">
        <div><h3>${escapeHtml(agent.face || '')} ${escapeHtml(agent.name)}</h3><p>${agent.durationMs ?? '-'} ms de ejecución</p></div>
        <strong>${errorsForAgent} errores · ${warningsForAgent} avisos · ${passedForAgent} correctos</strong>
      </article>`;
    })
    .join('');
  const aiSection = report.aiReview
    ? `<section><div class="section-heading"><span>Lectura del equipo</span><small>Gemini</small></div><div class="ai-grid">${report.aiReview
      .map(
        (review) => `<article class="ai-card"><div class="ai-card-heading"><strong><span class="agent-face">${escapeHtml(review.face || '')}</span> ${escapeHtml(review.agentName)}</strong><span class="stars" aria-label="${review.rating} de 5 estrellas">${escapeHtml(review.stars)}</span></div><p>${escapeHtml(review.comment)}</p>${review.priorities.length ? `<ul>${review.priorities.map((priority) => `<li>${escapeHtml(priority)}</li>`).join('')}</ul>` : ''}</article>`
      )
      .join('')}</div></section>`
    : `<section><div class="section-heading"><span>Lectura del equipo</span><small>Modo local</small></div><p class="muted">Sin IA: los hallazgos están agrupados por agente en pestañas para facilitar la revisión.</p></section>`;
  const footer = `<footer class="report-footer">
    <div class="footer-brand"><span class="footer-mark">AL</span><div><strong>Agent Lab</strong><span>Auditoría QA finalizada · by edudevcol</span></div></div>
    <div class="footer-meta"><div><small>Duración</small><strong>${(report.durationMs / 1000).toFixed(1)} s</strong></div><div><small>Equipo</small><strong>${report.summary.agents} agentes</strong></div><div><small>Modo</small><strong>${report.aiReview ? 'Gemini + reglas' : 'Reglas locales'}</strong></div></div>
    <div class="footer-dates"><span>Inicio <b>${escapeHtml(report.startedAt)}</b></span><span>Fin <b>${escapeHtml(report.completedAt)}</b></span></div>
  </footer>`;

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reporte QA · ${escapeHtml(new URL(report.url).hostname)}</title>
<style>
  :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #17202b; background: #eef4f3; }
  * { box-sizing: border-box; } body { margin: 0; } main { max-width: 1120px; margin: 0 auto; padding: 48px 24px; }
  header { color: white; background: #112d2a; padding: 32px; border-radius: 18px; box-shadow: 0 18px 45px #183b3522; }
  header p { color: #b5d4cb; margin: 8px 0 0; word-break: break-all; } h1 { margin: 0; font-size: 30px; }
  .status { display: inline-flex; gap: 8px; align-items: center; margin-top: 22px; padding: 7px 11px; border-radius: 99px; background: #1d5a4f; font-weight: 700; }
  .status i { width: 8px; height: 8px; border-radius: 50%; background: #56e39f; }
  .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0 30px; }
  .metric, section, .agent-card { background: white; border: 1px solid #dce7e3; border-radius: 12px; box-shadow: 0 5px 18px #183b350b; }
  .metric { padding: 18px; } .metric strong { display: block; font-size: 26px; } .metric span { color: #60736e; font-size: 13px; }
  section { padding: 22px; margin-top: 18px; } .section-heading { display: flex; justify-content: space-between; align-items: baseline; font-weight: 800; font-size: 18px; }
  .section-heading small { color: #637873; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; } .muted { color: #637873; }
  .agent-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 14px; } .agent-card { padding: 15px; display: flex; justify-content: space-between; gap: 12px; }
  .agent-card h3 { margin: 0; font-size: 15px; } .agent-card p, .agent-card strong { margin: 4px 0 0; color: #637873; font-size: 12px; } .agent-card strong { text-align: right; }
  .ai-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 14px; } .ai-card { padding: 15px; border: 1px solid #dce7e3; border-radius: 10px; background: #f8fbfa; } .ai-card-heading { display:flex; justify-content:space-between; gap:10px; } .ai-card p { color:#536862; line-height:1.5; } .ai-card ul { margin:8px 0 0; padding-left:18px; color:#536862; font-size:13px; } .stars { color:#d28a16; letter-spacing:2px; white-space:nowrap; }
  .agent-tabs { display:flex; gap:7px; overflow:auto; margin-top:16px; padding-bottom:2px; } .agent-tab { flex:none; padding:8px 11px; border:1px solid #dce7e3; border-radius:8px; background:#f5f9f7; color:#536862; cursor:pointer; font:700 12px system-ui; } .agent-tab b { display:inline-grid; place-items:center; min-width:18px; height:18px; margin-left:4px; border-radius:50%; background:#e4eeea; font-size:10px; } .agent-tab.active { border-color:#1d5a4f; background:#1d5a4f; color:white; } .agent-pane { display:none; } .agent-pane.active { display:block; }
  table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; } th, td { text-align: left; padding: 11px 8px; border-top: 1px solid #e2ebe8; vertical-align: top; } th { color: #637873; font-size: 11px; text-transform: uppercase; }
  .severity { display: inline-block; min-width: 58px; padding: 3px 7px; border-radius: 99px; text-align: center; font-size: 11px; font-weight: 800; text-transform: uppercase; } .severity.error { color: #a61b1b; background: #fee2e2; } .severity.warn { color: #975a05; background: #fef3c7; } .severity.ok { color: #146c43; background: #dcfce7; }
  code { color: #536862; word-break: break-all; } .ai { white-space: pre-wrap; line-height: 1.6; }
  .report-footer { margin-top: 18px; padding: 24px; border-radius: 14px; color: #e8f2ef; background: #112d2a; box-shadow: 0 12px 28px #183b3518; }
  .footer-brand { display:flex; align-items:center; gap:11px; } .footer-mark { display:grid; place-items:center; width:34px; height:34px; border:1px solid #65d9b2; border-radius:10px; color:#65d9b2; font-size:11px; font-weight:900; letter-spacing:.04em; }
  .footer-brand strong, .footer-brand span { display:block; } .footer-brand strong { font-size:15px; } .footer-brand div span { margin-top:2px; color:#9dbab2; font-size:11px; }
  .footer-meta { display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin-top:21px; padding-top:17px; border-top:1px solid #31514b; } .footer-meta small { display:block; color:#83a69d; font-size:10px; letter-spacing:.1em; text-transform:uppercase; } .footer-meta strong { display:block; margin-top:4px; color:#f4faf8; font-size:14px; }
  .footer-dates { display:flex; flex-wrap:wrap; gap:18px; margin-top:18px; color:#83a69d; font-size:10px; } .footer-dates b { margin-left:4px; color:#c8d9d4; font-weight:500; }
  @media (max-width: 700px) { main { padding: 24px 12px; } .metrics, .agent-grid, .ai-grid { grid-template-columns: repeat(2, 1fr); } .agent-card { display: block; } .agent-card strong { display: block; text-align: left; } table { display: block; overflow-x: auto; white-space: nowrap; } .footer-meta { grid-template-columns:1fr; gap:12px; } .footer-dates { display:grid; gap:7px; } }
</style></head><body><main>
<header><h1>Reporte de auditoría QA</h1><p>${escapeHtml(report.url)}</p><div class="status"><i></i> Revisión completada</div></header>
<div class="metrics"><div class="metric"><strong>${errors}</strong><span>Errores</span></div><div class="metric"><strong>${warnings}</strong><span>Avisos</span></div><div class="metric"><strong>${passed}</strong><span>Correctos</span></div><div class="metric"><strong>${(report.durationMs / 1000).toFixed(1)} s</strong><span>Duración total</span></div></div>
<section><div class="section-heading"><span>Agentes ejecutados</span><small>${report.summary.agents} en paralelo</small></div><div class="agent-grid">${agentCards}</div></section>
${aiSection}
<section><div class="section-heading"><span>Hallazgos detallados</span><small>${errors + warnings + passed} comprobaciones</small></div><div class="agent-tabs" role="tablist">${tabs}</div>${panes}</section>
${footer}
</main><script>document.querySelectorAll('[data-agent-tab]').forEach((tab) => tab.addEventListener('click', () => { document.querySelectorAll('[data-agent-tab], [data-agent-pane]').forEach((item) => item.classList.remove('active')); tab.classList.add('active'); document.querySelector('[data-agent-pane="' + tab.dataset.agentTab + '"]').classList.add('active'); }));</script></body></html>`;
}

function openReport(file) {
  const commands = {
    win32: ['explorer.exe', [file]],
    darwin: ['open', [file]],
    linux: ['xdg-open', [file]],
  };
  const [command, args] = commands[process.platform] || commands.linux;
  spawn(command, args, { detached: true, stdio: 'ignore' }).unref();
}

function waitForBrowserClose(browser, page) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    browser.once('disconnected', finish);
    page.once('close', finish);
    if (!browser.isConnected()) finish();
  });
}

// ---------------------------------------------------------------------------
// Ejecución
// ---------------------------------------------------------------------------
const browser = await chromium.launch({
  headless,
  args: headless ? [] : ['--start-maximized'],
});
const context = await browser.newContext({
  bypassCSP: true, // permite inyectar los agentes aunque la página tenga CSP estricta
  viewport: null,
});
const page = await context.newPage();

await page.exposeFunction('agentCheckLink', checkLink);

console.log(`Abriendo ${url} ...`);
console.log(`Modo: ${headless ? 'headless' : 'ventana visible'} · mantener abierta: ${keepOpen ? 'sí' : 'no'}`);
console.log(`Gemini: ${process.env.GEMINI_API_KEY ? 'clave detectada' : 'sin clave, revisión local'}`);
const response = await page.goto(url, { waitUntil: 'load' });
const headers = response ? response.headers() : {};

const browserCode = await readFile(path.join(__dirname, 'browser', 'agent-lab.js'), 'utf8');
await page.addScriptTag({ content: browserCode });

console.log('Agentes trabajando...');
const report = await page.evaluate((opts) => window.__agentLab.run(opts), { speed, headers });

const totals = { error: 0, warn: 0, ok: 0 };
for (const agent of report.agents) {
  for (const f of agent.findings) totals[f.severity]++;
  const errors = agent.findings.filter((f) => f.severity === 'error').length;
  const warns = agent.findings.filter((f) => f.severity === 'warn').length;
  console.log(`  ${agent.name.padEnd(16)} ${errors} errores, ${warns} avisos`);
}
console.log(`Total: ${totals.error} errores, ${totals.warn} avisos, ${totals.ok} correctos`);
console.log(`Duración total: ${(report.durationMs / 1000).toFixed(1)} s`);

report.startedAt = startedAt.toISOString();
report.completedAt = new Date().toISOString();
report.durationMs = Date.parse(report.completedAt) - startedAt.getTime();
report.summary = {
  errors: totals.error,
  warnings: totals.warn,
  passed: totals.ok,
  agents: report.agents.length,
};

const aiReview = await summarizeWithGemini(report);
if (aiReview) {
  report.aiReview = aiReview;
  console.log(`\nGemini revisó ${aiReview.length} agentes y añadió comentarios con calificación.`);
  await page.evaluate((review) => window.__agentLab.showSummary(review), aiReview);
}

const reportsDir = path.join(__dirname, '..', 'reports');
await mkdir(reportsDir, { recursive: true });
const host = new URL(url).hostname.replace(/[^a-z0-9.-]/gi, '_') || 'local';
const file = path.join(reportsDir, `${host}-${Date.now()}.json`);
await writeFile(file, JSON.stringify(report, null, 2));
console.log(`\nReporte guardado en ${path.relative(process.cwd(), file)}`);
const htmlFile = file.replace(/\.json$/, '.html');
await writeFile(htmlFile, renderHtmlReport(report));
console.log(`Reporte HTML guardado en ${path.relative(process.cwd(), htmlFile)}`);
openReport(htmlFile);
console.log('Abriendo el reporte HTML en el navegador predeterminado.');

if (headless || !keepOpen) {
  console.log('Auditoría terminada; cerrando el navegador.');
  await browser.close();
} else {
  console.log('Auditoría terminada. KEEP_OPEN=1 mantiene el navegador abierto; ciérralo para terminar.');
  await waitForBrowserClose(browser, page);
  if (browser.isConnected()) await browser.close();
  console.log('Navegador cerrado; proceso terminado.');
}
