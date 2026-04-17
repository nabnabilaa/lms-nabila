import { MousePointer2, Square, Circle, Type, Pencil, Eraser, Undo, Redo, MessageSquare, Trash2, StickyNote } from 'lucide-react';
import type { LayerType } from '../../liveblocks.config';

export type CanvasMode =
    | { mode: "none" }
    | { mode: "inserting"; layerType: LayerType }
    | { mode: "pencil" }
    | { mode: "eraser" }
    | { mode: "selection" }
    | { mode: "text" }
    | { mode: "translating" }
    | { mode: "resizing" }
    | { mode: "editing" }
    | { mode: "comment" };

interface ToolbarProps {
    canvasMode: CanvasMode;
    setCanvasMode: (mode: CanvasMode) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    strokeWidth: number;
    setStrokeWidth: (w: number) => void;
    deleteSelection: () => void;
    hasSelection: boolean;
}

export const Toolbar = ({ canvasMode, setCanvasMode, undo, redo, canUndo, canRedo, strokeWidth, setStrokeWidth, deleteSelection, hasSelection }: ToolbarProps) => {
    
    const isActive = (mode: CanvasMode['mode'], type?: LayerType) => {
        if (canvasMode.mode !== mode) return false;
        if (mode === 'inserting' && type) {
            return (canvasMode as any).layerType === type;
        }
        return true;
    };

    return (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-xl shadow-slate-200/50 border border-slate-100 p-2 flex items-center gap-1 z-50 transition-all hover:scale-105 max-w-[95vw] overflow-x-auto scrollbar-hide">
            {/* Selection */}
            <ToolButton
                isActive={isActive("selection") || isActive("translating") || isActive("resizing") || isActive("editing")}
                onClick={() => setCanvasMode({ mode: "selection" })}
                icon={<MousePointer2 size={20} />}
                tooltip="Select (V)"
            />
            
            {/* Text & Note */}
            <ToolButton
                isActive={isActive("text")}
                onClick={() => setCanvasMode({ mode: "text" })}
                icon={<Type size={20} />}
                tooltip="Text (T)"
            />
            <ToolButton
                isActive={isActive("inserting", "Note")}
                onClick={() => setCanvasMode({ mode: "inserting", layerType: "Note" })}
                icon={<StickyNote size={20} />}
                tooltip="Sticky Note (S)"
            />

            <div className="w-px h-6 bg-slate-200 mx-2" />

            {/* Shapes */}
            <ToolButton
                isActive={isActive("inserting", "Rectangle")}
                onClick={() => setCanvasMode({ mode: "inserting", layerType: "Rectangle" })}
                icon={<Square size={20} />}
                tooltip="Rectangle (R)"
            />
            <ToolButton
                isActive={isActive("inserting", "Ellipse")}
                onClick={() => setCanvasMode({ mode: "inserting", layerType: "Ellipse" })}
                icon={<Circle size={20} />}
                tooltip="Ellipse (O)"
            />

            <div className="w-px h-6 bg-slate-200 mx-2" />

            {/* Drawing */}
            <ToolButton
                isActive={isActive("pencil")}
                onClick={() => setCanvasMode({ mode: "pencil" })}
                icon={<Pencil size={20} />}
                tooltip="Pen (P)"
            />
            <ToolButton
                isActive={isActive("eraser")}
                onClick={() => setCanvasMode({ mode: "eraser" })}
                icon={<Eraser size={20} />}
                tooltip="Eraser (E)"
            />

            <div className="w-px h-6 bg-slate-200 mx-2" />

            <ToolButton
                isActive={isActive("comment")}
                onClick={() => setCanvasMode({ mode: "comment" })}
                icon={<MessageSquare size={20} />}
                tooltip="Comment (C)"
            />

            <ToolButton
                isActive={false}
                onClick={deleteSelection}
                disabled={!hasSelection}
                icon={<Trash2 size={20} />}
                tooltip="Delete (Del)"
            />

            <div className="w-px h-6 bg-slate-200 mx-2" />

            <ToolButton isActive={false} onClick={undo} disabled={!canUndo} icon={<Undo size={20} />} tooltip="Undo (Ctrl+Z)" />
            <ToolButton isActive={false} onClick={redo} disabled={!canRedo} icon={<Redo size={20} />} tooltip="Redo (Ctrl+Y)" />

            {/* Slider Stroke */}
            {(canvasMode.mode === 'pencil' || canvasMode.mode === 'eraser') && (
                <div className="bg-white rounded-lg shadow-md border border-slate-100 px-4 py-2 flex items-center gap-3 absolute top-14 left-0 animate-in fade-in slide-in-from-top-2">
                    <span className="text-xs font-medium text-slate-500">Size</span>
                    <input
                        type="range"
                        min={canvasMode.mode === 'eraser' ? 10 : 2}
                        max={canvasMode.mode === 'eraser' ? 50 : 20}
                        value={strokeWidth}
                        onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                        className="w-24 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                </div>
            )}
        </div>
    );
};

const ToolButton = ({ isActive, onClick, icon, tooltip, disabled }: { isActive: boolean; onClick: () => void; icon: React.ReactNode; tooltip: string; disabled?: boolean }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={tooltip}
        className={`p-3 rounded-full transition-all ${isActive
            ? "bg-blue-50 text-blue-600 ring-2 ring-blue-500/20"
            : disabled
                ? "text-slate-300 cursor-not-allowed"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
    >
        {icon}
    </button>
);