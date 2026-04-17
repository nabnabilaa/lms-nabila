// Enhanced AdminCertificateBuilder dengan Grading Mapping
// Combines existing version + grading features from file2.html
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
    Sparkles, Palette, Database, User, Edit3, RefreshCw,
    Save, CheckCircle, Sliders, Calculator, Layers, ArrowRight,
    Download, Upload, FileSpreadsheet, AlertCircle
} from 'lucide-react';
import { courseService } from '../../services/courseService';
// Import MultiPageCertificate for Real Live Preview
import { MultiPageCertificate } from '../../components/certificate/MultiPageCertificate';

import { AdminNavbar } from '../../components/layout/AdminNavbar';
import ConfirmModal from '../../components/ui/ConfirmModal'; // NEW
import { useUser } from '../../contexts/UserContext';
import { useSearchParams } from 'react-router-dom';
import { useCourseQuery } from '../../hooks/queries/useCourses';

export const AdminCertificateBuilder = ({ course: propCourse, onSave, onCancel, userRole = 'admin' }) => {
    const navigate = useNavigate();
    const { user } = useUser();
    const [searchParams] = useSearchParams();
    const courseId = searchParams.get('courseId');

    // Fetch course if not provided via props
    const { data: fetchedCourse, isLoading } = useCourseQuery(courseId);

    // Resolve course object
    const course = propCourse || fetchedCourse;

    const [activeTab, setActiveTab] = useState('grading'); // Start with grading
    const [localConfig, setLocalConfig] = useState({
        templateStyle: 'modern',
        signatureName: course?.instructor?.name || 'Rizky Ramadhan',
        signatureTitle: 'Head of Curriculum',
        signature2Name: 'Maxy CEO', // Default for 2nd signer
        signature2Title: 'Program Director',
        distinctionGrade: 90,
        ...(course?.certificateConfig || {})
    });

    // GRADING MAPPING STATE
    const [gradingMap, setGradingMap] = useState({});

    // Simulator Data
    const [simStudentName, setSimStudentName] = useState('Siswa Contoh');
    const [simGrades, setSimGrades] = useState({});

    // AI Content
    const [adminPrompt, setAdminPrompt] = useState('');
    const [draftFeedback, setDraftFeedback] = useState({
        strengths: '',
        improvements: '',
        career: ''
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPublished, setIsPublished] = useState(false);

    // Excel Import/Export State
    const [importErrors, setImportErrors] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

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

    // Initialize grading map
    useEffect(() => {
        if (!course?.modules) return;

        const initialMap = {};
        const initialGrades = {};

        // Check if we have saved grading map
        const savedMap = course.certificateConfig?.gradingMap || {};

        course.modules.forEach(m => {
            if (savedMap[m.id]) {
                // Use saved configuration
                initialMap[m.id] = {
                    skillName: savedMap[m.id].skillName || m.title,
                    weight: savedMap[m.id].weight || 0
                };
            } else {
                // Default Initialization
                initialMap[m.id] = {
                    skillName: m.title,
                    weight: Math.floor(100 / course.modules.length)
                };
            }
            initialGrades[m.id] = 80; // Simulator default
        });

        setGradingMap(initialMap);
        setSimGrades(initialGrades);
    }, [course]);

    // Generate preview data
    const generatePreviewData = () => {
        const skills = {};
        let totalScore = 0;
        let totalWeight = 0;
        const modulesData = [];

        course.modules.forEach(mod => {
            const mapping = gradingMap[mod.id] || { skillName: mod.title, weight: 0 };
            const grade = simGrades[mod.id] || 0;
            skills[mapping.skillName] = grade;

            const weight = mapping.weight || 0;
            totalScore += grade * (weight / 100); // Weighted score
            totalWeight += weight;

            modulesData.push({
                name: mod.title, // or mapping.skillName if preferred
                score: grade,
                weight: weight
            });
        });

        // Normalize if weight doesn't sum to 100 (optional but good practice)
        const finalScore = totalWeight > 0 ? Math.round(totalScore) : 0; // Simple integer round

        return {
            title: course.title,
            instructor: course.instructor?.name || 'Instructor',
            dateCompleted: new Date().toLocaleDateString('id-ID'),
            certificateID: `PREVIEW`,
            studentName: simStudentName,
            totalScore: finalScore,
            skills: skills,
            modules: modulesData,
            feedback: {
                strengths: draftFeedback.strengths || "Contoh kekuatan siswa...",
                improvements: draftFeedback.improvements || "Contoh area pengembangan...",
                career: draftFeedback.career || "Contoh rekomendasi karir..."
            }
        };
    };

    const previewData = course ? generatePreviewData() : null;

    const handleConfigChange = (key, value) => {
        setLocalConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleScoreChange = (moduleId, newScore) => {
        setSimGrades(prev => ({ ...prev, [moduleId]: parseInt(newScore) }));
    };

    const handleGenerateContent = () => {
        setIsGenerating(true);

        setTimeout(() => {
            const context = adminPrompt.toLowerCase();
            const name = simStudentName;

            let genStrengths = `${name} telah menunjukkan dedikasi yang luar biasa selama bootcamp ini.`;
            let genImprovements = `Disarankan untuk lebih mendalami aspek optimasi performa aplikasi.`;
            let genCareer = 'Junior Fullstack Developer';

            if (context.includes('leader') || context.includes('pemimpin')) {
                genStrengths = `${name} bukan hanya developer kompeten, tetapi juga natural leader.`;
                genImprovements = `Bisa meningkatkan delegasi tugas teknis detail.`;
                genCareer = 'Management Trainee (MT) IT atau Junior Team Lead';
            } else if (context.includes('backend') || context.includes('logika')) {
                genStrengths = `Kekuatan utama ${name} di logika backend dan database.`;
                genImprovements = `Frontend perlu sentuhan estetika UX.`;
                genCareer = 'Backend Engineer atau Database Administrator';
            } else if (context.includes('frontend') || context.includes('design')) {
                genStrengths = `${name} memiliki mata tajam untuk desain UI.`;
                genImprovements = `Perdalam logika bisnis backend dan query database kompleks.`;
                genCareer = 'Frontend Engineer atau UI/UX Developer';
            }

            setDraftFeedback({
                strengths: genStrengths,
                improvements: genImprovements,
                career: genCareer
            });
            setIsGenerating(false);
        }, 2000);
    };

    const handleSaveConfig = async () => {
        const payload = {
            certificateConfig: {
                ...localConfig,
                gradingMap,
                feedbackTemplate: draftFeedback // Save feedback template too
            }
        };

        if (onSave) {
            onSave({
                config: localConfig,
                mapping: gradingMap,
                feedback: draftFeedback
            });
        } else {
            // Standalone Page Mode - Save direct to Backend
            try {
                // We use updateCourse to save certificateConfig json column
                // Assuming backend expects 'certificate_config' or similar?
                // Actually courseService.updateCourse sends FormData. 
                // Let's use courseService.updateCourse but we need to ensure payload structure matches backend Model.
                // Or use updateCertificateTemplate if that endpoint is designed for it.
                // updateCertificateTemplate (line 112 courseService) puts { template }.

                // Let's use `updateCertificateTemplate` which likely maps to a specific controller method.
                // Payload needs to be checked.
                // But safer to just update metadata if `certificateConfig` is a JSON column in `courses` table.

                // Let's try updateCertificateTemplate first.
                await courseService.updateCertificateTemplate(course.id, payload.certificateConfig);
                openAlert("Berhasil", "Konfigurasi sertifikat berhasil disimpan!", "confirm");
                // navigate(-1); // Only navigate if user clicks OK? Or just let them stay. 
                // Let's modify openAlert to accept a callback or just standard behavior.
                // For now, let's keep it simple. If we want to navigate, we can do it after alert closes?
                // Actually, openAlert just shows modal. 
                // Let's assume user wants to stay to keep editing unless we explicitly navigate.
                // But previously it navigated back. 
                // So I should use openConfirm for success with single button that navigates.
                setConfirmModal({
                    isOpen: true,
                    title: 'Berhasil',
                    message: 'Konfigurasi sertifikat berhasil disimpan!',
                    variant: 'confirm',
                    confirmLabel: 'OK',
                    cancelLabel: ' ', // Hide cancel roughly
                    onConfirm: () => {
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                        navigate(-1);
                    }
                });

            } catch (error) {
                console.error("Save failed", error);
                openAlert("Gagal", "Gagal menyimpan konfigurasi: " + error.message, "danger");
            }
        }
    };

    // Excel Template Download
    const handleDownloadTemplate = () => {
        if (!course || !course.modules) return;

        const headers = [
            'No',
            'Nama Siswa',
            'Email',
            ...course.modules.map(m => m.title),
            'Review dari Mentor',
            'Catatan (Optional)'
        ];

        const sampleRow = [
            1,
            'Contoh: Fandi Ahmad',
            'fandi@example.com',
            ...course.modules.map(() => 85),
            'Siswa ini menunjukkan dedikasi yang luar biasa dalam setiap modul pembelajaran. Memiliki potensi besar untuk dikembangkan lebih lanjut.',
            ''
        ];

        const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);

        // Set column widths
        ws['!cols'] = [
            { wch: 5 },  // No
            { wch: 25 }, // Nama
            { wch: 30 }, // Email
            ...course.modules.map(() => ({ wch: 10 })), // Module scores
            { wch: 50 }, // Review
            { wch: 20 }  // Catatan
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Certificate Data');

        const fileName = `Certificate_Template_${course.title.replace(/\s+/g, '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    // Excel Upload & Validation
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Check if schema mapping and template are configured
        const isMappingComplete = Object.keys(gradingMap).length > 0 &&
            Object.values(gradingMap).every(m => m.skillName && m.weight);

        if (!isMappingComplete || !localConfig.templateStyle) {
            openAlert("Perhatian", "Harap lengkapi Skema Penilaian dan pilih Template terlebih dahulu!", "warning");
            event.target.value = '';
            return;
        }

        // Confirmation dialog
        openConfirm({
            title: 'Konfirmasi Import Excel',
            message: `✓ Skema Penilaian: ${Object.keys(gradingMap).length} modul\n✓ Template: ${localConfig.templateStyle}\n\nApakah Anda yakin ingin melanjutkan import Excel?`,
            variant: 'info',
            confirmLabel: 'Ya, Import',
            onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                processFileUpload(file);
            }
        });
        event.target.value = '';
    };

    const processFileUpload = (file) => {
        setIsUploading(true);
        setImportErrors([]);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                // Validate
                const errors = validateImportData(jsonData);
                if (errors.length > 0) {
                    setImportErrors(errors);
                    setIsUploading(false);
                    return;
                }

                // Success - Save to backend
                try {
                    await courseService.importCandidates(course.id, jsonData, gradingMap);
                    openAlert("Berhasil", `✅ ${jsonData.length} sertifikat berhasil diimport!\n\nData telah disimpan dan akan dibawa ke halaman review.`, "confirm");

                    // Navigate to review (which will fetch the new data)
                    // Wait for user to close alert? 
                    // Actually openAlert logic above just closes modal.
                    // We want to navigate after.
                    setConfirmModal({
                        isOpen: true,
                        title: 'Import Berhasil',
                        message: `${jsonData.length} sertifikat berhasil diimport!`,
                        variant: 'confirm',
                        confirmLabel: 'Lanjut Review',
                        onConfirm: () => navigate(`/admin/certificates/review/${course.id}`)
                    });

                } catch (importErr) {
                    console.error("Import failed", importErr);
                    setImportErrors([`Gagal menyimpan data import: ${importErr.response?.data?.message || importErr.message}`]);
                } finally {
                    setIsUploading(false);
                }

            } catch (error) {
                setImportErrors([`Error membaca file: ${error.message}`]);
                setIsUploading(false);
            }
        };

        reader.readAsArrayBuffer(file);
    };

    const validateImportData = (data) => {
        const errors = [];

        if (!data || data.length === 0) {
            errors.push('File Excel kosong atau format tidak sesuai');
            return errors;
        }

        data.forEach((row, idx) => {
            const rowNum = idx + 2; // +1 for header, +1 for 1-indexed

            // Check required fields
            if (!row['Nama Siswa']) {
                errors.push(`Baris ${rowNum}: Nama siswa kosong`);
            }
            if (!row['Email']) {
                errors.push(`Baris ${rowNum}: Email kosong`);
            } else if (!row['Email'].includes('@')) {
                errors.push(`Baris ${rowNum}: Format email tidak valid`);
            }

            // Check module grades
            course.modules.forEach(mod => {
                const grade = row[mod.title];
                if (grade === undefined || grade === null || grade === '') {
                    errors.push(`Baris ${rowNum}: Nilai "${mod.title}" kosong`);
                } else if (isNaN(grade) || grade < 0 || grade > 100) {
                    errors.push(`Baris ${rowNum}: Nilai "${mod.title}" harus angka 0-100`);
                }
            });

            // Check review
            if (!row['Review dari Mentor']) {
                errors.push(`Baris ${rowNum}: Review dari mentor kosong`);
            }
        });

        return errors.slice(0, 10); // Limit to first 10 errors
    };

    if (isLoading) return <div className="p-12 text-center"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div><p>Loading course data...</p></div>;
    if (!course) return <div className="p-8 text-center text-gray-500">No course data found. check ID: {courseId}</div>;

    const totalWeight = Object.values(gradingMap).reduce((acc, curr) => acc + (curr.weight || 0), 0);

    return (
        <div className="min-h-screen bg-gray-50">
            <AdminNavbar
                user={user}
                onToggleSidebar={() => { }} // No sidebar in this view as requested
                onNavigate={(path) => navigate(path.startsWith('/') ? path : `/${path}`)}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Certificate Builder</h1>
                            <p className="text-gray-500">Desain & Logika Penilaian untuk {course.title}</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => navigate(`/admin/certificates/review/${course.id}`)}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 rounded-lg text-sm shadow-sm flex items-center gap-2"
                            >
                                <Edit3 className="w-4 h-4" />
                                Input Nilai Siswa
                            </button>
                            <button onClick={() => onCancel ? onCancel() : navigate(-1)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg text-sm">
                                Batal
                            </button>
                            <button onClick={handleSaveConfig} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 text-sm shadow-md">
                                Simpan Konfigurasi
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                        {/* Tab Headers */}
                        <div className="flex border-b border-gray-200 bg-gray-50">
                            {['grading', 'template'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {tab === 'grading' && <Calculator className="w-4 h-4" />}
                                    {tab === 'template' && <Palette className="w-4 h-4" />}
                                    {tab === 'grading' ? 'Skema Penilaian' : 'Template'}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="p-8 flex-1 overflow-y-auto">
                            {/* GRADING TAB */}
                            {activeTab === 'grading' && (
                                <div className="space-y-8">
                                    {/* Excel Batch Import Section */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                                        <div className="flex items-start gap-4">
                                            <div className="bg-blue-100 p-3 rounded-lg">
                                                <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-blue-900 mb-1">Batch Import via Excel</h3>
                                                <p className="text-sm text-blue-700 mb-4">
                                                    Untuk memudahkan input nilai banyak siswa sekaligus, download template Excel yang sudah disesuaikan dengan modul bootcamp ini.
                                                </p>

                                                <div className="flex flex-wrap gap-3">
                                                    <button
                                                        onClick={handleDownloadTemplate}
                                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-sm"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                        Download Excel Template
                                                    </button>

                                                    <label className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-bold border-2 border-blue-600 cursor-pointer hover:bg-blue-50 flex items-center gap-2">
                                                        <Upload className="w-4 h-4" />
                                                        {isUploading ? 'Uploading...' : 'Upload Excel'}
                                                        <input
                                                            type="file"
                                                            accept=".xlsx,.xls"
                                                            onChange={handleFileUpload}
                                                            className="hidden"
                                                            disabled={isUploading}
                                                        />
                                                    </label>
                                                </div>

                                                {importErrors.length > 0 && (
                                                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                                                        <div className="flex items-start gap-2 mb-2">
                                                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                                            <div>
                                                                <h4 className="font-bold text-red-900 text-sm">Import Errors ({importErrors.length})</h4>
                                                                <p className="text-xs text-red-700">Perbaiki error berikut di Excel Anda:</p>
                                                            </div>
                                                        </div>
                                                        <ul className="list-disc list-inside text-xs text-red-700 space-y-1 ml-7">
                                                            {importErrors.map((err, idx) => (
                                                                <li key={idx}>{err}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {isUploading && importErrors.length === 0 && (
                                                    <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6 shadow-lg">
                                                        <div className="flex items-center gap-4">
                                                            <div className="relative">
                                                                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                                                                    <CheckCircle className="w-7 h-7 text-white" />
                                                                </div>
                                                                <div className="absolute inset-0 w-12 h-12 bg-green-400 rounded-full animate-ping opacity-75" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h4 className="text-lg font-bold text-green-900 mb-1">Import Berhasil!</h4>
                                                                <p className="text-sm text-green-700">Data sedang diproses. Mengarahkan ke halaman review...</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mapping Section */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div>
                                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                <Layers className="w-5 h-5 text-indigo-600" /> Mapping Modul ke Sertifikat
                                            </h3>
                                            <p className="text-sm text-gray-500 mb-6">
                                                Tentukan bagaimana setiap modul berkontribusi terhadap nilai akhir di sertifikat.
                                            </p>
                                            <div className="space-y-4">
                                                {course.modules.map(mod => (
                                                    <div key={mod.id} className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-4">
                                                        <div className="flex-1">
                                                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Modul Bootcamp</p>
                                                            <p className="font-medium text-gray-900 text-sm">{mod.title}</p>
                                                        </div>
                                                        <ArrowRight className="w-4 h-4 text-gray-400" />
                                                        <div className="flex-1 space-y-2">
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-500">Nama di Sertifikat</label>
                                                                <input
                                                                    value={gradingMap[mod.id]?.skillName || ''}
                                                                    onChange={(e) => setGradingMap({
                                                                        ...gradingMap,
                                                                        [mod.id]: { ...gradingMap[mod.id], skillName: e.target.value }
                                                                    })}
                                                                    className="w-full text-xs p-1.5 border rounded"
                                                                    placeholder="Contoh: Frontend Skill"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-500">Bobot Nilai (%)</label>
                                                                <input
                                                                    type="number"
                                                                    value={gradingMap[mod.id]?.weight || 0}
                                                                    onChange={(e) => setGradingMap({
                                                                        ...gradingMap,
                                                                        [mod.id]: { ...gradingMap[mod.id], weight: parseInt(e.target.value) }
                                                                    })}
                                                                    className="w-full text-xs p-1.5 border rounded"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className={`mt-4 p-3 text-xs rounded-lg flex justify-between font-bold ${totalWeight === 100 ? 'bg-green-50 text-green-800' : 'bg-orange-50 text-orange-800'
                                                }`}>
                                                <span>Total Bobot:</span>
                                                <span>{totalWeight}%</span>
                                            </div>
                                        </div>
                                        <div className="border-l border-gray-200 pl-8">
                                            <h3 className="font-bold text-gray-900 mb-4">Preview Tampilan Nilai</h3>
                                            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                                <h4 className="text-center font-serif font-bold text-lg mb-4 text-gray-800">
                                                    ACADEMIC TRANSCRIPT
                                                </h4>
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b">
                                                            <th className="text-left py-2">Competency</th>
                                                            <th className="text-right py-2">Score</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {Object.entries(gradingMap).map(([id, m], i) => (
                                                            <tr key={i}>
                                                                <td className="py-2 text-gray-600">{m.skillName || '(Unnamed)'}</td>
                                                                <td className="py-2 text-right font-bold text-gray-900">{simGrades[id] || '-'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TEMPLATE TAB */}
                            {activeTab === 'template' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {['classic', 'modern', 'tech'].map((style) => (
                                        <div
                                            key={style}
                                            onClick={() => handleConfigChange('templateStyle', style)}
                                            className={`border-2 rounded-xl p-4 cursor-pointer hover:border-blue-300 transition-all ${localConfig.templateStyle === style ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200'
                                                }`}
                                        >
                                            <div className={`aspect-[4/3] mb-3 flex items-center justify-center shadow-sm ${style === 'tech' ? 'bg-gray-900' : 'bg-white border'
                                                }`}>
                                                <span className={`text-xs uppercase font-bold ${style === 'tech' ? 'text-green-400' : 'text-gray-400'
                                                    }`}>
                                                    {style} Style
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-gray-700 capitalize">{style}</span>
                                                {localConfig.templateStyle === style && <CheckCircle className="w-5 h-5 text-blue-600" />}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="col-span-full mt-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
                                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <Edit3 className="w-4 h-4" /> Konfigurasi Tanda Tangan
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Signer 1 */}
                                            <div className="space-y-3">
                                                <h5 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-b border-blue-100 pb-2">Pihak Pertama (Kiri)</h5>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 mb-1">Nama Penandatangan</label>
                                                    <input
                                                        value={localConfig.signatureName}
                                                        onChange={(e) => handleConfigChange('signatureName', e.target.value)}
                                                        className="p-2 border rounded-lg w-full text-sm"
                                                        placeholder="Nama Lengkap"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 mb-1">Jabatan</label>
                                                    <input
                                                        value={localConfig.signatureTitle}
                                                        onChange={(e) => handleConfigChange('signatureTitle', e.target.value)}
                                                        className="p-2 border rounded-lg w-full text-sm"
                                                        placeholder="Contoh: Head of Curriculum"
                                                    />
                                                </div>
                                            </div>

                                            {/* Signer 2 (Hidden for Instructors) */}
                                            {userRole !== 'instructor' && (
                                                <div className="space-y-3">
                                                    <h5 className="text-xs font-bold text-purple-600 uppercase tracking-wider border-b border-purple-100 pb-2">Pihak Kedua (Kanan)</h5>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 mb-1">Nama Penandatangan</label>
                                                        <input
                                                            value={localConfig.signature2Name || ''}
                                                            onChange={(e) => handleConfigChange('signature2Name', e.target.value)}
                                                            className="p-2 border rounded-lg w-full text-sm"
                                                            placeholder="Kosongkan jika tidak perlu"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 mb-1">Jabatan</label>
                                                        <input
                                                            value={localConfig.signature2Title || ''}
                                                            onChange={(e) => handleConfigChange('signature2Title', e.target.value)}
                                                            className="p-2 border rounded-lg w-full text-sm"
                                                            placeholder="Contoh: Program Director"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SIMULATOR TAB */}
                            {activeTab === 'simulator' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="col-span-1 space-y-4">
                                        <h3 className="font-bold text-gray-900 mb-2">Simulasi Nilai Siswa</h3>
                                        <div className="space-y-3">
                                            <div className="bg-gray-50 p-3 rounded border">
                                                <label className="text-xs font-bold text-gray-500">Nama Siswa</label>
                                                <input
                                                    value={simStudentName}
                                                    onChange={(e) => setSimStudentName(e.target.value)}
                                                    className="w-full bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none"
                                                />
                                            </div>
                                            {course.modules.map(mod => (
                                                <div key={mod.id} className="bg-gray-50 p-3 rounded border">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span>{mod.title}</span>
                                                        <span className="font-bold">{simGrades[mod.id] || 0}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        value={simGrades[mod.id] || 0}
                                                        onChange={(e) => handleScoreChange(mod.id, e.target.value)}
                                                        className="w-full"
                                                    />
                                                </div>
                                            ))}
                                            {/* Distinction Grade Slider */}
                                            <div className="bg-orange-50 p-3 rounded border border-orange-200 mt-6">
                                                <div className="flex justify-between mb-2">
                                                    <label className="text-xs font-bold text-orange-800">Batas Cum Laude</label>
                                                    <span className="text-lg font-bold text-orange-600">{localConfig.distinctionGrade}</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="70"
                                                    max="99"
                                                    value={localConfig.distinctionGrade}
                                                    onChange={(e) => handleConfigChange('distinctionGrade', parseInt(e.target.value))}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-2 bg-gray-50 p-6 rounded-xl border border-gray-200">
                                        <h4 className="font-bold text-gray-700 mb-4 text-center">Live Preview</h4>
                                        {previewData && (
                                            <div className="w-full h-[600px] overflow-auto bg-gray-200 rounded-xl p-4 border border-gray-300 shadow-inner relative flex justify-center">
                                                <div className="transform scale-[0.60] origin-top shadow-2xl">
                                                    <MultiPageCertificate
                                                        data={previewData}
                                                        config={localConfig}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* CONTENT TAB */}
                            {activeTab === 'content' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-1 space-y-6">
                                        <div className="bg-purple-50 p-5 rounded-xl border border-purple-100">
                                            <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                                                <User className="w-4 h-4" /> Instruksi AI
                                            </h3>
                                            <textarea
                                                value={adminPrompt}
                                                onChange={(e) => setAdminPrompt(e.target.value)}
                                                placeholder="Keywords: 'Leadership', 'Backend Expert'..."
                                                className="w-full h-40 p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                                            />
                                            <button
                                                onClick={handleGenerateContent}
                                                disabled={isGenerating}
                                                className="w-full mt-4 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                                {isGenerating ? 'Sedang Berpikir...' : 'Generate Narrative'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                                <Edit3 className="w-5 h-5 text-gray-500" /> Editor Laporan Akhir
                                            </h3>
                                        </div>
                                        <div className="space-y-4">
                                            {['strengths', 'improvements', 'career'].map(field => (
                                                <div key={field}>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{field}</label>
                                                    <textarea
                                                        value={draftFeedback[field]}
                                                        onChange={(e) => setDraftFeedback(prev => ({ ...prev, [field]: e.target.value }))}
                                                        className="w-full h-24 p-3 text-sm border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                message={confirmModal.message}
                title={confirmModal.title}
                variant={confirmModal.variant}
                confirmLabel={confirmModal.confirmLabel}
                cancelLabel={confirmModal.cancelLabel}
            />
        </div>
    );
};
