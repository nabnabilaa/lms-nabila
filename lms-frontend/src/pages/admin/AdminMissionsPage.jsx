import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Target, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Search, Zap, Star,
    Calendar, Clock, CheckCircle, AlertCircle, X, Loader2,
    Key, BookOpen, Gift, Flame, MessageCircle, Trophy, Video,
    Rocket, Sparkles, Gamepad2, GraduationCap, Lightbulb, Pencil
} from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../components/ui/Toast';
import { getTrans } from '../../lib/transHelper';



const LUCIDE_ICON_MAP = {
    Target, Key, BookOpen, Gift, Flame, MessageCircle, Trophy, Video,
    Rocket, Star, Sparkles, Gamepad2, GraduationCap, Lightbulb, Pencil, Zap,
};

const ICON_OPTIONS = Object.keys(LUCIDE_ICON_MAP);

const renderLucideIcon = (iconName, size = 20, className = '') => {
    const IconComponent = LUCIDE_ICON_MAP[iconName];
    if (!IconComponent) return <Target size={size} className={className} />;
    return <IconComponent size={size} className={className} />;
};

const defaultForm = {
    title: { id: '', en: '' },
    description: { id: '', en: '' },
    type: 'daily',
    xp_reward: 10,
    icon: 'Target',
    action_type: 'manual',
    action_target: 1,
    is_active: true,
    starts_at: '',
    expires_at: '',
};

export const AdminMissionsPage = () => {
    const { t, i18n } = useTranslation();

    const TYPE_BADGES = {
        daily: { label: t('admin_missions.type_daily'), color: 'bg-blue-100 text-blue-700' },
        weekly: { label: t('admin_missions.type_weekly'), color: 'bg-purple-100 text-purple-700' },
        special: { label: t('admin_missions.type_special'), color: 'bg-amber-100 text-amber-700' },
    };

    const ACTION_LABELS = {
        login: t('admin_missions.action_login'),
        complete_lesson: t('admin_missions.action_complete_lesson'),
        complete_quiz: t('admin_missions.action_complete_quiz'),
        post_discussion: t('admin_missions.action_post_discussion'),
        watch_session: t('admin_missions.action_watch_session'),
        manual: t('admin_missions.action_manual'),
    };

    const [missions, setMissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ ...defaultForm });
    const [saving, setSaving] = useState(false);

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

            // Google Translate returns an array of chunks: data[0] is an array of [translated_chunk, original_chunk]
            let translated = '';
            if (data && data[0]) {
                data[0].forEach(chunk => {
                    if (chunk[0]) translated += chunk[0];
                });
            }

            if (translated && translated.trim() !== '') {
                setForm(prev => ({
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
        if (!showModal) return;
        // ID -> EN
        if (form.title.id && !titleEnDirty && titleIdDirty) {
            const timer = setTimeout(() => autoTranslate(form.title.id, 'id', 'en', 'title'), 1200);
            return () => clearTimeout(timer);
        }
    }, [form.title.id, showModal, titleEnDirty, titleIdDirty]);

    useEffect(() => {
        if (!showModal) return;
        // EN -> ID
        if (form.title.en && !titleIdDirty && titleEnDirty) {
            const timer = setTimeout(() => autoTranslate(form.title.en, 'en', 'id', 'title'), 1200);
            return () => clearTimeout(timer);
        }
    }, [form.title.en, showModal, titleIdDirty, titleEnDirty]);


    // --- DESCRIPTION TRANSLATION (Bidirectional) ---
    useEffect(() => {
        if (!showModal) return;
        // ID -> EN
        if (form.description.id && !descEnDirty && descIdDirty) {
            const timer = setTimeout(() => autoTranslate(form.description.id, 'id', 'en', 'description'), 1200);
            return () => clearTimeout(timer);
        }
    }, [form.description.id, showModal, descEnDirty, descIdDirty]);

    useEffect(() => {
        if (!showModal) return;
        // EN -> ID
        if (form.description.en && !descIdDirty && descEnDirty) {
            const timer = setTimeout(() => autoTranslate(form.description.en, 'en', 'id', 'description'), 1200);
            return () => clearTimeout(timer);
        }
    }, [form.description.en, showModal, descIdDirty, descEnDirty]);

    const fetchMissions = async () => {
        try {
            setLoading(true);
            const res = await api.get('/daily-missions');
            setMissions(res.data.missions || []);
        } catch (err) {
            toast.error(t('admin_missions.load_failed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMissions(); }, []);

    const filtered = missions.filter(m => {
        if (filterType !== 'all' && m.type !== filterType) return false;
        if (search) {
            const q = search.toLowerCase();
            return m.title.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q);
        }
        return true;
    });

    const openCreate = () => {
        setForm({ ...defaultForm });
        setEditingId(null);
        setTitleIdDirty(false);
        setTitleEnDirty(false);
        setDescIdDirty(false);
        setDescEnDirty(false);
        setShowModal(true);
    };

    const openEdit = (mission) => {
        let parsedTitle = { id: '', en: '' };
        let parsedDesc = { id: '', en: '' };
        try { parsedTitle = typeof mission.title === 'string' && mission.title.startsWith('{') ? JSON.parse(mission.title) : { id: mission.title, en: mission.title }; } catch (e) { parsedTitle = { id: mission.title, en: mission.title }; }
        try { parsedDesc = typeof mission.description === 'string' && mission.description.startsWith('{') ? JSON.parse(mission.description) : { id: mission.description || '', en: mission.description || '' }; } catch (e) { parsedDesc = { id: mission.description || '', en: mission.description || '' }; }

        setForm({
            title: parsedTitle,
            description: parsedDesc,
            type: mission.type,
            xp_reward: mission.xp_reward,
            icon: mission.icon || 'Target',
            action_type: mission.action_type,
            action_target: mission.action_target,
            is_active: mission.is_active,
            starts_at: mission.starts_at ? mission.starts_at.split('T')[0] : '',
            expires_at: mission.expires_at ? mission.expires_at.split('T')[0] : '',
        });
        setEditingId(mission.id);
        setTitleIdDirty(true);
        setTitleEnDirty(true);
        setDescIdDirty(true);
        setDescEnDirty(true);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.title.id?.trim() || !form.title.en?.trim()) return toast.error(t('admin_missions.title_required'));

        // Convert to JSON strings for backend
        const payload = { ...form };
        payload.title = JSON.stringify(form.title);
        payload.description = JSON.stringify(form.description);

        setSaving(true);
        try {
            if (editingId) {
                await api.put(`/daily-missions/${editingId}`, payload);
                toast.success(t('admin_missions.mission_updated'));
            } else {
                await api.post('/daily-missions', payload);
                toast.success(t('admin_missions.mission_created'));
            }
            setShowModal(false);
            fetchMissions();
        } catch (err) {
            toast.error(err.response?.data?.message || t('admin_missions.save_failed'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm(t('admin_missions.confirm_delete'))) return;
        try {
            await api.delete(`/daily-missions/${id}`);
            toast.success(t('admin_missions.mission_deleted'));
            fetchMissions();
        } catch (err) {
            toast.error(t('admin_missions.delete_failed'));
        }
    };

    const handleToggle = async (id) => {
        try {
            const res = await api.post(`/daily-missions/${id}/toggle`);
            setMissions(prev => prev.map(m => m.id === id ? { ...m, is_active: res.data.is_active } : m));
            toast.success(res.data.message);
        } catch (err) {
            toast.error(t('admin_missions.toggle_failed'));
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 rounded-xl">
                        <Target className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('admin_missions.title')}</h1>
                        <p className="text-sm text-gray-500">{t('admin_missions.subtitle')}</p>
                    </div>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <Plus size={16} /> {t('admin_missions.create_mission')}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: t('admin_missions.total_missions'), value: missions.length, icon: Target, color: 'bg-blue-50 text-blue-600' },
                    { label: t('admin_missions.active'), value: missions.filter(m => m.is_active).length, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
                    { label: t('admin_missions.inactive'), value: missions.filter(m => !m.is_active).length, icon: AlertCircle, color: 'bg-gray-50 text-gray-500' },
                    { label: t('admin_missions.total_xp_pool'), value: missions.reduce((s, m) => s + m.xp_reward, 0), icon: Zap, color: 'bg-amber-50 text-amber-600' },
                ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`p-1.5 rounded-lg ${stat.color}`}>
                                <stat.icon size={14} />
                            </div>
                            <span className="text-xs text-gray-500 font-medium">{stat.label}</span>
                        </div>
                        <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('admin_missions.search_placeholder')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                    />
                </div>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                    {[['all', t('admin_missions.filter_all')], ['daily', t('admin_missions.type_daily')], ['weekly', t('admin_missions.type_weekly')], ['special', t('admin_missions.type_special')]].map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setFilterType(key)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filterType === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Missions Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-400">
                        <div className="animate-spin w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-3" />
                        <p className="text-sm">{t('admin_missions.loading')}</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center">
                        <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">{t('admin_missions.no_missions')}</p>
                        <p className="text-gray-400 text-sm mt-1">{t('admin_missions.no_missions_hint')}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('admin_missions.col_mission')}</th>
                                    <th className="text-center px-4 py-3 font-semibold text-gray-600">{t('admin_missions.col_type')}</th>
                                    <th className="text-center px-4 py-3 font-semibold text-gray-600">{t('admin_missions.col_xp')}</th>
                                    <th className="text-center px-4 py-3 font-semibold text-gray-600">{t('admin_missions.col_action')}</th>
                                    <th className="text-center px-4 py-3 font-semibold text-gray-600">{t('admin_missions.col_target')}</th>
                                    <th className="text-center px-4 py-3 font-semibold text-gray-600">{t('admin_missions.col_completions')}</th>
                                    <th className="text-center px-4 py-3 font-semibold text-gray-600">{t('admin_missions.col_status')}</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-600">{t('admin_missions.col_actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(mission => {
                                    const typeBadge = TYPE_BADGES[mission.type] || TYPE_BADGES.daily;
                                    return (
                                        <tr key={mission.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                        {renderLucideIcon(mission.icon || 'Target', 18)}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{getTrans(mission.title, i18n.language)}</p>
                                                        {mission.description && (
                                                            <p className="text-xs text-gray-400 truncate max-w-xs">{getTrans(mission.description, i18n.language)}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${typeBadge.color}`}>
                                                    {typeBadge.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="flex items-center justify-center gap-1 text-amber-600 font-bold">
                                                    <Zap size={12} /> {mission.xp_reward}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="text-xs text-gray-600">{ACTION_LABELS[mission.action_type] || mission.action_type}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-gray-600">
                                                {mission.action_target}x
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="text-xs text-gray-500">{mission.total_completions || 0} {t('admin_missions.times')}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button onClick={() => handleToggle(mission.id)} title={mission.is_active ? t('admin_missions.deactivate') : t('admin_missions.activate')}>
                                                    {mission.is_active ? (
                                                        <ToggleRight size={24} className="text-green-500 hover:text-green-600 transition-colors" />
                                                    ) : (
                                                        <ToggleLeft size={24} className="text-gray-300 hover:text-gray-400 transition-colors" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => openEdit(mission)} className="p-2 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button onClick={() => handleDelete(mission.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)} />

                    {/* Centered Scrollable Container */}
                    <div className="flex min-h-full items-center justify-center p-4 py-10 sm:p-6">
                        <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 rounded-lg">
                                        <Target size={20} className="text-indigo-600" />
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-900">
                                        {editingId ? t('admin_missions.edit_mission') : t('admin_missions.create_new_mission')}
                                    </h2>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <X size={18} className="text-gray-400" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-5">
                                {/* Icon Picker */}
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">Icon</label>
                                    <div className="flex flex-wrap gap-2">
                                        {ICON_OPTIONS.map(iconName => (
                                            <button
                                                key={iconName}
                                                onClick={() => setForm(f => ({ ...f, icon: iconName }))}
                                                className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 transition-all ${form.icon === iconName ? 'border-indigo-500 bg-indigo-50 scale-110 text-indigo-600' : 'border-gray-200 hover:border-gray-300 text-gray-500'
                                                    }`}
                                                title={iconName}
                                            >
                                                {renderLucideIcon(iconName, 18)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Title */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-gray-700 block">{t('admin_missions.mission_title')} *</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <span className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1.5">
                                                Indonesia (ID)
                                                {isTranslatingTitle && !titleIdDirty && <Loader2 size={12} className="animate-spin text-indigo-500" />}
                                                {form.title.en && !form.title.id && !isTranslatingTitle && <Sparkles size={12} className="text-amber-500" />}
                                            </span>
                                            <input
                                                type="text"
                                                value={form.title.id}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setForm(f => ({
                                                        ...f,
                                                        title: { ...f.title, id: val, ...(val === '' && !titleEnDirty ? { en: '' } : {}) }
                                                    }));
                                                    setTitleIdDirty(val.trim() !== '');
                                                    if (val === '') setTitleEnDirty(false); // Reset peer dirty state if cleared
                                                }}
                                                placeholder="Contoh: Login Harian"
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1.5">
                                                English (EN)
                                                {isTranslatingTitle && !titleEnDirty && <Loader2 size={12} className="animate-spin text-indigo-500" />}
                                                {form.title.id && !form.title.en && !isTranslatingTitle && <Sparkles size={12} className="text-amber-500" />}
                                            </span>
                                            <input
                                                type="text"
                                                value={form.title.en}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setForm(f => ({
                                                        ...f,
                                                        title: { ...f.title, en: val, ...(val === '' && !titleIdDirty ? { id: '' } : {}) }
                                                    }));
                                                    setTitleEnDirty(val.trim() !== '');
                                                    if (val === '') setTitleIdDirty(false);
                                                }}
                                                placeholder="Example: Daily Login"
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-gray-700 block">{t('admin_missions.description')}</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <span className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1.5">
                                                Indonesia (ID)
                                                {isTranslatingDesc && !descIdDirty && <Loader2 size={12} className="animate-spin text-indigo-500" />}
                                                {form.description.en && !form.description.id && !isTranslatingDesc && <Sparkles size={12} className="text-amber-500" />}
                                            </span>
                                            <textarea
                                                value={form.description.id}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setForm(f => ({
                                                        ...f,
                                                        description: { ...f.description, id: val, ...(val === '' && !descEnDirty ? { en: '' } : {}) }
                                                    }));
                                                    setDescIdDirty(val.trim() !== '');
                                                    if (val === '') setDescEnDirty(false);
                                                }}
                                                placeholder="Deskripsi ID..."
                                                rows={2}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1.5">
                                                English (EN)
                                                {isTranslatingDesc && !descEnDirty && <Loader2 size={12} className="animate-spin text-indigo-500" />}
                                                {form.description.id && !form.description.en && !isTranslatingDesc && <Sparkles size={12} className="text-amber-500" />}
                                            </span>
                                            <textarea
                                                value={form.description.en}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setForm(f => ({
                                                        ...f,
                                                        description: { ...f.description, en: val, ...(val === '' && !descIdDirty ? { id: '' } : {}) }
                                                    }));
                                                    setDescEnDirty(val.trim() !== '');
                                                    if (val === '') setDescIdDirty(false);
                                                }}
                                                placeholder="EN description..."
                                                rows={2}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Type + XP Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-1 block">{t('admin_missions.mission_type')}</label>
                                        <select
                                            value={form.type}
                                            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white"
                                        >
                                            <option value="daily">{t('admin_missions.type_daily')}</option>
                                            <option value="weekly">{t('admin_missions.type_weekly')}</option>
                                            <option value="special">{t('admin_missions.type_special')}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-1 block">XP Reward</label>
                                        <div className="relative">
                                            <Zap size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                                            <input
                                                type="number"
                                                value={form.xp_reward}
                                                onChange={e => setForm(f => ({ ...f, xp_reward: parseInt(e.target.value) || 0 }))}
                                                min={1}
                                                max={1000}
                                                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Action Type + Target */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-1 block">{t('admin_missions.action_type')}</label>
                                        <select
                                            value={form.action_type}
                                            onChange={e => setForm(f => ({ ...f, action_type: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white"
                                        >
                                            <option value="manual">{t('admin_missions.action_manual')}</option>
                                            <option value="login">{t('admin_missions.action_login')}</option>
                                            <option value="complete_lesson">{t('admin_missions.action_complete_lesson')}</option>
                                            <option value="complete_quiz">{t('admin_missions.action_complete_quiz')}</option>
                                            <option value="post_discussion">{t('admin_missions.action_post_discussion')}</option>
                                            <option value="watch_session">{t('admin_missions.action_watch_session')}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-1 block">{t('admin_missions.target_count')}</label>
                                        <input
                                            type="number"
                                            value={form.action_target}
                                            onChange={e => setForm(f => ({ ...f, action_target: parseInt(e.target.value) || 1 }))}
                                            min={1}
                                            max={100}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                        />
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-1 block">{t('admin_missions.start_date')}</label>
                                        <input
                                            type="date"
                                            value={form.starts_at}
                                            onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-1 block">{t('admin_missions.end_date')}</label>
                                        <input
                                            type="date"
                                            value={form.expires_at}
                                            onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                        />
                                    </div>
                                </div>

                                {/* Active Toggle */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">{t('admin_missions.active_status')}</p>
                                        <p className="text-xs text-gray-400">{t('admin_missions.active_status_hint')}</p>
                                    </div>
                                    <button
                                        onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                                        className="transition-colors"
                                    >
                                        {form.is_active ? (
                                            <ToggleRight size={32} className="text-green-500" />
                                        ) : (
                                            <ToggleLeft size={32} className="text-gray-300" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
                                >
                                    {saving ? t('admin_missions.saving') : editingId ? t('admin_missions.save_changes') : t('admin_missions.create_mission')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminMissionsPage;
