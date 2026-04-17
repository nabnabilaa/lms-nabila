// Advanced Quiz Builder - Standalone Page with Multiple Question Types & JSON Import
import { useState } from 'react';
import {
    Save, Plus, Trash2, Check, X, ChevronUp, ChevronDown, ArrowLeft,
    FileText, List, GripVertical, Code, Upload, Download
} from 'lucide-react';
import ConfirmModal from '../ui/ConfirmModal'; // NEW

export const QuizBuilder = ({ initialQuizData, onSave, onCancel }) => {
    const [quizTitle, setQuizTitle] = useState(initialQuizData?.title || 'Kuis Baru');
    const [showJsonEditor, setShowJsonEditor] = useState(false);
    const [jsonText, setJsonText] = useState('');
    const [questions, setQuestions] = useState(
        initialQuizData?.questions || [
            {
                id: Date.now(),
                type: 'multiple-choice', // multiple-choice, essay, drag-drop
                question: '',
                options: ['', '', '', ''],
                correctAnswer: 0, // for multiple-choice
                essayGuideline: '', // for essay
                dragItems: [] // for drag-drop
            }
        ]
    );

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        message: '',
        title: '',
        variant: 'confirm',
        confirmLabel: 'Ya',
        cancelLabel: 'Batal',
        onConfirm: null
    });

    const openConfirm = (payload) => {
        setConfirmModal({
            isOpen: true,
            title: payload.title || 'Konfirmasi',
            message: payload.message,
            variant: payload.variant || 'warning',
            confirmLabel: payload.confirmLabel || 'Ya, Lanjutkan',
            cancelLabel: payload.cancelLabel || 'Batal',
            onConfirm: payload.onConfirm
        });
    };

    const openAlert = (title, message, variant = 'info') => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            variant,
            confirmLabel: 'OK',
            cancelLabel: 'Tutup',
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    const questionTypes = [
        { value: 'multiple-choice', label: 'Pilihan Ganda', icon: List },
        { value: 'essay', label: 'Essay', icon: FileText },
        { value: 'drag-drop', label: 'Drag & Drop', icon: GripVertical }
    ];

    const addQuestion = (type = 'multiple-choice') => {
        const newQuestion = {
            id: Date.now(),
            type: type,
            question: '',
            options: type === 'multiple-choice' ? ['', '', '', ''] : undefined,
            correctAnswer: type === 'multiple-choice' ? 0 : undefined,
            essayGuideline: type === 'essay' ? '' : undefined,
            dragItems: type === 'drag-drop' ? ['', ''] : undefined
        };
        setQuestions([...questions, newQuestion]);
    };

    const removeQuestion = (index) => {
        if (questions.length === 1) {
            openAlert('Perhatian', 'Minimal harus ada 1 pertanyaan!', 'warning');
            return;
        }

        openConfirm({
            title: 'Hapus Pertanyaan',
            message: 'Anda yakin ingin menghapus pertanyaan ini?',
            variant: 'warning',
            confirmLabel: 'Ya, Hapus',
            onConfirm: () => {
                setQuestions(questions.filter((_, i) => i !== index));
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const updateQuestion = (index, field, value) => {
        const newQuestions = [...questions];
        newQuestions[index][field] = value;
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex, optIndex, value) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[optIndex] = value;
        setQuestions(newQuestions);
    };

    const addOption = (qIndex) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options.push('');
        setQuestions(newQuestions);
    };

    const removeOption = (qIndex, optIndex) => {
        const newQuestions = [...questions];
        if (newQuestions[qIndex].options.length <= 2) {
            openAlert('Perhatian', 'Minimal harus ada 2 pilihan!', 'warning');
            return;
        }
        newQuestions[qIndex].options.splice(optIndex, 1);
        if (newQuestions[qIndex].correctAnswer >= newQuestions[qIndex].options.length) {
            newQuestions[qIndex].correctAnswer = 0;
        }
        setQuestions(newQuestions);
    };

    const moveQuestion = (index, direction) => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === questions.length - 1)
        ) {
            return;
        }

        const newQuestions = [...questions];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newQuestions[index], newQuestions[targetIndex]] = [
            newQuestions[targetIndex],
            newQuestions[index]
        ];
        setQuestions(newQuestions);
    };

    const changeQuestionType = (qIndex, newType) => {
        const newQuestions = [...questions];
        const q = newQuestions[qIndex];

        // Reset type-specific fields
        if (newType === 'multiple-choice') {
            q.options = ['', '', '', ''];
            q.correctAnswer = 0;
            delete q.essayGuideline;
            delete q.dragItems;
        } else if (newType === 'essay') {
            q.essayGuideline = '';
            delete q.options;
            delete q.correctAnswer;
            delete q.dragItems;
        } else if (newType === 'drag-drop') {
            q.dragItems = ['', ''];
            delete q.options;
            delete q.correctAnswer;
            delete q.essayGuideline;
        }

        q.type = newType;
        setQuestions(newQuestions);
    };

    const exportToJson = () => {
        const quizData = { title: quizTitle, questions };
        const jsonStr = JSON.stringify(quizData, null, 2);
        setJsonText(jsonStr);
        setShowJsonEditor(true);
    };

    const importFromJson = () => {
        try {
            const parsed = JSON.parse(jsonText);
            if (parsed.title) setQuizTitle(parsed.title);
            if (parsed.questions && Array.isArray(parsed.questions)) {
                setQuestions(parsed.questions.map(q => ({ ...q, id: q.id || Date.now() + Math.random() })));
                setShowJsonEditor(false);
                openAlert("Berhasil", "✅ Quiz berhasil diimport dari JSON!", "confirm");
            } else {
                openAlert("Gagal", '❌ Format JSON tidak valid! Harus ada field "questions" sebagai array.', "danger");
            }
        } catch (err) {
            openAlert("Gagal", '❌ JSON Error: ' + err.message, "danger");
        }
    };

    const handleSave = () => {
        // Validation
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.question.trim()) {
                openAlert("Validasi Gagal", `Pertanyaan ${i + 1} tidak boleh kosong!`, 'warning');
                return;
            }

            if (q.type === 'multiple-choice') {
                for (let j = 0; j < q.options.length; j++) {
                    if (!q.options[j].trim()) {
                        openAlert("Validasi Gagal", `Pertanyaan ${i + 1}, Pilihan ${j + 1} tidak boleh kosong!`, 'warning');
                        return;
                    }
                }
            } else if (q.type === 'drag-drop') {
                if (q.dragItems.length < 2) {
                    openAlert("Validasi Gagal", `Pertanyaan ${i + 1} (Drag & Drop) harus punya minimal 2 item!`, 'warning');
                    return;
                }
                for (let j = 0; j < q.dragItems.length; j++) {
                    if (!q.dragItems[j].trim()) {
                        openAlert("Validasi Gagal", `Pertanyaan ${i + 1}, Drag item ${j + 1} tidak boleh kosong!`, 'warning');
                        return;
                    }
                }
            }
        }

        const quizData = { title: quizTitle, questions };
        onSave(quizData);
    };

    if (showJsonEditor) {
        return (
            <div className="min-h-screen bg-gray-900 p-8">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <Code className="w-6 h-6 text-green-400" />
                                <h2 className="text-2xl font-bold text-white">JSON Editor</h2>
                            </div>
                            <button
                                onClick={() => setShowJsonEditor(false)}
                                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <textarea
                            value={jsonText}
                            onChange={(e) => setJsonText(e.target.value)}
                            className="w-full h-[500px] bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg border border-gray-700 focus:ring-2 focus:ring-green-500 outline-none"
                            spellCheck={false}
                        />
                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => setShowJsonEditor(false)}
                                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={importFromJson}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-bold"
                            >
                                <Upload className="w-4 h-4" /> Import Quiz
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Fixed Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-6xl mx-auto px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onCancel}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Quiz Builder</h1>
                                <p className="text-sm text-gray-500">{questions.length} Pertanyaan</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={exportToJson}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 font-medium"
                            >
                                <Download className="w-4 h-4" /> Export JSON
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md"
                            >
                                <Save className="w-4 h-4" /> Simpan Quiz
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto p-8">
                {/* Quiz Title */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        Judul Kuis
                    </label>
                    <input
                        type="text"
                        value={quizTitle}
                        onChange={(e) => setQuizTitle(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Misal: Quiz Modul 1 - Laravel Basics"
                    />
                </div>

                {/* Questions */}
                <div className="space-y-6">
                    {questions.map((q, qIndex) => (
                        <div
                            key={q.id}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative group"
                        >
                            {/* Question Number Badge */}
                            <div className="absolute -left-3 -top-3 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg z-10">
                                {qIndex + 1}
                            </div>

                            {/* Actions */}
                            <div className="absolute right-4 top-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => moveQuestion(qIndex, 'up')}
                                    disabled={qIndex === 0}
                                    className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30"
                                    title="Move up"
                                >
                                    <ChevronUp className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => moveQuestion(qIndex, 'down')}
                                    disabled={qIndex === questions.length - 1}
                                    className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30"
                                    title="Move down"
                                >
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => removeQuestion(qIndex)}
                                    className="p-1.5 hover:bg-red-50 rounded text-red-500"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Question Type Selector */}
                            <div className="mb-4 pr-24">
                                <label className="block text-xs font-bold text-gray-600 mb-2">Tipe Soal</label>
                                <div className="flex gap-2">
                                    {questionTypes.map((type) => {
                                        const Icon = type.icon;
                                        return (
                                            <button
                                                key={type.value}
                                                onClick={() => changeQuestionType(qIndex, type.value)}
                                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${q.type === type.value
                                                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-500'
                                                    : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                                                    }`}
                                            >
                                                <Icon className="w-4 h-4" /> {type.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Question Text */}
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Pertanyaan
                                </label>
                                <textarea
                                    value={q.question}
                                    onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                    rows="2"
                                    placeholder="Tulis pertanyaan di sini..."
                                />
                            </div>

                            {/* Type-Specific Content */}
                            {q.type === 'multiple-choice' && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-gray-700">
                                        Pilihan Jawaban <span className="text-gray-400 font-normal">(klik radio untuk jawaban benar)</span>
                                    </label>
                                    {q.options.map((option, optIndex) => (
                                        <div key={optIndex} className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name={`correct-${qIndex}`}
                                                checked={q.correctAnswer === optIndex}
                                                onChange={() => updateQuestion(qIndex, 'correctAnswer', optIndex)}
                                                className="w-5 h-5 text-green-600 cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={option}
                                                onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                                                className={`flex-1 px-4 py-2.5 border rounded-lg outline-none ${q.correctAnswer === optIndex
                                                    ? 'border-green-500 bg-green-50 font-medium'
                                                    : 'border-gray-300 focus:ring-2 focus:ring-indigo-200'
                                                    }`}
                                                placeholder={`Pilihan ${String.fromCharCode(65 + optIndex)}`}
                                            />
                                            {q.correctAnswer === optIndex && (
                                                <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                                                    <Check className="w-3 h-3" /> Benar
                                                </span>
                                            )}
                                            <button
                                                onClick={() => removeOption(qIndex, optIndex)}
                                                className="p-2 hover:bg-red-50 rounded text-red-500"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => addOption(qIndex)}
                                        className="text-sm text-indigo-600 font-medium flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" /> Tambah Pilihan
                                    </button>
                                </div>
                            )}

                            {q.type === 'essay' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Panduan Jawaban (Opsional)
                                    </label>
                                    <textarea
                                        value={q.essayGuideline || ''}
                                        onChange={(e) => updateQuestion(qIndex, 'essayGuideline', e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                        rows="3"
                                        placeholder="Misal: Jawaban harus minimal 100 kata, jelaskan dengan contoh..."
                                    />
                                </div>
                            )}

                            {q.type === 'drag-drop' && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-gray-700">
                                        Item yang Bisa Di-drag
                                    </label>
                                    {(q.dragItems || []).map((item, itemIndex) => (
                                        <div key={itemIndex} className="flex items-center gap-3">
                                            <GripVertical className="w-5 h-5 text-gray-400" />
                                            <input
                                                type="text"
                                                value={item}
                                                onChange={(e) => {
                                                    const newQuestions = [...questions];
                                                    newQuestions[qIndex].dragItems[itemIndex] = e.target.value;
                                                    setQuestions(newQuestions);
                                                }}
                                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
                                                placeholder={`Item ${itemIndex + 1}`}
                                            />
                                            <button
                                                onClick={() => {
                                                    const newQuestions = [...questions];
                                                    newQuestions[qIndex].dragItems.splice(itemIndex, 1);
                                                    setQuestions(newQuestions);
                                                }}
                                                className="p-2 hover:bg-red-50 rounded text-red-500"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => {
                                            const newQuestions = [...questions];
                                            if (!newQuestions[qIndex].dragItems) newQuestions[qIndex].dragItems = [];
                                            newQuestions[qIndex].dragItems.push('');
                                            setQuestions(newQuestions);
                                        }}
                                        className="text-sm text-indigo-600 font-medium flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" /> Tambah Item
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Add Question Dropdown */}
                <div className="mt-6 border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-indigo-400 hover:bg-indigo-50 transition-all">
                    <p className="text-sm font-bold text-gray-600 mb-3">Tambah Pertanyaan Baru:</p>
                    <div className="flex gap-3">
                        {questionTypes.map((type) => {
                            const Icon = type.icon;
                            return (
                                <button
                                    key={type.value}
                                    onClick={() => addQuestion(type.value)}
                                    className="flex-1 py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all font-medium text-gray-700 hover:text-indigo-700 flex items-center justify-center gap-2"
                                >
                                    <Icon className="w-5 h-5" />
                                    {type.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                message={confirmModal.message}
                title={confirmModal.title}
                variant={confirmModal.variant}
                confirmLabel={confirmModal.confirmLabel}
                cancelLabel={confirmModal.cancelLabel}
            />
        </div>
    );
};
