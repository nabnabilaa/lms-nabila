import { useState, useEffect, useRef, useCallback } from 'react';
import "@liveblocks/react-ui/styles.css";
import MeetingRoom from '../meeting-clone/components/MeetingRoom';
// import { LoginPage } from './components/auth/LoginPage'; // Skipped, using LMS Auth
// import { LauncherPage } from './components/LauncherPage'; // Skipped, assuming accessed via LMS
import { BrowserToolbar, BrowserToolbarStyles } from '../meeting-clone/components/ui/BrowserToolbar';
import { LogOut, Video, Plus, Clock, Users, ArrowRight, Copy, CheckCheck, Mic, Monitor, Settings, Loader2, Calendar, BookOpen, Star, Filter, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
// import type { User, Room, RoomStatusResponse } from './types'; // Javascript conversion needed or import types if JSDoc
import '../meeting-clone/App.css'; // Ensure CSS is available
import { io } from "socket.io-client";
import { useUser } from '../contexts/UserContext';
import { useParams, useNavigate } from 'react-router-dom';
import { useCoursesQuery } from '../hooks/queries/useCourses';
import { useCurrentUserQuery } from '../hooks/queries/useUser';
import { Card, Badge } from '../components/ui';
import { getTrans } from '../lib/transHelper';
import { useTranslation } from 'react-i18next';

// URL Dinamis from ENV
const SOCKET_URL = import.meta.env.VITE_MEETING_SERVER_URL || "http://localhost:3002";

const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

// === BYPASS CHECK ===
const urlParams = new URLSearchParams(window.location.search);
const IS_BYPASS_BROWSER = urlParams.get('bypass') === 'true';

// === KOMPONEN WRAPPER (FIX ZOOM CUT-OFF) ===
const ToolbarWrapper = ({ children }) => (
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

function MeetingRoomPage() {
    // --- LMS AUTH INTEGRATION ---
    const { user: lmsUser, logout } = useUser();
    const navigate = useNavigate();
    const { roomId } = useParams(); // Get from URL
    const { t } = useTranslation();

    // Map LMS User to Meet User
    const [user, setUser] = useState(null);

    useEffect(() => {
        if (lmsUser) {
            setUser({
                id: String(lmsUser.id),
                name: lmsUser.name,
                role: lmsUser.role, // Keep original role (admin, instructor, student)
                email: lmsUser.email,
                avatar: `https://ui-avatars.com/api/?name=${lmsUser.name}&background=random`
            });
        }
    }, [lmsUser]);

    // --- HOOKS ---

    // Removed localStorage user initialization because we use LMS user

    const [joined, setJoined] = useState(false);
    const [activeRoomId, setActiveRoomId] = useState('');
    const [meetingRole, setMeetingRole] = useState('participant'); // Role used inside the meeting
    const [rooms, setRooms] = useState([]);
    const [newRoomName, setNewRoomName] = useState('');
    const [activeRoomPage, setActiveRoomPage] = useState(1);
    const ACTIVE_ROOMS_PER_PAGE = 6;

    const { data: courses = [], isLoading: isLoadingCourses } = useCoursesQuery();

    const [joinCode, setJoinCode] = useState(roomId || ''); // Initial code from URL param

    // Reset joinCode when navigating back to lobby (roomId becomes undefined)
    useEffect(() => {
        setJoinCode(roomId || '');
    }, [roomId]);

    const [isSessionActiveElsewhere, setIsSessionActiveElsewhere] = useState(false);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [pendingJoinRoomId, setPendingJoinRoomId] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [hostOnline, setHostOnline] = useState(false); // New state for waiting room

    const isTransitioning = useRef(false);
    const hasInitializedBot = useRef(false);
    const [socketInstance, setSocketInstance] = useState(null);

    // --- DEFINISI FUNCTION (useCallback) ---

    const enterRoom = useCallback((roomIdToJoin, roleOverride) => {
        if (!roomIdToJoin) return;

        console.log("🚪 Entering room...", roomIdToJoin);
        isTransitioning.current = true;

        // Determine role for meeting
        let role = roleOverride || user?.role || 'participant';

        // Auto-promote Instructor to Host, Admin stays as admin
        if (role === 'instructor') {
            role = 'host';
        }

        setMeetingRole(role);
        setActiveRoomId(roomIdToJoin);
        setJoined(true);
    }, [user]);

    // --- EFFECTS ---

    // 1. Initial Auto-Join Check
    // 1. Initial Check / Waiting Room Logic
    useEffect(() => {
        if (roomId && user && !joined && socketInstance?.connected) {
            // Instead of auto-joining, we check host status
            socketInstance.emit("check-host-status", roomId);

            // Set up polling for host status every 5 seconds if student
            const interval = setInterval(() => {
                if (!joined) socketInstance.emit("check-host-status", roomId);
            }, 5000);

            return () => clearInterval(interval);
        }
    }, [roomId, user, socketInstance, joined]);


    // 2. SOCKET LIFECYCLE
    useEffect(() => {
        // if (joined || isTransitioning.current) return; // Keep socket alive even if joined? Original code disconnects lobby socket on join/transition?
        // Original code: connects lobby socket only when !joined.
        // But MeetingRoom component creates its OWN socket or uses the same?
        // Ah, MeetingRoom component (from MeetClone) likely handles its own connection or passed socket?
        // Checking MeetingRoom.tsx would confirm. Usually it's better to have one socket, but let's follow MeetClone pattern.

        if (joined || isTransitioning.current) return;

        console.log("🔌 Initializing Lobby Socket...", SOCKET_URL);
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
    }, [joined]); // Re-connect when leaving meeting

    // 3. SOCKET LISTENERS
    useEffect(() => {
        if (!socketInstance) return;

        const onConnect = () => {
            console.log("✅ Lobby Connected ID:", socketInstance.id);
            if (user) socketInstance.emit("check-session", user.id);
        };

        const onRoomsUpdate = (updatedRooms) => setRooms(updatedRooms);
        const onSessionCheckResult = (isActive) => setIsSessionActiveElsewhere(isActive);

        const onForceLogout = () => {
            if (isTransitioning.current || joined) return;
            console.warn("⚠️ Force logout received.");
            alert("Sesi Anda telah dipindahkan ke perangkat lain.");
            // localStorage.removeItem('meet_user'); // Don't clear LMS auth
            // window.location.reload();
            navigate('/');
        };

        const onRoomStatusResult = (result) => {
            // Updated to handle result object
            // result: { status: 'ok' | 'conflict' | 'not_found', ... }
            if (result.status === 'ok' || result.exists) { // Adapt based on actual response
                if (pendingJoinRoomId) {
                    enterRoom(pendingJoinRoomId, user?.role || 'participant');
                }
            } else if (result.status === 'conflict') {
                console.log("⚠️ Session Conflict Detected in Lobby");
                setShowSessionModal(true);
            } else {
                // handle not found?
                if (pendingJoinRoomId) {
                    // Try to join anyway? Or show error?
                    // For now, assume we can join/create if not exists (backend determines)
                    enterRoom(pendingJoinRoomId, user?.role || 'participant');
                }
            }
        };

        const onHostStatusResult = (isOnline) => {
            setHostOnline(isOnline);
        };

        socketInstance.on("connect", onConnect);
        socketInstance.on("rooms-update", onRoomsUpdate);
        socketInstance.on("session-check-result", onSessionCheckResult);
        socketInstance.on("force-logout", onForceLogout);
        socketInstance.on("room-status-result", onRoomStatusResult);
        socketInstance.on("host-status-result", onHostStatusResult);

        if (socketInstance.connected && user) {
            socketInstance.emit("check-session", user.id);
        }

        return () => {
            socketInstance.off("connect", onConnect);
            socketInstance.off("rooms-update", onRoomsUpdate);
            socketInstance.off("session-check-result", onSessionCheckResult);
            socketInstance.off("force-logout", onForceLogout);
            socketInstance.off("room-status-result", onRoomStatusResult);
            socketInstance.off("host-status-result", onHostStatusResult);
        };
    }, [socketInstance, user, joined, pendingJoinRoomId, enterRoom]);

    // --- ACTION HANDLERS ---

    // handleLoginSuccess replaced by LMS auth

    const handleLogout = async () => {
        // localStorage.removeItem('meet_user');
        // setUser(null);
        // setJoined(false);
        await logout();
        navigate('/login');
    };

    const handleCopyLink = (id) => {
        const url = `${window.location.origin}/meeting/${id}`;
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleCreateRoom = () => {
        if (!newRoomName.trim() || !socketInstance || !user) return;
        isTransitioning.current = true;

        // Generate Client-Side ID (Google Style: xxx-xxx-xxx)
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 9; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const generatedId = `${result.slice(0, 3)}-${result.slice(3, 6)}-${result.slice(6, 9)}`;

        socketInstance.emit("create-room", newRoomName, user.id, (createdRoomId) => {
            setNewRoomName('');
            setTimeout(() => {
                navigate(`/meeting/${createdRoomId}`);
                enterRoom(createdRoomId, 'host');
            }, 50);
        }, generatedId); // Pass generatedId as 4th arg
    };

    const handleRequestJoin = (inputCode) => {
        // Smart Join: Extract ID from URL if pasted
        let codeToJoin = inputCode;
        if (inputCode.includes('/meeting/')) {
            const parts = inputCode.split('/meeting/');
            codeToJoin = parts[1]?.split('?')[0] || inputCode; // Handle query params if any
        }

        // Remove whitespace
        codeToJoin = codeToJoin.trim();

        setPendingJoinRoomId(codeToJoin);
        if (socketInstance && user) {
            socketInstance.emit("check-room-status", codeToJoin, user.id);
        }
    };

    const confirmSwitchSession = () => {
        if (pendingJoinRoomId) {
            // localStorage.setItem('meet_force_join', 'true');
            enterRoom(pendingJoinRoomId, 'participant');
            setShowSessionModal(false);
        }
    };

    // === CONDITIONAL RENDERING ===

    // if (!IS_BYPASS_BROWSER) {
    //     return <LauncherPage />;
    // } 
    // We assume LMS is the launcher.

    if (!user) return <div className="flex justify-center items-center h-screen bg-[#0f1014] text-white">Loading User...</div>;

    // === WAITING ROOM UI ===
    if (roomId && !joined) {
        const isInstructor = user.role === 'instructor';
        const isAdmin = user.role === 'admin';
        const canStart = isInstructor || isAdmin;
        const canJoin = canStart || hostOnline;

        return (
            <div className="min-h-screen w-full bg-[#0f1014] flex items-center justify-center p-4 relative overflow-x-hidden">
                {/* Background Blobs */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

                <div className="relative z-10 w-full max-w-5xl bg-slate-900/50 border border-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl text-left">
                    <div className="flex flex-col md:flex-row gap-8 items-stretch">

                        {/* LEFT COLUMN: Session Info */}
                        <div className="flex-1 flex flex-col">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                                    <Video size={32} className="text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white leading-tight">Meeting Ready</h1>
                                    <p className="text-slate-400 text-sm">Siap untuk bergabung?</p>
                                </div>
                            </div>

                            <div className="bg-slate-950/50 p-6 rounded-2xl border border-white/5 flex-1 flex flex-col justify-center">
                                {(() => {
                                    // Find session details
                                    const currentSession = (courses || []).flatMap(c =>
                                        (c.sessions || []).map(s => ({ ...s, courseName: c.title, instructorName: c.instructor?.name }))
                                    ).find(s => s.meeting_code === roomId || s.room_id === roomId || s.meeting_url?.includes(roomId));

                                    // CANONICAL ID: Use meeting_code if available (preferred), else room_id, else URL param
                                    const displayId = currentSession?.meeting_code || currentSession?.room_id || roomId;

                                    return (
                                        <>
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <Badge variant="blue" className="text-[10px] uppercase shadow-lg shadow-blue-500/20">
                                                            {currentSession ? currentSession.type : 'Instant Meeting'}
                                                        </Badge>
                                                        {currentSession && (
                                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                                <Clock size={12} className="text-indigo-400" />
                                                                <span>
                                                                    {new Date(currentSession.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} -
                                                                    {new Date(currentSession.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <h2 className="text-3xl font-bold text-white leading-tight mb-2">
                                                        {currentSession ? getTrans(currentSession.title, t('language_code') || 'id') : "Tidak Ada Judul"}
                                                    </h2>
                                                    {currentSession && (
                                                        <p className="text-indigo-400 font-medium text-lg">{getTrans(currentSession.courseName, t('language_code') || 'id')}</p>
                                                    )}
                                                </div>

                                                <div className="h-px bg-white/10 my-4"></div>

                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 text-slate-400">
                                                            <Users size={18} />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">Host</div>
                                                            <div className="font-semibold text-slate-200 text-sm">{currentSession ? (currentSession.instructorName || "Instructor") : "Room Host"}</div>
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Meeting Code</div>
                                                        <div className="flex items-center gap-2 font-mono bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg text-sm text-indigo-300 w-fit ml-auto">
                                                            <span className="select-all font-bold tracking-widest">{displayId}</span>
                                                            <button onClick={() => { navigator.clipboard.writeText(displayId); }} className="hover:text-white transition-colors">
                                                                <Copy size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Actions & User */}
                        <div className="flex-1 md:max-w-sm flex flex-col justify-center space-y-6">

                            {/* User Profile Card */}
                            <div className="bg-slate-950/50 p-5 rounded-2xl border border-white/5 flex items-center gap-4">
                                <div className="h-14 w-14 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden shrink-0">
                                    <img src={`https://ui-avatars.com/api/?name=${user.name}&background=random`} alt={user.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="overflow-hidden">
                                    <div className="text-xs text-slate-400 mb-0.5">Bergabung sebagai</div>
                                    <div className="font-bold text-white text-lg truncate">{user.name}</div>
                                    <div className="text-xs text-indigo-400 uppercase font-bold tracking-wider">{user.role}</div>
                                </div>
                            </div>

                            {/* Status Messages */}
                            <div className="space-y-4">
                                {!canStart && !hostOnline && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-start gap-4">
                                        <Loader2 className="animate-spin text-yellow-500 shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <div className="font-bold text-yellow-500 text-sm">Menunggu Host</div>
                                            <div className="text-xs text-yellow-500/80 mt-1">Rapat belum dimulai. Harap tunggu sebentar sampai Host masuk ke dalam ruangan.</div>
                                        </div>
                                    </div>
                                )}

                                {hostOnline && !canStart && (
                                    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-start gap-4">
                                        <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse mt-1.5 shrink-0"></div>
                                        <div>
                                            <div className="font-bold text-green-500 text-sm">Host Online</div>
                                            <div className="text-xs text-green-500/80 mt-1">Rapat sudah dimulai. Anda dapat bergabung sekarang.</div>
                                        </div>
                                    </div>
                                )}

                                {isInstructor && (
                                    <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl flex items-start gap-4">
                                        <Star className="text-indigo-400 shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <div className="font-bold text-indigo-400 text-sm">Anda adalah Host</div>
                                            <div className="text-xs text-indigo-400/80 mt-1">Sebagai Host, Anda memiliki kontrol penuh untuk memulai rapat ini kapan saja.</div>
                                        </div>
                                    </div>
                                )}

                                {isAdmin && (
                                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-4">
                                        <Shield className="text-red-400 shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <div className="font-bold text-red-400 text-sm">Anda adalah Admin</div>
                                            <div className="text-xs text-red-400/80 mt-1">Sebagai Admin, Anda dapat memantau dan bergabung ke rapat mana pun.</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Buttons */}
                            <div className="space-y-3 pt-2">
                                <button
                                    onClick={() => enterRoom(roomId, isInstructor ? 'host' : isAdmin ? 'admin' : 'participant')}
                                    disabled={!canJoin}
                                    className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all flex items-center justify-center gap-2 text-lg transform hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    {canStart ? 'Mulai Rapat' : 'Gabung Sekarang'} <ArrowRight size={20} />
                                </button>

                                <button
                                    onClick={() => navigate('/meeting')}
                                    className="w-full py-3 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white font-semibold transition-colors text-sm"
                                >
                                    Kembali ke Lobby
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (joined) {
        return (
            <ToolbarWrapper>
                <MeetingRoom
                    roomId={activeRoomId}
                    userId={user.id}
                    userRole={meetingRole}
                    userName={user.name}
                    setJoined={(state) => {
                        setJoined(state);
                        if (!state) {
                            isTransitioning.current = false;
                            setIsSessionActiveElsewhere(false);
                            // localStorage.removeItem('meet_user_role_override');
                            // window.location.reload();
                            navigate('/meeting'); // Go back to lobby
                        }
                    }}
                />
            </ToolbarWrapper>
        );
    }

    // Filter rooms:
    // 1. Role Check (Admin sees all, others see own)
    // 2. Participant Check (Only show rooms with > 0 participants, hiding empty/inactive ones)
    // EXCEPTION: Always show "Main Hall" even if empty
    const myRooms = (user.role === 'admin' ? rooms : rooms.filter(r => r.ownerId === user.id))
        .filter(r => (r.participants && r.participants.length > 0) || r.name === 'Main Hall');

    return (
        <ToolbarWrapper>
            <div className="min-h-full bg-[#0f1014] text-white p-4 md:p-8 font-sans">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 md:mb-12">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
                            <Video size={24} className="text-white" />
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold bg-linear-to-r from-indigo-400 to-cyan-400 text-transparent bg-clip-text">
                            Virtual Intern Lobby
                        </h1>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-900/50 px-5 py-2.5 rounded-full border border-white/10 backdrop-blur-md self-end md:self-auto">
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-bold">{user.name}</span>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">{user.role}</span>
                        </div>
                        <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold border border-white/10">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8 max-w-7xl mx-auto">
                    {/* LEFT COLUMN: Create & Join & Active Rooms */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Status Card */}
                        <div className="bg-slate-900/50 border border-white/10 p-4 rounded-3xl backdrop-blur-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-lg font-bold border border-white/5">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-bold text-white">{user.name}</div>
                                    <Badge variant={user.role === 'admin' ? 'red' : user.role === 'instructor' ? 'blue' : 'green'} className="text-[10px] py-0 px-2">
                                        {user.role}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Create Room (Only for Staff) */}
                        {(user.role === 'admin' || user.role === 'instructor') && (
                            <div className="bg-slate-900/50 border border-white/10 p-5 rounded-3xl backdrop-blur-sm">
                                <h2 className="font-bold mb-3 flex items-center gap-2 text-sm text-slate-300">
                                    <Plus size={16} className="text-indigo-400" /> INSTANT MEETING
                                </h2>
                                <div className="space-y-3">
                                    <input
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 focus:border-indigo-500 focus:outline-none text-white placeholder:text-slate-600 text-sm"
                                        placeholder="Nama Rapat..."
                                        value={newRoomName}
                                        onChange={(e) => setNewRoomName(e.target.value)}
                                    />
                                    <button
                                        onClick={handleCreateRoom}
                                        disabled={!newRoomName}
                                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        Buat <ArrowRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Join Code */}
                        <div className="bg-slate-900/50 border border-white/10 p-5 rounded-3xl backdrop-blur-sm">
                            <h2 className="font-bold mb-3 flex items-center gap-2 text-sm text-slate-300">
                                <ArrowRight size={16} className="text-green-400" /> JOIN via CODE
                            </h2>
                            <div className="space-y-3">
                                <input
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 focus:border-green-500 focus:outline-none text-white placeholder:text-slate-600 font-mono text-sm"
                                    placeholder="Enter Code or Paste Link..."
                                    value={joinCode}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        // Auto-extract if URL pasted
                                        if (val.includes('/meeting/')) {
                                            const parts = val.split('/meeting/');
                                            const code = parts[1]?.split('?')[0];
                                            if (code) setJoinCode(code);
                                        } else {
                                            setJoinCode(val);
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => handleRequestJoin(joinCode)}
                                    disabled={!joinCode}
                                    className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-bold border border-white/10 transition-all"
                                    title="Gabung"
                                >
                                    Gabung
                                </button>
                            </div>
                        </div>

                        {/* Active Rooms (Socket) */}

                    </div>

                    {/* RIGHT COLUMN: ACTIVE ROOMS & SCHEDULE */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* Active Rooms (Socket) */}
                        {myRooms.length > 0 && (
                            <div className="bg-slate-900/50 border border-white/10 p-6 rounded-3xl backdrop-blur-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                                <h2 className="font-bold mb-4 flex items-center gap-2 text-lg text-white">
                                    <Video size={20} className="text-red-400" /> Active Rooms
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {myRooms
                                        .filter(room => {
                                            // LOGIC: Hide breakout rooms for non-admins
                                            // User requested: "khusus admin aja yg bisa mencek semua room"
                                            const isBreakout = !!room.parentRoomId;
                                            if (isBreakout && user.role !== 'admin') {
                                                return false;
                                            }
                                            return true;
                                        })
                                        .map(room => {
                                            const isBreakout = !!room.parentRoomId;
                                            return (
                                                <div key={room.id} className={`p-4 rounded-2xl border transition-all group ${isBreakout ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-slate-950 border-white/10 hover:border-indigo-500/50'}`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs border ${isBreakout ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-indigo-900/30 text-indigo-400 border-indigo-500/20'}`}>
                                                                {isBreakout ? <LayoutGrid size={14} /> : room.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-white text-sm truncate max-w-[120px]" title={room.name}>{room.name}</div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                                                        Live
                                                                    </div>
                                                                    {isBreakout && (
                                                                        <span className="text-[9px] uppercase font-bold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                                                                            Breakout
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => handleCopyLink(room.id)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors" title="Copy ID">
                                                            {copiedId === room.id ? <CheckCheck size={14} className="text-green-500" /> : <Copy size={14} />}
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center gap-3 text-xs text-slate-400 mb-4 bg-black/20 p-2 rounded-lg">
                                                        <span className="flex items-center gap-1"><Users size={12} /> {room.participants.length} Participants</span>
                                                        <span className="w-px h-3 bg-white/10"></span>
                                                        <span className="font-mono text-[10px] opacity-70">{room.id.substring(0, 8)}...</span>
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            // Resolving Session Code for Re-Join
                                                            const session = (courses || []).flatMap(c => c.sessions || []).find(s => s.room_id === room.id);
                                                            const targetId = session?.meeting_code || room.id;

                                                            console.log("🔗 Re-Joining:", { roomId: room.id, targetId });
                                                            navigate(`/meeting/${targetId}`);
                                                            // enterRoom(room.id, 'host'); // Let the pending check handle this after navigation
                                                        }}
                                                        className={`w-full py-2 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${isBreakout ? 'bg-indigo-700 hover:bg-indigo-600 shadow-indigo-900/40' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20 group-hover:shadow-indigo-500/20'}`}
                                                    >
                                                        {isBreakout ? 'Pantau Room' : 'Re-Join Meeting'} <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Calendar size={20} className="text-indigo-400" />
                                Jadwal Sesi Kelas
                            </h2>
                            <div className="flex gap-2">
                                {/* Filter Controls Could Go Here */}
                            </div>
                        </div>

                        {isLoadingCourses ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="animate-spin text-indigo-500" size={32} />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {(() => {
                                    // 1. Flatten Sessions
                                    const allSessions = (courses || []).flatMap(course =>
                                        (course.sessions || []).map(session => ({
                                            ...session,
                                            courseName: course.title,
                                            courseId: course.id,
                                            courseEnrollments: course.enrollments,
                                            courseInstructorId: course.instructor_id
                                        }))
                                    );

                                    // 2. Filter by Role & Meet Type
                                    const filteredSessions = allSessions.filter(session => {
                                        // Only show sessions with meeting capability
                                        const hasMeet = session.meeting_type === 'internal' || session.meeting_url;
                                        if (!hasMeet) return false;

                                        if (user.role === 'admin') return true;

                                        if (user.role === 'instructor') {
                                            // Show if I am the session instructor OR course instructor
                                            return session.instructor_id === user.id || session.courseInstructorId === user.id;
                                        }

                                        // Student: Show if enrolled
                                        // Check if ANY enrollment in this course belongs to me
                                        const isEnrolled = session.courseEnrollments?.some(e => String(e.user_id) === String(user.id) && e.status === 'active');
                                        return isEnrolled;
                                    });

                                    // 3. Sort by Date (Nearest First)
                                    // 4. Render
                                    if (filteredSessions.length === 0) {
                                        return (
                                            <div className="col-span-full py-12 text-center bg-slate-900/30 rounded-3xl border border-white/5 border-dashed">
                                                <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                                <p className="text-slate-400">Tidak ada jadwal sesi meeting yang tersedia.</p>
                                            </div>
                                        );
                                    }

                                    return filteredSessions.map(session => {
                                        const startTime = new Date(session.start_time);
                                        const isToday = new Date().toDateString() === startTime.toDateString();
                                        const isPast = new Date() > new Date(session.end_time);
                                        const isHappening = new Date() >= startTime && new Date() <= new Date(session.end_time);

                                        // Use internal room_id if available, else session.meeting_url
                                        // For internal, we construct the join link via navigate
                                        const isInternal = session.meeting_type === 'internal';

                                        return (
                                            <div key={session.id} className="group bg-slate-900 border border-white/10 p-5 rounded-2xl hover:border-indigo-500/50 transition-all flex flex-col">
                                                <div className="flex justify-between items-start mb-3">
                                                    <Badge variant={isHappening ? 'green' : isPast ? 'gray' : 'blue'} className="text-[10px] uppercase">
                                                        {isHappening ? 'Live Now' : isPast ? 'Selesai' : 'Upcoming'}
                                                    </Badge>
                                                    <span className="text-[10px] text-slate-500 bg-black/20 px-2 py-1 rounded">
                                                        {session.type || 'Session'}
                                                    </span>
                                                </div>

                                                <h3 className="font-bold text-white mb-1 line-clamp-2 group-hover:text-indigo-400 transition-colors" title={getTrans(session.title, t('language_code') || 'id')}>
                                                    {getTrans(session.title, t('language_code') || 'id')}
                                                </h3>
                                                <p className="text-xs text-slate-400 mb-4 line-clamp-1">{getTrans(session.courseName, t('language_code') || 'id')}</p>

                                                <div className="mt-auto space-y-3">
                                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                                        <Calendar size={14} />
                                                        <span>
                                                            {isToday ? 'Hari Ini' : startTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                            {' • '}
                                                            {startTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>

                                                    {isInternal ? (
                                                        <button
                                                            onClick={() => {
                                                                // ROBUST CHECK: Try all possible variations of the short code
                                                                const targetId = session.meeting_code || session.meetingCode || session.code || session.room_id;

                                                                if (targetId) {
                                                                    console.log("🔗 Joining Internal Session:", {
                                                                        sessionTitle: session.title,
                                                                        targetId,
                                                                        meeting_code: session.meeting_code,
                                                                        room_id: session.room_id
                                                                    });
                                                                    navigate(`/meeting/${targetId}`);
                                                                    // Explicitly trigger join in case effect is slow/flaky
                                                                    handleRequestJoin(targetId);
                                                                } else {
                                                                    alert("Room ID tidak valid (Kosong). Hubungi Admin.");
                                                                }
                                                            }}
                                                            title={`Join: ${session.meeting_code || session.room_id}`}
                                                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <Video size={16} /> Join Class
                                                        </button>
                                                    ) : (
                                                        <a
                                                            href={session.meeting_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="block w-full py-2 text-center bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold transition-all border border-white/10"
                                                        >
                                                            External Link ↗
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        )}
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

export default MeetingRoomPage;
