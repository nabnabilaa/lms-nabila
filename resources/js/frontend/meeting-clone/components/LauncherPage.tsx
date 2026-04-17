import { useEffect, useState, useCallback, useRef } from 'react';
import { Video, Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

/**
 * LauncherPage - Auto-launch bypass browser dengan real-time status checking
 * 
 * Fitur:
 * - Menyimpan sessionId dari server untuk tracking
 * - Polling setiap 2 detik untuk cek status browser
 * - UI menunjukkan status sebenarnya (running/closed)
 * - Launch lock untuk prevent React StrictMode double execution
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const STORAGE_KEY = 'meetclone_bypass_session';
const LAUNCH_LOCK_KEY = 'meetclone_launch_lock';
const POLL_INTERVAL = 2000; // 2 seconds

type BrowserStatus = 'checking' | 'launching' | 'running' | 'closed' | 'error';

export function LauncherPage() {
    const [status, setStatus] = useState<BrowserStatus>('checking');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [error, setError] = useState('');

    // Ref untuk prevent double launch dari React StrictMode
    const launchAttempted = useRef(false);

    // Check browser status from server
    const checkBrowserStatus = useCallback(async (sid: string) => {
        try {
            const res = await fetch(`${API_URL}/api/browser-status/${sid}`);
            const data = await res.json();

            if (data.found && data.running) {
                setStatus('running');
            } else {
                // Jika session ini mati, cek apakah ada session lain yang aktif (failover)
                const sessionsRes = await fetch(`${API_URL}/api/browser-sessions`);
                const sessionsData = await sessionsRes.json();

                if (sessionsData.count > 0 && sessionsData.sessions[0].sessionId !== sid) {
                    console.log('Switching to another active session:', sessionsData.sessions[0].sessionId);
                    setSessionId(sessionsData.sessions[0].sessionId);
                    localStorage.setItem(STORAGE_KEY, sessionsData.sessions[0].sessionId);
                    setStatus('running');
                } else {
                    setStatus('closed');
                }
            }
        } catch (err) {
            console.error('Failed to check browser status:', err);
            // Keep current status on error
        }
    }, []);

    // Launch bypass browser
    const launchBypassBrowser = useCallback(async () => {
        setStatus('launching');
        setError('');

        try {
            const currentUrl = window.location.href;

            const res = await fetch(`${API_URL}/api/launch-bypass`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetUrl: currentUrl,
                    browser: 'edge'
                })
            });

            const data = await res.json();

            if (data.success && data.sessionId) {
                // Save sessionId untuk tracking
                setSessionId(data.sessionId);
                localStorage.setItem(STORAGE_KEY, data.sessionId);
                setStatus('running');
            } else {
                setError(data.error || 'Unknown error');
                setStatus('error');
            }
        } catch (err) {
            setError(String(err));
            setStatus('error');
        }
    }, []);

    // Initial check - look for existing session
    useEffect(() => {
        // Jika sudah di bypass browser (URL contains bypass=true), jangan launch lagi
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('bypass') === 'true') {
            // Sudah di bypass browser, tidak perlu launch
            setStatus('running');
            return;
        }

        // Prevent double launch dari React StrictMode
        if (launchAttempted.current) {
            console.log('[LauncherPage] Launch already attempted, skipping');
            return;
        }

        // Check sessionStorage lock (berlaku cross-tab dalam session yang sama)
        const launchLock = sessionStorage.getItem(LAUNCH_LOCK_KEY);
        if (launchLock) {
            const lockTime = parseInt(launchLock, 10);
            const now = Date.now();
            // Lock valid selama 10 detik
            if (now - lockTime < 10000) {
                console.log('[LauncherPage] Launch locked by another tab/render');
                setStatus('launching'); // Optimistic status
                return;
            }
        }

        // Set lock immediately to prevent double execution (React StrictMode / Race Condition)
        sessionStorage.setItem(LAUNCH_LOCK_KEY, Date.now().toString());
        launchAttempted.current = true;

        // Check apakah ada active session di server
        const checkAndLaunch = async () => {
            try {
                // Cek session yang tersimpan di localStorage
                const savedSessionId = localStorage.getItem(STORAGE_KEY);

                if (savedSessionId) {
                    // Cek apakah session masih running
                    const res = await fetch(`${API_URL}/api/browser-status/${savedSessionId}`);
                    const data = await res.json();

                    if (data.found && data.running) {
                        // Session masih aktif, tidak perlu launch baru
                        setSessionId(savedSessionId);
                        setStatus('running');
                        return;
                    }
                }

                // Cek apakah ada session aktif lainnya di server
                const sessionsRes = await fetch(`${API_URL}/api/browser-sessions`);
                const sessionsData = await sessionsRes.json();

                // Double check lock requirement? No, we already hold the lock.

                if (sessionsData.count > 0) {
                    // Ada session aktif, gunakan yang pertama
                    const activeSession = sessionsData.sessions[0];
                    setSessionId(activeSession.sessionId);
                    localStorage.setItem(STORAGE_KEY, activeSession.sessionId);
                    setStatus('running');
                    return;
                }

                // Tidak ada session aktif, launch browser baru
                launchBypassBrowser();
            } catch (err) {
                console.error('Error checking sessions:', err);
                // On error, let the lock expire or proceed to launch if critical?
                // For safety, try to launch if we really can't connect to check
                launchBypassBrowser();
            }
        };

        checkAndLaunch();
    }, [launchBypassBrowser]);

    // Polling effect - check status every 2 seconds
    useEffect(() => {
        if (!sessionId) return;

        const interval = setInterval(() => {
            checkBrowserStatus(sessionId);
        }, POLL_INTERVAL);

        return () => clearInterval(interval);
    }, [sessionId, checkBrowserStatus]);

    const retryLaunch = () => {
        localStorage.removeItem(STORAGE_KEY);
        setSessionId(null);
        launchBypassBrowser();
    };

    const resetAndClose = () => {
        localStorage.removeItem(STORAGE_KEY);
        window.close();
    };

    return (
        <div className="min-h-screen bg-[#0f1014] text-white flex items-center justify-center">
            <div className="text-center max-w-md p-8">
                <div className="bg-indigo-600 p-4 rounded-2xl inline-block mb-6">
                    <Video size={48} className="text-white" />
                </div>

                <h1 className="text-3xl font-bold mb-4">MeetClone</h1>

                {/* Checking/Launching State */}
                {(status === 'checking' || status === 'launching') && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-center gap-3 text-indigo-400">
                            <Loader2 className="animate-spin" size={20} />
                            <span>
                                {status === 'checking'
                                    ? 'Mengecek status browser...'
                                    : 'Membuka browser dengan bypass mode...'}
                            </span>
                        </div>
                        <p className="text-sm text-slate-500">
                            Browser baru akan terbuka dengan fitur screen recording tanpa dialog
                        </p>
                    </div>
                )}

                {/* Running State */}
                {status === 'running' && (
                    <div className="space-y-4">
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-6 py-4 rounded-2xl">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <CheckCircle2 size={24} />
                                <p className="font-semibold">Browser bypass sedang berjalan!</p>
                            </div>
                            <p className="text-sm text-green-300/70">
                                Silakan lanjutkan di browser baru tersebut.
                            </p>
                            {sessionId && (
                                <p className="text-xs text-green-300/50 mt-2 font-mono">
                                    Session: {sessionId.slice(0, 8)}...
                                </p>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 mb-4">
                            Tab ini bisa ditutup.
                        </p>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={retryLaunch}
                                className="text-sm text-indigo-400 hover:text-indigo-300 underline flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={14} />
                                Launch browser baru
                            </button>
                            <button
                                onClick={resetAndClose}
                                className="text-xs text-slate-500 hover:text-slate-400"
                            >
                                Reset & tutup tab ini
                            </button>
                        </div>
                    </div>
                )}

                {/* Closed State */}
                {status === 'closed' && (
                    <div className="space-y-4">
                        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-6 py-4 rounded-2xl">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <XCircle size={24} />
                                <p className="font-semibold">Browser bypass sudah ditutup</p>
                            </div>
                            <p className="text-sm text-yellow-300/70">
                                Klik tombol di bawah untuk membuka browser baru.
                            </p>
                        </div>
                        <button
                            onClick={retryLaunch}
                            className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 mx-auto"
                        >
                            <RefreshCw size={18} />
                            Launch Browser Bypass
                        </button>
                    </div>
                )}

                {/* Error State */}
                {status === 'error' && (
                    <div className="space-y-4">
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl">
                            <p className="font-semibold">❌ Gagal membuka browser bypass</p>
                            <p className="text-sm mt-2">{error}</p>
                        </div>
                        <button
                            onClick={retryLaunch}
                            className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-semibold"
                        >
                            Coba Lagi
                        </button>
                    </div>
                )}

                {/* Real-time indicator */}
                {status === 'running' && (
                    <div className="mt-6 text-xs text-slate-600 flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Real-time monitoring aktif
                    </div>
                )}
            </div>
        </div>
    );
}
