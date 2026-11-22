
const camera = document.getElementById("camera");
const cameraButton = document.getElementById("camera-button");
const cameraStatus = document.getElementById("camera-status");
const cameraIndicator = document.getElementById("camera-indicator");
const placeholder = document.getElementById("camera-placeholder");

let cameraStream = null;

cameraButton.addEventListener("click", async () => {
    try {
        if (!cameraStream) {
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });

            camera.srcObject = cameraStream;

            cameraStatus.textContent = "CAMERA ONLINE";
            cameraIndicator.textContent = "Online";
            placeholder.style.display = "none";
            cameraButton.textContent = "Turn Camera Off";

        } else {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;

            camera.srcObject = null;

            cameraStatus.textContent = "CAMERA OFFLINE";
            cameraIndicator.textContent = "Offline";
            placeholder.style.display = "flex";
            cameraButton.textContent = "Activate Camera";
        }

    } catch (error) {
        console.error("Camera error:", error);
        cameraStatus.textContent = "CAMERA ERROR";
        alert("Could not access camera. Check browser permissions.");
    }
});
