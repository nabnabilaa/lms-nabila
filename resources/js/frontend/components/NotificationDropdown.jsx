import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, Trash2, Clock, Check, ExternalLink } from 'lucide-react';
import api from '../services/api';
import { toast } from './ui/Toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useTranslation } from 'react-i18next';
import { processTransParams, getTrans } from '../lib/transHelper';
import { useUser } from '../contexts/UserContext';

export const NotificationDropdown = () => {
    const navigate = useNavigate();
    const { user } = useUser();
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
    const lastNotifIdRef = useRef(null);
    const isFirstLoadRef = useRef(true);

    const dropdownRef = useRef(null);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        message: '',
        title: '',
        variant: 'confirm',
        confirmLabel: '',
        cancelLabel: '',
        onConfirm: null
    });

    // --- 1. LOGIC: Click outside to close dropdown ---
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- 2. LOGIC: Fetch Data from API ---
    const fetchNotifications = async () => {
        try {
            const response = await api.get('/notifications');
            const notifs = response.data?.notifications || [];
            const mappedData = notifs.map(n => ({
                id: n.id,
                data: n.data, // Store raw data for dynamic language switching in JSX
                title: n.data.title_key ? t(n.data.title_key, processTransParams(n.data.title_params, i18n.language) || {}) : getTrans(n.data.title, i18n.language),
                message: n.data.message_key ? t(n.data.message_key, processTransParams(n.data.message_params, i18n.language) || {}) : getTrans(n.data.message, i18n.language),
                type: n.data.type, // 'success', 'warning', 'info'
                actionUrl: n.data.action_url,
                time: new Date(n.created_at),
                isRead: n.read_at !== null
            }));

            // Popup Notification Logic
            if (mappedData.length > 0) {
                const latest = mappedData[0];

                if (!isFirstLoadRef.current && lastNotifIdRef.current && latest.id !== lastNotifIdRef.current) {
                    const msg = `${latest.title}: ${latest.message}`;
                    if (latest.type === 'success') toast.success(msg);
                    else if (latest.type === 'warning') toast.warning(msg);
                    else if (latest.type === 'error') toast.error(msg);
                    else toast.info(msg);
                }

                lastNotifIdRef.current = latest.id;
            }
            if (isFirstLoadRef.current) isFirstLoadRef.current = false;

            setNotifications(mappedData);
            setUnreadCount(response.data.unread_count);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    // Polling every 5 seconds
    useEffect(() => {
        let isCancelled = false;

        const poll = async () => {
            if (isCancelled) return;
            try {
                await fetchNotifications();
            } catch (err) {
                if (err.response && (err.response.status === 401 || err.response.status === 404)) {
                    return;
                }
            }
        };

        poll();
        const interval = setInterval(poll, 5000);
        return () => {
            isCancelled = true;
            clearInterval(interval);
        };
    }, []);

    // --- 3. LOGIC: Actions (Mark Read & Delete) ---

    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Failed to mark as read", error);
        }
    };

    const markAllAsRead = async () => {
        if (unreadCount === 0) return;
        try {
            await api.post('/notifications/read');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Failed to mark all read", error);
        }
    };

    const clearAll = async () => {
        if (notifications.length === 0) return;

        setConfirmModal({
            isOpen: true,
            title: t('notifications.dropdown_delete_all_title'),
            message: t('notifications.dropdown_delete_all_msg'),
            variant: 'warning',
            confirmLabel: t('notifications.dropdown_delete_confirm'),
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    await api.delete('/notifications');
                    setNotifications([]);
                    setUnreadCount(0);
                    toast.success(t('notifications.all_deleted'));
                } catch (error) {
                    console.error("Failed to delete notifications", error);
                    toast.error(t('notifications.dropdown_delete_failed'));
                }
            }
        });
    };

    // --- 4. LOGIC: Filtering ---
    const filteredNotifications = activeTab === 'all'
        ? notifications
        : notifications.filter(n => !n.isRead);

    const formatTime = (date) => {
        const locale = i18n.language === 'id' ? 'id-ID' : 'en-US';
        return date.toLocaleDateString(locale, {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
    };

    const getActionLabel = (url) => {
        if (url.includes('security')) return t('notifications.check_security');
        if (url.includes('course')) return t('notifications.view_course');
        if (url.includes('session')) return t('notifications.view_schedule');
        if (url.includes('profile')) return t('notifications.view_profile');
        if (url.includes('certificate')) return t('notifications.view_certificate');
        return t('notifications.view_detail');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-500 hover:bg-gray-100 hover:text-blue-600 rounded-full transition-all focus:outline-none"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white ring-1 ring-red-500 animate-pulse"></span>
                )}
            </button>

            {/* Dropdown Content */}
            {isOpen && (
                <>
                    {/* Mobile Overlay */}
                    <div
                        className="fixed inset-0 bg-black/50 z-[60] md:hidden animate-in fade-in duration-200"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="fixed inset-x-0 bottom-0 z-[70] md:z-50 w-full md:w-96 bg-white rounded-t-2xl md:rounded-xl shadow-2xl md:shadow-xl border-t md:border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-10 md:fade-in md:zoom-in-95 duration-200 md:origin-top-right md:absolute md:right-0 md:left-auto md:bottom-auto md:top-full md:mt-2">

                        {/* Header */}
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 backdrop-blur-sm">
                            <div>
                                <h3 className="font-bold text-gray-900">{t('notifications.title')}</h3>
                                <p className="text-xs text-gray-500">
                                    {unreadCount > 0 ? t('notifications.dropdown_unread_count', { count: unreadCount }) : t('notifications.dropdown_all_read')}
                                </p>
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md transition-colors hover:bg-blue-100"
                                    title={t('notifications.mark_all_read')}
                                >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    {t('notifications.dropdown_mark_read')}
                                </button>
                            )}
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-100 bg-white">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'all'
                                    ? 'border-blue-600 text-blue-600 bg-blue-50/30'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {t('notifications.filter_all')}
                            </button>
                            <button
                                onClick={() => setActiveTab('unread')}
                                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'unread'
                                    ? 'border-blue-600 text-blue-600 bg-blue-50/30'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {t('notifications.filter_unread')}
                            </button>
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                            {filteredNotifications.length > 0 ? (
                                <div className="divide-y divide-gray-50">
                                    {filteredNotifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            onClick={() => {
                                                if (notification.actionUrl) {
                                                    setIsOpen(false);
                                                    markAsRead(notification.id);
                                                    if (notification.actionUrl.startsWith('http')) {
                                                        window.open(notification.actionUrl, '_blank');
                                                    } else {
                                                        navigate(notification.actionUrl);
                                                    }
                                                }
                                            }}
                                            className={`p-4 hover:bg-gray-50 transition-colors group relative cursor-pointer ${!notification.isRead ? 'bg-blue-50/30' : ''}`}
                                        >
                                            <div className="flex gap-3">
                                                {/* Status Dot */}
                                                <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${notification.type === 'success' ? 'bg-green-500' :
                                                    notification.type === 'warning' ? 'bg-yellow-500' :
                                                        !notification.isRead ? 'bg-blue-500' : 'bg-gray-300'
                                                    }`}></div>

                                                <div className="flex-1">
                                                    <h4 className={`text-sm ${!notification.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                                                        {notification.data?.title_key ? t(notification.data.title_key, processTransParams(notification.data.title_params, i18n.language) || {}) : getTrans(notification.title, i18n.language)}
                                                    </h4>
                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                                                        {notification.data?.message_key ? t(notification.data.message_key, processTransParams(notification.data.message_params, i18n.language) || {}) : getTrans(notification.message, i18n.language)}
                                                    </p>

                                                    <div className="flex items-center justify-between mt-2">
                                                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {formatTime(notification.time)}
                                                        </span>

                                                        {notification.actionUrl && (
                                                            <span className="text-[10px] text-blue-500 flex items-center gap-1 font-medium bg-blue-50 px-1.5 py-0.5 rounded">
                                                                <ExternalLink className="w-3 h-3" />
                                                                {getActionLabel(notification.actionUrl)}
                                                            </span>
                                                        )}

                                                        {!notification.isRead && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                                                                className="text-[10px] font-medium text-blue-600 hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-0.5 rounded shadow-sm border border-gray-100"
                                                            >
                                                                <Check className="w-3 h-3" /> {t('notifications.dropdown_read_btn')}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 text-center flex flex-col items-center justify-center">
                                    <div className="bg-gray-50 p-4 rounded-full mb-3">
                                        <Bell className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <p className="text-gray-500 text-sm font-medium">{t('notifications.no_notifications')}</p>
                                    <p className="text-gray-400 text-xs">{t('notifications.all_clear')}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-2 border-t border-gray-100 bg-gray-50 flex justify-between gap-2">
                            <button
                                className="flex-1 py-2 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                onClick={() => {
                                    setIsOpen(false);
                                    if (user?.role === 'admin') navigate('/admin/notifications');
                                    // else if (user?.role === 'instructor') navigate('/instructor/notifications'); // Future proofing
                                    else navigate('/notifications');
                                }}
                            >
                                {t('notifications.dropdown_view_all')} →
                            </button>
                            <button
                                className="flex-1 py-2 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                                onClick={clearAll}
                                disabled={notifications.length === 0}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                {t('notifications.dropdown_clear')}
                            </button>
                        </div>
                    </div>
                </>
            )}
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