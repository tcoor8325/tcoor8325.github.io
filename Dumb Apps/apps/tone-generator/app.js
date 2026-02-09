const frequencySlider = document.getElementById("frequency");
const frequencyValue = document.getElementById("frequency-value");
const customFrequencyInput = document.getElementById("custom-frequency");
const waveformInputs = Array.from(document.querySelectorAll('input[name="waveform"]'));
const startStopButton = document.getElementById("start-stop");

const MIN_FREQUENCY = 1;
const MAX_FREQUENCY = 20000;
const SLIDER_MIN = 0;
const SLIDER_MAX = 1000;

let audioContext = null;
let oscillator = null;
let gainNode = null;
let isPlaying = false;
let currentFrequency = 440;

function getSelectedWaveform() {
  const selected = waveformInputs.find((input) => input.checked);
  return selected ? selected.value : "sine";
}

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioContext.createGain();

    // Keep output volume low so the app opens safely on headphones.
    gainNode.gain.value = 0.04;
    gainNode.connect(audioContext.destination);
  }
}

async function startTone() {
  ensureAudioContext();

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  oscillator = audioContext.createOscillator();
  oscillator.type = getSelectedWaveform();
  oscillator.frequency.value = currentFrequency;
  oscillator.connect(gainNode);
  oscillator.start();

  isPlaying = true;
  startStopButton.textContent = "Stop";
  startStopButton.setAttribute("aria-pressed", "true");
}

function stopTone() {
  if (oscillator) {
    oscillator.stop();
    oscillator.disconnect();
    oscillator = null;
  }

  isPlaying = false;
  startStopButton.textContent = "Start";
  startStopButton.setAttribute("aria-pressed", "false");
}

async function toggleTone() {
  if (isPlaying) {
    stopTone();
    return;
  }

  await startTone();
}

function clampFrequency(hz) {
  return Math.min(MAX_FREQUENCY, Math.max(MIN_FREQUENCY, hz));
}

function clampSliderValue(value) {
  return Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, value));
}

function sliderToFrequency(sliderValue) {
  const normalized = (clampSliderValue(sliderValue) - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN);
  return MIN_FREQUENCY * Math.pow(MAX_FREQUENCY / MIN_FREQUENCY, normalized);
}

function frequencyToSlider(hz) {
  const clampedHz = clampFrequency(hz);
  const normalized = Math.log(clampedHz / MIN_FREQUENCY) / Math.log(MAX_FREQUENCY / MIN_FREQUENCY);
  return SLIDER_MIN + normalized * (SLIDER_MAX - SLIDER_MIN);
}

function formatFrequency(hz) {
  const rounded = Math.round(hz * 1000) / 1000;
  return String(rounded);
}

function setFrequency(hz, options = {}) {
  const { syncCustomInput = true, syncSlider = false } = options;
  const clampedHz = clampFrequency(hz);

  currentFrequency = clampedHz;
  frequencyValue.textContent = `${formatFrequency(clampedHz)} Hz`;

  if (syncCustomInput) {
    customFrequencyInput.value = formatFrequency(clampedHz);
  }

  if (syncSlider) {
    frequencySlider.value = String(Math.round(frequencyToSlider(clampedHz)));
  }

  if (oscillator && audioContext) {
    oscillator.frequency.setValueAtTime(clampedHz, audioContext.currentTime);
  }
}

function setWaveform(type) {
  if (oscillator) {
    oscillator.type = type;
  }
}

frequencySlider.addEventListener("input", () => {
  const sliderValue = Number(frequencySlider.value);
  setFrequency(sliderToFrequency(sliderValue), { syncCustomInput: true, syncSlider: false });
});

customFrequencyInput.addEventListener("input", () => {
  const parsedFrequency = Number(customFrequencyInput.value);

  if (Number.isNaN(parsedFrequency)) {
    return;
  }

  setFrequency(parsedFrequency, { syncCustomInput: false, syncSlider: true });
});

customFrequencyInput.addEventListener("change", () => {
  const parsedFrequency = Number(customFrequencyInput.value);
  const fallbackFrequency = Number.isNaN(parsedFrequency) ? currentFrequency : parsedFrequency;
  setFrequency(fallbackFrequency, { syncCustomInput: true, syncSlider: true });
});

waveformInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (!input.checked) {
      return;
    }

    setWaveform(input.value);
  });
});

startStopButton.addEventListener("click", () => {
  toggleTone().catch(() => {
    stopTone();
  });
});

window.addEventListener("beforeunload", () => {
  stopTone();
});

setFrequency(currentFrequency, { syncCustomInput: true, syncSlider: true });
