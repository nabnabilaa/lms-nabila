import Fastify from "fastify";
import cors from "@fastify/cors";
import socketioServer from "fastify-socket.io";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { setupSocketIO } from "./socket";
import { recorderBot } from "./recorder";
import {
  launchMeetingBrowser,
  getBrowserSession,
  isBrowserRunning,
  getActiveSessions,
  openDownloads, // Sekarang dipakai
  openHistory,   // Sekarang dipakai
  takeScreenshot,
  printPage,
  zoomIn,
  zoomOut,
  zoomReset,
  getSessionDownloads,
} from "./browserLauncher";
import path from "path";
import fs from "fs";
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./types";

dotenv.config();

const port = parseInt(process.env.PORT || "3000", 10);

const fastify = Fastify({
  logger: false,
});

// Izinkan semua origin
fastify.register(cors, {
  origin: true,
  methods: ["GET", "POST"],
});

fastify.register(socketioServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// --- SERVE RECORDINGS DENGAN AUTO DOWNLOAD ---
fastify.get("/recordings/:filename", async (req, reply) => {
  const { filename } = req.params as { filename: string };
  const filePath = path.join(process.cwd(), "server", "recordings", filename);

  console.log(`[Server] Download request: ${filename}`);

  if (!fs.existsSync(filePath)) {
    return reply.code(404).send({ error: "File not found" });
  }

  // Tentukan MimeType
  const mimeType = filename.endsWith(".mp4") ? "video/mp4" : "video/webm";
  reply.header("Content-Type", mimeType);

  // HEADER PENTING: Ini memaksa browser untuk mendownload file
  reply.header("Content-Disposition", `attachment; filename="${filename}"`);

  const stream = fs.createReadStream(filePath);
  return reply.send(stream);
});

fastify.post("/api/record/start", async (req, reply) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { roomId } = req.body as any;

  // GUNAKAN LOCALHOST untuk Bot (lebih cepat & stabil)
  const appUrl = `http://localhost:5173`;

  try {
    await recorderBot.startRecording(roomId, appUrl);
    return { success: true, message: "Recording started" };
  } catch (e) {
    console.error(e);
    return reply.code(500).send({ error: "Failed to start recording" });
  }
});

fastify.post("/api/record/stop", async (req, reply) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { roomId } = req.body as any;
  try {
    const fullPath = await recorderBot.stopRecording(roomId);

    // Ambil nama file saja dari path lengkap
    const filename = fullPath ? path.basename(fullPath) : null;

    // Kembalikan URL download
    return {
      success: true,
      filename,
      // Frontend akan menggabungkan ini dengan base URL API
      downloadUrl: filename ? `/recordings/${filename}` : null,
    };
  } catch (e) {
    console.error(e);
    return reply.code(500).send({ error: "Failed to stop recording" });
  }
});

// === LAUNCH MEETING BROWSER DENGAN BYPASS FLAGS ===
fastify.post("/api/launch-meeting", async (req, reply) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { roomId, userName, browser = "edge" } = req.body as any;

  if (!roomId) {
    return reply.code(400).send({ error: "roomId is required" });
  }

  // Build meeting URL dengan user data
  const meetingUrl = `http://localhost:5173/?room=${roomId}&name=${encodeURIComponent(userName || "User")}`;

  console.log(`[Server] Launching ${browser} for meeting: ${roomId}`);

  try {
    const result = await launchMeetingBrowser({
      meetingUrl,
      browser: browser as "edge" | "chrome",
    });

    if (result.success) {
      return {
        success: true,
        message: `Browser launched! Meeting will open in new window.`,
        meetingUrl,
      };
    } else {
      return reply.code(500).send({ error: result.error });
    }
  } catch (e) {
    console.error(e);
    return reply.code(500).send({ error: "Failed to launch browser" });
  }
});

// === AUTO LAUNCH BYPASS BROWSER ===
fastify.post("/api/launch-bypass", async (req, reply) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { targetUrl, browser = "edge" } = req.body as any;

  // DEDUPLICATION: Cek apakah sudah ada session aktif
  const activeSessions = getActiveSessions();
  if (activeSessions.length > 0) {
    console.log(
      `[Server] Already have ${activeSessions.length} active session(s), skipping launch`,
    );
    return {
      success: true,
      sessionId: activeSessions[0].sessionId,
      message: "Using existing session",
      alreadyRunning: true,
    };
  }

  // Parse target URL dan tambahkan ?bypass=true
  const url = new URL(targetUrl || "http://localhost:5173");
  url.searchParams.set("bypass", "true");

  console.log(`[Server] Launching bypass browser to: ${url.toString()}`);

  try {
    const result = await launchMeetingBrowser({
      meetingUrl: url.toString(),
      browser: browser as "edge" | "chrome",
    });

    if (result.success) {
      return { success: true, sessionId: result.sessionId };
    } else {
      return reply.code(500).send({ error: result.error });
    }
  } catch (e) {
    console.error(e);
    return reply.code(500).send({ error: "Failed to launch browser" });
  }
});

// === BROWSER STATUS CHECK ===
fastify.get("/api/browser-status/:sessionId", async (req) => {
  const { sessionId } = req.params as { sessionId: string };
  const session = getBrowserSession(sessionId);

  if (!session) {
    return {
      found: false,
      running: false,
      message: "Session not found",
    };
  }

  const running = isBrowserRunning(session);

  return {
    found: true,
    running,
    session: {
      sessionId: session.sessionId,
      launchedAt: session.launchedAt,
      browser: session.browserType,
    },
  };
});

// === LIST ALL ACTIVE BROWSER SESSIONS ===
fastify.get("/api/browser-sessions", async () => {
  const sessions = getActiveSessions();

  return {
    count: sessions.length,
    sessions: sessions.map((s) => ({
      sessionId: s.sessionId,
      launchedAt: s.launchedAt,
    })),
  };
});

fastify.get("/api/recordings", async () => {
  const recordingsDir = path.join(process.cwd(), "server", "recordings");

  if (!fs.existsSync(recordingsDir)) {
    return { files: [] };
  }

  const files = fs
    .readdirSync(recordingsDir)
    .filter(
      (file) =>
        file.endsWith(".webm") ||
        file.endsWith(".mp4") ||
        file.endsWith(".png") ||
        file.endsWith(".pdf"),
    )
    .map((file) => {
      const stats = fs.statSync(path.join(recordingsDir, file));
      return {
        name: file,
        size: stats.size,
        createdAt: stats.birthtime,
        url: `/recordings/${file}`,
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return { files };
});

// Get real browser downloads from active session (CDP tracked)
fastify.get("/api/browser/downloads", async () => {
  const sessions = getActiveSessions();
  if (sessions.length === 0) return { downloads: [] };

  const session = sessions[sessions.length - 1];
  const downloads = getSessionDownloads(session.sessionId);
  return { downloads };
});

// === BROWSER CONTROL ENDPOINTS ===

fastify.post("/api/browser/screenshot", async (req, reply) => {
  const sessions = getActiveSessions();
  if (sessions.length === 0)
    return reply.code(404).send({ error: "No active browser session" });

  const session = sessions[sessions.length - 1];

  // BACA BODY REQUEST UNTUK MENDAPATKAN MODE
  const { mode } = req.body as { mode?: 'viewport' | 'fullpage' };

  // Teruskan mode ke fungsi takeScreenshot
  const success = await takeScreenshot(session.sessionId, { mode: mode || 'viewport' });
  return { success };
});

fastify.post("/api/browser/print", async (req, reply) => {
  const sessions = getActiveSessions();
  if (sessions.length === 0)
    return reply.code(404).send({ error: "No active browser session" });

  const session = sessions[sessions.length - 1];
  const success = await printPage(session.sessionId);
  return { success };
});

fastify.post("/api/browser/zoom/in", async (req, reply) => {
  const sessions = getActiveSessions();
  if (sessions.length === 0)
    return reply.code(404).send({ error: "No active browser session" });

  const session = sessions[sessions.length - 1];
  const success = await zoomIn(session.sessionId);
  return { success };
});

fastify.post("/api/browser/zoom/out", async (req, reply) => {
  const sessions = getActiveSessions();
  if (sessions.length === 0)
    return reply.code(404).send({ error: "No active browser session" });

  const session = sessions[sessions.length - 1];
  const success = await zoomOut(session.sessionId);
  return { success };
});

fastify.post("/api/browser/zoom/reset", async (req, reply) => {
  const sessions = getActiveSessions();
  if (sessions.length === 0)
    return reply.code(404).send({ error: "No active browser session" });

  const session = sessions[sessions.length - 1];
  const success = await zoomReset(session.sessionId);
  return { success };
});

// === ENDPOINTS BARU (Fix ESLint: defined but never used) ===
// Memungkinkan trigger buka panel Downloads/History dari UI

fastify.post("/api/browser/downloads/open", async (req, reply) => {
  const sessions = getActiveSessions();
  if (sessions.length === 0)
    return reply.code(404).send({ error: "No active browser session" });

  const session = sessions[sessions.length - 1];
  const success = await openDownloads(session.sessionId);
  return { success };
});

fastify.post("/api/browser/history/open", async (req, reply) => {
  const sessions = getActiveSessions();
  if (sessions.length === 0)
    return reply.code(404).send({ error: "No active browser session" });

  const session = sessions[sessions.length - 1];
  const success = await openHistory(session.sessionId);
  return { success };
});

fastify.ready((err) => {
  if (err) {
    console.error("Fastify ready error:", err);
    process.exit(1);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const io = (fastify as any).io as Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >;

  setupSocketIO(io);
});

const start = async () => {
  try {
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`Server listening on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();