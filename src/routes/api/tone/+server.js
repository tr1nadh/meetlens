import { json } from "@sveltejs/kit";
import fetch from "node-fetch";
import {
  env
} from "$env/dynamic/private";

const REGION = "us-central1";
const PROJECT_ID = String(env.GCP_PROJECT_ID).trim();
const MODEL_ID = "gemini-2.0-flash-lite";

/* ---------------- POST: TONE ANALYSIS ---------------- */

export async function POST({ request }) {
  try {
    const { transcript, meetingType = "general meeting" } = await request.json();

    if (!transcript || transcript.trim().length < 20) {
      return json({ error: "Transcript is too short" }, { status: 400 });
    }

    // ✅ CLEANUP FUNCTIONALITY: Normalization
    // Essential for tone analysis to detect "hesitation" or "conflict" 
    // that spans across multiple dialogue turns.
    const normalizedTranscript = transcript
      .replace(/\r?\n|\r/g, ' ') 
      .replace(/\s+/g, ' ')      
      .replace(/([A-Z][a-z]+ \d?:|[A-Z]{2,}:)/g, '\n$1') 
      .trim();

    const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${MODEL_ID}:generateContent`;

    const prompt = `
You are a high-precision linguistic expert and conversation analyst. Analyze the provided ${meetingType} transcript for tone, sentiment, and underlying risk.

### Important Note:
The transcript below has been normalized. Treat the text as a continuous chronological stream to detect subtle shifts in mood or confidence.

### Objectives:
1. **Tone & Sentiment:** Identify the overall atmosphere (e.g., Professional, Assertive, Tense) and sentiment polarity.
2. **Emotional Mapping:** Detect specific emotions present (e.g., Gratitude, Frustration, Urgency).
3. **Risk Detection:** Scan for "Risk Signals." These include:
   - **Explicit Risks:** Mention of budget overruns, missed deadlines, or legal hurdles.
   - **Implicit Risks:** Hesitation (e.g., "I guess we could..."), uncertainty ("We might be able to"), objections, or underlying dissatisfaction.
4. **Summary:** Provide a concise 2-3 sentence overview of the conversation's health.

### JSON Schema Requirement:
Return ONLY a valid JSON object with this exact structure:
{
  "tone": "string",
  "sentiment": "positive | neutral | negative | mixed",
  "emotions": ["string"],
  "confidenceLevel": "Low | Medium | High",
  "riskSignals": ["string"],
  "summary": "string"
}

### Strict Rules:
- **Accuracy:** Every risk signal must be traceable to specific wording in the transcript.
- **Consistency:** Maintain a professional, objective analytical tone in the descriptions.
- **Implicit Intelligence:** Pay close attention to word choices that signal low confidence or unstated disagreement.
- **Output:** No preamble or markdown backticks. Just the JSON object.

Transcript:
"""
${normalizedTranscript}
"""
    `.trim();

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.VERTEX_API_KEY
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0, 
          topP: 1,
          topK: 1,
          maxOutputTokens: 1000,
          response_mime_type: "application/json" 
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

    const toneResult = JSON.parse(rawText);
    return json(toneResult);

  } catch (err) {
    console.error("[TONE API CRITICAL]", err);
    return json({ error: err.message }, { status: 500 });
  }
}