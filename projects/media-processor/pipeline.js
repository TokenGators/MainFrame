import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: "/Users/operator/.openclaw/.env" });
// Prevent SDK from auto-picking GOOGLE_API_KEY and overriding our explicit key
delete process.env.GOOGLE_API_KEY;

// --- CONFIG ---
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const MEDIA_ROOT = process.env.MEDIA_DIR || `${process.env.HOME}/Media/media-processor`;
const VIDEO_DIR = `${MEDIA_ROOT}/videos`;
const OUTPUT_DIR = `${MEDIA_ROOT}/analysis`;
const COMBINED_OUTPUT = `${MEDIA_ROOT}/brand_lore_ready.json`;
// Model fallback chain — tries each in order if rate limited
// Best quality first, most quota last
const MODELS = [
  "gemini-2.5-flash",           // 20 RPD — best quality
  "gemini-3-flash-preview",     // 20 RPD — Gemini 3
  "gemini-3.1-flash-lite-preview", // 500 RPD — most quota
  "gemini-2.5-flash-lite",      // 20 RPD
  "gemini-2.0-flash",           // 0 quota on this key but try anyway
  "gemini-2.0-flash-lite",      // 0 quota on this key but try anyway
];
const SUPPORTED_TYPES = [".mp4", ".mov", ".avi", ".mkv", ".webm"];

const ANALYSIS_PROMPT = `
Analyze this brand video thoroughly and return a JSON object with the following fields:

{
  "transcript": "Full spoken transcript with timestamps in [MM:SS] format",
  "visual_summary": "Detailed description of what is shown on screen — people, setting, actions, b-roll, on-screen text or graphics",
  "tone_and_energy": "Describe the emotional tone, pacing, and energy of the video",
  "brand_signals": {
    "values": ["list of brand values expressed or implied"],
    "language_patterns": ["recurring phrases, words, or speech patterns"],
    "themes": ["narrative or conceptual themes present"]
  },
  "memorable_moments": [
    { "timestamp": "MM:SS", "description": "Why this moment is notable for brand storytelling" }
  ],
  "aesthetic_notes": {
    "color_palette": "Dominant colors and overall visual mood",
    "editing_style": "Pacing, cut style, transitions",
    "production_quality": "Raw/lo-fi vs polished, and what that communicates",
    "music_or_sound": "Any notable audio design, music mood, or sound choices"
  },
  "brand_lore_tags": ["keywords useful for cross-referencing this video in a brand story"]
}

Return ONLY valid JSON. No markdown, no explanation outside the JSON object.
`;

// --- HELPERS ---
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const getMimeType = (ext) => ({
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".webm": "video/webm",
}[ext] ?? "video/mp4");

async function waitForProcessing(genai, file) {
  let f = file;
  // Poll until state is no longer PROCESSING
  while (true) {
    const state = f.state ?? f.state?.name ?? "";
    if (state === "ACTIVE" || state === "active") break;
    if (state === "FAILED" || state === "failed") {
      throw new Error(`File processing failed: ${f.name}`);
    }
    console.log(`  ⏳ Processing upload (state: ${state})... waiting 5s`);
    await sleep(5000);
    f = await genai.files.get({ name: f.name });
  }
  return f;
}

async function analyzeVideo(genai, videoPath, filename) {
  console.log(`\n📹 Uploading: ${filename}`);
  const ext = path.extname(filename).toLowerCase();
  const mimeType = getMimeType(ext);

  const uploadedFile = await genai.files.upload({
    file: videoPath,
    config: { mimeType, displayName: filename },
  });

  const readyFile = await waitForProcessing(genai, uploadedFile);
  console.log(`  ✅ Upload ready. Running analysis...`);

  // Try each model in fallback chain
  let raw = null;
  let usedModel = null;
  for (const model of MODELS) {
    try {
      console.log(`  🤖 Trying model: ${model}`);
      const response = await genai.models.generateContent({
        model,
        contents: [
          { parts: [{ fileData: { mimeType, fileUri: readyFile.uri } }, { text: ANALYSIS_PROMPT }] }
        ],
      });
      raw = response.text;
      usedModel = model;
      console.log(`  ✅ Success with: ${model}`);
      break;
    } catch (err) {
      const is429 = err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED");
      const is404 = err.message?.includes("404") || err.message?.includes("NOT_FOUND");
      if (is429) {
        console.warn(`  ⚠️  Rate limited on ${model}, trying next...`);
        continue;
      }
      if (is404) {
        console.warn(`  ⚠️  Model not found: ${model}, trying next...`);
        continue;
      }
      throw err; // other error, bail out
    }
  }

  if (!raw) throw new Error("All models exhausted — hit rate limits on every fallback.");

  const clean = raw.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    console.warn(`  ⚠️  Could not parse JSON for ${filename}. Saving raw text.`);
    parsed = { raw_output: clean, parse_error: true };
  }
  parsed._model_used = usedModel;

  // Clean up uploaded file from Gemini storage
  try {
    await genai.files.delete(readyFile.name);
  } catch {
    // non-fatal
  }

  return parsed;
}

// --- MAIN ---
async function run() {
  if (!API_KEY) {
    console.error("❌ Missing GEMINI_API_KEY environment variable.");
    process.exit(1);
  }
  console.log(`🔑 Using key: ${API_KEY.slice(0, 8)}...`);

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Pass key explicitly to avoid SDK picking up GOOGLE_API_KEY from env
  const genai = new GoogleGenAI({ apiKey: API_KEY });

  const files = fs.readdirSync(VIDEO_DIR).filter((f) =>
    SUPPORTED_TYPES.includes(path.extname(f).toLowerCase())
  );

  if (files.length === 0) {
    console.log("No video files found in ./videos");
    process.exit(0);
  }

  console.log(`\n🎬 Found ${files.length} video(s). Starting analysis...\n`);

  const allResults = [];

  for (const filename of files) {
    const videoPath = path.join(VIDEO_DIR, filename);
    const outputPath = path.join(OUTPUT_DIR, `${path.basename(filename, path.extname(filename))}.json`);

    // Skip if already analyzed
    if (fs.existsSync(outputPath)) {
      console.log(`⏭️  Skipping ${filename} (already analyzed)`);
      const cached = JSON.parse(fs.readFileSync(outputPath, "utf8"));
      allResults.push({ filename, ...cached });
      continue;
    }

    try {
      const analysis = await analyzeVideo(genai, videoPath, filename);
      const output = { filename, analyzed_at: new Date().toISOString(), model_used: analysis._model_used, ...analysis };

      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
      console.log(`  💾 Saved: ${outputPath}`);
      allResults.push(output);

      // Brief pause between videos to avoid rate limits
      await sleep(2000);
    } catch (err) {
      console.error(`  ❌ Failed on ${filename}:`, err.message);
      allResults.push({ filename, error: err.message });
    }
  }

  // Write combined file for Claude synthesis
  const combined = {
    generated_at: new Date().toISOString(),
    total_videos: allResults.length,
    videos: allResults,
    synthesis_prompt: `
You are analyzing a collection of brand videos for a company. 
The following JSON contains detailed analysis of each video including transcripts, 
visual summaries, tone, brand signals, and aesthetic notes.

Your task:
1. Identify recurring brand values and themes across all videos
2. Extract the most powerful stories and anecdotes for brand lore
3. Define the brand voice and tone based on actual language patterns found
4. Flag the most memorable moments for the brand story document
5. Identify any evolution in tone, aesthetic, or messaging over time
6. Produce a Brand Voice & Tone Guide grounded in this evidence
7. Produce a Brand Lore Document covering origin, key moments, and characters

Ground every claim in specific video evidence. Reference filenames and timestamps.
    `.trim(),
  };

  fs.writeFileSync(COMBINED_OUTPUT, JSON.stringify(combined, null, 2));
  console.log(`\n✅ Done. Combined output saved to: ${COMBINED_OUTPUT}`);
  console.log(`📋 Feed brand_lore_ready.json into Claude for final synthesis.\n`);
}

run();
