import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

const PORT = process.env.PORT || 3000;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const MODEL_ID = process.env.MODEL_ID || "gemini-2.0-flash";

if (!GOOGLE_API_KEY) {
  console.error("Missing GOOGLE_API_KEY environment variable.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

function toGeminiContents(messages = []) {
  return messages.map(m => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content ?? "" }],
  }));
}

app.post("/api/chat", async (req, res) => {
  try {
    const { messages = [], system } = req.body || {};
    const model = genAI.getGenerativeModel({ model: MODEL_ID, systemInstruction: system || undefined });
    const contents = toGeminiContents(messages);
    const result = await model.generateContent({ contents });
    const text = result.response.text();
    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

app.post("/api/chat/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  try {
    const { messages = [], system } = req.body || {};
    const model = genAI.getGenerativeModel({ model: MODEL_ID, systemInstruction: system || undefined });
    const contents = toGeminiContents(messages);

    const result = await model.generateContentStream({ contents });
    for await (const chunk of result.stream) {
      const delta = chunk.text();
      if (delta) {
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error(err);
    res.write(`data: ${JSON.stringify({ error: err.message || "Server error" })}\n\n`);
    res.end();
  }
});

app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
