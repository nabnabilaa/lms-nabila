import { X, Shield, Unlock, MessageSquare, MonitorUp, Mic, Video } from 'lucide-react';
import type { RoomSettings } from '../types';

interface HostControlsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: RoomSettings;
    onUpdateSettings: (newSettings: RoomSettings) => void;
}

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
        onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-indigo-600' : 'bg-slate-600'}`}
    >
        <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

export const HostControlsModal = ({ isOpen, onClose, settings, onUpdateSettings }: HostControlsModalProps) => {

    if (!isOpen) return null;

    const toggle = (key: keyof RoomSettings) => {
        onUpdateSettings({
            ...settings,
            [key]: !settings[key]
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-slate-900 border border-white/10 text-white w-96 max-w-[95vw] rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-800/50">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Shield size={20} className="text-indigo-400" />
                        Kontrol Penyelenggara
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="text-sm text-slate-400 mb-4">
                        Gunakan setelan ini untuk mengontrol rapat Anda. Hanya penyelenggara (Host & Co-host) yang memiliki akses.
                    </div>

                    <div className="space-y-5">
                        <div className="flex items-center gap-3 pb-2 border-b border-white/5">
                            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                                <Unlock size={18} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-bold">Izin Peserta</h3>
                                <p className="text-[10px] text-slate-500">Atur apa yang bisa dilakukan peserta.</p>
                            </div>
                        </div>

                        {/* Screen Share */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <MonitorUp size={18} className="text-slate-400" />
                                <span className="text-sm font-medium">Bagikan layar</span>
                            </div>
                            <ToggleSwitch checked={settings.allowScreenShare} onChange={() => toggle('allowScreenShare')} />
                        </div>

                        {/* Chat */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <MessageSquare size={18} className="text-slate-400" />
                                <span className="text-sm font-medium">Kirim pesan chat</span>
                            </div>
                            <ToggleSwitch checked={settings.allowChat} onChange={() => toggle('allowChat')} />
                        </div>

                        {/* Mic */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Mic size={18} className="text-slate-400" />
                                <span className="text-sm font-medium">Aktifkan mikrofon</span>
                            </div>
                            <ToggleSwitch checked={settings.allowMic} onChange={() => toggle('allowMic')} />
                        </div>

                        {/* Video */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Video size={18} className="text-slate-400" />
                                <span className="text-sm font-medium">Aktifkan video</span>
                            </div>
                            <ToggleSwitch checked={settings.allowVideo} onChange={() => toggle('allowVideo')} />
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};