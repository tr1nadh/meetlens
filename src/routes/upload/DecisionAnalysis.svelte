<script>
    export let transcript = "";
    export let keyDecisions = []; 
    export let keyDecisionsLoading = false;
    export let generateKeyDecisions = () => {};

    let copied = false;

    function copyAllDecisions() {
        if (!keyDecisions || keyDecisions.length === 0) return;

        const text = keyDecisions.map((item, i) => {
            return `${i + 1}. DECISION: ${item.decision}\n   BY: ${item.decisionMaker ?? 'Consensus'}\n   CONFIDENCE: ${item.confidenceLevel ?? 'High'}\n`;
        }).join('\n');

        const header = `--- KEY DECISIONS SUMMARY ---\n\n`;
        navigator.clipboard.writeText(header + text);
        
        copied = true;
        setTimeout(() => copied = false, 2000);
    }
</script>

<div class="enterprise-theme-context">
  <div class="card glass-card mb-3">
    <div class="card-body p-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h5 class="text-white fw-bold m-0">
          <i class="fa-solid fa-gavel me-2 text-indigo"></i> 
          Key Decisions
        </h5>
        
        {#if keyDecisions && keyDecisions.length > 0 && !keyDecisionsLoading}
          <button 
            class="btn btn-copy-all {copied ? 'active' : ''}" 
            on:click={copyAllDecisions}
          >
            {#if copied}
              <i class="fa-solid fa-check me-1"></i> Copied!
            {:else}
              <i class="fa-solid fa-copy me-1"></i> Copy All
            {/if}
          </button>
        {/if}
      </div>

      {#if keyDecisionsLoading}
        <div class="text-indigo mb-2 small animate-pulse d-flex align-items-center">
          <i class="fa-solid fa-spinner fa-spin me-2"></i> 
          <span class="text-white">Analyzing transcript for final calls...</span>
        </div>
      {:else if keyDecisions && keyDecisions.length > 0}
        <div class="decision-list mb-4">
          {#each keyDecisions as item}
            <div class="decision-item mb-3">
              <div class="decision-card-inner">
                <div class="d-flex justify-content-between align-items-start">
                  <div class="d-flex gap-3">
                    <div class="decision-icon">
                      <i class="fa-solid fa-check-double"></i>
                    </div>
                    <div class="decision-content">
                      <p class="text-white mb-2 fw-medium leading-relaxed">
                        {item.decision ?? "No decision text provided"}
                      </p>
                      
                      <div class="d-flex flex-wrap gap-2">
                        <span class="decision-meta">
                          <i class="fa-solid fa-user-tie me-1"></i> {item.decisionMaker ?? "Consensus"}
                        </span>
                        
                        <span class="badge-confidence {(item.confidenceLevel ?? 'High').toLowerCase()}">
                          {item.confidenceLevel ?? "High"} Confidence
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="evidence-wrapper">
                    <button class="btn-info-tool" aria-label="Show Evidence">
                      <i class="fa-solid fa-circle-info"></i>
                    </button>
                    <div class="evidence-popover shadow-glow-indigo">
                      <div class="popover-header">CONTEXT & EVIDENCE</div>
                      <div class="popover-body">
                        <p class="mb-2 text-indigo-light italic x-small">
                          "{item.context ?? 'No context provided'}"
                        </p>
                        <ul class="evidence-list m-0 p-0">
                          {#each (item.evidence ?? []) as snippet}
                            <li>{snippet}</li>
                          {:else}
                             <li class="opacity-50">No specific evidence segments found.</li>
                          {/each}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>

        <button class="btn btn-outline-indigo w-100 py-2" on:click={generateKeyDecisions}>
          <i class="fa-solid fa-rotate-right me-2"></i> Re-analyze Decisions
        </button>
      {:else}
        <div class="empty-state text-center py-2">
          <p class="text-light-muted small mb-4">Capture the final resolutions and agreed-upon paths from the meeting.</p>
          <button 
            class="btn btn-indigo-glow w-100 py-2" 
            disabled={!transcript?.trim()} 
            on:click={generateKeyDecisions}
          >
            Extract Decisions
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .enterprise-theme-context {
    --indigo-primary: #6366f1;
    --indigo-light: #a5b4fc;
    --indigo-glow: rgba(99, 102, 241, 0.4);
    --bg-dark-surface: #05070a;
    --bg-card: #0e111d;
    --glass-border: rgba(255, 255, 255, 0.1);
    --text-muted: #94a3b8;
  }

  .glass-card {
    background: var(--bg-card) !important;
    border: 1px solid var(--glass-border) !important;
    border-radius: 20px;
    overflow: visible !important;
  }

  /* Copy All Button Styles */
  .btn-copy-all {
    background: rgba(99, 102, 241, 0.1);
    border: 1px solid rgba(99, 102, 241, 0.3);
    color: var(--indigo-light);
    font-size: 0.75rem;
    font-weight: 700;
    padding: 6px 14px;
    border-radius: 8px;
    transition: all 0.2s ease;
    cursor: pointer;
  }

  .btn-copy-all:hover {
    background: var(--indigo-primary);
    color: white;
    box-shadow: 0 0 10px var(--indigo-glow);
  }

  .btn-copy-all.active {
    background: #10b981;
    border-color: #10b981;
    color: white;
  }

  .decision-item {
    background: rgba(99, 102, 241, 0.03);
    border: 1px solid rgba(99, 102, 241, 0.15);
    border-left: 3px solid var(--indigo-primary);
    border-radius: 12px;
  }

  .decision-card-inner { padding: 16px; position: relative; }

  .decision-icon {
    background: rgba(99, 102, 241, 0.1);
    color: var(--indigo-primary);
    width: 32px; height: 32px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.8rem; flex-shrink: 0;
  }

  .decision-meta {
    font-size: 0.65rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 700;
  }

  .badge-confidence {
    font-size: 0.6rem;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 800;
    text-transform: uppercase;
  }
  .badge-confidence.high { background: rgba(16, 185, 129, 0.1); color: #10b981; }
  .badge-confidence.medium { background: rgba(245, 158, 11, 0.1); color: #fbbf24; }
  .badge-confidence.low { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

  .evidence-wrapper { position: relative; }
  
  .btn-info-tool {
    background: transparent; border: none;
    color: var(--text-muted); cursor: pointer;
    transition: color 0.2s;
  }
  .btn-info-tool:hover { color: var(--indigo-primary); }

  .evidence-popover {
    visibility: hidden; opacity: 0;
    position: absolute; bottom: 130%; right: 0;
    width: 280px; background: var(--bg-dark-surface);
    border: 1px solid var(--indigo-primary);
    border-radius: 12px; z-index: 100;
    transition: all 0.2s ease;
    pointer-events: none;
  }

  .evidence-wrapper:hover .evidence-popover {
    visibility: visible; opacity: 1;
    bottom: 140%;
  }

  .popover-header {
    background: rgba(99, 102, 241, 0.1);
    color: var(--indigo-primary);
    font-size: 0.65rem; font-weight: 800;
    padding: 6px 12px; border-bottom: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: 11px 11px 0 0;
  }

  .popover-body { padding: 12px; color: white; font-size: 0.8rem; }
  
  .evidence-list { list-style: none; }
  .evidence-list li {
    position: relative; padding-left: 15px; margin-bottom: 5px;
    font-size: 0.75rem; color: rgba(255,255,255,0.8);
  }
  .evidence-list li::before {
    content: "•"; color: var(--indigo-primary);
    position: absolute; left: 0; font-weight: bold;
  }

  .shadow-glow-indigo {
    box-shadow: 0 10px 30px rgba(0,0,0,0.8), 0 0 15px rgba(99, 102, 241, 0.2);
  }

  .btn-indigo-glow {
    background: var(--indigo-primary); color: white; border: none;
    border-radius: 10px; font-weight: 700;
    box-shadow: 0 4px 15px var(--indigo-glow);
  }

  .btn-outline-indigo {
    border: 1px solid var(--indigo-primary); color: var(--indigo-primary);
    background: transparent; border-radius: 10px; font-weight: 600;
  }

  .btn-outline-indigo:hover { background: var(--indigo-primary); color: white; }

  .animate-pulse { animation: pulse 2s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  .x-small { font-size: 0.7rem; }
  .italic { font-style: italic; }
</style>