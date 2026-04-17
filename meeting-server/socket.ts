import { Server } from "socket.io";
import fs from "fs";
import path from "path";
import {
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData,
    Room,
    RoomSettings,
    User,
} from "./types";

interface DBUser extends User {
    password?: string;
}

const DB_FILE = path.join(process.cwd(), "users.json");
const DEFAULT_USERS: DBUser[] = [
    {
        id: "user-1",
        name: "Andi Host",
        email: "andi@meet.com",
        password: "123",
        role: "host",
    },
    {
        id: "user-2",
        name: "Budi Siswa",
        email: "budi@meet.com",
        password: "123",
        role: "participant",
    },
];

const loadUsers = (): DBUser[] => {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, "utf-8");
            return JSON.parse(data);
        }
    } catch (error) {
        console.error(
            "Gagal membaca database user, menggunakan default.",
            error,
        );
    }
    return [...DEFAULT_USERS];
};

const saveUsers = (users: DBUser[]) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error("Gagal menyimpan database user.", error);
    }
};

const usersDB: DBUser[] = loadUsers();

const activeRooms = new Map<string, Room>();
const userSessions = new Map<string, string>();
const activeMeetingSessions = new Map<
    string,
    { roomId: string; socketId: string }
>();

const DEFAULT_SETTINGS: RoomSettings = {
    allowScreenShare: true,
    allowChat: true,
    allowMic: true,
    allowVideo: true,
    allowReactions: true,
};

function getRoomsList(): Room[] {
    return Array.from(activeRooms.values());
}

function broadcastRoomsUpdate(io: Server) {
    io.emit("rooms-update", getRoomsList());
}

function setBandwidth(
    sdp: string | undefined,
    bitrate: number = 500,
): string | undefined {
    if (!sdp) return sdp;
    return sdp
        .replace(/b=AS:([0-9]+)/g, `b=AS:${bitrate}`)
        .replace(/a=mid:video\r\n/g, `a=mid:video\r\nb=AS:${bitrate}\r\n`);
}

const generateRoomId = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 9; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${result.slice(0, 3)}-${result.slice(3, 6)}-${result.slice(6, 9)}`;
};

export function setupSocketIO(
    io: Server<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
    >,
) {
    const handleUserLeave = (
        userId: string,
        roomId: string,
        socketId: string,
    ) => {
        const currentSession = activeMeetingSessions.get(userId);

        if (
            currentSession &&
            currentSession.roomId === roomId &&
            currentSession.socketId !== socketId
        ) {
            console.log(
                `[SafeGuard] Mengabaikan disconnect dari socket lama (${socketId}) untuk user ${userId}`,
            );
            return;
        }

        const room = activeRooms.get(roomId);
        if (room) {
            room.participants = room.participants.filter((id) => id !== userId);
            if (room.spotlightId === userId) room.spotlightId = null;
            if (room.handStates) delete room.handStates[userId];
            if (room.mediaStates) delete room.mediaStates[userId]; // Cleanup media state
        }

        if (currentSession && currentSession.roomId === roomId) {
            activeMeetingSessions.delete(userId);
        }

        const sessionSocket = userSessions.get(userId);
        if (sessionSocket === socketId) {
            userSessions.delete(userId);
        }
    };

    if (activeRooms.size === 0) {
        activeRooms.set("Main Hall", {
            id: "Main Hall",
            name: "Main Hall",
            participants: [],
            ownerId: "user-1",
            handStates: {},
            mediaStates: {}, // Initialize
            settings: { ...DEFAULT_SETTINGS },
            startTime: Date.now(),
        });
    }

    io.on("connection", (socket) => {
        socket.emit("rooms-update", getRoomsList());

        socket.on("auth-login", (email, pass) => {
            const user = usersDB.find(
                (u) => u.email === email && u.password === pass,
            );
            if (user) {
                const userData: User = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: "participant",
                };
                socket.emit("auth-result", { success: true, user: userData });
            } else {
                socket.emit("auth-result", {
                    success: false,
                    message: "Email atau password salah",
                });
            }
        });

        socket.on("auth-register", (email, pass, name) => {
            const exists = usersDB.find((u) => u.email === email);
            if (exists) {
                socket.emit("auth-result", {
                    success: false,
                    message: "Email sudah terdaftar",
                });
            } else {
                const newUser: DBUser = {
                    id: `user-${Date.now()}`,
                    name,
                    email,
                    password: pass,
                    role: "participant",
                };
                usersDB.push(newUser);
                saveUsers(usersDB);
                const userData: User = { ...newUser };
                delete (userData as any).password;
                socket.emit("auth-result", { success: true, user: userData });
            }
        });

        socket.on("check-session", (userId) => {
            userSessions.set(userId, socket.id);
            socket.data.userId = userId;
            socket.emit("session-check-result", false);
        });

        socket.on("send-reaction", (emoji) => {
            const { roomId, userId } = socket.data;
            if (roomId && userId) {
                // Broadcast ke SEMUA orang di room (kecuali pengirim, karena pengirim update lokal)
                socket.to(roomId).emit("reaction-received", userId, emoji);
            }
        });

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        socket.on("check-host-status", async (roomId) => {
            const room = activeRooms.get(roomId);
            if (!room) {
                socket.emit("host-status-result", false);
                return;
            }

            // Fix: Check for ANY host/co-host/admin, not just owner
            const sockets = await io.in(roomId).fetchSockets();
            const hasHost = sockets.some((s) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const r = (s.data as any).role;
                return r === "host" || r === "co-host" || r === "admin";
            });

            socket.emit("host-status-result", hasHost);
        });

        socket.on(
            "create-room",
            (name, userId, callback, customId, parentRoomId, type) => {
                const roomId = customId || generateRoomId();
                activeRooms.set(roomId, {
                    id: roomId,
                    name,
                    participants: [],
                    ownerId: userId,
                    handStates: {},
                    mediaStates: {}, // Initialize
                    settings: { ...DEFAULT_SETTINGS },
                    startTime: Date.now(),
                    parentRoomId,
                    type: type || "main",
                });
                broadcastRoomsUpdate(io);
                callback(roomId);
            },
        );

        // --- JOIN ROOM ---
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        socket.on(
            "join-room",
            async (
                roomId,
                userId,
                _roleRequest,
                name,
                forceJoin = false,
                initialState,
            ) => {
                const currentSession = activeMeetingSessions.get(userId);
                if (currentSession) {
                    if (!forceJoin) {
                        const roomName =
                            activeRooms.get(currentSession.roomId)?.name ||
                            currentSession.roomId;
                        socket.emit("session-conflict", roomName);
                        return;
                    }

                    const oldSocketId = currentSession.socketId;
                    if (oldSocketId && oldSocketId !== socket.id) {
                        io.to(oldSocketId).emit("force-logout");
                        const oldSocket = io.sockets.sockets.get(oldSocketId);
                        if (oldSocket) {
                            oldSocket.leave(currentSession.roomId);
                            oldSocket.disconnect(true);
                        }
                        handleUserLeave(
                            userId,
                            currentSession.roomId,
                            oldSocketId,
                        );
                    }
                }

                activeMeetingSessions.set(userId, {
                    roomId,
                    socketId: socket.id,
                });
                userSessions.set(userId, socket.id);

                let finalRole = "participant";
                if (activeRooms.has(roomId)) {
                    const room = activeRooms.get(roomId)!;

                    // Priority 1: If user is owner, they are always host
                    if (room.ownerId === userId) {
                        finalRole = "host";
                    }
                    // Priority 2: Respect requested role (Admin/Host/Co-Host) from trusted client
                    else if (
                        _roleRequest === "admin" ||
                        _roleRequest === "host" ||
                        _roleRequest === "co-host"
                    ) {
                        finalRole = _roleRequest;
                    }
                } else {
                    // Create new room
                    finalRole = "host";
                    // If requested role is admin, keep it admin even for new room creation?
                    // Usually creator is host. But if admin creates, maybe they want to be admin?
                    // Let's default creator to host, unless they specifically asked to be admin.
                    if (_roleRequest === "admin") finalRole = "admin";

                    activeRooms.set(roomId, {
                        id: roomId,
                        name: `Meeting ${roomId}`,
                        participants: [],
                        ownerId: userId,
                        handStates: {},
                        mediaStates: {}, // Initialize
                        whiteboardOpen: false,
                        recordingState: { isActive: false },
                        settings: { ...DEFAULT_SETTINGS },
                        startTime: Date.now(),
                    });
                }

                socket.data.userId = userId;
                socket.data.roomId = roomId;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (socket.data as any).role = finalRole;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (socket.data as any).name = name;

                socket.join(roomId);

                const room = activeRooms.get(roomId)!;
                if (!room.participants.includes(userId)) {
                    room.participants.push(userId);
                    if (!room.handStates) room.handStates = {};
                    room.handStates[userId] = false;

                    // SAVE MEDIA STATE
                    if (!room.mediaStates) room.mediaStates = {};
                    if (initialState) {
                        room.mediaStates[userId] = initialState;
                    } else {
                        // Default if not provided (assume on? or off? best to assume on to avoid accidental hiding, or matches stream default)
                        room.mediaStates[userId] = { audio: true, video: true };
                    }
                }

                // Emit initial room state to the joiner
                socket.emit("sync-room-state", {
                    whiteboardOpen: room.whiteboardOpen || false,
                    recordingState: room.recordingState || { isActive: false },
                });

                socket.emit("user-state-updated", {
                    userId,
                    type: "role",
                    value: finalRole,
                });

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                socket
                    .to(roomId)
                    .emit(
                        "user-connected",
                        userId,
                        finalRole,
                        name,
                        room.mediaStates?.[userId],
                    ); // Broadcast with media state

                const socketsInRoom = await io.in(roomId).fetchSockets();
                const existingUsers = socketsInRoom
                    .filter((s) => s.data.userId !== userId && s.data.userId)
                    .map((s) => ({
                        userId: s.data.userId as string,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        name: (s.data as any).name || "Unknown",
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        role: (s.data as any).role || "participant",
                        media: room.mediaStates?.[s.data.userId as string], // Send media state
                    }));

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                socket.emit("existing-participants", existingUsers);

                if (room.spotlightId)
                    socket.emit("spotlight-update", room.spotlightId);
                if (room.handStates) socket.emit("sync-hands", room.handStates);
                socket.emit("room-settings-update", room.settings);

                broadcastRoomsUpdate(io);

                if (room.timer) {
                    socket.emit("timer-update", room.timer);
                }
            },
        );

        // --- ADMIN UPDATE USER (FIX TRANSFER HOST) ---
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        socket.on("admin-update-user", (targetId, type, value) => {
            const { roomId, userId } = socket.data;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const actorRole = (socket.data as any).role;

            if (!roomId || !activeRooms.has(roomId)) return;
            const isPrivileged =
                actorRole === "host" ||
                actorRole === "co-host" ||
                actorRole === "admin";
            if (!isPrivileged) return;

            if (type === "role" && value === "host") {
                if (actorRole !== "host") return;

                // 1. Downgrade Diri Sendiri (Host Lama)
                io.in(roomId).emit("user-state-updated", {
                    userId: userId,
                    type: "role",
                    value: "participant",
                });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (socket.data as any).role = "participant";

                // 2. Upgrade Target (Host Baru)
                io.in(roomId).emit("user-state-updated", {
                    userId: targetId,
                    type: "role",
                    value: "host",
                });

                // --- FIX UTAMA: Update data socket target di Memori Server ---
                // Cari socket ID target dari map session
                const targetSession = activeMeetingSessions.get(targetId);
                if (targetSession) {
                    const targetSocket = io.sockets.sockets.get(
                        targetSession.socketId,
                    );
                    if (targetSocket) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (targetSocket.data as any).role = "host"; // Update Server Memory
                        console.log(
                            `Hak akses Host ditransfer ke socket ${targetSocket.id}`,
                        );
                    }
                }

                // 3. Update Room Owner
                const room = activeRooms.get(roomId);
                if (room) room.ownerId = targetId;

                return;
            }
            if (type === "chat") {
                const room = activeRooms.get(roomId);
                if (room) {
                    if (!room.chatBannedIds) room.chatBannedIds = [];

                    if (value === false) {
                        // false forces ban (Block Chat)
                        if (!room.chatBannedIds.includes(targetId)) {
                            room.chatBannedIds.push(targetId);
                        }
                    } else {
                        // true allows chat
                        room.chatBannedIds = room.chatBannedIds.filter(
                            (id) => id !== targetId,
                        );
                    }
                }
            }

            io.in(roomId).emit("user-state-updated", {
                userId: targetId,
                type,
                value,
            });
        });

        socket.on("update-room-settings", (newSettings) => {
            const { roomId } = socket.data;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const role = (socket.data as any).role;
            if (
                roomId &&
                (role === "host" || role === "co-host" || role === "admin")
            ) {
                const room = activeRooms.get(roomId);
                if (room) {
                    room.settings = newSettings;
                    io.in(roomId).emit("room-settings-update", newSettings);
                }
            }
        });

        socket.on("end-meeting-for-all", () => {
            const { roomId } = socket.data;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const userRole = (socket.data as any).role;

            console.log(`End meeting request from role: ${userRole}`); // Debugging

            if (
                roomId &&
                (userRole === "host" ||
                    userRole === "co-host" ||
                    userRole === "admin")
            ) {
                io.in(roomId).emit("meeting-ended");
                activeRooms.delete(roomId);
                io.in(roomId).disconnectSockets(true);
                broadcastRoomsUpdate(io);
            }
        });

        socket.on("start-timer", (durationInSeconds) => {
            const { roomId } = socket.data;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const role = (socket.data as any).role;

            if (
                roomId &&
                (role === "host" || role === "co-host" || role === "admin")
            ) {
                const room = activeRooms.get(roomId);
                if (room) {
                    const endTime = Date.now() + durationInSeconds * 1000;
                    room.timer = {
                        endTime,
                        duration: durationInSeconds,
                        isRunning: true,
                    };
                    // Broadcast ke semua user di room tersebut
                    io.in(roomId).emit("timer-update", room.timer);
                }
            }
        });

        socket.on("stop-timer", () => {
            const { roomId } = socket.data;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const role = (socket.data as any).role;

            if (
                roomId &&
                (role === "host" || role === "co-host" || role === "admin")
            ) {
                const room = activeRooms.get(roomId);
                if (room) {
                    room.timer = undefined; // Hapus timer
                    io.in(roomId).emit("timer-update", null);
                }
            }
        });

        socket.on("pause-timer", () => {
            const { roomId } = socket.data;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const role = (socket.data as any).role;

            if (
                roomId &&
                (role === "host" || role === "co-host" || role === "admin")
            ) {
                const room = activeRooms.get(roomId);
                if (room && room.timer && room.timer.isRunning) {
                    const now = Date.now();
                    const remaining = Math.max(0, room.timer.endTime - now);

                    room.timer.isRunning = false;
                    room.timer.isPaused = true;
                    room.timer.remainingTime = remaining;

                    io.in(roomId).emit("timer-update", room.timer);
                }
            }
        });

        socket.on("resume-timer", () => {
            const { roomId } = socket.data;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const role = (socket.data as any).role;

            if (
                roomId &&
                (role === "host" || role === "co-host" || role === "admin")
            ) {
                const room = activeRooms.get(roomId);
                if (
                    room &&
                    room.timer &&
                    room.timer.isPaused &&
                    room.timer.remainingTime !== undefined
                ) {
                    const now = Date.now();
                    const newEndTime = now + room.timer.remainingTime;

                    room.timer.isRunning = true;
                    room.timer.isPaused = false;
                    room.timer.endTime = newEndTime;
                    room.timer.remainingTime = undefined;

                    io.in(roomId).emit("timer-update", room.timer);
                }
            }
        });

        socket.on("offer", async (offer, toUserId) => {
            const room = socket.data.roomId;
            if (room) {
                if (offer.sdp) offer.sdp = setBandwidth(offer.sdp, 500);
                const sockets = await io.in(room).fetchSockets();
                const targetSocket = sockets.find(
                    (s) => s.data.userId === toUserId,
                );
                if (targetSocket && socket.data.userId)
                    targetSocket.emit("offer", offer, socket.data.userId);
            }
        });

        socket.on("answer", async (answer, toUserId) => {
            const room = socket.data.roomId;
            if (room) {
                if (answer.sdp) answer.sdp = setBandwidth(answer.sdp, 500);
                const sockets = await io.in(room).fetchSockets();
                const targetSocket = sockets.find(
                    (s) => s.data.userId === toUserId,
                );
                if (targetSocket && socket.data.userId)
                    targetSocket.emit("answer", answer, socket.data.userId);
            }
        });

        socket.on("ice-candidate", async (candidate, toUserId) => {
            const room = socket.data.roomId;
            if (room) {
                const sockets = await io.in(room).fetchSockets();
                const targetSocket = sockets.find(
                    (s) => s.data.userId === toUserId,
                );
                if (targetSocket && socket.data.userId)
                    targetSocket.emit(
                        "ice-candidate",
                        candidate,
                        socket.data.userId,
                    );
            }
        });

        socket.on("toggle-media", (kind, enabled) => {
            const roomName = socket.data.roomId;
            const userId = socket.data.userId;
            if (roomName && userId) {
                // UPDATE SERVER STATE
                const room = activeRooms.get(roomName);
                if (room) {
                    if (!room.mediaStates) room.mediaStates = {};
                    if (!room.mediaStates[userId])
                        room.mediaStates[userId] = { audio: true, video: true };

                    room.mediaStates[userId][kind] = enabled;
                }

                socket.to(roomName).emit("toggle-media", userId, kind, enabled);
            }
        });

        socket.on("set-spotlight", (targetUserId) => {
            const { roomId } = socket.data;
            if (roomId) {
                const room = activeRooms.get(roomId);
                if (room) {
                    room.spotlightId = targetUserId;
                    io.in(roomId).emit("spotlight-update", targetUserId);
                }
            }
        });

        socket.on("toggle-hand", (isRaised) => {
            const { roomId, userId } = socket.data;
            if (roomId && userId) {
                const room = activeRooms.get(roomId);
                if (room) {
                    if (!room.handStates) room.handStates = {};
                    room.handStates[userId] = isRaised;
                    io.in(roomId).emit("hand-update", userId, isRaised);
                }
            }
        });

        // --- NEW EVENTS ---
        socket.on("toggle-whiteboard", (isOpen) => {
            const roomName = socket.data.roomId;
            if (roomName) {
                const room = activeRooms.get(roomName);
                if (room) {
                    room.whiteboardOpen = isOpen;
                    io.to(roomName).emit("whiteboard-updated", isOpen);
                }
            }
        });

        socket.on("set-recording-state", (isActive) => {
            const roomName = socket.data.roomId;
            const userId = socket.data.userId;
            if (roomName && userId) {
                const room = activeRooms.get(roomName);
                if (room) {
                    room.recordingState = {
                        isActive,
                        startedBy: isActive ? userId : undefined,
                        startTime: isActive ? Date.now() : undefined,
                    };
                    io.to(roomName).emit(
                        "recording-state-updated",
                        room.recordingState,
                    );
                }
            }
        });

        socket.on("disconnect", () => {
            const { roomId, userId } = socket.data;
            if (userId) {
                if (roomId) {
                    const room = activeRooms.get(roomId);
                    const wasSpotlight = room?.spotlightId === userId;
                    socket.to(roomId).emit("user-disconnected", userId);
                    if (wasSpotlight)
                        socket.to(roomId).emit("spotlight-update", null);
                    handleUserLeave(userId, roomId, socket.id);
                }
                broadcastRoomsUpdate(io);
            }
        });

        // --- CHAT HANDLERS ---
        socket.on("send-chat-message", (message) => {
            const { roomId, userId } = socket.data;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const role = (socket.data as any).role;

            if (roomId) {
                const room = activeRooms.get(roomId);
                if (!room) return;

                // PERMISSION CHECK
                const isHost =
                    role === "host" || role === "co-host" || role === "admin";
                const globalChatAllowed = room.settings.allowChat;
                const isBanned = room.chatBannedIds?.includes(userId);

                if (!isHost) {
                    if (!globalChatAllowed) {
                        console.log(
                            `[Chat] Rejected message from ${userId} (Global Chat Disabled)`,
                        );
                        return;
                    }
                    if (isBanned) {
                        console.log(
                            `[Chat] Rejected message from ${userId} (User Banned)`,
                        );
                        return;
                    }
                }

                // Broadcast ke semua orang di room TERMASUK pengirim
                io.in(roomId).emit("chat-message-received", message);
            }
        });

        socket.on("edit-chat-message", (message) => {
            const { roomId } = socket.data;
            if (roomId) {
                // Broadcast update
                io.in(roomId).emit("chat-message-updated", message);
            }
        });
    });
}
