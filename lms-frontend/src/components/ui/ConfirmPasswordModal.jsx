import React, { useState } from 'react';
import { X, Eye, EyeOff, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const ConfirmPasswordModal = ({ isOpen, onClose, onConfirm, title, message, isLoading, inputType = 'password' }) => {
    const [inputValue, setInputValue] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { t } = useTranslation();

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(inputValue);
        setInputValue('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${inputType === 'otp' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                <Lock className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">{title || t('common.confirm')}</h3>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <p className="text-gray-600 mb-6 text-sm">
                        {message || t('security.confirm_password_msg')}
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-6 relative">
                            {inputType === 'password' ? (
                                <>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                        placeholder={t('security.current_password')}
                                        autoFocus
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </>
                            ) : (
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all text-center font-mono tracking-widest text-lg"
                                    placeholder="XXX XXX"
                                    maxLength={6}
                                    autoFocus
                                    required
                                />
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors"
                                disabled={isLoading}
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="submit"
                                className={`px-4 py-2 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${inputType === 'otp' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-900 hover:bg-gray-800'}`}
                                disabled={isLoading || !inputValue}
                            >
                                {isLoading ? t('common.loading') : t('common.confirm')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
