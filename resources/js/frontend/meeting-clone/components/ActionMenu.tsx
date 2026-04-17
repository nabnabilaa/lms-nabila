import { useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react'; // Fix: Gunakan type-only import

export interface MenuItem {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    danger?: boolean;
    divider?: boolean;
}

interface ActionMenuProps {
    isOpen: boolean;
    onClose: () => void;
    items: MenuItem[];
}

export const ActionMenu = ({ isOpen, onClose, items }: ActionMenuProps) => {
    const menuRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={menuRef}
            className="absolute bottom-full mb-4 right-0 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-50 origin-bottom-right"
        >
            <div className="py-2">
                {items.map((item, index) => {
                    if (item.divider) {
                        return <div key={index} className="h-px bg-slate-700 my-1 mx-2" />;
                    }

                    const Icon = item.icon;
                    return (
                        <button
                            key={index}
                            onClick={() => {
                                item.onClick();
                                onClose();
                            }}
                            className={`
                                w-full text-left px-4 py-3 flex items-center gap-3 transition-colors
                                ${item.danger
                                    ? 'text-red-400 hover:bg-red-500/10'
                                    : 'text-slate-200 hover:bg-slate-700'
                                }
                            `}
                        >
                            <Icon size={18} />
                            <span className="text-sm font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};