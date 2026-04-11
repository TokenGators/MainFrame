# Media Processor

Batch video analysis pipeline using Gemini. Produces per-video JSON analysis + a combined `brand_lore_ready.json` for Claude synthesis.

## Setup

```bash
npm install
export GEMINI_API_KEY=your_key_here
```

## Usage

1. Drop video files into `./videos/`
2. Run: `npm run run`
3. Per-video results → `./analysis/<filename>.json`
4. Combined output → `./brand_lore_ready.json`

## Notes

- Safe to re-run — skips already-processed videos
- Cleans up uploads from Gemini after each video
- Saves raw output even if JSON parsing fails
- Feed `brand_lore_ready.json` into Claude for brand lore synthesis

## Supported Formats

`.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`
