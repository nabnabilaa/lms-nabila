import { useState, useCallback, useEffect, useRef } from 'react';
import { useHistory, useCanUndo, useCanRedo, useMutation, useStorage, useOthers, useMyPresence } from '@liveblocks/react/suspense';
import { Toolbar } from './Toolbar';
import type { CanvasMode } from './Toolbar';
import { LiveObject } from '@liveblocks/client';
import { nanoid } from 'nanoid';
import type { LayerType, Point, Color } from '../../liveblocks.config';
import { Thread } from "@liveblocks/react-ui";
import { useThreads, useCreateThread } from "@liveblocks/react/suspense";
import { 
    AlignLeft, AlignCenter, AlignRight, Bold, Type, Trash2, X, 
    BringToFront, SendToBack, ArrowUp, ArrowDown, StickyNote 
} from 'lucide-react';

// --- DEFINISI TIPE LOKAL ---
// type Color = { r: number; g: number; b: number }; // Gunakan dari liveblocks.config jika ada, atau uncomment ini

const Side = { Top: 1, Bottom: 2, Left: 4, Right: 8 } as const;
const HANDLE_WIDTH = 8;
const CANVAS_BG_COLOR = "#f4f4f7";

// Palette Warna Standard (Shape & Text)
const SHAPE_COLORS = [
    { r: 255, g: 255, b: 255 }, // White
    { r: 243, g: 244, b: 246 }, // Gray
    { r: 252, g: 165, b: 165 }, // Red
    { r: 252, g: 211, b: 77 },  // Yellow
    { r: 110, g: 231, b: 183 }, // Green
    { r: 147, g: 197, b: 253 }, // Blue
    { r: 196, g: 181, b: 253 }, // Purple
    { r: 0, g: 0, b: 0 },       // Black
];

// Palette Warna Sticky Note (Pastel)
const NOTE_COLORS = [
    { r: 255, g: 229, b: 153 }, // Classic Yellow
    { r: 255, g: 199, b: 199 }, // Pink
    { r: 185, g: 246, b: 202 }, // Mint
    { r: 191, g: 228, b: 255 }, // Blue
    { r: 228, g: 208, b: 255 }, // Lavender
    { r: 255, g: 213, b: 153 }, // Orange
];

const FONTS = [
    { value: 'Inter, sans-serif', label: 'Sans' },
    { value: 'Times New Roman, serif', label: 'Serif' },
    { value: 'Courier New, monospace', label: 'Mono' },
    { value: 'Kalam, cursive', label: 'Hand' },
];

type CanvasState =
    | { mode: "none" }
    | { mode: "selection" }
    | { mode: "inserting"; layerType: LayerType }
    | { mode: "creating"; layerType: LayerType; origin: Point; layerId: string }
    | { mode: "pencil" }
    | { mode: "eraser" }
    | { mode: "text" }
    | { mode: "comment" }
    | { mode: "translating"; current: Point }
    | { mode: "resizing"; initialBounds: XYWH; corner: number }
    | { mode: "editing"; layerId: string };

type XYWH = { x: number; y: number; width: number; height: number };

interface CanvasProps {
    role: 'host' | 'co-host' | 'participant';
    allowParticipantDraw: boolean;
    onClose: () => void;
}

const MAX_LAYERS = 300;

export const Canvas = ({ role, allowParticipantDraw, onClose }: CanvasProps) => {
    const [canvasState, setCanvasState] = useState<CanvasState>({ mode: "none" });
    const [camera, setCamera] = useState({ x: 0, y: 0 });
    const [strokeWidth, setStrokeWidth] = useState(5);

    // --- HELPER KOORDINAT ---
    const getSvgPoint = (e: React.PointerEvent, svg: SVGSVGElement) => {
        const point = svg.createSVGPoint();
        point.x = e.clientX;
        point.y = e.clientY;
        const screenCTM = svg.getScreenCTM();
        if (!screenCTM) return { x: 0, y: 0 };
        const svgPoint = point.matrixTransform(screenCTM.inverse());
        return {
            x: Math.round(svgPoint.x - camera.x),
            y: Math.round(svgPoint.y - camera.y)
        };
    };

    const canEdit = role === 'host' || role === 'co-host' || (role === 'participant' && allowParticipantDraw);
    const history = useHistory();
    const canUndo = useCanUndo();
    const canRedo = useCanRedo();
    const layerIds = useStorage((root) => root.layerIds);
    const [{ pencilDraft, selection }, setMyPresence] = useMyPresence();
    const { threads } = useThreads();
    const createThread = useCreateThread();

    const onWheel = useCallback((e: React.WheelEvent) => {
        setCamera((camera) => ({ x: camera.x - e.deltaX, y: camera.y - e.deltaY }));
    }, []);

    // --- MUTATIONS: INSERT & DRAWING ---
    const startCreatingLayer = useMutation(({ storage, setMyPresence }, layerType: LayerType, position: Point) => {
        const liveLayers = storage.get("layers");
        if (liveLayers.size >= MAX_LAYERS) return;

        const liveLayerIds = storage.get("layerIds");
        const layerId = nanoid();

        // Warna Default berdasarkan tipe
        let fill = { r: 99, g: 102, b: 241 }; // Shape Blue
        if (layerType === 'Note') fill = { r: 255, g: 229, b: 153 }; // Note Yellow
        if (layerType === 'Text') fill = { r: 0, g: 0, b: 0 }; // Text Black

        const layer = new LiveObject({
            type: layerType,
            x: position.x, y: position.y, 
            height: layerType === 'Note' ? 200 : 0, 
            width: layerType === 'Note' ? 200 : 0, 
            fill,
            points: layerType === 'Path' ? [] : undefined,
            strokeWidth: 0,
            value: layerType === 'Text' || layerType === 'Note' ? "Type here..." : "",
            fontSize: layerType === 'Text' ? 24 : 20, 
            fontWeight: 400, 
            fontFamily: 'Inter, sans-serif', 
            align: 'center'
        } as any);

        liveLayerIds.push(layerId);
        liveLayers.set(layerId, layer);
        
        setMyPresence({ selection: [layerId] }, { addToHistory: true });
        
        // Note langsung mode edit? Bisa opsional. Di sini kita biarkan mode creating/resizing dulu
        // Jika drag, kita masuk mode creating. Jika Note, default size 200x200 mungkin lebih enak langsung muncul
        if (layerType === 'Note') {
             // Opsional: Langsung set ukuran fixed agar tidak perlu drag
             // setCanvasState({ mode: "none" }); 
             setCanvasState({ mode: "creating", layerType, origin: position, layerId });
        } else {
             setCanvasState({ mode: "creating", layerType, origin: position, layerId });
        }
    }, []);

    const updateCreatingLayer = useMutation(({ storage }, point: Point) => {
        if (canvasState.mode !== "creating") return;
        
        const layer = storage.get("layers").get(canvasState.layerId);
        if (layer) {
            const { x: ox, y: oy } = canvasState.origin;
            const x = Math.min(point.x, ox);
            const y = Math.min(point.y, oy);
            const width = Math.abs(point.x - ox);
            const height = Math.abs(point.y - oy);
            
            // Minimal size agar tidak error svg
            layer.update({ 
                x, y, 
                width: Math.max(width, 10), 
                height: Math.max(height, 10) 
            });
        }
    }, [canvasState]);

    const insertTextLayer = useMutation(({ storage, setMyPresence }, position: Point) => {
        const liveLayers = storage.get("layers");
        const liveLayerIds = storage.get("layerIds");
        const layerId = nanoid();
        
        const layer = new LiveObject({
            type: "Text",
            x: position.x, y: position.y, 
            height: 50, width: 200, 
            fill: { r: 0, g: 0, b: 0 },
            value: "Type here...",
            fontSize: 24, fontWeight: 400, fontFamily: 'Inter, sans-serif', align: 'left'
        } as any);

        liveLayerIds.push(layerId);
        liveLayers.set(layerId, layer);
        setMyPresence({ selection: [layerId] }, { addToHistory: true });
        setCanvasState({ mode: "editing", layerId });
    }, []);

    const updateLayerValue = useMutation(({ storage }, id: string, newValue: string) => {
        storage.get("layers").get(id)?.update({ value: newValue });
    }, []);

    const startDrawing = useMutation(({ setMyPresence }, point: Point, pressure: number) => {
        setMyPresence({ pencilDraft: [[{ x: point.x, y: point.y, pressure }]], penColor: { r: 0, g: 0, b: 0 } });
    }, []);

    const continueDrawing = useMutation(({ self, setMyPresence }, point: Point, e: React.PointerEvent) => {
        const { pencilDraft } = self.presence;
        if ((canvasState.mode !== "pencil" && canvasState.mode !== "eraser") || e.buttons !== 1 || pencilDraft == null) return;
        setMyPresence({
            cursor: point,
            pencilDraft: pencilDraft.map((stroke, i) => i === pencilDraft.length - 1 ? [...stroke, { x: point.x, y: point.y, pressure: e.pressure }] : stroke),
        });
    }, [canvasState]);

    const insertPath = useMutation(({ storage, self, setMyPresence }) => {
        const liveLayers = storage.get("layers");
        const { pencilDraft } = self.presence;
        if (pencilDraft == null || pencilDraft.length === 0 || pencilDraft[0].length < 2) { setMyPresence({ pencilDraft: null }); return; }
        
        const id = nanoid();
        const points = pencilDraft[0].map(p => ({ x: p.x, y: p.y }));
        const isEraser = canvasState.mode === 'eraser';
        liveLayers.set(id, new LiveObject({ type: isEraser ? "Eraser" : "Path", x: 0, y: 0, width: 0, height: 0, fill: { r: 0, g: 0, b: 0 }, points, strokeWidth } as any));
        storage.get("layerIds").push(id);
        setMyPresence({ pencilDraft: null });
    }, [canvasState, strokeWidth]);

    const translateSelectedLayers = useMutation(({ storage, self }, point: Point) => {
        if (canvasState.mode !== "translating") return;
        const offset = { x: point.x - canvasState.current.x, y: point.y - canvasState.current.y };
        const liveLayers = storage.get("layers");
        for (const id of self.presence.selection || []) {
            liveLayers.get(id)?.update({ x: liveLayers.get(id)!.get("x") + offset.x, y: liveLayers.get(id)!.get("y") + offset.y });
        }
        setCanvasState({ mode: "translating", current: point });
    }, [canvasState]);

    const resizeSelectedLayer = useMutation(({ storage, self }, point: Point) => {
        if (canvasState.mode !== "resizing") return;
        const selectedId = self.presence.selection?.[0];
        const layer = storage.get("layers").get(selectedId!);
        if (!layer) return;
        const { initialBounds, corner } = canvasState;
        const bounds = { ...initialBounds };
        if ((corner & Side.Left) === Side.Left) { bounds.x = Math.min(point.x, initialBounds.x + initialBounds.width); bounds.width = Math.abs(initialBounds.x + initialBounds.width - point.x); }
        if ((corner & Side.Right) === Side.Right) { bounds.x = Math.min(point.x, initialBounds.x); bounds.width = Math.abs(point.x - initialBounds.x); }
        if ((corner & Side.Top) === Side.Top) { bounds.y = Math.min(point.y, initialBounds.y + initialBounds.height); bounds.height = Math.abs(initialBounds.y + initialBounds.height - point.y); }
        if ((corner & Side.Bottom) === Side.Bottom) { bounds.y = Math.min(point.y, initialBounds.y); bounds.height = Math.abs(point.y - initialBounds.y); }
        layer.update(bounds);
    }, [canvasState]);

    const deleteSelectedLayers = useMutation(({ storage, self, setMyPresence }) => {
        const liveLayers = storage.get("layers");
        const liveLayerIds = storage.get("layerIds");
        for (const id of self.presence.selection || []) {
            liveLayers.delete(id);
            const index = liveLayerIds.indexOf(id);
            if (index !== -1) liveLayerIds.delete(index);
        }
        setMyPresence({ selection: [] }, { addToHistory: true });
    }, []);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && canvasState.mode !== 'editing') deleteSelectedLayers();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [deleteSelectedLayers, canvasState]);

    // --- HANDLERS ---
    const onPointerDown = useCallback((e: React.PointerEvent) => {
        if (!canEdit) return;
        if (canvasState.mode === "editing") { setCanvasState({ mode: "none" }); return; }
        const point = getSvgPoint(e, e.currentTarget as SVGSVGElement);

        if (canvasState.mode === "comment") { createThread({ body: { version: 1, content: [] }, metadata: { x: point.x, y: point.y } }); setCanvasState({ mode: "none" }); return; }
        
        if (canvasState.mode === "inserting") {
            startCreatingLayer(canvasState.layerType, point);
            return;
        }
        if (canvasState.mode === "text") {
            insertTextLayer(point);
            return;
        }
        if (canvasState.mode === "pencil" || canvasState.mode === "eraser") { startDrawing(point, e.pressure); return; }

        setCanvasState({ mode: "none" });
        setMyPresence({ selection: [] });
    }, [camera, canvasState, canEdit, startCreatingLayer, insertTextLayer, startDrawing, setMyPresence, createThread]);

    const onPointerMove = useMutation(({ setMyPresence }, e: React.PointerEvent) => {
        e.preventDefault();
        const point = getSvgPoint(e, e.currentTarget as SVGSVGElement);
        setMyPresence({ cursor: point });
        if (canvasState.mode === "creating") updateCreatingLayer(point);
        else if (canvasState.mode === "translating") translateSelectedLayers(point);
        else if (canvasState.mode === "resizing") resizeSelectedLayer(point);
        else if (canvasState.mode === "pencil" || canvasState.mode === "eraser") continueDrawing(point, e);
    }, [camera, canvasState, updateCreatingLayer, translateSelectedLayers, resizeSelectedLayer, continueDrawing]);

    const onPointerUp = useMutation(() => {
        if (canvasState.mode === "pencil" || canvasState.mode === "eraser") {
            insertPath();
            return;
        }
        
        // Auto-edit for Note immediately after drag creation
        if (canvasState.mode === "creating" && canvasState.layerType === "Note") {
            setCanvasState({ mode: "editing", layerId: canvasState.layerId });
            return;
        }

        if (["creating", "translating", "resizing"].includes(canvasState.mode)) {
            setCanvasState({ mode: "none" });
        }
    }, [canvasState, insertPath]);

    const onLayerPointerDown = useMutation(({ self, setMyPresence }, e: React.PointerEvent, layerId: string) => {
        if (["pencil", "eraser", "inserting", "comment", "text", "editing", "creating"].includes(canvasState.mode)) return;
        e.stopPropagation();
        if (!self.presence.selection?.includes(layerId)) setMyPresence({ selection: [layerId] }, { addToHistory: true });
        setCanvasState({ mode: "translating", current: getSvgPoint(e, e.currentTarget.closest('svg')!) });
    }, [canvasState, camera]);

    const onLayerDoubleClick = useCallback((e: React.MouseEvent, layerId: string) => {
        e.stopPropagation();
        setCanvasState({ mode: "editing", layerId });
    }, []);

    const setModeFromToolbar = (newMode: CanvasMode) => {
        switch (newMode.mode) {
            case "selection": setCanvasState({ mode: "none" }); break;
            case "inserting": setCanvasState({ mode: "inserting", layerType: newMode.layerType }); break;
            case "text": setCanvasState({ mode: "text" }); break;
            case "pencil": setCanvasState({ mode: "pencil" }); break;
            case "eraser": setCanvasState({ mode: "eraser" }); break;
            case "comment": setCanvasState({ mode: "comment" }); break;
            default: break;
        }
    };

    return (
        <div className="absolute inset-0 z-[50] flex flex-col user-select-none bg-[#f4f4f7] overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #000000 1px, transparent 1px)', backgroundSize: '24px 24px', transform: `translate(${camera.x % 24}px, ${camera.y % 24}px)` }} />
            
            {canEdit && (
                <Toolbar
                    canvasMode={["translating", "resizing", "editing", "creating", "none"].includes(canvasState.mode) ? { mode: 'selection' } : canvasState as any}
                    setCanvasMode={setModeFromToolbar}
                    undo={history.undo} redo={history.redo} canUndo={canUndo} canRedo={canRedo}
                    strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth} deleteSelection={deleteSelectedLayers} hasSelection={!!selection && selection.length > 0}
                />
            )}

            {selection && selection.length === 1 && !["translating", "resizing", "creating"].includes(canvasState.mode) && (
                <LayerSettings id={selection[0]} onDelete={deleteSelectedLayers} />
            )}

            <button onClick={onClose} className="absolute top-4 right-4 bg-white text-slate-700 shadow-sm border border-gray-200 px-4 py-2 rounded-lg z-50 hover:bg-gray-50 font-medium text-sm">Close</button>

            <svg className="w-full h-full touch-none relative z-10" 
                onPointerDown={onPointerDown} 
                onPointerMove={onPointerMove} 
                onPointerUp={onPointerUp} 
                onPointerLeave={onPointerUp} 
                onWheel={onWheel}
            >
                <g style={{ transform: `translate(${camera.x}px, ${camera.y}px)` }}>
                    {layerIds?.map((id) => (
                        <LayerComponent key={id} id={id} onLayerPointerDown={onLayerPointerDown} onLayerDoubleClick={onLayerDoubleClick} selectionColor={selection?.includes(id) ? "#3b82f6" : undefined} isEditing={canvasState.mode === 'editing' && canvasState.layerId === id} onTextChange={updateLayerValue} />
                    ))}
                    {selection && selection.length === 1 && !["editing", "creating"].includes(canvasState.mode) && <SelectionBox id={selection[0]} onResizeHandlePointerDown={(corner, initialBounds) => setCanvasState({ mode: "resizing", initialBounds, corner })} />}
                    {pencilDraft && pencilDraft.map((stroke, i) => <DrawingPath key={`draft-${i}`} pathPoints={stroke.map(p => ({ x: p.x, y: p.y }))} fillColor={{ r: 0, g: 0, b: 0 }} strokeColor={canvasState.mode === 'eraser' ? undefined : { r: 0, g: 0, b: 0 }} isEraser={canvasState.mode === 'eraser'} strokeWidth={strokeWidth} />)}
                    <Cursors />
                </g>
            </svg>
            <div className="absolute inset-0 pointer-events-none z-20 overflow-visible"><div style={{ transform: `translate(${camera.x}px, ${camera.y}px)` }} className="relative w-full h-full">{threads.map((thread) => <div key={thread.id} className="absolute pointer-events-auto" style={{ left: thread.metadata.x, top: thread.metadata.y }}><Thread thread={thread} className="bg-white shadow-xl rounded-xl border border-gray-100 min-w-[300px]" /></div>)}</div></div>
        </div>
    );
};

// --- SETTINGS COMPONENT ---
const LayerSettings = ({ id, onDelete }: { id: string, onDelete: () => void }) => {
    const layer = useStorage((root) => root.layers.get(id));
    const updateLayer = useMutation(({ storage }, updates: any) => storage.get("layers").get(id)?.update(updates), [id]);
    
    // Z-Index Mutations
    const moveToFront = useMutation(({ storage }) => { const l = storage.get("layerIds"); const i = l.indexOf(id); if (i < l.length - 1) l.move(i, l.length - 1); }, [id]);
    const moveToBack = useMutation(({ storage }) => { const l = storage.get("layerIds"); const i = l.indexOf(id); if (i > 0) l.move(i, 0); }, [id]);
    const moveForward = useMutation(({ storage }) => { const l = storage.get("layerIds"); const i = l.indexOf(id); if (i < l.length - 1) l.move(i, i + 1); }, [id]);
    const moveBackward = useMutation(({ storage }) => { const l = storage.get("layerIds"); const i = l.indexOf(id); if (i > 0) l.move(i, i - 1); }, [id]);

    if (!layer || (layer.type === 'Path' || layer.type === 'Eraser')) return null;

    // Palette Selector
    const activeColors = layer.type === 'Note' ? NOTE_COLORS : SHAPE_COLORS;

    return (
        <div className="absolute top-24 right-4 w-60 bg-white rounded-xl shadow-2xl border border-gray-100 p-3 z-50 flex flex-col gap-3 animate-in fade-in slide-in-from-right-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                    {layer.type === 'Text' ? <Type size={14} className="text-gray-500"/> : layer.type === 'Note' ? <StickyNote size={14} className="text-gray-500"/> : <div className="w-3 h-3 rounded bg-gray-400"/>}
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{layer.type}</span>
                </div>
                <button onClick={onDelete} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors" title="Delete"><Trash2 size={14}/></button>
            </div>

            <div className="flex gap-1 justify-between bg-gray-50 p-1 rounded-lg">
                <button onClick={moveToFront} className="p-1.5 hover:bg-white hover:text-blue-600 text-gray-500 rounded transition-all" title="Bring to Front"><BringToFront size={16} /></button>
                <button onClick={moveForward} className="p-1.5 hover:bg-white hover:text-blue-600 text-gray-500 rounded transition-all" title="Bring Forward"><ArrowUp size={16} /></button>
                <button onClick={moveBackward} className="p-1.5 hover:bg-white hover:text-blue-600 text-gray-500 rounded transition-all" title="Send Backward"><ArrowDown size={16} /></button>
                <button onClick={moveToBack} className="p-1.5 hover:bg-white hover:text-blue-600 text-gray-500 rounded transition-all" title="Send to Back"><SendToBack size={16} /></button>
            </div>

            {layer.type !== 'Text' && (
                <div>
                    <label className="text-[10px] font-semibold text-gray-400 mb-2 block uppercase tracking-wider">Fill Color</label>
                    <div className="grid grid-cols-5 gap-2">
                        {activeColors.map((c, i) => (
                            <button key={i} onClick={() => updateLayer({ fill: c })} className={`w-full aspect-square rounded-full border border-gray-200 shadow-sm hover:scale-110 transition-transform ${layer.fill.r === c.r && layer.fill.g === c.g && layer.fill.b === c.b ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`} style={{ backgroundColor: `rgb(${c.r},${c.g},${c.b})` }} />
                        ))}
                        {layer.type !== 'Note' && (
                            <button onClick={() => updateLayer({ fill: { r: 0, g: 0, b: 0, a: 0 } })} className="w-full aspect-square rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-red-500 transition-colors" title="No Fill"><X size={12}/></button>
                        )}
                    </div>
                </div>
            )}

            {(layer.type === 'Text' || layer.type === 'Note' || layer.type === 'Rectangle' || layer.type === 'Ellipse') && (
                <div className="flex flex-col gap-3 border-t border-gray-100 pt-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Font</label>
                        <select value={layer.fontFamily || 'Inter, sans-serif'} onChange={(e) => updateLayer({ fontFamily: e.target.value })} className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-100 outline-none">{FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-[10px] font-semibold text-gray-400 block mb-1 uppercase tracking-wider">Size</label>
                            <select value={layer.fontSize || 20} onChange={(e) => updateLayer({ fontSize: parseInt(e.target.value) })} className="w-full text-xs border border-gray-200 rounded px-1 py-1.5 outline-none focus:ring-2 focus:ring-indigo-100">{[12, 14, 16, 20, 24, 32, 48, 64, 96].map(s => <option key={s} value={s}>{s}</option>)}</select>
                        </div>
                        <div className="flex-1 flex items-end gap-1">
                            <button onClick={() => updateLayer({ fontWeight: layer.fontWeight === 700 ? 400 : 700 })} className={`flex-1 h-[26px] flex items-center justify-center rounded border border-gray-200 transition-all ${layer.fontWeight === 700 ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'text-gray-500 hover:bg-gray-50'}`} title="Bold"><Bold size={14} /></button>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-semibold text-gray-400 block mb-1 uppercase tracking-wider">Align</label>
                        <div className="flex bg-gray-50 p-0.5 rounded-lg border border-gray-200">
                            {[{ val: 'left', icon: <AlignLeft size={14}/> }, { val: 'center', icon: <AlignCenter size={14}/> }, { val: 'right', icon: <AlignRight size={14}/> }].map((opt) => (
                                <button key={opt.val} onClick={() => updateLayer({ align: opt.val })} className={`flex-1 py-1.5 rounded-md flex items-center justify-center transition-all ${layer.align === opt.val ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>{opt.icon}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SUB COMPONENTS ---
const LayerComponent = ({ id, onLayerPointerDown, onLayerDoubleClick, selectionColor, isEditing, onTextChange }: any) => {
    const layer = useStorage((root) => root.layers.get(id));
    if (!layer) return null;
    return (
        <g onPointerDown={(e) => onLayerPointerDown(e, id)} onDoubleClick={(e) => onLayerDoubleClick(e, id)} className="cursor-pointer" style={{ opacity: 1 }}>
            {layer.type === 'Rectangle' && <><rect x={layer.x} y={layer.y} width={layer.width} height={layer.height} fill={`rgb(${layer.fill.r}, ${layer.fill.g}, ${layer.fill.b})`} rx={4} stroke={selectionColor || "transparent"} strokeWidth={2} /><TextRenderer layer={layer} isEditing={isEditing} onChange={(v: string) => onTextChange(id, v)} /></>}
            {layer.type === 'Ellipse' && <><ellipse cx={layer.x + layer.width / 2} cy={layer.y + layer.height / 2} rx={layer.width / 2} ry={layer.height / 2} fill={`rgb(${layer.fill.r}, ${layer.fill.g}, ${layer.fill.b})`} stroke={selectionColor || "transparent"} strokeWidth={2} /><TextRenderer layer={layer} isEditing={isEditing} onChange={(v: string) => onTextChange(id, v)} /></>}
            
            {/* NOTE: Sticky Note Rendering (with Shadow & No stroke unless selected) */}
            {layer.type === 'Note' && (
                <g>
                    <rect x={layer.x} y={layer.y} width={layer.width} height={layer.height} fill={`rgb(${layer.fill.r}, ${layer.fill.g}, ${layer.fill.b})`} 
                        stroke={selectionColor || "rgba(0,0,0,0.05)"} strokeWidth={selectionColor ? 3 : 1}
                        style={{ filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.15))" }}
                    />
                    <TextRenderer layer={layer} isEditing={isEditing} onChange={(v: string) => onTextChange(id, v)} />
                </g>
            )}

            {layer.type === 'Text' && <TextRenderer layer={layer} isEditing={isEditing} onChange={(v: string) => onTextChange(id, v)} isStandalone />}
            {(layer.type === 'Path' || layer.type === 'Eraser') && layer.points && <DrawingPath pathPoints={layer.points} fillColor={layer.fill} strokeColor={layer.fill} strokeWidth={layer.strokeWidth || 5} isEraser={layer.type === 'Eraser'} />}
        </g>
    );
};

interface TextRendererProps { layer: any; isEditing: boolean; onChange: (val: string) => void; isStandalone?: boolean; }
const TextRenderer = ({ layer, isEditing, onChange, isStandalone }: TextRendererProps) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => { if (isEditing && textareaRef.current) { textareaRef.current.focus(); textareaRef.current.select(); } }, [isEditing]);
    const textColor = isStandalone ? `rgb(${layer.fill.r}, ${layer.fill.g}, ${layer.fill.b})` : "#000000";
    
    // Logic Alignment untuk Container
    const justifyContentMap: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
    
    const containerStyle: React.CSSProperties = { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: justifyContentMap[layer.align || 'center'], padding: '16px', overflow: 'hidden' };
    
    const textStyle: React.CSSProperties = { fontSize: `${layer.fontSize || 20}px`, fontWeight: layer.fontWeight || 400, fontFamily: layer.fontFamily || 'Inter, sans-serif', textAlign: layer.align || 'center', color: textColor, background: 'transparent', border: 'none', outline: 'none', resize: 'none', width: '100%', height: '100%', lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word', cursor: isEditing ? 'text' : 'pointer' };
    
    return (
        <foreignObject x={layer.x} y={layer.y} width={layer.width} height={layer.height}>
            <div style={containerStyle}>
                {isEditing ? <textarea ref={textareaRef} value={layer.value || ""} onChange={(e) => onChange(e.target.value)} style={{ ...textStyle, color: isStandalone ? 'black' : 'inherit', pointerEvents: 'auto' }} onKeyDown={(e) => e.stopPropagation()} /> : <div style={{ ...textStyle, width: 'auto', height: 'auto' }}>{layer.value}</div>}
            </div>
        </foreignObject>
    );
};

const SelectionBox = ({ id, onResizeHandlePointerDown }: { id: string, onResizeHandlePointerDown: (corner: number, bounds: XYWH) => void }) => {
    const layer = useStorage((root) => root.layers.get(id));
    if (!layer || (layer.type === 'Path' || layer.type === 'Eraser')) return null;
    const b = { x: layer.x, y: layer.y, width: layer.width, height: layer.height };
    return (
        <>
            <rect className="pointer-events-none" x={b.x} y={b.y} width={b.width} height={b.height} stroke="#3b82f6" strokeWidth={1} fill="transparent" />
            <rect className="cursor-nwse-resize fill-white stroke-[#3b82f6]" x={b.x - 4} y={b.y - 4} width={HANDLE_WIDTH} height={HANDLE_WIDTH} onPointerDown={(e) => { e.stopPropagation(); onResizeHandlePointerDown(Side.Top | Side.Left, b) }} />
            <rect className="cursor-nesw-resize fill-white stroke-[#3b82f6]" x={b.x + b.width - 4} y={b.y - 4} width={HANDLE_WIDTH} height={HANDLE_WIDTH} onPointerDown={(e) => { e.stopPropagation(); onResizeHandlePointerDown(Side.Top | Side.Right, b) }} />
            <rect className="cursor-nesw-resize fill-white stroke-[#3b82f6]" x={b.x - 4} y={b.y + b.height - 4} width={HANDLE_WIDTH} height={HANDLE_WIDTH} onPointerDown={(e) => { e.stopPropagation(); onResizeHandlePointerDown(Side.Bottom | Side.Left, b) }} />
            <rect className="cursor-nwse-resize fill-white stroke-[#3b82f6]" x={b.x + b.width - 4} y={b.y + b.height - 4} width={HANDLE_WIDTH} height={HANDLE_WIDTH} onPointerDown={(e) => { e.stopPropagation(); onResizeHandlePointerDown(Side.Bottom | Side.Right, b) }} />
            <rect className="cursor-ns-resize fill-white stroke-[#3b82f6]" x={b.x + b.width / 2 - 4} y={b.y - 4} width={HANDLE_WIDTH} height={HANDLE_WIDTH} onPointerDown={(e) => { e.stopPropagation(); onResizeHandlePointerDown(Side.Top, b) }} />
            <rect className="cursor-ns-resize fill-white stroke-[#3b82f6]" x={b.x + b.width / 2 - 4} y={b.y + b.height - 4} width={HANDLE_WIDTH} height={HANDLE_WIDTH} onPointerDown={(e) => { e.stopPropagation(); onResizeHandlePointerDown(Side.Bottom, b) }} />
            <rect className="cursor-ew-resize fill-white stroke-[#3b82f6]" x={b.x - 4} y={b.y + b.height / 2 - 4} width={HANDLE_WIDTH} height={HANDLE_WIDTH} onPointerDown={(e) => { e.stopPropagation(); onResizeHandlePointerDown(Side.Left, b) }} />
            <rect className="cursor-ew-resize fill-white stroke-[#3b82f6]" x={b.x + b.width - 4} y={b.y + b.height / 2 - 4} width={HANDLE_WIDTH} height={HANDLE_WIDTH} onPointerDown={(e) => { e.stopPropagation(); onResizeHandlePointerDown(Side.Right, b) }} />
        </>
    );
};

interface DrawingPathProps { pathPoints: Point[]; fillColor?: Color; strokeColor?: Color; strokeWidth?: number; isEraser?: boolean; }
function DrawingPath({ pathPoints, strokeColor, strokeWidth, isEraser, ...props }: DrawingPathProps & React.SVGProps<SVGPathElement>) {
    const d = pathPoints.reduce((acc: any, point: any, i: any, a: any) => {
        if (i === 0) return `M ${point.x} ${point.y}`;
        const p0 = a[i - 1]; const midPoint = { x: p0.x + (point.x - p0.x) / 2, y: p0.y + (point.y - p0.y) / 2 };
        return `${acc} Q ${p0.x} ${p0.y} ${midPoint.x} ${midPoint.y}`;
    }, "");
    return <path d={d} fill="none" stroke={isEraser ? CANVAS_BG_COLOR : `rgb(${strokeColor?.r ?? 0}, ${strokeColor?.g ?? 0}, ${strokeColor?.b ?? 0})`} strokeWidth={strokeWidth || 5} strokeLinecap="round" strokeLinejoin="round" {...props} />;
}

const Cursors = () => {
    const others = useOthers();
    return <>{others.map(({ connectionId, presence, info }) => presence.cursor ? <Cursor key={connectionId} x={presence.cursor.x} y={presence.cursor.y} color={presence.penColor ? `rgb(${presence.penColor.r}, ${presence.penColor.g}, ${presence.penColor.b})` : '#3b82f6'} name={info?.name} /> : null)}</>;
}

const Cursor = ({ x, y, color, name }: { x: number, y: number, color: string, name?: string }) => (
    <g transform={`translate(${x}, ${y})`}><path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z" fill={color} />{name && <text x="16" y="24" className="text-xs font-semibold fill-slate-700 bg-white/80 px-1 rounded">{name}</text>}</g>
);