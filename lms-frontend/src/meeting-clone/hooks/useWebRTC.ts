/// <reference types="vite/client" />
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type {
    Room,
    RoomSettings,
    UserStateUpdate,
    ClientToServerEvents,
    ServerToClientEvents,
    ChatMessage,
    MeetingTimer,
} from "../types";

const SOCKET_URL = import.meta.env.VITE_MEETING_SERVER_URL || "/";

export interface Reaction {
    id: number;
    emoji: string;
    senderName: string;
    position: number;
    rotation: number;
}

export interface PeerState {
    stream?: MediaStream;
    screenStream?: MediaStream;
    videoEnabled: boolean;
    audioEnabled: boolean;
    name: string;
    role: string;
    isHandRaised: boolean;
    isChatBanned?: boolean;
    reactions: {
        id: number;
        emoji: string;
        senderName: string;
        position: number;
        rotation: number;
    }[];
}

export const useWebRTC = (
    roomId: string,
    userId: string,
    userRole: string = "participant",
    userName: string = "User",
) => {
    const [status, setStatus] = useState<
        "connecting" | "connected" | "disconnected"
    >("connecting");
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [localScreenStream, setLocalScreenStream] =
        useState<MediaStream | null>(null);
    // const [peers, setPeers] = useState<Record<string, RTCPeerConnection>>({});
    const [peerStates, setPeerStates] = useState<Record<string, PeerState>>({});
    const [rooms, setRooms] = useState<Room[]>([]);

    const [globalSpotlightId, setGlobalSpotlightId] = useState<string | null>(
        null,
    );
    const [roomSettings, setRoomSettings] = useState<RoomSettings>({
        allowScreenShare: true,
        allowChat: true,
        allowMic: true,
        allowVideo: true,
        allowReactions: true,
        allowParticipantDraw: false,
    });
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [dynamicUserRole, setDynamicUserRole] = useState(userRole);

    // Chat State
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [meetingTimer, setMeetingTimer] = useState<MeetingTimer | null>(null); // State Timer Baru

    // Synced Room States
    const [whiteboardOpen, setWhiteboardOpen] = useState(false);
    const [recordingState, setRecordingState] = useState<{
        isActive: boolean;
        startedBy?: string;
        startTime?: number;
    }>({ isActive: false });

    const socketRef = useRef<Socket<
        ServerToClientEvents,
        ClientToServerEvents
    > | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});

    // --- 1. SETUP SOCKET & LOCAL STREAM ---
    useEffect(() => {
        const socket = io(SOCKET_URL, {
            path: "/socket.io",
            transports: ["websocket", "polling"],
        });
        socketRef.current = socket;

        const init = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true,
                });
                setLocalStream(stream);
                localStreamRef.current = stream;

                // Sync initial mute state based on settings OR local stream tracks
                const audioEnabled =
                    stream.getAudioTracks()[0]?.enabled ?? true;
                const videoEnabled =
                    stream.getVideoTracks()[0]?.enabled ?? true;

                socket.emit(
                    "join-room",
                    roomId,
                    userId,
                    userRole,
                    userName,
                    true,
                    { audio: audioEnabled, video: videoEnabled },
                );
            } catch (err) {
                console.error("Failed to get local stream", err);
                // Still join without stream, assume disabled or default?
                // If no stream, maybe both false?
                socket.emit(
                    "join-room",
                    roomId,
                    userId,
                    userRole,
                    userName,
                    true,
                    { audio: false, video: false },
                );
            }
        };

        init();

        return () => {
            localStreamRef.current?.getTracks().forEach((t) => t.stop());
            screenStreamRef.current?.getTracks().forEach((t) => t.stop());
            Object.values(peerConnections.current).forEach((pc) => pc.close());
            socket.disconnect();
        };
    }, [roomId, userId, userRole, userName]);

    // --- 2. PEER CONNECTION HELPERS ---
    const createPeerConnection = (
        pId: string,
        pRole: string,
        pName: string,
    ) => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current?.emit("ice-candidate", event.candidate, pId);
            }
        };

        pc.ontrack = (event) => {
            const stream = event.streams[0];
            // const kind = event.track.kind; // 'audio' or 'video'

            setPeerStates((prev) => {
                const existing = prev[pId] || {
                    videoEnabled: true,
                    audioEnabled: true,
                    name: pName,
                    role: pRole,
                    isHandRaised: false,
                    reactions: [],
                };

                // Simple heuristic: if we get a video track and it's NOT the first video track,
                // it might be a screen share?
                // Or better: distinguish by checking if we already have a main stream.

                // For this clone, we treat the first stream as main.
                // If the stream ID is different, maybe it's screen share?
                // But simplified: Just use the stream provided.

                // Handle Screen Share distinction:
                // Usually screen share is a separate stream or a separate track.
                // If event.streams[0] is DIFFERENT from existing.stream, it might be screen.

                const updated = { ...existing };

                // Basic logic: Just put the stream in.
                // If we want to support screen share, we need to know WHICH stream this is.
                // The `ontrack` gives us the stream.

                if (!updated.stream) {
                    updated.stream = stream;
                } else if (updated.stream.id !== stream.id) {
                    updated.screenStream = stream;
                }

                return { ...prev, [pId]: updated };
            });
        };

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, screenStreamRef.current!);
            });
        }

        peerConnections.current[pId] = pc;
        // setPeers((prev) => ({ ...prev, [pId]: pc }));
        return pc;
    };

    // --- 3. SOCKET EVENT LISTENERS ---
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        socket.on("connect", () => setStatus("connected"));
        socket.on("disconnect", () => setStatus("disconnected"));

        socket.on("user-connected", async (pId, pRole, pName, media) => {
            // New user joined, WE create offer
            const pc = createPeerConnection(pId, pRole, pName);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("offer", offer, pId);

            setPeerStates((prev) => ({
                ...prev,
                [pId]: {
                    videoEnabled: media ? media.video : true,
                    audioEnabled: media ? media.audio : true,
                    name: pName,
                    role: pRole,
                    isHandRaised: false,
                    reactions: [],
                },
            }));
        });

        socket.on("existing-participants", (users) => {
            // Processing existing participants
            // We initiate connections? No, usually in Mesh, the joiner initiates OR waits.
            // Let's stick to: Joiner sends offers?
            // In Mesh, usually Joiner says "I'm here", others make offer? Or Joiner makes offer to everyone?
            // Socket handling above: user-connected -> create offer.
            // So existing users will see "user-connected" and send ME an offer.
            // So I just need to init the state.

            const states: Record<string, PeerState> = {};
            users.forEach((u) => {
                states[u.userId] = {
                    videoEnabled: u.media ? u.media.video : true,
                    audioEnabled: u.media ? u.media.audio : true,
                    name: u.name,
                    role: u.role,
                    isHandRaised: false,
                    reactions: [],
                };
            });
            setPeerStates((prev) => ({ ...prev, ...states }));
        });

        socket.on("offer", async (offer, pId) => {
            // Received offer, answer it.
            // We might not have PeerState yet if 'user-connected' logic handled it on the other side.
            // But 'offer' comes from existing user to the joiner?
            // If I am joiner: I receive 'offer' from existing users (since they saw 'user-connected').

            let pc = peerConnections.current[pId];
            if (!pc) {
                // If we don't know this user yet, create PC
                // We need name/role. For now default or fetch from state if available?
                // The 'existing-participants' should have populated basic info.
                const pName = peerStates[pId]?.name || "Unknown";
                const pRole = peerStates[pId]?.role || "participant";
                pc = createPeerConnection(pId, pRole, pName);
            }

            await pc.setRemoteDescription(offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("answer", answer, pId);
        });

        socket.on("answer", async (answer, pId) => {
            const pc = peerConnections.current[pId];
            if (pc) await pc.setRemoteDescription(answer);
        });

        socket.on("ice-candidate", async (candidate, pId) => {
            const pc = peerConnections.current[pId];
            if (pc) await pc.addIceCandidate(candidate);
        });

        socket.on("timer-update", (timer) => {
            setMeetingTimer(timer);
        });

        socket.on("user-disconnected", (pId) => {
            if (peerConnections.current[pId]) {
                peerConnections.current[pId].close();
                delete peerConnections.current[pId];
                /*
        setPeers((prev) => {
          const next = { ...prev };
          delete next[pId];
          return next;
        });
        */
            }
            setPeerStates((prev) => {
                const next = { ...prev };
                delete next[pId];
                return next;
            });
        });

        // --- NEW STATE SYNC LISTENERS ---
        socket.on("whiteboard-updated", (isOpen) => {
            setWhiteboardOpen(isOpen);
        });

        socket.on("recording-state-updated", (state) => {
            setRecordingState(state);
        });

        socket.on("sync-room-state", (state) => {});

        socket.on("toggle-media", (pId, kind, enabled) => {
            setPeerStates((prev) => ({
                ...prev,
                [pId]: {
                    ...prev[pId],
                    [kind === "audio" ? "audioEnabled" : "videoEnabled"]:
                        enabled,
                },
            }));
        });

        socket.on("hand-update", (pId, isRaised) => {
            setPeerStates((prev) => ({
                ...prev,
                [pId]: { ...prev[pId], isHandRaised: isRaised },
            }));
        });

        socket.on("sync-hands", (handStates) => {
            setPeerStates((prev) => {
                const next = { ...prev };
                Object.keys(handStates).forEach((id) => {
                    if (next[id]) next[id].isHandRaised = handStates[id];
                });
                return next;
            });
            if (handStates[userId]) setIsHandRaised(handStates[userId]);
        });

        socket.on("spotlight-update", (id) => setGlobalSpotlightId(id));
        socket.on("room-settings-update", (settings) =>
            setRoomSettings(settings),
        );
        socket.on("rooms-update", (rooms) => setRooms(rooms));

        socket.on("user-state-updated", (update: UserStateUpdate) => {
            if (update.userId === userId) {
                if (update.type === "role")
                    setDynamicUserRole(update.value as string);
                if (update.type === "chat") {
                    setPeerStates((prev) => ({
                        ...prev,
                        [userId]: {
                            ...prev[userId],
                            isChatBanned: !(update.value as boolean),
                        },
                    }));
                }
            } else {
                setPeerStates((prev) => {
                    const p = prev[update.userId];
                    if (!p) return prev;
                    if (update.type === "role")
                        return {
                            ...prev,
                            [update.userId]: {
                                ...p,
                                role: update.value as string,
                            },
                        };
                    if (update.type === "chat")
                        return {
                            ...prev,
                            [update.userId]: {
                                ...p,
                                isChatBanned: !(update.value as boolean),
                            },
                        };
                    return prev;
                });
            }
        });

        socket.on("meeting-ended", () => {
            window.location.reload();
        });

        // Chat Events
        socket.on("chat-message-received", (msg) => {
            setChatMessages((prev) => [...prev, msg]);
        });

        socket.on("chat-message-updated", (msg) => {
            setChatMessages((prev) =>
                prev.map((m) => (m.id === msg.id ? msg : m)),
            );
        });

        socket.on("reaction-received", (pId, emoji) => {
            const reactionId = Date.now() + Math.floor(Math.random() * 1000); // Prevent collision
            const position = Math.floor(Math.random() * 100) - 50; // Random offset -50px to 50px
            const rotation = Math.floor(Math.random() * 60) - 30; // Random rotation -30deg to 30deg

            setPeerStates((prev) => {
                const current = prev[pId];
                if (!current) return prev; // Ignore reaction from unknown peer
                const newReactions = [
                    ...(current.reactions || []),
                    {
                        id: reactionId,
                        emoji,
                        senderName: current.name || "Unknown",
                        position,
                        rotation,
                    },
                ];
                return {
                    ...prev,
                    [pId]: { ...current, reactions: newReactions },
                };
            });

            setTimeout(() => {
                setPeerStates((prev) => {
                    const current = prev[pId];
                    if (!current) return prev;
                    return {
                        ...prev,
                        [pId]: {
                            ...current,
                            reactions: current.reactions.filter(
                                (r) => r.id !== reactionId,
                            ),
                        },
                    };
                });
            }, 4000); // 4 seconds timeout
        });

        // --- NEW STATE SYNC LISTENERS ---
        socket.on("whiteboard-updated", (isOpen) => {
            setWhiteboardOpen(isOpen);
        });

        socket.on("recording-state-updated", (state) => {
            setRecordingState(state);
        });

        socket.on("sync-room-state", (state) => {
            if (state.whiteboardOpen !== undefined)
                setWhiteboardOpen(state.whiteboardOpen);
            if (state.recordingState) setRecordingState(state.recordingState);
        });

        return () => {
            socket.off("connect");
            socket.off("disconnect");
            socket.off("offer");
            socket.off("answer");
            socket.off("ice-candidate");
            socket.off("user-connected");
            socket.off("existing-participants");
            socket.off("user-disconnected");
            socket.off("toggle-media");
            socket.off("hand-update");
            socket.off("sync-hands");
            socket.off("spotlight-update");
            socket.off("room-settings-update");
            socket.off("rooms-update");
            socket.off("user-state-updated");
            socket.off("meeting-ended");
            socket.off("chat-message-received");
            socket.off("chat-message-updated");
            socket.off("timer-update");
            socket.off("whiteboard-updated");
            socket.off("recording-state-updated");
            socket.off("sync-room-state");
            socket.off("reaction-received");
        };
    }, []);

    // --- 4. METHODS ---

    const toggleAudio = (enabled?: boolean) => {
        if (!localStream) return;
        const track = localStream.getAudioTracks()[0];
        if (!track) return;
        const newState = enabled !== undefined ? enabled : !track.enabled;
        track.enabled = newState;
        socketRef.current?.emit("toggle-media", "audio", newState);
    };

    const toggleVideo = (enabled?: boolean) => {
        if (!localStream) return;
        const track = localStream.getVideoTracks()[0];
        if (!track) return;
        const newState = enabled !== undefined ? enabled : !track.enabled;
        track.enabled = newState;
        socketRef.current?.emit("toggle-media", "video", newState);
    };

    const shareScreen = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            });
            setLocalScreenStream(stream);
            screenStreamRef.current = stream;

            // Add tracks to all peers
            Object.values(peerConnections.current).forEach((pc) => {
                stream
                    .getTracks()
                    .forEach((track) => pc.addTrack(track, stream));
            });

            setIsScreenSharing(true);

            stream.getVideoTracks()[0].onended = () => {
                stopShareScreen();
            };
        } catch (e) {
            console.error(e);
        }
    };

    const stopShareScreen = () => {
        screenStreamRef.current?.getTracks().forEach((t) => t.stop());
        setLocalScreenStream(null);
        screenStreamRef.current = null;
        setIsScreenSharing(false);
    };

    const startTimer = (seconds: number) => {
        socketRef.current?.emit("start-timer", seconds);
    };

    const stopTimer = () => {
        socketRef.current?.emit("stop-timer");
    };

    const pauseTimer = () => {
        socketRef.current?.emit("pause-timer");
    };

    const resumeTimer = () => {
        socketRef.current?.emit("resume-timer");
    };

    const sendMessage = (content: string, replyTo?: ChatMessage["replyTo"]) => {
        const msgId =
            typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const msg: ChatMessage = {
            id: msgId,
            senderId: userId,
            senderName: userName,
            content,
            timestamp: Date.now(),
            replyTo,
        };

        if (socketRef.current) {
            socketRef.current.emit("send-chat-message", msg);
        } else {
            console.error("[Chat] Socket not initialized");
        }
    };

    const editMessage = (msgId: string, newContent: string) => {
        const original = chatMessages.find((m) => m.id === msgId);
        if (!original) return;

        const updated: ChatMessage = {
            ...original,
            content: newContent,
            isEdited: true,
        };
        socketRef.current?.emit("edit-chat-message", updated);
    };

    return {
        localStream,
        localScreenStream,
        peerStates,
        toggleAudio,
        toggleVideo,
        status,
        rooms,
        createRoom: (
            name: string,
            parentRoomId?: string,
            type?: "main" | "breakout",
        ) => {
            return new Promise<string>((resolve) => {
                socketRef.current?.emit(
                    "create-room",
                    name,
                    userId,
                    (roomId) => {
                        resolve(roomId);
                    },
                    undefined,
                    parentRoomId,
                    type,
                );
            });
        },
        shareScreen,
        stopShareScreen,
        globalSpotlightId,
        setSpotlight: (id: string | null) =>
            socketRef.current?.emit("set-spotlight", id),
        isScreenSharing,
        switchDevice: async (
            type: "audioinput" | "videoinput",
            deviceId: string,
        ) => {
            console.log("Switch device TODO", type, deviceId);
        },
        isHandRaised,
        toggleHand: () => {
            const newState = !isHandRaised;
            setIsHandRaised(newState);
            socketRef.current?.emit("toggle-hand", newState);
        },
        roomSettings,
        updateRoomSettings: (s: RoomSettings) =>
            socketRef.current?.emit("update-room-settings", s),
        endMeetingForAll: () => socketRef.current?.emit("end-meeting-for-all"),
        handleAdminAction: (
            targetId: string,
            type: "audio" | "video" | "role" | "chat",
            value: boolean | string,
        ) => {
            socketRef.current?.emit("admin-update-user", targetId, type, value);
        },
        userRole: dynamicUserRole,
        sendReaction: (emoji: string) => {
            socketRef.current?.emit("send-reaction", emoji);

            // Optimistic Local Update
            const reactionId = Date.now() + Math.floor(Math.random() * 1000);
            const position = Math.floor(Math.random() * 100) - 50;
            const rotation = Math.floor(Math.random() * 60) - 30;

            setPeerStates((prev) => {
                const current = prev[userId] || {
                    videoEnabled: true, // Defaults if missing
                    audioEnabled: true,
                    name: userName,
                    role: userRole,
                    isHandRaised: false,
                    reactions: [],
                };
                const newReactions = [
                    ...(current.reactions || []),
                    {
                        id: reactionId,
                        emoji,
                        senderName: "Anda",
                        position,
                        rotation,
                    },
                ];
                return {
                    ...prev,
                    [userId]: { ...current, reactions: newReactions },
                };
            });

            // Cleanup local reaction
            setTimeout(() => {
                setPeerStates((prev) => {
                    const current = prev[userId];
                    if (!current) return prev;
                    return {
                        ...prev,
                        [userId]: {
                            ...current,
                            reactions: current.reactions.filter(
                                (r) => r.id !== reactionId,
                            ),
                        },
                    };
                });
            }, 4000);
        },

        // Chat Exports
        chatMessages,
        sendMessage,
        editMessage,
        meetingTimer,
        startTimer,
        stopTimer,
        pauseTimer,
        resumeTimer,

        // Synced States
        whiteboardOpen,
        toggleWhiteboard: (isOpen: boolean) =>
            socketRef.current?.emit("toggle-whiteboard", isOpen),
        recordingState,
        setSyncedRecordingState: (isActive: boolean) =>
            socketRef.current?.emit("set-recording-state", isActive),
    };
};
