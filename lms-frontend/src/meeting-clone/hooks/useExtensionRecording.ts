import { useState, useCallback, useEffect } from "react";

/**
 * useExtensionRecording Hook
 *
 * Menggunakan Chrome Extension untuk screen recording.
 * Extension bypass dialog screen share menggunakan desktopCapture API.
 *
 * Fallback ke getDisplayMedia standar jika extension tidak terinstall.
 */
export const useExtensionRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [extensionAvailable, setExtensionAvailable] = useState(false);
  const [duration, setDuration] = useState(0);

  // Check if extension is available
  useEffect(() => {
    const checkExtension = () => {
      // @ts-ignore - MeetCloneRecorder is injected by extension
      if (window.MeetCloneRecorder?.isAvailable) {
        setExtensionAvailable(true);
        console.log("[Recording] Extension detected!");
      }
    };

    // Check immediately
    checkExtension();

    // Listen for extension ready event
    const handleExtensionReady = () => {
      setExtensionAvailable(true);
      console.log("[Recording] Extension ready event received!");
    };

    window.addEventListener("meetclone-recorder-ready", handleExtensionReady);

    return () => {
      window.removeEventListener(
        "meetclone-recorder-ready",
        handleExtensionReady,
      );
    };
  }, []);

  // Listen for recording events from extension
  useEffect(() => {
    const handleStarted = () => {
      setIsRecording(true);
      console.log("[Recording] Started via extension");
    };

    const handleComplete = (event: CustomEvent) => {
      setIsRecording(false);
      setDuration(0);
      console.log("[Recording] Complete, size:", event.detail?.size);
    };

    const handleError = (event: CustomEvent) => {
      setIsRecording(false);
      console.error("[Recording] Error:", event.detail?.error);
    };

    window.addEventListener(
      "meetclone-recording-started",
      handleStarted as EventListener,
    );
    window.addEventListener(
      "meetclone-recording-complete",
      handleComplete as EventListener,
    );
    window.addEventListener(
      "meetclone-recording-error",
      handleError as EventListener,
    );

    return () => {
      window.removeEventListener(
        "meetclone-recording-started",
        handleStarted as EventListener,
      );
      window.removeEventListener(
        "meetclone-recording-complete",
        handleComplete as EventListener,
      );
      window.removeEventListener(
        "meetclone-recording-error",
        handleError as EventListener,
      );
    };
  }, []);

  // Duration timer
  useEffect(() => {
    let interval: number | undefined;
    if (isRecording) {
      interval = window.setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      if (extensionAvailable) {
        // Use extension (NO DIALOG!)
        // @ts-ignore
        await window.MeetCloneRecorder.startRecording();
        console.log("[Recording] Started via extension API");
      } else {
        // Fallback to standard getDisplayMedia (with dialog)
        console.log(
          "[Recording] Extension not available, using standard dialog",
        );
        await startStandardRecording();
      }
    } catch (error) {
      console.error("[Recording] Failed to start:", error);
    }
  }, [extensionAvailable]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (extensionAvailable) {
      // @ts-ignore
      window.MeetCloneRecorder?.stopRecording();
    } else {
      stopStandardRecording();
    }
    setIsRecording(false);
    setDuration(0);
  }, [extensionAvailable]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    duration,
    extensionAvailable,
  };
};

// ============================================
// Fallback: Standard getDisplayMedia recording
// ============================================
let standardRecorder: MediaRecorder | null = null;
let standardStream: MediaStream | null = null;
let standardChunks: Blob[] = [];

async function startStandardRecording() {
  try {
    standardStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: "monitor",
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      },
      audio: true,
    } as DisplayMediaStreamOptions);

    const mimeTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    let mimeType = "video/webm";
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        mimeType = type;
        break;
      }
    }

    standardChunks = [];
    standardRecorder = new MediaRecorder(standardStream, {
      mimeType,
      videoBitsPerSecond: 5000000,
    });

    standardRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) standardChunks.push(e.data);
    };

    standardRecorder.onstop = () => {
      const blob = new Blob(standardChunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meeting-recording-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    };

    standardRecorder.start(1000);

    window.dispatchEvent(new CustomEvent("meetclone-recording-started"));
  } catch (error) {
    console.error("[Recording] Standard recording error:", error);
    throw error;
  }
}

function stopStandardRecording() {
  if (standardRecorder) {
    standardRecorder.stop();
    standardRecorder = null;
  }
  if (standardStream) {
    standardStream.getTracks().forEach((t) => t.stop());
    standardStream = null;
  }
}
