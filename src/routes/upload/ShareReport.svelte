<script>
  import { onMount } from 'svelte';

  export let summary = ""; 
  export let actionItems = []; 
  
  let html2canvas;
  let jsPDF;
  let isExporting = false;
  let exportType = ''; 

  // Email & Progress state
  let emailRecipient = "";
  let emailStatus = ""; 
  let progressPercentage = 0;
  let progressText = "";

  onMount(async () => {
    const h2cModule = await import('html2canvas');
    const jspdfModule = await import('jspdf');
    html2canvas = h2cModule.default;
    jsPDF = jspdfModule.default;
  });

  async function captureDashboard() {
    progressPercentage = 10;
    progressText = "Capturing Dashboard...";
    
    const element = document.getElementById('analysis-dashboard');
    const modalElement = document.getElementById('shareModal');
    if (!element || !html2canvas) return null;

    modalElement.setAttribute('data-html2canvas-ignore', 'true');
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(b => b.setAttribute('data-html2canvas-ignore', 'true'));

    const canvas = await html2canvas(element, {
      scale: 1.5, // Slightly reduced scale for faster processing
      useCORS: true,
      backgroundColor: '#0e111d', 
      logging: false,
    });

    modalElement.removeAttribute('data-html2canvas-ignore');
    progressPercentage = 40;
    return canvas;
  }

  async function sendEmail() {
    if (!emailRecipient || isExporting) return;
    isExporting = true;
    exportType = 'email';
    emailStatus = "sending";
    progressPercentage = 0;

    try {
      const canvas = await captureDashboard();
      if (!canvas || !jsPDF) throw new Error("Libraries not loaded");

      progressText = "Generating PDF Report...";
      progressPercentage = 60;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(canvas, 'PNG', 0, 0, canvas.width, canvas.height);

      const pdfArrayBuffer = pdf.output('arraybuffer');
      const pdfBase64 = btoa(
        new Uint8Array(pdfArrayBuffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      progressText = "Uploading to Mail Server...";
      progressPercentage = 85;

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: emailRecipient,
          summary: summary,
          actionItems: actionItems,
          pdfBase64: pdfBase64
        })
      });

      if (response.ok) {
        progressPercentage = 100;
        progressText = "Sent!";
        emailStatus = "success";
        emailRecipient = "";
        setTimeout(() => {
            emailStatus = "";
            progressPercentage = 0;
        }, 5000);
      } else {
        throw new Error("Failed to send");
      }
    } catch (err) {
      console.error(err);
      emailStatus = "error";
    } finally {
      isExporting = false;
      exportType = '';
    }
  }

  async function downloadPDF() {
    isExporting = true; exportType = 'pdf';
    try {
      const canvas = await captureDashboard();
      if (!canvas) return;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(canvas, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Meeting_Analysis_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally { isExporting = false; exportType = ''; }
  }

  async function downloadPNG() {
    isExporting = true; exportType = 'png';
    try {
      const canvas = await captureDashboard();
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `Meeting_Analysis_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally { isExporting = false; exportType = ''; }
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
            <button class="btn btn-outline-glass d-flex justify-content-between align-items-center py-2 px-3" on:click={downloadPDF} disabled={isExporting}>
              <span><i class="fa-solid {exportType === 'pdf' ? 'fa-spinner fa-spin' : 'fa-file-pdf'} me-2 text-danger"></i> {exportType === 'pdf' ? 'Generating PDF...' : 'Download as PDF'}</span>
            </button>
            <button class="btn btn-outline-glass d-flex justify-content-between align-items-center py-2 px-3" on:click={downloadPNG} disabled={isExporting}>
              <span><i class="fa-solid {exportType === 'png' ? 'fa-spinner fa-spin' : 'fa-image'} me-2 text-purple"></i> {exportType === 'png' ? 'Generating Image...' : 'Download as PNG'}</span>
            </button>
          </div>
        </div>

        <hr class="border-glass my-4" />

        <div class="mb-2">
          <label class="text-light-muted small fw-bold mb-2 d-block">SEND VIA EMAIL</label>
          
          {#if emailStatus === 'sending'}
            <div class="mb-3">
                <div class="d-flex justify-content-between x-small mb-1">
                    <span class="text-indigo fw-bold">{progressText}</span>
                    <span class="text-light-muted">{progressPercentage}%</span>
                </div>
                <div class="progress bg-dark-soft" style="height: 6px;">
                    <div class="progress-bar bg-indigo-glow progress-bar-striped progress-bar-animated" 
                         role="progressbar" 
                         style="width: {progressPercentage}%"></div>
                </div>
            </div>
          {:else}
            <p class="text-light-muted x-small mb-3">Report includes key action items in the body and a visual PDF.</p>
          {/if}
          
          <div class="input-group">
            <input 
                type="email" 
                bind:value={emailRecipient} 
                class="form-control form-control-custom" 
                placeholder="colleague@company.com" 
                disabled={isExporting} 
            />
            <button class="btn btn-indigo-glow px-3" type="button" on:click={sendEmail} disabled={isExporting || !emailRecipient}>
              {#if emailStatus === 'sending'} 
                <i class="fa-solid fa-spinner fa-spin"></i> 
              {:else} 
                <i class="fa-solid fa-paper-plane me-2"></i>Send 
              {/if}
            </button>
          </div>
          <div class="mt-2 text-end">
              {#if emailStatus === 'success'} <span class="text-success x-small fw-bold uppercase-tracking">SENT SUCCESSFULLY!</span>
              {:else if emailStatus === 'error'} <span class="text-danger x-small fw-bold uppercase-tracking">SENDING FAILED</span>
              {:else if emailStatus !== 'sending'} <span class="text-purple x-small fw-bold opacity-75 uppercase-tracking">READY TO SEND</span> {/if}
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
  .glass-card { background: #0e111d !important; border: 1px solid rgba(255, 255, 255, 0.1) !important; border-radius: 20px; }
  .border-glass { border-color: rgba(255, 255, 255, 0.1) !important; }
  .x-small { font-size: 0.7rem; }
  .uppercase-tracking { text-transform: uppercase; letter-spacing: 1px; }
  
  /* Fixed Input Visibility */
  .form-control-custom { 
    background: rgba(255, 255, 255, 0.08) !important; 
    border: 1px solid rgba(255, 255, 255, 0.15) !important; 
    color: #ffffff !important; 
    border-top-left-radius: 12px !important; 
    border-bottom-left-radius: 12px !important; 
    padding: 10px 15px; 
    font-size: 0.9rem;
  }
  .form-control-custom::placeholder { color: rgba(255, 255, 255, 0.4); }
  .form-control-custom:focus { border-color: #6366f1 !important; outline: none; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2); }

  /* Progress Bar Styling */
  .bg-dark-soft { background: rgba(255, 255, 255, 0.05); }
  .bg-indigo-glow { background: #6366f1; box-shadow: 0 0 10px rgba(99, 102, 241, 0.5); }
  .text-indigo { color: #818cf8; }

  .btn-indigo-glow { background: #6366f1; color: white; border: none; border-top-right-radius: 12px; border-bottom-right-radius: 12px; font-weight: 700; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3); }
  .btn-outline-glass { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); color: #94a3b8; border-radius: 12px; transition: all 0.2s ease; }
  .btn-outline-glass:hover:not(:disabled) { background: rgba(255, 255, 255, 0.08); color: white; border-color: rgba(255, 255, 255, 0.3); }
</style>