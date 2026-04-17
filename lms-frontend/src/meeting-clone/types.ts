export type UserRole = "host" | "co-host" | "participant" | "recorder";

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
}

export interface AuthResponse {
    success: boolean;
    message?: string;
    user?: User;
}

export interface MeetingTimer {
    endTime: number; // Timestamp kapan timer berakhir (Epoch ms)
    duration: number; // Durasi awal dalam detik (untuk referensi)
    isRunning: boolean; // Status aktif/tidak
    isPaused?: boolean;
    remainingTime?: number;
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: number;
    replyTo?: {
        id: string;
        senderName: string;
        content: string;
    };
    isEdited?: boolean;
}

export interface RoomSettings {
    allowScreenShare: boolean;
    allowChat: boolean;
    allowMic: boolean;
    allowVideo: boolean;
    allowReactions: boolean;
    allowParticipantDraw: boolean;
}

export interface MediaState {
    audio: boolean;
    video: boolean;
}

export interface Room {
    id: string;
    name: string;
    participants: string[];
    ownerId: string;
    spotlightId?: string | null;
    handStates?: Record<string, boolean>;
    mediaStates?: Record<string, MediaState>; // <-- NEW
    whiteboardOpen?: boolean;
    recordingState?: {
        isActive: boolean;
        startedBy?: string;
        startTime?: number;
    };
    chatBannedIds?: string[];
    settings: RoomSettings;
    startTime: number;
    timer?: MeetingTimer;
    parentRoomId?: string;
    type?: "main" | "breakout";
}

export interface UserStateUpdate {
    userId: string;
    type: "audio" | "video" | "role" | "chat";
    value: boolean | string;
}

export interface RoomStatusResponse {
    status: "ok" | "conflict" | "not-found";
    roomName?: string;
}

export interface ServerToClientEvents {
    "user-connected": (
        userId: string,
        role: string,
        name: string,
        media?: MediaState,
    ) => void; // <-- UPDATED
    "user-disconnected": (userId: string) => void;
    offer: (offer: RTCSessionDescriptionInit, userId: string) => void;
    answer: (answer: RTCSessionDescriptionInit, userId: string) => void;
    "ice-candidate": (candidate: RTCIceCandidate, userId: string) => void;
    "toggle-media": (
        userId: string,
        kind: "audio" | "video",
        enabled: boolean,
    ) => void;
    "rooms-update": (rooms: Room[]) => void;
    "spotlight-update": (userId: string | null) => void;
    "hand-update": (userId: string, isRaised: boolean) => void;
    "sync-hands": (handStates: Record<string, boolean>) => void;
    "room-settings-update": (settings: RoomSettings) => void;
    "meeting-ended": () => void;
    "existing-participants": (
        users: {
            userId: string;
            name: string;
            role: string;
            media?: MediaState;
        }[], // <-- UPDATED
    ) => void;
    "user-state-updated": (update: UserStateUpdate) => void;
    "force-logout": () => void;
    "session-check-result": (isActive: boolean) => void;
    "auth-result": (response: AuthResponse) => void;
    "session-conflict": (roomName: string) => void;

    // EVENT BARU: Hasil pengecekan room
    "room-status-result": (result: RoomStatusResponse) => void;
    "reaction-received": (userId: string, emoji: string) => void;
    "chat-message-received": (message: ChatMessage) => void;
    "chat-message-updated": (message: ChatMessage) => void;
    "timer-update": (timer: MeetingTimer) => void;

    // Media & State Sync
    "whiteboard-updated": (isOpen: boolean) => void;
    "recording-state-updated": (state: {
        isActive: boolean;
        startedBy?: string;
        startTime?: number;
    }) => void;
    "sync-room-state": (state: {
        whiteboardOpen: boolean;
        recordingState: {
            isActive: boolean;
            startedBy?: string;
            startTime?: number;
        };
    }) => void;
}

export interface ClientToServerEvents {
    "join-room": (
        roomId: string,
        userId: string,
        roleRequest: string,
        name: string,
        forceJoin?: boolean,
        initialState?: MediaState, // <-- UPDATED
    ) => void;
    "create-room": (
        name: string,
        userId: string,
        callback: (roomId: string) => void,
        customId?: string,
        parentRoomId?: string,
        type?: "main" | "breakout",
    ) => void;
    offer: (offer: RTCSessionDescriptionInit, toUserId: string) => void;
    answer: (answer: RTCSessionDescriptionInit, toUserId: string) => void;
    "ice-candidate": (candidate: RTCIceCandidate, toUserId: string) => void;
    "toggle-media": (kind: "audio" | "video", enabled: boolean) => void;
    "set-spotlight": (userId: string | null) => void;
    "toggle-hand": (isRaised: boolean) => void;
    "update-room-settings": (settings: RoomSettings) => void;
    "end-meeting-for-all": () => void;
    "check-session": (userId: string) => void;
    "admin-update-user": (
        targetId: string,
        type: "audio" | "video" | "role" | "chat",
        value: boolean | string,
    ) => void;
    "auth-login": (email: string, pass: string) => void;
    "auth-register": (email: string, pass: string, name: string) => void;

    // EVENT BARU: Cek room tanpa join
    "check-room-status": (roomId: string, userId: string) => void;
    "send-reaction": (emoji: string) => void;
    "send-chat-message": (message: ChatMessage) => void;
    "edit-chat-message": (message: ChatMessage) => void;
    "start-timer": (duration: number) => void;
    "stop-timer": () => void;
    "pause-timer": () => void;
    "resume-timer": () => void;

    // State Control
    "toggle-whiteboard": (isOpen: boolean) => void;
    "set-recording-state": (isActive: boolean) => void;
}

export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData {
    userId: string;
    roomId: string;
    role?: string;
    name?: string;
    email?: string;
}
