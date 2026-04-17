import { useState, useEffect } from 'react';
import { SidePanel } from '../ui/SidePanel';
import { FileText, Download } from 'lucide-react';

interface NotesPanelProps {
    onClose: () => void;
}

export const NotesPanel = ({ onClose }: NotesPanelProps) => {
    const [notes, setNotes] = useState('');

    // Load from local storage on mount
    useEffect(() => {
        const savedNotes = localStorage.getItem('meeting-notes');
        if (savedNotes) {
            setNotes(savedNotes);
        }
    }, []);

    // Save to local storage on change
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setNotes(newValue);
        localStorage.setItem('meeting-notes', newValue);
    };

    const handleDownload = () => {
        const blob = new Blob([notes], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-notes-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <SidePanel
            title="Catatan Rapat"
            icon={FileText}
            onClose={onClose}
            width="w-96 md:w-[450px]"
        >
            <div className="flex-1 flex flex-col p-4 gap-4 h-full">
                <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5 text-xs text-slate-400">
                    Catatan ini tersimpan di browser Anda secara otomatis.
                </div>

                <textarea
                    className="flex-1 bg-slate-900/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 resize-none font-mono text-sm leading-relaxed"
                    placeholder="Tulis poin-poin penting rapat di sini..."
                    value={notes}
                    onChange={handleChange}
                />

                <div className="flex justify-end">
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-colors text-sm font-medium"
                    >
                        <Download size={16} />
                        Unduh Catatan
                    </button>
                </div>
            </div>
        </SidePanel>
    );
};
