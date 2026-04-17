// NotificationsPage - Gmail-style notification center
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, Trash2, ArrowLeft, Clock, Check, Info, AlertTriangle, AlertCircle, CheckCircle2, Mail, MailOpen, ChevronRight, RefreshCw, Search } from 'lucide-react';
import api from '../services/api';
import { toast } from '../components/ui/Toast';
import { useTranslation } from 'react-i18next';
import { processTransParams, getTrans } from '../lib/transHelper';
import { useUser } from '../contexts/UserContext';

const TYPE_CONFIG = {
    info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
    success: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' },
    error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
};

export const NotificationsPage = ({ isAdminView = false }) => {
    const navigate = useNavigate();
    const { user } = useUser();
    const { t, i18n } = useTranslation();
    const [notifications, setNotifications] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // all | unread | read

    const formatTime = (date) => {
        const d = new Date(date);
        const now = new Date();
        const diffMs = now - d;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return t('notifications.just_now');
        if (diffMin < 60) return t('notifications.minutes_ago', { count: diffMin });
        if (diffHr < 24) return t('notifications.hours_ago', { count: diffHr });
        if (diffDay < 7) return t('notifications.days_ago', { count: diffDay });
        const locale = i18n.language === 'en' ? 'en-US' : 'id-ID';
        return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await api.get('/notifications');
            setNotifications(res.data.notifications || []);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchNotifications(); }, []);

    useEffect(() => {
        if (!isAdminView && user?.role === 'admin') {
            navigate('/admin/notifications', { replace: true });
        }
    }, [user, isAdminView, navigate]);

    const selected = notifications.find(n => n.id === selectedId);

    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
        } catch (err) { console.error(err); }
    };

    const markAllRead = async () => {
        try {
            await api.post('/notifications/read');
            setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
            toast.success(t('notifications.all_marked_read'));
        } catch (err) { console.error(err); }
    };

    const deleteNotification = async (id) => {
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(prev => prev.filter(n => n.id !== id));
            if (selectedId === id) setSelectedId(null);
            toast.success(t('notifications.notification_deleted'));
        } catch (err) { console.error(err); }
    };

    const deleteAll = async () => {
        if (!confirm(t('notifications.delete_all_confirm'))) return;
        try {
            await api.delete('/notifications');
            setNotifications([]);
            setSelectedId(null);
            toast.success(t('notifications.all_deleted'));
        } catch (err) { console.error(err); }
    };

    const handleSelect = (notif) => {
        setSelectedId(notif.id);
        if (!notif.read_at) markAsRead(notif.id);
    };

    // Filtering
    const filtered = notifications.filter(n => {
        if (filter === 'unread' && n.read_at) return false;
        if (filter === 'read' && !n.read_at) return false;
        if (search) {
            const q = search.toLowerCase();
            const title = (n.data?.title || '').toLowerCase();
            const body = (n.data?.message || n.data?.body || '').toLowerCase();
            return title.includes(q) || body.includes(q);
        }
        return true;
    });

    // Helper to translate notification content dynamically
    const getTitle = (n) => n.data?.title_key ? t(n.data.title_key, processTransParams(n.data.title_params, i18n.language) || {}) : getTrans(n.data?.title, i18n.language) || t('notifications.notification_fallback');
    const getMessage = (n) => n.data?.message_key ? t(n.data.message_key, processTransParams(n.data.message_params, i18n.language) || {}) : getTrans(n.data?.message || n.data?.body, i18n.language) || '';

    const unreadCount = notifications.filter(n => !n.read_at).length;

    const filterOptions = [
        ['all', t('notifications.filter_all')],
        ['unread', t('notifications.filter_unread')],
        ['read', t('notifications.filter_read')]
    ];

    const locale = i18n.language === 'en' ? 'en-US' : 'id-ID';

    return (
        <div className={isAdminView ? "h-full bg-white flex flex-col" : "min-h-screen bg-gray-50 flex flex-col"}>
            {/* Header */}
            {!isAdminView && (
                <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shrink-0">
                    <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <ArrowLeft size={20} className="text-gray-600" />
                            </button>
                            <div className="flex items-center gap-2">
                                <Bell className="w-6 h-6 text-blue-600" />
                                <h1 className="text-xl font-bold text-gray-900">{t('notifications.title')}</h1>
                                {unreadCount > 0 && (
                                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={fetchNotifications} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title={t('common.refresh')}>
                                <RefreshCw size={18} className="text-gray-500" />
                            </button>
                            {unreadCount > 0 && (
                                <button onClick={markAllRead} className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 hover:bg-blue-50 rounded-lg transition-colors">
                                    {t('notifications.mark_all_read')}
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button onClick={deleteAll} className="text-sm text-red-500 hover:text-red-700 font-medium px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors">
                                    {t('notifications.delete_all')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Inner actions for Admin View since the main header is hidden */}
            {isAdminView && (
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-gray-400" />
                        <h2 className="font-bold text-gray-800">{t('notifications.title')}</h2>
                        {unreadCount > 0 && (
                            <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={fetchNotifications} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" title={t('common.refresh')}>
                            <RefreshCw size={16} className="text-gray-500" />
                        </button>
                        {unreadCount > 0 && (
                            <button onClick={markAllRead} className="text-[11px] text-blue-600 hover:text-blue-800 font-bold px-2 py-1 rounded transition-colors">
                                {t('notifications.mark_all_read')}
                            </button>
                        )}
                        <button onClick={deleteAll} className="text-[11px] text-red-500 hover:text-red-700 font-bold px-2 py-1 rounded transition-colors">
                            {t('notifications.delete_all')}
                        </button>
                    </div>
                </div>
            )}

            <div className={`flex-1 ${!isAdminView ? 'max-w-7xl mx-auto w-full px-4 md:px-8 py-8' : ''} flex`}>
                <div className={`bg-white ${!isAdminView ? 'rounded-2xl shadow-sm border border-gray-200 min-h-[600px]' : ''} flex flex-col md:flex-row overflow-hidden w-full`}>

                    {/* LEFT: Notification List */}
                    <div className="w-full lg:w-96 lg:flex-shrink-0 space-y-4">
                        {/* Search + Filter */}
                        <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-3">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={t('notifications.search_placeholder')}
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                />
                            </div>
                            <div className="flex gap-1">
                                {filterOptions.map(([key, label]) => (
                                    <button
                                        key={key}
                                        onClick={() => setFilter(key)}
                                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filter === key
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notification Items */}
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                            {loading ? (
                                <div className="p-8 text-center text-gray-400">
                                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                                    <p className="text-sm">{t('notifications.loading')}</p>
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 font-medium">{t('notifications.no_notifications')}</p>
                                    <p className="text-gray-400 text-sm mt-1">
                                        {filter !== 'all' ? t('notifications.try_other_filter') : t('notifications.all_clear')}
                                    </p>
                                </div>
                            ) : (
                                filtered.map(notif => {
                                    const type = notif.data?.type || 'info';
                                    const config = TYPE_CONFIG[type] || TYPE_CONFIG.info;
                                    const Icon = config.icon;
                                    const isSelected = notif.id === selectedId;
                                    const isUnread = !notif.read_at;

                                    return (
                                        <button
                                            key={notif.id}
                                            onClick={() => handleSelect(notif)}
                                            className={`w-full text-left p-4 flex items-start gap-3 transition-all cursor-pointer
                                                ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent hover:bg-gray-50'}
                                                ${isUnread ? 'bg-blue-50/30' : ''}`}
                                        >
                                            <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0 mt-0.5`}>
                                                <Icon size={16} className={config.color} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4 className={`text-sm truncate ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                        {getTitle(notif)}
                                                    </h4>
                                                    {isUnread && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                                                </div>
                                                <p className="text-xs text-gray-500 truncate mt-0.5">{getMessage(notif)}</p>
                                                <p className="text-[11px] text-gray-400 mt-1">{formatTime(notif.created_at)}</p>
                                            </div>
                                            <ChevronRight size={14} className="text-gray-300 flex-shrink-0 mt-2" />
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Detail Panel */}
                    <div className="flex-1 min-h-0">
                        {selected ? (() => {
                            const type = selected.data?.type || 'info';
                            const config = TYPE_CONFIG[type] || TYPE_CONFIG.info;
                            const Icon = config.icon;

                            return (
                                <div className="bg-white rounded-xl border border-gray-200 h-full">
                                    {/* Detail Header */}
                                    <div className="p-6 border-b border-gray-100">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-4">
                                                <div className={`p-3 rounded-xl ${config.bg}`}>
                                                    <Icon size={24} className={config.color} />
                                                </div>
                                                <div>
                                                    <h2 className="text-lg font-bold text-gray-900">
                                                        {getTitle(selected)}
                                                    </h2>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                                        </span>
                                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                                            <Clock size={12} />
                                                            {new Date(selected.created_at).toLocaleString(locale, {
                                                                day: 'numeric', month: 'long', year: 'numeric',
                                                                hour: '2-digit', minute: '2-digit'
                                                            })}
                                                        </span>
                                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                                            {selected.read_at ? <MailOpen size={12} /> : <Mail size={12} />}
                                                            {selected.read_at ? t('notifications.read') : t('notifications.unread')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => deleteNotification(selected.id)}
                                                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                                                title={t('notifications.delete_tooltip')}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Detail Body */}
                                    <div className="p-6">
                                        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                                            <p className="whitespace-pre-wrap text-base">{getMessage(selected) || t('notifications.no_body')}</p>
                                        </div>

                                        {/* Action URL */}
                                        {(() => {
                                            const url = selected.data?.action_url;
                                            const nType = selected.data?.type;
                                            // Smart label based on URL or type
                                            let label = t('notifications.view_detail');
                                            if (url?.includes('security')) label = t('notifications.check_security');
                                            else if (url?.includes('course')) label = t('notifications.view_course');
                                            else if (url?.includes('session')) label = t('notifications.view_schedule');
                                            else if (url?.includes('profile') || url?.includes('achievement')) label = t('notifications.view_profile');
                                            else if (url?.includes('certificate')) label = t('notifications.view_certificate');
                                            else if (url?.includes('leaderboard')) label = t('notifications.view_leaderboard');
                                            else if (nType === 'warning') label = t('notifications.action');

                                            if (!url) return null;
                                            return (
                                                <div className="mt-6">
                                                    <button
                                                        onClick={() => {
                                                            if (url.startsWith('http')) window.open(url, '_blank');
                                                            else navigate(url);
                                                        }}
                                                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                                                    >
                                                        {label} <ChevronRight size={16} />
                                                    </button>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            );
                        })() : (
                            <div className="bg-white rounded-xl border border-gray-200 h-full flex items-center justify-center">
                                <div className="text-center p-12">
                                    <Mail className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-400">{t('notifications.select_notification')}</h3>
                                    <p className="text-sm text-gray-400 mt-1">{t('notifications.select_hint')}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationsPage;
