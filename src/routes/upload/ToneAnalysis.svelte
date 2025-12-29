<script>
  export let transcript = "";
  export let toneResult = null;
  export let toneLoading = false;
  export let analyzeTone = () => {};

  $: sentimentColor = toneResult?.sentiment === 'mixed' ? 'var(--warning-primary)' : 'var(--emerald-primary)';
</script>

<div class="enterprise-theme-context">
  <div class="card glass-card mb-3">
    <div class="card-body p-4">
      
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h5 class="text-white fw-bold mb-0">
          <i class="fa-solid fa-ear-listen me-2 text-indigo"></i>
          Tone Analysis
        </h5>
        {#if toneResult && !toneLoading}
          <span class="badge badge-glass px-3 py-2">
            CONFIDENCE: {toneResult.confidenceLevel.toUpperCase()}
          </span>
        {/if}
      </div>

      {#if toneLoading}
        <div class="text-indigo mb-2 small animate-pulse d-flex align-items-center">
          <i class="fa-solid fa-spinner fa-spin me-2"></i> 
          <span class="text-white">Analyzing conversation dynamics...</span>
        </div>
      {:else if toneResult}
        <div class="tone-grid mb-4">
          <div class="tone-item flex-grow-1">
            <span class="text-light-muted small d-block mb-1">OVERALL TONE</span>
            <span class="badge badge-indigo shadow-glow tone-badge-large">
              {toneResult.tone}
            </span>
          </div>
          <div class="tone-item border-left-glass ps-4 sentiment-col">
            <span class="text-light-muted small d-block mb-1">SENTIMENT</span>
            <span class="text-white fw-bold text-capitalize d-flex align-items-center" style="color: {sentimentColor} !important">
               <i class="fa-solid fa-circle-info me-2"></i>
               {toneResult.sentiment}
            </span>
          </div>
        </div>

        <div class="mb-4">
          <span class="text-light-muted small d-block mb-2">DETECTED EMOTIONS</span>
          <div class="d-flex flex-wrap gap-2">
            {#each toneResult.emotions as emotion}
              <span class="emotion-chip">{emotion}</span>
            {/each}
          </div>
        </div>

        <div class="mb-4">
          <span class="text-warning small fw-bold d-block mb-2">CRITICAL RISK SIGNALS</span>
          <div class="risk-container p-3">
            {#each toneResult.riskSignals as risk}
              <div class="risk-entry">
                <i class="fa-solid fa-triangle-exclamation text-warning me-2"></i>
                {risk}
              </div>
            {/each}
          </div>
        </div>
<!-- 
        <div class="mb-3">
          <span class="text-light-muted small d-block mb-2">EXECUTIVE SUMMARY</span>
          <div class="result-box-enterprise">
            <i class="fa-solid fa-quote-left me-2 text-purple opacity-75"></i>
            {toneResult.summary}
          </div>
        </div> -->
        
        <button class="btn btn-outline-indigo w-100 py-2 mt-2" on:click={analyzeTone}>
          <i class="fa-solid fa-rotate-right me-2"></i> Re-analyze Tone
        </button>

      {:else}
        <div class="empty-state">
          <p class="text-light-muted small mb-4">Extract emotional insights and potential risks from your transcript.</p>
          <button 
            class="btn btn-indigo-glow w-100 py-2" 
            disabled={!transcript || transcript.trim().length === 0} 
            on:click={analyzeTone}
          >
            <i class="fa-solid fa-wand-magic-sparkles me-2"></i> Analyze Tone
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  /* --- CSS Variables --- */
  .enterprise-theme-context {
    --bg-dark: #070910;
    --bg-dark-soft: #0e111d;
    --indigo-primary: #6366f1;
    --purple-primary: #a855f7;
    --emerald-primary: #10b981;
    --warning-primary: #f59e0b;
    --border-glass: rgba(255, 255, 255, 0.1);
    --text-muted: #94a3b8;
    background-color: var(--bg-dark);
    padding: 10px;
    border-radius: 20px;
  }

  .text-light-muted { color: var(--text-muted); }
  .text-indigo { color: var(--indigo-primary); }
  .text-purple { color: var(--purple-primary); }
  .text-warning { color: var(--warning-primary); }
  .text-emerald { color: var(--emerald-primary); }

  .glass-card {
    background: var(--bg-dark-soft) !important;
    border: 1px solid var(--border-glass) !important;
    border-radius: 20px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  }

  /* Modified Tone Grid for wider text support */
  .tone-grid {
    display: grid;
    /* First column grows, second stays as large as content */
    grid-template-columns: 1fr auto; 
    background: rgba(0, 0, 0, 0.2);
    padding: 15px;
    border-radius: 12px;
    border: 1px solid var(--border-glass);
    gap: 10px;
  }

  .sentiment-col {
    min-width: 140px; /* Ensures sentiment doesn't disappear */
  }

  .border-left-glass {
    border-left: 1px solid var(--border-glass);
  }

  .badge-indigo {
    background: var(--indigo-primary);
    color: white;
    padding: 6px 14px;
    border-radius: 8px;
    font-weight: 600;
    box-shadow: 0 0 15px rgba(99, 102, 241, 0.3);
  }

  /* Specific style for long tone descriptions */
  .tone-badge-large {
    display: inline-block;
    white-space: normal;
    word-break: break-word;
    line-height: 1.4;
    text-align: left;
  }

  .badge-glass {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-glass);
    color: var(--indigo-primary);
    font-weight: 700;
    font-size: 0.65rem;
  }

  .emotion-chip {
    background: rgba(168, 85, 247, 0.1);
    border: 1px solid rgba(168, 85, 247, 0.3);
    color: white;
    border-radius: 8px;
    padding: 5px 14px;
    font-size: 0.8rem;
  }

  .risk-container {
    background: rgba(245, 158, 11, 0.03);
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: 12px;
  }

  .risk-entry {
    color: white;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    margin-bottom: 4px;
  }

  .result-box-enterprise {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid var(--border-glass);
    border-radius: 12px;
    padding: 18px;
    color: white !important;
    font-size: 0.95rem;
    line-height: 1.7;
    font-style: italic;
  }

  .btn-indigo-glow {
    background: var(--indigo-primary);
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 700;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
  }

  .btn-outline-indigo {
    border: 1px solid var(--indigo-primary);
    color: var(--indigo-primary);
    background: transparent;
    border-radius: 10px;
    transition: 0.3s;
  }

  .btn-outline-indigo:hover {
    background: var(--indigo-primary);
    color: white;
  }

  .animate-pulse {
    animation: pulse 2s infinite;
  }

  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
</style>