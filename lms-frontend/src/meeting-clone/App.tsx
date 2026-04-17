import { useState, useEffect, useRef, useCallback } from 'react';
import "@liveblocks/react-ui/styles.css";
import MeetingRoom from './components/MeetingRoom';
import { LoginPage } from './components/auth/LoginPage';
import { LauncherPage } from './components/LauncherPage';
import { BrowserToolbar, BrowserToolbarStyles } from './components/ui/BrowserToolbar';
import { LogOut, Video, Plus, Clock, Users, ArrowRight, Copy, CheckCheck } from 'lucide-react';
import type { User, Room, RoomStatusResponse } from './types';
import './App.css';
import { io, Socket } from "socket.io-client";

// URL Dinamis
const SOCKET_URL = "/";

const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

// === BYPASS CHECK ===
const urlParams = new URLSearchParams(window.location.search);
const IS_BYPASS_BROWSER = urlParams.get('bypass') === 'true';

// === KOMPONEN WRAPPER (FIX ZOOM CUT-OFF) ===
const ToolbarWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0f1014]">
        <style>{BrowserToolbarStyles}</style>

        {/* 1. Toolbar (Fixed, Tidak Ikut Zoom) */}
        <div className="flex-none z-50">
            <BrowserToolbar />
        </div>

        {/* 2. Scroll Container (Fixed Size, Handles Overflow) & Zoom Target */}
        {/* Div ini memastikan scrollbar muncul jika konten di dalamnya membesar */}
        <div
            id="browser-content-area"
            className="flex-1 relative overflow-auto w-full bg-[#0f1014] origin-top-left"
        >
            {children}
        </div>
    </div>
);

function App() {
    // --- HOOKS ---

    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('meet_user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [joined, setJoined] = useState(false);
    const [activeRoomId, setActiveRoomId] = useState('');
    const [rooms, setRooms] = useState<Room[]>([]);
    const [newRoomName, setNewRoomName] = useState('');

    const [joinCode, setJoinCode] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('room') || '';
    });

    const [isSessionActiveElsewhere, setIsSessionActiveElsewhere] = useState(false);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [pendingJoinRoomId, setPendingJoinRoomId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const isTransitioning = useRef(false);
    const hasInitializedBot = useRef(false);
    const [socketInstance, setSocketInstance] = useState<Socket | null>(null);

    // --- DEFINISI FUNCTION (useCallback) ---

    const enterRoom = useCallback((roomId: string, roleOverride?: 'host' | 'participant') => {
        if (!roomId) return;

        console.log("🚪 Entering room...", roomId);
        isTransitioning.current = true;

        if (roleOverride) {
            setUser(prev => {
                if (!prev) return null;
                const updatedUser = { ...prev, role: roleOverride };
                localStorage.setItem('meet_user_role_override', roleOverride);
                return updatedUser;
            });
        } else {
            localStorage.setItem('meet_user_role_override', 'participant');
        }

        setActiveRoomId(roomId);
        localStorage.setItem('meet_force_join', 'true');
        setJoined(true);
    }, []);

    // --- EFFECTS ---

    // 1. Initial URL Params Check (Termasuk Bot Login)
    useEffect(() => {
        if (hasInitializedBot.current) return;

        const params = new URLSearchParams(window.location.search);
        const roomParam = params.get('room');
        const roleParam = params.get('role');
        const nameParam = params.get('name');

        if (roomParam && roleParam === 'recorder' && nameParam) {
            console.log("🤖 Recorder Bot detected. Auto-joining...");
            hasInitializedBot.current = true;

            const botUser: User = {
                id: `recorder-${Date.now()}`,
                name: nameParam,
                role: 'recorder',
                email: 'recorder@bot.com',
                avatar: `https://ui-avatars.com/api/?name=${nameParam}&background=000&color=fff`
            };

            setTimeout(() => {
                setUser(botUser);
                setJoinCode(roomParam);
                console.log("🤖 Triggering enterRoom for bot...");
                enterRoom(roomParam, 'participant');
            }, 0);

            return;
        }

        if (roomParam) {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [enterRoom]);

    // 2. SOCKET LIFECYCLE
    useEffect(() => {
        if (joined || isTransitioning.current) return;

        console.log("🔌 Initializing Lobby Socket...");
        const newSocket = io(SOCKET_URL, {
            path: "/socket.io",
            transports: ['websocket', 'polling']
        });

        const t = setTimeout(() => {
            setSocketInstance(newSocket);
        }, 0);

        return () => {
            clearTimeout(t);
            console.log("🛑 Lobby Socket Disconnecting...");
            newSocket.disconnect();
            setSocketInstance(null);
        };
    }, [joined]);

    // 3. SOCKET LISTENERS
    useEffect(() => {
        if (!socketInstance) return;

        const onConnect = () => {
            console.log("✅ Lobby Connected ID:", socketInstance.id);
            if (user) socketInstance.emit("check-session", user.id);
        };

        const onRoomsUpdate = (updatedRooms: Room[]) => setRooms(updatedRooms);
        const onSessionCheckResult = (isActive: boolean) => setIsSessionActiveElsewhere(isActive);

        const onForceLogout = () => {
            if (isTransitioning.current || joined) return;
            console.warn("⚠️ Force logout received.");
            alert("Sesi Anda telah dipindahkan ke perangkat lain.");
            localStorage.removeItem('meet_user');
            window.location.reload();
        };

        const onRoomStatusResult = (result: RoomStatusResponse) => {
            if (result.status === 'ok') {
                if (pendingJoinRoomId) {
                    enterRoom(pendingJoinRoomId, 'participant');
                }
            } else if (result.status === 'conflict') {
                console.log("⚠️ Session Conflict Detected in Lobby");
                setShowSessionModal(true);
            }
        };

        socketInstance.on("connect", onConnect);
        socketInstance.on("rooms-update", onRoomsUpdate);
        socketInstance.on("session-check-result", onSessionCheckResult);
        socketInstance.on("force-logout", onForceLogout);
        socketInstance.on("room-status-result", onRoomStatusResult);

        if (socketInstance.connected && user) {
            socketInstance.emit("check-session", user.id);
        }

        return () => {
            socketInstance.off("connect", onConnect);
            socketInstance.off("rooms-update", onRoomsUpdate);
            socketInstance.off("session-check-result", onSessionCheckResult);
            socketInstance.off("force-logout", onForceLogout);
            socketInstance.off("room-status-result", onRoomStatusResult);
        };
    }, [socketInstance, user, joined, pendingJoinRoomId, enterRoom]);

    // --- ACTION HANDLERS ---

    const handleLoginSuccess = (userData: User) => setUser(userData);

    const handleLogout = () => {
        localStorage.removeItem('meet_user');
        setUser(null);
        setJoined(false);
    };

    const handleCopyLink = (id: string) => {
        const url = `${window.location.origin}?room=${id}`;
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleCreateRoom = () => {
        if (!newRoomName.trim() || !socketInstance || !user) return;
        isTransitioning.current = true;
        socketInstance.emit("create-room", newRoomName, user.id, (roomId: string) => {
            setNewRoomName('');
            setTimeout(() => {
                enterRoom(roomId, 'host');
            }, 50);
        });
    };

    const handleRequestJoin = (roomId: string) => {
        setPendingJoinRoomId(roomId);
        if (socketInstance && user) {
            socketInstance.emit("check-room-status", roomId, user.id);
        }
    };

    const confirmSwitchSession = () => {
        if (pendingJoinRoomId) {
            localStorage.setItem('meet_force_join', 'true');
            enterRoom(pendingJoinRoomId, 'participant');
            setShowSessionModal(false);
        }
    };

    // === CONDITIONAL RENDERING ===

    if (!IS_BYPASS_BROWSER) {
        return <LauncherPage />;
    }

    if (!user) return (
        <ToolbarWrapper>
            <LoginPage onLogin={handleLoginSuccess} socket={socketInstance} />
        </ToolbarWrapper>
    );

    if (joined) {
        return (
            <ToolbarWrapper>
                <MeetingRoom
                    roomId={activeRoomId}
                    userId={user.id}
                    userRole={user.role}
                    userName={user.name}
                    setJoined={(state) => {
                        setJoined(state);
                        if (!state) {
                            isTransitioning.current = false;
                            setIsSessionActiveElsewhere(false);
                            localStorage.removeItem('meet_user_role_override');
                            window.location.reload();
                        }
                    }}
                />
            </ToolbarWrapper>
        );
    }

    const myRooms = rooms.filter(r => r.ownerId === user.id);

    return (
        <ToolbarWrapper>
            <div className="min-h-full bg-[#0f1014] text-white p-8 font-sans">
                <div className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
                            <Video size={24} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold bg-linear-to-r from-indigo-400 to-cyan-400 text-transparent bg-clip-text">
                            MeetClone Lobby
                        </h1>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-900/50 px-5 py-2.5 rounded-full border border-white/10 backdrop-blur-md">
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-bold">{user.name}</span>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">{user.role}</span>
                        </div>
                        <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold border border-white/10">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="w-px h-6 bg-white/10 mx-1"></div>
                        <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    <div className="lg:col-span-1 space-y-6">
                        {/* Create Room */}
                        <div className="bg-slate-900/50 border border-white/10 p-6 rounded-3xl backdrop-blur-sm">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Plus size={20} className="text-indigo-400" />
                                Buat Rapat Baru
                            </h2>
                            <div className="space-y-4">
                                <input
                                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/10 focus:border-indigo-500 focus:outline-none transition-all text-white placeholder:text-slate-600"
                                    placeholder="Nama Rapat"
                                    value={newRoomName}
                                    onChange={(e) => setNewRoomName(e.target.value)}
                                />
                                <button
                                    onClick={handleCreateRoom}
                                    disabled={!newRoomName}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    Buat Sekarang <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Join Code */}
                        <div className="bg-slate-900/50 border border-white/10 p-6 rounded-3xl backdrop-blur-sm">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <ArrowRight size={20} className="text-green-400" />
                                Gabung via Kode
                            </h2>
                            <p className="text-slate-400 text-sm mb-4">Masukkan Kode ID rapat untuk bergabung.</p>
                            <div className="space-y-4">
                                <input
                                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/10 focus:border-green-500 focus:outline-none transition-all text-white placeholder:text-slate-600 font-mono"
                                    placeholder="Contoh: abc_123_xyz"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value)}
                                />
                                <button
                                    onClick={() => handleRequestJoin(joinCode)}
                                    disabled={!joinCode}
                                    className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold border border-white/10 transition-all active:scale-95"
                                >
                                    Gabung Rapat
                                </button>
                            </div>
                        </div>

                        {isSessionActiveElsewhere && (
                            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-amber-200 text-sm flex items-start gap-3">
                                <div className="p-1 bg-amber-500/20 rounded-full mt-0.5 font-bold text-xs">!</div>
                                <p>Akun Anda aktif di perangkat lain. Bergabung rapat akan memindahkan sesi.</p>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-2">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Video size={20} className="text-indigo-400" />
                            Rapat Saya ({myRooms.length})
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {myRooms.length === 0 ? (
                                <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/30 rounded-3xl border border-white/5 border-dashed">
                                    <p>Anda belum membuat rapat aktif.</p>
                                </div>
                            ) : (
                                myRooms.map(room => (
                                    <div key={room.id} className="bg-slate-900 border border-white/10 p-5 rounded-2xl hover:border-indigo-500/50 transition-all group relative">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="max-w-[70%]">
                                                <h3 className="font-bold text-lg text-white group-hover:text-indigo-300 transition-colors truncate">{room.name}</h3>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="bg-slate-800 px-2 py-1 rounded text-slate-300 font-mono text-xs border border-white/5 truncate">{room.id}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); handleCopyLink(room.id); }} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors" title="Salin Link Rapat">{copiedId === room.id ? <CheckCheck size={14} className="text-green-400" /> : <Copy size={14} />}</button>
                                                </div>
                                            </div>
                                            <div className="bg-green-500/10 text-green-400 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Live</div>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-slate-400 mb-6">
                                            <div className="flex items-center gap-1.5"><Clock size={14} /><span>{room.startTime ? formatTime(room.startTime) : 'Baru saja'}</span></div>
                                            <div className="flex items-center gap-1.5"><Users size={14} /><span>{room.participants.length} Peserta</span></div>
                                        </div>
                                        <button onClick={() => handleRequestJoin(room.id)} className="w-full py-2.5 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 text-sm font-semibold transition-all flex items-center justify-center gap-2">Masuk Kembali</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {showSessionModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-white/10 w-full max-w-md p-6 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
                            <h3 className="text-xl font-bold mb-2 text-amber-400">Konflik Sesi</h3>
                            <p className="text-slate-300 mb-6">
                                Akun <b>{user.name}</b> sedang berada dalam rapat di perangkat lain. <br />
                                Apakah Anda ingin memindahkan sesi rapat ke perangkat ini?
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowSessionModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 font-semibold text-slate-300">Batal</button>
                                <button onClick={confirmSwitchSession} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white shadow-lg">Ya, Pindahkan</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ToolbarWrapper>
    );
}

export default App;