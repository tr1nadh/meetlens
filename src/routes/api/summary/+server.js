import { json } from "@sveltejs/kit";
import fetch from "node-fetch";
import {
  VERTEX_API_KEY,
  GCP_PROJECT_ID
} from "$env/static/private";

const REGION = "us-central1";
const MODEL_ID = "gemini-2.0-flash-lite";

/* ---------------- POST: SUMMARY ---------------- */

export async function POST({ request }) {
  try {
    const { transcript, meetingType } = await request.json();

    if (!transcript || transcript.length < 10) {
      return json({ error: "Transcript too short" }, { status: 400 });
    }

    const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/${REGION}/publishers/google/models/${MODEL_ID}:generateContent`;

    const prompt = `
You are an AI that generates meeting summaries for a professional ${meetingType || "meeting"} analysis product.

STRICT RULES (must be followed):
- Output PLAIN TEXT only
- Do NOT use markdown
- Do NOT use bold, italics, headings, or lists
- Do NOT use bullet points or numbering
- Do NOT use symbols such as *, _, #, -, >, or backticks
- Do NOT add extra line breaks
- Write a single clear paragraph only

STYLE GUIDELINES:
- Use clear, simple, professional language
- Assume the reader is a busy non-technical stakeholder
- Avoid jargon and complex sentences
- Be concise and accurate

TASK:
Summarize the following ${meetingType || "meeting"} by capturing the main discussion points, decisions, and outcomes.

Transcript:
${transcript}

Before responding, double-check that the output follows all rules above. If not, rewrite it as plain text.
`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": VERTEX_API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024
        }
      })
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("--- VERTEX API ERROR ---");
      console.error(JSON.stringify(err, null, 2));
      throw new Error(err.error?.message || "Vertex AI request failed");
    }

    const data = await res.json();
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return json({ summary: summary?.trim() || "No summary generated" });

  } catch (err) {
    console.error("[CRITICAL ERROR]", err);
    return json({ error: err.message }, { status: 500 });
  }
}
