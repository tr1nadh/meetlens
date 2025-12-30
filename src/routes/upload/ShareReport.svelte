<script>
  import { onMount } from 'svelte';

  let html2canvas;
  let jsPDF;
  let isExporting = false;

  onMount(async () => {
    // Dynamic imports to prevent SSR issues
    const h2cModule = await import('html2canvas');
    const jspdfModule = await import('jspdf');
    html2canvas = h2cModule.default;
    jsPDF = jspdfModule.default;
  });

  async function downloadPDF() {
    const element = document.getElementById('analysis-dashboard');
    const modalElement = document.getElementById('shareModal');
    
    if (!element || !html2canvas || !jsPDF) return;

    isExporting = true;

    try {
      // 1. Hide modal and backdrop from the capture engine manually
      // We don't use display:none because that might stop animations
      // We use a custom attribute that html2canvas recognizes to ignore elements
      modalElement.setAttribute('data-html2canvas-ignore', 'true');
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(b => b.setAttribute('data-html2canvas-ignore', 'true'));

      // 2. Capture the clean dashboard underneath
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0e111d', 
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Meeting_Analysis_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('PDF Export Error:', err);
    } finally {
      // 3. Clean up attributes (though not strictly necessary as they are ignored by capture)
      modalElement.removeAttribute('data-html2canvas-ignore');
      isExporting = false;
    }
  }
</script>

<button class="btn btn-outline-glass w-100 py-2 text-white" data-bs-toggle="modal" data-bs-target="#shareModal">
    <i class="fa-solid fa-share-nodes me-2"></i> Share Result
</button>

<div class="modal fade" id="shareModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content glass-card p-2 shadow-lg">
      <div class="modal-header border-0 pb-0">
        <h5 class="modal-title text-white fw-bold">
          <i class="fa-solid fa-share-nodes me-2 text-indigo"></i>Share Analysis
        </h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      
      <div class="modal-body">
        <div class="mb-4">
          <label class="text-light-muted small fw-bold mb-3 d-block">EXPORT OPTIONS</label>
          <div class="d-grid gap-2">
            <button 
              class="btn btn-outline-glass d-flex justify-content-between align-items-center py-2 px-3"
              on:click={downloadPDF}
              disabled={isExporting}
            >
              <span>
                <i class="fa-solid {isExporting ? 'fa-spinner fa-spin' : 'fa-file-pdf'} me-2 text-danger"></i> 
                {isExporting ? 'Generating...' : 'Download as PDF'}
              </span>
            </button>
            
            <button class="btn btn-outline-glass d-flex justify-content-between align-items-center py-2 px-3 disabled-feature">
              <span><i class="fa-solid fa-image me-2 text-purple"></i> Download as PNG</span>
              <span class="badge-soon">SOON</span>
            </button>
          </div>
        </div>

        <hr class="border-glass my-4" />

        <div class="mb-2">
          <label class="text-light-muted small fw-bold mb-2 d-block">SEND VIA EMAIL</label>
          <p class="text-light-muted x-small mb-3">Analysis report will be sent as an interactive HTML link.</p>
          
          <div class="input-group">
            <input 
              type="email" 
              class="form-control form-control-custom" 
              placeholder="colleague@company.com" 
            />
            <button class="btn btn-indigo-glow px-3 disabled-feature" type="button">
              <i class="fa-solid fa-paper-plane me-2"></i>Send
            </button>
          </div>
          <div class="mt-2 text-end">
              <span class="text-purple x-small fw-bold opacity-75 uppercase-tracking">EMAIL SERVICE COMING SOON</span>
          </div>
        </div>
      </div>

      <div class="modal-footer border-0 pt-0">
        <button type="button" class="btn btn-outline-glass text-white w-100 py-2" data-bs-dismiss="modal">Back to Dashboard</button>
      </div>
    </div>
  </div>
</div>

<style>
  .glass-card {
    background: #0e111d !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 20px;
  }
  .border-glass { border-color: rgba(255, 255, 255, 0.1) !important; }
  .x-small { font-size: 0.7rem; }
  .uppercase-tracking { text-transform: uppercase; letter-spacing: 1px; }
  .disabled-feature { cursor: not-allowed !important; opacity: 0.6; filter: grayscale(0.5); }
  .badge-soon {
    font-size: 0.6rem;
    background: rgba(168, 85, 247, 0.15);
    color: #a855f7;
    border: 1px solid rgba(168, 85, 247, 0.4);
    padding: 2px 8px;
    border-radius: 6px;
    font-weight: 800;
  }
  .form-control-custom {
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    color: white !important;
    border-top-left-radius: 12px !important;
    border-bottom-left-radius: 12px !important;
    padding: 10px 15px;
  }
  .form-control-custom::placeholder { color: rgba(255, 255, 255, 0.3); }
  .form-control-custom:focus {
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  }
  .btn-indigo-glow {
    background: #6366f1;
    color: white;
    border: none;
    border-top-right-radius: 12px;
    border-bottom-right-radius: 12px;
    font-weight: 700;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
  }
  .btn-outline-glass {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    border-radius: 12px;
    transition: all 0.2s ease;
  }
  .btn-outline-glass:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    color: white;
    border-color: rgba(255, 255, 255, 0.3);
  }
</style>