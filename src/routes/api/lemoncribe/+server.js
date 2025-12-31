import { json } from "@sveltejs/kit";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";
import os from "os";
import fetch from "node-fetch";
import FormData from "form-data";
import { GoogleAuth } from "google-auth-library";
import {
  env
} from "$env/dynamic/private";

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

const REGION = "us-central1";
const PROJECT_ID = String(env.GCP_PROJECT_ID).trim();

/* ---------------- GEMINI AUTH ---------------- */

const auth = new GoogleAuth({
  keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ["https://www.googleapis.com/auth/cloud-platform"]
});

/* ---------------- GEMINI CLEANUP ---------------- */

async function cleanupWithGemini(rawText, meetingType) {
  if (!rawText || rawText.length < 5) return rawText;

  const meetingContext = meetingType
    ? `This is a ${meetingType.replace("_", " ")}.`
    : "";

  try {
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/gemini-1.5-flash-001:generateContent`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `
Task:
You are cleaning a transcript.
${meetingContext}

Rules:
- Fix punctuation and grammar
- Keep speaker labels exactly
- Do NOT summarize
- Do NOT remove content

Transcript:
${rawText}
                `.trim()
              }
            ]
          }
        ],
        generationConfig: { temperature: 0.1 }
      })
    });

    const data = await res.json();
    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || rawText
    );
  } catch {
    return rawText;
  }
}

/* ---------------- POST: TRANSCRIBE ---------------- */

export async function POST({ request }) {
  console.log("[LOG] Lemonfox STT pipeline started (speaker labels ON)");

  const ts = Date.now();
  const inputPath = path.join(os.tmpdir(), `raw-${ts}`);
  const wavPath = path.join(os.tmpdir(), `clean-${ts}.wav`);

  try {
    const formData = await request.formData();

    const audioFile = formData.get("audio");
    const meetingType = formData.get("meetingType");

    if (!audioFile) {
      return json({ error: "No audio uploaded" }, { status: 400 });
    }

    if (!meetingType) {
      return json({ error: "Meeting type not provided" }, { status: 400 });
    }

    console.log("[LOG] Meeting type:", meetingType);

    fs.writeFileSync(inputPath, Buffer.from(await audioFile.arrayBuffer()));

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat("wav")
        .audioChannels(1)
        .audioFrequency(16000)
        .audioCodec("pcm_s16le")
        .on("end", resolve)
        .on("error", reject)
        .save(wavPath);
    });

    const lfForm = new FormData();

    lfForm.append("file", fs.createReadStream(wavPath), {
      filename: "audio.wav",
      contentType: "audio/wav"
    });

    lfForm.append("response_format", "verbose_json");
    lfForm.append("language", "en");
    lfForm.append("speaker_labels", "true");
    lfForm.append("min_speakers", "2");
    lfForm.append("max_speakers", "4");

    const lfRes = await fetch(
      "https://api.lemonfox.ai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.LEMONFOX_API_KEY}`,
          ...lfForm.getHeaders()
        },
        body: lfForm
      }
    );

    if (!lfRes.ok) {
      const errText = await lfRes.text();
      throw new Error(`Lemonfox STT failed: ${errText}`);
    }

    const lfData = await lfRes.json();

    let rawText = "";

    if (Array.isArray(lfData?.segments)) {
      rawText = lfData.segments
        .map(s => {
          const speaker =
            s.speaker != null ? `Speaker ${s.speaker}` : "Speaker";
          return `${speaker}: ${s.text}`;
        })
        .join("\n");
    } else if (lfData?.text) {
      rawText = lfData.text;
    }

    console.log("[LOG] STT completed. Length:", rawText.length);

    if (!rawText) {
      return json({
        completed: true,
        text: "No speech detected.",
        rawText,
        meetingType
      });
    }

    const cleanText = await cleanupWithGemini(rawText, meetingType);

    return json({
      completed: true,
      text: cleanText,
      rawText,
      meetingType
    });

  } catch (err) {
    console.error("[ERROR] Lemonfox pipeline:", err);
    return json({ error: err.message }, { status: 500 });

  } finally {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
  }
}
