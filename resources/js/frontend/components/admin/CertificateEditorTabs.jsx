// Certificate Editor with Tabs - Fully Integrated with Real Logic
import { useState, useEffect } from 'react';
import { X, Edit3, CheckCircle, Database, Sparkles, RefreshCw, Award } from 'lucide-react';
import { MultiPageCertificate } from '../../components/certificate/MultiPageCertificate';

export const CertificateEditorTabs = ({ certificate, bootcamp, onSave, onCancel }) => {
    const [activeTab, setActiveTab] = useState('data');

    // Grading Config from Bootcamp/Course
    const gradingMap = bootcamp?.certificateConfig?.gradingMap || {};
    const certificateConfig = bootcamp?.certificateConfig || { templateStyle: 'modern' };
    const feedbackTemplate = certificateConfig.feedbackTemplate || {};

    // Initialize State
    const [editedData, setEditedData] = useState({
        studentName: certificate.student_name,
        finalScore: certificate.final_score,
        mentorReview: certificate.mentor_review || '',
        skills: certificate.skills_breakdown || {},
        templateStyle: certificateConfig.templateStyle || 'modern',
        aiNarrative: certificate.ai_narrative || '',
        strengths: certificate.strengths || feedbackTemplate.strengths || '',
        improvements: certificate.improvements || feedbackTemplate.improvements || '',
        career: certificate.career || feedbackTemplate.career || ''
    });

    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // Auto-generate AI when mentor review changes
    useEffect(() => {
        let timeoutId;
        if (editedData.mentorReview && editedData.mentorReview.length > 20) {
            // Only generate if aiNarrative is empty to avoid overwriting user edits?
            // Or maybe just skip this auto-gen logic if we already have data
            if (!editedData.aiNarrative) {
                setIsGeneratingAI(true);
                timeoutId = setTimeout(() => {
                    const narrative = `${editedData.studentName} telah menunjukkan dedikasi yang luar biasa dalam bootcamp ${bootcamp.title}. Dengan nilai akhir ${editedData.finalScore}, ${editedData.studentName} berhasil menguasai berbagai kompetensi kunci. ${editedData.mentorReview}`;
                    setEditedData(prev => ({ ...prev, aiNarrative: narrative }));
                    setIsGeneratingAI(false);
                }, 1000);
            }
        }
        return () => clearTimeout(timeoutId);
    }, [editedData.mentorReview, editedData.studentName, editedData.finalScore, bootcamp.title]);

    const handleSave = () => {
        onSave(certificate.id, editedData);
    };

    const handleScoreChange = (skill, value) => {
        const newScore = parseInt(value);
        const newSkills = { ...editedData.skills, [skill]: newScore };

        // Calculate Weighted Score if gradingMap exists
        let totalScore = 0;
        let totalWeight = 0;
        let useWeighted = false;

        if (Object.keys(gradingMap).length > 0) {
            useWeighted = true;
            // Map skill names back to module IDs to find weights? 
            // The skills keys are Skill Names (mapped title). 
            // We need to iterate over gradingMap to match skill names.
            Object.values(gradingMap).forEach(mapping => {
                const currentScore = newSkills[mapping.skillName] || 0;
                totalScore += currentScore * (mapping.weight / 100);
                totalWeight += mapping.weight;
            });
        }

        const finalScore = useWeighted && totalWeight > 0
            ? Math.round(totalScore)
            : Math.round(Object.values(newSkills).reduce((a, b) => a + b, 0) / Object.keys(newSkills).length);

        setEditedData({ ...editedData, skills: newSkills, finalScore });
    };

    const getGrade = (score) => {
        if (score >= 90) return 'A+ (Distinction)';
        if (score >= 85) return 'A (Excellent)';
        if (score >= 80) return 'B+ (Very Good)';
        if (score >= 75) return 'B (Good)';
        return 'C (Review Needed)';
    };

    // Generate Preview Data Object for MultiPageCertificate
    const previewData = {
        title: bootcamp.title,
        instructor: bootcamp.certificateConfig?.signatureName || 'Lead Instructor',
        dateCompleted: certificate.issued_at ? new Date(certificate.issued_at).toLocaleDateString('id-ID') : new Date().toLocaleDateString('id-ID'),
        certificateID: `DRAFT-${certificate.id}`,
        studentName: editedData.studentName,
        totalScore: editedData.finalScore,
        skills: editedData.skills,
        // Map skills to modules array for transcript
        modules: Object.entries(editedData.skills).map(([name, score]) => {
            // Find weight if available
            const weight = Object.values(gradingMap).find(m => m.skillName === name)?.weight;
            return {
                name: name,
                score: score,
                weight: weight
            };
        }),
        feedback: {
            strengths: editedData.strengths,
            improvements: editedData.improvements,
            career: editedData.career
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h2 className="text-lg font-bold text-gray-900">Certificate Editor</h2>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
                {[
                    { id: 'data', label: 'Data & Grades', icon: Edit3 },
                    { id: 'preview', label: 'Real Preview', icon: Database },
                    { id: 'content', label: 'AI Narrative', icon: Sparkles }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 px-6 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === tab.id
                            ? 'border-blue-600 text-blue-600 bg-white'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                {/* DATA TAB */}
                {activeTab === 'data' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                        {/* Left: Input Form */}
                        <div className="space-y-6">
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Nama Siswa di Sertifikat</label>
                                <input
                                    value={editedData.studentName}
                                    onChange={(e) => setEditedData({ ...editedData, studentName: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Nama Lengkap"
                                />
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Database className="w-4 h-4 text-blue-600" /> Input Nilai Modul
                                </h3>
                                <div className="space-y-4">
                                    {Object.entries(editedData.skills).length === 0 ? (
                                        <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-lg dashed-border">
                                            <p className="text-sm">Belum ada data modul.</p>
                                        </div>
                                    ) : (
                                        Object.entries(editedData.skills).map(([skill, score]) => {
                                            // Find weight for display
                                            const weight = Object.values(gradingMap).find(m => m.skillName === skill)?.weight;
                                            return (
                                                <div key={skill} className="bg-gray-50 p-4 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div>
                                                            <span className="font-bold text-sm text-gray-800 block">{skill}</span>
                                                            {weight && <span className="text-xs text-gray-500">Bobot: {weight}%</span>}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                className="w-16 p-1 text-center text-sm font-bold border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                                                value={score}
                                                                onChange={(e) => handleScoreChange(skill, e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        value={score}
                                                        onChange={(e) => handleScoreChange(skill, e.target.value)}
                                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700"
                                                    />
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: Live Summary */}
                        <div className="space-y-6">
                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden sticky top-6">
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white text-center">
                                    <p className="text-blue-100 text-sm font-medium mb-1">Final Score Prediction</p>
                                    <h2 className="text-6xl font-extrabold tracking-tight mb-2">{editedData.finalScore}</h2>
                                    <div className="inline-block px-4 py-1 bg-white/20 rounded-full text-sm font-bold backdrop-blur-sm">
                                        {getGrade(editedData.finalScore)}
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                                            <span className="text-gray-500">Template Style</span>
                                            <span className="font-bold capitalize text-gray-900">{editedData.templateStyle}</span>
                                        </div>
                                        <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                                            <span className="text-gray-500">Total Modules</span>
                                            <span className="font-bold text-gray-900">{Object.keys(editedData.skills).length}</span>
                                        </div>
                                        <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                                            <span className="text-gray-500">Scoring Method</span>
                                            <span className="font-bold text-gray-900">{Object.keys(gradingMap).length > 0 ? 'Weighted Average' : 'Simple Average'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PREVIEW TAB - USING REAL EXTRACTED COMPONENT */}
                {activeTab === 'preview' && (
                    <div className="flex flex-col items-center">
                        <div className="bg-gray-200 p-8 rounded-xl shadow-inner overflow-auto max-w-full w-full flex justify-center border border-gray-300">
                            {/* Scale wrapper handles A4 size display */}
                            <div className="origin-top transform scale-[0.6] md:scale-[0.7] shadow-2xl">
                                <MultiPageCertificate
                                    data={previewData}
                                    config={certificateConfig}
                                />
                            </div>
                        </div>
                        <p className="text-center text-gray-500 text-sm mt-4">
                            *This is an exact preview of the generated PDF.
                        </p>
                    </div>
                )}

                {/* CONTENT TAB */}
                {activeTab === 'content' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* LEFT: Context */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-purple-50 p-5 rounded-xl border border-purple-100">
                                <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> AI Generator
                                </h3>
                                <p className="text-xs text-purple-700 mb-4">
                                    AI akan membuat narasi berdasarkan review mentor dan nilai.
                                </p>
                                <label className="block text-sm font-bold text-gray-800 mb-2">Mentor Review (Input)</label>
                                <textarea
                                    value={editedData.mentorReview}
                                    onChange={(e) => setEditedData({ ...editedData, mentorReview: e.target.value })}
                                    placeholder="Tulis review singkat tentang performa siswa..."
                                    className="w-full h-40 p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none mb-3"
                                />
                                <button
                                    onClick={() => {
                                        if (!editedData.mentorReview || editedData.mentorReview.length < 5) {
                                            alert("Mohon isi review mentor terlebih dahulu sebagai konteks AI.");
                                            return;
                                        }
                                        setIsGeneratingAI(true);

                                        // REAL API CALL
                                        import('axios').then(axios => {
                                            axios.default.post('/certificates/generate-ai', {
                                                student_name: editedData.studentName,
                                                course_title: bootcamp.title,
                                                final_score: editedData.finalScore,
                                                skills: editedData.skills,
                                                mentor_review: editedData.mentorReview
                                            })
                                                .then(res => {
                                                    const ai = res.data;
                                                    setEditedData(prev => ({
                                                        ...prev,
                                                        strengths: ai.strengths,
                                                        improvements: ai.improvements,
                                                        career: ai.career
                                                    }));
                                                    alert("Analisis AI berhasil digenerate!");
                                                })
                                                .catch(err => {
                                                    console.error(err);
                                                    alert("Gagal generate AI: " + (err.response?.data?.message || err.message));
                                                })
                                                .finally(() => setIsGeneratingAI(false));
                                        });
                                    }}
                                    disabled={isGeneratingAI}
                                    className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                                >
                                    {isGeneratingAI ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    {isGeneratingAI ? 'Generating AI Analysis...' : 'Generate with Gemini AI'}
                                </button>
                            </div>
                        </div>

                        {/* RIGHT: Editors */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Edit3 className="w-4 h-4" /> Final Report Editor
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Kekuatan Utama</label>
                                        <textarea
                                            value={editedData.strengths || ''}
                                            onChange={(e) => setEditedData({ ...editedData, strengths: e.target.value })}
                                            className="w-full h-24 p-3 text-sm border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
                                            placeholder="Generated by AI..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Area Pengembangan</label>
                                        <textarea
                                            value={editedData.improvements || ''}
                                            onChange={(e) => setEditedData({ ...editedData, improvements: e.target.value })}
                                            className="w-full h-24 p-3 text-sm border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
                                            placeholder="Generated by AI..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Rekomendasi Karir</label>
                                        <textarea
                                            value={editedData.career || ''}
                                            onChange={(e) => setEditedData({ ...editedData, career: e.target.value })}
                                            className="w-full h-24 p-3 text-sm border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
                                            placeholder="Generated by AI..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3">
                <button
                    onClick={() => {
                        // Pass is_published: true to verify
                        onSave(certificate.id, { ...editedData, is_published: true });
                    }}
                    className="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform active:scale-[0.99] transition-all"
                >
                    <CheckCircle className="w-5 h-5" />
                    Simpan & Verifikasi (Publish)
                </button>
                <button
                    onClick={onCancel}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 font-bold text-gray-600"
                >
                    Batal
                </button>
            </div>
        </div>
    );
};
