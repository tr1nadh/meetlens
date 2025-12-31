import { json } from "@sveltejs/kit";
import fetch from "node-fetch";
import {
  env
} from "$env/dynamic/private";

const REGION = "us-central1";
const PROJECT_ID = String(env.GCP_PROJECT_ID).trim();

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

    // ✅ CLEANUP FUNCTIONALITY: Normalizing the transcript
    // This removes excessive newlines and spaces that cause accuracy issues 
    // while keeping speaker structure intact for task assignment.
    const normalizedTranscript = transcript
      .replace(/\r?\n|\r/g, ' ') // 1. Flatten all newlines into spaces
      .replace(/\s+/g, ' ')      // 2. Collapse multiple spaces into one
      .replace(/([A-Z][a-z]+ \d?:|[A-Z]{2,}:)/g, '\n$1') // 3. Re-insert clean breaks before "Speaker Name:"
      .trim();

    const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/gemini-2.0-flash-lite:generateContent`;

    const meetingContext = meetingType
      ? `Meeting type: ${meetingType.replace("_", " ")}`
      : "General meeting";

    const prompt = `
You are a high-precision analyst. Your goal is to identify and extract every action item from the following ${meetingContext} transcript.

### Extraction Criteria:
1. **Explicit Actions:** Direct requests or promises (e.g., "I will send the file").
2. **Implied Actions:** Captured when a participant agrees to a suggestion or acknowledges a responsibility (e.g., "That makes sense, I'm on it").
3. **Follow-ups:** Any mention of a future meeting or status check.

### Important:
The transcript below has been normalized for processing. Treat the text as a continuous chronological conversation. Do not let line breaks influence the importance of a point.

### Data Requirements for each item:
- **task:** A clear, standalone description of what needs to be done.
- **owner:** The specific name or role (Agent, Customer, etc.) responsible.
- **deadline:** The specific date, time, or relative timeframe mentioned; otherwise null.
- **reasoning:** A 1-sentence explanation of why this is an action item (e.g., "The customer agreed to provide bank statements by Friday").

### JSON Output Format:
{
  "actionItems": [
    {
      "task": "string",
      "owner": "string",
      "deadline": "string or null",
      "reasoning": "string"
    }
  ]
}

### Constraints:
- Be exhaustive: do not miss any commitments.
- Be precise: exclude general conversation that doesn't require a next step.
- Return an empty array if absolutely no tasks are found.

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
          temperature: 0,      // Deterministic: No randomness
          topP: 1,             // Strict probability matching
          topK: 1,             // Highest confidence token selection
          maxOutputTokens: 1200, 
          response_mime_type: "application/json"
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
      throw new Error("Failed to generate action items");
    }

    const parsedData = JSON.parse(rawResponse);

    return json({ actionItems: parsedData.actionItems });

  } catch (err) {
    console.error("[ACTION ITEMS ERROR]", err);
    return json(
      { error: "Failed to extract action items" },
      { status: 500 }
    );
  }
}