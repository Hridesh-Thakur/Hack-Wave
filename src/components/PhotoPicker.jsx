import React, { useEffect, useRef, useState } from "react";
import { Camera, Upload, RefreshCw, X } from "lucide-react";

// Lets the seller take a photo straight from the camera (phone or laptop webcam),
// or pick one from the gallery as a fallback.
export default function PhotoPicker({ previewUrl, onPick, notify }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const galleryRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };
  useEffect(() => stopCamera, []);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      // Older browsers: the file input with `capture` opens the phone camera directly.
      cameraInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      setCameraOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
      });
    } catch (error) {
      notify("Camera permission was blocked. Allow camera access, or upload from your gallery.");
      cameraInputRef.current?.click();
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return notify("Camera is still starting. Try again in a second.");
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return notify("Could not capture the photo. Please try again.");
      onPick(new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
      stopCamera();
    }, "image/jpeg", 0.88);
  };

  const onFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onPick(file);
  };

  return (
    <div className="photo-picker">
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onFile} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />

      {cameraOn ? (
        <div className="camera-live">
          <video ref={videoRef} playsInline muted />
          <div className="camera-actions">
            <button type="button" className="button button-light" onClick={takePhoto}><Camera size={16} /> Capture photo</button>
            <button type="button" className="button button-outline camera-cancel" onClick={stopCamera}><X size={15} /> Cancel</button>
          </div>
        </div>
      ) : previewUrl ? (
        <div className="photo-preview">
          <img src={previewUrl} alt="Item preview" />
          <div className="photo-preview-actions">
            <button type="button" className="button button-outline button-small" onClick={startCamera}><RefreshCw size={13} /> Retake</button>
            <button type="button" className="button button-outline button-small" onClick={() => onPick(null)}><X size={13} /> Remove</button>
          </div>
        </div>
      ) : (
        <div className="photo-empty">
          <div className="photo-empty-icon"><Camera size={26} /></div>
          <strong>Add a photo of your item</strong>
          <small>Take it right now with your camera, or choose one from your gallery. JPG or PNG · up to 8 MB</small>
          <div className="photo-empty-actions">
            <button type="button" className="button button-dark" onClick={startCamera}><Camera size={15} /> Take photo</button>
            <button type="button" className="button button-outline" onClick={() => galleryRef.current?.click()}><Upload size={15} /> Upload from gallery</button>
          </div>
        </div>
      )}
    </div>
  );
}
