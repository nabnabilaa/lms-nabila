import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { ProfilePageComplete } from '../../../pages/OtherPages';
import { EditProfilePage } from '../../../pages/EditProfilePage';
import { SecuritySettingsPage } from '../../../pages/SecuritySettingsPage';

export const AdminSettingsWrapper = ({ currentUser, onUpdateUsers }) => {
    const { t } = useTranslation();
    const [view, setView] = useState('overview'); // 'overview', 'edit', 'security'

    const handleNavigate = (path) => {
        if (path === 'profile/edit') setView('edit');
        else if (path === 'profile/security') setView('security');
        else if (path === 'dashboard') setView('overview');
    };

    return (
        <div className="animate-in fade-in duration-300">
            {view === 'overview' && (
                <ProfilePageComplete
                    userData={currentUser}
                    isInline={true}
                    onNavigate={handleNavigate}
                />
            )}

            {view === 'edit' && (
                <div>
                    <button
                        onClick={() => setView('overview')}
                        className="mb-6 text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 group transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        {t('admin_settings.back_to_profile')}
                    </button>
                    <EditProfilePage
                        userData={currentUser}
                        isInline={true}
                        onUpdateProfile={(updatedUser) => {
                            // Update handled by parent
                        }}
                        onNavigateBack={() => setView('overview')}
                    />
                </div>
            )}

            {view === 'security' && (
                <div>
                    <button
                        onClick={() => setView('overview')}
                        className="mb-6 text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 group transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        {t('admin_settings.back_to_profile')}
                    </button>
                    <SecuritySettingsPage
                        userData={currentUser}
                        isInline={true}
                    />
                </div>
            )}
        </div>
    );
};
