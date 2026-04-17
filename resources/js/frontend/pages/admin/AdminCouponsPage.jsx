import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AdminNavbar } from '../../components/layout/AdminNavbar';
import { AdminSidebar } from '../../components/admin/ui/AdminSidebar';
import { useCurrentUserQuery } from '../../hooks/queries/useUser';
import { Plus, Trash2, Tag, Percent, DollarSign, Edit3, ToggleLeft, ToggleRight, Search, Copy, Check, QrCode, X, Users, ChevronDown } from 'lucide-react';
import { showToast } from '../../components/ui/Toast';
import { AdminModal } from '../../components/admin/ui/AdminModal';
import ConfirmModal from '../../components/ui/ConfirmModal';
import api from '../../services/api';

export const AdminCouponsPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { data: user, isLoading: isLoadingUser } = useCurrentUserQuery();

    const [coupons, setCoupons] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null); // null = create, object = edit
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [userSearch, setUserSearch] = useState('');       // Whitelist search
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);

    const defaultForm = { code: '', type: 'percent', value: '', max_uses: '', is_active: true, is_qr_coupon: false, qr_rotation_minutes: 5, min_completed_courses: 1, min_active_days: 7, eligible_user_ids: [] };
    const [formData, setFormData] = useState(defaultForm);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        couponId: null,
        message: ''
    });

    const fetchData = async () => {
        try {
            const [couponsRes, usersRes] = await Promise.all([
                api.get('/coupons'),
                api.get('/users') // Ensure this returns users
            ]);
            setCoupons(couponsRes.data);
            setUsers(usersRes.data.filter(u => u.role === 'learner')); // Only learners need coupons
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Open create modal
    const openCreateModal = () => {
        setEditingCoupon(null);
        setFormData(defaultForm);
        setModalOpen(true);
    };

    // Open edit modal
    const openEditModal = (coupon) => {
        setEditingCoupon(coupon);
        setFormData({
            code: coupon.code || '',
            type: coupon.type || 'percent',
            value: coupon.value || '',
            max_uses: coupon.max_uses || '',
            is_active: coupon.is_active ?? true,
            is_qr_coupon: coupon.is_qr_coupon ?? false,
            qr_rotation_minutes: coupon.qr_rotation_minutes || 5,
            min_completed_courses: coupon.min_completed_courses || 1,
            min_active_days: coupon.min_active_days || 7,
            eligible_user_ids: coupon.eligible_user_ids || [],
        });
        setModalOpen(true);
    };

    const handleDeleteClick = (coupon) => {
        setConfirmModal({
            isOpen: true,
            couponId: coupon.id,
            message: t('admin_coupons.confirm_delete_msg', { code: coupon.code })
        });
    };

    const handleConfirmDelete = async () => {
        if (!confirmModal.couponId) return;
        try {
            await api.delete(`/coupons/${confirmModal.couponId}`);
            showToast(t('admin_coupons.deleted'), 'success');
            fetchData();
        } catch (err) {
            showToast(t('admin_coupons.delete_failed'), 'error');
        } finally {
            setConfirmModal({ ...confirmModal, isOpen: false });
        }
    };

    const handleSave = async () => {
        try {
            if (!formData.code || formData.code.includes(' ')) {
                return showToast(t('admin_coupons.code_invalid'), 'error');
            }
            if (!formData.value || Number(formData.value) <= 0) {
                return showToast(t('admin_coupons.value_invalid'), 'error');
            }

            const payload = {
                ...formData,
                code: formData.code.toUpperCase()
            };

            if (editingCoupon) {
                // UPDATE
                await api.put(`/coupons/${editingCoupon.id}`, payload);
                showToast(t('admin_coupons.updated'), 'success');
            } else {
                // CREATE
                await api.post('/coupons', payload);
                showToast(t('admin_coupons.created'), 'success');
            }

            setModalOpen(false);
            setFormData(defaultForm);
            setEditingCoupon(null);
            fetchData();
        } catch (err) {
            showToast(err.response?.data?.message || t('admin_coupons.save_failed'), 'error');
        }
    };

    const handleToggleActive = async (coupon) => {
        try {
            await api.put(`/coupons/${coupon.id}`, {
                ...coupon,
                is_active: !coupon.is_active
            });
            showToast(t(!coupon.is_active ? 'admin_coupons.activated' : 'admin_coupons.deactivated'), 'success');
            fetchData();
        } catch (err) {
            showToast(t('admin_coupons.toggle_failed'), 'error');
        }
    };

    const copyCode = (code, id) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Filter coupons
    const filteredCoupons = coupons.filter(c =>
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Stats
    const activeCoupons = coupons.filter(c => c.is_active).length;
    const totalUsed = coupons.reduce((sum, c) => sum + (c.used_count || 0), 0);

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-slate-900">
            <AdminNavbar
                user={user}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                onNavigate={(path) => navigate(path.startsWith('/') ? path : `/${path}`)}
            />

            <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 animate-in fade-in zoom-in-95 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                    <AdminSidebar
                        activeTab="coupons"
                        setActiveTab={() => { }}
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                    />

                    <div className="md:col-span-9 space-y-6">
                        {/* Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{t('admin_coupons.title')}</h1>
                                <p className="text-gray-500 text-sm mt-1">{t('admin_coupons.subtitle')}</p>
                            </div>
                            <button
                                onClick={openCreateModal}
                                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:shadow-xl hover:shadow-indigo-200 shrink-0"
                            >
                                <Plus className="w-4 h-4" /> {t('admin_coupons.create_coupon')}
                            </button>
                        </div>

                        {/* Stats Bar */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                <p className="text-xs font-medium text-gray-400 mb-1">{t('admin_coupons.total_coupons')}</p>
                                <p className="text-2xl font-bold text-gray-900">{coupons.length}</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                <p className="text-xs font-medium text-gray-400 mb-1">{t('admin_coupons.active_coupons')}</p>
                                <p className="text-2xl font-bold text-green-600">{activeCoupons}</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                <p className="text-xs font-medium text-gray-400 mb-1">{t('admin_coupons.total_used')}</p>
                                <p className="text-2xl font-bold text-indigo-600">{totalUsed}</p>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder={t('admin_coupons.search_placeholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm w-full focus:ring-2 focus:ring-indigo-200 outline-none bg-white shadow-sm"
                            />
                        </div>

                        {/* Coupon Table */}
                        {loading ? (
                            <div className="text-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                <p className="mt-3 text-gray-400 text-sm">{t('admin_coupons.loading')}</p>
                            </div>
                        ) : filteredCoupons.length === 0 ? (
                            <div className="bg-white p-12 text-center rounded-xl border-2 border-dashed border-gray-200">
                                <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">{t('admin_coupons.no_coupons')}</p>
                                <p className="text-gray-400 text-sm mt-1">{t('admin_coupons.no_coupons_hint')}</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('admin_coupons.col_code')}</th>
                                            <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('admin_coupons.col_type')}</th>
                                            <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('admin_coupons.col_discount')}</th>
                                            <th className="text-center px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('admin_coupons.col_usage')}</th>
                                            <th className="text-center px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('admin_coupons.col_status')}</th>
                                            <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('admin_coupons.col_actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredCoupons.map(coupon => (
                                            <tr key={coupon.id} className="hover:bg-gray-50/50 transition-colors group">
                                                {/* Kode Kupon */}
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${coupon.type === 'percent' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                            {coupon.type === 'percent' ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono font-bold text-gray-900 tracking-tight">{coupon.code}</span>
                                                                <button
                                                                    onClick={() => copyCode(coupon.code, coupon.id)}
                                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-indigo-600"
                                                                    title={t('admin_coupons.copy_code')}
                                                                >
                                                                    {copiedId === coupon.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {coupon.is_qr_coupon && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-violet-50 text-violet-600 border border-violet-200 px-1.5 py-0.5 rounded-md">
                                                                <QrCode className="w-3 h-3" /> QR
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Tipe */}
                                                <td className="px-5 py-4">
                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${coupon.type === 'percent' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-teal-50 text-teal-700 border border-teal-200'}`}>
                                                        {coupon.type === 'percent' ? t('admin_coupons.type_percent') : t('admin_coupons.type_fixed')}
                                                    </span>
                                                </td>

                                                {/* Diskon */}
                                                <td className="px-5 py-4">
                                                    <span className="font-bold text-gray-900">
                                                        {coupon.type === 'percent'
                                                            ? `${parseFloat(coupon.value)}%`
                                                            : `Rp ${parseInt(coupon.value).toLocaleString('id-ID')}`
                                                        }
                                                    </span>
                                                </td>

                                                {/* Penggunaan */}
                                                <td className="px-5 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <span className="font-bold text-gray-700">{coupon.used_count || 0}</span>
                                                        <span className="text-gray-400">/</span>
                                                        <span className="text-gray-500">{coupon.max_uses || '∞'}</span>
                                                    </div>
                                                    {coupon.max_uses && (
                                                        <div className="w-16 mx-auto mt-1.5 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                            <div
                                                                className="bg-indigo-500 h-full rounded-full transition-all"
                                                                style={{ width: `${Math.min(((coupon.used_count || 0) / coupon.max_uses) * 100, 100)}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Status Toggle */}
                                                <td className="px-5 py-4 text-center">
                                                    <button
                                                        onClick={() => handleToggleActive(coupon)}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${coupon.is_active
                                                            ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                                            : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                                                            }`}
                                                        title={coupon.is_active ? t('admin_coupons.click_deactivate') : t('admin_coupons.click_activate')}
                                                    >
                                                        {coupon.is_active
                                                            ? <><ToggleRight className="w-4 h-4" /> {t('admin_coupons.active')}</>
                                                            : <><ToggleLeft className="w-4 h-4" /> {t('admin_coupons.inactive')}</>
                                                        }
                                                    </button>
                                                </td>

                                                {/* Aksi */}
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => openEditModal(coupon)}
                                                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                            title={t('admin_coupons.edit_coupon')}
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(coupon)}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title={t('admin_coupons.delete_coupon')}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Create / Edit Modal */}
            <AdminModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setEditingCoupon(null); }}
                title={editingCoupon ? t('admin_coupons.edit_title') : t('admin_coupons.create_title')}
            >
                <div className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">{t('admin_coupons.code_label')}</label>
                        <input
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl font-mono font-bold text-lg uppercase focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                            placeholder="HEMAT50"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">{t('admin_coupons.discount_type')}</label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                            >
                                <option value="percent">{t('admin_coupons.type_percent')} (%)</option>
                                <option value="fixed">{t('admin_coupons.type_fixed')} (Rp)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">{t('admin_coupons.discount_value')}</label>
                            <input
                                type="number"
                                value={formData.value}
                                onChange={e => setFormData({ ...formData, value: e.target.value })}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                placeholder={formData.type === 'percent' ? '50' : '10000'}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">{t('admin_coupons.max_uses_label')}</label>
                        <input
                            type="number"
                            value={formData.max_uses}
                            onChange={e => setFormData({ ...formData, max_uses: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                            placeholder={t('admin_coupons.max_uses_placeholder')}
                        />
                    </div>

                    {/* QR Coupon Settings */}
                    <div className="border border-gray-200 rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <QrCode className="w-4 h-4 text-violet-500" /> {t('admin_coupons.qr_exclusive')}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">{t('admin_coupons.qr_hint')}</p>
                            </div>
                            <button
                                onClick={() => setFormData({ ...formData, is_qr_coupon: !formData.is_qr_coupon })}
                                className={`relative w-12 h-7 rounded-full transition-all ${formData.is_qr_coupon ? 'bg-violet-500' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all ${formData.is_qr_coupon ? 'left-[22px]' : 'left-0.5'}`} />
                            </button>
                        </div>

                        {formData.is_qr_coupon && (
                            <div className="space-y-3 pt-2 border-t border-gray-100">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">{t('admin_coupons.qr_rotation')}</label>
                                    <input
                                        type="number"
                                        value={formData.qr_rotation_minutes}
                                        onChange={e => setFormData({ ...formData, qr_rotation_minutes: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                                        min="1"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">{t('admin_coupons.min_courses')}</label>
                                        <input
                                            type="number"
                                            value={formData.min_completed_courses}
                                            onChange={e => setFormData({ ...formData, min_completed_courses: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                                            min="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">{t('admin_coupons.min_days')}</label>
                                        <input
                                            type="number"
                                            value={formData.min_active_days}
                                            onChange={e => setFormData({ ...formData, min_active_days: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-200 outline-none"
                                            min="0"
                                        />
                                    </div>
                                </div>

                                {/* User Whitelist UI */}
                                <div className="pt-3 border-t border-gray-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700">Daftar Pengguna Khusus (Whitelist)</label>
                                            <p className="text-[10px] text-gray-400 mt-0.5">Siswa yang berhak klaim kupon ini tanpa syarat kursus/login.</p>
                                        </div>
                                        <span className="text-[10px] font-bold bg-violet-100 text-violet-600 rounded-full px-2 py-0.5 flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {formData.eligible_user_ids.length} dipilih
                                        </span>
                                    </div>

                                    {/* Selected user badge chips */}
                                    {formData.eligible_user_ids.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-violet-50/50 border border-violet-100 rounded-lg">
                                            {formData.eligible_user_ids.map(uid => {
                                                const u = users.find(x => x.id === uid);
                                                if (!u) return null;
                                                return (
                                                    <span key={uid} className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-700 bg-violet-100 border border-violet-200 rounded-full px-2 py-0.5">
                                                        {u.name}
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, eligible_user_ids: formData.eligible_user_ids.filter(id => id !== uid) })}
                                                            className="text-violet-400 hover:text-violet-700 ml-0.5"
                                                        >
                                                            <X className="w-2.5 h-2.5" />
                                                        </button>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Search + dropdown */}
                                    <div className="relative">
                                        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-violet-200 cursor-text"
                                            onClick={() => setUserDropdownOpen(true)}>
                                            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                            <input
                                                type="text"
                                                value={userSearch}
                                                onChange={e => { setUserSearch(e.target.value); setUserDropdownOpen(true); }}
                                                onFocus={() => setUserDropdownOpen(true)}
                                                placeholder="Cari siswa untuk ditambahkan..."
                                                className="flex-1 text-xs outline-none bg-transparent text-gray-700 placeholder-gray-400"
                                            />
                                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                        </div>

                                        {userDropdownOpen && (
                                            <>
                                                {/* Backdrop to close */}
                                                <div className="fixed inset-0 z-10" onClick={() => { setUserDropdownOpen(false); setUserSearch(''); }} />
                                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                                                    <div className="max-h-44 overflow-y-auto">
                                                        {users.filter(u =>
                                                            !formData.eligible_user_ids.includes(u.id) &&
                                                            (u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
                                                        ).length === 0 ? (
                                                            <p className="text-xs text-gray-400 text-center py-4">
                                                                {userSearch ? 'Tidak ada hasil ditemukan.' : 'Semua siswa sudah dipilih.'}
                                                            </p>
                                                        ) : (
                                                            users.filter(u =>
                                                                !formData.eligible_user_ids.includes(u.id) &&
                                                                (u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
                                                            ).map(u => (
                                                                <button
                                                                    key={u.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setFormData({ ...formData, eligible_user_ids: [...formData.eligible_user_ids, u.id] });
                                                                        setUserSearch('');
                                                                        setUserDropdownOpen(false);
                                                                    }}
                                                                    className="w-full text-left px-3 py-2 hover:bg-violet-50 transition-colors flex items-center gap-3 border-b border-gray-50 last:border-0"
                                                                >
                                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center text-violet-700 font-bold text-xs shrink-0">
                                                                        {u.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-bold text-gray-800 leading-tight">{u.name}</p>
                                                                        <p className="text-[10px] text-gray-400 leading-tight">{u.email}</p>
                                                                    </div>
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                    {formData.eligible_user_ids.length > 0 && (
                                                        <div className="px-3 py-2 border-t border-gray-100 flex justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData({ ...formData, eligible_user_ids: [] })}
                                                                className="text-[10px] text-red-500 hover:text-red-700 font-bold flex items-center gap-1"
                                                            >
                                                                <X className="w-3 h-3" /> Hapus Semua
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Status toggle in modal */}
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-200">
                        <div>
                            <p className="text-sm font-bold text-gray-700">{t('admin_coupons.status_label')}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{t('admin_coupons.status_hint')}</p>
                        </div>
                        <button
                            onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                            className={`relative w-12 h-7 rounded-full transition-all ${formData.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all ${formData.is_active ? 'left-[22px]' : 'left-0.5'}`} />
                        </button>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            onClick={() => { setModalOpen(false); setEditingCoupon(null); }}
                            className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-all"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:shadow-xl"
                        >
                            {editingCoupon ? t('admin_coupons.save_changes') : t('admin_coupons.create_coupon')}
                        </button>
                    </div>
                </div>
            </AdminModal>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleConfirmDelete}
                title={t('admin_coupons.delete_title')}
                message={confirmModal.message}
                variant="warning"
                confirmLabel={t('modal.yes_delete')}
                cancelLabel={t('common.cancel')}
            />
        </div>
    );
};
