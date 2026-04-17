// Extracted from file.html - Navbar Component
import React from 'react';
import { NotificationDropdown } from '../NotificationDropdown';
import LanguageSwitcher from '../ui/LanguageSwitcher'; // Import LanguageSwitcher
import { Search, Star, User, Settings, Shield, LogOut, BookOpen, Loader2 } from 'lucide-react';
import { SearchPalette } from '../search/SearchPalette';

import { useTranslation } from 'react-i18next'; // Import hook

export const Navbar = ({ onNavigate, userRole, studentName, user, courses = [], certificates = [], isLoading = false }) => {
    const { t } = useTranslation(); // Initialize hook
    // If no userRole yet (loading), default to 'learner' behavior
    const effectiveRole = userRole || 'learner';
    const [isSearchOpen, setIsSearchOpen] = React.useState(false);

    React.useEffect(() => {
        // Ctrl + K Listener
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Helper to open palette
    const openSearch = () => setIsSearchOpen(true);

    // Use studentName prop as fallback or primary if valid, otherwise use local storage name
    const displayName = studentName || user?.name || 'Student';
    // Generage avatar initials
    const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const avatar = user?.avatar || null;

    return (
        <>
            {/* Command Palette Component */}
            <SearchPalette
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                courses={courses}
                certificates={certificates}
            />

            <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 h-16 flex items-center px-4 md:px-8 justify-between no-print">
                <div className="flex items-center gap-8">
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => onNavigate(effectiveRole === 'admin' ? 'admin' : '')}
                    >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold ${effectiveRole === 'admin' ? 'bg-gray-900' : 'bg-blue-600'}`}>
                            {effectiveRole === 'admin' ? 'A' : 'L'}
                        </div>
                        <span className="font-bold text-xl hidden sm:block">
                            {effectiveRole === 'admin' ? 'Maxy CMS' : 'Learnify LMS'}
                        </span>
                    </div>
                    {effectiveRole === 'learner' && (
                        <div className="relative hidden md:block">
                            {/* TRIGGER Button for Search Palette */}
                            <button
                                onClick={openSearch}
                                className="flex items-center gap-3 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-transparent hover:border-gray-200 rounded-lg text-sm w-64 transition-all group text-left"
                            >
                                <Search className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                <span className="flex-1 text-gray-400 group-hover:text-gray-600">{t('common.search_placeholder')}</span>
                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-200 bg-white text-xs text-gray-400 font-sans">
                                    <span className="text-[10px]">Ctrl K</span>
                                </div>
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 sm:gap-6">
                    {['learner', 'instructor'].includes(effectiveRole) ? (
                        <>
                            {/* Instructor Tools Removed as per request */}

                            {/* Show Admin Panel button logic... */}
                            {(displayName === 'Admin User' || user?.role === 'admin') && (
                                <button
                                    onClick={() => onNavigate('admin-dashboard')}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-md"
                                >
                                    <Shield className="w-3 h-3" />
                                    <span className="hidden sm:inline">Admin Panel</span>
                                </button>
                            )}

                            <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-semibold text-sm hidden sm:flex">
                                <Star className="w-4 h-4 fill-blue-600" />
                                <span>1,250 XP</span>
                            </div>
                            <LanguageSwitcher />
                            <NotificationDropdown />
                            <div
                                className="flex items-center gap-2 border-l pl-3 sm:pl-6 ml-1 sm:ml-0 cursor-pointer hover:bg-gray-50 p-1 rounded-lg transition-colors"
                                onClick={() => onNavigate('/profile')}
                            >
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border border-blue-200">
                                    {avatar ? (
                                        <img src={avatar.includes('http') ? avatar : `http://127.0.0.1:8000/storage/${avatar}`} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs font-bold text-blue-600">{initials}</span>
                                    )}
                                </div>
                                <span className="text-sm font-medium hidden sm:block">{displayName}</span>
                            </div>
                            <button
                                onClick={() => {
                                    localStorage.clear();
                                    window.location.href = '/';
                                }}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title={t('nav.logout')}
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => window.location.href = '/admin'}
                                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-md"
                            >
                                <Shield className="w-3 h-3" />
                                <span className="hidden sm:inline">Back to Admin</span>
                            </button>

                            <div className="flex items-center gap-2 border-l pl-3 sm:pl-6 ml-1 sm:ml-0">
                                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white">
                                    <Settings className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium hidden sm:block">Admin Mode</span>
                            </div>
                            <button
                                onClick={() => {
                                    localStorage.clear();
                                    window.location.href = '/';
                                }}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title={t('nav.logout')}
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </>
                    )}
                </div>
            </nav>
        </>
    );
};
