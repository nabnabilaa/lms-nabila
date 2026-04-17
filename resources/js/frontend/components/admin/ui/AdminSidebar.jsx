import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import
import { LayoutDashboard, BookOpen, Users, Award, LogOut, Settings, X, Tag, Video, Target } from 'lucide-react';

export const AdminSidebar = ({ activeTab, setActiveTab, isOpen, onClose, onlyMobile = false }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation(); // Init

    const menuItems = [
        { id: 'overview', label: t('admin.dashboard'), icon: LayoutDashboard },
        { id: 'curriculum', label: t('admin.curriculum_manager'), icon: BookOpen },
        { id: 'courses', label: t('admin.explore_courses'), icon: BookOpen, path: '/admin/courses' },
        { id: 'coupons', label: t('admin.coupon_manager'), icon: Tag, path: '/admin/coupons' },
        { id: 'missions', label: t('admin.daily_missions'), icon: Target },
        { id: 'meeting', label: t('admin.virtual_meeting'), icon: Video, path: '/meeting' },
        { id: 'users', label: t('admin.users_management'), icon: Users },
        { id: 'gamification', label: t('admin.gamification'), icon: Award },

    ];

    const SidebarContent = ({ showMobileHeader = false }) => (
        <div className="space-y-6">
            {/* Mobile Header */}
            {showMobileHeader && (
                <div className="flex items-center justify-between mb-6">
                    <h2 className="font-bold text-lg text-gray-900">{t('admin.menu')}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Menu Group */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('admin.administration')}</h3>
                </div>
                <nav className="flex flex-col p-2 gap-1">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;

                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    if (item.path) {
                                        navigate(item.path);
                                    } else {
                                        // It's a tab on the main admin dashboard
                                        // Fix: Check correctly if we are already on the dashboard page
                                        const currentPath = location.pathname;
                                        if (currentPath !== '/admin' && currentPath !== '/admin/dashboard') {
                                            navigate('/admin', { state: { initialTab: item.id } });
                                        } else {
                                            if (setActiveTab) setActiveTab(item.id);
                                        }
                                    }
                                    onClose && onClose();
                                }}
                                className={`relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${isActive
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-r-full" />
                                )}
                                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* System Group */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('admin.system')}</h3>
                </div>
                <nav className="flex flex-col p-2 gap-1">
                    <button
                        onClick={() => {
                            setActiveTab('settings');
                            onClose && onClose();
                        }}
                        className={`relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings'
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        {activeTab === 'settings' && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-r-full" />
                        )}
                        <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'text-indigo-600' : 'text-gray-400'}`} />
                        {t('admin.settings')}
                    </button>
                    <button
                        onClick={() => {
                            localStorage.clear();
                            window.location.href = '/';
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        {t('admin.logout')}
                    </button>
                </nav>
            </div>
        </div>
    );

    return (
        <div className="md:col-span-3 lg:col-span-3">
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-200"
                    onClick={onClose}
                />
            )}

            {/* Mobile Drawer */}
            <div className={`
                fixed top-0 left-0 bottom-0 w-64 bg-white z-50 transform transition-transform duration-300 p-4 overflow-y-auto shadow-xl
                md:hidden
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <SidebarContent showMobileHeader={true} />
            </div>

            {/* Desktop Static Sidebar */}
            {!onlyMobile && (
                <div className="hidden md:block sticky top-24">
                    <SidebarContent showMobileHeader={false} />
                </div>
            )}
        </div>
    );
};
