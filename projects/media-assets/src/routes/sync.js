const express = require('express');
const router  = express.Router();
const { spawn } = require('child_process');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '../..');

// ── In-memory sync state ──────────────────────────────────────────────────────

const state = {
  running:       false,
  lastStarted:   null,
  lastCompleted: null,
  lastDuration:  null,  // seconds
  exitCode:      null,
  log:           [],    // last run lines (capped)
};

const MAX_LOG_LINES = 500;

// ── GET /api/sync/status ──────────────────────────────────────────────────────

router.get('/status', (req, res) => {
  res.json(state);
});

// ── POST /api/sync ─────────────────────────────────────────────────────────────

router.post('/', (req, res) => {
  if (state.running) {
    return res.status(409).json({ error: 'Sync already in progress', startedAt: state.lastStarted });
  }

  state.running       = true;
  state.lastStarted   = new Date().toISOString();
  state.lastCompleted = null;
  state.lastDuration  = null;
  state.exitCode      = null;
  state.log           = [];

  res.json({ status: 'started', startedAt: state.lastStarted });

  const startMs = Date.now();

  // Ensure homebrew Python is first in PATH so web3 and other packages are found
  const PATH = ['/opt/homebrew/bin', '/usr/local/bin', process.env.PATH].filter(Boolean).join(':');

  const proc = spawn('bash', ['scripts/sync-pipeline.sh'], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, PATH },
  });

  const appendLine = (line) => {
    state.log.push(line);
    if (state.log.length > MAX_LOG_LINES) state.log.shift();
  };

  proc.stdout.on('data', (chunk) => {
    chunk.toString().split('\n').filter(l => l).forEach(appendLine);
  });

  proc.stderr.on('data', (chunk) => {
    chunk.toString().split('\n').filter(l => l).forEach(l => appendLine(`[stderr] ${l}`));
  });

  proc.on('close', (code) => {
    state.running       = false;
    state.lastCompleted = new Date().toISOString();
    state.lastDuration  = Math.round((Date.now() - startMs) / 1000);
    state.exitCode      = code;

    // Reload in-memory registry so UI picks up fresh data immediately
    try {
      const registry = require('../registry');
      registry.loadRegistry().catch(err => console.error('registry reload error:', err));
    } catch (e) {
      console.error('sync: could not reload registry:', e.message);
    }

    console.log(`[sync] pipeline finished in ${state.lastDuration}s (exit ${code})`);
  });

  proc.on('error', (err) => {
    state.running       = false;
    state.lastCompleted = new Date().toISOString();
    state.lastDuration  = Math.round((Date.now() - startMs) / 1000);
    state.exitCode      = -1;
    appendLine(`[error] ${err.message}`);
    console.error('[sync] spawn error:', err);
  });
});

module.exports = router;
