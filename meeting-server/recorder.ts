import puppeteer, { Browser, Page } from "puppeteer";
import path from "path";
import fs from "fs";
import { PuppeteerScreenRecorder } from "puppeteer-screen-recorder";

interface ActiveRecording {
  browser: Browser;
  page: Page;
  recorder: PuppeteerScreenRecorder;
  filePath: string;
  startTime: number;
}

/**
 * RecorderBot - Screen recording menggunakan puppeteer-screen-recorder
 *
 * Menggunakan Chrome DevTools Protocol untuk capture video frame-by-frame.
 * TIDAK menggunakan getDisplayMedia → TIDAK ADA DIALOG!
 *
 * Cara kerja:
 * 1. Puppeteer launch browser (bisa headless)
 * 2. Bot join meeting page
 * 3. puppeteer-screen-recorder capture PAGE content via CDP
 * 4. Output langsung ke MP4
 */
export class RecorderBot {
  private activeRecordings: Map<string, ActiveRecording> = new Map();
  private recordingsDir: string;

  constructor() {
    this.recordingsDir = path.join(process.cwd(), "server", "recordings");
    if (!fs.existsSync(this.recordingsDir)) {
      fs.mkdirSync(this.recordingsDir, { recursive: true });
    }
  }

  async startRecording(roomId: string, appUrl: string) {
    if (this.activeRecordings.has(roomId)) {
      console.log(`[Recorder] Recording already active for room ${roomId}`);
      return this.activeRecordings.get(roomId)?.filePath;
    }

    console.log(`[Recorder] Starting CDP recording for room ${roomId}`);

    try {
      // ========================================
      // LAUNCH BROWSER
      // headless: false diperlukan untuk WebRTC rendering yang benar
      // Window di-posisikan off-screen supaya tidak terlihat
      // ========================================
      const browser = await puppeteer.launch({
        headless: false, // WebRTC butuh headful mode untuk render video
        defaultViewport: {
          width: 1280,
          height: 720,
        },
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",

          // Camera/mic permission bypass
          "--use-fake-ui-for-media-stream",

          // JANGAN pakai fake device - supaya tidak ada green screen
          // "--use-fake-device-for-media-stream",

          // Hide window off-screen
          "--window-position=-2000,-2000",
          "--window-size=1280,720",

          // WebRTC & media
          "--autoplay-policy=no-user-gesture-required",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding",

          // GPU untuk video rendering
          "--enable-gpu-rasterization",
          "--enable-zero-copy",
        ],
      });

      const page = await browser.newPage();

      // Console log dari browser
      page.on("console", (msg) => console.log("[BOT]:", msg.text()));

      // Navigate ke meeting
      const url = `${appUrl}/?room=${roomId}&role=recorder&name=RecorderBot`;
      console.log(`[Recorder] Bot joining: ${url}`);

      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

      // Auto join jika ada tombol
      try {
        const btn = await page
          .waitForSelector("button[type='submit'], button.join-btn", {
            timeout: 5000,
          })
          .catch(() => null);
        if (btn) {
          console.log("[Recorder] Clicking Join button...");
          await btn.click();
          await new Promise((r) => setTimeout(r, 3000));
        }
      } catch (e) {
        console.log("[Recorder] No join button, continuing...");
      }

      // Tunggu meeting page ready
      await new Promise((r) => setTimeout(r, 2000));

      // ========================================
      // SETUP PUPPETEER-SCREEN-RECORDER
      // ========================================
      const fileName = `recording-${roomId}-${Date.now()}.mp4`;
      const filePath = path.join(this.recordingsDir, fileName);

      const recorderConfig = {
        followNewTab: false,
        fps: 30,
        videoFrame: {
          width: 1280,
          height: 720,
        },
        videoCrf: 23,
        videoCodec: "libx264",
        videoPreset: "ultrafast",
        videoBitrate: 3000,
        autopad: {
          color: "#1a1a2e",
        },
        aspectRatio: "16:9",
      };

      const recorder = new PuppeteerScreenRecorder(page, recorderConfig);

      // Start recording
      await recorder.start(filePath);
      console.log(`[Recorder] ✓ Recording STARTED (CDP mode) - ${filePath}`);

      this.activeRecordings.set(roomId, {
        browser,
        page,
        recorder,
        filePath,
        startTime: Date.now(),
      });

      return filePath;
    } catch (error) {
      console.error(`[Recorder] FATAL ERROR:`, error);
      throw error;
    }
  }

  async stopRecording(roomId: string): Promise<string | null> {
    const recording = this.activeRecordings.get(roomId);
    if (!recording) {
      console.log(`[Recorder] No active recording for room ${roomId}`);
      return null;
    }

    console.log(`[Recorder] Stopping recording for room ${roomId}`);

    try {
      // Stop recorder
      await recording.recorder.stop();
      console.log(`[Recorder] Recorder stopped`);

      // Close browser
      await recording.browser.close();
      console.log(`[Recorder] Browser closed`);

      this.activeRecordings.delete(roomId);

      // Check file exists and size
      if (fs.existsSync(recording.filePath)) {
        const stats = fs.statSync(recording.filePath);
        const sizeMB = stats.size / 1024 / 1024;
        console.log(
          `[Recorder] ✓ Recording saved: ${recording.filePath} (${sizeMB.toFixed(2)} MB)`,
        );
        return recording.filePath;
      }

      console.error(`[Recorder] File not found: ${recording.filePath}`);
      return null;
    } catch (error) {
      console.error(`[Recorder] Error stopping:`, error);
      return null;
    }
  }

  getRecordingStatus(roomId: string): {
    isRecording: boolean;
    duration?: number;
  } {
    const recording = this.activeRecordings.get(roomId);
    if (!recording) {
      return { isRecording: false };
    }
    return {
      isRecording: true,
      duration: Math.floor((Date.now() - recording.startTime) / 1000),
    };
  }
}

export const recorderBot = new RecorderBot();
