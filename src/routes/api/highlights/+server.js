import { json } from "@sveltejs/kit";
import fetch from "node-fetch";
import {
  VERTEX_API_KEY,
  GCP_PROJECT_ID
} from "$env/static/private";

const REGION = "us-central1";
const PROJECT_ID = String(GCP_PROJECT_ID).trim();

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

    // ✅ SAME model, SAME endpoint
    const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/gemini-2.0-flash-lite:generateContent`;

    const meetingContext = meetingType
      ? `Meeting type: ${meetingType.replace("_", " ")}`
      : "General meeting";

    const prompt = `
You are an AI assistant extracting highlights from a ${meetingContext}.

Definition:
Highlights are important points, insights, concerns, or notable moments from the conversation.
They provide context and understanding but do NOT require follow-up actions.

Rules:
- Extract only notable or meaningful points from the conversation
- Do NOT include action items or tasks
- Do NOT include decisions or approvals
- Do NOT summarize the entire ${meetingContext}
- Do NOT invent information
- Highlights must be directly supported by the transcript
- Output as a bullet list
- If no clear highlights exist, say: "No notable highlights identified."

Transcript:
${transcript}
    `.trim();

    console.log("[LOG] Highlights Prompt:", prompt);

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

    const highlights =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

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
