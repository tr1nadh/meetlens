import { json } from "@sveltejs/kit";
import fetch from "node-fetch";
import {
  env
} from "$env/dynamic/private";

const REGION = "us-central1";
const MODEL_ID = "gemini-2.0-flash-lite";

export async function POST({ request }) {
  try {
    const { transcript, meetingType } = await request.json();

    if (!transcript || transcript.length < 10) {
      return json({ error: "Transcript too short" }, { status: 400 });
    }

    // ✅ CLEANUP FUNCTIONALITY: Normalization
    // Essential for summaries to ensure the AI connects ideas across 
    // different speakers without the distraction of broken lines.
    const normalizedTranscript = transcript
      .replace(/\r?\n|\r/g, ' ') 
      .replace(/\s+/g, ' ')      
      .replace(/([A-Z][a-z]+ \d?:|[A-Z]{2,}:)/g, '\n$1') 
      .trim();

    const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${env.GCP_PROJECT_ID}/locations/${REGION}/publishers/google/models/${MODEL_ID}:generateContent`;

    const systemInstruction = `You are a robotic, deterministic scribe. 
      TASK: Convert transcripts into exactly one plain-text paragraph.
      STRICT UI RULES:
      - NO markdown (*, #, _, -).
      - NO bullet points or numbering.
      - NO line breaks.
      STYLE: Professional executive summary with objective sentiment adverbs.`;

    const userPrompt = `
      Meeting Type: ${meetingType || "Professional"}
      Transcript: ${normalizedTranscript}
      
      Generate a single paragraph summary. Focus on facts and outcomes.
    `;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.VERTEX_API_KEY
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.0,      // Absolute zero for greedy decoding
          topP: 0.0000001,      // Tightest possible probability mass
          topK: 1,              // Only pick the #1 token
          seed: 42,             // Static integer seed
          maxOutputTokens: 1000,
          presencePenalty: 0.0, // No penalty to keep output consistent
          frequencyPenalty: 0.0,// No penalty to keep output consistent
          responseMimeType: "text/plain"
        }
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Vertex AI failure");
    }

    const data = await res.json();
    let summary = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Final Regex Sanitation
    summary = summary
      .replace(/[#*_~`]/g, '') // Remove Markdown symbols
      .replace(/\s+/g, ' ')    // Flatten all whitespace/newlines
      .trim();

    return json({ summary: summary || "No summary generated." });

  } catch (err) {
    console.error("[BACKEND ERROR]", err);
    return json({ error: err.message }, { status: 500 });
  }
}