<script>
  export let summary = "";
  export let summaryLoading = false;
  export let transcript = "";
  
  let summaryCopied = false;

  export let generateSummary = () => {};

  async function copySummary() {
    await navigator.clipboard.writeText(summary);
    summaryCopied = true;
    setTimeout(() => (summaryCopied = false), 2000);
  }
</script>

<div class="card glass-card mb-3">
  <div class="card-body p-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h5 class="text-white fw-bold mb-0">
        <i class="fa-solid fa-brain me-2 text-purple"></i> Summary
      </h5>
      {#if summary && !summaryLoading}
        <button 
          class="btn btn-sm btn-outline-glass copy-btn" 
          on:click={copySummary}
        >
          <i class="fa-solid {summaryCopied ? 'fa-check text-success' : 'fa-copy'}"></i>
        </button>
      {/if}
    </div>

    {#if summaryLoading}
      <div class="skeleton-wrapper mb-4">
        <div class="skeleton-line w-100"></div>
        <div class="skeleton-line w-100"></div>
        <div class="skeleton-line w-75"></div>
        <div class="mt-3 text-light-muted x-small animate-pulse">
          <i class="fa-solid fa-sparkles me-1 text-purple"></i> AI is thinking...
        </div>
      </div>
      <button class="btn btn-purple-glow w-100 py-2 disabled-loading" disabled>
        <span class="spinner-grow spinner-grow-sm me-2" role="status" aria-hidden="true"></span>
        Processing...
      </button>
    {:else if summary}
      <div class="summary-content mb-4">
        <p class="text-light-muted leading-relaxed summary-text">
          {summary}
        </p>
      </div>
      
      <button 
        class="btn btn-outline-purple w-100 py-2" 
        on:click={generateSummary}
      >
        <i class="fa-solid fa-rotate-right me-2"></i> Re-generate Analysis
      </button>
    {:else}
      <button 
        class="btn btn-purple-glow w-100 py-2" 
        disabled={!transcript.trim()} 
        on:click={generateSummary}
      >
        <i class="fa-solid fa-wand-magic-sparkles me-2"></i> Generate Summary
      </button>
    {/if}
  </div>
</div>

<style>
  .glass-card {
    background: rgba(255, 255, 255, 0.03) !important;
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 20px;
  }

  /* --- SKELETON ANIMATION --- */
  .skeleton-line {
    height: 12px;
    margin-bottom: 12px;
    background: linear-gradient(
      90deg, 
      rgba(255, 255, 255, 0.05) 25%, 
      rgba(255, 255, 255, 0.1) 50%, 
      rgba(255, 255, 255, 0.05) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite linear;
    border-radius: 4px;
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  .x-small {
    font-size: 0.7rem;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .summary-text {
    line-height: 1.7;
    font-size: 0.95rem;
    color: #cbd5e1 !important;
  }

  .text-purple { color: #a855f7 !important; }
  .text-light-muted { color: #94a3b8 !important; }

  /* --- MEDIUM BUTTONS --- */
  .btn-purple-glow {
    background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%);
    color: white;
    border: none;
    font-weight: 600;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(168, 85, 247, 0.2);
    transition: all 0.2s ease;
  }

  .btn-purple-glow:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(168, 85, 247, 0.3);
    filter: brightness(1.1);
  }

  .btn-purple-glow:disabled {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.2);
    box-shadow: none;
  }

  .disabled-loading {
    opacity: 0.8;
    cursor: wait;
  }

  .btn-outline-purple {
    background: rgba(168, 85, 247, 0.03);
    border: 1px solid rgba(168, 85, 247, 0.3);
    color: #a855f7;
    font-weight: 600;
    border-radius: 12px;
    transition: all 0.2s ease;
  }

  .btn-outline-purple:hover {
    background: rgba(168, 85, 247, 0.1);
    border-color: #a855f7;
    color: #a855f7;
  }

  .btn-outline-glass {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    padding: 4px 10px;
    border-radius: 8px;
  }

  .animate-pulse {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>