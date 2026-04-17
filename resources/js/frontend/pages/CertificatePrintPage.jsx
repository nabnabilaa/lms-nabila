import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CertificateTemplate } from '../components/certificate/PrintableCertificate';
import { certificateService } from '../services/certificateService';
import { Loader, Printer } from 'lucide-react';

export const CertificatePrintPage = () => {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [config, setConfig] = useState({
        templateStyle: "modern",
        primaryColor: "blue",
        passingGrade: 70,
        distinctionGrade: 90
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) {
                setError("Certificate ID invalid.");
                setLoading(false);
                return;
            }
            try {
                const response = await certificateService.getCertificateById(id);
                // Transform API response to component data format
                const certData = {
                    title: response.details.course_title,
                    instructor: response.details.instructor,
                    dateCompleted: response.details.completion_date,
                    certificateID: response.certificate.certificate_id,
                    studentName: response.details.student_name,
                    totalScore: response.details.total_score,
                    grade: response.details.grade,
                    modules: response.details.modules,
                    skills: response.details.skills,
                    isPublished: true,
                    fileUrl: response.certificate.file_url,
                    feedback: response.details.feedback || { strengths: "", improvements: "", career: "" }
                };

                let apiConfig = response.details.style_config;
                if (typeof apiConfig === 'string') {
                    try {
                        apiConfig = JSON.parse(apiConfig);
                    } catch (e) {
                        console.error("Error parsing style_config JSON", e);
                    }
                }
                if (apiConfig) {
                    setConfig(prev => ({ ...prev, ...apiConfig }));
                }

                setData(certData);
            } catch (err) {
                console.error(err);
                setError("Gagal memuat data sertifikat.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();

    }, [id]);

    useEffect(() => {
        if (data) {
            document.title = `${data.studentName}_${data.title}_Certificate`;
            // Notify parent if inside iframe
            if (window.self !== window.top) {
                // Small delay to ensure rendering is complete
                setTimeout(() => {
                    window.parent.postMessage('CERTIFICATE_READY', '*');
                }, 1000);
            }
        }
    }, [data]);

    if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader className="animate-spin w-10 h-10 text-blue-600" /></div>;

    if (error) return <div className="flex h-screen items-center justify-center text-red-500 font-bold bg-gray-50">{error}</div>;

    return (
        <div className="bg-gray-50 min-h-screen relative overflow-x-hidden">
            <style>
                {`
                    @media print {
                        .no-print { display: none !important; }
                        
                        body, html { 
                            margin: 0 !important; 
                            padding: 0 !important; 
                            width: 100% !important;
                            height: 100% !important;
                            background: white !important; 
                            -webkit-print-color-adjust: exact; 
                            print-color-adjust: exact; 
                        }

                        @page { 
                            size: landscape A4; 
                            margin: 0; 
                        }

                        /* Wrapper Reset */
                        .certificate-wrapper {
                            padding: 0 !important;
                            margin: 0 !important;
                            display: block !important;
                            width: 100% !important;
                            background: white !important;
                        }
                        
/* Smart Page Breaks */
                        .pdf-page {
                            page-break-after: always;
                        }
                        .pdf-page:last-child {
                            page-break-after: auto;
                        }

                        /* Ensure background graphics print */
                        * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                    }
                `}
            </style>

            {/* Floating Print Button */}
            <div className="fixed top-6 right-6 z-50 no-print">
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-xl hover:bg-blue-700 transition-all font-bold hover:scale-105"
                >
                    <Printer className="w-5 h-5" /> Cetak PDF
                </button>
            </div>

            <div className="w-full flex justify-center py-8 certificate-wrapper">
                <CertificateTemplate data={data} config={config} />
            </div>
        </div>
    );
};
