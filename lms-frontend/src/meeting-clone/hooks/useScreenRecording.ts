import { useState, useCallback, useRef, useEffect } from "react";

/**
 * useScreenRecording - Client-side screen recording
 *
 * Based on samples-gh-pages approach:
 * - getDisplayMedia untuk capture ENTIRE SCREEN + SYSTEM AUDIO
 * - MediaRecorder untuk recording
 *
 * User akan melihat dialog untuk memilih screen, tapi ini standard behavior.
 */

function getSupportedMimeType(): string {
  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=h264,opus",
    "video/webm",
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "video/webm";
}

export const useScreenRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recordedBlobRef = useRef<Blob | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      console.log("[Recorder] Starting screen recording...");

      // === GET DISPLAY MEDIA ===
      // Based on samples-gh-pages/src/content/getusermedia/getdisplaymedia/js/main.js
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor", // Entire screen
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true, // Request system audio
      });

      streamRef.current = stream;

      // Log stream info
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      console.log("[Recorder] Video track:", videoTrack?.label || "NONE");
      console.log(
        "[Recorder] Audio track:",
        audioTrack?.label || "NONE (system audio may not be available)",
      );

      // Setup MediaRecorder
      // Based on samples-gh-pages/src/content/getusermedia/record/js/main.js
      const mimeType = getSupportedMimeType();
      console.log("[Recorder] Using mimeType:", mimeType);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5000000, // 5 Mbps for quality
        audioBitsPerSecond: 128000, // 128 kbps audio
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log("[Recorder] Chunk received:", event.data.size, "bytes");
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        recordedBlobRef.current = blob;
        console.log("[Recorder] Recording complete, size:", blob.size);
      };

      mediaRecorder.onerror = (e) => {
        console.error("[Recorder] MediaRecorder error:", e);
        setError("Recording error occurred");
      };

      // Handle user stopping share via browser UI
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        console.log("[Recorder] User stopped sharing via browser");
        stopRecording();
      });

      // Start recording with 1 second intervals
      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      // Duration timer
      setDuration(0);
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      console.log("[Recorder] Recording STARTED!");
    } catch (err) {
      console.error("[Recorder] Error:", err);
      if ((err as Error).name === "NotAllowedError") {
        setError("Permission denied - user cancelled");
      } else {
        setError((err as Error).message);
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    console.log("[Recorder] Stopping recording...");

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    console.log("[Recorder] Recording STOPPED!");
  }, []);

  const downloadRecording = useCallback((filename?: string) => {
    // Wait a bit for blob to be ready after stop
    setTimeout(() => {
      const blob = recordedBlobRef.current;
      if (!blob) {
        console.warn("[Recorder] No recording available to download");
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename || "screen-recording"}-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log("[Recorder] Download started");
    }, 500);
  }, []);

  const getRecordedBlob = useCallback(() => {
    return recordedBlobRef.current;
  }, []);

  const playRecording = useCallback(() => {
    const blob = recordedBlobRef.current;
    if (!blob) {
      console.warn("[Recorder] No recording to play");
      return;
    }

    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }, []);

  return {
    isRecording,
    duration,
    error,
    startRecording,
    stopRecording,
    downloadRecording,
    getRecordedBlob,
    playRecording,
  };
};
