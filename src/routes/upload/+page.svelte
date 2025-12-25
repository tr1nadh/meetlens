<script>
  let file = null;
  let loading = false;
  let transcript = "";
  let error = "";

async function uploadAudio() {
  if (!file) return;

  loading = true;
  transcript = "";
  error = "";

  const formData = new FormData();
  formData.append("audio", file);

  try {
    // STEP 1: Start the transcription (POST)
    const res = await fetch("/api/transcribe", {
      method: "POST",
      body: formData
    });

    const initialData = await res.json();
    if (!res.ok) throw new Error(initialData.error || "Upload failed");

    const { operationId, gcsName } = initialData;

    // STEP 2: Poll for the result (GET)
    let isCompleted = false;
    
    while (!isCompleted) {
      // Wait 3 seconds before checking again to avoid spamming the server
      await new Promise(resolve => setTimeout(resolve, 3000));

      const pollRes = await fetch(`/api/transcribe?id=${operationId}&gcsName=${gcsName}`);
      const pollData = await pollRes.json();

      if (!pollRes.ok) throw new Error(pollData.error || "Polling failed");

      if (pollData.completed) {
        transcript = pollData.text; // Full 2-minute transcript received!
        isCompleted = true;
      } else {
        // Optional: Update a progress UI if you added progress metadata to your GET
        console.log("Still transcribing...");
      }
    }
  } catch (err) {
    error = err.message;
  } finally {
    loading = false;
  }
}
</script>

<div class="container py-5">
  <div class="card upload-card mx-auto">
    <div class="card-body text-center">

      <h4 class="mb-2">🎙️ Audio to Text</h4>
      <p class="text-muted mb-4">
        Upload a call or meeting recording to get instant transcription.
      </p>

      <input
        type="file"
        accept="audio/*"
        class="form-control mb-3"
        on:change={(e) => (file = e.target.files[0])}
      />

      <button
        class="btn btn-primary w-100 upload-btn"
        disabled={loading || !file}
        on:click={uploadAudio}
      >
        {loading ? "Transcribing..." : "Upload & Transcribe"}
      </button>

      {#if loading}
        <div class="spinner-wrapper mt-4">
          <div class="spinner"></div>
          <p class="mt-2 text-muted">Analyzing audio…</p>
        </div>
      {/if}

      {#if transcript}
        <div class="result mt-4 fade-in">
          <h6>Transcript</h6>
          <p>{transcript}</p>
        </div>
      {/if}

      {#if error}
        <div class="alert alert-danger mt-3">{error}</div>
      {/if}

    </div>
  </div>
</div>

<style>
.upload-card {
  max-width: 460px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
  animation: slideUp 0.6s ease;
}

.upload-btn {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.upload-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(13,110,253,0.3);
}

.spinner-wrapper {
  animation: fadeIn 0.3s ease;
}
.spinner {
  width: 36px;
  height: 36px;
  border: 4px solid #e9ecef;
  border-top: 4px solid #0d6efd;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: auto;
}

.result {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 10px;
}

.fade-in {
  animation: fadeIn 0.4s ease;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
