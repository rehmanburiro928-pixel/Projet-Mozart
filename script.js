import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const video = document.getElementById("camera");
const canvas = document.getElementById("hand-canvas");
const ctx = canvas.getContext("2d");
const cameraButton = document.getElementById("camera-button");
const cameraStatus = document.getElementById("camera-status");
const cameraIndicator = document.getElementById("camera-indicator");
const trackingIndicator = document.getElementById("tracking-indicator");
const handsIndicator = document.getElementById("hands-indicator");
const placeholder = document.getElementById("camera-placeholder");
const message = document.getElementById("vision-message");

let stream = null;
let handLandmarker = null;
let animationId = null;
let lastVideoTime = -1;
let busy = false;

const connections = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17]
];

async function createHandTracker() {
  message.textContent = "Loading hand-tracking model…";
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );

  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "CPU"
    },
    runningMode: "VIDEO",
    numHands: 2
  });
}

function resizeCanvas() {
  const width = video.videoWidth || video.clientWidth;
  const height = video.videoHeight || video.clientHeight;
  if (!width || !height) return;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function drawHands(landmarksList) {
  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const landmarks of landmarksList) {
    ctx.lineWidth = Math.max(2, canvas.width / 320);
    ctx.strokeStyle = "#d6bd91";
    ctx.fillStyle = "#fff1d5";

    for (const [start, end] of connections) {
      const a = landmarks[start];
      const b = landmarks[end];
      ctx.beginPath();
      ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
      ctx.lineTo(b.x * canvas.width, b.y * canvas.height);
      ctx.stroke();
    }

    landmarks.forEach((point, index) => {
      const radius = [4, 8, 12, 16, 20].includes(index) ? 6 : 3.5;
      ctx.beginPath();
      ctx.arc(point.x * canvas.width, point.y * canvas.height, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Highlight the five fingertips so they are easy to identify.
    for (const tipIndex of [4, 8, 12, 16, 20]) {
      const tip = landmarks[tipIndex];
      ctx.beginPath();
      ctx.arc(tip.x * canvas.width, tip.y * canvas.height, 9, 0, Math.PI * 2);
      ctx.strokeStyle = "#e5a85f";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

function trackFrame() {
  if (!video.srcObject || video.readyState < 2 || !handLandmarker) {
    animationId = requestAnimationFrame(trackFrame);
    return;
  }

  if (video.currentTime !== lastVideoTime && !busy) {
    lastVideoTime = video.currentTime;
    busy = true;
    try {
      const result = handLandmarker.detectForVideo(video, performance.now());
      const hands = result.landmarks || [];
      drawHands(hands);
      handsIndicator.textContent = String(hands.length);
      trackingIndicator.textContent = hands.length ? "Tracking" : "Searching";
      message.textContent = hands.length
        ? `${hands.length} hand(s) detected · fingertip markers are highlighted`
        : "Show one or both hands to the camera.";
    } catch (error) {
      console.error("Hand tracking error:", error);
      message.textContent = "Tracking encountered an error. Check the browser console.";
    } finally {
      busy = false;
    }
  }

  animationId = requestAnimationFrame(trackFrame);
}

async function startCamera() {
  cameraButton.disabled = true;
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera access requires an HTTPS website in a supported browser.");
    }

    message.textContent = "Requesting camera permission…";
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });

    video.srcObject = stream;
    await video.play();
    placeholder.style.display = "none";
    cameraStatus.textContent = "CAMERA ONLINE";
    cameraIndicator.textContent = "Online";
    cameraButton.textContent = "Turn Camera Off";

    if (!handLandmarker) {
      handLandmarker = await createHandTracker();
    }

    trackingIndicator.textContent = "Searching";
    message.textContent = "Hand tracking is ready. Show your hand to the camera.";
    lastVideoTime = -1;
    cancelAnimationFrame(animationId);
    trackFrame();
  } catch (error) {
    console.error(error);
    message.textContent = error.message || "Could not start the camera or hand tracker.";
    cameraStatus.textContent = "CAMERA ERROR";
    trackingIndicator.textContent = "Unavailable";
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null;
    video.srcObject = null;
    cameraButton.textContent = "Try Again";
  } finally {
    cameraButton.disabled = false;
  }
}

function stopCamera() {
  cancelAnimationFrame(animationId);
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
  video.srcObject = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  cameraStatus.textContent = "CAMERA OFFLINE";
  cameraIndicator.textContent = "Offline";
  trackingIndicator.textContent = "Not Started";
  handsIndicator.textContent = "0";
  placeholder.style.display = "flex";
  cameraButton.textContent = "Activate Camera";
  message.textContent = "Camera is off. Activate it to begin hand tracking.";
}

cameraButton.addEventListener("click", () => {
  if (stream) stopCamera();
  else startCamera();
});

window.addEventListener("resize", resizeCanvas);
window.addEventListener("pagehide", () => {
  if (stream) stream.getTracks().forEach(track => track.stop());
});
