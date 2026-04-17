// StudentCouponsPage - View and claim QR coupons
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Gift, Award, Clock, CheckCircle, XCircle, BookOpen, Calendar, RefreshCw, ArrowLeft, Sparkles, Lock, Unlock } from 'lucide-react';
import api from '../services/api';
import { toast } from '../components/ui/Toast';
import { useTranslation } from 'react-i18next';

const formatDiscount = (coupon) => {
    if (coupon.type === 'percent') return `${parseFloat(coupon.value)}% OFF`;
    return `Rp ${parseInt(coupon.value).toLocaleString('id-ID')} OFF`;
};

export const StudentCouponsPage = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [claimedCoupon, setClaimedCoupon] = useState(null);
    const [claiming, setClaiming] = useState(false);

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            const res = await api.get('/coupons/qr');
            setCoupons(res.data);
        } catch (err) {
            console.error('Failed to fetch QR coupons', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCoupons(); }, []);

    const handleClaim = async (coupon) => {
        if (!coupon.eligible) {
            toast.error(t('coupons.not_eligible'));
            return;
        }

        setClaiming(true);
        try {
            // Get QR token first (normally scanned, here we simulate)
            const tokenRes = await api.get(`/coupons/${coupon.id}/qr-token`);
            const token = tokenRes.data.token;

            // Claim
            const res = await api.post('/coupons/claim-qr', {
                token,
                coupon_id: coupon.id
            });

            setClaimedCoupon(res.data.coupon);
            toast.success(res.data.message);
        } catch (err) {
            toast.error(err.response?.data?.message || t('coupons.claim_failed'));
        } finally {
            setClaiming(false);
        }
    };

    const eligibleCount = coupons.filter(c => c.eligible).length;
    const locale = i18n.language === 'en' ? 'en-US' : 'id-ID';

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-pink-50/50">
            {/* Header */}
            <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="h-11 w-11 flex items-center justify-center bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 rounded-xl shadow-sm transition-all"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="h-11 flex items-center gap-3 bg-white px-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="p-1.5 bg-violet-50 rounded-lg">
                                <Gift className="w-5 h-5 text-violet-600" />
                            </div>
                            <h1 className="text-lg font-bold text-gray-900">{t('coupons.title')}</h1>
                        </div>
                    </div>
                    <button
                        onClick={fetchCoupons}
                        className="h-11 w-11 flex items-center justify-center bg-white text-violet-600 hover:bg-violet-50 border border-gray-200 rounded-xl shadow-sm transition-all"
                        title={t('common.refresh')}
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 md:px-8 pb-8">
                {/* Hero */}
                <div className="bg-gradient-to-r from-violet-600 to-purple-700 rounded-2xl p-8 text-white mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-5 h-5 text-yellow-300" />
                            <span className="text-sm font-medium text-violet-200">{t('coupons.limited_offer')}</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold mb-2">{t('coupons.hero_title')}</h2>
                        <p className="text-violet-200 max-w-lg">
                            {t('coupons.hero_description')}
                        </p>
                        <div className="flex items-center gap-4 mt-6">
                            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                                <p className="text-xs text-violet-200">{t('coupons.available')}</p>
                                <p className="text-xl font-bold">{t('coupons.coupon_count', { count: coupons.length })}</p>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                                <p className="text-xs text-violet-200">{t('coupons.eligible_label')}</p>
                                <p className="text-xl font-bold text-green-300">{t('coupons.coupon_count', { count: eligibleCount })}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Claimed Success */}
                {claimedCoupon && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 mb-8 animate-in slide-in-from-top">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-green-100 rounded-2xl">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-green-800">{t('coupons.claimed_success')}</h3>
                                <p className="text-green-600 mt-1">
                                    {t('coupons.code_label')}: <span className="font-mono font-bold text-lg">{claimedCoupon.code}</span>
                                    {' — '}{claimedCoupon.description}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Coupons Grid */}
                {loading ? (
                    <div className="text-center py-20">
                        <RefreshCw className="w-8 h-8 animate-spin text-violet-500 mx-auto mb-3" />
                        <p className="text-gray-400">{t('coupons.loading')}</p>
                    </div>
                ) : coupons.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                        <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-500">{t('coupons.no_coupons')}</h3>
                        <p className="text-gray-400 mt-1">{t('coupons.no_coupons_hint')}</p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                        {coupons.map(coupon => (
                            <div
                                key={coupon.id}
                                className={`bg-white rounded-2xl border-2 overflow-hidden transition-all duration-300 ${coupon.eligible
                                    ? 'border-violet-200 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100'
                                    : 'border-gray-200 opacity-60'}`}
                            >
                                {/* Coupon Header */}
                                <div className={`px-6 py-4 ${coupon.eligible ? 'bg-gradient-to-r from-violet-50 to-purple-50' : 'bg-gray-50'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-xl ${coupon.eligible ? 'bg-violet-100' : 'bg-gray-200'}`}>
                                                <QrCode className={`w-6 h-6 ${coupon.eligible ? 'text-violet-600' : 'text-gray-400'}`} />
                                            </div>
                                            <div>
                                                <span className="font-mono font-bold text-gray-900 text-lg">{coupon.code}</span>
                                                <p className={`text-2xl font-black ${coupon.eligible ? 'text-violet-600' : 'text-gray-400'}`}>
                                                    {formatDiscount(coupon)}
                                                </p>
                                            </div>
                                        </div>
                                        {coupon.eligible ? (
                                            <span className="flex items-center gap-1 text-xs font-bold bg-green-100 text-green-700 px-3 py-1.5 rounded-full border border-green-200">
                                                <Unlock className="w-3.5 h-3.5" /> {t('coupons.eligible_label')}
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full border border-gray-200">
                                                <Lock className="w-3.5 h-3.5" /> {t('coupons.locked')}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Requirements */}
                                <div className="px-6 py-4 space-y-3">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('coupons.requirements')}</p>
                                    <div className="flex items-center gap-3 text-sm">
                                        <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                        <span className="text-gray-600">{t('coupons.min_courses', { count: coupon.min_completed_courses })}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Calendar className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                        <span className="text-gray-600">{t('coupons.min_days', { count: coupon.min_active_days })}</span>
                                    </div>
                                    {coupon.expires_at && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <Clock className="w-4 h-4 text-red-400 flex-shrink-0" />
                                            <span className="text-gray-600">{t('coupons.valid_until', { date: new Date(coupon.expires_at).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) })}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 text-sm">
                                        <RefreshCw className="w-4 h-4 text-violet-400 flex-shrink-0" />
                                        <span className="text-gray-600">{t('coupons.qr_rotation', { minutes: coupon.qr_rotation_minutes })}</span>
                                    </div>
                                </div>

                                {/* Claim Button */}
                                <div className="px-6 pb-5">
                                    <button
                                        onClick={() => handleClaim(coupon)}
                                        disabled={!coupon.eligible || claiming}
                                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${coupon.eligible
                                            ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-200 hover:shadow-xl cursor-pointer'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                    >
                                        {claiming ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <RefreshCw className="w-4 h-4 animate-spin" /> {t('coupons.claiming')}
                                            </span>
                                        ) : coupon.eligible ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <Award className="w-4 h-4" /> {t('coupons.claim_coupon')}
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-2">
                                                <Lock className="w-4 h-4" /> {t('coupons.not_eligible_short')}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentCouponsPage;
