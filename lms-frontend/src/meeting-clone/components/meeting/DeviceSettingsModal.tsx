import React, { useEffect, useState } from 'react';
import { 
    Camera, Mic, Settings, Speaker, XCircle, Sun,  
    Lock, Unlock, RotateCcw, MonitorCheck, AlertCircle, CheckCircle2 // Import Icon Check
} from 'lucide-react';

interface DeviceSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    currentStream: MediaStream | null;
    onDeviceChange: (type: 'audioinput' | 'videoinput', deviceId: string) => void;
    onOutputChange: (deviceId: string) => void;
    onResolutionChange: (height: number) => void;
    // HANYA BRIGHTNESS
    onSettingChange: (setting: 'brightness', value: number) => void;
    onFactoryReset: () => void;
}

interface RangeCapability {
    min: number;
    max: number;
    step: number;
}

const RESOLUTION_PRESETS = [
    { label: 'SD (360p)', width: 640, height: 360 },
    { label: 'HD (720p)', width: 1280, height: 720 },
    { label: 'FHD (1080p)', width: 1920, height: 1080 },
    { label: '2K (1440p)', width: 2560, height: 1440 },
    { label: '4K (2160p)', width: 3840, height: 2160 }
];

export const DeviceSettingsModal = ({ 
    isOpen, onClose, currentStream, 
    onDeviceChange, onOutputChange, onResolutionChange, onSettingChange, onFactoryReset
}: DeviceSettingsProps) => {
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedCam, setSelectedCam] = useState('');
    const [selectedMic, setSelectedMic] = useState('');
    const [selectedSpeaker, setSelectedSpeaker] = useState('');
    
    const [activeTab, setActiveTab] = useState<'video' | 'audio'>('video');
    const [currentHeight, setCurrentHeight] = useState(720);

    const [supportedResolutions, setSupportedResolutions] = useState<typeof RESOLUTION_PRESETS>([]);
    const [maxHardwareRes, setMaxHardwareRes] = useState<string>('');

    const [isManualMode, setIsManualMode] = useState(false);
    
    // HANYA BRIGHTNESS
    const [brightnessCap, setBrightnessCap] = useState<RangeCapability | null>(null);
    const [brightnessVal, setBrightnessVal] = useState<number>(0);

    // Helper: Baca Capability Kamera
    const refreshSettingsFromTrack = (track: MediaStreamTrack) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const settings = track.getSettings() as any;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const capabilities = track.getCapabilities ? track.getCapabilities() as any : {};

            // Ambil nilai Brightness
            if (capabilities.brightness) {
                setBrightnessCap(capabilities.brightness);
                setBrightnessVal(settings.brightness ?? capabilities.brightness.min);
            } else {
                setBrightnessCap(null);
            }

            // Cek Mode Manual (Apakah ada constraint advanced yang aktif?)
            const constraints = track.getConstraints();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const advanced = (constraints as any).advanced;
            
            // Jika ada setting manual brightness, anggap Manual Mode
            if (advanced && advanced.length > 0 && advanced[0].brightness !== undefined) {
                setIsManualMode(true);
            } else {
                setIsManualMode(false);
            }

        } catch (e) {
            console.error("Gagal membaca setting kamera:", e);
        }
    };

    useEffect(() => {
        if (isOpen) {
            navigator.mediaDevices.enumerateDevices().then(devs => setDevices(devs));
            
            const videoTrack = currentStream?.getVideoTracks()[0];
            const audioTrack = currentStream?.getAudioTracks()[0];
            
            if (videoTrack) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const settings = videoTrack.getSettings() as any;
                const newCamId = settings.deviceId || '';

                if (newCamId !== selectedCam) {
                    setSelectedCam(newCamId);
                }
                
                // Hardware Caps
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() as any : {};
                
                // Jika browser tidak support getCapabilities (misal Firefox), default max ke 1080p
                const maxHeight = capabilities.height?.max || 1080; 
                const maxWidth = capabilities.width?.max || 1920;

                const validPresets = RESOLUTION_PRESETS.filter(preset => 
                    preset.height <= maxHeight && preset.width <= maxWidth
                );
                
                setSupportedResolutions(validPresets);
                setMaxHardwareRes(`${maxWidth}x${maxHeight}`);
                
                // Deteksi Resolusi Nyata (Real-time)
                if (settings.height) setCurrentHeight(settings.height);

                refreshSettingsFromTrack(videoTrack);
            }
            
            if (audioTrack) {
                const newMicId = audioTrack.getSettings().deviceId || '';
                if (newMicId !== selectedMic) setSelectedMic(newMicId);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, currentStream]); 

    const handleModeToggle = async () => {
        const targetModeIsManual = !isManualMode;
        setIsManualMode(targetModeIsManual);
        
        if (!targetModeIsManual) {
            // JIKA PINDAH KE OTOMATIS -> Lakukan Hard Reset
            onFactoryReset();
            
            // Refresh UI setelah kamera restart (tunggu 1 detik)
            setTimeout(() => {
                if (currentStream && currentStream.active) {
                    const track = currentStream.getVideoTracks()[0];
                    if (track) refreshSettingsFromTrack(track);
                }
            }, 1000);
        }
    };

    const handleBrightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isManualMode) return;
        const val = parseFloat(e.target.value);
        setBrightnessVal(val);
        onSettingChange('brightness', val);
    };

    const handleResClick = (height: number) => {
        setCurrentHeight(height);
        onResolutionChange(height);
    };

    const handleCamChange = (e: React.ChangeEvent<HTMLSelectElement>) => { setSelectedCam(e.target.value); onDeviceChange('videoinput', e.target.value); };
    const handleMicChange = (e: React.ChangeEvent<HTMLSelectElement>) => { setSelectedMic(e.target.value); onDeviceChange('audioinput', e.target.value); };
    const handleSpeakerChange = (e: React.ChangeEvent<HTMLSelectElement>) => { setSelectedSpeaker(e.target.value); onOutputChange(e.target.value); };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Settings size={20} className="text-indigo-400" /> Pengaturan Perangkat
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors"><XCircle size={20} className="text-slate-400" /></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    <button onClick={() => setActiveTab('video')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'video' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-white/5' : 'text-slate-400 hover:text-white'}`}>Video & Kamera</button>
                    <button onClick={() => setActiveTab('audio')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'audio' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-white/5' : 'text-slate-400 hover:text-white'}`}>Audio</button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6 scrollbar-hide">
                    {activeTab === 'video' && (
                        <>
                            {/* CAMERA SELECTOR */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kamera</label>
                                <div className="relative">
                                    <Camera size={16} className="absolute left-3 top-3 text-slate-500" />
                                    <select value={selectedCam} onChange={handleCamChange} className="w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors appearance-none">
                                        {devices.filter(d => d.kind === 'videoinput').map(d => (
                                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0,5)}...`}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <MonitorCheck size={12} className="text-green-500"/>
                                    <span className="text-[10px] text-slate-500">Max Hardware Support: <span className="text-slate-300 font-mono">{maxHardwareRes || 'Detecting...'}</span></span>
                                </div>
                            </div>

                            {/* RESOLUTION SELECTOR (UPDATED UI) */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kualitas Video (Resolusi)</label>
                                {supportedResolutions.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {supportedResolutions.map(res => {
                                            // Cek Active State (Toleransi 5px)
                                            const isActive = Math.abs(currentHeight - res.height) < 5;
                                            
                                            return (
                                                <button 
                                                    key={res.label} 
                                                    onClick={() => handleResClick(res.height)} 
                                                    className={`
                                                        relative py-3 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-between group
                                                        ${isActive 
                                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/20' 
                                                            : 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-700 hover:text-slate-200 hover:border-slate-600'}
                                                    `}
                                                >
                                                    <div className="flex flex-col items-start">
                                                        <span className="text-sm">{res.label}</span>
                                                        <span className={`text-[10px] font-normal ${isActive ? 'text-indigo-200' : 'text-slate-500'}`}>
                                                            {res.width}x{res.height}
                                                        </span>
                                                    </div>
                                                    
                                                    {isActive && <CheckCircle2 size={16} className="text-white animate-in zoom-in duration-300"/>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-3 border border-dashed border-slate-700 rounded-xl text-center">
                                        <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
                                            <AlertCircle size={14} /> Resolusi tidak tersedia.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="h-px bg-white/10 my-4"></div>

                            {/* MODE TOGGLE */}
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/10 flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isManualMode ? 'bg-indigo-500 text-white' : 'bg-green-500 text-white'}`}>
                                        {isManualMode ? <Unlock size={18}/> : <Lock size={18}/>}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">
                                            {isManualMode ? "Mode Kustom" : "Mode Otomatis"}
                                        </h4>
                                        <p className="text-[10px] text-slate-400">
                                            {isManualMode ? "Atur kecerahan manual" : "Reset ulang kamera (Force Restart)"}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleModeToggle}
                                    className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isManualMode ? 'bg-indigo-600' : 'bg-green-600'}`}
                                >
                                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${isManualMode ? 'translate-x-6' : ''}`} />
                                </button>
                            </div>

                            {/* Tombol Hard Reset */}
                            <button 
                                onClick={onFactoryReset}
                                className="w-full mb-4 py-2 text-xs font-semibold text-slate-500 hover:text-white hover:bg-white/5 rounded-lg flex items-center justify-center gap-2 border border-transparent hover:border-white/10 transition-all"
                            >
                                <RotateCcw size={12} /> Restart Camera & Reset Settings
                            </button>

                            {/* BRIGHTNESS SLIDER ONLY */}
                            {brightnessCap ? (
                                <div className={`space-y-2 pt-2 transition-opacity duration-300 ${!isManualMode ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <Sun size={14} className="text-yellow-400"/> Brightness
                                        </label>
                                    </div>
                                    <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5 space-y-2">
                                        <div className="flex justify-between text-xs text-slate-400">
                                            <span>{brightnessCap.min}</span>
                                            <span className="text-white font-mono">{brightnessVal.toFixed(0)}</span>
                                            <span>{brightnessCap.max}</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min={brightnessCap.min} 
                                            max={brightnessCap.max} 
                                            step={brightnessCap.step} 
                                            value={brightnessVal} 
                                            onChange={handleBrightnessChange}
                                            disabled={!isManualMode}
                                            className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-yellow-500"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center p-4 text-xs text-slate-500 italic">
                                    Pengaturan kecerahan tidak didukung oleh kamera ini.
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'audio' && (
                        <>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Microphone (Input)</label>
                                <div className="relative">
                                    <Mic size={16} className="absolute left-3 top-3 text-slate-500" />
                                    <select value={selectedMic} onChange={handleMicChange} className="w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors appearance-none">
                                        {devices.filter(d => d.kind === 'audioinput').map(d => (
                                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0,5)}...`}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Speaker (Output)</label>
                                <div className="relative">
                                    <Speaker size={16} className="absolute left-3 top-3 text-slate-500" />
                                    <select value={selectedSpeaker} onChange={handleSpeakerChange} className="w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors appearance-none">
                                        <option value="">Default System Output</option>
                                        {devices.filter(d => d.kind === 'audiooutput').map(d => (
                                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker ${d.deviceId.slice(0,5)}...`}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                
                <div className="p-4 border-t border-white/10 bg-slate-800/50 flex justify-end">
                    <button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors">
                        Selesai
                    </button>
                </div>
            </div>
        </div>
    );
};