import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as LucideIcons from 'lucide-react';
import { AdminModal } from './ui/AdminModal';
import ConfirmModal from '../ui/ConfirmModal'; // NEW

// Filter out non-component exports and get all icon keys
const ALL_ICON_KEYS = Object.keys(LucideIcons).filter(key =>
    typeof LucideIcons[key] === 'object' && key !== 'createLucideIcon' && key !== 'default'
);

import api from '../../services/api';
import { getTrans } from '../../lib/transHelper';

// ... (keep usage of LucideIcons and AdminModal imports if they were there, wait, I need to check hidden partials)
// Actually, I can just replace the handlers and import.

export const AchievementBuilder = ({ achievements = [], onUpdate, onRefresh }) => {
    const { t, i18n } = useTranslation();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAchievement, setEditingAchievement] = useState(null);
    const [iconSearch, setIconSearch] = useState('');

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        message: '',
        title: '',
        variant: 'confirm',
        confirmLabel: t('achievements.yes_continue'),
        cancelLabel: t('common.cancel'),
        onConfirm: null
    });

    const openConfirm = (payload) => {
        setConfirmModal({
            isOpen: true,
            title: payload.title || t('achievements.confirm'),
            message: payload.message,
            variant: payload.variant || 'warning',
            confirmLabel: payload.confirmLabel || t('achievements.yes_continue'),
            cancelLabel: payload.cancelLabel || t('common.cancel'),
            onConfirm: payload.onConfirm
        });
    };

    const openAlert = (title, message, variant = 'info') => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            variant,
            confirmLabel: t('common.ok'),
            cancelLabel: t('common.close'),
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    // Memoized filtered icons
    const filteredIcons = useMemo(() => {
        if (!iconSearch) return ALL_ICON_KEYS.slice(0, 100); // Show top 100 by default
        return ALL_ICON_KEYS.filter(key =>
            key.toLowerCase().includes(iconSearch.toLowerCase())
        ).slice(0, 100); // Limit results for performance
    }, [iconSearch]);

    const [formData, setFormData] = useState({
        title: { id: '', en: '' },
        description: { id: '', en: '' },
        icon: 'Trophy',
        points: 100,
        criteria: {
            type: 'complete_content',
            target: 10,
            timeLimit: 7,
            contentType: 'any',
            courseId: null
        }
    });

    // Auto Translation States
    const [isTranslatingTitle, setIsTranslatingTitle] = useState(false);
    const [isTranslatingDesc, setIsTranslatingDesc] = useState(false);

    // Dirty Flags to track manual edits
    const [titleIdDirty, setTitleIdDirty] = useState(false);
    const [titleEnDirty, setTitleEnDirty] = useState(false);
    const [descIdDirty, setDescIdDirty] = useState(false);
    const [descEnDirty, setDescEnDirty] = useState(false);

    // Auto translate helper (Bidirectional)
    const autoTranslate = async (text, sl, tl, field) => {
        if (!text) return;
        try {
            if (field === 'title') setIsTranslatingTitle(true);
            if (field === 'description') setIsTranslatingDesc(true);

            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`);
            const data = await res.json();

            let translated = '';
            if (data && data[0]) {
                data[0].forEach(chunk => {
                    if (chunk[0]) translated += chunk[0];
                });
            }

            if (translated && translated.trim() !== '') {
                setFormData(prev => ({
                    ...prev,
                    [field]: { ...prev[field], [tl]: translated.trim() }
                }));
            }
        } catch (err) {
            console.error('Translation failed', err);
        } finally {
            if (field === 'title') setIsTranslatingTitle(false);
            if (field === 'description') setIsTranslatingDesc(false);
        }
    };

    // --- TITLE TRANSLATION (Bidirectional) ---
    useEffect(() => {
        if (!modalOpen) return;
        if (formData.title.id && !titleEnDirty && titleIdDirty) {
            const timer = setTimeout(() => autoTranslate(formData.title.id, 'id', 'en', 'title'), 1200);
            return () => clearTimeout(timer);
        }
    }, [formData.title.id, modalOpen, titleEnDirty, titleIdDirty]);

    useEffect(() => {
        if (!modalOpen) return;
        if (formData.title.en && !titleIdDirty && titleEnDirty) {
            const timer = setTimeout(() => autoTranslate(formData.title.en, 'en', 'id', 'title'), 1200);
            return () => clearTimeout(timer);
        }
    }, [formData.title.en, modalOpen, titleIdDirty, titleEnDirty]);


    // --- DESCRIPTION TRANSLATION (Bidirectional) ---
    useEffect(() => {
        if (!modalOpen) return;
        if (formData.description.id && !descEnDirty && descIdDirty) {
            const timer = setTimeout(() => autoTranslate(formData.description.id, 'id', 'en', 'description'), 1200);
            return () => clearTimeout(timer);
        }
    }, [formData.description.id, modalOpen, descEnDirty, descIdDirty]);

    useEffect(() => {
        if (!modalOpen) return;
        if (formData.description.en && !descIdDirty && descEnDirty) {
            const timer = setTimeout(() => autoTranslate(formData.description.en, 'en', 'id', 'description'), 1200);
            return () => clearTimeout(timer);
        }
    }, [formData.description.en, modalOpen, descIdDirty, descEnDirty]);

    const openModal = (achievement = null) => {
        if (achievement) {
            let parsedTitle = { id: '', en: '' };
            let parsedDesc = { id: '', en: '' };
            try { parsedTitle = typeof achievement.title === 'string' && achievement.title.startsWith('{') ? JSON.parse(achievement.title) : { id: achievement.title, en: achievement.title }; } catch (e) { parsedTitle = { id: achievement.title, en: achievement.title }; }
            try { parsedDesc = typeof achievement.description === 'string' && achievement.description.startsWith('{') ? JSON.parse(achievement.description) : { id: achievement.description || '', en: achievement.description || '' }; } catch (e) { parsedDesc = { id: achievement.description || '', en: achievement.description || '' }; }

            setFormData({ ...achievement, title: parsedTitle, description: parsedDesc });
            setEditingAchievement(achievement);
        } else {
            setFormData({
                title: { id: '', en: '' },
                description: { id: '', en: '' },
                icon: 'Trophy',
                points: 100,
                criteria: {
                    type: 'complete_content',
                    target: 10,
                    timeLimit: 7,
                    contentType: 'any',
                    courseId: null
                }
            });
            setEditingAchievement(null);
            setTitleIdDirty(false);
            setTitleEnDirty(false);
            setDescIdDirty(false);
            setDescEnDirty(false);
        }

        if (achievement) {
            setTitleIdDirty(true);
            setTitleEnDirty(true);
            setDescIdDirty(true);
            setDescEnDirty(true);
        }
        setModalOpen(true);
        setIconSearch('');
    };

    const handleSaveClick = () => {
        const isEdit = !!editingAchievement;
        openConfirm({
            title: isEdit ? t('achievements.update_achievement') : t('achievements.add_achievement'),
            message: isEdit ? t('achievements.confirm_update') : t('achievements.confirm_add'),
            variant: isEdit ? 'confirm' : 'info',
            confirmLabel: isEdit ? t('achievements.yes_save') : t('achievements.yes_add'),
            onConfirm: handleConfirmSave
        });
    };

    const handleConfirmSave = async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
            const payload = {
                title: JSON.stringify(formData.title),
                description: JSON.stringify(formData.description),
                icon: formData.icon,
                points: formData.points,
                criteria_type: formData.criteria.type,
                criteria_value: formData.criteria.target, // Assuming target is the value
                badge_url: null // or handle upload
            };

            if (editingAchievement) {
                await api.put(`/achievements/${editingAchievement.id}`, payload);
            } else {
                await api.post('/achievements', payload);
            }

            if (onRefresh) onRefresh();
            setModalOpen(false);
        } catch (error) {
            console.error("Failed to save achievement", error);
            openAlert(t('achievements.failed'), t('achievements.save_failed'), "danger");
        }
    };

    const handleDelete = async (id) => {
        openConfirm({
            title: t('achievements.delete_achievement'),
            message: t('achievements.confirm_delete'),
            variant: 'warning',
            confirmLabel: t('achievements.yes_delete'),
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    await api.delete(`/achievements/${id}`);
                    if (onRefresh) onRefresh();
                } catch (error) {
                    console.error("Failed to delete achievement", error);
                    openAlert(t('achievements.failed'), t('achievements.delete_failed'), "danger");
                }
            }
        });
    };

    const handleRandomIcon = () => {
        const randomKey = ALL_ICON_KEYS[Math.floor(Math.random() * ALL_ICON_KEYS.length)];
        setFormData(prev => ({ ...prev, icon: randomKey }));
    };

    const getCriteriaLabel = (criteria) => {
        const typeLabels = {
            'complete_content': t('achievements.criteria_complete_content'),
            'complete_quiz': t('achievements.criteria_complete_quiz'),
            'perfect_score': t('achievements.criteria_perfect_score'),
            'login_streak': t('achievements.criteria_login_streak'),
            'course_completion': t('achievements.criteria_course_completion')
        };
        return typeLabels[criteria.type] || criteria.type;
    };

    const renderIcon = (iconName, className = "w-6 h-6") => {
        const IconComponent = LucideIcons[iconName] || LucideIcons.Trophy;
        return <IconComponent className={className} />;
    };

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Pagination Logic
    const totalPages = Math.ceil(achievements.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentAchievements = achievements.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('achievements.title')}</h2>
                    <p className="text-sm text-gray-600">{t('achievements.subtitle')}</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2"
                >
                    <LucideIcons.Plus className="w-4 h-4" /> {t('achievements.create_achievement')}
                </button>
            </div>

            {/* Achievement List */}
            {achievements.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                    <LucideIcons.Award className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 mb-4">{t('achievements.no_achievements')}</p>
                    <button
                        onClick={() => openModal()}
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        {t('achievements.create_first')}
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="grid gap-4">
                        {currentAchievements.map(achievement => (
                            <div key={achievement.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start gap-4">
                                    {/* Icon */}
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                        {renderIcon(achievement.icon, "w-8 h-8")}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg">{getTrans(achievement.title, i18n.language)}</h3>
                                        <p className="text-sm text-gray-600 mb-3">{getTrans(achievement.description, i18n.language)}</p>

                                        {/* Criteria Display */}
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <p className="text-xs font-bold text-gray-500 mb-2">{t('achievements.criteria_label')}</p>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                                                    <LucideIcons.Target className="w-3 h-3" />
                                                    {getCriteriaLabel(achievement.criteria)}
                                                </span>
                                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                                                    {t('achievements.target')}: {achievement.criteria.target}
                                                </span>
                                                {achievement.criteria.timeLimit > 0 && (
                                                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                                                        <LucideIcons.Clock className="w-3 h-3" />
                                                        {achievement.criteria.timeLimit} {t('achievements.days')}
                                                    </span>
                                                )}
                                                {achievement.criteria.contentType !== 'any' && (
                                                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                                                        {achievement.criteria.contentType} {t('achievements.only')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="mt-3 flex items-center gap-4 text-sm">
                                            <span className="text-gray-600">
                                                <span className="font-bold text-gray-900">{achievement.awardedCount}</span> {t('achievements.learners_earned')}
                                            </span>
                                            <span className="text-indigo-600 font-bold">
                                                +{achievement.points} XP
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${achievement.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {achievement.isActive ? t('achievements.active') : t('achievements.inactive')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => openModal(achievement)}
                                            className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"
                                            title={t('common.edit')}
                                        >
                                            <LucideIcons.Edit3 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(achievement.id)}
                                            className="text-red-600 hover:bg-red-50 p-2 rounded transition-colors"
                                            title={t('common.delete')}
                                        >
                                            <LucideIcons.Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t pt-4">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-600 bg-white border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <LucideIcons.ChevronLeft className="w-4 h-4" /> {t('achievements.previous')}
                            </button>

                            <span className="text-sm text-gray-600">
                                {t('achievements.page')} <span className="font-bold">{currentPage}</span> {t('achievements.of')} <span className="font-bold">{totalPages}</span>
                            </span>

                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-600 bg-white border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t('achievements.next_page')} <LucideIcons.ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Achievement Modal */}
            <AdminModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingAchievement ? t('achievements.edit_achievement') : t('achievements.create_achievement')}
            >
                <div className="space-y-4">
                    {/* Basic Info */}
                    <div>
                        <label className="block font-bold text-sm mb-1">{t('achievements.form_title')} *</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <span className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1.5">
                                    Indonesia (ID)
                                    {isTranslatingTitle && !titleIdDirty && <LucideIcons.Loader2 size={12} className="animate-spin text-indigo-500" />}
                                    {formData.title.en && !formData.title.id && !isTranslatingTitle && <LucideIcons.Sparkles size={12} className="text-amber-500" />}
                                </span>
                                <input
                                    value={formData.title.id}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData(f => ({ ...f, title: { ...f.title, id: val, ...(val === '' && !titleEnDirty ? { en: '' } : {}) } }));
                                        setTitleIdDirty(val.trim() !== '');
                                        if (val === '') setTitleEnDirty(false);
                                    }}
                                    className="w-full p-2 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                    placeholder="Contoh: Sang Juara"
                                />
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1.5">
                                    English (EN)
                                    {isTranslatingTitle && !titleEnDirty && <LucideIcons.Loader2 size={12} className="animate-spin text-indigo-500" />}
                                    {formData.title.id && !formData.title.en && !isTranslatingTitle && <LucideIcons.Sparkles size={12} className="text-amber-500" />}
                                </span>
                                <input
                                    value={formData.title.en}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData(f => ({ ...f, title: { ...f.title, en: val, ...(val === '' && !titleIdDirty ? { id: '' } : {}) } }));
                                        setTitleEnDirty(val.trim() !== '');
                                        if (val === '') setTitleIdDirty(false);
                                    }}
                                    className="w-full p-2 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                    placeholder="Example: The Champion"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block font-bold text-sm mb-1">{t('achievements.form_description')}</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <span className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1.5">
                                    Indonesia (ID)
                                    {isTranslatingDesc && !descIdDirty && <LucideIcons.Loader2 size={12} className="animate-spin text-indigo-500" />}
                                    {formData.description.en && !formData.description.id && !isTranslatingDesc && <LucideIcons.Sparkles size={12} className="text-amber-500" />}
                                </span>
                                <textarea
                                    value={formData.description.id}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData(f => ({ ...f, description: { ...f.description, id: val, ...(val === '' && !descEnDirty ? { en: '' } : {}) } }));
                                        setDescIdDirty(val.trim() !== '');
                                        if (val === '') setDescEnDirty(false);
                                    }}
                                    className="w-full p-2 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
                                    rows="2"
                                    placeholder="Deskripsi ID..."
                                />
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1.5">
                                    English (EN)
                                    {isTranslatingDesc && !descEnDirty && <LucideIcons.Loader2 size={12} className="animate-spin text-indigo-500" />}
                                    {formData.description.id && !formData.description.en && !isTranslatingDesc && <LucideIcons.Sparkles size={12} className="text-amber-500" />}
                                </span>
                                <textarea
                                    value={formData.description.en}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData(f => ({ ...f, description: { ...f.description, en: val, ...(val === '' && !descIdDirty ? { id: '' } : {}) } }));
                                        setDescEnDirty(val.trim() !== '');
                                        if (val === '') setDescIdDirty(false);
                                    }}
                                    className="w-full p-2 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
                                    rows="2"
                                    placeholder="EN description..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-2">
                            <label className="block font-bold text-sm">{t('achievements.icon_library')}</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <LucideIcons.Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
                                    <input
                                        value={iconSearch}
                                        onChange={(e) => setIconSearch(e.target.value)}
                                        className="w-full pl-8 p-2 border rounded-lg text-sm"
                                        placeholder={t('achievements.search_icons')}
                                    />
                                </div>
                                <button
                                    onClick={handleRandomIcon}
                                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600"
                                    title={t('achievements.random_icon')}
                                >
                                    <LucideIcons.Shuffle className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-5 gap-2 border rounded-lg p-2 h-40 overflow-y-auto content-start">
                                {filteredIcons.map((key) => {
                                    const IconExp = LucideIcons[key];
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setFormData({ ...formData, icon: key })}
                                            className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-colors ${formData.icon === key ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-500' : 'hover:bg-gray-100 text-gray-500'}`}
                                            title={key}
                                        >
                                            <IconExp className="w-5 h-5" />
                                        </button>
                                    );
                                })}
                                {filteredIcons.length === 0 && (
                                    <div className="col-span-5 text-center text-xs text-gray-400 py-4">
                                        {t('achievements.no_icons')}
                                    </div>
                                )}
                            </div>
                            <div className="text-xs text-gray-400 text-right">
                                {filteredIcons.length} {t('achievements.shown')}
                            </div>
                        </div>

                        <div>
                            <label className="block font-bold text-sm mb-1">{t('achievements.xp_reward')}</label>
                            <input
                                type="number"
                                value={formData.points}
                                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                                className="w-full p-2 border rounded-lg"
                                min="0"
                                step="10"
                            />

                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border flex flex-col items-center justify-center">
                                <label className="text-xs font-bold text-gray-500 mb-2">{t('achievements.icon_preview')}</label>
                                <div className="p-4 bg-white rounded-xl shadow-sm border border-indigo-100">
                                    {renderIcon(formData.icon, "w-12 h-12 text-indigo-600")}
                                </div>
                                <p className="text-xs text-gray-400 mt-2 font-mono">{formData.icon}</p>
                            </div>
                        </div>
                    </div>

                    {/* Criteria Builder */}
                    <div className="border-t pt-4">
                        <h3 className="font-bold mb-3 flex items-center gap-2">
                            <LucideIcons.Target className="w-4 h-4" /> {t('achievements.criteria_section')}
                        </h3>

                        <div>
                            <label className="block font-bold text-sm mb-1">{t('achievements.trigger_type')}</label>
                            <select
                                value={formData.criteria.type}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    criteria: { ...formData.criteria, type: e.target.value }
                                })}
                                className="w-full p-2 border rounded-lg"
                            >
                                <option value="complete_content">{t('achievements.criteria_complete_content')}</option>
                                <option value="complete_quiz">{t('achievements.criteria_complete_quiz')}</option>
                                <option value="perfect_score">{t('achievements.criteria_perfect_score')}</option>
                                <option value="login_streak">{t('achievements.criteria_login_streak')}</option>
                                <option value="course_completion">{t('achievements.criteria_course_completion')}</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <div>
                                <label className="block font-bold text-sm mb-1">{t('achievements.target_count')}</label>
                                <input
                                    type="number"
                                    value={formData.criteria.target}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        criteria: { ...formData.criteria, target: parseInt(e.target.value) || 1 }
                                    })}
                                    className="w-full p-2 border rounded-lg"
                                    min="1"
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-sm mb-1">{t('achievements.time_limit')}</label>
                                <input
                                    type="number"
                                    value={formData.criteria.timeLimit}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        criteria: { ...formData.criteria, timeLimit: parseInt(e.target.value) || 0 }
                                    })}
                                    className="w-full p-2 border rounded-lg"
                                    min="0"
                                    placeholder="0 = no limit"
                                />
                            </div>
                        </div>

                        {formData.criteria.type === 'complete_content' && (
                            <div className="mt-3">
                                <label className="block font-bold text-sm mb-1">{t('achievements.content_type_filter')}</label>
                                <select
                                    value={formData.criteria.contentType}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        criteria: { ...formData.criteria, contentType: e.target.value }
                                    })}
                                    className="w-full p-2 border rounded-lg"
                                >
                                    <option value="any">{t('achievements.any_content')}</option>
                                    <option value="video">{t('achievements.video_only')}</option>
                                    <option value="quiz">{t('achievements.quiz_only')}</option>
                                    <option value="ppt">{t('achievements.document_only')}</option>
                                    <option value="text">{t('achievements.article_only')}</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <button
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleSaveClick}
                            disabled={!formData.title || !formData.description}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                        >
                            {editingAchievement ? t('common.update') : t('achievements.create')} {t('achievements.achievement')}
                        </button>
                    </div>
                </div>
            </AdminModal>
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
