// Quiz Builder Page - Standalone Route -> Connected to API
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Save, Plus, Trash2, Check, X, ChevronUp, ChevronDown, ArrowLeft,
    FileText, List, GripVertical, Code, Upload, Download, Loader, Sparkles
} from 'lucide-react';
import { contentService } from '../../services/contentService';
import ConfirmModal from '../../components/ui/ConfirmModal'; // NEW

export const QuizBuilderPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        message: '',
        title: '',
        variant: 'confirm',
        confirmLabel: 'Ya, Lanjutkan',
        cancelLabel: 'Batal',
        onConfirm: null
    });

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

    const openConfirm = (title, message, onConfirm, variant = 'warning', confirmLabel = 'Ya, Lanjutkan') => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            variant,
            confirmLabel,
            cancelLabel: 'Batal',
            onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                onConfirm();
            }
        });
    };

    // Get initial data from navigation state (if coming from Course Modules list)
    // We expect `contentId` to be passed if editing an existing quiz.
    const initialData = location.state?.quizData;
    const contentId = location.state?.contentId;
    const returnPath = location.state?.returnPath || '/admin'; // Make this dynamic

    const [quizTitle, setQuizTitle] = useState(initialData?.title || 'Kuis Baru');
    const [showJsonEditor, setShowJsonEditor] = useState(false);
    const [editorMode, setEditorMode] = useState('export'); // 'import' or 'export'
    const [jsonText, setJsonText] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // Validation State
    const [validationStatus, setValidationStatus] = useState({ isValid: false, message: '', type: null });

    // File input ref for importing
    const fileInputRef = useRef(null);

    const [questions, setQuestions] = useState(
        initialData?.questions || [
            {
                id: Date.now(),
                type: 'multiple-choice',
                question: '',
                options: ['', '', '', ''],
                correctAnswer: 0
            }
        ]
    );

    const handleSave = async () => {
        // Validation
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];

            if (!q.question.trim()) {
                openAlert("Validasi Gagal", `Pertanyaan ${i + 1} tidak boleh kosong!`, "danger");
                return;
            }

            if (q.type === 'multiple-choice') {
                for (let j = 0; j < q.options.length; j++) {
                    if (!q.options[j].trim()) {
                        openAlert("Validasi Gagal", `Pertanyaan ${i + 1}, Pilihan ${j + 1} tidak boleh kosong!`, "danger");
                        return;
                    }
                }
            } else if (q.type === 'drag-drop') {
                if (q.dragItems && q.dragItems.length < 2) {
                    openAlert("Validasi Gagal", `Pertanyaan ${i + 1} (Drag & Drop) harus punya minimal 2 item!`, "danger");
                    return;
                }
                if (q.dragItems) {
                    for (let j = 0; j < q.dragItems.length; j++) {
                        if (!q.dragItems[j].trim()) {
                            openAlert("Validasi Gagal", `Pertanyaan ${i + 1}, Drag item ${j + 1} tidak boleh kosong!`, "danger");
                            return;
                        }
                    }
                }
            }
        }

        const quizData = { title: quizTitle, questions };

        // Save logic
        if (contentId) {
            try {
                setSaving(true);
                await contentService.updateQuiz(contentId, quizData);
                openAlert("Berhasil", "✅ Kuis berhasil disimpan!", "success");
                setTimeout(() => navigate(returnPath, { state: { quizSaved: true } }), 1000);
            } catch (err) {
                console.error("Save failed:", err);
                openAlert("Gagal", "Gagal menyimpan kuis: " + (err.response?.data?.message || err.message), "danger");
            } finally {
                setSaving(false);
            }
        } else {
            // Fallback for standalone demo without ID - just save to session
            console.warn("No contentId provided, saving to sessionStorage only.");
            sessionStorage.setItem('quizBuilderResult', JSON.stringify(quizData));
            navigate(returnPath, { state: { quizSaved: true } });
        }
    };

    const handleCancel = () => {
        openConfirm(
            'Konfirmasi Pembatalan',
            'Batalkan perubahan? Perubahan tidak akan disimpan.',
            () => navigate(returnPath),
            'warning',
            'Ya, Batalkan'
        );
    };

    // Validation Effect
    useEffect(() => {
        if (editorMode !== 'import' || !jsonText.trim()) {
            setValidationStatus({ isValid: false, message: '', type: null });
            return;
        }

        // Try JSON
        if (jsonText.trim().startsWith('{') || jsonText.trim().startsWith('[')) {
            try {
                const parsed = JSON.parse(jsonText);
                if (Array.isArray(parsed) || (parsed.questions && Array.isArray(parsed.questions))) {
                    setValidationStatus({ isValid: true, message: '✅ Valid JSON Format', type: 'json' });
                    return;
                }
            } catch (e) {
                // Ignore JSON parse error, might be text
            }
        }

        // Try Text
        const txtQuestions = parseTxtQuiz(jsonText);
        if (txtQuestions.length > 0) {
            setValidationStatus({ isValid: true, message: `✅ Valid Text Format (${txtQuestions.length} Questions detected)`, type: 'txt' });
        } else {
            // If neither, then it's invalid
            setValidationStatus({ isValid: false, message: '⚠️ Unknown Format. Use "Format with AI" to fix.', type: 'error' });
        }

    }, [jsonText, editorMode]);

    // Fetch existing quiz if contentId is present
    useEffect(() => {
        if (contentId) {
            const fetchWrapper = async () => {
                try {
                    setLoading(true);
                    const content = await contentService.getContent(contentId);
                    setQuizTitle(content.title);

                    if (content.body) {
                        try {
                            const parsedQuestions = typeof content.body === 'string' ? JSON.parse(content.body) : content.body;
                            if (Array.isArray(parsedQuestions)) {
                                const normalized = parsedQuestions.map(q => {
                                    let type = (q.type || 'multiple-choice').toLowerCase();
                                    // Normalize common variations
                                    if (type === 'multiple choice') type = 'multiple-choice';
                                    if (type === 'drag and drop') type = 'drag-drop';

                                    // Normalize keys (correct -> correctAnswer)
                                    const correctAnswer = q.correct !== undefined ? q.correct : q.correctAnswer;

                                    return { ...q, type, correctAnswer };
                                });
                                setQuestions(normalized);
                            }
                        } catch (e) {
                            console.error("Failed to parse existing quiz body", e);
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch content:", err);
                    openAlert("Error", "Gagal memuat data kuis.", "danger");
                } finally {
                    setLoading(false);
                }
            };
            fetchWrapper();
        }
    }, [contentId]);

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
            openAlert("Warning", "Minimal harus ada 1 pertanyaan!", "warning");
            return;
        }
        setQuestions(questions.filter((_, i) => i !== index));
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
            openAlert("Warning", "Minimal harus ada 2 pilihan!", "warning");
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

        if (newType === 'multiple-choice') {
            if (!q.options || q.options.length === 0) {
                q.options = ['', '', '', ''];
                q.correctAnswer = 0;
            }
            // Preserve other fields
        } else if (newType === 'essay') {
            if (q.essayGuideline === undefined) {
                q.essayGuideline = '';
            }
        } else if (newType === 'drag-drop') {
            if (!q.dragItems || q.dragItems.length === 0) {
                q.dragItems = ['', ''];
            }
        }

        q.type = newType;
        setQuestions(newQuestions);
    };

    const exportToJson = () => {
        const quizData = { title: quizTitle, questions };
        const jsonStr = JSON.stringify(quizData, null, 2);
        setJsonText(jsonStr);
        setEditorMode('export');
        setShowJsonEditor(true);
    };

    const openImportModal = () => {
        setJsonText('');
        setEditorMode('import');
        setShowJsonEditor(true);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(jsonText);
        openAlert("Info", "Copied to clipboard!", "success");
    };

    const downloadFile = () => {
        const blob = new Blob([jsonText], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quiz-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const parseTxtQuiz = (text) => {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        const newQuestions = [];
        let currentQ = null;

        lines.forEach(line => {
            // Detect Question (starts with number like "1.")
            if (/^\d+[\.)]/.test(line)) {
                if (currentQ) newQuestions.push(currentQ);
                currentQ = {
                    id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                    type: 'multiple-choice',
                    question: line.replace(/^\d+[\.)]\s*/, ''),
                    options: [],
                    correctAnswer: 0
                };
            }
            // Detect Option (starts with "a.", "b)", etc)
            else if (/^[a-eA-E][\.)]/.test(line) && currentQ) {
                currentQ.options.push(line.replace(/^[a-eA-E][\.)]\s*/, ''));
            }
            // Detect Answer (starts with "Answer:", "Jawaban:", "Kunci:")
            else if (/^(Answer|Jawaban|Kunci)\s*[:=]\s*/i.test(line) && currentQ) {
                const ansChar = line.toUpperCase().match(/([A-E])/);
                if (ansChar) {
                    currentQ.correctAnswer = ansChar[1].charCodeAt(0) - 65;
                }
            }
            // Append continuation text to question if no other match
            else if (currentQ && currentQ.options.length === 0) {
                currentQ.question += ' ' + line;
            }
        });
        if (currentQ) newQuestions.push(currentQ);
        return newQuestions;
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setJsonText(event.target.result);
        };
        reader.readAsText(file);
    };

    const generateWithAI = async () => {
        if (!jsonText.trim()) {
            openAlert("Info", "Silakan paste teks soal terlebih dahulu!", "info");
            return;
        }

        try {
            setIsGeneratingAI(true);
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // Use Env Variable
            const prompt = `
                Analyze the following text and convert it into a JSON quiz format. 
                Determine the most suitable question type for each question: 'multiple-choice', 'essay', or 'drag-drop'.
                
                Rules:
                1. If it has options (a, b, c, etc.), it is 'multiple-choice'. Identify the correct answer if implied (e.g. marked with * or explicitly stated). If not found, default to 0.
                2. If it asks for an explanation, opinion, or long answer, it is 'essay'.
                3. If it involves matching, sorting, or ordering, it is 'drag-drop'.
                
                Output JSON ONLY:
                {
                  "questions": [
                    {
                      "type": "multiple-choice" | "essay" | "drag-drop",
                      "question": "string",
                      "options": ["string", "string", "string", "string"], // Only for multiple-choice (ensure 4 items)
                      "correctAnswer": number, // Index 0-3 (multiple-choice only)
                      "essayGuideline": "string", // Optional guideline for essay
                      "dragItems": ["string", "string"] // Items for drag-drop (min 2)
                    }
                  ]
                }
                
                Text to process:
                ${jsonText}
            `;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            });

            const data = await response.json();
            if (data.candidates && data.candidates[0].content) {
                let aiText = data.candidates[0].content.parts[0].text;
                // Cleanup code blocks if AI returns markdown
                aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
                setJsonText(aiText);
                openAlert("Berhasil", "✨ AI successfully formatted your questions!", "success");
            } else {
                throw new Error('No response from AI');
            }

        } catch (err) {
            console.error(err);
            openAlert("Gagal", "AI Generation Failed: " + err.message, "danger");
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleImport = () => {
        try {
            // Try JSON first
            if (jsonText.trim().startsWith('{') || jsonText.trim().startsWith('[')) {
                const parsed = JSON.parse(jsonText);
                let questionsToSet = [];

                if (Array.isArray(parsed.questions)) {
                    questionsToSet = parsed.questions;
                } else if (parsed.title && Array.isArray(parsed.questions)) {
                    setQuizTitle(parsed.title);
                    questionsToSet = parsed.questions;
                } else if (Array.isArray(parsed)) {
                    questionsToSet = parsed;
                }

                if (questionsToSet.length > 0) {
                    const normalized = questionsToSet.map((q, index) => {
                        let type = (q.type || 'multiple-choice').toLowerCase();
                        if (type === 'multiple choice') type = 'multiple-choice';
                        if (type === 'drag and drop') type = 'drag-drop';
                        const correctAnswer = q.correct !== undefined ? q.correct : q.correctAnswer;
                        // Always regenerate ID to prevent duplicates from manual copy-paste
                        const uniqueId = Date.now() + '-' + index + '-' + Math.random().toString(36).substr(2, 9);
                        return { ...q, type, correctAnswer, id: uniqueId };
                    });

                    setQuestions(normalized);
                    setShowJsonEditor(false);
                    openAlert("Berhasil", "✅ JSON Import Successful!", "success");
                    return;
                }
            }

            // Try Text Parsing if JSON failed or didn't match
            const txtQuestions = parseTxtQuiz(jsonText);
            if (txtQuestions.length > 0) {
                setQuestions(txtQuestions);
                setShowJsonEditor(false);
                openAlert("Berhasil", "✅ TXT Import Successful!", "success");
            } else {
                throw new Error("Could not parse as JSON or valid Text Quiz format.");
            }

        } catch (err) {
            openAlert("Gagal", "❌ Import Failed: " + err.message, "danger");
        }
    };

    if (showJsonEditor) {
        return (
            <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-95 flex justify-center items-center p-4">
                <div className="bg-gray-800 w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-700 flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${editorMode === 'export' ? 'bg-green-500/20' : 'bg-indigo-500/20'}`}>
                                {editorMode === 'export' ? <Download className="w-6 h-6 text-green-400" /> : <Upload className="w-6 h-6 text-indigo-400" />}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    {editorMode === 'export' ? 'Export Quiz JSON' : 'Import Quiz'}
                                </h2>
                                <p className="text-gray-400 text-sm">
                                    {editorMode === 'export'
                                        ? 'Copy or download the JSON below.'
                                        : 'Paste JSON or plain text format to import.'}
                                </p>
                                {editorMode === 'import' && validationStatus.message && (
                                    <p className={`text-xs font-bold mt-1 ${validationStatus.isValid ? 'text-green-400' : 'text-yellow-400'}`}>
                                        {validationStatus.message}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => setShowJsonEditor(false)}
                            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Toolbar - Only for Export */}
                    {editorMode === 'export' && (
                        <div className="flex gap-2 p-4 bg-gray-800/50 border-b border-gray-700">
                            <button
                                onClick={copyToClipboard}
                                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-md transition-colors flex items-center gap-2"
                            >
                                <span className="text-xs">📋</span> Copy
                            </button>
                            <button
                                onClick={downloadFile}
                                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-md transition-colors flex items-center gap-2"
                            >
                                <Download className="w-3 h-3" /> Download JSON
                            </button>
                        </div>
                    )}

                    {/* Toolbar - Only for Import */}
                    {editorMode === 'import' && (
                        <div className="flex gap-2 p-4 bg-gray-800/50 border-b border-gray-700">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept=".json,.txt"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-md transition-colors flex items-center gap-2"
                            >
                                <Upload className="w-3 h-3" /> Upload File (JSON/TXT)
                            </button>
                            <div className="h-6 w-px bg-gray-600 mx-2"></div>
                            <button
                                onClick={generateWithAI}
                                disabled={isGeneratingAI}
                                className={`px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-md transition-colors flex items-center gap-2 shadow-lg shadow-indigo-900/30 ${isGeneratingAI ? 'opacity-50 cursor-wait' : ''}`}
                            >
                                {isGeneratingAI ? <Loader className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                {isGeneratingAI ? 'Processing...' : 'Format with AI'}
                            </button>
                        </div>
                    )}

                    {/* Editor */}
                    <div className="flex-1 p-0 relative">
                        <textarea
                            value={jsonText}
                            onChange={(e) => setJsonText(e.target.value)}
                            readOnly={editorMode === 'export'}
                            className={`w-full h-full min-h-[400px] bg-gray-900 text-gray-300 font-mono text-sm p-6 focus:outline-none resize-none ${editorMode === 'export' ? 'cursor-text' : ''}`}
                            spellCheck={false}
                            placeholder={editorMode === 'import' ? `Paste JSON here OR use Text format:\n\n1. Question text?\na) Option 1\nb) Option 2\nAnswer: a` : ''}
                        />
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-700 flex justify-end gap-3 bg-gray-800 rounded-b-2xl">
                        <button
                            onClick={() => setShowJsonEditor(false)}
                            className="px-6 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                        >
                            {editorMode === 'export' ? 'Selesai' : 'Batal'}
                        </button>
                        {editorMode === 'import' && (
                            <button
                                onClick={handleImport}
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-bold shadow-lg shadow-indigo-900/20"
                            >
                                <Upload className="w-4 h-4" /> Import Data
                            </button>
                        )}
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
                                onClick={handleCancel}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Kembali"
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
                                onClick={openImportModal}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 font-medium"
                            >
                                <Upload className="w-4 h-4" /> Import JSON
                            </button>
                            <button
                                onClick={exportToJson}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 font-medium"
                            >
                                <Download className="w-4 h-4" /> Export JSON
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className={`px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md ${saving ? 'opacity-70 cursor-wait' : ''}`}
                            >
                                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {saving ? 'Menyimpan...' : 'Simpan Quiz'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - SCROLLABLE */}
            <div className="max-w-6xl mx-auto p-8 pb-32">
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
                                <div className="flex gap-2 flex-wrap">
                                    {questionTypes.map((type) => {
                                        const Icon = type.icon;
                                        return (
                                            <button
                                                key={type.value}
                                                onClick={() => changeQuestionType(qIndex, type.value)}
                                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${(q.type || '').toLowerCase() === type.value.toLowerCase()
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

                            {/* Multiple Choice */}
                            {(q.type || 'multiple-choice').toLowerCase() === 'multiple-choice' && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-gray-700">
                                        Pilihan Jawaban <span className="text-gray-400 font-normal">(klik radio untuk jawaban benar)</span>
                                    </label>
                                    {q.options.map((option, optIndex) => (
                                        <div key={optIndex} className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name={`correct-${qIndex}`}
                                                checked={Number(q.correctAnswer) === optIndex}
                                                onChange={() => updateQuestion(qIndex, 'correctAnswer', optIndex)}
                                                className="w-5 h-5 text-green-600 cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={option}
                                                onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                                                className={`flex-1 px-4 py-2.5 border rounded-lg outline-none ${Number(q.correctAnswer) === optIndex
                                                    ? 'border-green-500 bg-green-50 font-medium'
                                                    : 'border-gray-300 focus:ring-2 focus:ring-indigo-200'
                                                    }`}
                                                placeholder={`Pilihan ${String.fromCharCode(65 + optIndex)}`}
                                            />
                                            {Number(q.correctAnswer) === optIndex && (
                                                <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full flex items-center gap-1 shrink-0">
                                                    <Check className="w-3 h-3" /> Benar
                                                </span>
                                            )}
                                            <button
                                                onClick={() => removeOption(qIndex, optIndex)}
                                                className="p-2 hover:bg-red-50 rounded text-red-500 shrink-0"
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

                            {/* Essay */}
                            {(q.type || '').toLowerCase() === 'essay' && (
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

                            {/* Drag & Drop */}
                            {(q.type || '').toLowerCase() === 'drag-drop' && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-gray-700">
                                        Item yang Bisa Di-drag
                                    </label>
                                    {(q.dragItems || []).map((item, itemIndex) => (
                                        <div key={itemIndex} className="flex items-center gap-3">
                                            <GripVertical className="w-5 h-5 text-gray-400 shrink-0" />
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
                                                className="p-2 hover:bg-red-50 rounded text-red-500 shrink-0"
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

                {/* Add Question Section */}
                <div className="mt-6 border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-indigo-400 hover:bg-indigo-50 transition-all">
                    <p className="text-sm font-bold text-gray-600 mb-3">Tambah Pertanyaan Baru:</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {questionTypes.map((type) => {
                            const Icon = type.icon;
                            return (
                                <button
                                    key={type.value}
                                    onClick={() => addQuestion(type.value)}
                                    className="py-4 bg-white border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all font-medium text-gray-700 hover:text-indigo-700 flex items-center justify-center gap-2"
                                >
                                    <Icon className="w-5 h-5" />
                                    {type.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
