<script>
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';

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

  // Toast state
  let toastVisible = false;
  let toastMessage = "";
  let toastType = "success"; 

  // --- NEW LOGIC: Abort Controller ---
  let controller;

  // --- REFRESH PREVENTION LOGIC ---
  const handleBeforeUnload = (event) => {
    if (isExporting) {
      event.preventDefault();
      event.returnValue = "Your report is currently being generated. If you leave now, the process will cancel.";
      return event.returnValue;
    }
  };

  onMount(async () => {
    const h2cModule = await import('html2canvas');
    const jspdfModule = await import('jspdf');
    html2canvas = h2cModule.default;
    jsPDF = jspdfModule.default;

    window.addEventListener('beforeunload', handleBeforeUnload);

    // --- NEW LOGIC: Intercept Modal Close ---
    const modalElement = document.getElementById('shareModal');
    if (modalElement) {
      modalElement.addEventListener('hide.bs.modal', (event) => {
        if (isExporting) {
          const confirmClose = confirm("A report is being generated. Closing this will stop the operation. Do you want to stop?");
          if (!confirmClose) {
            event.preventDefault(); // Keep modal open
          } else {
            // User wants to stop
            if (controller) controller.abort();
            isExporting = false;
            exportType = '';
            emailStatus = '';
            triggerToast("Operation cancelled", "error");
          }
        }
      });
    }
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  });

  function triggerToast(msg, type = "success") {
    toastMessage = msg;
    toastType = type;
    toastVisible = true;
    setTimeout(() => { toastVisible = false; }, 4000);
  }

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
      scale: 1.5, 
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
    
    controller = new AbortController(); // Initialize abort controller
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

      const cleanActionItems = actionItems.map(item => {
        return typeof item === 'object' ? (item.task || item.text || item.content || JSON.stringify(item)) : item;
      });

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal, // Connect signal to fetch
        body: JSON.stringify({
          recipient: emailRecipient,
          summary: summary,
          actionItems: cleanActionItems,
          pdfBase64: pdfBase64
        })
      });

      if (response.ok) {
        progressPercentage = 100;
        progressText = "Sent!";
        emailStatus = "success";
        triggerToast(`Report sent to ${emailRecipient}`);
        emailRecipient = "";
        setTimeout(() => {
            emailStatus = "";
            progressPercentage = 0;
        }, 5000);
      } else {
        throw new Error("Failed to send");
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Fetch aborted');
      } else {
        console.error(err);
        emailStatus = "error";
        triggerToast("Error: Could not send email", "error");
      }
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
      triggerToast("PDF Downloaded");
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
      triggerToast("Image Downloaded");
    } finally { isExporting = false; exportType = ''; }
  }
</script>

{#if toastVisible}
  <div class="custom-toast {toastType}" in:fly={{ y: 50, duration: 400 }} out:fade>
    <i class="fa-solid {toastType === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} me-2"></i>
    {toastMessage}
  </div>
{/if}

<button class="btn btn-outline-glass w-100 py-2 text-white" data-bs-toggle="modal" data-bs-target="#shareModal">
    <i class="fa-solid fa-share-nodes me-2"></i> Share Result
</button>

<div class="modal fade" id="shareModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="{isExporting ? 'static' : 'true'}">
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
        <button type="button" class="btn btn-outline-glass text-white w-100 py-2" data-bs-dismiss="modal">
          {isExporting ? 'Sending Report...' : 'Back to Dashboard'}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .glass-card { background: #0e111d !important; border: 1px solid rgba(255, 255, 255, 0.1) !important; border-radius: 20px; }
  .border-glass { border-color: rgba(255, 255, 255, 0.1) !important; }
  .x-small { font-size: 0.7rem; }
  .uppercase-tracking { text-transform: uppercase; letter-spacing: 1px; }
  
  .custom-toast {
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    padding: 12px 24px;
    border-radius: 12px;
    color: white;
    font-weight: 600;
    display: flex;
    align-items: center;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    backdrop-filter: blur(8px);
  }
  .custom-toast.success { background: rgba(16, 185, 129, 0.95); border: 1px solid rgba(255,255,255,0.1); }
  .custom-toast.error { background: rgba(239, 68, 68, 0.95); border: 1px solid rgba(255,255,255,0.1); }

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

  .bg-dark-soft { background: rgba(255, 255, 255, 0.05); border-radius: 10px; overflow: hidden; }
  .bg-indigo-glow { background: #6366f1; box-shadow: 0 0 10px rgba(99, 102, 241, 0.5); }
  .text-indigo { color: #818cf8; }

  .btn-indigo-glow { background: #6366f1; color: white; border: none; border-top-right-radius: 12px; border-bottom-right-radius: 12px; font-weight: 700; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3); transition: transform 0.1s; }
  .btn-indigo-glow:active { transform: scale(0.98); }
  .btn-outline-glass { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); color: #94a3b8; border-radius: 12px; transition: all 0.2s ease; }
  .btn-outline-glass:hover:not(:disabled) { background: rgba(255, 255, 255, 0.08); color: white; border-color: rgba(255, 255, 255, 0.3); }
</style>