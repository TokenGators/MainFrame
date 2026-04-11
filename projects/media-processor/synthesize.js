import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config({ path: "/Users/operator/.openclaw/.env" });

// --- CONFIG ---
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MEDIA_ROOT = process.env.MEDIA_DIR || `${process.env.HOME}/Media/media-processor`;
const INPUT_FILE = `${MEDIA_ROOT}/brand_lore_ready.json`;
const OUTPUT_FILE = `${MEDIA_ROOT}/brand_lore_synthesis.md`;
const MODEL = "claude-opus-4-5"; // or claude-sonnet-4-5 for faster/cheaper

// --- MAIN ---
async function run() {
  if (!API_KEY) {
    console.error("❌ Missing ANTHROPIC_API_KEY in .env");
    process.exit(1);
  }

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Input file not found: ${INPUT_FILE}`);
    console.error("   Run pipeline.js first to generate it.");
    process.exit(1);
  }

  console.log(`\n📖 Loading ${INPUT_FILE}...`);
  const data = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));

  console.log(`🎬 ${data.total_videos} video(s) to synthesize.`);
  console.log(`🤖 Sending to Claude (${MODEL})...\n`);

  const client = new Anthropic({ apiKey: API_KEY });

  const userMessage = `${data.synthesis_prompt}

Here is the video analysis data:

${JSON.stringify(data.videos, null, 2)}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  const output = response.content[0].text;

  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(`✅ Synthesis complete. Saved to: ${OUTPUT_FILE}`);
  console.log(`\n--- PREVIEW (first 500 chars) ---\n`);
  console.log(output.slice(0, 500) + "...\n");
}

run().catch((err) => {
  console.error("❌ Fatal error:", err.message);
  process.exit(1);
});
