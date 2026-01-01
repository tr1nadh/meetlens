# 🎧 MeetLens — AI Meeting & Call Analyzer

> **Team: AIB au** > *Turning raw meeting audio into structured, actionable intelligence in seconds.*

MeetLens is a high-performance **AI-powered meeting & call analysis tool** built for the modern professional. Designed to bridge the gap between "having a recording" and "having the answers," MeetLens extracts summaries, action items, and emotional intelligence from your conversations.

**Live Demo:** [https://meetlensai.up.railway.app/](https://meetlensai.up.railway.app/)

---

## 📺 Product Showcase

### 🎥 Demo Video

[Click here to watch the full walkthrough on YouTube](https://youtu.be/KxYnSjmgb1g)

### 📸 Product Gallery

![Homepage](/static/assets/screenshots/homepage.png)
![Upload](/static/assets/screenshots/upload.png)
![Audio player](/static/assets/screenshots/audio-player.png)
![Results](/static/assets/screenshots/results.png)
![Export](/static/assets/screenshots/export.png)

---

## ✨ Key Features

### 🎙️ Intelligent Transcription & Audio Sync

* **Word-Level Highlighting:** A custom sticky audio player that highlights text in real-time as the audio plays.
* **Optimized for Indian English:** High-accuracy STT engine tuned for real-world business accents and non-studio environments.

### 🧠 AI-Powered Insights

* **Five Lenses of Analysis:** Summary, Action Items, Key Decisions, Highlights, and Tone Analysis.
* **Speaker Mapping:** Automatically identifies different voices and allows users to rename them (e.g., "Speaker 1" → "Manager") for a personalized transcript.

### 🧪 One-Click Demo (Sample Audios)

* **Pre-loaded Samples:** Includes a dedicated row of sample recordings (Sales Calls, Project Meetings, Support Calls) hosted locally for instant testing.
* **Auto-Populate:** Clicking a sample bypasses manual file selection, instantly triggering the analysis flow—perfect for quick judge reviews.

---

## 💰 Business & Revenue Model

MeetLens adopts a **Utility-First** model to align costs with user value.

### Pay-As-You-Go Pricing

> **₹5 per minute of audio analyzed**

* **Why this works:** Meetings are irregular. Users avoid "Subscription Fatigue" and only pay for what they use.
* **Predictable Margin:** AI infrastructure costs scale directly with audio length, ensuring a sustainable business model.
* **No Hidden Fees:** A single flat rate includes transcription plus all AI-generated insights.

---

## 🏗️ Tech Stack

* **Frontend:** SvelteKit (Svelte 5 architecture)
* **Backend:** Node.js
* **Deployment:** Railway
* **State Management:** Custom Svelte Stores for session persistence.
* **UI/UX:** Bootstrap 5 + Glass-morphic Custom CSS.
* **Audio Logic:** FilePond for robust file handling and validation.

---

## ⚙️ Project Installation & Setup

### Prerequisites

* Node.js (v18+)
* API keys for Transcription and LLM services.

### Steps

1. **Clone the repo:**
`git clone https://github.com/your-username/meetlens.git`
2. **Install dependencies:**
`npm install`
3. **Configure Environment:**
Create a `.env` file in the root:

```
# For stable AI Gemini models
VERTEX_API_KEY=your_vertex_ai_api_key
GCP_PROJECT_ID=your_google_cloud_project_id

# Lemonfox api key (You can use OPEN AI Whipser, if you want)
LEMONFOX_API_KEY=your_api_key

# For local email testing
GMAIL_ADDRESS=your_gmail_address
GMAIL_APP_PASSWORD=your_gmail_app_password

# For production reports sending
RESEND_API_KEY=your_api_key
MAIL_SENDER=resend

# For Supabase Authentication
PUBLIC_SUPABASE_URL=https://your_project_id.supabase.co
PUBLIC_SUPABASE_ANON_KEY=sb_publishable__key
SUPABASE_SERVICE_ROLE_KEY=sb_secret_key
```
4. **Launch locally:**
`npm run dev`

---

## 🌍 Deployment

MeetLens is optimized for deployment on **Railway**.

* **Build Command:** `npm run build`
* **Start Command:** `node build`

*Note: Static assets like sample audios are served directly from the `/static` folder to ensure reliability across deployments.*

---

## 🧠 Why MeetLens Matters (The AI Buildathon Vision)

MeetLens is not a toy project; it is a **Real-World MVP**. It demonstrates:

1. **Practical Adoption:** A monetization strategy that handles real AI token costs.
2. **High-End UI:** A sophisticated dark-mode dashboard designed for professional focus.
3. **Information Clarity:** Solving "Meeting Fatigue" by providing structured data instead of raw noise.

---

## 📬 Contact Team AIB au

If you are a judge or recruiter, feel free to explore the code or try the demo!

[Live App](https://meetlensai.up.railway.app/) | [GitHub Repo](https://github.com/tr1nadh/meetlens-ai)

---

### ⭐ If you find this project useful, please give it a star!