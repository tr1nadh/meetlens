import { json } from "@sveltejs/kit";
import fetch from "node-fetch";
import {
  env
} from "$env/dynamic/private";

const REGION = "us-central1";
const PROJECT_ID = String(env.GCP_PROJECT_ID).trim();

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

    // ✅ CLEANUP FUNCTIONALITY: Normalization
    // Collapses whitespace/newlines to prevent context fragmentation,
    // ensuring the AI sees the 'Decision' and its 'Evidence' as connected.
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
You are a high-precision analyst. Your task is to identify and extract "Key Decisions" from this ${meetingContext} transcript.

### Important Formatting Note:
The transcript below has been normalized. Treat it as a single chronological flow.

A Key Decision is a confirmed agreement, approval, rejection, or definitive choice made during the conversation. 

Rules:
- Extract ONLY finalized or clearly agreed-upon decisions.
- Do NOT include action items (tasks/next steps).
- Do NOT include opinions or suggestions unless they were formally accepted.
- Assign a confidence score (0.0 to 1.0) and a confidence level ("High", "Medium", "Low") based on how clear the agreement was.
- List specific segments from the transcript as "evidence" for each decision.

Return ONLY a valid JSON object following this exact structure:
{
  "keyDecisions": [
    {
      "id": "kd_1",
      "decision": "string",
      "decisionMaker": "string or 'Consensus'",
      "confidence": number,
      "confidenceLevel": "string",
      "context": "string",
      "evidence": ["string"]
    }
  ],
  "meta": {
    "totalDecisions": number,
    "generatedAt": "ISO-8601-timestamp"
  }
}

Transcript:
${normalizedTranscript}
    `.trim();

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
          temperature: 0,        // Max consistency
          topP: 1,               // Strict logic
          topK: 1,               // Strict logic
          maxOutputTokens: 1500, // Sufficient space for context and evidence
          response_mime_type: "application/json" // Force JSON output
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText);
    }

    const data = await res.json();
    const rawResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!rawResponse) {
      throw new Error("Failed to generate key decisions");
    }

    // Parse the JSON string from AI into a real object
    const parsedData = JSON.parse(rawResponse);

    console.log("[KEY DECISIONS RESULT]", parsedData);

    // Return the keyDecisions array and meta as expected by the UI
    return json({ 
        keyDecisions: parsedData.keyDecisions,
        meta: parsedData.meta 
    });

  } catch (err) {
    console.error("[KEY DECISIONS ERROR]", err);
    return json(
      { error: "Failed to extract key decisions" },
      { status: 500 }
    );
  }
}