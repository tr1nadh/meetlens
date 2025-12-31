import { json } from "@sveltejs/kit";
import fetch from "node-fetch";
import {
  env
} from "$env/dynamic/private";

const REGION = "us-central1";
const PROJECT_ID = String(env.GCP_PROJECT_ID).trim();

/* ---------------- POST: HIGHLIGHTS ---------------- */

export async function POST({ request }) {
  try {
    const { transcript, meetingType } = await request.json();

    if (!transcript || transcript.length < 10) {
      return json(
        { error: "Transcript is required to extract highlights" },
        { status: 400 }
      );
    }

    // ✅ CLEANUP FUNCTIONALITY
    // Normalizing transcript to remove excessive gaps while keeping speaker names.
    // This allows Gemini to connect context across multiple lines of dialogue.
    const normalizedTranscript = transcript
      .replace(/\r?\n|\r/g, ' ') 
      .replace(/\s+/g, ' ')      
      .replace(/([A-Z][a-z]+ \d?:|[A-Z]{2,}:)/g, '\n$1') 
      .trim();

    const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/gemini-2.0-flash-lite:generateContent`;

    const meetingContext = meetingType
      ? `Meeting type: ${meetingType.replace("_", " ")}`
      : "General meeting";

    const prompt = `
You are an AI assistant extracting highlights from a ${meetingContext}.

Definition:
Highlights are important points, insights, concerns, or notable moments from the conversation.
They provide context and understanding but do NOT require follow-up actions.

Instructions:
- Treat the transcript as a continuous chronological stream.
- Do not let irregular formatting or line breaks influence the importance of a point.
- Extract only notable or meaningful points from the conversation.
- Do NOT include action items, tasks, decisions, or approvals.
- Highlights must be directly supported by the transcript.
- Output as a bullet list.
- If no clear highlights exist, say: "No notable highlights identified."

Transcript:
${normalizedTranscript}
    `.trim();

    console.log("[LOG] Highlights Prompt (Normalized):", prompt);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.VERTEX_API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 300
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText);
    }

    const data = await res.json();
    const highlights = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!highlights) {
      throw new Error("Failed to generate highlights");
    }

    return json({ highlights });

  } catch (err) {
    console.error("[HIGHLIGHTS ERROR]", err);
    return json(
      { error: "Failed to extract highlights" },
      { status: 500 }
    );
  }
}