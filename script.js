const SERVER_URL =
  "https://developer.ailabs.tw/ai-music-piano-transformer-service/api/getPianoMidi";
console.log("data", data);

document.getElementById("splash-play-btn").addEventListener("click", () => {
  const splash = document.getElementById("splash");
  splash.style.opacity = 0;
  setTimeout(() => {
    splash.style.display = "none";
  }, 1000);
});

document.getElementById("edit-btn").addEventListener("click", () => {
  const splash = document.getElementById("edit-splash");
  splash.style.display = "block";
  splash.style.opacity = 0;
  setTimeout(() => {
    splash.style.opacity = 1;
  }, 10);

  const editCanvas = document.getElementById("edit-canvas");
  const editCanvasContainer = document.getElementById("edit-canvas-container");
  editCanvas.width = editCanvasContainer.clientWidth;
  editCanvas.height = editCanvasContainer.clientHeight;
  if (!editCanvas.getContext) {
    console.log("<canvas> not supported.");
  }
  const editCtx = editCanvas.getContext("2d");
  const { width, height } = editCanvas;
  editCtx.fillStyle = "rgba(255, 255, 255, 0.5)";
  editCtx.fillRect(0, 0, width, height);
  editCtx.fillStyle = "rgb(200, 0, 0)";
  editCtx.fillRect(50, 10, 50, 50);
  editCtx.fillStyle = "rgba(0, 0, 200, 0.5)";
  editCtx.fillRect(30, 30, 50, 50);
});

document.getElementById("edit-finish-btn").addEventListener("click", () => {
  const splash = document.getElementById("edit-splash");
  splash.style.opacity = 0;
  setTimeout(() => {
    splash.style.display = "none";
  }, 1000);
});

async function postData(url = "", data = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
  const d = await response.json();
  console.log("response", d);
  return d;
}

postData(SERVER_URL, data.input);

// canvas
let canvas = document.getElementById("play-canvas");
let canvasContainer = document.getElementById("canvas-container");
canvas.width = canvasContainer.clientWidth;
canvas.height = canvasContainer.clientHeight;
if (!canvas.getContext) {
  console.log("<canvas> not supported.");
}

const draw = () => {
  // do things
  let ctx = canvas.getContext("2d");
  let { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgb(200, 0, 0)";
  ctx.fillRect(10, 10, 50, 50);
  ctx.fillStyle = "rgba(0, 0, 200, 0.5)";
  ctx.fillRect(30 + 30 * Math.sin(Date.now() * 0.01), 30, 50, 50);

  requestAnimationFrame(() => {
    draw();
  });
};

// const audioContext = new window.AudioContext();
const audioContext = new Tone.Context();
StartAudioContext(audioContext, "#play-btn", () => {
  console.log("tone ac", Tone.context);
  console.log("ac", audioContext);

  var player = new WebAudioFontPlayer();
  player.loader.decodeAfterLoading(
    audioContext,
    "_tone_0250_SoundBlasterOld_sf2"
  );
  function play() {
    player.queueWaveTable(
      audioContext,
      audioContext.destination,
      _tone_0250_SoundBlasterOld_sf2,
      0,
      12 * 4 + 7,
      2
    );
    return false;
  }
  play();
  draw();
});
