import { X, LayoutGrid } from 'lucide-react'; // Fix: Hapus import yang tidak terpakai

export type LayoutMode = 'auto' | 'grid' | 'spotlight' | 'sidebar';

interface LayoutSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentLayout: LayoutMode;
    onLayoutChange: (mode: LayoutMode) => void;
    maxTiles: number;
    onMaxTilesChange: (tiles: number) => void;
    hideNoVideo: boolean;
    onHideNoVideoChange: (hide: boolean) => void;
}

// Fix: Pindahkan komponen Box KELUAR dari VisualIcon agar tidak dire-create saat render
// Terima 'color' sebagai props
const Box = ({ className, color }: { className?: string; color: string }) => (
    <div className={`rounded-[1px] ${color} ${className || ''}`} />
);

// Komponen Visual Ikon Kecil (Representasi UI)
const VisualIcon = ({ type, active }: { type: string, active: boolean }) => {
    const color = active ? "bg-blue-600" : "bg-slate-300";
    // Fix: Hapus variabel 'bg' yang tidak terpakai

    return (
        <div className={`w-8 h-6 rounded flex gap-0.5 p-0.5 ${active ? 'bg-blue-50 border border-blue-200' : 'bg-slate-100 border border-slate-200'}`}>
            {type === 'auto' && (
                <>
                    <Box color={color} className="flex-1 opacity-50" />
                    <Box color={color} className="flex-1 opacity-50" />
                    <Box color={color} className="flex-1 opacity-50" />
                </>
            )}
            {type === 'grid' && (
                <div className="grid grid-cols-3 gap-0.5 w-full h-full">
                    {[...Array(6)].map((_, i) => <Box key={i} color={color} className="w-full h-full" />)}
                </div>
            )}
            {type === 'spotlight' && (
                <Box color={color} className="w-full h-full" />
            )}
            {type === 'sidebar' && (
                <>
                    <Box color={color} className="w-[70%] h-full" />
                    <div className="flex flex-col gap-0.5 w-[30%] h-full">
                         <Box color={color} className="flex-1" />
                         <Box color={color} className="flex-1" />
                    </div>
                </>
            )}
        </div>
    );
};

export const LayoutSettingsModal = ({
    isOpen,
    onClose,
    currentLayout,
    onLayoutChange,
    maxTiles,
    onMaxTilesChange,
    hideNoVideo,
    onHideNoVideoChange
}: LayoutSettingsModalProps) => {
    if (!isOpen) return null;

    const options = [
        { id: 'auto', label: 'Otomatis (dinamis)' },
        { id: 'grid', label: 'Kotak (lama)' },
        { id: 'spotlight', label: 'Sorotan' },
        { id: 'sidebar', label: 'Sidebar' },
    ];

    return (
        // Fix: z-[60] -> z-60
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            {/* Fix: w-[420px] -> w-105 */}
            <div className="bg-white text-slate-900 w-105 max-w-[95vw] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-medium">Sesuaikan tampilan</h2>
                    <button onClick={onClose} className="text-slate-500 hover:bg-slate-100 p-2 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                    <p className="text-sm text-slate-500 -mt-2">
                        Pemilihan disimpan untuk rapat mendatang
                    </p>

                    {/* Radio Options */}
                    <div className="space-y-2">
                        {options.map((opt) => (
                            <label
                                key={opt.id}
                                className="group flex items-center justify-between cursor-pointer py-2 hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`
                                        w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                                        ${currentLayout === opt.id ? 'border-blue-600' : 'border-slate-400 group-hover:border-slate-600'}
                                    `}>
                                        {currentLayout === opt.id && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                                    </div>
                                    <span className={`text-sm ${currentLayout === opt.id ? 'font-medium text-slate-900' : 'text-slate-700'}`}>
                                        {opt.label}
                                    </span>
                                </div>
                                <VisualIcon type={opt.id} active={currentLayout === opt.id} />
                                
                                <input
                                    type="radio"
                                    name="layout"
                                    value={opt.id}
                                    checked={currentLayout === opt.id}
                                    onChange={() => onLayoutChange(opt.id as LayoutMode)}
                                    className="hidden"
                                />
                            </label>
                        ))}
                    </div>

                    {/* Slider */}
                    <div className="space-y-4 pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-end">
                            <div>
                                <h3 className="font-medium text-sm">Ubin</h3>
                                {/* Fix: max-w-[250px] -> max-w-62.5 */}
                                <p className="text-xs text-slate-500 mt-1 max-w-62.5">
                                    Jumlah maksimum potongan foto yang akan ditampilkan.
                                </p>
                            </div>
                            <span className="text-sm font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-600">{maxTiles}</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <LayoutGrid size={16} className="text-slate-400" />
                            <input
                                type="range"
                                min="6"
                                max="49"
                                step="1"
                                value={maxTiles}
                                onChange={(e) => onMaxTilesChange(Number(e.target.value))}
                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <LayoutGrid size={20} className="text-slate-600" />
                        </div>
                    </div>

                    {/* Toggle */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <span className="font-medium text-slate-700 text-sm">Sembunyikan kotak tanpa video</span>
                        <button
                            onClick={() => onHideNoVideoChange(!hideNoVideo)}
                            className={`
                                relative w-10 h-6 rounded-full transition-colors duration-200 ease-in-out
                                ${hideNoVideo ? 'bg-blue-600' : 'bg-slate-300'}
                            `}
                        >
                            <span className={`
                                block w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out mt-1 ml-1
                                ${hideNoVideo ? 'translate-x-4' : 'translate-x-0'}
                            `} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};