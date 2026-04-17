// Login Page
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useTranslation } from 'react-i18next'; // Import i18n
import { User, Lock, Mail, ShieldAlert, Eye, EyeOff } from 'lucide-react';

export const LoginPage = ({ onLogin }) => {
    const { t } = useTranslation(); // Init i18n
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showTwoFactor, setShowTwoFactor] = useState(false);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const { user, loading } = useUser();
    const navigate = useNavigate();

    // Redirect if already logged in
    useEffect(() => {
        if (!loading && user) {
            if (user.role === 'admin') navigate('/admin');
            else if (user.role === 'instructor') navigate('/instructor/dashboard');
            else navigate('/');
        }
    }, [user, loading, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await onLogin({ email, password, code: showTwoFactor ? code : undefined });
            if (response && response.two_factor) {
                setShowTwoFactor(true);
            }
        } catch (error) {
            console.error("Login Error:", error);
            if (error.response && error.response.data && error.response.data.message) {
                setError(error.response.data.message);
            } else {
                setError('Login failed. Please check your credentials.');
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold text-2xl">L</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('auth.welcome_back')}</h1>
                    <p className="text-gray-500 mt-2">{t('auth.login_subtitle')}</p>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
                        <ShieldAlert className="w-5 h-5 shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!showTwoFactor ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('auth.email_label')}</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        placeholder="fandi@lms.test"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('auth.password_label')}</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="animate-fade-in">
                            <div className="text-center mb-6">
                                <span className="inline-block p-3 bg-blue-100 rounded-full text-blue-600 mb-2">
                                    <Lock className="w-6 h-6" />
                                </span>
                                <h3 className="font-bold text-gray-900">{t('auth.two_factor_title')}</h3>
                                <p className="text-sm text-gray-500">{t('auth.two_factor_subtitle')}</p>
                            </div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">{t('auth.otp_label')}</label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center font-mono tracking-widest text-lg"
                                placeholder="XXX XXX"
                                autoFocus
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                    >
                        {showTwoFactor ? t('auth.otp_button') : t('auth.login_button')}
                    </button>

                    {showTwoFactor && (
                        <button
                            type="button"
                            onClick={() => setShowTwoFactor(false)}
                            className="w-full text-sm text-gray-500 hover:text-blue-600 mt-2"
                        >
                            {t('auth.cancel')}
                        </button>
                    )}
                </form>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-sm font-bold text-blue-900 mb-2">Demo Accounts:</p>
                    <div className="text-xs text-blue-700 space-y-1">
                        <p>👨🎓 Student: fandi@lms.test / password</p>
                        <p>👨🎓 Instructor: rizky@lms.test / password</p>
                        <p>👨💼 Admin: admin@lms.test / password</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
