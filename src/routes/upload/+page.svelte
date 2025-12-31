<script>
  import {
    actionItemsStore,
    highlightsStore,
    keyDecisionsStore,
    meetingTypeStore,
    speakerMapStore,
    summaryStore,
    toneResultStore,
    transcriptStore,
    fileDetailsStore
  } from '$lib/store.js';
  
  import ActionItemsAnalysis from './ActionItemsAnalysis.svelte';
  import AudioUploader from './AudioUploader.svelte';
  import DecisionAnalysis from './DecisionAnalysis.svelte';
  import HighlightsAnalysis from './HighlightsAnalysis.svelte';
  import ShareReport from './ShareReport.svelte';
  import SummaryAnalysis from './SummaryAnalysis.svelte';
  import ToneAnalysis from './ToneAnalysis.svelte';
  import TranscriptBlock from './TranscriptBlock.svelte';

  /* --- UI & Loading States --- */
  let file = null;
  let audioUrl = "";
  let loading = false;
  let error = "";
  let copied = false;

  let summaryLoading = false;
  let summaryCopied = false;
  let actionItemsLoading = false;
  let actionItemsCopied = false;
  let highlightsLoading = false;
  let highlightsCopied = false;
  let keyDecisionsLoading = false;
  let keyDecisionsCopied = false;
  let toneLoading = false;
  let toneError = "";

  /* --- Store Initialization --- */
  let meetingType = $meetingTypeStore || "";
  let transcript = $transcriptStore || "";
  let summary = $summaryStore || "";
  let actionItems = $actionItemsStore || "";
  let highlights = $highlightsStore || "";
  let keyDecisions = $keyDecisionsStore || "";
  let toneResult = $toneResultStore || null;
  let speakerMap = $speakerMapStore || {};
  let details = $fileDetailsStore || { name: "", meeting_type: "", duration: "", rep_id: "0" };

  /* --- Reactive Sync to Stores --- */
  $: $transcriptStore = transcript;
  $: $summaryStore = summary;
  $: $meetingTypeStore = meetingType;
  $: $actionItemsStore = actionItems;
  $: $highlightsStore = highlights;
  $: $keyDecisionsStore = keyDecisions;
  $: $toneResultStore = toneResult;
  $: $speakerMapStore = speakerMap;
  $: $fileDetailsStore = details;

  // Sync meeting type dropdown to the details metadata object
  $: if (meetingType) {
    details = { ...details, meeting_type: meetingType };
  }

  /* --- File Metadata & Uploader Logic --- */
  async function getAudioMetadata(file) {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.onloadedmetadata = () => {
        const minutes = Math.floor(audio.duration / 60);
        const seconds = Math.floor(audio.duration % 60);
        resolve(`${minutes}m ${seconds}s`);
      };
    });
  }

  async function handleNewFile(event) {
    file = event.detail.file;
    audioUrl = event.detail.url;
    error = "";
    if (file) {
      // Logic: Save to local state then store via reactive sync
      const durationStr = event.detail.duration || await getAudioMetadata(file);
      details = {
        name: file.name,
        meeting_type: meetingType || "General Meeting",
        duration: durationStr,
        rep_id: Math.floor(1000 + Math.random() * 9000).toString()
      };
    }
  }

  function handleClear() {
    file = null;
    audioUrl = "";
    details = { name: "", meeting_type: "", duration: "", rep_id: "0" };
  }

  /* --- API Handlers --- */
  async function uploadAudio() {
    if (!file || !meetingType) return;
    loading = true; error = ""; transcript = "";
    const formData = new FormData();
    formData.append("audio", file);
    formData.append("meetingType", meetingType);
    try {
      const res = await fetch("/api/lemoncribe", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed");
      transcript = data.text || "";
    } catch (err) { error = err.message; } finally { loading = false; }
  }

  async function generateSummary() {
    if (!transcript.trim()) return;
    summaryLoading = true; summary = "";
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, meetingType })
      });
      const data = await res.json();
      summary = data.summary;
    } catch (err) { error = err.message; } finally { summaryLoading = false; }
  }

  async function generateActionItems() {
    if (!transcript.trim()) return;
    actionItemsLoading = true; actionItems = "";
    try {
      const res = await fetch("/api/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, meetingType })
      });
      const data = await res.json();
      actionItems = data.actionItems;
    } catch (err) { error = err.message; } finally { actionItemsLoading = false; }
  }

  async function generateKeyDecisions() {
    if (!transcript.trim()) return;
    keyDecisionsLoading = true; keyDecisions = "";
    try {
      const res = await fetch("/api/key-decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, meetingType })
      });
      const data = await res.json();
      keyDecisions = data.keyDecisions;
    } catch (err) { error = err.message; } finally { keyDecisionsLoading = false; }
  }

  async function generateHighlights() {
    if (!transcript.trim()) return;
    highlightsLoading = true; highlights = "";
    try {
      const res = await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, meetingType })
      });
      const data = await res.json();
      highlights = data.highlights;
    } catch (err) { error = err.message; } finally { highlightsLoading = false; }
  }

  async function analyzeTone() {
    if (!transcript || transcript.trim().length < 20) return;
    toneLoading = true; toneError = ""; toneResult = null;
    try {
      const res = await fetch("/api/tone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, meetingType })
      });
      toneResult = await res.json();
    } catch (err) { toneError = "Unable to analyze tone"; } finally { toneLoading = false; }
  }

  function generateAllInsights() {
    analyzeTone(); generateSummary(); generateKeyDecisions(); generateActionItems(); generateHighlights();
  }

  /* --- Clipboard Functions --- */
  async function copyTranscript() {
    await navigator.clipboard.writeText(transcript);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  /* --- Transcript & Speaker Mapping Logic --- */
  let activeSpeakerId = null;
  let tempSpeakerName = "";

  $: editableTranscript = (transcript || "").replace(
    /Speaker\s+(SPEAKER_\d+)/g,
    (_, id) => `Speaker ${speakerMap[id] || id}`
  );

  $: speakerIds = Array.from(
    new Set((transcript.match(/Speaker\s+(SPEAKER_\d+)/g) || []).map(s => s.replace("Speaker ", "")))
  );

  $: { speakerIds.forEach(id => { if (!speakerMap[id]) speakerMap[id] = id; }); }

  function handleTranscriptEdit(e) {
    let value = e.target.value;
    speakerIds.forEach(id => {
      const safeLabel = `Speaker ${speakerMap[id] || id}`;
      const lockedLabel = `Speaker ${id}`;
      value = value.replaceAll(safeLabel, lockedLabel);
    });
    transcript = value;
  }

  function openSpeakerModal(id) {
    activeSpeakerId = id;
    tempSpeakerName = speakerMap[id] === id ? "" : speakerMap[id];
    new bootstrap.Modal(document.getElementById("speakerModal")).show();
  }

  function saveSpeakerName() {
    if (activeSpeakerId) {
      $speakerMapStore[activeSpeakerId] = tempSpeakerName.trim() || activeSpeakerId;
      speakerMap = { ...$speakerMapStore };
    }
  }

  /* --- Audio Player Word-Highlighting Logic --- */
  let isPlaying = false;
  let currentTime = 0;
  let duration = 0;
  let activeTab = 'summary';
  let uploaderComponent;

  function handlePlayState(state) { isPlaying = state; }
  function handleTimeUpdate(e) {
    currentTime = e.target.currentTime;
    duration = e.target.duration;
    if (isPlaying) {
      const activeWord = document.getElementById('highlight-container')?.querySelector('.word-active');
      if (activeWord) activeWord.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  $: highlightWords = editableTranscript
    .replace(/Speaker\s+[^\n:]+[:]?/g, '')
    .split(/\s+/)
    .filter(word => word.length > 0);

  const lookAheadOffset = 0.12;
  $: currentWordIndex = duration > 0 
    ? Math.floor(((currentTime + lookAheadOffset) / duration) * highlightWords.length) 
    : 0;

  /* --- Helper UI Functions --- */
  function scrollTabs(amount) {
    document.getElementById('tabs-nav-scroll')?.scrollBy({ left: amount, behavior: 'smooth' });
  }

  function clearSession() {
    if (confirm("Permanently delete session?")) {
      if (uploaderComponent) uploaderComponent.clearFile();
      transcript = ""; summary = ""; meetingType = ""; actionItems = ""; 
      highlights = ""; keyDecisions = ""; toneResult = null; speakerMap = {};
      file = null; audioUrl = ""; 
      details = { name: "", meeting_type: "", duration: "", rep_id: "0" };
    }
  }
</script>

<div class="upload-page-wrapper">
  <div class="container py-5">
    <div class="card glass-card mb-4 mt-5">
      <div class="card-body p-4">
        <!-- <h4 class="mb-1 text-white fw-bold">
          <i class="fa-solid fa-microphone-lines me-2 text-indigo"></i>
          MeetLens
        </h4> -->
        <p class="text-light-muted fs-6 fw-semibold mb-4">
          Upload audio <span class="text-primary">(WAV, MP3, M4A | MAX 30min | 100 MB LIMIT)</span>,
           choose its type, and generate a clean transcript with AI insights.
        </p>

        <div class="row g-3 align-items-end">
          <div class="col-md-4">
            <label class="form-label small text-light-muted">
              <i class="fa-solid fa-file-audio me-1"></i> Audio file
            </label>
            <AudioUploader 
            bind:this={uploaderComponent}
              on:fileSelected={handleNewFile} 
              on:fileCleared={handleClear}
              on:error={(e) => error = e.detail}
            />
          </div>



          <div class="col-md-4">
            <label class="form-label small text-light-muted">
              <i class="fa-solid fa-tags me-1"></i> Audio type
            </label>
            <select class="form-select custom-input styled-select" bind:value={meetingType}>
              <option value="" disabled>Select audio type</option>
              <option value="sales_call" class="text-indigo">Sales Call</option>
              <option value="interview" class="text-purple">Interview</option>
              <option value="project_meeting" class="text-emerald">Project Meeting</option>
              <option value="standup" class="text-emerald">Daily Standup</option>
              <option value="support_call" class="text-indigo">Support Call</option>
              <option value="general" class="text-white">General</option>
            </select>
          </div>

          <div class="col-md-4 d-flex gap-2">
          <button 
            class="btn btn-indigo-glow flex-grow-1 py-2" 
            on:click={uploadAudio} 
            disabled={loading || !file || !meetingType}>
              {#if loading}
                <i class="fa-solid fa-spinner fa-spin me-2"></i> Analyzing…
              {:else}
                Transcribe
              {/if}
          </button>
            
            <button class="btn btn-outline-glass border-danger text-danger px-3" 
              title="Clear all data" 
              on:click={clearSession}>
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>

        {#if audioUrl}
          <div class="audio-sticky-footer animate-slide-up">
            <div class="container">
              <div class="audio-player-wrapper">
                <div class="d-flex align-items-center gap-3">
                  <div class="player-label d-none d-md-flex mb-0">
                    <i class="fa-solid fa-waveform-lines me-2"></i> Recording
                  </div>
                  <audio 
                    controls 
                    class="custom-audio-player flex-grow-1" 
                    src={audioUrl}
                    on:play={() => handlePlayState(true)}
                    on:pause={() => handlePlayState(false)}
                    on:timeupdate={handleTimeUpdate}
                  ></audio>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <div class="row g-4">
      <div class="col-lg-7">
        
        <TranscriptBlock 
          {transcript}
          {speakerMap}
          {speakerIds}
          {isPlaying}
          {highlightWords}
          {currentWordIndex}
        />

      </div>

      <div class="col-lg-5">
        
        <div class="row g-2 mb-4">
            <div class="col-6">
                <button class="btn btn-purple-glow w-100 py-2" disabled={!transcript.trim()} on:click={generateAllInsights}>
                    <i class="fa-solid fa-bolt-lightning me-2"></i> Generate All
                </button>
            </div>
            <div class="col-6">
              <a class="btn btn-outline-glass w-100 py-2 text-white" href="/upload/report" rel="noopener noreferrer">
                  <i class="fa-solid fa-share-nodes me-2"></i> Share Result
              </a>
            </div>
        </div>

<div class="tabs-container-wrapper mb-4">
  <button class="nav-arrow left" on:click={() => scrollTabs(-200)} aria-label="Scroll Left">
    <i class="fa-solid fa-chevron-left"></i>
  </button>

  <div class="tabs-nav" id="tabs-nav-scroll">
    <button class="tab-link {activeTab === 'summary' ? 'active' : ''}" on:click={() => activeTab = 'summary'}>
      <i class="fa-solid fa-align-left me-2"></i>Summary
    </button>

    <button class="tab-link {activeTab === 'highlights' ? 'active' : ''}" on:click={() => activeTab = 'highlights'}>
      <i class="fa-solid fa-wand-magic-sparkles me-2"></i>Highlights
    </button>

    <button class="tab-link {activeTab === 'tone' ? 'active' : ''}" on:click={() => activeTab = 'tone'}>
      <i class="fa-solid fa-face-smile-beam me-2"></i>Tone Analysis
    </button>

    <button class="tab-link {activeTab === 'decisions' ? 'active' : ''}" on:click={() => activeTab = 'decisions'}>
      <i class="fa-solid fa-gavel me-2"></i>Key Decisions
    </button>

    <button class="tab-link {activeTab === 'action-items' ? 'active' : ''}" on:click={() => activeTab = 'action-items'}>
      <i class="fa-solid fa-list-check me-2"></i>Action Items
    </button>
  </div>

  <button class="nav-arrow right" on:click={() => scrollTabs(200)} aria-label="Scroll Right">
    <i class="fa-solid fa-chevron-right"></i>
  </button>
</div>

        {#if activeTab === 'tone'}
          <ToneAnalysis 
            {transcript} 
            {toneResult} 
            {toneLoading} 
            {analyzeTone}
          />
        {/if}

        {#if activeTab === 'summary'}
          <SummaryAnalysis
            {transcript}
            {summary}
            {summaryLoading}
            {generateSummary}
          />
        {/if}

        {#if activeTab === 'highlights'}
          <HighlightsAnalysis
            {transcript}
            {highlights}
            {highlightsLoading}
            {generateHighlights}
          />
        {/if}

        {#if activeTab === 'decisions'}
          <DecisionAnalysis
            {transcript}
            {keyDecisions}
            {keyDecisionsLoading}
            {generateKeyDecisions}
          />
        {/if}

        {#if activeTab === 'action-items'}
          <ActionItemsAnalysis
            {transcript}
            {actionItems}
            {actionItemsLoading}
            {generateActionItems}
          />
        {/if}


      </div>
    </div>
  </div>
</div>

<style>
  :root {
    --bg-dark: #070910;
    --bg-dark-soft: #0e111d;
    --indigo-primary: #6366f1;
    --purple-primary: #a855f7;
    --emerald-primary: #10b981;
    --warning-primary: #f59e0b;
    --border-glass: rgba(255, 255, 255, 0.1);
    --text-muted: #94a3b8;
  }

  .upload-page-wrapper {
    background-color: var(--bg-dark);
    min-height: 100vh;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: white;
  }

  .text-light-muted { color: var(--text-muted); }
  .text-indigo { color: var(--indigo-primary); }
  .text-purple { color: var(--purple-primary); }
  .text-emerald { color: var(--emerald-primary); }

  /* CARDS */
  .glass-card {
    background: var(--bg-dark-soft) !important;
    border: 1px solid var(--border-glass) !important;
    border-radius: 20px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  }

  /* INPUTS */
  .custom-input {
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid var(--border-glass) !important;
    color: white !important;
    border-radius: 12px;
    padding: 10px 15px;
  }
  .custom-input:focus {
    border-color: var(--indigo-primary) !important;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
  }

  /* Styled Dropdown Options */
  .styled-select option {
    background-color: #111827;
    color: white;
    padding: 10px;
  }


/* Sticky Footer Container */
.audio-sticky-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 20px 0;
  background: linear-gradient(to top, var(--bg-dark) 40%, transparent);
  z-index: 1050; /* Above modals and other content */
  pointer-events: none; /* Let clicks pass through the gradient background */
}

/* The Player Box */
.audio-player-wrapper {
  pointer-events: auto; /* Enable clicks for the player itself */
  background: rgba(14, 17, 29, 0.8); /* Match glass-card background */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border-glass);
  padding: 12px 20px;
  border-radius: 20px;
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5);
}

.player-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--indigo-primary);
  font-weight: 800;
  white-space: nowrap;
}

/* Custom Audio Player Filter */
.custom-audio-player {
  height: 36px;
  filter: invert(100%) hue-rotate(180deg) brightness(1.5) contrast(0.9);
}

/* Add padding to the bottom of the wrapper so content isn't hidden by the player */
:global(.upload-page-wrapper) {
  padding-bottom: 100px;
}

/* Animation */
.animate-slide-up {
  animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(100%); }
  to { opacity: 1; transform: translateY(0); }
}


  /* BUTTONS */
  .btn-indigo-glow { background: var(--indigo-primary); color: white; border: none; border-radius: 12px; font-weight: 700; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3); transition: 0.3s; }
  .btn-indigo-glow:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4); color: white; }
  
  .btn-purple-glow { background: var(--purple-primary); color: white; border: none; border-radius: 12px; font-weight: 600; box-shadow: 0 4px 15px rgba(168, 85, 247, 0.2); transition: 0.3s; }
  .btn-purple-glow:hover:not(:disabled) { transform: translateY(-1px); color: white; }

  .btn-outline-glass { background: rgba(255,255,255,0.05); border: 1px solid var(--border-glass); color: var(--text-muted); border-radius: 12px; transition: 0.2s; }
  .btn-outline-glass:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: white; }

  @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

 /* Container that holds arrows and tabs */
.tabs-container-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  background: rgba(14, 17, 29, 0.4);
  border-radius: 12px;
  padding: 0 5px;
  overflow: hidden;
}

/* The actual scrollable bar */
.tabs-nav {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  scroll-behavior: smooth;
  white-space: nowrap;
  scrollbar-width: none; /* Firefox */
  padding: 10px 40px; /* Space for arrows */
  width: 100%;
  /* Creates a fade effect on left/right edges */
  mask-image: linear-gradient(to right, transparent, black 50px, black calc(100% - 50px), transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, black 50px, black calc(100% - 50px), transparent);
}

.tabs-nav::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

/* Navigation Arrows */
.nav-arrow {
  position: absolute;
  z-index: 10;
  background: #1e1b4b;
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 0 15px rgba(0,0,0,0.5);
}

.nav-arrow:hover {
  background: #6366f1;
  color: white;
  transform: scale(1.1);
}

.nav-arrow.left { left: 8px; }
.nav-arrow.right { right: 8px; }

/* Individual Tab Links */
.tab-link {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 10px 20px;
  font-size: 0.85rem;
  font-weight: 700;
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
  transition: 0.2s;
}

.tab-link:hover {
  color: white;
}

.tab-link.active {
  color: #6366f1;
}

/* Active Underline Glow */
.tab-link.active::after {
  content: "";
  position: absolute;
  bottom: -2px;
  left: 20px;
  right: 20px;
  height: 3px;
  background: #6366f1;
  border-radius: 10px;
  box-shadow: 0 -2px 10px rgba(99, 102, 241, 0.6);
}

/* Mobile: Disable arrows and fade for touch swiping */
@media (max-width: 768px) {
  .nav-arrow { display: none; }
  .tabs-nav { 
    padding: 10px 0; 
    mask-image: none; 
    -webkit-mask-image: none; 
  }
}
</style>
