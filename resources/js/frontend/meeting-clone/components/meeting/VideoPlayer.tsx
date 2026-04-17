import { useEffect, useRef, useState } from 'react';
import { useAudioLevel } from '../../hooks/useAudioLevel';
import {
    MicOff, MoreHorizontal, Pin, PinOff, Star, Hand, Shield, UserCircle2,
    Mic, Video, VideoOff, Award, UserMinus, ArrowRightCircle
} from 'lucide-react';

export interface VideoPlayerProps {
    stream?: MediaStream;
    muted?: boolean;
    label: string;
    role?: string;
    videoEnabled?: boolean;
    audioEnabled?: boolean;
    mirror?: boolean;
    isLocal?: boolean;
    isScreen?: boolean;
    isSpotlighted?: boolean;
    isHandRaised?: boolean;
    onToggleSpotlight?: () => void;
    audioOutputId?: string;
    reactions?: { id: number; emoji: string; senderName: string }[];

    targetId?: string;
    currentUserRole?: string;
    onAdminAction?: (targetId: string, type: 'audio' | 'video' | 'role' | 'chat', value: boolean | string) => void;
    reaction?: string;
    isChatBanned?: boolean;
}

export const VideoPlayer = ({
    stream, muted = false, label, role,
    videoEnabled = true, audioEnabled = true,
    mirror = false, isLocal = false, isScreen = false,
    isSpotlighted = false, isHandRaised = false,
    onToggleSpotlight, audioOutputId, reactions,
    targetId, currentUserRole, onAdminAction, reaction,
    isChatBanned
}: VideoPlayerProps) => {

    const videoRef = useRef<HTMLVideoElement>(null);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // --- LOGIKA AUDIO VISUALIZER ---
    const hasAudioTracks = (stream?.getAudioTracks().length ?? 0) > 0;
    const volume = useAudioLevel(stream, hasAudioTracks);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (videoRef.current && stream) videoRef.current.srcObject = stream;
    }, [stream]);

    useEffect(() => {
        if (videoRef.current && audioOutputId) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const videoEl = videoRef.current as any;
            if (typeof videoEl.setSinkId === 'function') {
                videoEl.setSinkId(audioOutputId).catch(console.error);
            }
        }
    }, [audioOutputId]);

    const isActiveSpeaker = !isLocal && audioEnabled && volume.some(v => v > 10);

    const isAdmin = currentUserRole === 'host' || currentUserRole === 'co-host';
    const canManage = isAdmin && !isLocal && targetId;
    const isTargetHost = role === 'host';
    const isTargetCoHost = role === 'co-host';
    const canModifyTarget = currentUserRole === 'host' || (currentUserRole === 'co-host' && !isTargetHost && !isTargetCoHost);

    // --- PERBAIKAN: Handle jika name undefined/null ---
    const safeLabel = label || "Peserta"; // Default string jika kosong

    const getInitials = (name: string) => {
        if (!name) return "?";
        return name.substring(0, 2).toUpperCase();
    };

    const getRandomColor = (name: string) => {
        if (!name) return 'bg-gray-500'; // Warna default
        const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div className={`
            relative w-full h-full bg-zinc-900 rounded-2xl transition-all duration-300 group
            border border-white/5 shadow-lg
            ${isActiveSpeaker && !isSpotlighted ? 'ring-2 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : ''}
            ${isSpotlighted ? 'ring-4 ring-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.4)] scale-[1.01]' : 'hover:scale-[1.01] hover:shadow-2xl'}
            ${showMenu ? 'z-50' : 'z-0'} 
        `}>

            <div className="absolute inset-0 rounded-2xl overflow-hidden isolate z-0">
                {stream && (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted={muted}
                        style={{
                            transform: mirror ? 'scaleX(-1)' : 'none',
                            objectFit: isScreen ? 'contain' : 'cover'
                        }}
                        className={`absolute inset-0 w-full h-full transition-opacity duration-500 ease-in-out ${videoEnabled || isScreen ? 'opacity-100' : 'opacity-0'}`}
                    />
                )}

                {/* Reactions UI */}
                {reaction && (
                    <div className="absolute top-4 left-4 z-40 animate-bounce pointer-events-none">
                        <span className="text-4xl filter drop-shadow-lg shadow-black">{reaction}</span>
                    </div>
                )}
                <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
                    {reactions?.map((r) => (
                        <div
                            key={r.id}
                            className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none"
                            style={{
                                marginLeft: `${(r as any).position || 0}px`,
                                transform: `rotate(${(r as any).rotation || 0}deg)`
                            }}
                        >
                            <div className="flex flex-col items-center animate-bounce-up" style={{ animationDuration: '2s' }}>
                                <span className="text-4xl filter drop-shadow-lg">{r.emoji}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Fallback Avatar */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center bg-zinc-800/50 backdrop-blur-sm transition-opacity duration-500 ${videoEnabled || isScreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    {/* Gunakan safeLabel di sini */}
                    <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center shadow-2xl ${getRandomColor(safeLabel)} bg-opacity-90`}>
                        <span className="text-3xl sm:text-5xl font-bold text-white shadow-black drop-shadow-md select-none">{getInitials(safeLabel)}</span>
                    </div>
                    <div className="mt-4 text-white font-medium opacity-50 text-sm animate-pulse">Kamera Mati</div>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-60 pointer-events-none"></div>

                {/* Status Icons */}
                <div className="absolute top-3 left-3 z-30 flex flex-wrap gap-2 items-start pointer-events-none">
                    {role === 'host' && <div className="flex items-center gap-1 bg-indigo-600/90 backdrop-blur-md text-white px-2 py-1 rounded-md shadow-lg border border-white/10"><Shield size={10} fill="currentColor" /> <span className="text-[10px] font-bold uppercase tracking-wider">Host</span></div>}
                    {role === 'co-host' && <div className="flex items-center gap-1 bg-blue-600/90 backdrop-blur-md text-white px-2 py-1 rounded-md shadow-lg border border-white/10"><UserCircle2 size={10} /> <span className="text-[10px] font-bold uppercase tracking-wider">Co-Host</span></div>}
                    {isHandRaised && <div className="flex items-center gap-1 bg-yellow-500 text-black px-2 py-1 rounded-md shadow-lg animate-bounce"><Hand size={10} /> <span className="text-[10px] font-bold uppercase tracking-wider">Bertanya</span></div>}
                    {isSpotlighted && <div className="flex items-center gap-1 bg-amber-500 text-white px-2 py-1 rounded-md shadow-lg"><Star size={10} fill="currentColor" /> <span className="text-[10px] font-bold uppercase tracking-wider">Sorotan</span></div>}
                </div>

                {/* Name Tag & Audio Bar */}
                <div className="absolute bottom-3 left-3 right-16 flex flex-col items-start gap-1 z-20 pointer-events-none">
                    <div className="flex items-center gap-2 max-w-full">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 shadow-lg backdrop-blur-md transition-colors ${!audioEnabled ? 'bg-red-500/20 border-red-500/30' : 'bg-black/40'}`}>
                            {!audioEnabled ? (
                                <MicOff size={14} className="text-red-400" />
                            ) : (
                                <div className="flex gap-0.5 items-end justify-center h-3 w-4">
                                    <div className="w-1 bg-emerald-400 rounded-full" style={{ height: `${Math.max(20, volume[0])}%` }}></div>
                                    <div className="w-1 bg-emerald-400 rounded-full" style={{ height: `${Math.max(20, volume[1])}%` }}></div>
                                    <div className="w-1 bg-emerald-400 rounded-full" style={{ height: `${Math.max(20, volume[2])}%` }}></div>
                                </div>
                            )}
                            <span className="text-xs font-semibold text-white tracking-wide truncate shadow-black drop-shadow-sm">
                                {safeLabel} {isLocal && <span className="text-white/50 font-normal">(Anda)</span>}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Menu Dropdown */}
            <div className={`absolute top-3 right-3 flex gap-2 z-50 transition-opacity duration-200 ${showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'}`}>
                {onToggleSpotlight && (isAdmin || isLocal) && (
                    <button onClick={(e) => { e.stopPropagation(); onToggleSpotlight(); }} className={`p-2 rounded-full backdrop-blur-md border transition-all hover:scale-110 ${isSpotlighted ? 'bg-amber-500 text-white border-amber-400' : 'bg-black/40 hover:bg-black/70 text-white border-white/10'}`} title={isSpotlighted ? "Lepas Sorotan" : "Sorot Peserta"}>
                        {isSpotlighted ? <PinOff size={14} /> : <Pin size={14} />}
                    </button>
                )}
                {isAdmin && (
                    <div className="relative" ref={menuRef}>
                        <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className={`p-2 rounded-full backdrop-blur-md border border-white/10 transition-all hover:scale-110 ${showMenu ? 'bg-indigo-600 text-white' : 'bg-black/40 hover:bg-black/70 text-white'}`}>
                            <MoreHorizontal size={14} />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5 z-[60]">
                                <div className="px-3 py-2 bg-zinc-800/50 border-b border-white/5 mb-1"><p className="text-[10px] uppercase font-bold text-zinc-500">Tindakan untuk</p><p className="text-sm font-semibold text-white truncate">{safeLabel}</p></div>
                                <button onClick={() => { onToggleSpotlight?.(); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/10 hover:text-white flex items-center gap-3 transition-colors"><Pin size={14} className="text-amber-400" /> {isSpotlighted ? 'Hapus Sorotan' : 'Sorot untuk semua'}</button>
                                {canManage && canModifyTarget && onAdminAction && targetId && (
                                    <>
                                        <div className="h-px bg-white/10 my-1 mx-3"></div>
                                        <button onClick={() => { onAdminAction(targetId, 'audio', !audioEnabled); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/10 hover:text-white flex items-center gap-3 transition-colors">{audioEnabled ? <MicOff size={14} className="text-red-400" /> : <Mic size={14} className="text-emerald-400" />} {audioEnabled ? 'Matikan Mic' : 'Minta Unmute'}</button>
                                        <button onClick={() => { onAdminAction(targetId, 'video', !videoEnabled); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/10 hover:text-white flex items-center gap-3 transition-colors">{videoEnabled ? <VideoOff size={14} className="text-red-400" /> : <Video size={14} className="text-emerald-400" />} {videoEnabled ? 'Matikan Kamera' : 'Minta Kamera'}</button>
                                        {currentUserRole === 'host' && (
                                            <>
                                                <div className="h-px bg-white/10 my-1 mx-3"></div>
                                                <button onClick={() => { onAdminAction(targetId, 'role', role === 'co-host' ? 'participant' : 'co-host'); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/10 hover:text-white flex items-center gap-3 transition-colors">{role === 'co-host' ? <UserMinus size={14} /> : <Award size={14} className="text-blue-400" />} {role === 'co-host' ? 'Hapus Co-Host' : 'Jadikan Co-Host'}</button>
                                                <button onClick={() => { onAdminAction(targetId, 'role', 'host'); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors"><ArrowRightCircle size={14} /> Transfer Host</button>
                                                <div className="h-px bg-white/10 my-1 mx-3"></div>
                                                <button onClick={() => { const isBanned = (reactions as any)?.isChatBanned; onAdminAction(targetId, 'chat', !!isBanned); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/10 hover:text-white flex items-center gap-3 transition-colors">
                                                    <Shield size={14} className={(reactions as any)?.isChatBanned ? "text-emerald-400" : "text-amber-400"} />
                                                    {(reactions as any)?.isChatBanned ? 'Izinkan Chat' : 'Blokir Chat'}
                                                </button>
                                            </>
                                        )}
                                        <div className="h-px bg-white/10 my-1 mx-3"></div>
                                        <button onClick={() => { onAdminAction(targetId, 'chat', !!isChatBanned); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/10 hover:text-white flex items-center gap-3 transition-colors">
                                            <Shield size={14} className={isChatBanned ? "text-emerald-400" : "text-amber-400"} />
                                            {isChatBanned ? 'Izinkan Chat' : 'Blokir Chat'}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};