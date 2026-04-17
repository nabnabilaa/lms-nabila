import puppeteer, { Browser, Page, CDPSession, KeyInput, ScreenshotOptions } from "puppeteer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

/**
 * Browser Launcher - Launch browser dengan Puppeteer untuk full control
 * Mendukung Microsoft Edge dan Google Chrome
 */

// Path Default Browser (Windows)
const DEFAULT_PATHS = {
  edge: [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
  ],
  chrome: [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
  ],
};

// Helper untuk mencari path executable yang valid di sistem
function findBrowserPath(type: "edge" | "chrome"): string | undefined {
  const paths = DEFAULT_PATHS[type];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

// === BYPASS FLAGS UNIVERSAL (Chrome & Edge) ===
const BYPASS_FLAGS = [
  // 1. Media & Screen Capture
  "--auto-select-desktop-capture-source=Entire screen",
  "--auto-accept-this-tab-capture",
  "--enable-usermedia-screen-capturing",
  "--allow-http-screen-capture",
  "--use-fake-ui-for-media-stream",
  "--autoplay-policy=no-user-gesture-required",
  "--no-user-gesture-required",

  // 2. Security & UI Cleanup
  "--no-first-run",
  "--disable-sync",
  "--disable-default-apps",
  "--disable-translate",
  "--disable-infobars",
  "--disable-notifications",
  "--hide-crash-restore-bubble",
  "--bookmark-bar-visibility=never",
  "--password-store=basic",
  "--disable-component-update",
  
  // 3. EDGE SPECIFIC KILL SWITCH
  "--disable-features=msEdgeSidebarV2,EdgeCollectionsEnabled,msEdgeBookBar,msEdgeShoppingAssist,msEdgeEnableSpotlight,msEdgeEnableNurturing,WebCapture,msWebCapture,msSmartScreenProtection,msHub,msFeedback,msFirstRunExperience",
];

// === TYPES ===
export interface BrowserSession {
  sessionId: string;
  browser: Browser;
  page: Page;
  cdpSession?: CDPSession;
  launchedAt: Date;
  targetUrl: string;
  browserType: "edge" | "chrome";
}

export interface DownloadItem {
  guid: string;
  url: string;
  suggestedFilename: string;
  state: "inProgress" | "completed" | "canceled";
  receivedBytes: number;
  totalBytes: number;
}

// Interface untuk event dari CDP
interface DownloadProgressEvent {
  guid: string;
  state: "inProgress" | "completed" | "canceled";
  url?: string;
  suggestedFilename?: string;
  receivedBytes?: number;
  totalBytes?: number;
}

interface ScreenshotOptionsExtended {
    mode: 'viewport' | 'fullpage';
}

// === STATE MANAGEMENT ===
export const browserSessions = new Map<string, BrowserSession>();
export const sessionDownloads = new Map<string, DownloadItem[]>();

export function getSessionDownloads(sessionId: string): DownloadItem[] {
  return sessionDownloads.get(sessionId) || [];
}

export function getBrowserSession(sessionId: string): BrowserSession | undefined {
  return browserSessions.get(sessionId);
}

export function isBrowserRunning(session: BrowserSession): boolean {
  try {
    return session.browser.isConnected();
  } catch {
    return false;
  }
}

export function getActiveSessions(): BrowserSession[] {
  const activeSessions: BrowserSession[] = [];
  for (const [sessionId, session] of browserSessions) {
    if (isBrowserRunning(session)) {
      activeSessions.push(session);
    } else {
      browserSessions.delete(sessionId);
    }
  }
  return activeSessions;
}

interface LaunchOptions {
  meetingUrl: string;
  browser?: "edge" | "chrome";
}

interface LaunchResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

export async function launchMeetingBrowser(options: LaunchOptions): Promise<LaunchResult> {
  const { meetingUrl, browser: browserType = "edge" } = options;
  
  const browserPath = findBrowserPath(browserType);
  if (!browserPath) {
    return { success: false, error: `${browserType} browser not found in standard paths.` };
  }

  const sessionId = crypto.randomUUID();
  const userDataDir = path.join(process.env.TEMP || "C:\\Temp", `MeetClone_${sessionId}`);

  console.log(`[Launcher] Launching ${browserType} session: ${sessionId}`);

  try {
    const browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: false,
      defaultViewport: null,
      ignoreDefaultArgs: ["--enable-automation"], 
      args: [
        ...BYPASS_FLAGS,
        `--user-data-dir=${userDataDir}`,
        `--app=${meetingUrl}`,
      ],
    });

    const pages = await browser.pages();
    const page = pages[0] || (await browser.newPage());

    if (page.url() !== meetingUrl) {
      await page.goto(meetingUrl, { waitUntil: "domcontentloaded" });
    }

    const cdpSession = await page.target().createCDPSession();
    
    const userDownloadsPath = path.join(process.env.USERPROFILE || process.env.HOME || ".", "Downloads");
    
    await cdpSession.send("Browser.setDownloadBehavior", {
      behavior: "allow", 
      downloadPath: userDownloadsPath,
      eventsEnabled: true
    });

    sessionDownloads.set(sessionId, []);

    // FIX 1: Menggunakan interface DownloadProgressEvent alih-alih 'any'
    cdpSession.on("Browser.downloadProgress", (event: DownloadProgressEvent) => {
      const downloads = sessionDownloads.get(sessionId) || [];
      const existing = downloads.find((d) => d.guid === event.guid);

      if (existing) {
        Object.assign(existing, {
            state: event.state,
            receivedBytes: event.receivedBytes || 0,
            totalBytes: event.totalBytes || 0
        });
      } else {
        downloads.push({
          guid: event.guid,
          url: event.url || "",
          suggestedFilename: event.suggestedFilename || `download_${event.guid}`,
          state: event.state,
          receivedBytes: event.receivedBytes || 0,
          totalBytes: event.totalBytes || 0,
        });
      }
      sessionDownloads.set(sessionId, downloads);
    });

    browserSessions.set(sessionId, {
      sessionId,
      browser,
      page,
      cdpSession,
      launchedAt: new Date(),
      targetUrl: meetingUrl,
      browserType,
    });

    return { success: true, sessionId };
  } catch (error) {
    console.error("[Launcher] Error:", error);
    return { success: false, error: String(error) };
  }
}

// === BROWSER CONTROL FUNCTIONS ===

export async function injectKeyboardShortcut(
  sessionId: string,
  // FIX 2: Menggunakan tipe KeyInput dari puppeteer
  key: KeyInput,
  modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {},
): Promise<boolean> {
  const session = browserSessions.get(sessionId);
  if (!session || !isBrowserRunning(session)) return false;

  try {
    const { page } = session;
    await page.bringToFront();
    
    if (modifiers.ctrl) await page.keyboard.down("Control");
    if (modifiers.shift) await page.keyboard.down("Shift");
    if (modifiers.alt) await page.keyboard.down("Alt");
    
    // FIX 2: Hapus casting 'as any' karena key sudah bertipe KeyInput
    await page.keyboard.press(key);
    
    if (modifiers.alt) await page.keyboard.up("Alt");
    if (modifiers.shift) await page.keyboard.up("Shift");
    if (modifiers.ctrl) await page.keyboard.up("Control");

    return true;
  } catch {
    // FIX 3: Hapus variabel 'error' yang tidak digunakan
    return false;
  }
}

export async function openDownloads(sessionId: string): Promise<boolean> {
  return injectKeyboardShortcut(sessionId, "j", { ctrl: true });
}

export async function openHistory(sessionId: string): Promise<boolean> {
  return injectKeyboardShortcut(sessionId, "h", { ctrl: true });
}

/**
 * Take screenshot - Client-Side Download Style
 */
export async function takeScreenshot(sessionId: string, options: ScreenshotOptionsExtended = { mode: 'viewport' }): Promise<boolean> {
  const session = browserSessions.get(sessionId);
  if (!session || !isBrowserRunning(session)) {
    console.error("[Launcher] Session not found:", sessionId);
    return false;
  }

  try {
    const { page } = session;
    await page.bringToFront();

    await new Promise(r => setTimeout(r, 300));

    console.log(`[Launcher] Capturing screenshot (${options.mode})...`);

    // FIX 4: Menggunakan tipe ScreenshotOptions alih-alih 'any'
    const puppeteerOptions: ScreenshotOptions = {
        type: 'png',
        fullPage: options.mode === 'fullpage'
    };

    const screenshotBuffer = await page.screenshot(puppeteerOptions);
    const base64Image = screenshotBuffer.toString('base64');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `Screenshot-${options.mode}-${timestamp}.png`;

    console.log("[Launcher] Injecting download trigger to browser...");

    await page.evaluate((b64, fname, modeText) => {
        // A. Fungsi Download Real
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${b64}`;
        link.download = fname;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // B. Fungsi Notifikasi Visual
        const notif = document.createElement('div');
        Object.assign(notif.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#22c55e',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: '2147483647',
            fontFamily: 'Segoe UI, sans-serif',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'slideIn 0.3s ease-out',
            pointerEvents: 'none'
        });

        notif.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
            </svg>
            <span>${modeText} Saved!</span>
        `;

        document.body.appendChild(notif);

        setTimeout(() => {
            notif.style.opacity = '0';
            notif.style.transition = 'opacity 0.5s';
            setTimeout(() => notif.remove(), 500);
        }, 3000);

    }, base64Image, filename, options.mode === 'fullpage' ? 'Full Page' : 'Screenshot');

    return true;
  } catch (error) {
    console.error("[Launcher] Error taking screenshot:", error);
    return false;
  }
}

export async function printPage(sessionId: string): Promise<boolean> {
  const session = browserSessions.get(sessionId);
  if (!session || !isBrowserRunning(session)) return false;
  try {
    await session.page.evaluate(() => window.print());
    return true;
  } catch {
    // FIX 3: Hapus variabel 'error' yang tidak digunakan
    return false; 
  }
}

export async function zoomIn(sessionId: string): Promise<boolean> {
  return injectKeyboardShortcut(sessionId, "=", { ctrl: true });
}

export async function zoomOut(sessionId: string): Promise<boolean> {
  return injectKeyboardShortcut(sessionId, "-", { ctrl: true });
}

export async function zoomReset(sessionId: string): Promise<boolean> {
  return injectKeyboardShortcut(sessionId, "0", { ctrl: true });
}