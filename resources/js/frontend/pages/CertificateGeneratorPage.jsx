import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, DownloadCloud, Loader, CheckCircle } from 'lucide-react';
import { MultiPageCertificate } from '../components/certificate/MultiPageCertificate';

import { certificateService } from '../services/certificateService';
import axios from 'axios';

// import html2canvas from 'html2canvas'; (Removed)
// import jsPDF from 'jspdf'; (Removed)

const mockConfig = {
    templateStyle: "modern",
    primaryColor: "blue",
    passingGrade: 70,
    distinctionGrade: 90
};

export const CertificateGeneratorPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const iframeRef = useRef(null);
    const printTriggeredRef = useRef(false);

    const [config, setConfig] = useState({
        templateStyle: "modern",
        primaryColor: "blue",
        passingGrade: 70,
        distinctionGrade: 90
    });

    // Menerima ID dari navigasi (state)
    const certificateId = location.state?.certificateId;

    useEffect(() => {
        const fetchData = async () => {
            if (!certificateId) {
                // Handle jika user akses langsung tanpa lewat tombol di course detail
                setError("Certificate ID not provided. Silakan akses dari halaman detail kursus.");
                setLoading(false);
                return;
            }
            try {
                const response = await certificateService.getCertificateById(certificateId);
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

                // Parse config if it comes as string, or use directly object
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
                // Handle 403 (Unpublished) specially to show Pending UI
                if (err.response && err.response.status === 403) {
                    // Set data to minimal object with isPublished: false to trigger the pending UI
                    setData({ isPublished: false });
                    return;
                }
                console.error(err);
                setError("Gagal memuat data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [certificateId]);

    const handleDownloadPDF = async () => {
        setIsPrinting(true);
        try {
            const token = localStorage.getItem('token');
            const targetUrl = `${window.location.origin}/certificate/print/${certificateId}`;

            // Generate clean filename
            const cleanStudent = data.studentName.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
            const cleanCourse = data.title.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
            const finalFileName = `${cleanStudent}_${cleanCourse}_Certificate.pdf`;

            const response = await axios.post('/generate-pdf', {
                url: targetUrl,
                token: token,
                filename: finalFileName
            }, {
                responseType: 'blob'
            });

            // Create blob link to download
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const link = document.createElement('a');
            const url = window.URL.createObjectURL(blob);
            link.href = url;
            link.download = finalFileName;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (err) {
            console.error("PDF Generation Error:", err);
            setError("Gagal membuat PDF via Server. Pastikan server (node server.js) berjalan.");
        } finally {
            setIsPrinting(false);
        }
    };



    if (loading) return <div className="flex justify-center p-20"><Loader className="animate-spin" /></div>;

    // Tampilan jika sertifikat belum published (mock logic atau real logic)
    if (data && !data.isPublished) {
        return (
            <div className="max-w-xl mx-auto py-20 text-center space-y-6">
                <div className="w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center mx-auto">
                    <Loader className="w-12 h-12 text-yellow-600 animate-spin" /> {/* Used Loader as Clock alternative or import Clock */}
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Sertifikat Sedang Diproses</h2>
                    <p className="text-gray-500 mt-2 leading-relaxed">
                        Instruktur sedang meninjau hasil belajar Anda.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/certificates')}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50"
                >
                    Kembali ke Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12 relative">

            {/* --- ACTION BAR (New Style) --- */}
            <div className="flex items-center justify-between no-print bg-white p-4 rounded-xl border border-gray-200 shadow-sm sticky top-20 z-40">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/certificates')}
                        className="text-sm font-bold text-gray-500 hover:text-blue-600 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Kembali
                    </button>
                    <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
                    <div className="hidden md:block">
                        <h3 className="font-bold text-gray-900 text-sm">Dokumen Resmi Tersedia</h3>
                        <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Terverifikasi
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleDownloadPDF}
                    disabled={isPrinting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isPrinting ? <Loader className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
                    {isPrinting ? 'Memproses PDF...' : 'Download PDF'}
                </button>
            </div>

            {/* --- PREVIEW USER (RESPONSIVE) --- */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 min-h-screen flex justify-center">
                {/* 
                     Using existing MultiPageCertificate which now wraps CertificateTemplate 
                     and handles scaling automatically.
                 */}
                <MultiPageCertificate data={data} config={config} />
            </div>

        </div>
    );
};