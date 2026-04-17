import { useEffect, useState, useRef } from "react";

export const useAudioLevel = (
  stream?: MediaStream,
  audioEnabled: boolean = true,
) => {
  // Return array of 3 numbers [bass, mid, treble]
  const [levels, setLevels] = useState<number[]>([0, 0, 0]);

  const frameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!stream || !audioEnabled) {
      setLevels([0, 0, 0]);
      return;
    }

    // Initialize AudioContext
    if (!audioContextRef.current) {
      audioContextRef.current = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
    const ctx = audioContextRef.current;

    const resumeContext = () => {
      if (ctx.state === "suspended") {
        ctx.resume().catch((e) => console.error("Audio resume failed", e));
      }
    };
    document.addEventListener("click", resumeContext);
    document.addEventListener("touchstart", resumeContext);
    resumeContext();

    try {
      if (sourceRef.current) sourceRef.current.disconnect();

      sourceRef.current = ctx.createMediaStreamSource(stream);

      // High-pass filter to remove DC offset & Hum (<100Hz)
      // This is the "Nuclear Option" for the stuck bass bar.
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 200;

      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 512; // 256 bins, ~93Hz per bin
      analyserRef.current.smoothingTimeConstant = 0.5;

      // Graph: Source -> Filter -> Analyser
      sourceRef.current.connect(filter);
      filter.connect(analyserRef.current);
    } catch (error) {
      console.error("Audio Context Error:", error);
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const updateVolume = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      const getAverage = (start: number, end: number) => {
        let sum = 0;
        for (let i = start; i <= end; i++) {
          sum += dataArray[i] || 0;
        }
        return sum / (end - start + 1);
      };

      // Finer resolution (fftSize 512)
      // Bin 0: 0-93Hz (Noise/Hum) -> SKIP
      // Bass: 1-4 (93Hz - 460Hz) -> Fundamental Voice
      // Mid:  5-20 (460Hz - 1800Hz) -> Vowels
      // High: 21-100 (1800Hz+) -> Air/Treble

      const bassAvg = getAverage(2, 5);
      const midAvg = getAverage(5, 20);
      const highAvg = getAverage(21, 100);

      const normalize = (val: number, gate: number) => {
        if (val < gate) return 0;

        const adjusted = val - gate;
        const range = 255 - gate;
        const n = adjusted / range; // 0 to 1 linear

        // Quadratic Curve (Power of 2)
        const quadratic = Math.pow(n, 2) * 6;

        // FINAL CLAMP: If result is < 5%, force to 0.
        // This kills any remaining tiny fluctuations from noise.
        return quadratic < 0.1 ? 0 : Math.min(1, quadratic);
      };

      const targetLevels = [
        normalize(bassAvg, 65) * 100, // Very High Gate for Bass (Hum killer)
        normalize(midAvg, 55) * 100, // High Gate for Voice
        normalize(highAvg, 45) * 100, // Moderate Gate for Treble
      ];

      setLevels((prev) => {
        return prev.map((p, i) => {
          const t = targetLevels[i];
          // Attack fast, Decay fast (0.75) for punchy animation, not floaty
          if (t > p) return t;
          if (t === 0) return p * 0.6; // Drop fast to zero
          return p * 0.8; // Normal decay
        });
      });

      frameRef.current = requestAnimationFrame(updateVolume);
    };

    updateVolume();

    return () => {
      document.removeEventListener("click", resumeContext);
      document.removeEventListener("touchstart", resumeContext);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      sourceRef.current?.disconnect();
    };
  }, [stream, audioEnabled]);

  return levels;
};
