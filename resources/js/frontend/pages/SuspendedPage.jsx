import React from 'react';
import { ShieldAlert, Lock, Mail, ExternalLink, LogOut } from 'lucide-react';
import { authService } from '../services/authService';
import { useTranslation } from 'react-i18next';

export const SuspendedPage = () => {
    const { t } = useTranslation();

    const handleLogout = async () => {
        try {
            await authService.logout();
            window.location.href = '/login';
        } catch (error) {
            localStorage.clear();
            window.location.href = '/login';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-red-600 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-white opacity-10 transform -skew-y-6 scale-150 origin-top-left"></div>
                    <div className="relative">
                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                            <ShieldAlert className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">{t('suspended.title')}</h1>
                        <p className="text-red-100 text-sm">{t('suspended.subtitle')}</p>
                    </div>
                </div>

                <div className="p-8">
                    <div className="space-y-6">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3 text-yellow-800 text-sm">
                            <Lock className="w-5 h-5 shrink-0 text-yellow-600" />
                            <p>
                                {t('suspended.violation_notice')}
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{t('suspended.what_to_do')}</h3>

                            <a href="mailto:support@learnify.test" className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors group cursor-pointer">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-900">{t('suspended.contact_support')}</p>
                                    <p className="text-xs text-gray-500">{t('suspended.contact_subtitle')}</p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                            </a>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <button
                            onClick={handleLogout}
                            className="w-full py-3 px-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-4 h-4" /> {t('suspended.sign_out')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
