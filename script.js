console.log("Vibert 2020-06-07");
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
if (isMobile) {
  console.log("[mobile]");
}

const COLORS = [
  // "rgb(255, 178, 230)",
  // "rgb(140, 255, 218)",
  // "rgb(229, 117, 66)",
  // "rgb(230, 194, 41)",
  // "rgb(30, 150, 252)",
  // "rgb(162, 214, 249)",
  "rgb(55, 63, 255)",
  "rgb(55, 63, 255)",
  "rgba(255, 255, 232, 1)",
  "rgb(55, 63, 255)",
];
const LOWER_BAR_RATIO = 0.6;
const HIGHER_BAR_RATIO = 0.3;
const GRID_RATIO = isMobile ? 0.18 : 0.27;
const DISTANCE_RATIO = isMobile ? 0.7 : 0.6;
const RADIO_WIDTH_RATIO = isMobile ? 0.7 : 0.8;

const playButtonTip = document.getElementById("play-btn-tip");
const submitButton = document.getElementById("submit-button");
const resultTextElement = document.getElementById("result-text");
const canvasLayer = document.getElementById("panel-container");
const endingButtonDivElement = document.getElementById("layer-button-div");
const loadingTextElement = document.getElementById("loading-div");
const commentTextElement = document.getElementById("comment");
const playAgainButton = document.getElementById("play-again-btn");
// const canvasHintDiv = document.getElementById("canvas-hint-div");

const canvas = document.getElementById("play-canvas");
canvas.width = document.getElementById("canvas-container").clientWidth;
canvas.height = document.getElementById("canvas-container").clientHeight;

const worker = new Worker("worker.js");
const { Part } = Tone;
const BPM = 120;
let part;
let piano;
let currentMelody = getListFromEvents(presetMelodies["Twinkle"]);
let inspirationalMelodies = [
  presetMelodies["Twinkle"],
  presetMelodies["Arpeggiated"],
  presetMelodies["Melody 1"],
  presetMelodies["Melody 2"],
];

const audioContext = Tone.context;
let editing = false;
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
document.getElementById("canvas-container").addEventListener("mousemove", (e) => {
  const { clientX, clientY } = e;
  const { width, height } = canvas;
  let canvasRect = canvas.getBoundingClientRect();
  const mouseX = clientX - canvasRect.left;
  const mouseY = clientY - canvasRect.top;
});
document.getElementById("canvas-container").addEventListener("click", (e) => {
  if (modelLoading) {
    return;
  }
  const { clientX, clientY } = e;
  const { width, height } = canvas;
  let canvasRect = canvas.getBoundingClientRect();
  const mouseX = clientX - canvasRect.left;
  const mouseY = clientY - canvasRect.top;
});
submitButton.addEventListener("click", (e) => {
  e.stopPropagation();
});
playAgainButton.addEventListener("click", (e) => {
  e.stopPropagation();
});

// visual
function setup() {
  Tone.Transport.start();
  Tone.Transport.bpm.value = BPM;
}
function draw() {
  // do things
  let ctx = canvas.getContext("2d");
  const { width, height } = ctx.canvas;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255, 255, 255, 1)";
  ctx.fillRect(0, 0, width, height);

  drawPatterns(ctx);

  requestAnimationFrame(() => {
    draw();
  });
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
  ctx.arc(0, 0, 50 * (1 + 0.1 * Math.sin(Date.now() * 0.01)), 0, 2 * Math.PI);
  ctx.fill();

  ctx.restore();
}
function drawMelody(ctx, width, height, melody, drawProgress = false, hide = false) {
  const { notes, totalQuantizedSteps } = melody;
  const wUnit = width / totalQuantizedSteps;
  const hUnit = height / 48;

  if (!hide) {
    for (let i = 0; i < notes.length; i++) {
      const { pitch, quantizedStartStep, quantizedEndStep } = notes[i];
      if (pitch < 96 && pitch > 48) {
        ctx.save();
        ctx.translate(quantizedStartStep * wUnit, (96 - pitch) * hUnit);
        // ctx.fillStyle = COLORS[side];
        // ctx.fillStyle = COLORS[2];

        ctx.fillStyle = COLORS[3];

        if (drawProgress && part && part.state === "started" && part.progress) {
          if (
            part.progress > quantizedStartStep / totalQuantizedSteps &&
            part.progress < quantizedEndStep / totalQuantizedSteps
          ) {
            ctx.fillStyle = "rgba(0, 150, 0)";
          }
        }
        const w = (quantizedEndStep - quantizedStartStep) * wUnit * 0.85;
        ctx.fillRect(0, 0, w, hUnit);
        ctx.restore();
      }
    }
  }

  if (drawProgress && part && part.state === "started" && part.progress) {
    let alpha = 1;
    if (part.progress < 0.2) {
      alpha = Math.pow(part.progress / 0.2, 2);
    } else if (part.progress > 0.8) {
      alpha = Math.pow((1 - part.progress) / 0.2, 2);
    }
    ctx.fillStyle = `rgba(0, 150, 0, ${alpha})`;
    ctx.fillRect(width * part.progress, 0, 5, height);
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

initMusic();
