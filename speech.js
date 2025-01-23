// Check if browser supports Web Audio API and SpeechRecognition
if (
  !("webkitSpeechRecognition" in window) ||
  !navigator.mediaDevices.getUserMedia
) {
  alert(
    "Your browser does not support the required features. Please use Chrome or Firefox."
  );
}

const startButton = document.getElementById("startRecording");
const stopButton = document.getElementById("stopRecording");
const audioPlayer = document.getElementById("audioPlayer");
const audioSource = document.getElementById("audioSource");
const timeDisplay = document.getElementById("timeDisplay");
const translationPrompt = document.getElementById("translationPrompt");
const recordAgainPrompt = document.getElementById("recordAgainPrompt");
const translateYes = document.getElementById("translateYes");
const translateNo = document.getElementById("translateNo");
const recordYes = document.getElementById("recordYes");
const recordNo = document.getElementById("recordNo");
const loadingSpinner = document.getElementById("loadingSpinner");

let mediaRecorder;
let audioChunks = [];
let timerInterval;
let seconds = 0;

// Start recording function
function startRecording() {
  startButton.disabled = true;
  stopButton.disabled = false;

  // Reset time display
  seconds = 0;
  timeDisplay.innerText = "Time: 0.00s";

  // Access the microphone
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      // Show the "Listening..." message
      const listeningMessage = document.getElementById("listeningMessage");
      listeningMessage.style.display = "block"; // Show the message
      // Once access is granted, start the timer
      timerInterval = setInterval(() => {
        seconds += 0.1;
        timeDisplay.innerText = `Time: ${seconds.toFixed(2)}s`;
      }, 100);

      // Start the media recorder
      mediaRecorder = new MediaRecorder(stream);

      // When audio data is available, store it in audioChunks
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      // Once the recording stops, save and display the .wav file
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        const audioURL = URL.createObjectURL(audioBlob);
        audioSource.src = audioURL; // Set the audio URL in the source element
        audioPlayer.load(); // Reload audio player to play the new file
        audioChunks = []; // Reset audioChunks for the next recording

        // Show the translation prompt after the file is ready
        translationPrompt.style.display = "block";
      };

      // Start the recording
      mediaRecorder.start();
    })
    .catch((error) => {
      alert("Error accessing microphone: " + error);
    });
}

// Stop the recording
function stopRecording() {
  stopButton.disabled = true;
  startButton.disabled = false;

  // Stop the media recorder
  mediaRecorder.stop();
  // Hide the "Listening..." message
  const listeningMessage = document.getElementById("listeningMessage");
  listeningMessage.style.display = "none";
  // Stop the timer by clearing the interval
  clearInterval(timerInterval);
}

// Enable start/stop button functionality
startButton.addEventListener("click", () => {
  startRecording();
});

stopButton.addEventListener("click", () => {
  stopRecording();
});

// Handle translation actions
translateYes.addEventListener("click", () => {
  loadingSpinner.style.display = "block"; // Show spinner
  translationPrompt.style.display = "none"; // Hide prompt

  const audioBlob = new Blob(audioChunks, { type: "audio/wav" }); // Create audio Blob
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.wav");

  fetch("http://127.0.0.1:8000/process_audio/", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.blob(); // Assuming backend sends audio data as a blob
    })
    .then((processedAudioBlob) => {
      loadingSpinner.style.display = "none"; // Hide spinner
      recordAgainPrompt.style.display = "block"; // Show "Record Again" prompt

      // Generate a URL for the processed audio
      const processedAudioURL = URL.createObjectURL(processedAudioBlob);

      // Play the processed audio
      const audioPlayer = document.getElementById("audioPlayer");
      audioPlayer.src = processedAudioURL;
      audioPlayer.load(); // Reload audio player to play the new file
      audioPlayer.play(); // Auto-play the processed audio
    })
    .catch((error) => {
      console.error("Error details:", error);
      loadingSpinner.style.display = "none"; // Hide spinner
      alert("Audio processing error: " + error.message);
    });
});

translateNo.addEventListener("click", () => {
  translationPrompt.style.display = "none";
  recordAgainPrompt.style.display = "block";
});

recordYes.addEventListener("click", () => {
  recordAgainPrompt.style.display = "none";
  startRecording();
});

// Reset everything when user chooses 'No' for recording again
recordNo.addEventListener("click", () => {
  alert("Thank you for using the app!");

  // Reset audio data and clear UI elements
  audioChunks = [];
  const audioSource = document.getElementById("audioSource");
  if (audioSource) audioSource.src = "";
  const audioPlayer = document.getElementById("audioPlayer");
  if (audioPlayer) audioPlayer.src = "";

  // Clear the timer
  clearInterval(timerInterval);
  timeDisplay.innerText = "Time: 0.00s"; // Reset timer display
});
