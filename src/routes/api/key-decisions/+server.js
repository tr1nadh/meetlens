import { json } from "@sveltejs/kit";
import fetch from "node-fetch";
import {
  VERTEX_API_KEY,
  GCP_PROJECT_ID
} from "$env/static/private";

const REGION = "us-central1";
const PROJECT_ID = String(GCP_PROJECT_ID).trim();

/* ---------------- POST: KEY DECISIONS ---------------- */

export async function POST({ request }) {
  try {
    const { transcript, meetingType } = await request.json();

    if (!transcript || transcript.length < 10) {
      return json(
        { error: "Transcript is required to extract key decisions" },
        { status: 400 }
      );
    }

    // ✅ SAME model, SAME endpoint
    const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/gemini-2.0-flash-lite:generateContent`;

    const meetingContext = meetingType
      ? `Meeting type: ${meetingType.replace("_", " ")}`
      : "General meeting";

    const prompt = `
You are an AI assistant extracting key decisions from a ${meetingContext}.

Definition:
A key decision is a confirmed agreement, approval, rejection, or commitment made during the conversation.
Key decisions describe what was decided, not what needs to be done.

Rules:
- Extract ONLY finalized or clearly agreed-upon decisions
- Do NOT include action items or tasks
- Do NOT summarize the ${meetingContext}
- Do NOT invent decisions
- Decisions must be directly supported by the conversation
- If a decision maker is mentioned, include it
- Output as a bullet list
- If no clear decisions exist, say: "No key decisions identified."
- Exclude opinions, suggestions, or discussions that did not result in a decision

Transcript:
${transcript}
    `.trim();

    console.log("[LOG] Key Decisions Prompt:", prompt);

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
          temperature: 0.2,
          maxOutputTokens: 300
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText);
    }

    const data = await res.json();

    const keyDecisions =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!keyDecisions) {
      throw new Error("Failed to generate key decisions");
    }

    return json({ keyDecisions });

  } catch (err) {
    console.error("[KEY DECISIONS ERROR]", err);
    return json(
      { error: "Failed to extract key decisions" },
      { status: 500 }
    );
  }
}
