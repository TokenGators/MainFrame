'use strict';

const fs = require('fs');
const path = require('path');

const OLLAMA_BASE = process.env.OLLAMA_HOST || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.INGEST_MODEL || 'gemma4:31b';

/**
 * Raw Ollama chat call. Returns the assistant message string.
 */
async function chat(messages, { model = DEFAULT_MODEL, timeoutMs = 300_000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Ollama HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    return data.message?.content || '';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run visual analysis on a local image file.
 * Returns a plain-English description string.
 */
async function visualSummary(imagePath) {
  const ext = path.extname(imagePath).slice(1).toLowerCase();
  const mimeMap = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', gif: 'gif', webp: 'webp' };
  const mime = mimeMap[ext] || 'jpeg';

  let imageData;
  try {
    imageData = fs.readFileSync(imagePath).toString('base64');
  } catch (err) {
    throw new Error(`Cannot read image ${imagePath}: ${err.message}`);
  }

  const content = await chat(
    [
      {
        role: 'user',
        content:
          'Describe this image concisely in 2-4 sentences. Cover: subjects and objects present, setting or background, visual style (colors, mood, aesthetic), any text or logos visible. Be specific and factual.',
        images: [imageData],
      },
    ],
    { timeoutMs: 120_000 }
  );

  return content.trim();
}

/**
 * Generate controlled tags + open descriptors for a record.
 * taxonomy: { tier2: {tag: desc, ...}, tier3: {tag: desc, ...} }
 */
async function tagAsset(record, taxonomy) {
  const prompt = buildTagPrompt(record, taxonomy);
  const raw = await chat([{ role: 'user', content: prompt }], { timeoutMs: 300_000 });

  // LLMs sometimes wrap JSON in markdown fences — strip them
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON in tagging response: ${raw.slice(0, 300)}`);

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    throw new Error(`JSON parse failed: ${err.message}\nRaw: ${jsonMatch[0].slice(0, 300)}`);
  }

  const validControlled = new Set([
    ...Object.keys(taxonomy.tier2 || {}),
    ...Object.keys(taxonomy.tier3 || {}),
  ]);

  const tags = (parsed.tags || [])
    .filter(t => typeof t === 'string')
    .map(t => t.trim().toLowerCase())
    .filter(t => validControlled.has(t));

  const descriptors = (parsed.descriptors || [])
    .filter(t => typeof t === 'string')
    .map(t =>
      t
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
    )
    .filter(t => t.length > 1 && t.length <= 50)
    .slice(0, 12);

  return { tags, descriptors, reasoning: parsed.reasoning || '' };
}

function buildTagPrompt(record, taxonomy) {
  const tier2Block = Object.entries(taxonomy.tier2 || {})
    .map(([tag, desc]) => `  - \`${tag}\`: ${desc}`)
    .join('\n');
  const tier3Block = Object.entries(taxonomy.tier3 || {})
    .map(([tag, desc]) => `  - \`${tag}\`: ${desc}`)
    .join('\n');

  const lines = [
    `Type: ${record.type}`,
    record.text ? `Content: ${record.text.slice(0, 600)}` : null,
    record.visual_summary ? `Visual description: ${record.visual_summary}` : null,
    record.author_handle ? `Author: @${record.author_handle}` : null,
    record.name ? `Name: ${record.name}` : null,
    record.filename ? `File: ${record.filename}` : null,
    record.source_url ? `Source: ${record.source_url}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return `You are a media asset tagger for TokenGators, an NFT/web3 brand. Analyze this asset and assign tags.

CONTROLLED TAGS — Tier 2 (Topic/Product):
${tier2Block}

CONTROLLED TAGS — Tier 3 (Campaign/Season):
${tier3Block}

OPEN DESCRIPTORS — Tier 4 (free-form):
Generate descriptors covering mood, aesthetic, subjects, actions, and visual themes.
Examples: celebratory, neon-green, pixel-art, swamp-setting, running, crowd, dark-humor, portrait

ASSET:
${lines}

RULES:
- "tags": ONLY from Tier 2 and Tier 3 lists above (exact lowercase tag names, 0-6 tags)
- "descriptors": free-form, useful metadata (0-12 items, lowercase with hyphens)
- Do NOT use the asset's own type as a tag (e.g. don't tag "image" for an image asset)
- Only apply tags clearly relevant to the content
- Respond ONLY with valid JSON, no markdown

{"tags": ["tag1"], "descriptors": ["desc1", "desc2"], "reasoning": "brief explanation"}`;
}

module.exports = { chat, visualSummary, tagAsset };
