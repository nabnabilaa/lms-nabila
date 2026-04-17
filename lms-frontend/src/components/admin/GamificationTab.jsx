// XP & Achievements Management Tab for Admin
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Zap, Award, Plus, Minus, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '../ui';
import { AchievementBuilder } from './AchievementBuilder';
import ConfirmModal from '../ui/ConfirmModal'; // NEW

import api from '../../services/api'; // Add API import

export const GamificationTab = ({ users = [], achievements = [], onUpdateUsers, onUpdateAchievements, onRefresh }) => {
    const { t } = useTranslation();
    const [activeSubTab, setActiveSubTab] = useState('xp'); // xp or achievements
    const [processing, setProcessing] = useState(null);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        message: '',
        title: '',
        variant: 'confirm',
        confirmLabel: t('gamification.yes_continue'),
        cancelLabel: t('common.cancel'),
        onConfirm: null
    });

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

    const handleAdjustXP = async (userId, amount) => {
        setProcessing(userId);
        try {
            const action = amount >= 0 ? 'add' : 'remove';
            await api.put(`/users/${userId}/xp`, {
                amount: Math.abs(amount),
                action: action
            });
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error("Failed to update user XP", error);
            openAlert(t('gamification.failed'), t('gamification.xp_update_failed'), "danger");
        } finally {
            setProcessing(null);
        }
    };

    const handleSetXP = async (userId, amount) => {
        setProcessing(userId);
        try {
            await api.put(`/users/${userId}/xp`, {
                amount: amount,
                action: 'set'
            });
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error("Failed to set user XP", error);
            openAlert(t('gamification.failed'), t('gamification.xp_set_failed'), "danger");
        } finally {
            setProcessing(null);
        }
    };

    const learners = users.filter(u => u.role !== 'Admin');
    const sortedByXP = [...learners].sort((a, b) => (b.xp_points || 0) - (a.xp_points || 0));

    // Pagination Logic
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(sortedByXP.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentUsers = sortedByXP.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                {/* ... (Header remains same) ... */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{t('gamification.title')}</h2>
                    <p className="text-gray-500 text-sm">{t('gamification.subtitle')}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveSubTab('xp')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeSubTab === 'xp'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Zap className="w-4 h-4 inline mr-1" /> {t('gamification.xp_management')}
                    </button>
                    <button
                        onClick={() => setActiveSubTab('achievements')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeSubTab === 'achievements'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Award className="w-4 h-4 inline mr-1" /> {t('gamification.achievements')}
                    </button>
                </div>
            </div>

            {/* XP Management Tab */}
            {activeSubTab === 'xp' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr className="text-left bg-gray-50">
                                    <th className="p-4 text-sm font-bold text-gray-700">{t('gamification.rank')}</th>
                                    <th className="p-4 text-sm font-bold text-gray-700">{t('gamification.user')}</th>
                                    <th className="p-4 text-sm font-bold text-gray-700">{t('gamification.level')}</th>
                                    <th className="p-4 text-sm font-bold text-gray-700">{t('gamification.xp')}</th>
                                    <th className="text-right p-4 text-sm font-bold text-gray-700">{t('gamification.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {currentUsers.map((user, idx) => {
                                    const actualIdx = startIndex + idx;
                                    return (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="p-4">
                                                <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${actualIdx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    actualIdx === 1 ? 'bg-gray-100 text-gray-600' :
                                                        actualIdx === 2 ? 'bg-orange-100 text-orange-700' : 'text-gray-500'
                                                    }`}>
                                                    #{actualIdx + 1}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium text-gray-900">{user.name}</div>
                                                <div className="text-xs text-gray-500">{user.email}</div>
                                            </td>
                                            <td className="p-4">
                                                <Badge variant="purple">{user.level?.name || 'Novice'}</Badge>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-lg font-bold text-blue-600">{user.xp_points || 0} XP</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleAdjustXP(user.id, -50)}
                                                        disabled={processing === user.id}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                                        title={t('gamification.remove_xp')}
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleAdjustXP(user.id, 50)}
                                                        disabled={processing === user.id}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                                                        title={t('gamification.add_xp')}
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const amount = prompt(t('gamification.set_xp_prompt'));
                                                            if (amount !== null) handleSetXP(user.id, parseInt(amount));
                                                        }}
                                                        disabled={processing === user.id}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                                                        title={t('gamification.set_xp')}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t pt-4 bg-white p-4 rounded-xl border border-gray-200">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-600 bg-white border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4" /> {t('gamification.previous')}
                            </button>

                            <span className="text-sm text-gray-600">
                                {t('gamification.page')} <span className="font-bold">{currentPage}</span> {t('gamification.of')} <span className="font-bold">{totalPages}</span>
                            </span>

                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-600 bg-white border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t('gamification.next')} <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* XP Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                                {learners.length > 0 ? Math.round(learners.reduce((sum, u) => sum + (u.xp_points || 0), 0) / learners.length) : 0}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">{t('gamification.avg_xp')}</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                                {learners.length > 0 ? Math.max(...learners.map(u => u.xp_points || 0)) : 0}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">{t('gamification.highest_xp')}</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                                {learners.reduce((sum, u) => sum + (u.xp_points || 0), 0)}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">{t('gamification.total_xp')}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Achievements Tab */}
            {activeSubTab === 'achievements' && (
                <div className="space-y-4">
                    <AchievementBuilder achievements={achievements} onUpdate={onUpdateAchievements} onRefresh={onRefresh} />
                </div>
            )}
            {/* Content End */}

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
