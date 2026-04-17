// Certificates Page - Connected to API
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, DownloadCloud, Share2, Loader } from 'lucide-react';
import { certificateService } from '../services/certificateService';
import { useTranslation } from 'react-i18next';
import { getTrans } from '../lib/transHelper';

const CertificateCard = ({ cert, onClick, t, lang }) => (
    <div
        onClick={onClick}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer group flex flex-col h-full"
    >
        <div className="flex items-center gap-4 mb-4 flex-1">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-colors shrink-0">
                <Award className="w-6 h-6 text-blue-600 group-hover:text-white" />
            </div>
            <div>
                <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">{getTrans(cert.course.title, lang)}</h3>
                <p className="text-sm text-gray-500">{t('certificates.issued')}: {new Date(cert.issued_at).toLocaleDateString()}</p>
            </div>
        </div>
        <div className="flex justify-between items-center text-sm pt-4 border-t border-gray-50 mt-auto">
            <span className="text-gray-500 font-mono text-xs">{cert.certificate_id}</span>
            <span className="text-blue-600 font-medium whitespace-nowrap">{t('certificates.view_details')}</span>
        </div>
    </div>
);

export const CertificatesPage = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCertificates = async () => {
            try {
                const data = await certificateService.getMyCertificates();
                setCertificates(data);
            } catch (err) {
                console.error("Failed to fetch certificates:", err);
                setError(t('certificates.load_failed'));
            } finally {
                setLoading(false);
            }
        };

        fetchCertificates();
    }, []);

    if (loading) return (
        <div className="flex justify-center items-center min-h-[80vh]">
            <Loader className="w-10 h-10 animate-spin text-blue-600" />
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                <button
                    onClick={() => navigate('/profile')}
                    className="mb-8 text-sm text-gray-500 hover:text-blue-600 flex items-center gap-2 px-4 bg-white py-2 rounded-lg shadow-sm border border-gray-200 inline-flex"
                >
                    <ArrowLeft className="w-4 h-4" /> {t('common.back_to_profile')}
                </button>

                <div className="mb-10 text-center md:text-left">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('certificates.title')}</h1>
                    <p className="text-gray-500">{t('certificates.subtitle')}</p>
                </div>

                {certificates.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-200">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Award className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{t('certificates.no_certificates')}</h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            {t('certificates.no_certificates_desc')}
                        </p>
                        <button
                            onClick={() => navigate('/courses')}
                            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
                        >
                            {t('certificates.start_learning')}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {certificates.map(cert => (
                            <CertificateCard
                                key={cert.id}
                                cert={cert}
                                t={t}
                                lang={i18n.language}
                                onClick={() => navigate(`/certificate-generator`, { state: { certificateId: cert.certificate_id } })}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
