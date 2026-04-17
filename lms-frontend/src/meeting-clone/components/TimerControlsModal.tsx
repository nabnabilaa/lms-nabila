import { useState, useEffect } from 'react';
import { X, Play, Square, Timer, Pause, History } from 'lucide-react';
import type { MeetingTimer } from '../types';

interface TimerControlsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStartTimer: (seconds: number) => void;
    onStopTimer: () => void;
    onPauseTimer: () => void;
    onResumeTimer: () => void;
    currentTimer: MeetingTimer | null;
}

export const TimerControlsModal = ({ isOpen, onClose, onStartTimer, onStopTimer, onPauseTimer, onResumeTimer, currentTimer }: TimerControlsModalProps) => {
    const [timerInput, setTimerInput] = useState("10");
    const [displayTime, setDisplayTime] = useState("--:--");
    const [progress, setProgress] = useState(0);

    // Effect to update the display time and progress for the modal UI
    useEffect(() => {
        if (!currentTimer || (!currentTimer.isRunning && !currentTimer.isPaused)) {
            setDisplayTime("--:--");
            setProgress(0);
            return;
        }

        const updateDisplay = () => {
            const now = Date.now();
            let remaining = 0;
            const totalDuration = currentTimer.duration * 1000;

            if (currentTimer.isPaused && currentTimer.remainingTime) {
                remaining = currentTimer.remainingTime;
            } else if (currentTimer.isRunning) {
                remaining = Math.max(0, currentTimer.endTime - now);
            }

            // Format MM:SS
            const totalSeconds = Math.ceil(remaining / 1000);
            const mins = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            setDisplayTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);

            // Calculate progress for circle (0 to 100)
            // 100% means full time remaining, 0% means finished
            const prog = Math.min(100, Math.max(0, (remaining / totalDuration) * 100));
            setProgress(prog);
        };

        updateDisplay();
        const interval = setInterval(updateDisplay, 200); // 5fps update for smoothness

        return () => clearInterval(interval);
    }, [currentTimer]);

    if (!isOpen) return null;

    const handleStartTimer = () => {
        const minutes = parseInt(timerInput);
        if (minutes > 0) {
            onStartTimer(minutes * 60);
        }
    };

    const presetDurations = [5, 10, 15, 30, 60];

    // SVG parameters for progress circle
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    // Stroke Dash Offset: Full circle (circumference) when progress is 0, 0 when progress is 100
    // Actually, usually we want it to decrease. Let's say stick starts full.
    // Length of stroke = (progress / 100) * circumference
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-slate-900 border border-white/10 text-white w-96 max-w-[95vw] rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-800/50">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Timer size={20} className="text-indigo-400" />
                        Kontrol Timer
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Active Timer Display */}
                    {currentTimer && (currentTimer.isRunning || currentTimer.isPaused) && (
                        <div className="bg-slate-950/50 p-6 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-6">

                            {/* Circular Progress Display */}
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                {/* Background Circle */}
                                <svg className="transform -rotate-90 w-32 h-32 absolute inset-0">
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r={radius}
                                        stroke="currentColor"
                                        strokeWidth="6"
                                        fill="transparent"
                                        className={`opacity-20 ${currentTimer.isPaused ? 'text-yellow-500' : 'text-green-500'}`}
                                    />
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r={radius}
                                        stroke="currentColor"
                                        strokeWidth="6"
                                        fill="transparent"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeLinecap="round"
                                        className={`transition-all duration-500 ease-linear ${currentTimer.isPaused ? 'text-yellow-500' : 'text-green-500'}`}
                                    />
                                </svg>

                                {/* Center Time Display */}
                                <div className="z-10 flex flex-col items-center justify-center">
                                    <span className={`text-2xl font-mono font-bold tracking-wider ${currentTimer.isPaused ? 'text-yellow-400' : 'text-white'}`}>
                                        {displayTime}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-slate-500 mt-1">
                                        {currentTimer.isPaused ? 'PAUSED' : 'LEFT'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full">
                                {currentTimer.isPaused ? (
                                    <button
                                        onClick={onResumeTimer}
                                        className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-900/20"
                                    >
                                        <Play size={18} fill="currentColor" /> Lanjutkan
                                    </button>
                                ) : (
                                    <button
                                        onClick={onPauseTimer}
                                        className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-yellow-900/20"
                                    >
                                        <Pause size={18} fill="currentColor" /> Jeda
                                    </button>
                                )}
                                <button
                                    onClick={onStopTimer}
                                    className="py-2 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors"
                                    title="Hentikan Timer"
                                >
                                    <Square size={18} fill="currentColor" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Start New Timer */}
                    {(!currentTimer || (!currentTimer.isRunning && !currentTimer.isPaused)) && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Durasi Custom</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            min="1"
                                            max="180"
                                            value={timerInput}
                                            onChange={(e) => setTimerInput(e.target.value)}
                                            className="w-full bg-slate-900 border border-white/10 rounded-lg pl-3 pr-12 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                            placeholder="10"
                                        />
                                        <span className="absolute right-3 top-2.5 text-sm text-slate-500">menit</span>
                                    </div>
                                    <button
                                        onClick={handleStartTimer}
                                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20"
                                    >
                                        <Play size={16} fill="currentColor" /> Mulai
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-300 mb-2 block flex items-center gap-2">
                                    <History size={14} /> Preset Cepat
                                </label>
                                <div className="grid grid-cols-5 gap-2">
                                    {presetDurations.map(duration => (
                                        <button
                                            key={duration}
                                            onClick={() => onStartTimer(duration * 60)}
                                            className="py-2 px-1 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-lg text-sm text-slate-300 transition-colors"
                                        >
                                            {duration}m
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
