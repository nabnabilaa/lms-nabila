import React from 'react';
import { NotificationDropdown } from '../../NotificationDropdown';
import { LogOut, LayoutDashboard, Globe, Shield, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const AdminNavbar = ({ onNavigate, user, onToggleSidebar }) => {
    const { t } = useTranslation();
    return (
        <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 h-16 flex items-center px-4 md:px-6 justify-between text-gray-900 no-print shadow-sm">

            {/* LEFT: Branding */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onToggleSidebar}
                    className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <div
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => onNavigate('admin')}
                >
                    <div className="w-9 h-9 bg-gray-900 rounded-lg flex items-center justify-center shadow-md shrink-0">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-wide text-gray-900 whitespace-nowrap">Maxy CMS</h1>
                        <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase hidden sm:block">{t('admin_navbar.administration')}</p>
                    </div>
                </div>
            </div>

            {/* RIGHT: User & Actions */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">

                {/* System Notifications */}
                <NotificationDropdown />

                {/* Divider - hidden on mobile */}
                <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

                {/* Admin Profile */}
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-gray-900">{user?.name || 'Administrator'}</p>
                        <p className="text-xs text-blue-600 font-medium">{t('admin_navbar.super_admin')}</p>
                    </div>
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                        {user?.avatar ? (
                            <img src={user.avatar.includes('http') ? user.avatar : `http://127.0.0.1:8000/storage/${user.avatar}`} alt="Admin" className="w-full h-full object-cover" />
                        ) : (
                            <span className="font-bold text-sm text-gray-700">AD</span>
                        )}
                    </div>
                </div>

                {/* Logout */}
                <button
                    onClick={() => {
                        localStorage.clear();
                        window.location.href = '/';
                    }}
                    className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    title={t('admin_navbar.logout')}
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </nav>
    );
};
