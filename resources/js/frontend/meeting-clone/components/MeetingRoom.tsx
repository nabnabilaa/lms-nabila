import { useEffect, useRef, useState } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { LayoutSettingsModal } from './LayoutSettingsModal';
import type { LayoutMode } from './LayoutSettingsModal';
import { ActionMenu } from './ActionMenu';
import type { MenuItem } from './ActionMenu';
import {
    Mic, MicOff, Video, VideoOff, PhoneOff,
    LayoutGrid, Monitor, MonitorUp,
    ChevronRight, MoreHorizontal, Shield,
    Layout, Settings, MoreVertical, Maximize,
    XCircle, ArrowRightLeft, Users, Hand, Lock,
    Power, Copy, CheckCheck, Smile, MessageSquare, LogOut, Timer
} from 'lucide-react';
import api from '../../services/api';

import { ControlButton } from './meeting/ControlButton';
import { VideoPlayer } from './meeting/VideoPlayer';
import { DeviceSettingsModal } from './meeting/DeviceSettingsModal';
import { ParticipantListPanel } from './meeting/ParticipantListPanel';
import { ChatPanel } from './meeting/ChatPanel';
import { HostControlsModal } from './HostControlsModal';
import { TimerControlsModal } from './TimerControlsModal';
import { SidePanel } from './ui/SidePanel';
import { useExtensionRecording } from '../hooks/useExtensionRecording';
import { NotesPanel } from './meeting/NotesPanel';
import { Disc, FileText, StopCircle, PenTool } from 'lucide-react';
import { TimerDisplay } from './meeting/TimerDisplay';
import { WhiteboardPanel } from './whiteboard/WhiteboardPanel';

const ActiveMeeting = ({ initialRoomId, userId, userRole, userName, onLeave }: { initialRoomId: string, userId: string, userRole: string, userName: string, onLeave: () => void }) => {
    const [currentRoomId, setCurrentRoomId] = useState(initialRoomId);

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    // const [showWhiteboard, setShowWhiteboard] = useState(false); // REMOVED LOCAL STATE
    const emojis = ['👍', '👏', '❤️', '😂', '😮', '🎉'];

    const {
        localStream, localScreenStream, peerStates, toggleAudio, toggleVideo,
        status, rooms, createRoom, shareScreen, stopShareScreen,
        globalSpotlightId, setSpotlight, isScreenSharing,
        switchDevice,
        isHandRaised,
        toggleHand,
        roomSettings,
        updateRoomSettings,
        endMeetingForAll,
        handleAdminAction,
        userRole: dynamicUserRole,
        sendReaction,
        chatMessages,
        sendMessage,
        editMessage,
        meetingTimer, // Ambil state timer
        startTimer,   // Ambil fungsi start
        stopTimer,     // Ambil fungsi stop
        pauseTimer,
        resumeTimer,

        // Synced States
        whiteboardOpen,
        toggleWhiteboard,
        recordingState,
        setSyncedRecordingState
    } = useWebRTC(currentRoomId, userId, userRole, userName);

    const effectiveRole = dynamicUserRole || userRole;

    const isHostOnly = effectiveRole === 'host' || effectiveRole === 'admin';
    const isHostOrCoHost = effectiveRole === 'host' || effectiveRole === 'co-host' || effectiveRole === 'admin';

    const [hasJoined, setHasJoined] = useState(false);
    const hasJoinedRef = useRef(false);

    const [copied, setCopied] = useState(false);
    const handleCopyRoomId = () => {
        const url = `${window.location.origin}?room=${currentRoomId}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const canToggleAudio = isHostOrCoHost || roomSettings.allowMic;
    const canToggleVideo = isHostOrCoHost || roomSettings.allowVideo;
    const canShareScreen = isHostOrCoHost || roomSettings.allowScreenShare;

    const [audioEnabled, setAudioEnabled] = useState(() => roomSettings.allowMic || isHostOrCoHost);
    const [videoEnabled, setVideoEnabled] = useState(() => roomSettings.allowVideo || isHostOrCoHost);

    const [audioOutputId, setAudioOutputId] = useState<string>('');

    const [activePanel, setActivePanel] = useState<'none' | 'rooms' | 'participants' | 'chat' | 'notes'>('none');
    const [newRoomName, setNewRoomName] = useState('');

    const { isRecording, startRecording, stopRecording, duration, extensionAvailable } = useExtensionRecording();

    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showLayoutModal, setShowLayoutModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [isTimerModalOpen, setIsTimerModalOpen] = useState(false); // New State
    const [showScreenShareMenu, setShowScreenShareMenu] = useState(false);

    const [showHostControls, setShowHostControls] = useState(false);
    const [showLeaveMenu, setShowLeaveMenu] = useState(false);
    const leaveMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (leaveMenuRef.current && !leaveMenuRef.current.contains(event.target as Node)) {
                setShowLeaveMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const [layoutMode, setLayoutMode] = useState<LayoutMode>('auto');
    const [maxTiles, setMaxTiles] = useState(16);
    const [hideNoVideo, setHideNoVideo] = useState(false);

    const [sessionName, setSessionName] = useState<string>('');
    const [sessionCode, setSessionCode] = useState<string>('');
    const [isFetchingName, setIsFetchingName] = useState(false);

    const isMainRoom = currentRoomId === initialRoomId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentRoom = rooms.find((r: any) => r.id === currentRoomId);

    // Fetch session name if not available in rooms list (e.g. first load)
    useEffect(() => {
        const fetchSessionName = async () => {
            // Always try to fetch the rich session name from API, even if socket provided a name
            // if (currentRoom?.name) return; 
            if (!currentRoomId || currentRoomId.length < 3) return; // Skip if empty or too short

            setIsFetchingName(true);
            try {
                // Formatting Check
                const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(currentRoomId);
                const endpoint = isUuid
                    ? `/course-sessions/${currentRoomId}` // If UUID, use ID endpoint
                    : `/course-sessions/code/${currentRoomId}`; // If Shortcode, use Code endpoint

                console.log("🔍 Fetching Session Info:", { currentRoomId, isUuid, endpoint });

                const response = await api.get(endpoint);
                if (response.data && response.data.data) {
                    const data = response.data.data;
                    console.log("✅ Session Data Found:", data);
                    if (data.title) setSessionName(data.title);
                    // Ensure we prefer the short session_code if available
                    if (data.meeting_code) setSessionCode(data.meeting_code);
                    else if (data.session_code) setSessionCode(data.session_code);
                }
            } catch (error) {
                console.error("Failed to fetch session name:", error);
            } finally {
                setIsFetchingName(false);
            }
        };

        fetchSessionName();
    }, [currentRoomId, currentRoom?.name]);

    const currentRoomName = sessionName || currentRoom?.name || currentRoomId;

    const allPeerEntries = Object.entries(peerStates).filter(([id]) => id !== userId);

    const totalParticipants = 1 + allPeerEntries.length;

    const renderedPeerEntries = allPeerEntries.filter(([, state]) => {
        if (hideNoVideo) {
            return state.videoEnabled || state.screenStream;
        }
        return true;
    });

    const remoteScreenEntry = allPeerEntries.find(([, state]) => state.screenStream);

    useEffect(() => {
        if (localStream && !hasJoinedRef.current) {
            const startAudio = roomSettings.allowMic || isHostOrCoHost;
            const startVideo = roomSettings.allowVideo || isHostOrCoHost;

            setAudioEnabled(startAudio);
            setVideoEnabled(startVideo);

            toggleAudio(startAudio);
            if (!isScreenSharing) toggleVideo(startVideo);

            hasJoinedRef.current = true;
            setTimeout(() => setHasJoined(true), 0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localStream]);

    useEffect(() => {
        if (!isHostOrCoHost) {
            if (!roomSettings.allowMic && audioEnabled) {
                setAudioEnabled(false);
            }
            if (!roomSettings.allowVideo && videoEnabled) {
                setVideoEnabled(false);
            }
        }
    }, [roomSettings, isHostOrCoHost, audioEnabled, videoEnabled]);

    const handleToggleAudio = () => {
        if (!canToggleAudio) {
            alert("Penyelenggara telah mematikan izin mikrofon.");
            return;
        }
        setAudioEnabled(!audioEnabled);
        toggleAudio(!audioEnabled);
    };

    const handleToggleVideo = () => {
        if (!canToggleVideo) {
            alert("Penyelenggara telah mematikan izin kamera.");
            return;
        }
        setVideoEnabled(!videoEnabled);
        toggleVideo(!videoEnabled);
    };

    const handleScreenShareClick = () => {
        if (!canShareScreen) {
            alert("Penyelenggara telah mematikan izin berbagi layar.");
            return;
        }

        if (isScreenSharing) {
            setShowScreenShareMenu(!showScreenShareMenu);
        } else if (remoteScreenEntry) {
            alert("Tidak bisa membagikan layar karena peserta lain sedang melakukan presentasi.");
        } else {
            shareScreen();
        }
    };

    const handleDeviceChange = async (type: 'audioinput' | 'videoinput', deviceId: string) => {
        await switchDevice(type, deviceId);
    };

    const handleResolutionChange = (height: number) => {
        if (localStream) {
            const track = localStream.getVideoTracks()[0];
            if (track) {
                console.log(`Switching resolution to ${height}p...`);
                const constraints = {
                    height: { ideal: height },
                    aspectRatio: { ideal: 1.7777777778 },
                    frameRate: { ideal: 30 }
                };

                track.applyConstraints(constraints)
                    .then(() => {
                        const settings = track.getSettings();
                        console.log("Resolution applied:", settings.width, "x", settings.height);
                    })
                    .catch(e => console.error("Gagal ubah resolusi", e));
            }
        }
    };

    const handleVideoSettingChange = async (setting: string, value: number) => {
        if (localStream) {
            const track = localStream.getVideoTracks()[0];
            if (track && setting === 'brightness') {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await track.applyConstraints({ advanced: [{ brightness: value }] } as any);
                } catch (err) {
                    console.error("Gagal set brightness:", err);
                }
            }
        }
    };

    const handleFactoryReset = async () => {
        if (localStream) {
            const track = localStream.getVideoTracks()[0];
            if (track) {
                console.log("Melakukan Smart Reset Brightness...");
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const capabilities = track.getCapabilities() as any;

                    if (capabilities.brightness) {
                        const min = capabilities.brightness.min;
                        const max = capabilities.brightness.max;
                        const defaultVal = min + (max - min) / 2;
                        console.log(`Resetting Brightness to Midpoint: ${defaultVal} (Range: ${min}-${max})`);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        await track.applyConstraints({ advanced: [{ brightness: defaultVal }] } as any);
                    } else {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        await track.applyConstraints({ advanced: [] } as any);
                    }
                    console.log("Brightness reset successfully.");
                } catch (e) {
                    console.error("Reset failed", e);
                }
            }
        }
    };

    const handleCreateRoom = async () => {
        if (!newRoomName.trim()) return;
        // CREATE BREAKOUT ROOM
        // Pass currentRoomId as parent, and type='breakout'
        const newId = await createRoom(newRoomName, currentRoomId, 'breakout');
        setCurrentRoomId(newId);
        setNewRoomName('');
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(console.error);
        } else {
            document.exitFullscreen();
        }
    };

    const handleSpotlight = (id: string) => {
        if (globalSpotlightId === id) {
            setSpotlight(null);
        } else {
            setSpotlight(id);
        }
    };

    const activePresentationStream = remoteScreenEntry
        ? remoteScreenEntry[1].screenStream
        : localScreenStream;
    const isPresentationActive = !!activePresentationStream;

    let mainContentStream: MediaStream | undefined = undefined;
    let mainContentLabel = "";
    let mainContentIsLocal = false;
    let mainContentIsScreen = false;
    let mainContentUniqueId: string | null = null;
    let mainContentIsHandRaised = false;
    let mainContentRole: string | undefined = undefined;

    if (globalSpotlightId) {
        if (globalSpotlightId === userId) {
            mainContentStream = localStream || undefined;
            mainContentLabel = userName + " (You)";
            mainContentIsLocal = true;
            mainContentUniqueId = userId;
            mainContentIsHandRaised = isHandRaised;
            mainContentRole = effectiveRole;
        } else {
            const peer = peerStates[globalSpotlightId];
            if (peer) {
                mainContentStream = peer.stream;
                mainContentLabel = peer.name || globalSpotlightId;
                mainContentUniqueId = globalSpotlightId;
                mainContentIsHandRaised = !!peer.isHandRaised;
                mainContentRole = peer.role;
            }
        }
    }

    if (!mainContentStream) {
        if (isPresentationActive) {
            mainContentStream = activePresentationStream!;
            const presenterName = remoteScreenEntry ? (peerStates[remoteScreenEntry[0]]?.name || remoteScreenEntry[0]) : "Anda";
            mainContentLabel = `Presentasi ${presenterName}`;
            mainContentIsLocal = !!localScreenStream && !remoteScreenEntry;
            mainContentIsScreen = true;
            mainContentUniqueId = "SCREEN_SHARE";

            if (remoteScreenEntry) {
                mainContentRole = peerStates[remoteScreenEntry[0]]?.role;
            } else {
                mainContentRole = effectiveRole;
            }
        }
        else if (renderedPeerEntries.length > 0 && layoutMode !== 'grid') {
            mainContentStream = renderedPeerEntries[0][1].stream;
            mainContentLabel = renderedPeerEntries[0][1].name || renderedPeerEntries[0][0];
            mainContentUniqueId = renderedPeerEntries[0][0];
            mainContentIsHandRaised = !!renderedPeerEntries[0][1].isHandRaised;
            mainContentRole = renderedPeerEntries[0][1].role;
        }
        else if (layoutMode !== 'grid') {
            mainContentStream = localStream || undefined;
            mainContentLabel = userName;
            mainContentIsLocal = true;
            mainContentUniqueId = userId;
            mainContentIsHandRaised = isHandRaised;
            mainContentRole = effectiveRole;
        }
    }

    const hasMainContent = !!mainContentStream;

    let effectiveLayout = layoutMode;
    if (layoutMode === 'auto') {
        if (globalSpotlightId || isPresentationActive) effectiveLayout = 'sidebar';
        else effectiveLayout = 'grid';
    }

    const getAllGridItems = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: any[] = [];

        if (!hideNoVideo || videoEnabled) {
            const isMainSelf = mainContentUniqueId === userId && !mainContentIsScreen;
            if (effectiveLayout === 'grid' || !isMainSelf) {
                items.push({
                    id: userId,
                    stream: localStream || undefined,
                    label: userName,
                    role: effectiveRole,
                    isLocal: true,
                    isScreen: false,
                    videoEnabled: videoEnabled,
                    audioEnabled: audioEnabled,
                    muted: true,
                    isHandRaised: isHandRaised,
                    isSpotlighted: globalSpotlightId === userId,
                    reactions: peerStates[userId]?.reactions,
                    isChatBanned: peerStates[userId]?.isChatBanned,
                    key: `local-cam-${userId}`
                });
            }
        }

        if (localScreenStream && mainContentUniqueId !== "SCREEN_SHARE") {
            items.push({ id: userId, stream: localScreenStream, label: "Your Screen", isLocal: true, isScreen: true, muted: true, videoEnabled: true, audioEnabled: false, isHandRaised: false, isSpotlighted: false, key: `local-screen-${userId}` });
        }

        renderedPeerEntries.forEach(([id, state]) => {
            if (id === userId) return;

            const isMainPeer = mainContentUniqueId === id && !state.screenStream;

            if (effectiveLayout === 'grid' || !isMainPeer) {
                items.push({
                    id: id, stream: state.stream, label: state.name || id, role: state.role, isLocal: false, isScreen: false, videoEnabled: state.videoEnabled, audioEnabled: state.audioEnabled, isHandRaised: state.isHandRaised, isSpotlighted: globalSpotlightId === id, reactions: state.reactions, isChatBanned: state.isChatBanned, key: `remote-cam-${id}`
                });
            }

            if (state.screenStream && mainContentUniqueId !== "SCREEN_SHARE") {
                items.push({ id: id, stream: state.screenStream, label: `Presentasi ${state.name || id}`, isLocal: false, isScreen: true, videoEnabled: true, audioEnabled: true, isHandRaised: false, isSpotlighted: false, key: `remote-screen-${id}` });
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return items.sort((a: any, b: any) => {
            if (a.isSpotlighted) return -1;
            if (b.isSpotlighted) return 1;
            if (a.isScreen) return -1;
            if (b.isScreen) return 1;
            if (a.isHandRaised) return -1;
            if (b.isHandRaised) return 1;
            return 0;
        });
    };

    const gridItems = getAllGridItems();

    const getGridClass = (count: number) => {
        if (count === 1) return 'grid-cols-1 max-w-full h-full';
        if (count === 2) return 'grid-cols-1 md:grid-cols-2 max-w-6xl h-full md:h-auto';
        if (count <= 4) return 'grid-cols-2 max-w-5xl h-full md:h-auto';
        if (count <= 6) return 'grid-cols-2 md:grid-cols-3 max-w-7xl';
        return 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5 max-w-full';
    };

    const menuItems: MenuItem[] = [
        { label: "Rooms / Breakout", icon: LayoutGrid, onClick: () => setActivePanel('rooms') },
        { label: "Catatan Rapat", icon: FileText, onClick: () => setActivePanel('notes') },
        { label: "Whiteboard", icon: PenTool, onClick: () => toggleWhiteboard(!whiteboardOpen) },
        ...(isHostOrCoHost ? [{ label: "Timer", icon: Timer, onClick: () => setIsTimerModalOpen(true) }] : []),
        { divider: true, label: "", icon: Settings, onClick: () => { } }, // divider hack
        { label: "Pengaturan Perangkat", icon: Settings, onClick: () => setShowSettingsModal(true) },
        { label: "Sesuaikan tampilan", icon: Layout, onClick: () => setShowLayoutModal(true) },
        { label: "Layar penuh", icon: Maximize, onClick: toggleFullScreen },
        { label: "Laporkan masalah", icon: MoreVertical, onClick: () => console.log("Report"), danger: true }
    ];

    // Auto-join if recorder
    useEffect(() => {
        if (effectiveRole === 'recorder' && status === 'connected' && !hasJoined) {
            setTimeout(() => {
                setHasJoined(true);
            }, 1000);
        }
    }, [effectiveRole, status, hasJoined]);

    if (status === 'connecting' && !hasJoined) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#0f1014] text-white overflow-hidden">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                </div>
                <div className="mt-4 font-medium text-slate-400">Connecting to secure server...</div>
            </div>
        );
    }

    return (
        // FIX: Ubah h-screen menjadi h-full untuk mencegah overflow di dalam App wrapper
        <div className="relative h-full bg-gradient-to-br from-slate-950 via-[#0f1014] to-slate-900 text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30">

            {/* --- FIX 1: TAMPILKAN TIMER DI SINI --- */}
            {(meetingTimer?.isRunning || meetingTimer?.isPaused) && (
                <TimerDisplay
                    timer={meetingTimer}
                    onClick={() => isHostOrCoHost && setIsTimerModalOpen(true)}
                />
            )}

            {/* --- HEADER (Hidden for recorder) --- */}
            {effectiveRole !== 'recorder' && (
                <div className="absolute top-0 left-0 right-0 z-40 p-4 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
                    <div className="flex items-center gap-3 pointer-events-auto bg-slate-900/40 backdrop-blur-xl border border-white/5 px-4 py-2 rounded-2xl shadow-xl">
                        <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/30">
                            <Video size={18} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-white leading-tight max-w-[150px] sm:max-w-xs truncate">{currentRoomName}</h1>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-slate-400 bg-black/30 px-1.5 py-0.5 rounded">
                                    {sessionCode || currentRoomId}
                                </span>
                                {(isRecording || recordingState.isActive) && (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-red-400">REC {recordingState.startedBy && recordingState.startedBy !== userId ? `by ${recordingState.startedBy}` : ''}</span>
                                    </div>
                                )}
                                <button onClick={handleCopyRoomId} className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-white/10 transition-colors" title="Salin">
                                    {copied ? <CheckCheck size={10} className="text-green-400" /> : <Copy size={10} />}
                                </button>
                            </div>
                        </div>

                        <div className="h-6 w-px bg-white/10 mx-1"></div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 flex items-center">
                            {totalParticipants} Online
                        </span>

                        {(isHostOrCoHost || !roomSettings.allowMic) && <div className="h-6 w-px bg-white/10 mx-1"></div>}

                        {isHostOrCoHost && (
                            <button onClick={() => setShowHostControls(true)} className={`p-2 rounded-xl transition-all ${showHostControls ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`} title="Kontrol Host">
                                <Shield size={18} />
                            </button>
                        )}

                        {!isHostOrCoHost && (!roomSettings.allowMic || !roomSettings.allowVideo) && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                                <Lock size={12} /> <span className="text-[10px] font-bold uppercase">Restricted</span>
                            </div>
                        )}
                    </div>

                    {!isMainRoom && (
                        <button onClick={() => setCurrentRoomId(initialRoomId)} className="pointer-events-auto bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-900/30 flex items-center gap-2 transition-transform hover:-translate-y-0.5 active:translate-y-0">
                            <LayoutGrid size={16} /> <span className="hidden sm:inline">Main Hall</span>
                        </button>
                    )}
                </div>
            )
            }

            {/* --- MAIN STAGE --- */}
            <div className="h-full w-full pt-16 pb-24 px-2 md:pt-20 md:pb-28 md:px-4 flex flex-col items-center justify-center">

                {effectiveLayout === 'sidebar' || effectiveLayout === 'spotlight' ? (
                    <div className="w-full h-full flex flex-col md:flex-row gap-2 md:gap-4 max-w-[1800px]">

                        <div className="flex-1 bg-black/40 rounded-2xl md:rounded-3xl overflow-hidden border border-white/5 relative shadow-2xl flex items-center justify-center">
                            {hasMainContent ? (
                                <VideoPlayer
                                    stream={mainContentStream}
                                    label={mainContentLabel}
                                    role={mainContentRole}
                                    isLocal={mainContentIsLocal}
                                    isScreen={mainContentIsScreen}
                                    videoEnabled={mainContentIsLocal ? videoEnabled : true}
                                    audioEnabled={mainContentIsLocal ? audioEnabled : true}
                                    mirror={mainContentIsLocal && !mainContentIsScreen}
                                    isSpotlighted={globalSpotlightId === (mainContentIsLocal ? userId : mainContentLabel)}
                                    isHandRaised={mainContentIsHandRaised}
                                    onToggleSpotlight={() => handleSpotlight(mainContentIsLocal ? userId : mainContentLabel)}
                                    audioOutputId={audioOutputId}
                                    muted={mainContentIsLocal}
                                    targetId={mainContentUniqueId || undefined}
                                    currentUserRole={effectiveRole}
                                    onAdminAction={handleAdminAction}
                                    isChatBanned={mainContentIsLocal ? !!peerStates[userId]?.isChatBanned : !!peerStates[mainContentUniqueId!]?.isChatBanned}
                                />
                            ) : (
                                <div className="text-center text-slate-500 animate-pulse">
                                    <Monitor size={48} className="mx-auto mb-2 opacity-30" />
                                    <p>Menunggu konten...</p>
                                </div>
                            )}
                        </div>

                        {effectiveLayout === 'sidebar' && (
                            <div className="w-full md:w-64 lg:w-80 flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto scrollbar-hide shrink-0 h-32 md:h-full">
                                {gridItems.map(({ key, ...item }) => (
                                    <div key={key} className="shrink-0 w-48 md:w-full aspect-video rounded-xl overflow-hidden shadow-lg border border-white/5">
                                        <VideoPlayer
                                            {...item}
                                            currentUserRole={effectiveRole}
                                            onAdminAction={handleAdminAction}
                                            onToggleSpotlight={() => handleSpotlight(item.id)}
                                            audioOutputId={audioOutputId}
                                            targetId={item.id}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={`grid gap-4 w-full h-full content-center items-center justify-center p-2 transition-all duration-500 ${getGridClass(gridItems.length)}`}>
                        {gridItems.map(({ key, ...item }) => (
                            <div
                                key={key}
                                className={`relative rounded-2xl overflow-hidden shadow-lg border border-white/5 bg-slate-800/50 mx-auto ${gridItems.length === 1 ? 'w-auto max-w-full aspect-video' : 'w-full h-full min-h-[150px] aspect-video'}`}
                                style={gridItems.length === 1 ? { height: 'calc(100vh - 240px)' } : {}}
                            >
                                <VideoPlayer
                                    {...item}
                                    currentUserRole={effectiveRole}
                                    onAdminAction={handleAdminAction}
                                    onToggleSpotlight={() => handleSpotlight(item.id)}
                                    audioOutputId={audioOutputId}
                                    targetId={item.id}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- BOTTOM BAR (Hidden for recorder) --- */}
            {
                effectiveRole !== 'recorder' && (
                    <div className="absolute bottom-4 md:bottom-8 left-0 md:left-1/2 md:-translate-x-1/2 z-50 w-full md:w-auto md:max-w-[90%] px-4 flex justify-center pointer-events-none">
                        <div className="pointer-events-auto flex flex-wrap justify-center items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl md:rounded-full shadow-2xl shadow-black/50 transition-all hover:border-white/20 hover:scale-[1.02]">

                            <ControlButton onClick={handleToggleAudio} isActive={!audioEnabled} icon={audioEnabled ? Mic : MicOff} secondary={!canToggleAudio} label={!canToggleAudio ? "Terkunci" : (audioEnabled ? "Mute" : "Unmute")} />
                            <ControlButton onClick={handleToggleVideo} isActive={!videoEnabled} icon={videoEnabled ? Video : VideoOff} secondary={!canToggleVideo} label={!canToggleVideo ? "Terkunci" : (videoEnabled ? "Stop" : "Start")} />

                            <div className="hidden sm:block w-px h-8 bg-white/10"></div>

                            <ControlButton onClick={toggleHand} isActive={!isHandRaised} secondary={!isHandRaised} icon={Hand} label="Tanya" />

                            <div className="relative">
                                <ControlButton onClick={handleScreenShareClick} isActive={isScreenSharing} icon={isScreenSharing ? MonitorUp : Monitor} secondary={!canShareScreen} label="Share" />
                                {showScreenShareMenu && isScreenSharing && (
                                    <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 rounded-xl shadow-xl p-1 min-w-40 flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2">
                                        <button onClick={() => { shareScreen(); setShowScreenShareMenu(false); }} className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded-lg text-xs text-white"> <ArrowRightLeft size={14} /> Ganti Layar </button>
                                        <button onClick={() => { stopShareScreen(); setShowScreenShareMenu(false); }} className="flex items-center gap-2 px-3 py-2 hover:bg-red-500/20 text-red-400 rounded-lg text-xs"> <XCircle size={14} /> Stop Share </button>
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <ControlButton
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    isActive={showEmojiPicker}
                                    icon={Smile}
                                    label="Reaksi"
                                    secondary
                                />
                                {showEmojiPicker && (
                                    <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-2 flex gap-1 animate-in fade-in slide-in-from-bottom-2 z-50">
                                        {emojis.map(emoji => (
                                            <button
                                                key={emoji}
                                                onClick={() => sendReaction(emoji)}
                                                className="text-2xl hover:bg-white/10 p-2 rounded-xl transition-transform hover:scale-125 active:scale-95"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="hidden sm:block w-px h-8 bg-white/10"></div>

                            <div className="relative">
                                <ControlButton
                                    onClick={() => setActivePanel(activePanel === 'chat' ? 'none' : 'chat')}
                                    isActive={activePanel === 'chat'}
                                    icon={MessageSquare}
                                    label="Chat"
                                    secondary
                                />
                            </div>

                            <ControlButton onClick={() => setActivePanel(activePanel === 'participants' ? 'none' : 'participants')} isActive={activePanel === 'participants'} icon={Users} label="Peserta" secondary />

                            <ControlButton
                                onClick={() => {
                                    if (isRecording) {
                                        stopRecording();
                                        setSyncedRecordingState(false);
                                    } else {
                                        startRecording();
                                        setSyncedRecordingState(true);
                                    }
                                }}
                                isActive={isRecording}
                                icon={isRecording ? StopCircle : Disc}
                                label={isRecording ? `${duration}s` : (extensionAvailable ? "Record" : "Record*")}
                                secondary={!isRecording}
                                isDestructive={isRecording}
                            />

                            <div className="relative">
                                <ControlButton onClick={() => setShowMoreMenu(!showMoreMenu)} isActive={showMoreMenu} icon={MoreHorizontal} label="Lainnya" secondary />
                                <ActionMenu isOpen={showMoreMenu} onClose={() => setShowMoreMenu(false)} items={menuItems} />
                            </div>

                            <div className="w-px h-8 bg-white/10"></div>

                            <div className="relative" ref={leaveMenuRef}>
                                <ControlButton onClick={() => setShowLeaveMenu(!showLeaveMenu)} isActive={showLeaveMenu} isDestructive={!showLeaveMenu} icon={PhoneOff} />
                                {showLeaveMenu && (
                                    <div className="absolute bottom-full right-0 mb-4 w-56 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl p-2 animate-in slide-in-from-bottom-4 flex flex-col gap-1">
                                        {isHostOnly && (
                                            <>
                                                <button onClick={endMeetingForAll} className="flex items-center gap-3 px-3 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl w-full text-left group transition-all">
                                                    <div className="p-1.5 bg-red-800/50 rounded-lg"><Power size={16} /></div>
                                                    <div> <span className="block text-xs font-bold">Akhiri Semua</span> <span className="block text-[9px] text-red-200">Bubarkan rapat</span> </div>
                                                </button>
                                                <div className="h-px bg-white/5 mx-2 my-1"></div>
                                            </>
                                        )}
                                        <button onClick={onLeave} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 text-slate-200 rounded-xl w-full text-left transition-all">
                                            <div className="p-1.5 bg-slate-700 rounded-lg"><LogOut size={16} /></div>
                                            <div> <span className="block text-xs font-bold">Keluar Rapat</span> <span className="block text-[9px] text-slate-400">Hanya Anda</span> </div>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }


            {/* --- MODALS --- */}
            <LayoutSettingsModal isOpen={showLayoutModal} onClose={() => setShowLayoutModal(false)} currentLayout={layoutMode} onLayoutChange={setLayoutMode} maxTiles={maxTiles} onMaxTilesChange={setMaxTiles} hideNoVideo={hideNoVideo} onHideNoVideoChange={setHideNoVideo} />
            <DeviceSettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} currentStream={localStream} onDeviceChange={handleDeviceChange} onOutputChange={setAudioOutputId} onResolutionChange={handleResolutionChange} onSettingChange={handleVideoSettingChange} onFactoryReset={handleFactoryReset} />

            <HostControlsModal
                isOpen={showHostControls}
                onClose={() => setShowHostControls(false)}
                settings={roomSettings}
                onUpdateSettings={updateRoomSettings}
            />

            <TimerControlsModal
                isOpen={isTimerModalOpen}
                onClose={() => setIsTimerModalOpen(false)}
                onStartTimer={startTimer}
                onStopTimer={stopTimer}
                onPauseTimer={pauseTimer}
                onResumeTimer={resumeTimer}
                currentTimer={meetingTimer}
            />

            {
                whiteboardOpen && (
                    <WhiteboardPanel
                        roomId={currentRoomId}
                        role={effectiveRole as any}
                        onClose={() => toggleWhiteboard(false)}
                        allowParticipantDraw={roomSettings.allowParticipantDraw || false}
                    />
                )
            }


            {/* --- PANELS --- */}
            {
                activePanel === 'participants' && (
                    <ParticipantListPanel
                        participants={allPeerEntries}
                        localName={userName}
                        localRole={effectiveRole}
                        onClose={() => setActivePanel('none')}
                    />
                )
            }

            {
                activePanel === 'chat' && (
                    <ChatPanel
                        messages={chatMessages}
                        onSendMessage={sendMessage}
                        onEditMessage={editMessage}
                        onClose={() => setActivePanel('none')}
                        currentUserId={userId}
                        isChatAllowed={isHostOrCoHost || roomSettings.allowChat}
                        isChatBanned={!isHostOrCoHost && !!peerStates[userId]?.isChatBanned}
                    />
                )
            }

            {
                activePanel === 'notes' && (
                    <NotesPanel onClose={() => setActivePanel('none')} />
                )
            }

            {/* BREAKOUT ROOMS PANEL */}
            <SidePanel
                title="Breakout Rooms"
                icon={LayoutGrid}
                onClose={() => setActivePanel('none')}
                width="w-80"
                className={`transform transition-transform duration-300 ease-out ${activePanel === 'rooms' ? 'translate-x-0' : 'translate-x-[110%]'} top-4 right-4 bottom-24`}
            >
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <div className="bg-slate-800/40 p-1 rounded-xl border border-white/5 flex items-center"> <input className="bg-transparent border-none outline-none text-sm text-white px-3 py-2 w-full placeholder:text-slate-600" placeholder="Create new room..." value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()} /> <button onClick={handleCreateRoom} className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors m-1"> <ChevronRight size={16} /> </button> </div>
                    <div className="space-y-1">
                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-2 mb-2">Active Rooms</div>
                        {rooms
                            .filter(r => r.parentRoomId === initialRoomId)
                            .map(room => (
                                <button key={room.id} onClick={() => setCurrentRoomId(room.id)} className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 border ${currentRoomId === room.id ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-transparent border-transparent hover:bg-white/5'}`}> <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${currentRoomId === room.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}> {room.name.charAt(0).toUpperCase()} </div> <div className="flex-1"> <div className={`text-sm font-medium ${currentRoomId === room.id ? 'text-white' : 'text-slate-300'}`}> {room.name} </div> <div className="text-[11px] text-slate-500 flex items-center gap-1"> <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> {room.participants?.length || 0} participants </div> </div> {currentRoomId === room.id && (<div className="w-1.5 h-1.5 bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(99,102,241,1)]" />)} </button>
                            ))}
                    </div>
                </div>
            </SidePanel>
        </div >
    );
};

export default function MeetingRoom({ roomId, userId, userRole, userName, setJoined }: { roomId: string, userId: string, userRole: string, userName: string, setJoined: (joined: boolean) => void }) {
    return <ActiveMeeting initialRoomId={roomId} userId={userId} userRole={userRole} userName={userName} onLeave={() => setJoined(false)} />;
}