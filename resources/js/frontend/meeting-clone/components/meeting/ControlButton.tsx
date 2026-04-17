import type { LucideIcon } from 'lucide-react';

interface ControlButtonProps {
    onClick: () => void;
    isActive?: boolean;
    isDestructive?: boolean;
    icon: LucideIcon;
    label?: string;
    secondary?: boolean;
}

export const ControlButton = ({
    onClick,
    isActive = false,
    isDestructive = false,
    icon: Icon,
    label,
    secondary = false
}: ControlButtonProps) => {
    return (
        <div className="group relative flex flex-col items-center gap-1">
            <button
                onClick={onClick}
                className={`
                    flex items-center justify-center transition-all duration-300 transform active:scale-95
                    ${secondary
                        ? 'w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white'
                        : 'w-12 h-12 rounded-2xl shadow-lg'
                    }
                    ${!secondary && (
                        isDestructive
                            ? 'bg-red-500 hover:bg-red-600 text-white rounded-full w-16' // End call pill shape
                            : isActive
                                ? 'bg-slate-700 hover:bg-slate-600 text-red-400 border border-slate-600' // OFF state
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20' // ON state
                    )}
                `}
            >
                <Icon size={secondary ? 18 : 22} />
            </button>
            {label && !secondary && (
                <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-900/90 text-slate-300 text-[10px] font-medium px-2 py-1 rounded-md backdrop-blur-sm whitespace-nowrap border border-white/5 pointer-events-none z-50">
                    {label}
                </span>
            )}
        </div>
    );
};