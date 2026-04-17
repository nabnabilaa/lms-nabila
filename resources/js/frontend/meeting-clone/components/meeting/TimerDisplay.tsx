import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Pause, Zap, GripHorizontal } from 'lucide-react';
import type { MeetingTimer } from '../../types';

interface TimerDisplayProps {
    timer: MeetingTimer;
    onClick?: () => void;
}

export const TimerDisplay = ({ timer, onClick }: TimerDisplayProps) => {
    const [timeLeft, setTimeLeft] = useState<string>("--:--");
    const [progress, setProgress] = useState(100);
    const [isUrgent, setIsUrgent] = useState(false);

    // Dragging State
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isInitialized, setIsInitialized] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Refs for drag logic
    const timerRef = useRef<HTMLDivElement>(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const hasDragged = useRef(false);

    // Using useLayoutEffect to prevent layout shift on mount
    useLayoutEffect(() => {
        if (!isInitialized && timerRef.current) {
            // Initialize position: Top-Right with padding
            // We use document.documentElement.clientWidth to get the viewport width without scrollbars
            const viewportWidth = document.documentElement.clientWidth;
            const elementWidth = timerRef.current.offsetWidth;

            // Set initial position: 20px from right edge
            setPosition({
                x: viewportWidth - elementWidth - 20,
                y: 80
            });
            setIsInitialized(true);
        }
    }, [isInitialized]);

    useEffect(() => {
        if (!timer) return;

        const updateTimer = () => {
            const now = Date.now();
            let diff = 0;
            let total = timer.duration * 1000;

            if (timer.isPaused && timer.remainingTime) {
                diff = timer.remainingTime;
            } else if (timer.isRunning) {
                diff = Math.max(0, timer.endTime - now);
            } else {
                return;
            }

            const prog = Math.min(100, Math.max(0, (diff / total) * 100));
            setProgress(prog);

            const totalSeconds = Math.ceil(diff / 1000);
            const mins = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;

            setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
            setIsUrgent(totalSeconds <= 30 || prog <= 10);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [timer]);

    // Handle Resize
    useEffect(() => {
        const handleResize = () => {
            if (!timerRef.current) return;

            const viewportWidth = document.documentElement.clientWidth;
            const viewportHeight = document.documentElement.clientHeight;
            const { offsetWidth, offsetHeight } = timerRef.current;

            setPosition(prev => ({
                x: Math.min(prev.x, viewportWidth - offsetWidth),
                y: Math.min(prev.y, viewportHeight - offsetHeight)
            }));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0 || !timerRef.current) return;

        setIsDragging(true);
        hasDragged.current = false;

        const rect = timerRef.current.getBoundingClientRect();
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !timerRef.current) return;

            hasDragged.current = true;

            const viewportWidth = document.documentElement.clientWidth;
            const viewportHeight = document.documentElement.clientHeight;
            const { offsetWidth, offsetHeight } = timerRef.current;

            // Target position based on cursor + offset
            let nextX = e.clientX - dragOffset.current.x;
            let nextY = e.clientY - dragOffset.current.y;

            // Precise clamping
            nextX = Math.max(0, Math.min(viewportWidth - offsetWidth, nextX));
            nextY = Math.max(0, Math.min(viewportHeight - offsetHeight, nextY));

            setPosition({ x: nextX, y: nextY });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handleClick = (e: React.MouseEvent) => {
        if (hasDragged.current) {
            e.stopPropagation();
            return;
        }

        if (onClick) {
            onClick();
        }
    };

    if (!timer || (!timer.isRunning && !timer.isPaused)) return null;

    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    // Use a Portal to render directly under document.body
    // This breaks out of any parent overflow:hidden or relative positioning contexts
    return createPortal(
        <div
            ref={timerRef}
            style={{
                left: position.x,
                top: position.y,
                transform: 'translateZ(0)', // Force GPU layer
            }}
            className={`fixed z-[9999] flex flex-col items-center select-none touch-none
            ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
            `}
            onMouseDown={handleMouseDown}
            onClick={handleClick}
        >
            <div
                className={`group flex items-center gap-3 pl-3 pr-4 py-2 rounded-2xl backdrop-blur-xl shadow-2xl border transition-colors duration-300
                ${isUrgent
                        ? 'bg-red-500/20 border-red-500/50 shadow-red-500/20'
                        : timer.isPaused
                            ? 'bg-yellow-500/10 border-yellow-500/30'
                            : 'bg-slate-900/80 border-white/10 hover:bg-slate-800/80'
                    }
                `}
            >
                {/* Drag Handle (Visible on hover) */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
                    <GripHorizontal size={14} />
                </div>

                <div className="relative w-10 h-10 flex items-center justify-center pointer-events-none">
                    <svg className="transform -rotate-90 w-10 h-10">
                        <circle cx="20" cy="20" r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" className={`opacity-20 ${isUrgent ? 'text-red-500' : 'text-slate-400'}`} />
                        <circle cx="20" cy="20" r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className={`transition-all duration-1000 ease-linear ${isUrgent ? 'text-red-500' : timer.isPaused ? 'text-yellow-400' : 'text-indigo-400'}`} />
                    </svg>
                    <div className={`absolute inset-0 flex items-center justify-center ${isUrgent ? 'animate-bounce' : ''}`}>
                        {timer.isPaused ? <Pause size={14} className="text-yellow-400 fill-current" /> : isUrgent ? <Zap size={14} className="text-red-400 fill-current" /> : <Clock size={14} className="text-indigo-400" />}
                    </div>
                </div>

                <div className="flex flex-col items-start pointer-events-none">
                    <span className={`font-mono text-xl font-bold tracking-wider leading-none ${isUrgent ? 'text-red-100' : 'text-white'}`}>{timeLeft}</span>
                    <span className={`text-[10px] font-bold tracking-widest uppercase mt-0.5 ${timer.isPaused ? 'text-yellow-400' : isUrgent ? 'text-red-300' : 'text-slate-400'}`}>
                        {timer.isPaused ? 'PAUSED' : isUrgent ? 'HURRY UP' : 'REMAINING'}
                    </span>
                </div>
            </div>
        </div>,
        document.body
    );
};