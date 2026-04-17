// Lesson Player Page - Connected to API
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, ChevronRight, Play, Maximize, Share2, CheckCircle,
    PlayCircle, Clock, Video, FileText, HelpCircle, Menu, RefreshCw, Eye, Terminal, Code, RotateCcw
} from 'lucide-react';
import { courseService } from '../services/courseService';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { getTrans } from '../lib/transHelper';

// --- Sub-Components ---

const ArticleView = ({ content }) => {
    // Simple Markdown Parser
    const parseMarkdown = (text) => {
        if (!text) return "";
        // If text is a translation object {en: "...", id: "..."}, extract best match
        if (typeof text === 'object') {
            const lang = navigator.language?.split('-')[0] || 'en';
            text = text[lang] || text['id'] || text['en'] || Object.values(text)[0] || "";
        }
        if (typeof text !== 'string') return "";
        let html = text
            .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-gray-800 mt-6 mb-3">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-gray-900 mt-8 mb-4 border-b pb-2">$1</h2>')
            .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-gray-900 mb-6">$1</h1>')
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" class="text-blue-600 hover:underline">$1</a>')
            .replace(/```bash([\s\S]*?)```/gim, '<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg my-4 overflow-x-auto"><code>$1</code></pre>')
            .replace(/\n/gim, '<br />');
        return html;
    };

    return (
        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-200 min-h-[500px]">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-3 text-gray-500 text-sm mb-6 uppercase tracking-wider font-bold">
                    <FileText className="w-4 h-4" />
                    Article Content
                </div>
                <div
                    className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(content.body || content.description) }}
                />
            </div>
        </div>
    );
};

// Helper: safely extract a plain string from content.body which may be a translation object
const getBodyString = (body) => {
    if (!body) return '';
    if (typeof body === 'string') return body;
    if (typeof body === 'object') {
        const lang = navigator.language?.split('-')[0] || 'en';
        return body[lang] || body['id'] || body['en'] || Object.values(body)[0] || '';
    }
    return '';
};

const QuizView = ({ content, onComplete, userProgress, canPreview }) => {
    const [questions, setQuestions] = useState([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [selectedOption, setSelectedOption] = useState(null);
    const [userAnswers, setUserAnswers] = useState({}); // Map: questionIndex -> optionIndex
    const [isReviewMode, setIsReviewMode] = useState(false);

    useEffect(() => {
        try {
            const bodyStr = getBodyString(content.body);
            const parsed = bodyStr ? JSON.parse(bodyStr) : (Array.isArray(content.body) ? content.body : []);
            if (Array.isArray(parsed)) {
                setQuestions(parsed);

                // Check for existing progress
                if (userProgress && userProgress.completed) {
                    const savedAnswers = userProgress.answers || {}; // Assuming array or object
                    const answersMap = Array.isArray(savedAnswers)
                        ? savedAnswers.reduce((acc, val, idx) => ({ ...acc, [idx]: val }), {})
                        : savedAnswers;

                    setUserAnswers(answersMap);

                    // Calculate score from saved answers
                    let savedScore = 0;
                    parsed.forEach((q, idx) => {
                        if (answersMap[idx] === q.correct) {
                            savedScore++;
                        }
                    });
                    setScore(savedScore);
                    setShowResult(true);
                    setIsReviewMode(true);
                } else {
                    // Reset states for fresh start
                    setCurrentQIndex(0);
                    setScore(0);
                    setShowResult(false);
                    setSelectedOption(null);
                    setUserAnswers({});
                    setIsReviewMode(false);
                }
            }
        } catch (e) {
            console.error("Failed to parse quiz JSON", e);
        }
    }, [content, userProgress]);

    const handleAnswer = (optionIndex) => {
        if (isReviewMode) return; // Disable interaction in review mode
        setSelectedOption(optionIndex);
    };

    const handleNext = () => {
        const isCorrect = selectedOption === questions[currentQIndex].correct;

        // Save answer locally
        const newAnswers = { ...userAnswers, [currentQIndex]: selectedOption };
        setUserAnswers(newAnswers);

        if (isCorrect) {
            setScore(s => s + 1);
        }

        if (currentQIndex < questions.length - 1) {
            setCurrentQIndex(prev => prev + 1);
            setSelectedOption(null);
        } else {
            setShowResult(true);
            if (onComplete) onComplete({ score: isCorrect ? score + 1 : score, answers: newAnswers });
        }
    };

    if (questions.length === 0) return <div className="p-10 text-center">Loading Quiz...</div>;

    if (showResult && !isReviewMode) {
        // ... (Show Result logic - same as before but maybe a button to "Review Answers" which sets review mode?)
        // For simplicity, let's just use the same Result View but with "Review Questions" button
    }

    if (showResult) {
        const percentage = Math.round((score / questions.length) * 100);
        return (
            <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-200 text-center min-h-[400px] flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-12 h-12 text-blue-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {isReviewMode ? 'Sudah Dikerjakan' : 'Quiz Completed!'}
                </h2>
                <p className="text-gray-500 mb-6">Score: {score} out of {questions.length}</p>

                <div className="text-5xl font-bold text-blue-600 mb-8">{percentage}%</div>

                <div className="flex gap-4">
                    <button
                        onClick={() => {
                            setShowResult(false);
                            setIsReviewMode(true); // Allow browsing questions
                            setCurrentQIndex(0);
                            // Set selected option to the saved answer for the first question
                            setSelectedOption(userAnswers[0]);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
                    >
                        <FileText className="w-5 h-5" /> Lihat Jawaban
                    </button>
                    {!isReviewMode && (
                        <button
                            onClick={() => {
                                setShowResult(false);
                                setCurrentQIndex(0);
                                setScore(0);
                                setSelectedOption(null);
                                setUserAnswers({});
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200"
                        >
                            <RefreshCw className="w-5 h-5" /> Try Again
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const currentQ = questions[currentQIndex];
    // In review mode, determine selected option from saved answers
    const currentSelected = isReviewMode ? userAnswers[currentQIndex] : selectedOption;

    return (
        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-200 min-h-[500px] flex flex-col">
            <div className="max-w-2xl mx-auto w-full flex-1">
                <div className="flex justify-between items-center mb-8">
                    <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">
                        Question {currentQIndex + 1} of {questions.length}
                    </span>
                    <div className="flex items-center gap-2">
                        {canPreview && (
                            <button
                                onClick={() => setIsReviewMode(!isReviewMode)}
                                className="text-xs font-bold bg-purple-100 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-200 transition-colors"
                            >
                                {isReviewMode ? 'Hide Answers' : 'Show Answers (Preview)'}
                            </button>
                        )}
                        <span className="text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                            {isReviewMode ? 'Review Mode' : 'Quiz Mode'}
                        </span>
                    </div>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-8 leading-snug">
                    {currentQ.question}
                </h3>

                <div className="space-y-4 mb-8">
                    {currentQ.options.map((opt, idx) => {
                        const isSelected = currentSelected === idx;
                        const isCorrect = currentQ.correct === idx;
                        // In review mode, show correct/incorrect indicators
                        let borderClass = 'border-gray-100';
                        let bgClass = '';
                        let textClass = 'text-gray-700';

                        if (isSelected) {
                            borderClass = isReviewMode
                                ? (isCorrect ? 'border-green-500' : 'border-red-500')
                                : 'border-blue-600';
                            bgClass = isReviewMode
                                ? (isCorrect ? 'bg-green-50' : 'bg-red-50')
                                : 'bg-blue-50/50';
                            textClass = isReviewMode
                                ? (isCorrect ? 'text-green-700' : 'text-red-700')
                                : 'text-blue-700';
                        } else if (isReviewMode && isCorrect) {
                            // Show correct answer even if not selected
                            borderClass = 'border-green-500';
                            bgClass = 'bg-white';
                            textClass = 'text-green-700';
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(idx)}
                                disabled={isReviewMode}
                                className={`w-full p-4 text-left rounded-xl border-2 transition-all flex items-center justify-between group ${borderClass} ${bgClass} ${!isReviewMode && 'hover:border-blue-200 hover:bg-gray-50'}`}
                            >
                                <span className={`font-medium ${textClass}`}>
                                    {opt}
                                </span>
                                {isSelected && (
                                    isReviewMode && !isCorrect
                                        ? <div className="text-red-500 text-sm font-bold">Your Answer</div>
                                        : <CheckCircle className={`w-5 h-5 ${isReviewMode ? 'text-green-600' : 'text-blue-600'}`} />
                                )}
                                {isReviewMode && isCorrect && !isSelected && (
                                    <div className="text-green-600 text-sm font-bold">Correct Answer</div>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="flex justify-between pt-6 border-t border-gray-100">
                    {isReviewMode && (
                        <button
                            onClick={() => {
                                if (currentQIndex > 0) {
                                    setCurrentQIndex(prev => prev - 1);
                                    // Update selected option for prev question
                                    // But wait, the component re-renders and `currentSelected` is derived.
                                    // We just need to change the index.
                                }
                            }}
                            disabled={currentQIndex === 0}
                            className={`px-6 py-3 rounded-xl font-bold transition-all border border-gray-300 ${currentQIndex === 0 ? 'opacity-50' : 'hover:bg-gray-50'}`}
                        >
                            Previous
                        </button>
                    )}

                    <button
                        onClick={() => {
                            if (isReviewMode) {
                                if (currentQIndex < questions.length - 1) {
                                    setCurrentQIndex(prev => prev + 1);
                                } else {
                                    setShowResult(true);
                                }
                            } else {
                                handleNext();
                            }
                        }}
                        disabled={!isReviewMode && selectedOption === null}
                        className={`px-8 py-3 rounded-xl font-bold text-white transition-all ml-auto ${(isReviewMode || selectedOption !== null)
                            ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'
                            : 'bg-gray-200 cursor-not-allowed'
                            }`}
                    >
                        {currentQIndex === questions.length - 1 ? (isReviewMode ? 'Back to Result' : 'Finish Quiz') : 'Next Question'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- New Quiz Components ---

const QuizIntroCard = ({ title, questionCount, onStart, isCompleted, score }) => (
    <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-200 text-center min-h-[500px] flex flex-col items-center justify-center">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 ${isCompleted ? 'bg-green-100' : 'bg-blue-100'}`}>
            {isCompleted ? <CheckCircle className="w-12 h-12 text-green-600" /> : <HelpCircle className="w-12 h-12 text-blue-600" />}
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">{title}</h2>
        <div className="max-w-md mx-auto text-gray-500 mb-10">
            {isCompleted ? (
                <>
                    <p className="mb-2 text-lg font-medium text-gray-900">Anda sudah menyelesaikan ujian ini.</p>
                    {score !== undefined && <p className="text-2xl font-bold text-blue-600 mt-2">Nilai: {score}%</p>}
                    <p className="text-sm mt-4">Klik tombol di bawah untuk melihat detail jawaban.</p>
                </>
            ) : (
                <>
                    <p className="mb-2">Kuis ini terdiri dari <strong className="text-gray-900">{questionCount} pertanyaan</strong>.</p>
                    <p>Untuk memaksimalkan fokus, kuis ini akan ditampilkan dalam mode layar penuh (Full Screen).</p>
                </>
            )}
        </div>
        <button
            onClick={onStart}
            className={`px-10 py-4 font-bold rounded-xl shadow-lg transition-all flex items-center gap-3 transform hover:-translate-y-1 ${isCompleted
                ? 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50'
                : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
        >
            {isCompleted ? (
                <><FileText className="w-6 h-6" /> Review Jawaban</>
            ) : (
                <><PlayCircle className="w-6 h-6" /> Mulai Ujian</>
            )}
        </button>
    </div>
);

const QuizContainer = ({ content, isLargeQuiz, onComplete, canPreview }) => {
    const [isFullScreen, setIsFullScreen] = useState(false);

    // If it's a small quiz, just render it inline
    if (!isLargeQuiz) {
        return <QuizView content={content} onComplete={onComplete} userProgress={content.user_progress} canPreview={canPreview} />;
    }

    // Logic for Large Quiz
    const bodyStr = getBodyString(content.body);
    const quizData = bodyStr ? (() => { try { return JSON.parse(bodyStr); } catch { return []; } })() : (Array.isArray(content.body) ? content.body : []);

    if (isFullScreen) {
        return (
            <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto flex flex-col">
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm flex-shrink-0">
                    <h2 className="font-bold text-xl text-gray-800">{content.title}</h2>
                    <button
                        onClick={() => {
                            if (confirm('Keluar dari mode ujian? Progress mungkin hilang.')) {
                                setIsFullScreen(false);
                            }
                        }}
                        className="text-gray-500 hover:text-red-600 font-medium flex items-center gap-2"
                    >
                        Keluar <Maximize className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
                    <QuizView
                        content={content}
                        onComplete={onComplete}
                        userProgress={content.user_progress}
                        canPreview={canPreview}
                    />
                </div>
            </div>
        );
    }

    const isCompleted = content.user_progress?.completed;
    const scoreVal = content.user_progress?.quiz_score;
    const savedAnswers = content.user_progress?.answers;

    let displayScore = null;

    // Priority: Calculate from saved answers to ensure consistency with QuizView
    if (isCompleted && savedAnswers) {
        const answersMap = Array.isArray(savedAnswers)
            ? savedAnswers.reduce((acc, val, idx) => ({ ...acc, [idx]: val }), {})
            : savedAnswers;

        let calculatedScore = 0;
        quizData.forEach((q, idx) => {
            if (answersMap[idx] === q.correct) {
                calculatedScore++;
            }
        });

        // Calculate percentage
        if (quizData.length > 0) {
            displayScore = Math.round((calculatedScore / quizData.length) * 100);
        }
    }
    // Fallback to stored quiz_score if answers are missing
    else if (isCompleted && scoreVal !== undefined) {
        if (scoreVal > quizData.length && quizData.length > 0) {
            displayScore = scoreVal;
        } else if (quizData.length > 0) {
            displayScore = Math.round((scoreVal / quizData.length) * 100);
        }
    }

    return (
        <QuizIntroCard
            title={content.title}
            questionCount={Array.isArray(quizData) ? quizData.length : 0}
            onStart={() => setIsFullScreen(true)}
            isCompleted={isCompleted}
            score={displayScore}
            canPreview={canPreview}
        />
    );
};

// --- Code Sandbox Component ---

const CodeSandboxView = ({ content }) => {
    const sandboxData = typeof content.body === 'string' ? (() => { try { return JSON.parse(content.body); } catch { return {}; } })() : (content.body || {});

    const { language = 'javascript', initialCode = '', stdin: defaultStdin = '', description = '', testHint = '' } = sandboxData;

    // Convert generic string object to expected format if it's an i18n object accidentally mapped
    const parseI18n = (val) => typeof val === 'object' ? (val[navigator.language?.split('-')[0]] || val['en'] || val['id'] || Object.values(val)[0] || '') : val;

    const parsedDesc = parseI18n(description);
    const parsedHint = parseI18n(testHint);

    const [code, setCode] = useState(initialCode);
    const [stdin, setStdin] = useState(defaultStdin);
    const [output, setOutput] = useState('');
    const [stderr, setStderr] = useState('');
    const [isRunning, setIsRunning] = useState(false);

    // Reset code when content changes
    useEffect(() => {
        setCode(initialCode);
        setStdin(defaultStdin);
        setOutput('');
        setStderr('');
    }, [content]);

    const handleRun = async () => {
        setIsRunning(true);
        setOutput('Executing code...');
        setStderr('');
        try {
            const response = await api.post('/code/run', {
                language,
                code,
                stdin
            });

            setOutput(response.data.stdout || '');
            setStderr(response.data.stderr || '');
        } catch (error) {
            setStderr(error.response?.data?.error || error.response?.data?.stderr || 'Execution failed. Service might be unavailable.');
            setOutput('');
        } finally {
            setIsRunning(false);
        }
    };

    const langColors = {
        javascript: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        python: 'bg-blue-100 text-blue-800 border-blue-200',
        php: 'bg-purple-100 text-purple-800 border-purple-200'
    };

    const badgeColor = langColors[language.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';

    const { i18n } = useTranslation();

    return (
        <div className="bg-[#0D1117] rounded-xl shadow-2xl border border-[#30363D] overflow-hidden flex flex-col h-[750px] font-sans text-gray-200">
            {/* Header / Tab Bar */}
            <div className="px-5 py-3 border-b border-[#30363D] bg-[#161B22] flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5 mr-2">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                        <Code className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-gray-100 text-sm leading-tight">{getTrans(content.title, i18n.language)}</h2>
                    </div>
                </div>
                <div className="flex items-center gap-3 relative">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                        {language}
                    </span>
                    <button
                        onClick={() => { setCode(initialCode); setOutput(''); setStderr(''); }}
                        className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-100 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] rounded-md flex items-center gap-1.5 transition-all"
                        title="Reset code"
                    >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset
                    </button>
                    <button
                        onClick={handleRun}
                        disabled={isRunning}
                        className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:text-gray-400 text-white text-sm font-semibold rounded-md shadow-sm border border-green-700/50 flex items-center gap-2 transition-all"
                    >
                        {isRunning ? <span className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" /> : <Play className="w-4 h-4" />}
                        Run Code
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex flex-1 overflow-hidden flex-col md:flex-row bg-[#0D1117]">
                {/* Editor Side */}
                <div className="w-full md:w-[55%] flex flex-col border-r border-[#30363D] relative group">
                    <div className="bg-[#161B22] text-[#8B949E] text-xs font-mono px-4 py-2 flex justify-between items-center border-b border-[#30363D]/50 shadow-sm">
                        <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" />
                            <span>main.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'php' ? 'php' : 'txt'}</span>
                        </div>
                    </div>
                    {/* Fake line numbers for aesthetics */}
                    <div className="flex flex-1 overflow-hidden relative">
                        <div className="w-10 bg-[#0D1117] border-r border-[#30363D]/30 pt-4 flex flex-col items-center select-none text-[#484F58] font-mono text-xs opacity-70">
                            {[...Array(20)].map((_, i) => <span key={i} className="leading-6">{i + 1}</span>)}
                        </div>
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="flex-1 w-full bg-[#0D1117] text-[#E6EDF3] p-4 font-mono text-[13px] leading-6 resize-none focus:outline-none transition-colors"
                            spellCheck="false"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            placeholder="Write your code here..."
                        />
                    </div>
                </div>

                {/* Info & Output Side */}
                <div className="w-full md:w-[45%] flex flex-col bg-[#010409]">
                    <div className="p-5 border-b border-[#30363D] overflow-y-auto min-h-[180px] shrink-0 bg-[#0D1117]/50 backdrop-blur">
                        <h3 className="text-sm font-bold text-gray-200 mb-2 flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-indigo-400" /> Instruksi Assignment
                        </h3>
                        <p className="text-[13px] text-gray-400 leading-relaxed mb-4">{parsedDesc}</p>

                        {parsedHint && (
                            <div className="bg-indigo-500/10 text-indigo-300 p-3 rounded-md border border-indigo-500/20 text-xs mb-4 flex gap-2 items-start shadow-inner">
                                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
                                <span className="leading-relaxed">{parsedHint}</span>
                            </div>
                        )}

                        <div className="mt-auto">
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">STDIN Input Panel (Opsional)</label>
                            <textarea
                                value={stdin}
                                onChange={(e) => setStdin(e.target.value)}
                                className="w-full h-[60px] p-2.5 text-xs font-mono bg-[#161B22] border border-[#30363D] text-[#E6EDF3] rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder-gray-600 transition-all shadow-inner"
                                placeholder="Jika program menggunakan fungsi input() atau prompt(), tuliskan inputnya di sini, pisahkan dengan baris baru."
                            />
                        </div>
                    </div>

                    {/* Console Output */}
                    <div className="flex-1 flex flex-col bg-[#0A0C10] relative">
                        <div className="bg-[#161B22] text-[#8B949E] text-xs font-mono px-4 py-2 flex items-center gap-2 border-b border-[#30363D] shadow-sm">
                            <ChevronRight className="w-4 h-4" /> Console Output
                        </div>
                        <div className="flex-1 p-5 overflow-y-auto font-mono text-[13px] leading-relaxed relative">
                            {stderr ? (
                                <pre className="text-red-400/90 whitespace-pre-wrap font-mono relative z-10">{stderr}</pre>
                            ) : output ? (
                                <pre className="text-green-400 whitespace-pre-wrap font-mono relative z-10">{output}</pre>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-[#30363D] italic text-sm tracking-wide">Ready for execution...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

import { useUser } from '../contexts/UserContext';

// --- Main Page ---

export const LessonPlayerPage = ({ currentUser: propUser, isPreviewMode = false }) => {
    const { user: contextUser } = useUser();
    const currentUser = propUser || contextUser;
    const { i18n } = useTranslation();

    const navigate = useNavigate();
    const params = useParams();
    // Normalize params to support various route definitions (id vs courseId, contentId vs lessonId)
    const courseId = params.courseId || params.id;
    const lessonId = params.lessonId || params.contentId;

    const [activeTab, setActiveTab] = useState('overview');

    // Check privileges
    const canPreview = currentUser?.role === 'admin' || currentUser?.role === 'instructor';

    // Redirect Logic
    useEffect(() => {
        if (!isPreviewMode && currentUser) {
            if (currentUser.role === 'admin') {
                navigate(`/admin/courses/${courseId}/lesson/${lessonId}/preview`, { replace: true });
            } else if (currentUser.role === 'instructor') {
                navigate(`/instructor/courses/${courseId}/lesson/${lessonId}/preview`, { replace: true });
            }
        }
    }, [currentUser, isPreviewMode, courseId, lessonId, navigate]);

    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                setLoading(true);
                const data = await courseService.getCourseById(courseId);
                setCourse(data);
            } catch (err) {
                console.error("Failed to fetch course:", err);
                setError(err.message || 'Gagal memuat materi');
            } finally {
                setLoading(false);
            }
        };

        if (courseId) {
            fetchCourse();
        }
    }, [courseId]);

    // Derived state
    const allContents = course?.modules?.flatMap(m => m.contents) || [];
    const currentContent = allContents.find(c => c.id === parseInt(lessonId));
    const currentModule = course?.modules?.find(m => m.contents?.some(c => c.id === parseInt(lessonId)));

    // Loading State
    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Error State
    if (error || !currentContent) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-500 mb-4">{error || 'Materi tidak ditemukan'}</p>
                <button onClick={() => navigate(`/courses/${courseId}`)} className="text-blue-600 hover:underline">
                    Kembali ke Kursus
                </button>
            </div>
        );
    }

    // Navigation handlers
    const currentIndex = allContents.indexOf(currentContent);
    const hasNext = currentIndex < allContents.length - 1;
    const hasPrev = currentIndex > 0;

    // Helper for navigation URL
    const getTargetUrl = (targetId) => {
        if (isPreviewMode && currentUser) {
            if (currentUser.role === 'admin') return `/admin/courses/${courseId}/lesson/${targetId}/preview`;
            if (currentUser.role === 'instructor') return `/instructor/courses/${courseId}/lesson/${targetId}/preview`;
        }
        return `/courses/${courseId}/lesson/${targetId}`;
    };

    const getBackUrl = () => {
        if (isPreviewMode && currentUser) {
            if (currentUser.role === 'admin') return `/admin/courses/${courseId}/preview`;
            if (currentUser.role === 'instructor') return `/instructor/courses/${courseId}/preview`;
        }
        return `/courses/${courseId}`;
    };

    const handleNext = () => {
        if (hasNext) navigate(getTargetUrl(allContents[currentIndex + 1].id));
    };

    const handlePrev = () => {
        if (hasPrev) navigate(getTargetUrl(allContents[currentIndex - 1].id));
    };

    const handleQuizComplete = async (result) => {
        try {
            await courseService.updateProgress(currentContent.id, {
                completed: true,
                quiz_score: result?.score || 0,
                answers: result?.answers || null
            });
            console.log("Quiz progress saved!");
        } catch (err) {
            console.error("Failed to save progress:", err);
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
            {isPreviewMode && (
                <div className="bg-orange-600 text-white px-4 py-2 font-bold text-center text-sm shadow-sm flex items-center justify-center gap-2 z-50">
                    <Eye className="w-4 h-4" />
                    PREVIEW MODE: You are viewing this lesson as a student would.
                </div>
            )}
            {/* Top Bar */}
            <header className={`bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 z-20 flex-shrink-0 ${isPreviewMode ? 'border-orange-200 bg-orange-50' : ''}`}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(getBackUrl())}
                        className="text-gray-500 hover:text-blue-600 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
                    <h1 className="font-bold text-gray-800 truncate max-w-md hidden md:block">
                        {getTrans(course.title, i18n.language)}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrev}
                        disabled={!hasPrev}
                        className={`p-2 rounded-lg transition-colors ${!hasPrev ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <span className="text-xs font-medium text-gray-500 hidden sm:inline">
                        {currentIndex + 1} / {allContents.length}
                    </span>
                    <button
                        onClick={handleNext}
                        disabled={!hasNext}
                        className={`p-2 rounded-lg transition-colors ${!hasNext ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="ml-2 p-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 bg-gray-50">
                    <div className="max-w-5xl mx-auto space-y-6">

                        {/* Dynamic Content Renderer */}
                        {currentContent.type === 'video' ? (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="aspect-video bg-black relative">
                                    <iframe
                                        src={currentContent.content_url}
                                        className="w-full h-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        title={currentContent.title}
                                    ></iframe>
                                </div>
                                <div className="p-6">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{getTrans(currentContent.title, i18n.language)}</h2>
                                    <p className="text-sm text-gray-500">{getTrans(currentContent.description, i18n.language)}</p>
                                </div>
                            </div>
                        ) : currentContent.type === 'quiz' ? (
                            (() => {
                                const quizData = typeof currentContent.body === 'string'
                                    ? JSON.parse(currentContent.body || '[]')
                                    : (currentContent.body || []);
                                const questionCount = Array.isArray(quizData) ? quizData.length : 0;
                                const isLargeQuiz = questionCount > 10;

                                if (isLargeQuiz && !sidebarOpen) {
                                    // Re-using local state 'sidebarOpen' is dirty for this. 
                                    // Let's use a new state for FullScreen mode. 
                                    // BUT, since I cannot easily add top-level state in this replace block without changing the whole file,
                                    // I will handle the "Start Exam" logic nicely here.
                                }

                                return (
                                    <QuizContainer
                                        content={currentContent}
                                        isLargeQuiz={isLargeQuiz}
                                        onComplete={handleQuizComplete}
                                        canPreview={canPreview}
                                    />
                                )
                            })()
                        ) : currentContent.type === 'sandbox' ? (
                            <CodeSandboxView content={currentContent} />
                        ) : (
                            <ArticleView content={currentContent} />
                        )}

                        {/* Additional Info / Tabs (Only for Video/Article, NOT for quiz/sandbox) */}
                        {currentContent.type !== 'quiz' && currentContent.type !== 'sandbox' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                <h3 className="font-bold text-gray-900 mb-4">Tentang Materi Ini</h3>
                                <p className="text-gray-600">{getTrans(currentContent.description, i18n.language) || 'Tidak ada deskripsi.'}</p>
                            </div>
                        )}

                    </div>
                </main>

                {/* Sidebar - Playlist */}
                <aside className={`absolute inset-y-0 right-0 w-80 bg-white border-l border-gray-200 transform transition-transform duration-300 z-10 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:relative md:translate-x-0 flex flex-col`}>
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-bold text-gray-900">Konten Kursus</h3>
                        <p className="text-xs text-gray-500 mt-1">
                            {allContents.length} materi pembelajaran
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {course?.modules?.map((module, mIdx) => (
                            <div key={module.id} className="border-b border-gray-100 last:border-0">
                                <div className="px-4 py-3 bg-gray-50/50">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Modul {mIdx + 1}: {getTrans(module.title, i18n.language)}
                                    </h4>
                                </div>
                                <div>
                                    {module.contents?.map((content, cIdx) => (
                                        <div
                                            key={content.id}
                                            onClick={() => navigate(getTargetUrl(content.id))}
                                            className={`px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors border-l-4 ${content.id === currentContent.id ? 'bg-blue-50 border-blue-600' : 'border-transparent'
                                                }`}
                                        >
                                            <div className="mt-0.5">
                                                {content.id === currentContent.id ? (
                                                    <PlayCircle className="w-4 h-4 text-blue-600" />
                                                ) : content.type === 'video' ? (
                                                    <Video className="w-4 h-4 text-gray-400" />
                                                ) : content.type === 'quiz' ? (
                                                    <HelpCircle className="w-4 h-4 text-gray-400" />
                                                ) : content.type === 'sandbox' ? (
                                                    <Code className="w-4 h-4 text-gray-400" />
                                                ) : (
                                                    <FileText className="w-4 h-4 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${content.id === currentContent.id ? 'font-bold text-blue-700' : 'text-gray-700'}`}>
                                                    {getTrans(content.title, i18n.language)}
                                                </p>
                                                <span className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                                    <Clock className="w-3 h-3" /> {content.duration_minutes} min
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>
        </div>
    );
};
