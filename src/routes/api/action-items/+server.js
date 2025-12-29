import { json } from "@sveltejs/kit";
import fetch from "node-fetch";
import {
  VERTEX_API_KEY,
  GCP_PROJECT_ID
} from "$env/static/private";

const REGION = "us-central1";
const PROJECT_ID = String(GCP_PROJECT_ID).trim();

/* ---------------- POST: ACTION ITEMS ---------------- */

export async function POST({ request }) {
  try {
    const { transcript, meetingType } = await request.json();

    if (!transcript || transcript.length < 10) {
      return json(
        { error: "Transcript is required to extract action items" },
        { status: 400 }
      );
    }

    // ✅ SAME model, SAME endpoint
    const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/gemini-2.0-flash-lite:generateContent`;

    const meetingContext = meetingType
      ? `Meeting type: ${meetingType.replace("_", " ")}`
      : "General meeting";

    const prompt = `
You are an AI assistant extracting action items from a ${meetingContext}.

Definition:
An action item is a concrete next step that must be executed as a result of the conversation.

Rules:
- Extract explicit OR strongly implied action items that result from the conversation
- Each item must be actionable
- Do NOT summarize the ${meetingContext}
- Do NOT invent actions that are not directly supported by the conversation
- If an owner is mentioned, include it
- If a deadline is mentioned, include it
- Output as a bullet list
- If no action items exist, say: "No clear action items identified."
- If the responsible party is implied (e.g., agent or customer), infer it based on role
- Exclude conversational acknowledgements, agreements, or opinions unless they result in an executable step

Transcript:
${transcript}
    `.trim();

    console.log("[LOG] Action Items Prompt:", prompt);

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

    const actionItems =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!actionItems) {
      throw new Error("Failed to generate action items");
    }

    return json({ actionItems });

  } catch (err) {
    console.error("[ACTION ITEMS ERROR]", err);
    return json(
      { error: "Failed to extract action items" },
      { status: 500 }
    );
  }
}
