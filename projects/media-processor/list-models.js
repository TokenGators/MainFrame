import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config({ path: "/Users/operator/.openclaw/.env" });
delete process.env.GOOGLE_API_KEY;

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const resp = await genai.models.list();
for await (const model of resp) {
  console.log(JSON.stringify({ name: model.name, display: model.displayName, methods: model.supportedGenerationMethods }));
}
