import { Mic, MicOff, Video, VideoOff, Shield, UserCircle2 } from 'lucide-react';
import type { PeerState } from '../../hooks/useWebRTC';

interface ParticipantListProps {
    participants: [string, PeerState][];
    localName: string;
    localRole: string; // Terima Role Lokal
    onClose: () => void;
}

// Helper untuk Badge Role
const RoleBadge = ({ role }: { role?: string }) => {
    if (role === 'host') {
        return (
            <span className="flex items-center gap-1 bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-indigo-500/30">
                <Shield size={10} /> Host
            </span>
        );
    }
    if (role === 'co-host') {
        return (
            <span className="flex items-center gap-1 bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-500/30">
                <UserCircle2 size={10} /> Co-Host
            </span>
        );
    }
    return <span className="text-[10px] text-slate-500">Peserta</span>;
};

import { SidePanel } from '../ui/SidePanel';

// ... (RoleBadge and interface remain)

export const ParticipantListPanel = ({ participants, localName, localRole, onClose }: ParticipantListProps) => {

    // Urutkan: Host paling atas, lalu Co-host, lalu sisanya
    const sortedParticipants = [...participants].sort(([, a], [, b]) => {
        const roleOrder = { 'host': 3, 'co-host': 2, 'participant': 1 };
        const scoreA = roleOrder[a.role as keyof typeof roleOrder] || 0;
        const scoreB = roleOrder[b.role as keyof typeof roleOrder] || 0;
        return scoreB - scoreA;
    });

    return (
        <SidePanel
            title={`Peserta (${participants.length + 1})`}
            onClose={onClose}
            width="w-80"
        >
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {/* 1. LOCAL USER (ANDA) */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-lg">
                            {localName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white flex items-center gap-2">
                                {localName} <span className="text-slate-400 font-normal text-xs">(Anda)</span>
                            </span>
                            <div className="flex mt-0.5">
                                <RoleBadge role={localRole} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. REMOTE USERS */}
                {sortedParticipants.map(([id, state]) => (
                    <div key={id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 border border-white/5">
                                {(state.name || id).charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-200">
                                    {state.name || id}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <RoleBadge role={state.role} />
                                    {/* Status Video/Audio Text */}
                                    <span className="text-[10px] text-slate-600 group-hover:text-slate-500 transition-colors">
                                        • {!state.videoEnabled ? 'Kamera Mati' : 'Online'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 text-slate-500">
                            {state.audioEnabled ? <Mic size={14} className="text-green-500" /> : <MicOff size={14} className="text-red-500/50" />}
                            {state.videoEnabled ? <Video size={14} className="text-green-500" /> : <VideoOff size={14} className="text-red-500/50" />}
                        </div>
                    </div>
                ))}
            </div>
        </SidePanel>
    );
};
