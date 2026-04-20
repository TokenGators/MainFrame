'use strict';

const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 4000;
const SERVICES_FILE = path.join(__dirname, 'services.json');

// ─── Service registry ────────────────────────────────────────────────────────

function loadServices() {
  try {
    return JSON.parse(fs.readFileSync(SERVICES_FILE, 'utf8'));
  } catch (e) {
    console.error('[swampos] Failed to load services.json:', e.message);
    return [];
  }
}

// ─── Health checks ───────────────────────────────────────────────────────────

function tcpCheck(host, port, timeout) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    let settled = false;
    const settle = (val) => {
      if (settled) return;
      settled = true;
      sock.destroy();
      resolve(val);
    };
    sock.setTimeout(timeout);
    sock.on('connect', () => settle(true));
    sock.on('error', () => settle(false));
    sock.on('timeout', () => settle(false));
    sock.connect(port, host);
  });
}

function launchctlCheck(label) {
  return new Promise((resolve) => {
    exec(`launchctl list ${label}`, (err) => resolve(!err));
  });
}

async function getServiceStatus(svc) {
  const [running, loaded] = await Promise.all([
    tcpCheck('127.0.0.1', svc.port, 1000),
    launchctlCheck(svc.label),
  ]);
  return { ...svc, running, loaded };
}

async function getAllStatuses() {
  const services = loadServices();
  return Promise.all(services.map(getServiceStatus));
}

// ─── Log tailing ─────────────────────────────────────────────────────────────

function tailLog(logFile, lines) {
  return new Promise((resolve) => {
    if (!fs.existsSync(logFile)) {
      return resolve(['(no log file found)']);
    }
    exec(`tail -n ${lines} "${logFile}"`, (err, stdout) => {
      if (err) return resolve(['(error reading log)']);
      resolve(stdout.split('\n').filter((l) => l !== ''));
    });
  });
}

// ─── launchctl control ───────────────────────────────────────────────────────

function launchctlLoad(plist) {
  return new Promise((resolve) => {
    exec(`launchctl load -w "${plist}"`, (err, stdout, stderr) => {
      resolve({ ok: !err, output: err ? stderr : stdout });
    });
  });
}

function launchctlUnload(plist) {
  return new Promise((resolve) => {
    exec(`launchctl unload -w "${plist}"`, (err, stdout, stderr) => {
      resolve({ ok: !err, output: err ? stderr : stdout });
    });
  });
}

// ─── HTML dashboard ──────────────────────────────────────────────────────────

function dashboardHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SwampOS — MainFrame Control</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #28272a;
      --bg2: #1e1d20;
      --bg3: #16151a;
      --green: #33ff33;
      --green-dim: #1a8a1a;
      --red: #ff4444;
      --red-dim: #7a2020;
      --orange: #ff6b35;
      --blue: #627EEA;
      --yellow: #FFD641;
      --text: #c8c8c8;
      --text-dim: #666;
      --border: #3a393d;
      --radius: 4px;
      --font: 'SF Mono', 'Fira Code', 'Fira Mono', 'Consolas', monospace;
    }

    html, body {
      height: 100%;
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      font-size: 13px;
      line-height: 1.5;
    }

    body {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    /* ── Header ── */
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 24px;
      background: var(--bg3);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-logo {
      font-size: 20px;
      font-weight: 700;
      color: var(--green);
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 11px;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--green);
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(51,255,51,0.4); }
      50% { opacity: 0.6; box-shadow: 0 0 0 4px rgba(51,255,51,0); }
    }

    /* ── Main content ── */
    main {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
    }

    /* ── Section labels ── */
    .section-label {
      font-size: 10px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--text-dim);
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border);
    }

    /* ── Service grid ── */
    .service-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }

    .service-card {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
      position: relative;
      overflow: hidden;
    }

    .service-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--card-color, var(--green));
      opacity: 0.6;
    }

    .service-card:hover {
      border-color: var(--card-color, var(--green));
      background: #232226;
    }

    .service-card.active {
      border-color: var(--card-color, var(--green));
      background: #232226;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card-icon {
      font-size: 18px;
      line-height: 1;
    }

    .card-name {
      font-size: 14px;
      font-weight: 700;
      color: #e8e8e8;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .status-running .status-dot { background: var(--green); box-shadow: 0 0 4px var(--green); }
    .status-running .status-label { color: var(--green); }
    .status-offline .status-dot { background: var(--red-dim); }
    .status-offline .status-label { color: var(--text-dim); }

    .card-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .card-desc {
      font-size: 11px;
      color: var(--text-dim);
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-port {
      font-size: 10px;
      color: var(--text-dim);
      background: var(--bg3);
      padding: 1px 6px;
      border-radius: 2px;
      letter-spacing: 1px;
      flex-shrink: 0;
    }

    .card-log-preview {
      font-size: 10px;
      color: var(--text-dim);
      background: var(--bg3);
      padding: 6px 8px;
      border-radius: 2px;
      margin-bottom: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-height: 24px;
      font-style: italic;
    }

    .card-buttons {
      display: flex;
      gap: 8px;
    }

    .btn {
      font-family: var(--font);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 5px 12px;
      border-radius: var(--radius);
      border: 1px solid;
      cursor: pointer;
      transition: all 0.1s;
      line-height: 1.4;
    }

    .btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .btn-open {
      border-color: var(--text-dim);
      background: transparent;
      color: var(--text);
    }

    .btn-open:not(:disabled):hover {
      border-color: var(--text);
      background: rgba(200,200,200,0.08);
    }

    .btn-start {
      border-color: var(--green-dim);
      background: transparent;
      color: var(--green);
    }

    .btn-start:not(:disabled):hover {
      border-color: var(--green);
      background: rgba(51,255,51,0.08);
    }

    .btn-stop {
      border-color: var(--red-dim);
      background: transparent;
      color: var(--red);
    }

    .btn-stop:not(:disabled):hover {
      border-color: var(--red);
      background: rgba(255,68,68,0.08);
    }

    .btn-logs {
      border-color: var(--border);
      background: transparent;
      color: var(--text-dim);
      margin-left: auto;
    }

    .btn-logs:not(:disabled):hover {
      border-color: var(--text-dim);
      color: var(--text);
    }

    /* ── Log panel ── */
    .log-panel {
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      display: none;
    }

    .log-panel.visible {
      display: block;
    }

    .log-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background: var(--bg2);
      border-bottom: 1px solid var(--border);
    }

    .log-panel-title {
      font-size: 11px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--text-dim);
    }

    .log-panel-close {
      background: none;
      border: none;
      color: var(--text-dim);
      cursor: pointer;
      font-size: 14px;
      font-family: var(--font);
      padding: 0 4px;
      line-height: 1;
    }

    .log-panel-close:hover { color: var(--text); }

    .log-content {
      padding: 12px 16px;
      max-height: 320px;
      overflow-y: auto;
      font-size: 11px;
      line-height: 1.7;
      color: var(--green);
      white-space: pre-wrap;
      word-break: break-all;
    }

    .log-content::-webkit-scrollbar { width: 4px; }
    .log-content::-webkit-scrollbar-track { background: var(--bg3); }
    .log-content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

    .log-empty {
      color: var(--text-dim);
      font-style: italic;
    }

    /* ── Status bar ── */
    footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 24px;
      background: var(--bg3);
      border-top: 1px solid var(--border);
      font-size: 10px;
      color: var(--text-dim);
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }

    .footer-left { display: flex; align-items: center; gap: 16px; }
    .footer-hint { opacity: 0.5; }

    /* ── Loading spinner ── */
    .spinner {
      display: inline-block;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Toast notification ── */
    #toast {
      position: fixed;
      bottom: 48px;
      right: 24px;
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 8px 16px;
      font-size: 11px;
      color: var(--text);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
      z-index: 100;
      max-width: 320px;
    }

    #toast.show { opacity: 1; }
    #toast.ok { border-color: var(--green-dim); color: var(--green); }
    #toast.err { border-color: var(--red-dim); color: var(--red); }
  </style>
</head>
<body>

<header>
  <div class="header-left">
    <span class="header-logo">🐊 SwampOS</span>
  </div>
  <div class="header-right">
    <span>MAINFRAME CONTROL</span>
    <div class="pulse-dot"></div>
  </div>
</header>

<main>
  <div class="section-label">SERVICES</div>
  <div class="service-grid" id="serviceGrid">
    <div style="color:var(--text-dim);font-size:12px;padding:20px 0;">
      <span class="spinner">⟳</span> Loading services...
    </div>
  </div>

  <div class="section-label" id="logSectionLabel" style="display:none;">LOGS</div>
  <div class="log-panel" id="logPanel">
    <div class="log-panel-header">
      <span class="log-panel-title" id="logPanelTitle">—</span>
      <button class="log-panel-close" onclick="closeLogPanel()" title="Close">✕</button>
    </div>
    <div class="log-content" id="logContent"></div>
  </div>
</main>

<footer>
  <div class="footer-left">
    <span id="lastUpdated">—</span>
    <span id="pollStatus" style="color:var(--green-dim);">● LIVE</span>
  </div>
  <span class="footer-hint">CLICK CARD TO VIEW LOGS · AUTO-REFRESH 5s</span>
</footer>

<div id="toast"></div>

<script>
  let activeServiceId = null;
  let servicesData = [];
  let pollTimer = null;

  // ── Utilities ──────────────────────────────────────────────────────────────

  function showToast(msg, type = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'show ' + type;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = ''; }, 3000);
  }

  function fmtTime(d) {
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  function renderCard(svc) {
    const isRunning = svc.running;
    const isActive = activeServiceId === svc.id;
    const statusClass = isRunning ? 'status-running' : 'status-offline';
    const statusText = isRunning ? 'RUNNING' : 'OFFLINE';
    const preview = svc.lastLog ? escHtml(svc.lastLog.slice(-80)) : '<em>—</em>';

    return \`<div
      class="service-card\${isActive ? ' active' : ''}"
      id="card-\${svc.id}"
      style="--card-color: \${svc.color}"
      onclick="handleCardClick('\${svc.id}', event)"
      data-id="\${svc.id}"
    >
      <div class="card-header">
        <div class="card-title">
          <span class="card-icon">\${svc.icon}</span>
          <span class="card-name">\${svc.name}</span>
        </div>
        <div class="status-badge \${statusClass}">
          <div class="status-dot"></div>
          <span class="status-label">\${statusText}</span>
        </div>
      </div>
      <div class="card-meta">
        <span class="card-desc">\${svc.description}</span>
        <span class="card-port">:\${svc.port}</span>
      </div>
      <div class="card-log-preview">\${preview}</div>
      <div class="card-buttons">
        <button class="btn btn-open" onclick="openService(event, '\${svc.url}')" \${isRunning ? '' : 'disabled'}>OPEN</button>
        \${isRunning || svc.loaded
          ? \`<button class="btn btn-stop" onclick="stopService(event, '\${svc.id}')">STOP</button>\`
          : \`<button class="btn btn-start" onclick="startService(event, '\${svc.id}')">START</button>\`
        }
        <button class="btn btn-logs" onclick="handleCardClick('\${svc.id}', event)">LOGS</button>
      </div>
    </div>\`;
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function renderGrid(services) {
    const grid = document.getElementById('serviceGrid');
    if (!services || services.length === 0) {
      grid.innerHTML = '<div style="color:var(--text-dim)">No services configured.</div>';
      return;
    }
    grid.innerHTML = services.map(renderCard).join('');
  }

  // ── API calls ──────────────────────────────────────────────────────────────

  async function fetchServices() {
    const res = await fetch('/api/services');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  async function fetchLogs(id) {
    const res = await fetch(\`/api/services/\${id}/logs\`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  async function startService(evt, id) {
    evt && evt.stopPropagation();
    showToast('Starting ' + id + '…');
    try {
      const res = await fetch(\`/api/services/\${id}/start\`, { method: 'POST' });
      const data = await res.json();
      showToast(data.ok ? id + ' started' : 'Error: ' + data.output, data.ok ? 'ok' : 'err');
    } catch (e) {
      showToast('Error: ' + e.message, 'err');
    }
    await refresh();
  }

  async function stopService(evt, id) {
    evt && evt.stopPropagation();
    showToast('Stopping ' + id + '…');
    try {
      const res = await fetch(\`/api/services/\${id}/stop\`, { method: 'POST' });
      const data = await res.json();
      showToast(data.ok ? id + ' stopped' : 'Error: ' + data.output, data.ok ? 'ok' : 'err');
    } catch (e) {
      showToast('Error: ' + e.message, 'err');
    }
    await refresh();
  }

  function openService(evt, url) {
    evt && evt.stopPropagation();
    // Replace localhost with the hostname this dashboard was reached on,
    // so "Open" links work correctly when accessed from another machine on the LAN.
    const lanUrl = url.replace('localhost', window.location.hostname);
    window.open(lanUrl, '_blank');
  }

  // ── Log panel ──────────────────────────────────────────────────────────────

  async function handleCardClick(id, evt) {
    evt && evt.stopPropagation();
    if (activeServiceId === id) {
      closeLogPanel();
      return;
    }
    activeServiceId = id;
    // update active card highlight
    document.querySelectorAll('.service-card').forEach(c => {
      c.classList.toggle('active', c.dataset.id === id);
    });
    const svc = servicesData.find(s => s.id === id);
    const title = svc ? svc.icon + ' ' + svc.name + ' — LOGS' : id + ' — LOGS';
    document.getElementById('logPanelTitle').textContent = title;
    document.getElementById('logContent').innerHTML = '<span class="spinner">⟳</span> Loading…';
    document.getElementById('logPanel').classList.add('visible');
    document.getElementById('logSectionLabel').style.display = '';
    await loadLogs(id);
  }

  async function loadLogs(id) {
    try {
      const data = await fetchLogs(id);
      const content = document.getElementById('logContent');
      if (!data.lines || data.lines.length === 0) {
        content.innerHTML = '<span class="log-empty">(no log entries)</span>';
      } else {
        content.textContent = data.lines.join('\\n');
        content.scrollTop = content.scrollHeight;
      }
    } catch (e) {
      document.getElementById('logContent').innerHTML = '<span class="log-empty">Error loading logs: ' + escHtml(e.message) + '</span>';
    }
  }

  function closeLogPanel() {
    activeServiceId = null;
    document.getElementById('logPanel').classList.remove('visible');
    document.getElementById('logSectionLabel').style.display = 'none';
    document.querySelectorAll('.service-card').forEach(c => c.classList.remove('active'));
  }

  // ── Polling ────────────────────────────────────────────────────────────────

  async function refresh() {
    try {
      const services = await fetchServices();
      servicesData = services;
      // enrich lastLog from log data if active panel open
      renderGrid(services);
      document.getElementById('lastUpdated').textContent = 'UPDATED ' + fmtTime(new Date());
      // if log panel is open, refresh it
      if (activeServiceId) {
        await loadLogs(activeServiceId);
      }
    } catch (e) {
      document.getElementById('pollStatus').textContent = '● ERROR';
      document.getElementById('pollStatus').style.color = 'var(--red)';
      console.error('Refresh error:', e);
    }
  }

  function startPolling() {
    refresh();
    pollTimer = setInterval(refresh, 5000);
  }

  // ── Boot ───────────────────────────────────────────────────────────────────

  startPolling();
</script>
</body>
</html>`;
}

// ─── Router ───────────────────────────────────────────────────────────────────

function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function sendHTML(res, html) {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
  });
  res.end(html);
}

async function router(req, res) {
  const url = req.url.split('?')[0];
  const method = req.method.toUpperCase();

  // GET /
  if (url === '/' && method === 'GET') {
    return sendHTML(res, dashboardHTML());
  }

  // GET /api/services
  if (url === '/api/services' && method === 'GET') {
    try {
      const services = await getAllStatuses();
      // Attach last log line for card preview
      const enriched = await Promise.all(
        services.map(async (svc) => {
          try {
            const lines = await tailLog(svc.logFile, 1);
            return { ...svc, lastLog: lines[0] || '' };
          } catch {
            return { ...svc, lastLog: '' };
          }
        })
      );
      return sendJSON(res, 200, enriched);
    } catch (e) {
      return sendJSON(res, 500, { error: e.message });
    }
  }

  // POST /api/services/:id/start
  const startMatch = url.match(/^\/api\/services\/([^/]+)\/start$/);
  if (startMatch && method === 'POST') {
    const id = startMatch[1];
    const services = loadServices();
    const svc = services.find((s) => s.id === id);
    if (!svc) return sendJSON(res, 404, { error: 'Service not found' });
    const result = await launchctlLoad(svc.plist);
    return sendJSON(res, result.ok ? 200 : 500, result);
  }

  // POST /api/services/:id/stop
  const stopMatch = url.match(/^\/api\/services\/([^/]+)\/stop$/);
  if (stopMatch && method === 'POST') {
    const id = stopMatch[1];
    const services = loadServices();
    const svc = services.find((s) => s.id === id);
    if (!svc) return sendJSON(res, 404, { error: 'Service not found' });
    const result = await launchctlUnload(svc.plist);
    return sendJSON(res, result.ok ? 200 : 500, result);
  }

  // GET /api/services/:id/logs
  const logsMatch = url.match(/^\/api\/services\/([^/]+)\/logs$/);
  if (logsMatch && method === 'GET') {
    const id = logsMatch[1];
    const services = loadServices();
    const svc = services.find((s) => s.id === id);
    if (!svc) return sendJSON(res, 404, { error: 'Service not found' });
    const lines = await tailLog(svc.logFile, 30);
    return sendJSON(res, 200, { id, lines });
  }

  // 404
  return sendJSON(res, 404, { error: 'Not found' });
}

// ─── Server ───────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  router(req, res).catch((err) => {
    console.error('[swampos] Unhandled error:', err);
    sendJSON(res, 500, { error: 'Internal server error' });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[swampos] Dashboard running at http://localhost:${PORT}`);
  console.log(`[swampos] Services config: ${SERVICES_FILE}`);
});

server.on('error', (err) => {
  console.error('[swampos] Server error:', err);
  process.exit(1);
});
