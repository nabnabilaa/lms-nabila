import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, X, Mail, CheckCircle, AlertCircle, Edit3 } from 'lucide-react';
import { CertificateEditorTabs } from '../../components/admin/CertificateEditorTabs';
import { courseService } from '../../services/courseService';
import { certificateService } from '../../services/certificateService';
import ConfirmModal from '../../components/ui/ConfirmModal';

export const CertificateReviewPage = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [bootcamp, setBootcamp] = useState(null);
    const [certificates, setCertificates] = useState([]);
    const [selectedCert, setSelectedCert] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    // Filter Logic
    const [searchTerm, setSearchTerm] = useState('');

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        message: '',
        title: '',
        variant: 'confirm',
        confirmLabel: 'Ya, Lanjutkan',
        cancelLabel: 'Batal',
        onConfirm: null
    });

    const openConfirm = (payload) => {
        setConfirmModal({
            isOpen: true,
            title: payload.title || 'Konfirmasi',
            message: payload.message,
            variant: payload.variant || 'warning',
            confirmLabel: payload.confirmLabel || 'Ya, Lanjutkan',
            cancelLabel: payload.cancelLabel || 'Batal',
            onConfirm: payload.onConfirm
        });
    };

    const openAlert = (title, message, variant = 'info') => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            variant,
            confirmLabel: 'OK',
            cancelLabel: 'Tutup',
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    useEffect(() => {
        const fetchCandidates = async () => {
            try {
                const data = await courseService.getCertificateCandidates(courseId);
                setBootcamp({
                    id: parseInt(courseId),
                    title: data.course_title,
                    certificateConfig: data.certificate_config, // Store config from backend
                    modules: [] // Modules list can be fetched if needed
                });
                setCertificates(data.candidates);
            } catch (err) {
                console.error("Failed to load candidates", err);
                openAlert("Gagal", "Gagal memuat data kandidat sertifikat.", "danger");
            }
        };

        if (courseId) {
            fetchCandidates();
        }
    }, [courseId]);


    const handleCheckCertificate = (certId) => {
        const cert = certificates.find(c => c.id === certId);
        setSelectedCert(cert);
        setIsEditing(true);
    };

    const handleSaveCertificate = async (certId, editedData) => {
        try {
            const payload = {
                final_score: editedData.finalScore,
                mentor_review: editedData.mentorReview,
                strengths: editedData.strengths,
                improvements: editedData.improvements,
                career: editedData.career,
                verified: true
            };

            await certificateService.updateCertificate(certId, payload);

            setCertificates(prev =>
                prev.map(c => c.id === certId ? {
                    ...c,
                    student_name: editedData.studentName,
                    final_score: editedData.finalScore,
                    skills_breakdown: editedData.skills,
                    mentor_review: editedData.mentorReview,
                    strengths: editedData.strengths,
                    improvements: editedData.improvements,
                    career: editedData.career,
                    verified: true
                } : c)
            );
            setIsEditing(false);
            // Don't deselect, just update
            setSelectedCert(prev => ({ ...prev, ...payload, verified: true }));

            openAlert("Berhasil", "Perubahan berhasil disimpan!", "confirm");
        } catch (err) {
            console.error("Update failed", err);
            openAlert("Gagal", "Gagal menyimpan perubahan.", "danger");
        }
    };

    const handleMarkAsVerified = async (certId) => {
        // Optimistic update
        setCertificates(prev =>
            prev.map(c => c.id === certId ? { ...c, verified: true } : c)
        );
        // Ideally call API to save 'verified' status too if column exists
    };

    const handleBulkVerify = () => {
        openConfirm({
            title: 'Verifikasi Masal',
            message: 'Verifikasi semua sertifikat yang belum dicek?',
            variant: 'warning',
            onConfirm: () => {
                setCertificates(prev => prev.map(c => ({ ...c, verified: true })));
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handlePublishAll = async () => {
        const unverifiedCount = certificates.filter(c => !c.verified).length;
        if (unverifiedCount > 0) {
            openAlert("Perhatian", `Masih ada ${unverifiedCount} sertifikat yang belum diverifikasi!`, "warning");
            return;
        }

        openConfirm({
            title: 'Terbitkan Sertifikat',
            message: `Terbitkan ${certificates.length} sertifikat dan kirim email ke semua siswa?`,
            variant: 'confirm',
            confirmLabel: 'Ya, Terbitkan',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setIsPublishing(true);
                try {
                    await courseService.publishCertificates(courseId);
                    openAlert("Berhasil", "Sertifikat telah diterbitkan dan email sedang diproses!", "confirm");
                    navigate('/admin');
                } catch (err) {
                    console.error("Publish failed", err);
                    openAlert("Gagal", "Gagal menerbitkan sertifikat.", "danger");
                } finally {
                    setIsPublishing(false);
                }
            }
        });
    };

    // Filtered List
    const filteredCertificates = certificates.filter(c =>
        c.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.student_email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const allVerified = certificates.every(c => c.verified);
    const verifiedCount = certificates.filter(c => c.verified).length;

    if (!bootcamp) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-64px)] bg-gray-50 overflow-hidden">
            {/* LEFT SIDEBAR: Student List */}
            <div className="w-96 bg-white border-r border-gray-200 flex flex-col h-full shadow-lg z-10 shrink-0">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 bg-white">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => navigate('/admin')} className="text-gray-400 hover:text-gray-600 transition-colors text-sm font-medium">
                            ← Back
                        </button>
                        <div className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">
                            {bootcamp.title}
                        </div>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-1">Students Review</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="text-green-600 font-medium">{verifiedCount} Verified</span>
                        <span>•</span>
                        <span>{certificates.length} Total</span>
                    </div>

                    {/* Search */}
                    <div className="mt-4 relative">
                        <input
                            type="text"
                            placeholder="Search student..."
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {/* Search Icon */}
                        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {filteredCertificates.length === 0 && (
                        <div className="text-center py-10 text-gray-400 text-sm">No students found</div>
                    )}

                    {filteredCertificates.map(cert => (
                        <div
                            key={cert.student_id}
                            onClick={() => setSelectedCert(cert)}
                            className={`p-3 rounded-xl cursor-pointer transition-all duration-200 border relative ${selectedCert?.student_id === cert.student_id
                                ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-300'
                                : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm shrink-0 ${cert.verified ? 'bg-gradient-to-br from-green-400 to-green-600 text-white' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {cert.verified ? <Check className="w-5 h-5" /> : (cert.student_name ? cert.student_name.charAt(0) : '?')}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-bold text-sm truncate ${selectedCert?.student_id === cert.student_id ? 'text-blue-700' : 'text-gray-900'}`}>{cert.student_name}</h3>
                                    <p className="text-xs text-gray-500 truncate mb-2">{cert.student_email}</p>

                                    <div className="flex items-center justify-between">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cert.final_score >= 90 ? 'bg-orange-100 text-orange-700' :
                                            cert.final_score >= 70 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            Score: {cert.final_score}
                                        </span>
                                        {cert.verified && <span className="text-[10px] text-green-600 font-medium flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> Verified</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t border-gray-200 bg-white">
                    <button
                        onClick={handlePublishAll}
                        disabled={isPublishing || allVerified}
                        className="w-full py-2.5 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-lg hover:shadow-xl transform active:scale-95"
                    >
                        {isPublishing ? 'Publishing...' : '🚀 Publish All Verified'}
                    </button>
                    <p className="text-xs text-center text-gray-400 mt-2">
                        Only verified certificates will be published.
                    </p>
                </div>
            </div>

            {/* MAIN CONTENT: Editor & Preview */}
            <div className="flex-1 overflow-hidden bg-gray-100 relative flex flex-col">
                {selectedCert ? (
                    <div className="h-full flex flex-col">
                        <CertificateEditorTabs
                            key={selectedCert.student_id}
                            certificate={selectedCert}
                            bootcamp={bootcamp}
                            onSave={handleSaveCertificate}
                            onCancel={() => setSelectedCert(null)}
                        />
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-10">
                        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-6 animate-pulse opacity-50">
                            <Edit3 className="w-10 h-10 text-gray-400" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-500 mb-2">Select a Student</h2>
                        <p className="text-sm max-w-md text-center">
                            Select a student from the sidebar to review their grades, generate AI comments, and verify their certificate.
                        </p>
                    </div>
                )}
            </div>

            <ConfirmModal {...confirmModal} />
        </div>
    );
};
