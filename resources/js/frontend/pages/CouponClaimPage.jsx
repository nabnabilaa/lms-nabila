import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Loader2, CheckCircle, XCircle, Gift } from 'lucide-react';

const CouponClaimPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const code = searchParams.get('code');
    const [status, setStatus] = useState('processing'); // processing, success, error
    const [message, setMessage] = useState('Memverifikasi kode eksklusif...');
    const [couponData, setCouponData] = useState(null);

    useEffect(() => {
        if (!code) {
            setStatus('error');
            setMessage('Kode QR tidak valid atau hilang.');
            return;
        }

        // Call API to claim
        api.post('/coupons/claim-qr', { code })
            .then(res => {
                setStatus('success');
                setMessage(res.data.message);
                setCouponData(res.data.coupon);
                // Save to local storage so other pages can pick it up automatically if needed
                localStorage.setItem('claimed_coupon', JSON.stringify(res.data.coupon));
            })
            .catch(err => {
                setStatus('error');
                setMessage(err.response?.data?.message || 'Gagal mengklaim kupon.');
            });

    }, [code]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
                {status === 'processing' && (
                    <>
                        <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-800">Memproses...</h2>
                        <p className="text-gray-500 mt-2">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Berhasil!</h2>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            {message}
                        </p>

                        {couponData && (
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-xl text-white mb-6">
                                <div className="text-xs uppercase opacity-80 font-bold mb-1">Kode Kupon Anda</div>
                                <div className="text-3xl font-black tracking-wider">{couponData.code}</div>
                                <div className="mt-2 text-sm bg-white/20 inline-block px-3 py-1 rounded-lg">
                                    Diskon {couponData.value}%
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => navigate('/courses')}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
                        >
                            Jelajahi Kursus
                        </button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <XCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Gagal Mengklaim</h2>
                        <p className="text-red-500 mb-6">{message}</p>
                        <button
                            onClick={() => navigate('/')}
                            className="text-gray-500 font-bold hover:text-gray-800"
                        >
                            Kembali ke Beranda
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default CouponClaimPage;
