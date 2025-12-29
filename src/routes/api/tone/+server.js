import { json } from "@sveltejs/kit";
import fetch from "node-fetch";
import {
  VERTEX_API_KEY,
  GCP_PROJECT_ID
} from "$env/static/private";

const REGION = "us-central1";
const PROJECT_ID = String(GCP_PROJECT_ID).trim();
const MODEL_ID = "gemini-2.0-flash-lite"; // unchanged

/* ---------------- POST: TONE ANALYSIS ---------------- */

export async function POST({ request }) {
  try {
    const { transcript, meetingType = "general meeting" } = await request.json();

    if (!transcript || transcript.trim().length < 20) {
      return json({ error: "Transcript is too short" }, { status: 400 });
    }

    // ✅ SAME endpoint, SAME model
    const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${MODEL_ID}:generateContent`;

    const prompt = `
      You are a conversation analyst. Analyze the following ${meetingType} transcript.
      Return ONLY a valid JSON object with the following structure:
      {
        "tone": "string",
        "sentiment": "positive | neutral | negative | mixed",
        "emotions": ["string"],
        "confidenceLevel": "Low | Medium | High",
        "riskSignals": ["string"]  // indicators of hesitation, uncertainty, objections, delays, dissatisfaction, legal, financial, or delivery concerns; include inferred risks if clearly implied by tone or wording
        "summary": "string"
      }
      Transcript:
      """
      ${transcript}
      """

      Rules for riskSignals:
- Include explicit risks mentioned in the conversation
- ALSO include implicit risks if the speaker shows hesitation, concern, pushback, uncertainty, or resistance
- Do NOT invent risks that are not reasonably implied
- If no risks are present, return an empty array

    `;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": VERTEX_API_KEY
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          // Explicitly requesting JSON response
          responseMimeType: "application/json"
        }
      })
    });

    if (!res.ok) {
      const errData = await res.json();
      console.error("Vertex API Error:", JSON.stringify(errData, null, 2));
      return json(
        { error: "Gemini failed to analyze tone" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error("Empty response from AI");
    }

    // ✅ SAME parsing logic
    const toneResult = JSON.parse(rawText);
    console.log("[TONE RESULT]", toneResult);

    return json(toneResult);

  } catch (err) {
    console.error("[TONE API CRITICAL]", err);
    return json({ error: err.message }, { status: 500 });
  }
}
