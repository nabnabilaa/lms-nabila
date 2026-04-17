import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
  MoreVertical,
  ZoomIn,
  Download,
  Camera,
  Printer,
  History,
  Minus,
  Plus,
  Maximize2,
  FileVideo,
} from "lucide-react";

interface BrowserToolbarProps {
  className?: string;
}

interface RecordingFile {
  name: string;
  size: number;
  createdAt: string;
  url: string;
}

interface BrowserDownload {
  guid: string;
  url: string;
  suggestedFilename: string;
  state: "inProgress" | "completed" | "canceled";
  receivedBytes: number;
  totalBytes: number;
}

export function BrowserToolbar({ className = "" }: BrowserToolbarProps) {
  const [currentUrl, setCurrentUrl] = useState(window.location.href);
  const [showMenu, setShowMenu] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(80);
  const [recordings, setRecordings] = useState<RecordingFile[]>([]);
  const [browserDownloads, setBrowserDownloads] = useState<BrowserDownload[]>([]);
  const [historyItems, setHistoryItems] = useState<string[]>([]);

  const menuRef = useRef<HTMLDivElement>(null);
  const downloadsRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const isBypassMode = new URLSearchParams(window.location.search).get("bypass") === "true";

  // === FUNGSI UTAMA ZOOM ===
  // Menggunakan transform: scale pada konten, bukan zoom pada body
  const applyZoom = (level: number) => {
    const contentArea = document.getElementById("browser-content-area");
    if (contentArea) {
      contentArea.style.zoom = `${level}%`;
    } else {
      document.body.style.zoom = `${level}%`; // Fallback
    }
  };

  const handleScreenshot = async (mode: 'viewport' | 'fullpage' = 'viewport') => {
    setShowMenu(false);
    setTimeout(async () => {
      try {
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/browser/screenshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode })
        });
      } catch (e) {
        console.error('Failed to trigger screenshot:', e);
      }
    }, 500);
  };

  const handleDownloads = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/recordings`,
      );
      const data = await res.json();
      setRecordings(data.files || []);
      setShowDownloads(true);
    } catch (e) {
      console.error("Failed to fetch recordings:", e);
    }
    setShowMenu(false);
  };

  const handlePrint = async () => {
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/browser/print`,
        { method: "POST" },
      );
    } catch (e) {
      console.error("Failed to trigger print:", e);
    }
    setShowMenu(false);
  };

  const handleHistory = () => {
    const history = JSON.parse(localStorage.getItem("meet_history") || "[]");
    setHistoryItems(history);
    setShowHistory(true);
    setShowMenu(false);
  };

  const handleBack = () => window.history.back();
  const handleForward = () => window.history.forward();
  const handleRefresh = () => window.location.reload();

  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel + 10, 200);
    setZoomLevel(newZoom);
    applyZoom(newZoom); // GUNAKAN applyZoom
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel - 10, 50);
    setZoomLevel(newZoom);
    applyZoom(newZoom); // GUNAKAN applyZoom
  };

  const handleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
    setShowMenu(false);
  };

  useEffect(() => {
    const addToHistory = (url: string) => {
      const history = JSON.parse(localStorage.getItem("meet_history") || "[]");
      if (history[0] !== url) {
        const newHistory = [url, ...history.slice(0, 19)];
        localStorage.setItem("meet_history", JSON.stringify(newHistory));
        setHistoryItems(newHistory);
      } else {
        setHistoryItems(history);
      }
    };

    const handlePopState = () => {
      const url = window.location.href;
      setCurrentUrl(url);
      addToHistory(url);
    };

    window.addEventListener("popstate", handlePopState);
    addToHistory(window.location.href);

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
      if (downloadsRef.current && !downloadsRef.current.contains(e.target as Node)) {
        setShowDownloads(false);
      }
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    // Set default zoom on mount
    applyZoom(80);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Zoom Shortcuts
      if (e.ctrlKey) {
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          const newZoom = Math.min(zoomLevel + 10, 200);
          setZoomLevel(newZoom);
          applyZoom(newZoom); // GUNAKAN applyZoom
        } else if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          const newZoom = Math.max(zoomLevel - 10, 50);
          setZoomLevel(newZoom);
          applyZoom(newZoom); // GUNAKAN applyZoom
        } else if (e.key === "0") {
          e.preventDefault();
          setZoomLevel(100);
          applyZoom(100); // GUNAKAN applyZoom
        }
      }

      if (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleScreenshot('viewport');
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomLevel]);

  useEffect(() => {
    if (!showDownloads) return;

    const fetchDownloads = async () => {
      try {
        const browserRes = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/browser/downloads`,
        );
        const browserData = await browserRes.json();
        setBrowserDownloads(browserData.downloads || []);

        const recRes = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/recordings`,
        );
        const recData = await recRes.json();
        setRecordings(recData.files || []);
      } catch (e) {
        console.error("Failed to fetch downloads:", e);
      }
    };

    fetchDownloads();
    const interval = setInterval(fetchDownloads, 2000);

    return () => clearInterval(interval);
  }, [showDownloads]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const displayUrl = currentUrl.replace(/^https?:\/\//, "");

  if (!isBypassMode) {
    return null;
  }

  return (
    <div className={`browser-toolbar ${className}`}>
      <div className="toolbar-nav-buttons">
        <button onClick={handleBack} className="toolbar-btn" title="Back (Alt+Left)">
          <ArrowLeft size={16} />
        </button>
        <button onClick={handleForward} className="toolbar-btn" title="Forward (Alt+Right)">
          <ArrowRight size={16} />
        </button>
        <button onClick={handleRefresh} className="toolbar-btn" title="Refresh (Ctrl+R)">
          <RotateCw size={16} />
        </button>
      </div>

      <div className="toolbar-address-bar">
        <Lock size={12} className="address-lock-icon" />
        <span className="address-text">{displayUrl}</span>
      </div>

      <div className="toolbar-menu-container" ref={menuRef}>
        <button onClick={() => setShowMenu(!showMenu)} className="toolbar-btn toolbar-menu-btn" title="More options">
          <MoreVertical size={16} />
        </button>

        {showMenu && (
          <div className="toolbar-dropdown">
            <div className="toolbar-menu-item zoom-controls">
              <ZoomIn size={16} />
              <span className="menu-label">Zoom</span>
              <div className="zoom-buttons">
                <button onClick={handleZoomOut} className="zoom-btn" title="Zoom out">
                  <Minus size={14} />
                </button>
                <span className="zoom-level">{zoomLevel}%</span>
                <button onClick={handleZoomIn} className="zoom-btn" title="Zoom in">
                  <Plus size={14} />
                </button>
                <button onClick={handleFullscreen} className="zoom-btn" title="Fullscreen">
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>

            <div className="menu-divider"></div>

            <button className="toolbar-menu-item" onClick={handleDownloads}>
              <Download size={16} />
              <span className="menu-label">Downloads</span>
              <span className="menu-shortcut">Ctrl+J</span>
            </button>

            <button className="toolbar-menu-item" onClick={handleHistory}>
              <History size={16} />
              <span className="menu-label">History</span>
              <span className="menu-shortcut">Ctrl+H</span>
            </button>

            <button className="toolbar-menu-item" onClick={handlePrint}>
              <Printer size={16} />
              <span className="menu-label">Print</span>
              <span className="menu-shortcut">Ctrl+P</span>
            </button>

            <div className="menu-divider"></div>

            <div style={{
              padding: '8px 12px 4px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#5f6368',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Screen Capture
            </div>

            <button className="toolbar-menu-item" onClick={() => handleScreenshot('viewport')}>
              <Camera size={16} />
              <span className="menu-label">Visible Part</span>
              <span className="menu-shortcut">Ctrl+Shift+S</span>
            </button>

            <button className="toolbar-menu-item" onClick={() => handleScreenshot('fullpage')}>
              <FileVideo size={16} />
              <span className="menu-label">Full Page</span>
            </button>

          </div>
        )}
      </div>

      {showDownloads && (
        <div className="browser-panel" ref={downloadsRef} style={{ right: "10px" }}>
          <div className="panel-header">
            <h3>Downloads</h3>
          </div>
          <div className="panel-content">
            {browserDownloads.length > 0 && (
              <>
                <div className="history-group-title">Active Downloads</div>
                {browserDownloads.map((download) => (
                  <div key={download.guid} className="download-item">
                    <div className="download-icon">
                      <Download size={20} />
                    </div>
                    <div className="download-info">
                      <div className="file-name" title={download.suggestedFilename}>
                        {download.suggestedFilename}
                      </div>
                      <div className="file-meta">
                        <span>{formatSize(download.totalBytes)}</span> -
                        {download.state === "inProgress" ? (
                          <span style={{ color: "#8ab4f8" }}>
                            {download.totalBytes > 0
                              ? ` ${Math.round((download.receivedBytes / download.totalBytes) * 100)}%`
                              : " Downloading..."}
                          </span>
                        ) : download.state === "completed" ? (
                          <span style={{ color: "#81c995" }}> Completed</span>
                        ) : (
                          <span style={{ color: "#f28b82" }}> Canceled</span>
                        )}
                      </div>
                      {download.state === "inProgress" && download.totalBytes > 0 && (
                        <div style={{ marginTop: 4, height: 3, background: "#3c4043", borderRadius: 2 }}>
                          <div style={{
                            height: "100%",
                            width: `${(download.receivedBytes / download.totalBytes) * 100}%`,
                            background: "#8ab4f8",
                            borderRadius: 2,
                            transition: "width 0.3s",
                          }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}

            {recordings.length > 0 && (
              <>
                <div className="history-group-title">Files</div>
                {recordings.map((file, idx) => (
                  <div key={idx} className="download-item">
                    <div className="download-icon">
                      <FileVideo size={20} />
                    </div>
                    <div className="download-info">
                      <div className="file-name" title={file.name}>{file.name}</div>
                      <div className="file-meta">
                        <span>{formatSize(file.size)}</span>
                        {" - "}
                        <a href={`${import.meta.env.VITE_API_URL || "http://localhost:3000"}${file.url}`} target="_blank" rel="noreferrer">
                          Open file
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {browserDownloads.length === 0 && recordings.length === 0 && (
              <div className="empty-state">No downloads</div>
            )}
          </div>
        </div>
      )}

      {showHistory && (
        <div className="browser-panel" ref={historyRef} style={{ right: "10px" }}>
          <div className="panel-header">
            <h3>History</h3>
          </div>
          <div className="panel-content">
            <div className="history-group-title">Recent</div>
            {historyItems.map((url, idx) => (
              <div key={idx} className="history-item" onClick={() => (window.location.href = url)}>
                <div className="history-icon">
                  <img src="/vite.svg" alt="icon" width="16" height="16" />
                </div>
                <div className="history-info">
                  <div className="history-title">{url.replace(/^https?:\/\//, "")}</div>
                  <div className="history-time">Just now</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// FIX: Hapus definisi FolderIcon, SearchIcon, dll yang tidak dipakai
export const BrowserToolbarStyles = `
.browser-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: #202124;
    border-bottom: 1px solid #3c4043;
    user-select: none;
    -webkit-app-region: drag;
    position: relative;
    z-index: 9999;
}

.toolbar-nav-buttons {
    display: flex;
    gap: 4px;
    -webkit-app-region: no-drag;
}

.toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    color: #9aa0a6;
    border-radius: 50%;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
}

.toolbar-btn:hover {
    background: #3c4043;
    color: #e8eaed;
}

.toolbar-btn:active {
    background: #4c5053;
}

.toolbar-address-bar {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: #303134;
    border-radius: 20px;
    color: #9aa0a6;
    font-size: 13px;
    overflow: hidden;
    -webkit-app-region: no-drag;
}

.address-lock-icon {
    color: #9aa0a6;
    flex-shrink: 0;
}

.address-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* Menu container */
.toolbar-menu-container {
    position: relative;
    -webkit-app-region: no-drag;
}

.toolbar-menu-btn {
    margin-left: 4px;
}

/* Dropdown menu */
.toolbar-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 8px;
    min-width: 280px;
    background: #292a2d;
    border: 1px solid #3c4043;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    z-index: 1000;
    padding: 8px 0;
    animation: dropdownFadeIn 0.15s ease-out;
}

@keyframes dropdownFadeIn {
    from {
        opacity: 0;
        transform: translateY(-8px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.toolbar-menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 16px;
    border: none;
    background: transparent;
    color: #e8eaed;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s;
    text-align: left;
}

.toolbar-menu-item:hover {
    background: #3c4043;
}

.menu-label {
    flex: 1;
}

.menu-shortcut {
    color: #9aa0a6;
    font-size: 12px;
}

.menu-divider {
    height: 1px;
    background: #3c4043;
    margin: 8px 0;
}

/* Zoom controls */
.zoom-controls {
    cursor: default;
}

.zoom-controls:hover {
    background: transparent;
}

.zoom-buttons {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
}

.zoom-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: #3c4043;
    color: #e8eaed;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s;
}

.zoom-btn:hover {
    background: #4c5053;
}

.zoom-level {
    min-width: 48px;
    text-align: center;
    color: #e8eaed;
    font-size: 13px;
}

/* Panels (Downloads/History) */
.browser-panel {
    position: absolute;
    top: 48px;
    width: 360px;
    max-height: 500px;
    background: #1f1f1f;
    border: 1px solid #3c4043;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    z-index: 9900;
    display: flex;
    flex-direction: column;
    -webkit-app-region: no-drag;
    color: #e8eaed;
    font-family: 'Segoe UI', system-ui, sans-serif;
}

.panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #3c4043;
}

.panel-header h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 500;
}

.panel-actions {
    display: flex;
    gap: 4px;
}

.panel-icon-btn {
    background: transparent;
    border: none;
    color: #9aa0a6;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
}

.panel-icon-btn:hover {
    background: #3c4043;
    color: #e8eaed;
}

.panel-search {
    padding: 8px 16px;
}

.panel-search input {
    width: 100%;
    background: #202124;
    border: 1px solid #3c4043;
    border-radius: 4px;
    padding: 6px 10px;
    color: white;
    font-size: 13px;
}

.panel-tabs {
    display: flex;
    padding: 0 16px;
    gap: 16px;
    border-bottom: 1px solid #3c4043;
}

.panel-tabs span {
    padding: 8px 0;
    font-size: 13px;
    color: #9aa0a6;
    cursor: pointer;
    position: relative;
}

.panel-tabs span.active {
    color: #8ab4f8;
}

.panel-tabs span.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: #8ab4f8;
}

.panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
    max-height: 400px;
}

.empty-state {
    padding: 32px;
    text-align: center;
    color: #9aa0a6;
    font-size: 13px;
}

/* Download item */
.download-item {
    display: flex;
    align-items: center;
    padding: 10px 16px;
    gap: 12px;
}

.download-item:hover {
    background: #292a2d;
}

.download-icon {
    width: 32px;
    height: 32px;
    background: #3c4043;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #e8eaed;
}

.download-info {
    flex: 1;
    overflow: hidden;
}

.file-name {
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 2px;
}

.file-meta {
    font-size: 11px;
    color: #9aa0a6;
}

.file-meta a {
    color: #8ab4f8;
    text-decoration: none;
}

.file-meta a:hover {
    text-decoration: underline;
}

/* History item */
.history-group-title {
    padding: 8px 16px;
    font-size: 12px;
    color: #9aa0a6;
    font-weight: 500;
}

.history-item {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    gap: 12px;
    cursor: pointer;
}

.history-item:hover {
    background: #292a2d;
}

.history-icon {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.history-info {
    flex: 1;
    overflow: hidden;
}

.history-title {
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #e8eaed;
}

.history-time {
    font-size: 11px;
    color: #9aa0a6;
}
`;
