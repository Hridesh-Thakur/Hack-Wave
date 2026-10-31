
import React, { useEffect, useRef, useState } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { Camera, CameraOff, Shirt, Upload, X } from "lucide-react";

const garments = [
  {
    name: "T-shirt",
    type: "tshirt",
    color: "#e8d8bd",
    width: 1.35,
    height: 1.05,
  },
  {
    name: "Shirt",
    type: "shirt",
    color: "#b8c9db",
    width: 1.3,
    height: 1.05,
  },
  {
    name: "Jacket",
    type: "jacket",
    color: "#66746a",
    width: 1.45,
    height: 1.12,
  },
];

export default function VirtualTryOn({ product, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const trackerRef = useRef(null);
  const frameRef = useRef(null);
  const garmentRef = useRef(garments[0]);
  const customImageRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("tshirt");
  const [customImage, setCustomImage] = useState("");

  useEffect(() => {
    garmentRef.current = garments.find((g) => g.type === selected) || garments[0];
  }, [selected]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (trackerRef.current) {
        trackerRef.current.close();
        trackerRef.current = null;
      }
      if (customImageRef.current) {
        URL.revokeObjectURL(customImageRef.current);
      }
    };
  }, []);

  async function startCamera() {
    setError("");
    setLoading(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera requires HTTPS or localhost in a supported browser.");
      }

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      if (!trackerRef.current) {
        trackerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: 640, height: 480 },
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setCameraOn(true);
      frameRef.current = requestAnimationFrame(drawFrame);
    } catch (err) {
      stopCamera();
      setError(err.message || "Could not start the camera.");
    } finally {
      setLoading(false);
    }
  }

  function stopCamera() {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setCameraOn(false);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function drawGarment(ctx, left, right, leftHip, rightHip) {
    const garment = garmentRef.current;
    const shoulderWidth = Math.hypot(right.x - left.x, right.y - left.y);
    const centerX = ((left.x + right.x) / 2) * ctx.canvas.width;
    const shoulderY = ((left.y + right.y) / 2) * ctx.canvas.height;
    const hipY = ((leftHip.y + rightHip.y) / 2) * ctx.canvas.height;

    const width = shoulderWidth * ctx.canvas.width * garment.width;
    const height = Math.max(shoulderWidth * ctx.canvas.width, hipY - shoulderY) *
      garment.height;

    const top = shoulderY - height * 0.06;

    const image = customImageRef.current;

    if (image?.complete && image.naturalWidth > 0) {
      ctx.drawImage(image, centerX - width / 2, top, width, height);
      return;
    }

    // Temporary illustrative garment overlay.
    // Replace with transparent PNG assets for realistic garment outlines.
    const half = width / 2;
    const bottom = top + height;
    const neckWidth = width * 0.18;
    const sleeve = width * 0.2;

    ctx.save();
    ctx.fillStyle = garment.color;
    ctx.strokeStyle = "rgba(25,35,28,0.65)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(centerX - half + sleeve, top + height * 0.12);
    ctx.lineTo(centerX - half, top + height * 0.28);
    ctx.lineTo(centerX - half + width * 0.12, top + height * 0.43);
    ctx.lineTo(centerX - half + width * 0.18, top + height * 0.32);
    ctx.lineTo(centerX - half + width * 0.18, bottom);
    ctx.lineTo(centerX + half - width * 0.18, bottom);
    ctx.lineTo(centerX + half - width * 0.18, top + height * 0.32);
    ctx.lineTo(centerX + half - width * 0.12, top + height * 0.43);
    ctx.lineTo(centerX + half, top + height * 0.28);
    ctx.lineTo(centerX + half - sleeve, top + height * 0.12);
    ctx.lineTo(centerX + width * 0.18, top + height * 0.03);
    ctx.quadraticCurveTo(centerX, top + height * 0.2, centerX - width * 0.18, top + height * 0.03);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  function drawFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const tracker = trackerRef.current;

    if (!video || !canvas || !tracker || video.readyState < 2) {
      frameRef.current = requestAnimationFrame(drawFrame);
      return;
    }

    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      const result = tracker.detectForVideo(video, performance.now());
      const landmarks = result.landmarks?.[0];

      if (landmarks) {
        // MediaPipe pose indices: shoulders 11/12, hips 23/24.
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];

        if (
          leftShoulder && rightShoulder && leftHip && rightHip &&
          Math.min(leftShoulder.visibility ?? 1, rightShoulder.visibility ?? 1) > 0.45
        ) {
          drawGarment(ctx, leftShoulder, rightShoulder, leftHip, rightHip);
        }
      }
    } catch (err) {
      console.warn("Pose tracking frame failed:", err);
    }

    frameRef.current = requestAnimationFrame(drawFrame);
  }

  function handleGarmentUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("Choose an image smaller than 8 MB.");
      return;
    }

    if (customImageRef.current) {
      URL.revokeObjectURL(customImageRef.current);
    }

    const url = URL.createObjectURL(file);
    customImageRef.current = url;

    const image = new Image();
    image.onload = () => {
      setCustomImage(url);
      setError("");
    };
    image.onerror = () => setError("Could not load this garment image.");
    image.src = url;
    event.target.value = "";
  }

  return (
    <div className="vto-shell">
      <div className="vto-header">
        <div>
          <span className="vto-eyebrow">REWEAR AI · LIVE STUDIO</span>
          <h2>Your virtual fitting room</h2>
          <p>Stand back so your shoulders and waist are visible.</p>
        </div>
        <button className="vto-close" onClick={onClose} aria-label="Close try-on">
          <X size={20} />
        </button>
      </div>

      <div className="vto-layout">
        <div className="vto-stage">
          <video ref={videoRef} className="vto-video" playsInline muted />
          <canvas ref={canvasRef} className="vto-canvas" />

          {!cameraOn && (
            <div className="vto-placeholder">
              <Camera size={34} />
              <strong>Ready when you are.</strong>
              <span>Start the camera to preview your selected style.</span>
            </div>
          )}

          <div className="vto-stage-label">
            <span className={cameraOn ? "vto-live-dot" : ""} />
            {cameraOn ? "LIVE PREVIEW" : "CAMERA OFF"}
          </div>
        </div>

        <aside className="vto-controls">
          <h3><Shirt size={18} /> Choose a garment</h3>

          <div className="vto-garments">
            {garments.map((garment) => (
              <button
                key={garment.type}
                className={selected === garment.type ? "vto-garment selected" : "vto-garment"}
                onClick={() => {
                  setSelected(garment.type);
                  setCustomImage("");
                  customImageRef.current = null;
                }}
              >
                <span style={{ background: garment.color }} />
                {garment.name}
              </button>
            ))}
          </div>

          <label className="vto-upload">
            <Upload size={17} />
            Upload garment PNG
            <input type="file" accept="image/*" onChange={handleGarmentUpload} />
          </label>

          {customImage && <p className="vto-hint">Custom garment image selected.</p>}

          <button
            className="button button-dark button-full"
            onClick={cameraOn ? stopCamera : startCamera}
            disabled={loading}
          >
            {cameraOn ? <CameraOff size={17} /> : <Camera size={17} />}
            {loading ? "Starting camera..." : cameraOn ? "Stop camera" : "Start live camera"}
          </button>

          {error && <p className="vto-error">{error}</p>}

          <p className="vto-privacy">
            Your camera feed is processed in this browser and is not uploaded by this component.
          </p>
          {product && (
            <p className="vto-hint">
              Selected listing: <strong>{product.title}</strong>
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
