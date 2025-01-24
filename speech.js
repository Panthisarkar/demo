const startButton = document.getElementById("startRecording");
const stopButton = document.getElementById("stopRecording");
const outputDiv = document.getElementById("output");

let recognition;
let isRecording = false;

// Check if the Web Speech API is supported
if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = "ne-NP"; // Set to Nepali
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    isRecording = true;
    outputDiv.textContent = "Recording... Speak now.";
  };

  recognition.onresult = async (event) => {
    const nepaliText = event.results[0][0].transcript;

    // Translate Nepali text to English
    const englishText = await translateText(nepaliText);

    // Convert English text to speech (without displaying it)
    speakText(englishText);
  };

  recognition.onerror = (event) => {
    outputDiv.textContent = `Error: ${event.error}`;
  };

  recognition.onend = () => {
    isRecording = false;
    startButton.disabled = false;
    stopButton.disabled = true;
  };
} else {
  outputDiv.textContent = "Your browser does not support the Web Speech API.";
}

// Start recording
startButton.addEventListener("click", () => {
  if (!isRecording) {
    recognition.start();
    startButton.disabled = true;
    stopButton.disabled = false;
  }
});

// Stop recording
stopButton.addEventListener("click", () => {
  if (isRecording) {
    recognition.stop();
    startButton.disabled = false;
    stopButton.disabled = true;
  }
});

// Mock translation function
async function translateText(nepaliText) {
  // Replace this with a real translation API (e.g., Google Translate API)
  return new Promise((resolve) => {
    setTimeout(
      () => resolve("Hello, I am Alina. This is my major project."),
      1000
    );
  });
}

// Speak text using the Web Speech Synthesis API
function speakText(text) {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US"; // English voice
  synth.speak(utterance);
}
