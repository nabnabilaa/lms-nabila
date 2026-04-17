import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill/dist/quill.snow.css';
import { ChevronRight, ChevronLeft, Save, FileText, Video, HelpCircle, Upload, Link as LinkIcon, CheckCircle, Edit3 } from 'lucide-react';
import { getTrans } from '../../../lib/transHelper';

export const ContentWizardForm = ({ initialData, onSave, onCancel, type = 'content' }) => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState(() => {
        const parsedData = initialData ? {
            ...initialData,
            title: getTrans(initialData.title, i18n.language) || '',
            description: getTrans(initialData.description, i18n.language) || ''
        } : {};
        return {
            title: '',
            type: 'video', // video, quiz, assignment, ppt, etc.
            duration: '',
            xpReward: 50,
            description: '',
            url: '', // Video URL or file path
            file: null, // For defining uploads if needed
            ...parsedData
        };
    });

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                ...initialData,
                title: getTrans(initialData.title, i18n.language) || '',
                description: getTrans(initialData.description, i18n.language) || ''
            }));
        }
    }, [initialData, i18n.language]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const handleSubmit = () => {
        onSave(formData);
    };

    const getTypeIcon = (t) => {
        switch (t) {
            case 'video': return <Video className="w-5 h-5" />;
            case 'quiz': return <HelpCircle className="w-5 h-5" />;
            case 'assignment': return <FileText className="w-5 h-5" />;
            default: return <FileText className="w-5 h-5" />;
        }
    };

    // Helper to check validity of current step
    const isStepValid = () => {
        if (step === 1) return formData.title && formData.type;
        return true;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Wizard Progress Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold ${step >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>1. {t('content_wizard.step_basic')}</span>
                    <div className="h-1 flex-1 mx-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full bg-indigo-600 transition-all duration-300 ${step >= 1 ? 'w-full' : 'w-0'}`}></div>
                    </div>
                    <span className={`text-xs font-bold ${step >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>2. {t('content_wizard.step_detail')}</span>
                    <div className="h-1 flex-1 mx-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full bg-indigo-600 transition-all duration-300 ${step >= 3 ? 'w-full' : 'w-0'}`}></div>
                    </div>
                    <span className={`text-xs font-bold ${step >= 3 ? 'text-indigo-600' : 'text-gray-400'}`}>3. {t('content_wizard.step_review')}</span>
                </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto px-1">
                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">{t('content_wizard.title_label')} {type === 'assignment' ? t('content_wizard.assignment') : t('content_wizard.material')}</label>
                            <input
                                value={formData.title}
                                onChange={e => handleChange('title', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-200 outline-none transition-shadow"
                                placeholder={t('content_wizard.title_placeholder')}
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">{t('content_wizard.content_type')}</label>
                                <select
                                    value={formData.type}
                                    onChange={e => handleChange('type', e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
                                >
                                    <option value="video">{t('content_wizard.type_video')}</option>
                                    <option value="quiz">{t('content_wizard.type_quiz')}</option>
                                    <option value="assignment">{t('content_wizard.type_assignment')}</option>
                                    <option value="ppt">{t('content_wizard.type_document')}</option>
                                    <option value="article">{t('content_wizard.type_article')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">{t('content_wizard.duration')}</label>
                                <input
                                    type="number"
                                    value={formData.duration}
                                    onChange={e => handleChange('duration', e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-200 outline-none"
                                    placeholder="e.g. 10"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">XP Reward</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={formData.xpReward}
                                    onChange={e => handleChange('xpReward', e.target.value)}
                                    className="w-32 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-200 outline-none"
                                />
                                <span className="text-sm text-gray-500">{t('content_wizard.xp_hint')}</span>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Common Description for all types except maybe Quiz if it's purely questions, but usually instructions are good */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                {formData.type === 'quiz' ? t('content_wizard.quiz_instructions') :
                                    formData.type === 'assignment' ? t('content_wizard.assignment_instructions') :
                                        formData.type === 'article' ? t('content_wizard.article_content') : t('content_wizard.description')}
                            </label>
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <ReactQuill
                                    theme="snow"
                                    value={formData.description || ''}
                                    onChange={value => handleChange('description', value)}
                                    className="h-48 mb-10 md:mb-0"
                                    modules={{
                                        toolbar: [
                                            [{ 'header': [1, 2, false] }],
                                            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                                            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                            ['link', 'clean']
                                        ],
                                    }}
                                    placeholder={
                                        formData.type === 'quiz' ? t('content_wizard.quiz_placeholder') :
                                            formData.type === 'assignment' ? t('content_wizard.assignment_placeholder') :
                                                t('content_wizard.description_placeholder')
                                    }
                                />
                            </div>
                        </div>

                        {/* TYPE SPECIFIC FIELDS */}

                        {/* VIDEO */}
                        {formData.type === 'video' && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">{t('content_wizard.video_url')}</label>
                                <div className="flex items-center gap-2 border border-gray-300 rounded-xl p-2 bg-white">
                                    <LinkIcon className="text-gray-400 w-5 h-5 ml-2" />
                                    <input
                                        value={formData.url}
                                        onChange={e => handleChange('url', e.target.value)}
                                        className="w-full p-1 outline-none text-sm"
                                        placeholder="https://youtube.com/..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* QUIZ SPECIFIC */}
                        {formData.type === 'quiz' && (
                            <div className="mt-4 border-2 border-dashed border-purple-200 rounded-xl p-6 bg-purple-50 text-center">
                                <HelpCircle className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                                <h4 className="text-purple-900 font-bold mb-1">
                                    {formData.quizData && formData.quizData.length > 0
                                        ? `${formData.quizData.length} ${t('content_wizard.questions_saved')}`
                                        : t('content_wizard.no_questions')}
                                </h4>
                                <p className="text-sm text-purple-600 mb-4">
                                    {t('content_wizard.quiz_builder_hint')}
                                </p>
                                <button
                                    onClick={() => {
                                        navigate('/admin/quiz-builder', {
                                            state: {
                                                quizData: formData.quizData,
                                                returnPath: window.location.pathname // Simple return mechanism
                                                // In a real app we might pass a callback ID or similar
                                            }
                                        });
                                        // Note: We need a way to get data back. 
                                        // Usually this means QuizBuilder should save to LS or we pass a setter.
                                        // For now, consistent with previous implementation using sessionStorage or similar if refactored.
                                        // Previous implementation used sessionStorage 'quizBuilderResult'.
                                    }}
                                    className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 shadow-md transition-transform active:scale-95 flex items-center gap-2 mx-auto"
                                >
                                    <Edit3 className="w-4 h-4" />
                                    {formData.quizData && formData.quizData.length > 0 ? t('content_wizard.edit_quiz') : t('content_wizard.create_quiz')}
                                </button>
                            </div>
                        )}

                        {/* ASSIGNMENT / PPT / FILE */}
                        {(formData.type === 'ppt' || formData.type === 'assignment') && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">{t('content_wizard.upload_file')} {formData.type === 'assignment' ? t('content_wizard.guide_file') : t('content_wizard.material')}</label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer group">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-indigo-50">
                                            <Upload className="h-5 w-5 text-gray-400 group-hover:text-indigo-500" />
                                        </div>
                                        <p className="mt-1 text-sm font-medium text-gray-700">{t('content_wizard.click_upload')}</p>
                                        <p className="text-xs text-gray-400">PDF, DOCX, ZIP (Max 10MB)</p>
                                        <input type="file" className="hidden" onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) handleChange('fileSize', (file.size / 1024 / 1024).toFixed(2) + ' MB');
                                        }} />
                                    </div>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-200"></div>
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-white px-2 text-gray-400 font-bold">{t('content_wizard.or_use_url')}</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">{t('content_wizard.external_link')}</label>
                                    <div className="flex items-center gap-2 border border-gray-300 rounded-xl p-2 bg-white focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                                        <LinkIcon className="text-gray-400 w-5 h-5 ml-2" />
                                        <input
                                            value={formData.url}
                                            onChange={e => handleChange('url', e.target.value)}
                                            className="flex-1 p-1 outline-none text-sm"
                                            placeholder="https://docs.google.com/..."
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 text-center py-4">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{t('content_wizard.ready_save')}</h3>
                        <p className="text-gray-500 text-sm max-w-xs mx-auto mb-6">{t('content_wizard.review_hint')}</p>

                        <div className="bg-gray-50 p-4 rounded-xl text-left max-w-sm mx-auto space-y-2 border border-gray-100">
                            <div>
                                <span className="text-xs text-gray-400 uppercase font-bold">{t('content_wizard.title_label')}</span>
                                <p className="font-medium text-gray-800">{formData.title}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-400 uppercase font-bold">{t('content_wizard.content_type')}</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="p-1 bg-indigo-100 text-indigo-600 rounded">
                                        {getTypeIcon(formData.type)}
                                    </span>
                                    <span className="capitalize text-sm font-medium">{formData.type}</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-xs text-gray-400 uppercase font-bold">XP Reward</span>
                                <p className="font-medium text-gray-800">{formData.xpReward} XP</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="mt-6 flex justify-between items-center border-t border-gray-100 pt-4">
                {step > 1 ? (
                    <button
                        onClick={prevStep}
                        className="px-4 py-2 text-gray-600 font-bold text-sm bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center gap-2"
                    >
                        <ChevronLeft className="w-4 h-4" /> {t('content_wizard.back')}
                    </button>
                ) : (
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-400 hover:text-gray-600 font-bold text-sm transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                )}

                {step < 3 ? (
                    <button
                        onClick={nextStep}
                        disabled={!isStepValid()}
                        className="px-6 py-2 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {t('content_wizard.next')} <ChevronRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-green-600 text-white font-bold text-sm rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-200 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" /> {t('common.save')}
                    </button>
                )}
            </div>
        </div>
    );
};
