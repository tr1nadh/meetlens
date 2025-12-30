<script>
  export let transcript = "";
  export let toneResult = null; 
  export let toneLoading = false;
  export let analyzeTone = () => {};

  $: sentimentConfig = {
    positive: { color: 'var(--emerald-primary)', icon: 'fa-face-smile-beam' },
    negative: { color: '#ff5f5f', icon: 'fa-face-frown-open' }, // Brightened for visibility
    mixed: { color: 'var(--warning-primary)', icon: 'fa-face-meh' },
    neutral: { color: 'var(--indigo-light)', icon: 'fa-face-neutral' }
  }[toneResult?.sentiment] || { color: '#ffffff', icon: 'fa-circle-info' };

  $: confidenceWidth = toneResult?.confidenceLevel === 'High' ? '100%' : (toneResult?.confidenceLevel === 'Medium' ? '65%' : '35%');
</script>

<div class="enterprise-theme-context">
  <div class="card glass-card mb-3">
    <div class="card-body p-4">
      
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h5 class="text-white fw-bold mb-0">
          <i class="fa-solid fa-bolt-lightning me-2 text-indigo-bright"></i>
          Tone & Sentiment
        </h5>
        {#if toneResult && !toneLoading}
          <div class="confidence-meter-wrapper">
            <span class="text-label-bright x-small fw-bold mb-1 d-block text-end">AI CONFIDENCE</span>
            <div class="confidence-bar-bg">
              <div class="confidence-bar-fill shadow-glow-indigo" style="width: {confidenceWidth}"></div>
            </div>
          </div>
        {/if}
      </div>

      {#if toneLoading}
        <div class="analysis-loader py-4 text-center">
          <div class="spinner-border text-indigo-bright mb-3" role="status"></div>
          <p class="text-white small animate-pulse">Deconstructing conversational subtext...</p>
        </div>
      {:else if toneResult}
        <div class="tone-summary-box mb-4">
          <div class="row g-0 align-items-center">
            <div class="col-7 p-3">
              <span class="text-label-bright small d-block mb-1">PRIMARY TONE</span>
              <h4 class="text-white fw-bold m-0 text-capitalize">{toneResult.tone}</h4>
            </div>
            <div class="col-5 p-3 border-left-glass text-center">
              <span class="text-label-bright small d-block mb-1">SENTIMENT</span>
              <div class="d-flex align-items-center justify-content-center gap-2" style="color: {sentimentConfig.color}">
                <i class="fa-solid {sentimentConfig.icon} fs-5"></i>
                <span class="fw-bold text-uppercase small">{toneResult.sentiment}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="mb-4">
          <div class="result-box-enterprise">
            <i class="fa-solid fa-quote-left text-indigo-bright opacity-50 me-2"></i>
            <span class="text-white-contrast">{toneResult.summary}</span>
          </div>
        </div>

        <div class="mb-4">
          <span class="text-label-bright small d-block mb-2 fw-bold">EMOTIONAL SPECTRUM</span>
          <div class="d-flex flex-wrap gap-2">
            {#each (toneResult.emotions ?? []) as emotion}
              <span class="emotion-chip">{emotion}</span>
            {/each}
          </div>
        </div>

        <div class="mb-4">
          <div class="d-flex align-items-center gap-2 mb-2">
            <span class="text-warning-bright small fw-bold text-uppercase">Critical Risk Signals</span>
            <div class="h-px bg-warning flex-grow-1 opacity-25"></div>
          </div>
          <div class="risk-container p-2">
            {#each (toneResult.riskSignals ?? []) as risk}
              <div class="risk-entry p-2 mb-1">
                <i class="fa-solid fa-triangle-exclamation text-warning-bright mt-1"></i>
                <span class="text-white-contrast">{risk}</span>
              </div>
            {:else}
              <div class="text-emerald-bright small p-2 fw-bold">
                <i class="fa-solid fa-shield-check me-2"></i>No conversational risks detected.
              </div>
            {/each}
          </div>
        </div>
        
        <button class="btn btn-outline-indigo w-100 py-2" on:click={analyzeTone}>
          <i class="fa-solid fa-rotate-right me-2"></i> Refresh Analysis
        </button>

      {:else}
        <div class="empty-state text-center py-4">
          <div class="empty-icon-circle mb-3">
            <i class="fa-solid fa-brain text-indigo-bright"></i>
          </div>
          <p class="text-label-bright small px-4 mb-4">Analyze the transcript to reveal unstated risks, emotional undertones, and overall sentiment.</p>
          <button 
            class="btn btn-indigo-glow w-100 py-2" 
            disabled={!transcript?.trim()} 
            on:click={analyzeTone}
          >
            <i class="fa-solid fa-wand-magic-sparkles me-2"></i> Run Tone Analysis
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .enterprise-theme-context {
    --bg-dark-soft: #0e111d;
    --indigo-primary: #6366f1;
    --indigo-bright: #818cf8;
    --indigo-light: #a5b4fc;
    --emerald-primary: #10b981;
    --emerald-bright: #34d399;
    --warning-primary: #f59e0b;
    --warning-bright: #fbbf24;
    --error-primary: #ef4444;
    --border-glass: rgba(255, 255, 255, 0.12);
    --text-label: #a1a1aa; /* High contrast muted text */
  }

  .glass-card {
    background: var(--bg-dark-soft) !important;
    border: 1px solid var(--border-glass) !important;
    border-radius: 20px;
  }

  /* High Visibility Text Classes */
  .text-label-bright { color: var(--text-label); }
  .text-white-contrast { color: #f8fafc; line-height: 1.5; }
  .text-indigo-bright { color: var(--indigo-bright); }
  .text-warning-bright { color: var(--warning-bright); }
  .text-emerald-bright { color: var(--emerald-bright); }

  /* Confidence Meter */
  .confidence-meter-wrapper { width: 100px; }
  .confidence-bar-bg { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
  .confidence-bar-fill { height: 100%; background: var(--indigo-primary); transition: width 1s ease-out; }

  /* Tone Stats Box */
  .tone-summary-box {
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid var(--border-glass);
    border-radius: 16px;
  }
  .border-left-glass { border-left: 1px solid var(--border-glass); }

  .emotion-chip {
    background: rgba(99, 102, 241, 0.15);
    border: 1px solid rgba(129, 140, 248, 0.4);
    color: #ffffff;
    border-radius: 8px;
    padding: 4px 12px;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .risk-container {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
  }

  .risk-entry {
    font-size: 0.9rem;
    display: flex;
    gap: 12px;
    align-items: flex-start;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  }
  .risk-entry:last-child { border-bottom: none; }

  .result-box-enterprise {
    background: rgba(99, 102, 241, 0.05);
    border-left: 3px solid var(--indigo-primary);
    padding: 16px;
    border-radius: 0 12px 12px 0;
  }

  .empty-icon-circle {
    width: 60px; height: 60px;
    background: rgba(99, 102, 241, 0.1);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto;
    font-size: 1.5rem;
  }

  .btn-indigo-glow {
    background: var(--indigo-primary);
    color: white; border: none; border-radius: 10px;
    font-weight: 700; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
  }

  .btn-outline-indigo {
    border: 1px solid var(--indigo-primary);
    color: var(--indigo-light);
    background: transparent; border-radius: 10px;
    font-weight: 600;
  }

  .shadow-glow-indigo { box-shadow: 0 0 10px var(--indigo-primary); }
  .h-px { height: 1px; }
  .x-small { font-size: 0.65rem; }
  .animate-pulse { animation: pulse 2s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
</style>