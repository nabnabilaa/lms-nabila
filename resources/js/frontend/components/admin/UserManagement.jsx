import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, MoreVertical, Edit2, Shield, Trash2, Award, UserCheck, UserX, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { AdminModal } from './ui/AdminModal';
import ConfirmModal from '../ui/ConfirmModal';



export const UserManagement = ({
    globalUsers = [],
    onUpdateUsers
}) => {
    const { t } = useTranslation();

    const displayRoleStyles = (role) => {
        switch (role) {
            case 'admin':
                return {
                    label: t('user_management.role_admin'),
                    className: 'bg-purple-50 text-purple-700 border-purple-200',
                    icon: <Shield className="w-3 h-3" />
                };
            case 'instructor':
                return {
                    label: t('user_management.role_instructor'),
                    className: 'bg-orange-50 text-orange-700 border-orange-200',
                    icon: <Award className="w-3 h-3" />
                };
            default:
                return {
                    label: t('user_management.role_learner'),
                    className: 'bg-blue-50 text-blue-700 border-blue-200',
                    icon: <UserCheck className="w-3 h-3" />
                };
        }
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all'); // all, admin, learner
    const [selectedUser, setSelectedUser] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        message: '',
        title: '',
        variant: 'confirm',
        action: null
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Filtered Users
    const filteredUsers = globalUsers.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    const handleEditUser = (user) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
    };



    const handleSaveUserClick = () => {
        setConfirmModal({
            isOpen: true,
            title: t('user_management.confirm_save_title'),
            message: t('user_management.confirm_save_msg'),
            variant: 'confirm',
            confirmLabel: t('user_management.yes_save'),
            action: 'save_user'
        });
    };

    const handleConfirmAction = () => {
        if (confirmModal.action === 'save_user') {
            executeSaveUser();
        }
    };

    const executeSaveUser = async () => {
        if (!selectedUser) return;

        // Basic validation
        const statusSelect = document.getElementById('user-status');
        const roleSelect = document.getElementById('user-role');

        const newData = {
            status: statusSelect.value,
            role: roleSelect.value
        };

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://127.0.0.1:8000/api/users/${selectedUser.id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newData)
            });

            const result = await response.json();

            if (result.success) {
                // Update local state
                const updatedUsers = globalUsers.map(u =>
                    u.id === selectedUser.id ? { ...u, ...newData } : u
                );
                onUpdateUsers(updatedUsers);
                setIsEditModalOpen(false);
                setSelectedUser(null);
                setConfirmModal(prev => ({ ...prev, isOpen: false })); // Close confirm modal
            } else {
                // Show error modal
                setConfirmModal({
                    isOpen: true,
                    title: t('user_management.save_failed'),
                    message: t('user_management.update_error') + ': ' + (result.message || t('user_management.unknown_error')),
                    variant: 'danger',
                    confirmLabel: t('common.close'),
                    action: null
                });
            }
        } catch (error) {
            console.error('Error updating user:', error);
            setConfirmModal({
                isOpen: true,
                title: t('user_management.failed'),
                message: t('user_management.update_error'),
                variant: 'danger',
                confirmLabel: t('common.close'),
                action: null
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header / Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{t('user_management.title')}</h2>
                    <p className="text-sm text-gray-500">{t('user_management.subtitle')}</p>
                </div>
                {/* 
                <button 
                    onClick={() => { setSelectedUser(null); setIsEditModalOpen(true); }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                    <UserCheck className="w-4 h-4" /> Add New User
                </button> 
                */}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder={t('user_management.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">{t('user_management.all_roles')}</option>
                        <option value="admin">{t('user_management.role_admin')}</option>
                        <option value="learner">{t('user_management.role_learner')}</option>
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-bold">
                                <th className="px-6 py-4">{t('user_management.col_user')}</th>
                                <th className="px-6 py-4">{t('user_management.col_role')}</th>
                                <th className="px-6 py-4">{t('user_management.col_status')}</th>
                                <th className="px-6 py-4">{t('user_management.col_enrolled')}</th>
                                <th className="px-6 py-4 text-right">{t('user_management.col_actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {currentUsers.length > 0 ? (
                                currentUsers.map((user) => (
                                    <tr key={user.id} className={`transition-colors group ${user.role === 'admin' ? 'bg-indigo-50/50 hover:bg-indigo-100/50 border-l-4 border-indigo-500' : 'hover:bg-gray-50/50'}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                                                    {user.avatar ? (
                                                        <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        user.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{user.name}</p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Mail className="w-3 h-3" /> {user.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${displayRoleStyles(user.role).className}`}>
                                                {displayRoleStyles(user.role).icon}
                                                {displayRoleStyles(user.role).label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === 'suspended'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-green-100 text-green-700'
                                                }`}>
                                                {user.status === 'suspended' ? t('user_management.status_suspended') : t('user_management.status_active')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-medium text-gray-700">
                                                    {(user.enrolledCourses || []).length} {t('user_management.bootcamps')}
                                                </span>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <Award className="w-3 h-3 text-orange-400" />
                                                    {user.xp_points || 0} XP
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 text-gray-400">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (user.role !== 'admin') handleEditUser(user);
                                                    }}
                                                    disabled={user.role === 'admin'}
                                                    className={`relative z-10 p-1.5 rounded-lg transition-colors ${user.role === 'admin' ? 'text-gray-300 opacity-50 cursor-not-allowed' : 'hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer text-gray-400'}`}
                                                    title={user.role === 'admin' ? 'Administrator tidak dapat diedit' : t('user_management.manage_tooltip')}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <UserX className="w-12 h-12 text-gray-300" />
                                            <p>{t('user_management.no_users')}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {filteredUsers.length > 0 && (
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            {t('user_management.showing')} <span className="font-bold text-gray-900">{indexOfFirstItem + 1}</span> {t('user_management.to')} <span className="font-bold text-gray-900">{Math.min(indexOfLastItem, filteredUsers.length)}</span> {t('user_management.of')} <span className="font-bold text-gray-900">{filteredUsers.length}</span> {t('user_management.results')}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-600"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-medium text-gray-700 px-2">
                                {t('user_management.page')} {currentPage} {t('user_management.of')} {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-600"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit/Add User Modal */}
            <AdminModal
                isOpen={isEditModalOpen}
                onClose={() => { setIsEditModalOpen(false); setSelectedUser(null); }}
                title={selectedUser ? t('user_management.edit_title') : t('user_management.add_title')}
            >
                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                            {selectedUser?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">{selectedUser?.name}</p>
                            <p className="text-sm text-gray-500">{selectedUser?.email}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">{t('user_management.role_access')}</label>
                            <select
                                id="user-role"
                                defaultValue={selectedUser?.role || 'learner'}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            >
                                <option value="learner">{t('user_management.role_learner')}</option>
                                <option value="instructor">{t('user_management.role_instructor')}</option>
                                <option value="admin">{t('user_management.role_admin')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">{t('user_management.account_status')}</label>
                            <select
                                id="user-status"
                                defaultValue={selectedUser?.status || 'active'}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                                onChange={(e) => {
                                    const warning = document.getElementById('suspend-warning');
                                    if (e.target.value === 'suspended') {
                                        warning.classList.remove('hidden');
                                        e.target.classList.add('bg-red-50', 'text-red-700', 'border-red-300');
                                    } else {
                                        warning.classList.add('hidden');
                                        e.target.classList.remove('bg-red-50', 'text-red-700', 'border-red-300');
                                    }
                                }}
                            >
                                <option value="active">{t('user_management.status_active')}</option>
                                <option value="suspended" className="text-red-600 font-bold">{t('user_management.status_suspended_banned')}</option>
                            </select>
                        </div>
                    </div>

                    <div id="suspend-warning" className={`p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 ${selectedUser?.status === 'suspended' ? '' : 'hidden'}`}>
                        <Shield className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-red-700">{t('user_management.suspend_warning_title')}</p>
                            <p className="text-xs text-red-600 mt-1">
                                {t('user_management.suspend_warning_desc')}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
                        <button
                            onClick={() => setIsEditModalOpen(false)}
                            className="px-4 py-2 text-gray-600 font-medium text-sm hover:bg-gray-100 rounded-lg"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleSaveUserClick}
                            className="px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 shadow-sm"
                        >
                            {t('user_management.save_changes')}
                        </button>
                    </div>
                </div>
            </AdminModal>

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleConfirmAction}
                message={confirmModal.message}
                title={confirmModal.title}
                confirmLabel={confirmModal.confirmLabel}
                variant={confirmModal.variant}
            />
        </div>
    );
};
