import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface SidePanelProps {
    isOpen?: boolean; // If handling internal visibility/animation
    onClose: () => void;
    title: string | ReactNode;
    icon?: React.ElementType; // Lucide Icon
    children: ReactNode;
    width?: string;
    className?: string;
}

export const SidePanel = ({
    onClose,
    title,
    icon: Icon,
    children,
    width = "w-96 md:w-[500px]", // Default width from ChatPanel, can be overridden
    className = "",
}: SidePanelProps) => {

    return (
        <div className={`absolute top-4 right-4 bottom-20 md:bottom-4 ${width} bg-slate-900/95 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl z-[60] flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300 ${className}`}>
            {/* Header */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-slate-900/50 shrink-0">
                <h2 className="text-normal font-bold text-white flex items-center gap-2">
                    {Icon && <Icon size={18} className="text-indigo-400" />}
                    {title}
                </h2>
                <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full transition-colors text-slate-400">
                    <X size={18} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {children}
            </div>
        </div>
    );
};
