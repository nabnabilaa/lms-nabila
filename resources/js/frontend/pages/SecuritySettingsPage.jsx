import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Shield, Smartphone, Monitor, Trash2, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import { toast } from '../components/ui/Toast';
import { Card } from '../components/ui';
import QRCode from 'react-qr-code';
import { ConfirmPasswordModal } from '../components/ui/ConfirmPasswordModal';
import { useTranslation } from 'react-i18next';

export const SecuritySettingsPage = ({ userData, isInline = false }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    // Password State
    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        password: '',
        password_confirmation: ''
    });
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);

    // 2FA State
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(!!userData?.two_factor_confirmed_at);
    const [qrCodeData, setQrCodeData] = useState(null);
    const [confirmCode, setConfirmCode] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState([]);
    const [is2FALoading, setIs2FALoading] = useState(!userData);

    // Sessions State
    const [sessions, setSessions] = useState([]);

    // Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [modalConfig, setModalConfig] = useState({ title: '', message: '' });

    // Password Visibility State
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    useEffect(() => {
        fetchSessions();
        checkTwoFactorStatus();
    }, []);

    const fetchSessions = async () => {
        try {
            const res = await api.get('/user/sessions');
            setSessions(res.data);
        } catch (e) { console.error(e); }
    };

    const checkTwoFactorStatus = async () => {
        if (!userData) setIs2FALoading(true);
        try {
            const res = await api.get('/auth/me');
            if (res.data.two_factor_confirmed_at) {
                setTwoFactorEnabled(true);
            }
        } catch (e) { console.error(e); }
        finally { setIs2FALoading(false); }
    };

    // --- Password Logic ---
    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        setIsPasswordLoading(true);
        try {
            await api.put('/user/password', passwordForm);
            toast.success(t('security.password_updated'));
            setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || t('security.password_failed'));
        } finally {
            setIsPasswordLoading(false);
        }
    };

    // --- Modal Handler ---
    const initiateAction = (type, payload = null) => {
        setPendingAction({ type, payload });

        let title = t('security.confirm_password');
        let message = t('security.confirm_password_msg');
        let inputType = 'password';

        if (type === 'enable2fa') {
            title = t('security.enable_2fa');
            message = t('security.enable_2fa_msg');
            inputType = 'password';
        } else if (type === 'disable2fa') {
            title = t('security.disable_2fa');
            message = t('security.disable_2fa_msg');
            inputType = 'otp';
        } else if (type === 'logoutSession') {
            if (twoFactorEnabled) {
                title = t('security.auth_2fa');
                message = t('security.auth_2fa_session_msg');
                inputType = 'otp';
            } else {
                title = t('security.logout_session');
                message = t('security.logout_session_msg');
                inputType = 'password';
            }
        } else if (type === 'showRecoveryCodes') {
            title = t('security.view_recovery');
            message = t('security.view_recovery_msg');
            inputType = 'otp';
        }

        setModalConfig({ title, message, inputType });
        setShowConfirmModal(true);
    };

    const handleConfirm = async (inputValue) => {
        if (!pendingAction) return;

        try {
            const dataPayload = modalConfig.inputType === 'otp' ? { code: inputValue } : { password: inputValue };

            if (pendingAction.type === 'enable2fa') {
                const res = await api.post('/user/two-factor-authentication', dataPayload);
                setQrCodeData(res.data);
            } else if (pendingAction.type === 'disable2fa') {
                await api.delete('/user/two-factor-authentication', { data: dataPayload });
                setTwoFactorEnabled(false);
                setRecoveryCodes([]);
                toast.success(t('security.twofa_disabled'));
            } else if (pendingAction.type === 'logoutSession') {
                const id = pendingAction.payload;
                await api.delete(`/user/sessions/${id}`, { data: dataPayload });
                toast.success(id === 'other' ? t('security.other_sessions_logged_out') : t('security.session_ended'));
                fetchSessions();
            } else if (pendingAction.type === 'showRecoveryCodes') {
                const res = await api.post('/user/recovery-codes', dataPayload);
                setRecoveryCodes(res.data.recovery_codes);
                toast.success(t('security.recovery_shown'));
            }
            setShowConfirmModal(false);
        } catch (error) {
            toast.error(error.response?.data?.message || t('security.verification_failed'));
        } finally {
            setPendingAction(null);
        }
    };


    // --- 2FA Logic ---
    const confirmTwoFactor = async () => {
        try {
            const res = await api.post('/user/confirmed-two-factor-authentication', { code: confirmCode });
            setTwoFactorEnabled(true);
            setQrCodeData(null);
            setRecoveryCodes(res.data.recovery_codes);
            toast.success(t('security.twofa_enabled'));
        } catch (error) {
            toast.error(t('security.otp_wrong'));
        }
    };


    return (
        <div className="max-w-4xl mx-auto pb-12 px-4 md:px-0">
            {!isInline && (
                <button
                    onClick={() => navigate('/profile')}
                    className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 group transition-colors mb-6 mt-6"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    {t('security.back_to_profile')}
                </button>
            )}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('security.title')}</h1>
            <p className="text-gray-500 mb-8">{t('security.subtitle')}</p>

            <div className="space-y-8">
                {/* 1. Update Password */}
                <Card className="p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                            <Lock className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">{t('security.update_password')}</h2>
                            <p className="text-sm text-gray-500">{t('security.password_hint')}</p>
                        </div>
                    </div>

                    <form onSubmit={handlePasswordUpdate} className="max-w-xl space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('security.current_password')}</label>
                            <div className="relative">
                                <input
                                    type={showPasswords.current ? "text" : "password"}
                                    required
                                    value={passwordForm.current_password}
                                    onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                                    className="w-full pl-4 pr-12 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility('current')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('security.new_password')}</label>
                                <div className="relative">
                                    <input
                                        type={showPasswords.new ? "text" : "password"}
                                        required
                                        value={passwordForm.password}
                                        onChange={e => setPasswordForm({ ...passwordForm, password: e.target.value })}
                                        className="w-full pl-4 pr-12 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility('new')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('security.confirm_new_password')}</label>
                                <div className="relative">
                                    <input
                                        type={showPasswords.confirm ? "text" : "password"}
                                        required
                                        value={passwordForm.password_confirmation}
                                        onChange={e => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })}
                                        className="w-full pl-4 pr-12 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility('confirm')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isPasswordLoading}
                                className="px-4 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50"
                            >
                                {isPasswordLoading ? t('common.saving') : t('security.save_password')}
                            </button>
                        </div>
                    </form>
                </Card>

                {/* 2. Two Factor Authentication */}
                <Card className="p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">{t('security.two_factor_title')}</h2>
                            <p className="text-sm text-gray-500">
                                {twoFactorEnabled
                                    ? t('security.twofa_protected')
                                    : t('security.twofa_add_security')}
                            </p>
                        </div>
                    </div>

                    {is2FALoading ? (
                        <div className="animate-pulse flex space-x-4">
                            <div className="flex-1 space-y-4 py-1">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {!twoFactorEnabled && !qrCodeData && (
                                <button
                                    onClick={() => initiateAction('enable2fa')}
                                    className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700"
                                >
                                    {t('security.enable_2fa_btn')}
                                </button>
                            )}

                            {/* Setup Process */}
                            {qrCodeData && !twoFactorEnabled && (
                                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                                    <h3 className="font-bold text-gray-900 mb-4">{t('security.setup_2fa')}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-4">
                                                {t('security.scan_qr')}
                                            </p>
                                            <div className="bg-white p-4 inline-block rounded-lg shadow-sm">
                                                <QRCode value={qrCodeData.otpauth_url} size={150} />
                                            </div>
                                            <p className="text-xs text-gray-400 mt-2 font-mono">Secret: {qrCodeData.secret}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">{t('security.enter_otp')}</label>
                                            <input
                                                type="text"
                                                placeholder="XXX XXX"
                                                value={confirmCode}
                                                onChange={e => setConfirmCode(e.target.value)}
                                                className="w-full px-4 py-2 border rounded-lg mb-4 font-mono text-center tracking-widest text-lg"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={confirmTwoFactor}
                                                    className="flex-1 px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700"
                                                >
                                                    {t('common.confirm')}
                                                </button>
                                                <button
                                                    onClick={() => setQrCodeData(null)}
                                                    className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300"
                                                >
                                                    {t('common.cancel')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Enabled State */}
                            {twoFactorEnabled && (
                                <div>
                                    <div className="flex items-center gap-2 text-emerald-600 font-bold mb-4">
                                        <Shield className="w-5 h-5 fill-current" />
                                        {t('security.twofa_active')}
                                    </div>

                                    {recoveryCodes.length > 0 ? (
                                        <div className="mb-6">
                                            <p className="text-sm font-bold text-gray-900 mb-2">{t('security.recovery_codes')}</p>
                                            <p className="text-xs text-gray-500 mb-3">{t('security.save_codes_safely')}</p>
                                            <div className="bg-gray-100 p-4 rounded-lg grid grid-cols-2 gap-2 font-mono text-xs mb-4">
                                                {recoveryCodes.map((code, i) => (
                                                    <div key={i}>{code}</div>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => setRecoveryCodes([])}
                                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                {t('security.hide_codes')}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="mb-6">
                                            <button
                                                onClick={() => initiateAction('showRecoveryCodes')}
                                                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
                                            >
                                                <Eye className="w-4 h-4" /> {t('security.show_recovery')}
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => initiateAction('disable2fa')}
                                        className="px-4 py-2 bg-red-100 text-red-600 font-bold rounded-lg hover:bg-red-200"
                                    >
                                        {t('security.disable_2fa_btn')}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </Card>

                {/* 3. Browser Sessions */}
                <Card className="p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                            <Monitor className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">{t('security.browser_sessions')}</h2>
                            <p className="text-sm text-gray-500">{t('security.sessions_desc')}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {sessions.map(session => (
                            <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Monitor className={`w-8 h-8 ${session.is_current_device ? 'text-green-500' : 'text-gray-400'}`} />
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">
                                            {session.device}
                                            {session.is_current_device && <span className="ml-2 text-xs text-green-600">({t('security.this_device')})</span>}
                                        </p>
                                        <p className="text-xs text-gray-500">{t('security.last_active')}: {session.last_active}</p>
                                    </div>
                                </div>
                                {!session.is_current_device && (
                                    <button
                                        onClick={() => initiateAction('logoutSession', session.id)}
                                        className="text-gray-400 hover:text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <button
                            onClick={() => initiateAction('logoutSession', 'other')}
                            className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-800"
                        >
                            {t('security.logout_other_sessions')}
                        </button>
                    </div>
                </Card>
            </div>

            <ConfirmPasswordModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirm}
                title={modalConfig.title}
                message={modalConfig.message}
                inputType={modalConfig.inputType}
            />
        </div>
    );
};
