import { useState, useCallback } from "react";

// Use environment variable or default to localhost:3000
const API_URL = "http://localhost:3000";

export const useRecording = (roomId: string) => {
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/record/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }), // Pass roomId
      });
      const data = await res.json();
      if (data.success) {
        setIsRecording(true);
      } else {
        console.error("Failed to start server recording", data);
        alert("Failed to start recording: " + data.error);
      }
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Error starting recording. Is the server running?");
    }
  }, [roomId]);

  const stopRecording = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/record/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      const data = await res.json();
      if (data.success) {
        setIsRecording(false);
        if (data.downloadUrl) {
          // Auto download or show link
          const a = document.createElement("a");
          a.href = `${API_URL}${data.downloadUrl}`;
          a.download = data.filename || "recording.webm";
          a.click();
        }
      }
    } catch (error) {
      console.error("Error stopping recording:", error);
    }
  }, [roomId]);

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
};
