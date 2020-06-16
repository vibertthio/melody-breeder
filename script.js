console.log("Vibert 2020-06-16 18:59");
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
if (isMobile) {
  console.log("[mobile]");
}

const COLORS = [
  "rgb(55, 63, 255)",
  "rgb(55, 63, 255)",
  "rgba(255, 255, 232, 1)",
  "rgb(55, 63, 255)",
  "rgb(255, 178, 230)",
  // "rgb(140, 255, 218)",
  // "rgb(229, 117, 66)",
  // "rgb(230, 194, 41)",
  // "rgb(30, 150, 252)",
  // "rgb(162, 214, 249)",
];
const LOWER_BAR_RATIO = 0.6;
const HIGHER_BAR_RATIO = 0.3;
const GRID_RATIO = isMobile ? 0.18 : 0.27;
const DISTANCE_RATIO = isMobile ? 0.7 : 0.6;
const RADIO_WIDTH_RATIO = isMobile ? 0.7 : 0.8;

const playButton = document.getElementById("play-btn");
const submitButton = document.getElementById("submit-button");
const resultTextElement = document.getElementById("result-text");
const canvasContainer = document.getElementById("canvas-container");
const canvasLayer = document.getElementById("panel-container");
const endingButtonDivElement = document.getElementById("layer-button-div");
const loadingTextElement = document.getElementById("loading-div");
const commentTextElement = document.getElementById("comment");
const playAgainButton = document.getElementById("play-again-btn");
// const canvasHintDiv = document.getElementById("canvas-hint-div");

let canvas;
let canvases = [];

const worker = new Worker("worker.js");
const { Part, Sequence } = Tone;
const BPM = 120;
let part;
let seq;
let piano;
let currentMelody = getListFromEvents(presetMelodies["Twinkle"]);
let inspirationalMelodies = [
  presetMelodies["Twinkle"],
  presetMelodies["Arpeggiated"],
  presetMelodies["Melody 1"],
  presetMelodies["Melody 2"],
];

const audioContext = Tone.context;
let waitingForResponse = false;
let currentUrlId;
let pianoroll;
let events;
let inputPianoroll;
let inputEvents;
let pianoLoading = true;
let modelLoading = true;

// events
window.addEventListener("resize", () => {
  const canvas = document.getElementById("play-canvas");
  canvas.width = document.getElementById("canvas-container").clientWidth;
  canvas.height = document.getElementById("canvas-container").clientHeight;

  for (let i = 0; i < 4; i++) {
    canvases[i] = document.getElementById(`canvas-${i + 1}`);
    let container = document.getElementById(`canvas-div-${i + 1}`);
    canvases[i].width = container.clientWidth;
    canvases[i].height = container.clientHeight;
  }
});
document.getElementById("splash-play-btn").addEventListener("click", async (e) => {
  document.getElementById("wrapper").style.visibility = "visible";
  const splash = document.getElementById("splash");
  splash.style.opacity = 0;
  setTimeout(() => {
    splash.style.display = "none";
  }, 300);
  if (audioContext.state == "suspended") {
    console.log("audioContext.resume");
    audioContext.resume();
  }

  setup();
  draw();
});
canvasContainer.addEventListener("mousemove", (e) => {
  const { clientX, clientY } = e;
  const { width, height } = canvas;
  let canvasRect = canvas.getBoundingClientRect();
  const mouseX = clientX - canvasRect.left;
  const mouseY = clientY - canvasRect.top;
});
canvasContainer.addEventListener("click", (e) => {
  if (modelLoading) {
    return;
  }
  const { clientX, clientY } = e;
  const { width, height } = canvas;
  let canvasRect = canvas.getBoundingClientRect();
  const mouseX = clientX - canvasRect.left;
  const mouseY = clientY - canvasRect.top;
});
playButton.addEventListener("click", (e) => {
  e.stopPropagation();

  if (seq.state === "started") {
    playButton.textContent = "play";
    seq.stop();
  } else {
    playButton.textContent = "stop";
    seq.start("+0.01");
  }
});
playAgainButton.addEventListener("click", (e) => {
  e.stopPropagation();
});

// visual
function initCanvas() {
  canvas = document.getElementById("play-canvas");
  canvas.width = document.getElementById("canvas-container").clientWidth;
  canvas.height = document.getElementById("canvas-container").clientHeight;

  for (let i = 0; i < 4; i++) {
    canvases[i] = document.getElementById(`canvas-${i + 1}`);
    let container = document.getElementById(`canvas-div-${i + 1}`);
    canvases[i].width = container.clientWidth;
    canvases[i].height = container.clientHeight;
  }
}
function setup() {
  Tone.Transport.start();
  Tone.Transport.bpm.value = BPM;
}
function draw() {
  // do things
  drawMainCanvas();
  drawInspirationsCanvas();

  requestAnimationFrame(() => {
    draw();
  });
}
function drawMainCanvas() {
  let ctx = canvas.getContext("2d");
  const { width, height } = ctx.canvas;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255, 255, 255, 1)";
  ctx.fillRect(0, 0, width, height);

  drawMainMelody(ctx, width, height);
}
function drawInspirationsCanvas() {
  for (let i = 0; i < canvases.length; i++) {
    const canvas = canvases[i];
    let ctx = canvas.getContext("2d");
    const { width, height } = ctx.canvas;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    ctx.fillRect(0, 0, width, height);

    drawPatterns(ctx);
  }
}
function drawPatterns(ctx) {
  const { width, height } = ctx.canvas;
  const distance = width * DISTANCE_RATIO;
  const gridWidth = height * GRID_RATIO;
  const cornerRadius = height * 0.05;

  // ctx.strokeStyle = "rgba(0, 0, 200, 1.0)";
  // ctx.lineWidth = 3;
  ctx.save();

  ctx.translate(width * 0.5, height * 0.5);
  ctx.fillStyle = COLORS[3];
  ctx.beginPath();
  ctx.arc(0, 0, width * 0.1 * (1 + 0.1 * Math.sin(Date.now() * 0.01)), 0, 2 * Math.PI);
  ctx.fill();

  ctx.restore();
}
function drawMainMelody(ctx, width, height) {
  const wUnit = width / currentMelody.length;
  const hUnit = height / 48;

  for (let i = 0; i < currentMelody.length; i++) {
    const notes = currentMelody[i];
    if (!notes) {
      continue;
    }
    for (let j = 0; j < notes.length; j++) {
      const { pitch, noteLength } = notes[j];
      ctx.save();
      ctx.translate(i * wUnit, (96 - pitch) * hUnit);
      ctx.fillStyle = COLORS[3];
      const w = noteLength * wUnit * 0.85;
      ctx.fillRect(0, 0, w, hUnit);
      ctx.restore();
    }
  }

  if (seq.state === "started") {
    const p = seq.progress;
    ctx.save();
    ctx.translate(width * p, 0);
    ctx.fillStyle = COLORS[4];
    ctx.fillRect(0, 0, 10, height);
    ctx.restore();
  }
}

// audio
function initMusic() {
  // sounds
  piano = SampleLibrary.load({
    instruments: "piano",
  });
  Tone.Buffer.on("load", () => {
    const reverb = new Tone.JCReverb(0.5).toMaster();
    piano.connect(reverb);
    pianoLoading = false;
    document.getElementById("splash-play-btn").classList.add("activated");
    console.log("Samples loaded");
  });

  seq = new Tone.Sequence(
    (time, beat) => {
      if (currentMelody[beat]) {
        const notes = currentMelody[beat];
        notes.forEach(({ pitch, noteLength }) => {
          playPianoNote(time, pitch, noteLength, 0.3);
        });
      }
    },
    Array(32)
      .fill(null)
      .map((_, i) => i),
    "8n"
  );

  // magenta.js model
  worker.postMessage({ msg: "init" });
  worker.onmessage = (e) => {
    console.log("[worker on message]");
    console.log(e);
    canvasLayer.style.display = "none";
    modelLoading = false;
  };
}
function playPianoNote(time = 0, pitch = 55, length = 8, vol = 0.3) {
  // console.log("time", time);
  // console.log("play currentTime", audioContext.now());
  // console.log("pitch", pitch);
  piano.triggerAttackRelease(Tone.Frequency(pitch, "midi"), length * 0.5, time, vol);
}
function playMelody(melody) {
  const notes = melody.notes.map((note) => {
    const s = note.quantizedStartStep;
    return {
      time: `${Math.floor(s / 16)}:${Math.floor(s / 4) % 4}:${s % 4}`,
      note: Tone.Frequency(note.pitch, "midi"),
      length: note.quantizedEndStep - note.quantizedStartStep,
    };
  });

  if (part) {
    part.stop();
  }

  part = new Part((time, value) => {
    playPianoNote(time, value.note, value.length);
  }, notes);
  part.loop = 1;
  part.loopEnd = "2:0:0";
  part.start("+0.1");
  part.stop("+2m");
}

initCanvas();
initMusic();
