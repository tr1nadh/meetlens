import { json } from "@sveltejs/kit";
import * as speechSDK from "@google-cloud/speech";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { Storage } from "@google-cloud/storage";
import fs from "fs";
import path from "path";
import os from "os";
import { GOOGLE_APPLICATION_CREDENTIALS, GCP_PROJECT_ID } from "$env/static/private";
import { GoogleAuth } from "google-auth-library";

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

const SpeechClient = speechSDK.v2.SpeechClient;
const BatchRecognizeResponse = speechSDK.protos.google.cloud.speech.v2.BatchRecognizeResponse;

const PROJECT_ID = String(GCP_PROJECT_ID).trim();
const REGION = "us-central1"; 

const speechClient = new SpeechClient({ 
    keyFilename: GOOGLE_APPLICATION_CREDENTIALS,
    apiEndpoint: `${REGION}-speech.googleapis.com` 
});

const storage = new Storage({ keyFilename: GOOGLE_APPLICATION_CREDENTIALS });
const BUCKET_NAME = "meetlens-audio";

const auth = new GoogleAuth({
    keyFilename: GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"]
});

async function cleanupWithGemini(rawText) {
    if (!rawText || rawText.length < 5) return rawText;
    console.log("[LOG] Gemini: Polishing transcript...");
    try {
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();
        const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/gemini-1.5-flash-001:generateContent`;

        const res = await fetch(endpoint, {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${accessToken.token}`, 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: `Task: Fix punctuation and grammar. Do not summarize. Keep exact meaning. Text: "${rawText}"` }] }],
                generationConfig: { temperature: 0.1 }
            })
        });

        const data = await res.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || rawText;
    } catch (err) {
        console.error("[ERROR] Gemini failed:", err);
        return rawText;
    }
}

export async function POST({ request }) {
    console.log("[LOG] POST: Pipeline started...");
    const timestamp = Date.now();
    const inputPath = path.join(os.tmpdir(), `raw-${timestamp}`);
    const outputPath = path.join(os.tmpdir(), `clean-${timestamp}.wav`);

    try {
        const formData = await request.formData();
        const audioFile = formData.get("audio");
        if (!audioFile) return json({ error: "No audio" }, { status: 400 });

        fs.writeFileSync(inputPath, Buffer.from(await audioFile.arrayBuffer()));
        
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .audioChannels(1)
                .audioFrequency(16000) // 16kHz is the "sweet spot" for STT models
                .audioCodec("pcm_s16le")
                .on("end", resolve)
                .on("error", reject)
                .save(outputPath);
        });

        const gcsName = `transcription/${timestamp}.wav`;
        const gcsUri = `gs://${BUCKET_NAME}/${gcsName}`;
        await storage.bucket(BUCKET_NAME).upload(outputPath, { destination: gcsName });
        console.log("[LOG] GCS: Uploaded to", gcsUri);

        const [operation] = await speechClient.batchRecognize({
            parent: `projects/${PROJECT_ID}/locations/${REGION}`,
            recognizer: `projects/${PROJECT_ID}/locations/${REGION}/recognizers/_`,
            config: {
                autoDecodingConfig: {}, 
                model: "chirp_2", 
                languageCodes: ["en-IN"], 
                features: { enableAutomaticPunctuation: true }
            },
            files: [{ uri: gcsUri }],
            recognitionOutputConfig: { inlineResponseConfig: {} }
        });

        return json({ operationId: operation.name, gcsName });

    } catch (err) {
        console.error("[CRITICAL ERROR] POST:", err);
        return json({ error: err.message }, { status: 500 });
    } finally {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
}

export async function GET({ url }) {
    const id = url.searchParams.get("id");
    const gcsName = url.searchParams.get("gcsName");

    if (!id) return json({ error: "Missing ID" }, { status: 400 });

    try {
        let operationData = await speechClient.checkBatchRecognizeProgress(String(id));
        const operation = Array.isArray(operationData) ? operationData[0] : operationData;

        if (!operation.done) return json({ completed: false });

        if (operation.error) {
            console.error("[ERROR] STT API Error:", operation.error);
            throw new Error(operation.error.message);
        }

        let response = operation.response;

        // Decode Protobuf if necessary
        if (response && response.value && Buffer.isBuffer(response.value)) {
            console.log("[LOG] Decoding Protobuf Buffer...");
            response = BatchRecognizeResponse.decode(response.value);
        }

        // --- NEW EXTRACTION LOGIC ---
        const resultsMap = response?.results;
        if (!resultsMap) {
            return json({ error: "Transcription complete but resultsMap is null." }, { status: 500 });
        }

        let rawText = "";
        const uris = Object.keys(resultsMap);

        for (const uri of uris) {
            const fileOutput = resultsMap[uri];
            
            // Chirp 2 V2 Response Path: results[uri].transcript.results[]
            const transcriptResults = fileOutput.transcript?.results || [];
            
            const fileText = transcriptResults
                .map(res => res.alternatives?.[0]?.transcript || "")
                .filter(text => text.length > 0)
                .join(" ");
            
            rawText += fileText + " ";
        }

        rawText = rawText.trim();
        console.log("[LOG] STT Success. Raw Text length:", rawText.length);

        if (rawText.length === 0) {
            // Optional: Log the full response to debug nesting issues
            // console.log("[DEBUG] Empty result. Response structure:", JSON.stringify(response, null, 2));
            return json({ completed: true, text: "No speech detected.", rawText: "" });
        }

        const cleanText = await cleanupWithGemini(rawText);

        if (gcsName) {
            storage.bucket(BUCKET_NAME).file(gcsName).delete().catch(() => {});
        }

        return json({ completed: true, text: cleanText, rawText });

    } catch (err) {
        console.error("[ERROR] GET Pipeline:", err);
        return json({ error: err.message }, { status: 500 });
    }
}