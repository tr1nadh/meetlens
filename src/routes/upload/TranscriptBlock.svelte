<script>
  import { fade } from 'svelte/transition';

  // --- Props ---
  export let transcript = ""; 
  export let speakerIds = []; 
  export let speakerMap = {}; 
  export let isPlaying = false; 
  export let highlightWords = []; 
  export let currentWordIndex = 0;

  // --- Internal State ---
  let dialogueBlocks = [];
  let isStructured = false;
  let showUploadModal = false;
  let rawInputText = "";
  let copied = false;
  let playbackSpeed = 1; 

  let activeSpeakerId = "";
  let tempSpeakerName = "";

  // --- Reactivity ---
  
  // 1. Determine if transcript is structured and parse it
  $: {
    isStructured = /Speaker\s+SPEAKER_\d+/i.test(transcript);
    if (isStructured) {
      parseTranscript(transcript);
    }
  }

  // 2. Centering Logic: Scroll the active word into view smoothly in Listening Mode
  $: if (isPlaying && currentWordIndex !== undefined) {
    setTimeout(() => {
      const activeElem = document.querySelector('.word-active');
      if (activeElem) {
        activeElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  }

  // 3. Keep speaker list unique and reactive
  $: if (isStructured && transcript) {
    const matches = transcript.match(/SPEAKER_\d+/gi) || [];
    const uniqueIds = [...new Set(matches)];
    if (JSON.stringify(uniqueIds) !== JSON.stringify(speakerIds)) {
      speakerIds = uniqueIds;
    }
  }

  function parseTranscript(text) {
    const pattern = /(?=Speaker\s+SPEAKER_\d+:)/gi;
    const parts = text.split(pattern).filter(p => p.trim() !== "");

    dialogueBlocks = parts.map(part => {
      const colonIndex = part.indexOf(':');
      if (colonIndex !== -1) {
        const rawHeader = part.substring(0, colonIndex).trim();
        const match = rawHeader.match(/SPEAKER_\d+/i);
        const idKey = match ? match[0] : rawHeader;
        
        return {
          rawHeader: rawHeader,
          idKey: idKey,
          content: part.substring(colonIndex + 1).trim()
        };
      }
      return { rawHeader: "Unknown", idKey: "Unknown", content: part.trim() };
    });
  }

  function handleBlockEdit(index, newText) {
    dialogueBlocks[index].content = newText;
    syncTranscript();
  }

  function syncTranscript() {
    transcript = dialogueBlocks
      .map(b => `${b.rawHeader}: ${b.content}`)
      .join('\n\n');
  }

  async function copyTranscript() {
    if (!transcript.trim()) return;
    try {
      const exportText = dialogueBlocks
        .map(b => `${speakerMap[b.idKey] || b.rawHeader}: ${b.content}`)
        .join('\n\n');
      await navigator.clipboard.writeText(exportText);
      copied = true;
      setTimeout(() => { copied = false; }, 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  }

  function submitUpload() {
    transcript = rawInputText;
    showUploadModal = false;
    rawInputText = "";
  }

  function openSpeakerModal(id) {
    activeSpeakerId = id;
    tempSpeakerName = speakerMap[id] || "";
  }

  function saveSpeakerName() {
    if (activeSpeakerId) {
      speakerMap[activeSpeakerId] = tempSpeakerName.trim();
      speakerMap = { ...speakerMap }; 
    }
  }

  function toggleSpeed() {
    const speeds = [1, 1.25, 1.5, 2];
    let nextIndex = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    playbackSpeed = speeds[nextIndex];
    const media = document.querySelector('audio, video');
    if (media) media.playbackRate = playbackSpeed;
  }
</script>

<div class="card glass-card h-100 shadow-lg border-0">
  <div class="card-body p-4 d-flex flex-column">
    
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h5 class="text-white fw-bold mb-0 title-accent">
        <i class="fa-solid fa-feather-pointed me-2 text-indigo"></i>
        Transcript Editor
      </h5>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-glass" on:click={() => { rawInputText = transcript; showUploadModal = true; }}>
          <i class="fa-solid fa-plus me-1"></i> Add Raw
        </button>
        <button class="btn btn-sm btn-outline-glass" disabled={!transcript.trim()} on:click={copyTranscript}>
          <i class={`fa-solid ${copied ? "fa-check text-success" : "fa-copy"} me-1`}></i>
          {copied ? "Copied" : "Copy Final"}
        </button>
      </div>
    </div>

    {#if isStructured && speakerIds.length}
      <div class="mb-3 d-flex flex-wrap gap-2 transition-fade {isPlaying ? 'hide-speakers' : ''}">
        {#each speakerIds as id}
          <button 
            class="btn speaker-chip-label" 
            data-bs-toggle="modal" 
            data-bs-target="#speakerModal"
            on:click={() => openSpeakerModal(id)}>
            <i class="fa-solid fa-tag me-2 x-small"></i>
            <span>{id}</span> 
            {#if speakerMap[id]}
              <span class="ms-1 name-mapping-text">({speakerMap[id]})</span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}

    <div class="transcript-container flex-grow-1 position-relative">
      {#if isPlaying}
        <div class="listening-mode-container h-100 d-flex flex-column" in:fade>
          <div class="listening-header">
            <div class="focus-badge">
              <span class="pulse-dot"></span>
              Live Sync
            </div>
            <button class="speed-toggle" on:click={toggleSpeed}>
              {playbackSpeed}x
            </button>
          </div>
          
          <div class="highlight-viewport scroll-hide" id="highlight-container">
            {#each highlightWords as word, i}
              <span class="word-span {i === currentWordIndex ? 'word-active' : 'word-idle'}">
                {word} 
              </span>
            {/each}
          </div>
        </div>

      {:else if isStructured}
        <div class="dialogue-list custom-scroll">
          {#each dialogueBlocks as block, i}
            <div class="dialogue-box mb-3" in:fade={{ duration: 150 }}>
              <div class="dialogue-header d-flex align-items-center mb-2">
                <span class="active-speaker-name">
                  {speakerMap[block.idKey] || block.rawHeader}
                </span>
              </div>
              <div 
                class="dialogue-text-area"
                contenteditable="true"
                spellcheck="false"
                on:blur={(e) => handleBlockEdit(i, e.target.innerText)}
              >
                {block.content}
              </div>
            </div>
          {/each}
        </div>

      {:else}
        <textarea
          class="form-control form-control-custom w-100 h-100"
          spellcheck="false"
          bind:value={transcript}
          placeholder="Paste transcript here (e.g., Speaker SPEAKER_00: Hello)"
        ></textarea>
      {/if}
    </div>
  </div>
</div>

{#if showUploadModal}
<div class="custom-modal-overlay" transition:fade={{ duration: 150 }}>
  <div class="modal-dialog modal-dialog-centered w-100" style="max-width: 600px;">
    <div class="modal-content glass-card p-4 border-indigo shadow-2xl">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="text-white fw-bold mb-0">Import Transcript</h5>
        <button class="btn-close btn-close-white" on:click={() => showUploadModal = false}></button>
      </div>
      <textarea 
        class="form-control form-control-custom mb-3" 
        rows="12" 
        bind:value={rawInputText}
        placeholder="Speaker SPEAKER_00: Message content..."
      ></textarea>
      <div class="d-flex gap-2 justify-content-end">
        <button class="btn btn-outline-glass px-4" on:click={() => showUploadModal = false}>Cancel</button>
        <button class="btn btn-indigo-glow px-4" on:click={submitUpload}>Generate Dialogs</button>
      </div>
    </div>
  </div>
</div>
{/if}

<div class="modal fade" id="speakerModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content glass-card p-3 shadow-2xl border-indigo">
      <div class="modal-header border-0">
        <h5 class="modal-title text-white fw-bold">Rename {activeSpeakerId}</h5>
        <button class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <label class="form-label small text-secondary mb-2">Display Name</label>
        <input
          type="text"
          class="form-control form-control-custom"
          bind:value={tempSpeakerName}
          placeholder="e.g. John Doe" />
      </div>
      <div class="modal-footer border-0">
        <button class="btn btn-outline-glass" data-bs-dismiss="modal">Cancel</button>
        <button class="btn btn-indigo-glow" data-bs-dismiss="modal" on:click={saveSpeakerName}>
          Apply Changes
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .glass-card { 
    background: #0e111d !important; 
    border: 1px solid rgba(255, 255, 255, 0.08) !important; 
    border-radius: 20px; 
  }

  /* Dialogue Box Styles (Restored and Improved Visibility) */
  .dialogue-list { max-height: 700px; overflow-y: auto; padding-right: 12px; }
  
  .dialogue-box {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 16px;
    transition: background 0.2s;
  }
  .dialogue-box:hover { background: rgba(255, 255, 255, 0.05); }

  .active-speaker-name { 
    font-family: 'Monaco', monospace; 
    font-size: 0.8rem; 
    color: #818cf8; 
    font-weight: 700; 
    text-transform: uppercase; 
    letter-spacing: 0.5px; 
  }
  
  .dialogue-text-area { 
    color: #ffffff; 
    font-size: 0.95rem; 
    line-height: 1.6; 
    outline: none; 
    min-height: 24px; 
    opacity: 0.9;
  }

  /* Speaker Chips */
  .speaker-chip-label {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #818cf8;
    padding: 6px 14px;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .name-mapping-text { font-weight: 400; color: rgba(255, 255, 255, 0.5); font-style: italic; }

  /* Listening Mode Sync Styles */
  .listening-mode-container {
    background: #090c14;
    border-radius: 20px;
    padding: 20px;
    border: 1px solid rgba(129, 140, 248, 0.2);
  }

  .listening-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .highlight-viewport {
    flex-grow: 1;
    overflow-y: auto;
    font-size: 1.5rem;
    line-height: 1.8;
    padding: 60px 10px;
    text-align: center;
    mask-image: linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%);
  }

  .word-span {
    display: inline-block;
    margin: 0 5px;
    transition: all 0.25s ease;
  }

  .word-active {
    color: #ffffff;
    font-weight: 700;
    transform: scale(1.1);
    text-shadow: 0 0 15px rgba(129, 140, 248, 0.6);
  }

  .word-idle { color: rgba(255, 255, 255, 0.2); }

  .speed-toggle {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    color: #cbd5e1;
    border-radius: 8px;
    padding: 2px 12px;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .focus-badge {
    background: rgba(129, 140, 248, 0.1);
    border: 1px solid rgba(129, 140, 248, 0.3);
    color: #818cf8;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pulse-dot {
    width: 8px; height: 8px; background: #818cf8; border-radius: 50%;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.5); opacity: 0.4; }
    100% { transform: scale(1); opacity: 1; }
  }

  /* General Utilities */
  .form-control-custom { 
    background: rgba(255, 255, 255, 0.04) !important; 
    border: 1px solid rgba(255, 255, 255, 0.1) !important; 
    color: white !important; 
    border-radius: 12px !important;
  }

  .btn-indigo-glow { 
    background: #6366f1; color: white; border-radius: 12px; 
    font-weight: 600; border: none; padding: 10px 24px; 
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); 
  }
  
  .btn-outline-glass { 
    background: rgba(255, 255, 255, 0.05); 
    border: 1px solid rgba(255, 255, 255, 0.1); 
    color: #94a3b8; border-radius: 10px; 
  }

  .scroll-hide::-webkit-scrollbar { display: none; }
  .custom-scroll::-webkit-scrollbar { width: 6px; }
  .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }

  .hide-speakers { opacity: 0; pointer-events: none; transform: translateY(-10px); }
  .transition-fade { transition: all 0.4s ease; }
  .x-small { font-size: 0.6rem; }
  .text-indigo { color: #818cf8 !important; }
  .border-indigo { border-color: #6366f1 !important; }

  .custom-modal-overlay { 
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
    background: rgba(8, 9, 15, 0.85); backdrop-filter: blur(8px); 
    z-index: 9999; display: flex; align-items: center; justify-content: center; 
  }
</style>