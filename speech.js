// Browser Compatibility Check
if (
  !("webkitSpeechRecognition" in window) ||
  !navigator.mediaDevices.getUserMedia
) {
  alert(
    "Your browser does not support audio recording. Use Chrome or Firefox."
  );
}

class AudioRecorder {
  constructor() {
    // DOM Elements
    this.elements = {
      startButton: document.getElementById("startRecording"),
      stopButton: document.getElementById("stopRecording"),
      audioPlayer: document.getElementById("audioPlayer"),
      timeDisplay: document.getElementById("timeDisplay"),
      translationPrompt: document.getElementById("translationPrompt"),
      recordAgainPrompt: document.getElementById("recordAgainPrompt"),
      translateYes: document.getElementById("translateYes"),
      translateNo: document.getElementById("translateNo"),
      recordYes: document.getElementById("recordYes"),
      recordNo: document.getElementById("recordNo"),
      loadingSpinner: document.getElementById("loadingSpinner"),
      listeningMessage: document.getElementById("listeningMessage"),
      translatedAudioPlayer: document.getElementById("translatedAudioPlayer"),
    };

    // Recording state variables
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.timerInterval = null;
    this.seconds = 0;

    this.initializeEventListeners();
  }

  initializeEventListeners() {
    this.elements.startButton.addEventListener("click", () =>
      this.startRecording()
    );
    this.elements.stopButton.addEventListener("click", () =>
      this.stopRecording()
    );
    this.elements.translateYes.addEventListener("click", () =>
      this.processAudio()
    );
    this.elements.translateNo.addEventListener("click", () =>
      this.cancelTranslation()
    );
    this.elements.recordYes.addEventListener("click", () => this.recordAgain());
    this.elements.recordNo.addEventListener("click", () => this.endSession());
  }

  startRecording() {
    this.elements.startButton.disabled = true;
    this.elements.stopButton.disabled = false;
    this.resetTimer();

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        this.elements.listeningMessage.style.display = "block";
        this.startTimer();
        this.setupMediaRecorder(stream);
      })
      .catch((error) => {
        console.error("Microphone access error:", error);
        alert(`Microphone access error: ${error}`);
        this.resetButtons();
      });
  }

  setupMediaRecorder(stream) {
    // Explicitly specify audio/wav MIME type and codec
    const options = {
      mimeType: "audio/webm;codecs=opus",
      audioBitsPerSecond: 128000,
    };

    try {
      this.mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
      console.error("MediaRecorder error:", e);
      this.mediaRecorder = new MediaRecorder(stream);
    }

    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = async () => {
      // Convert WebM to WAV using Audio Context
      const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create temporary audio element
      const audio = new Audio(audioUrl);

      // Create AudioContext
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      try {
        // Fetch the audio data
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();

        // Decode the audio data
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Create WAV buffer
        const wavBuffer = this.audioBufferToWav(audioBuffer);
        const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });

        // Update audio player
        const wavUrl = URL.createObjectURL(wavBlob);
        this.elements.audioPlayer.src = wavUrl;
        this.elements.audioPlayer.load();

        this.elements.translationPrompt.style.display = "block";

        // Store WAV blob for later use
        this.wavBlob = wavBlob;
      } catch (error) {
        console.error("Audio conversion error:", error);
        alert("Error converting audio format. Please try again.");
      }
    };

    this.mediaRecorder.start(100); // Collect 100ms chunks
  }

  // Convert AudioBuffer to WAV format
  audioBufferToWav(buffer) {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2;
    const buffer16Bit = new ArrayBuffer(44 + length);
    const view = new DataView(buffer16Bit);
    const channels = [];
    let offset = 0;
    let pos = 0;

    // Write WAV header
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + length, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numOfChan, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2 * numOfChan, true);
    view.setUint16(32, numOfChan * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, "data");
    view.setUint32(40, length, true);

    // Write PCM audio data
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(44 + pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return buffer16Bit;
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
      this.elements.listeningMessage.style.display = "none";
      this.stopTimer();
      this.resetButtons();
    }
  }

  async processAudio() {
    if (!this.wavBlob) {
      console.error("No WAV data available");
      alert("No audio data available. Please record again.");
      return;
    }

    this.elements.loadingSpinner.style.display = "block";
    this.elements.translationPrompt.style.display = "none";

    const formData = new FormData();
    formData.append("file", this.wavBlob, "audio.wav");

    console.log("Sending audio file to server...");

    try {
      const response = await fetch("http://127.0.0.1:8000/process_audio/", {
        method: "POST",
        body: formData,
      });

      console.log("Server response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Server response data:", data);

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.audio && data.audio.startsWith("data:audio/wav;base64,")) {
        this.playTranslatedAudioFromUrl(data.audio);
        this.elements.loadingSpinner.style.display = "none";
        this.elements.recordAgainPrompt.style.display = "block";
      } else {
        throw new Error("Invalid audio data received from server");
      }
    } catch (error) {
      console.error("Audio processing error:", error);
      this.elements.loadingSpinner.style.display = "none";
      alert(`Processing failed: ${error.message}`);
      this.elements.translationPrompt.style.display = "none";
      this.elements.recordAgainPrompt.style.display = "block";
    };
  }
  
    
  

  playTranslatedAudioFromUrl(audioUrl) {
    this.elements.translatedAudioPlayer.src = audioUrl;
    this.elements.translatedAudioPlayer.load();
    this.elements.translatedAudioPlayer.play();
    document.getElementById("translatedAudioSection").style.display = "block";
  }

  cancelTranslation() {
    this.elements.translationPrompt.style.display = "none";
    this.elements.recordAgainPrompt.style.display = "block";
  }

  recordAgain() {
    this.elements.recordAgainPrompt.style.display = "none";
    this.startRecording();
    document.getElementById("translatedAudioSection").style.display = "none";
     // Stop the audio playback and reset it
  const translatedAudioPlayer = document.getElementById("translatedAudioPlayer");
  translatedAudioPlayer.pause(); // Pause the audio
  translatedAudioPlayer.currentTime = 0; // Reset to the beginning
  this.stopTimer();
 
  // Reset the audio player
  this.elements.audioPlayer.src = "";
  }


  endSession() {
    alert("Thank you for using the app!");
    this.resetSession();
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.seconds += 0.1;
      this.elements.timeDisplay.innerText = `Time: ${this.seconds.toFixed(2)}s`;
    }, 100);
  }

  stopTimer() {
    clearInterval(this.timerInterval);
  }

  resetTimer() {
    this.seconds = 0;
    this.elements.timeDisplay.innerText = "Time: 0.00s";
  }

  resetButtons() {
    this.elements.startButton.disabled = false;
    this.elements.stopButton.disabled = true;
  }

  resetSession() {
    this.audioChunks = [];
    this.elements.audioPlayer.src = "";
    this.resetTimer();
    this.wavBlob = null;
  }
}

// Helper function to write strings to DataView
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Initialize the AudioRecorder
document.addEventListener("DOMContentLoaded", () => {
  new AudioRecorder();
});
