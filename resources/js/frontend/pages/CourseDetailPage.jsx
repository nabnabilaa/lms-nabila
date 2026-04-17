// Course Detail Page - Connected to API
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api'; // Direct API for coupons
import {
    ArrowLeft, Clock, Star, User, CheckCircle, PlayCircle, Lock,
    Video, FileText, MessageSquare, Download, Send, X, PlusCircle,
    Zap, Award, ThumbsUp, BookOpen, Pencil, Trash2, Eye, Ticket, ChevronDown, Loader2, Tag
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { Badge, ProgressBar, Card } from '../components/ui';
import ConfirmModal from '../components/ui/ConfirmModal'; // NEW
import { showToast } from '../components/ui/Toast';
import { courseService } from '../services/courseService';
import { certificateService } from '../services/certificateService'; // Import Certificate Service
import { useUser } from '../contexts/UserContext';
import { useTranslation } from 'react-i18next'; // Import
import { getTrans } from '../lib/transHelper'; // Import helper

export const CourseDetailPage = ({ currentUser: propUser, isPreviewMode = false }) => {
    const { t, i18n } = useTranslation(); // Init
    const { user: contextUser } = useUser();
    const currentUser = propUser || contextUser;

    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('curriculum');
    const [course, setCourse] = useState(null);
    const [discussions, setDiscussions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // New states for certificate modal
    const [showCertificateModal, setShowCertificateModal] = useState(false);
    const [selectedCertificate, setSelectedCertificate] = useState(null);

    const canPreview = currentUser?.role === 'admin' || currentUser?.role === 'instructor';

    // Discussion States
    const [showAskForm, setShowAskForm] = useState(false);
    const [newQuestionTopic, setNewQuestionTopic] = useState('');
    const [newQuestionBody, setNewQuestionBody] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyToUser, setReplyToUser] = useState(null);
    const [replyBody, setReplyBody] = useState('');
    const [editingReply, setEditingReply] = useState(null);
    const [editBody, setEditBody] = useState('');
    const [editingDiscussionId, setEditingDiscussionId] = useState(null);
    const [editDiscussionTitle, setEditDiscussionTitle] = useState('');
    const [editDiscussionBody, setEditDiscussionBody] = useState('');
    const [expandedDiscussionReplies, setExpandedDiscussionReplies] = useState({}); // Track expanded replies per discussion

    // Certificate Claim State
    const [isClaiming, setIsClaiming] = useState(false);

    // Coupon State
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponError, setCouponError] = useState('');

    const [verifyingCoupon, setVerifyingCoupon] = useState(false);
    const [showCouponInput, setShowCouponInput] = useState(false);
    const [showPromoView, setShowPromoView] = useState(true); // Toggle for preview mode

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        actionType: null, // 'enroll', 'delete_discussion', 'delete_reply'
        data: null,
        message: '',
        title: '',
        confirmLabel: 'Ya, Lanjutkan',
        variant: 'danger' // 'confirm', 'danger'
    });

    // Redirect Logic for Admins/Instructors accessing standard URL

    // Redirect Logic for Admins/Instructors accessing standard URL
    useEffect(() => {
        if (!isPreviewMode && currentUser) {
            if (currentUser.role === 'admin') {
                navigate(`/admin/courses/${id}/preview`, { replace: true });
            } else if (currentUser.role === 'instructor') {
                navigate(`/instructor/courses/${id}/preview`, { replace: true });
            }
        }
    }, [currentUser, isPreviewMode, id, navigate]);

    const fetchDiscussions = async () => {
        if (!id) return;
        try {
            const data = await courseService.getDiscussions(id);
            setDiscussions(data);
        } catch (err) {
            console.error("Failed to load discussions:", err);
        }
    };

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                setLoading(true);
                const data = await courseService.getCourseById(id);
                setCourse(data);
                fetchDiscussions();
            } catch (err) {
                console.error("Failed to fetch course:", err);
                setError(err.message || 'Gagal memuat kursus');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchCourse();
        }
    }, [id]);

    // Enrollment Logic - Moved higher
    const enrollment = course?.enrollments && course?.enrollments[0];
    const isEnrolled = enrollment?.payment_status === 'paid';
    const isPendingPayment = enrollment?.payment_status === 'pending';
    const progressPercent = enrollment?.progress_percent || 0;

    // RESTORE COUPON STATE FROM PENDING ENROLLMENT
    // RESTORE COUPON STATE FROM PENDING ENROLLMENT
    useEffect(() => {
        const enrollment = course?.enrollments && course.enrollments[0];
        if (enrollment && enrollment.coupon_code && enrollment.payment_status === 'pending') {
            // Restore coupon state locally
            setVerifyingCoupon(true);
            api.get(`/coupons/check?code=${enrollment.coupon_code}`)
                .then(res => {
                    setAppliedCoupon(res.data.coupon);
                    setCouponCode(enrollment.coupon_code);
                    setShowCouponInput(true); // Show the input so they see it's applied
                })
                .catch(err => console.error("Failed to restore coupon", err))
                .finally(() => setVerifyingCoupon(false));
        }
    }, [course]);

    // AUTO-APPLY PROMOTED COUPON - REMOVED!
    // Learners must now explicitly scan or manually type the code.

    const handleClaimCertificate = async () => {
        setIsClaiming(true);
        try {
            const result = await certificateService.claimCertificate(course.id);
            showToast('Sertifikat berhasil diterbitkan!', 'success');

            // PERUBAHAN: Gunakan state untuk kirim ID, URL tetap bersih
            navigate('/certificate-generator', {
                state: { certificateId: result.certificate_id }
            });

        } catch (err) {
            const msg = err.response?.data?.message || 'Gagal klaim sertifikat';
            showToast(msg, 'error');
            // Jika ternyata sudah ada (conflict), refresh halaman agar tombol update
            if (err.response?.status === 200) {
                window.location.reload();
            }
        } finally {
            setIsClaiming(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !course) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-500 mb-4">{error || t('common.error')}</p>
                <button onClick={() => navigate('/courses')} className="text-blue-600 hover:underline">
                    {t('common.back_to_courses')}
                </button>
            </div>
        );
    }

    const modules = course.modules || [];
    const resources = course.resources || [];
    const instructor = course.instructor || {};

    // Stats
    const totalModules = course.modules_count || modules.length;

    // Check Certificate Status (dari Controller backend yang sudah disesuaikan)
    const userCertificate = course.user_certificate;
    const isCourseCompleted = progressPercent === 100;

    // Discussion Handlers
    const handlePostQuestion = async () => {
        if (isPreviewMode) return showToast('Fitur diskusi dinonaktifkan dalam mode preview', 'info');
        if (!newQuestionTopic.trim() || !newQuestionBody.trim()) {
            showToast('Judul dan isi pertanyaan harus diisi', 'error');
            return;
        }
        try {
            await courseService.createDiscussion(id, {
                title: newQuestionTopic,
                body: newQuestionBody
            });
            showToast('Pertanyaan berhasil dikirim!', 'success');
            setNewQuestionTopic('');
            setNewQuestionBody('');
            setShowAskForm(false);
            fetchDiscussions();
        } catch (err) {
            showToast('Gagal mengirim pertanyaan', 'error');
        }
    };

    const handleReply = async (discussionId) => {
        if (isPreviewMode) return showToast('Fitur diskusi dinonaktifkan dalam mode preview', 'info');
        if (!replyBody.trim()) return;
        try {
            await courseService.replyDiscussion(discussionId, {
                body: replyBody,
                parent_id: replyingTo === discussionId ? null : replyingTo,
                reply_to_user_name: replyToUser
            });
            showToast('Balasan terkirim!', 'success');
            setReplyBody('');
            setReplyingTo(null);
            setReplyToUser(null);
            fetchDiscussions();
        } catch (err) {
            showToast('Gagal mengirim balasan', 'error');
        }
    };

    const handleStartReply = (discussionId, userName) => {
        setReplyingTo(discussionId);
        setReplyToUser(userName);
        setTimeout(() => document.getElementById(`reply-input-${discussionId}`)?.focus(), 100);
    };

    const handleStartEdit = (discussionId, replyId, currentBody) => {
        setEditingReply({ discussionId, replyId });
        setEditBody(currentBody);
    };

    const handleSaveEdit = async () => {
        if (!editBody.trim()) return;
        try {
            await courseService.updateReply(editingReply.discussionId, editingReply.replyId, { body: editBody });
            showToast('Komentar berhasil diedit', 'success');
            setEditingReply(null);
            setEditBody('');
            fetchDiscussions();
        } catch (err) {
            showToast('Gagal mengedit komentar', 'error');
        }
    };

    const handleStartEditDiscussion = (discussion) => {
        setEditingDiscussionId(discussion.id);
        setEditDiscussionTitle(discussion.title);
        setEditDiscussionBody(discussion.body);
    };

    const handleCancelEditDiscussion = () => {
        setEditingDiscussionId(null);
        setEditDiscussionTitle('');
        setEditDiscussionBody('');
    };

    const handleSaveDiscussionEdit = async () => {
        if (!editDiscussionTitle.trim() || !editDiscussionBody.trim()) {
            showToast('Judul dan isi tidak boleh kosong', 'error');
            return;
        }
        try {
            await courseService.updateDiscussion(editingDiscussionId, {
                title: editDiscussionTitle,
                body: editDiscussionBody
            });
            showToast('Diskusi berhasil diperbarui', 'success');
            handleCancelEditDiscussion();
            fetchDiscussions();
        } catch (err) {
            showToast('Gagal memperbarui diskusi', 'error');
        }
    };

    const handleMarkAsSolved = async (discussionId) => {
        try {
            await courseService.updateDiscussion(discussionId, { is_resolved: true });
            showToast('Diskusi ditandai sebagai selesai', 'success');
            fetchDiscussions();
        } catch (err) {
            showToast('Gagal menandai diskusi selesai', 'error');
        }
    };

    const handleVote = async (discussionId) => {
        try {
            await courseService.voteDiscussion(discussionId);
            fetchDiscussions();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteDiscussionClick = (discussionId) => {
        setConfirmModal({
            isOpen: true,
            actionType: 'delete_discussion',
            data: { discussionId },
            message: 'Apakah Anda yakin ingin menghapus diskusi ini?',
            title: 'Hapus Diskusi',
            confirmLabel: 'Ya, Hapus',
            variant: 'warning'
        });
    };

    const handleDeleteDiscussion = async (discussionId) => {
        try {
            await courseService.deleteDiscussion(discussionId);
            showToast('Diskusi berhasil dihapus', 'success');
            fetchDiscussions();
        } catch (err) {
            showToast('Gagal menghapus diskusi', 'error');
        }
    };

    const handleDeleteReplyClick = (discussionId, replyId) => {
        setConfirmModal({
            isOpen: true,
            actionType: 'delete_reply',
            data: { discussionId, replyId },
            message: 'Apakah Anda yakin ingin menghapus balasan ini?',
            title: 'Hapus Balasan',
            confirmLabel: 'Ya, Hapus',
            variant: 'warning'
        });
    };

    const handleDeleteReply = async (discussionId, replyId) => {
        try {
            await courseService.deleteReply(discussionId, replyId);
            showToast('Balasan berhasil dihapus', 'success');
            fetchDiscussions();
        } catch (err) {
            showToast('Gagal menghapus balasan', 'error');
        }
    };

    const handleEnrollClick = () => {
        if (isPreviewMode) {
            showToast('Fitur pendaftaran dinonaktifkan dalam mode preview', 'info');
            return;
        }
        if (!currentUser) {
            showToast('Silakan login untuk mendaftar', 'info');
            navigate('/login');
            return;
        }

        setConfirmModal({
            isOpen: true,
            actionType: 'enroll',
            data: null,
            message: `Apakah Anda yakin ingin mendaftar ke kursus ini? ${course.is_premium ? '(Berbayar)' : '(Gratis)'}`,
            title: 'Konfirmasi Pendaftaran',
            confirmLabel: 'Ya, Daftar',
            variant: course.is_premium ? 'info' : 'confirm'
        });
    };

    const handleEnroll = async () => {
        try {
            // Pass coupon code if applied
            const response = await courseService.enrollCourse(id, appliedCoupon ? appliedCoupon.code : null);

            if (response.payment_url) {
                showToast('Mengalihkan ke halaman pembayaran...', 'info');
                window.location.href = response.payment_url;
            } else {
                showToast('Berhasil enroll!', 'success');
                window.location.reload();
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Gagal enroll';
            if (err.response?.data?.payment_url) {
                window.location.href = err.response.data.payment_url;
                return;
            }
            showToast(msg, 'error');
        }
    };

    const handleConfirmAction = () => {
        if (confirmModal.actionType === 'enroll') {
            handleEnroll();
        } else if (confirmModal.actionType === 'delete_discussion') {
            handleDeleteDiscussion(confirmModal.data.discussionId);
        } else if (confirmModal.actionType === 'delete_reply') {
            handleDeleteReply(confirmModal.data.discussionId, confirmModal.data.replyId);
        }
        setConfirmModal({ ...confirmModal, isOpen: false });
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setVerifyingCoupon(true);
        setCouponError('');
        try {
            const res = await api.get(`/coupons/check?code=${couponCode}`);
            setAppliedCoupon(res.data.coupon);
            showToast('Kupon berhasil dipasang!', 'success');
        } catch (err) {
            setAppliedCoupon(null);
            setCouponError(err.response?.data?.message || 'Kode kupon tidak valid');
        } finally {
            setVerifyingCoupon(false);
        }
    };

    // Calculate Price
    const originalPrice = parseInt(course?.price || 0);
    let finalPrice = originalPrice;

    // Simulate applied coupon if Instructor toggles Promo View ON
    const effectiveCoupon = (isPreviewMode && showPromoView && course?.promoted_coupon)
        ? course.promoted_coupon
        : appliedCoupon;

    // Use Pending Enrollment Price if available (locked price)
    if (enrollment && enrollment.payment_status === 'pending' && enrollment.final_price) {
        finalPrice = parseInt(enrollment.final_price);
    } else if (effectiveCoupon && course?.is_premium) {
        if (effectiveCoupon.type === 'fixed') {
            finalPrice = Math.max(0, originalPrice - parseInt(effectiveCoupon.value));
        } else {
            finalPrice = Math.max(0, originalPrice - (originalPrice * (parseInt(effectiveCoupon.value) / 100)));
        }
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'discussion':
                return (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-gray-800">{t('course.module_discussions')} ({discussions.length})</h3>
                            {!showAskForm && (
                                <button
                                    onClick={() => !isPreviewMode && setShowAskForm(true)}
                                    disabled={isPreviewMode}
                                    title={isPreviewMode ? t('course.preview_mode_disabled') : t('course.create_question')}
                                    className={`text-sm font-bold flex items-center gap-1 ${isPreviewMode ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:underline'}`}
                                >
                                    <PlusCircle className="w-4 h-4" /> {t('course.create_question')}
                                </button>
                            )}
                        </div>

                        {showAskForm && (
                            <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 shadow-sm mb-6">
                                {/* Form Pertanyaan */}
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-900">Buat Pertanyaan Baru</h3>
                                    <button onClick={() => setShowAskForm(false)} className="text-gray-400 hover:text-gray-600">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={newQuestionTopic}
                                    onChange={(e) => setNewQuestionTopic(e.target.value)}
                                    placeholder="Judul pertanyaan..."
                                    className="w-full p-3 bg-white border border-gray-200 rounded-lg mb-3"
                                    autoFocus
                                />
                                <textarea
                                    value={newQuestionBody}
                                    onChange={(e) => setNewQuestionBody(e.target.value)}
                                    placeholder="Jelaskan pertanyaan Anda..."
                                    rows={4}
                                    className="w-full p-3 bg-white border border-gray-200 rounded-lg mb-3 resize-none"
                                />
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowAskForm(false)}
                                        className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handlePostQuestion}
                                        className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                    >
                                        <Send className="w-4 h-4" /> Kirim
                                    </button>
                                </div>
                            </div>
                        )}

                        {discussions.length > 0 ? (
                            <div className="space-y-4">
                                {discussions.map((discuss) => (
                                    <div key={discuss.id} className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
                                        {/* Discussion Item Content */}
                                        <div className="flex items-start gap-4">
                                            {/* Avatar Logic */}
                                            {discuss.user?.avatar ? (
                                                <img
                                                    src={discuss.user.avatar.includes('http') ? discuss.user.avatar : `http://127.0.0.1:8000/storage/${discuss.user.avatar}`}
                                                    alt={discuss.user.name}
                                                    className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-50 shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-sm">
                                                    {discuss.user?.name?.substring(0, 2).toUpperCase() || 'U'}
                                                </div>
                                            )}

                                            <div className="flex-1">
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-lg">{discuss.title}</h4>
                                                    <p className="text-xs text-gray-500 mb-2">
                                                        {discuss.user?.name} • {new Date(discuss.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {discuss.is_resolved && <Badge variant="green">Solved</Badge>}

                                                    {/* Mark as Solved Button - Restricted for Instructors */}
                                                    {!discuss.is_resolved && currentUser?.id == discuss.user_id && currentUser?.role !== 'instructor' && (
                                                        <button
                                                            onClick={() => handleMarkAsSolved(discuss.id)}
                                                            className="flex items-center gap-1 text-xs font-bold text-emerald-600 border border-emerald-200 bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100 transition-colors"
                                                            title="Tandai sebagai selesai"
                                                        >
                                                            <CheckCircle className="w-3 h-3" /> Solved
                                                        </button>
                                                    )}

                                                    {currentUser?.id == discuss.user_id && (
                                                        <>
                                                            <button
                                                                onClick={() => !isPreviewMode && handleStartEditDiscussion(discuss)}
                                                                disabled={isPreviewMode}
                                                                className={`p-1 ${isPreviewMode ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-blue-600'}`}
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => !isPreviewMode && handleDeleteDiscussionClick(discuss.id)}
                                                                disabled={isPreviewMode}
                                                                className={`p-1 ${isPreviewMode ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600'}`}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>

                                                {editingDiscussionId === discuss.id ? (
                                                    <div className="mt-3 space-y-3">
                                                        <input
                                                            type="text"
                                                            value={editDiscussionTitle}
                                                            onChange={(e) => setEditDiscussionTitle(e.target.value)}
                                                            className="w-full p-2 border border-blue-300 rounded-lg text-lg font-bold"
                                                        />
                                                        <textarea
                                                            value={editDiscussionBody}
                                                            onChange={(e) => setEditDiscussionBody(e.target.value)}
                                                            className="w-full p-3 border border-blue-300 rounded-lg"
                                                            rows={4}
                                                        />
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={handleCancelEditDiscussion} className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
                                                            <button onClick={handleSaveDiscussionEdit} className="px-3 py-1.5 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-gray-700 whitespace-pre-wrap">{discuss.body}</p>
                                                )}

                                                <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-100/60">
                                                    <button
                                                        onClick={() => !isPreviewMode && handleVote(discuss.id)}
                                                        disabled={isPreviewMode}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${discuss.is_liked ? 'bg-blue-50 text-blue-600' : (isPreviewMode ? 'text-gray-400 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50')}`}
                                                    >
                                                        <ThumbsUp className={`w-4 h-4 ${discuss.is_liked ? 'fill-blue-500 text-blue-500' : ''}`} />
                                                        <span>{discuss.likes || 0} Likes</span>
                                                    </button>
                                                    <button onClick={() => setReplyingTo(replyingTo === discuss.id ? null : discuss.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${replyingTo === discuss.id ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                                                        <MessageSquare className="w-4 h-4" />
                                                        <span>{discuss.replies?.length || 0} Balasan</span>
                                                    </button>
                                                </div>

                                                {/* Replies Section */}
                                                {(discuss.replies && discuss.replies.length > 0) && (
                                                    <div className="mt-6">
                                                        {(() => {
                                                            const isExpanded = expandedDiscussionReplies[discuss.id];
                                                            const REPLY_LIMIT = 5;
                                                            const visibleReplies = isExpanded ? discuss.replies : discuss.replies.slice(0, REPLY_LIMIT);
                                                            const remainingCount = discuss.replies.length - visibleReplies.length;

                                                            return (
                                                                <>
                                                                    {visibleReplies.map((reply, idx) => {
                                                                        const isLastReply = idx === visibleReplies.length - 1 && remainingCount === 0;

                                                                        return (
                                                                            <div key={reply.id || idx} className="relative pl-10">
                                                                                {/* Thread Spine */}
                                                                                <div
                                                                                    className="absolute left-[1.15rem] top-0 w-0.5 bg-gray-200"
                                                                                    style={{
                                                                                        height: isLastReply ? '30px' : '100%',
                                                                                        display: 'block'
                                                                                    }}
                                                                                />
                                                                                {/* Curved Connector */}
                                                                                <div className="absolute left-[1.15rem] top-[1.8rem] w-6 h-4 border-l-2 border-b-2 border-gray-200 rounded-bl-xl transform -translate-y-1/2" />

                                                                                {/* Reply Card */}
                                                                                <div className={`mb-4 bg-gray-50/80 p-4 rounded-xl group hover:bg-gray-50 border border-transparent hover:border-gray-200 ${editingReply?.replyId === reply.id ? 'ring-2 ring-blue-100 bg-white' : ''}`}>
                                                                                    {editingReply?.replyId === reply.id ? (
                                                                                        <div className="space-y-3">
                                                                                            <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} className="w-full p-3 border border-blue-300 rounded-lg text-sm bg-white" rows={3} autoFocus />
                                                                                            <div className="flex justify-end gap-2">
                                                                                                <button onClick={() => setEditingReply(null)} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-md">Batal</button>
                                                                                                <button onClick={handleSaveEdit} className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-md hover:bg-blue-700">Simpan</button>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <>
                                                                                            <div className="flex justify-between items-start mb-2">
                                                                                                <div className="flex items-center gap-3">
                                                                                                    {reply.user_avatar ? (
                                                                                                        <img src={reply.user_avatar.includes('http') ? reply.user_avatar : `http://127.0.0.1:8000/storage/${reply.user_avatar}`} alt={reply.user_name} className="w-8 h-8 rounded-full object-cover shadow-sm bg-white" />
                                                                                                    ) : (
                                                                                                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shadow-sm border-2 border-white">{reply.user_name?.substring(0, 2).toUpperCase()}</div>
                                                                                                    )}
                                                                                                    <div>
                                                                                                        <div className="flex items-center gap-2">
                                                                                                            <span className="font-bold text-sm text-gray-900">{reply.user_name}</span>
                                                                                                            <span className="text-xs text-gray-400">• {new Date(reply.created_at).toLocaleDateString()}</span>
                                                                                                        </div>
                                                                                                        {reply.reply_to_user_name && (
                                                                                                            <div className="text-[10px] text-blue-600 font-medium bg-blue-50 px-1.5 rounded w-fit mt-0.5">Replying to @{reply.reply_to_user_name}</div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>

                                                                                                <div className="flex gap-1 opacity-100 transition-opacity">
                                                                                                    <button
                                                                                                        onClick={() => !isPreviewMode && handleStartReply(discuss.id, reply.user_name)}
                                                                                                        disabled={isPreviewMode}
                                                                                                        className={`px-2 py-1 text-xs font-medium ${isPreviewMode ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-blue-600'}`}
                                                                                                    >
                                                                                                        Reply
                                                                                                    </button>

                                                                                                    {currentUser?.id == reply.user_id && (
                                                                                                        <>
                                                                                                            <button
                                                                                                                onClick={() => !isPreviewMode && handleStartEdit(discuss.id, reply.id, reply.body)}
                                                                                                                disabled={isPreviewMode}
                                                                                                                className={`p-1 ${isPreviewMode ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-blue-600'}`}
                                                                                                            >
                                                                                                                <Pencil className="w-3.5 h-3.5" />
                                                                                                            </button>
                                                                                                            <button
                                                                                                                onClick={() => !isPreviewMode && handleDeleteReply(discuss.id, reply.id)}
                                                                                                                disabled={isPreviewMode}
                                                                                                                className={`p-1 ${isPreviewMode ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600'}`}
                                                                                                            >
                                                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                                                            </button>
                                                                                                        </>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                            <p className="text-gray-700 text-sm whitespace-pre-wrap pl-[3rem] -mt-2 leading-relaxed">{reply.body}</p>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}

                                                                    {remainingCount > 0 && (
                                                                        <div className="relative pl-10 py-1">
                                                                            <div className="absolute left-[1.15rem] top-0 w-0.5 bg-gray-200 h-6" />
                                                                            <div className="absolute left-[1.15rem] top-[1.5rem] w-6 h-4 border-l-2 border-b-2 border-gray-200 rounded-bl-xl transform -translate-y-1/2" />

                                                                            <button
                                                                                onClick={() => setExpandedDiscussionReplies(prev => ({ ...prev, [discuss.id]: true }))}
                                                                                className="ml-2 text-indigo-600 font-semibold text-sm hover:bg-indigo-50 px-3 py-1.5 rounded-full flex items-center gap-2 transition-colors"
                                                                            >
                                                                                <span className="text-xs">⮑</span> Lihat {remainingCount} balasan lainnya
                                                                            </button>
                                                                        </div>
                                                                    )}

                                                                    {isExpanded && discuss.replies.length > REPLY_LIMIT && (
                                                                        <div className="relative pl-10 py-1">
                                                                            <div className="absolute left-[1.15rem] top-0 w-0.5 bg-gray-200 h-4" />
                                                                            <button
                                                                                onClick={() => setExpandedDiscussionReplies(prev => ({ ...prev, [discuss.id]: false }))}
                                                                                className="ml-8 text-gray-500 font-medium text-xs hover:text-gray-700 px-3 py-1 flex items-center gap-2 transition-colors"
                                                                            >
                                                                                Sembunyikan
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                )}

                                                {/* Reply Input */}
                                                {replyingTo === discuss.id && (
                                                    <div className="mt-4">
                                                        {replyToUser && (
                                                            <div className="flex justify-between items-center bg-blue-50 px-3 py-1.5 rounded-t-lg border-x border-t border-blue-100 text-xs text-blue-700">
                                                                <span>Replying to <b>{replyToUser}</b></span>
                                                                <button onClick={() => setReplyToUser(null)}><X className="w-3 h-3" /></button>
                                                            </div>
                                                        )}
                                                        <div className="flex gap-3">
                                                            <input
                                                                id={`reply-input-${discuss.id}`}
                                                                type="text"
                                                                value={replyBody}
                                                                onChange={(e) => setReplyBody(e.target.value)}
                                                                placeholder={replyToUser ? `Balas @${replyToUser}...` : "Tulis balasan Anda..."}
                                                                className={`flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 ${replyToUser ? 'rounded-tl-none border-t-0' : ''} ${isPreviewMode ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                                                                disabled={isPreviewMode}
                                                                onKeyDown={(e) => e.key === 'Enter' && handleReply(discuss.id)}
                                                            />
                                                            <button
                                                                onClick={() => !isPreviewMode && handleReply(discuss.id)}
                                                                disabled={isPreviewMode}
                                                                className={`p-2 rounded-lg text-white ${isPreviewMode ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                                            >
                                                                <Send className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p>Belum ada diskusi.</p>
                                <p className="text-sm">Jadilah yang pertama bertanya di modul ini!</p>
                            </div>
                        )}
                    </div>
                );

            case 'resources':
                return (
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-800 mb-2">{t('course.supporting_materials')}</h3>
                        {resources.length > 0 ? resources.map((res) => (
                            <div key={res.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">{getTrans(res.title, i18n.language)}</h4>
                                        <p className="text-xs text-gray-500 uppercase">{res.type} {res.file_size && `• ${res.file_size}`}</p>
                                    </div>
                                </div>
                                <a href={res.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-blue-600 rounded-full">
                                    <Download className="w-5 h-5" />
                                </a>
                            </div>
                        )) : (
                            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                                {t('course.no_resources')}
                            </div>
                        )}
                    </div>
                );

            case 'curriculum':
            default:
                return (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        {modules.length > 0 ? modules.map((module, index) => {
                            // Logic: Lock all if premium & not enrolled. If free, lock only index > 0 (preview first)
                            const isLocked = !isEnrolled && (course.is_premium || index > 0);
                            const totalContents = module.contents?.length || 0;
                            const completedContents = module.contents?.filter(c => c.user_progress?.completed).length || 0;
                            const isCompleted = totalContents > 0 && completedContents === totalContents;

                            return (
                                <div key={module.id} className={`p-4 border-b border-gray-50 flex items-center gap-4 ${!isLocked ? 'hover:bg-gray-50' : 'opacity-70'}`}>
                                    <div className="flex-shrink-0">
                                        {isCompleted ? (
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><CheckCircle className="w-5 h-5" /></div>
                                        ) : !isLocked ? (
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><PlayCircle className="w-5 h-5" /></div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><Lock className="w-4 h-4" /></div>
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <h4 className={`text-sm font-bold ${isLocked ? 'text-gray-400' : 'text-gray-900'}`}>{getTrans(module.title, i18n.language)}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-gray-500 flex items-center gap-1"><Video className="w-3 h-3" /> {module.type || 'lesson'}</span>
                                            <span className="text-xs text-gray-500">{module.duration_minutes} min</span>
                                        </div>
                                    </div>

                                    {!isLocked ? (
                                        <button
                                            onClick={() => {
                                                if (module.contents && module.contents.length > 0) {
                                                    const targetContent = module.contents[0];
                                                    // Logic URL Preview
                                                    if (isPreviewMode && currentUser) {
                                                        const prefix = currentUser.role === 'admin' ? '/admin' : '/instructor';
                                                        navigate(`${prefix}/courses/${course.id}/lesson/${targetContent.id}/preview`);
                                                    } else {
                                                        navigate(`/courses/${course.id}/lesson/${targetContent.id}`);
                                                    }
                                                } else {
                                                    showToast('Modul ini belum memiliki konten', 'info');
                                                }
                                            }}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${isCompleted ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                        >
                                            {isCompleted ? t('course.review') : t('course.start')}
                                        </button>
                                    ) : canPreview && (
                                        <button
                                            onClick={() => {
                                                if (module.contents && module.contents.length > 0) {
                                                    const targetContent = module.contents[0];
                                                    // Logic URL Preview (Force for Locked Items in Preview)
                                                    const prefix = currentUser?.role === 'admin' ? '/admin' : '/instructor';
                                                    navigate(`${prefix}/courses/${course.id}/lesson/${targetContent.id}/preview`);
                                                } else {
                                                    showToast('Modul ini belum memiliki konten', 'info');
                                                }
                                            }}
                                            className="px-3 py-1.5 text-xs font-bold rounded-md transition-colors bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 flex items-center gap-1"
                                        >
                                            <Eye className="w-3 h-3" /> {t('course.view')}
                                        </button>
                                    )}
                                </div>
                            );
                        }) : (
                            <div className="p-8 text-center text-gray-500">{t('course.no_modules')}</div>
                        )}
                    </div>
                );
        }
    };



    return (
        <div className="max-w-7xl mx-auto px-4 pb-20 pt-6">
            {/* Header Section */}
            <div className={`bg-gradient-to-r ${isPreviewMode ? 'from-orange-700 to-red-700' : 'from-blue-700 to-indigo-700'} text-white rounded-3xl p-8 mb-8 shadow-xl relative overflow-hidden transition-all duration-300`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl"></div>

                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-4">
                        <button
                            onClick={() => {
                                if (location.state?.from === 'admin-explore') {
                                    navigate('/admin/courses');
                                } else if (location.state?.from === 'admin-curriculum') {
                                    navigate('/admin', { state: { initialTab: 'curriculum' } });
                                } else {
                                    navigate('/courses');
                                }
                            }}
                            className="text-white/80 hover:text-white text-sm flex items-center gap-1"
                        >
                            <ArrowLeft className="w-4 h-4" /> {t('course.back')}
                        </button>

                        {/* [NEW] Preview Mode Toggle for Promoted Coupon */}
                        {isPreviewMode && course?.promoted_coupon && (
                            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-sm">
                                <span className="text-xs font-bold text-white/90 uppercase tracking-wide">Promo View</span>
                                <button
                                    role="switch"
                                    aria-checked={showPromoView}
                                    onClick={() => setShowPromoView(!showPromoView)}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/50 ${showPromoView ? 'bg-emerald-500' : 'bg-white/20'}`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${showPromoView ? 'translate-x-5' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <Badge variant="blue" className="bg-white/20 text-white border-white/20 capitalize">{course?.difficulty || 'All Levels'}</Badge>

                                {/* [NEW] Integrated Course-Specific Promo Badge */}
                                {course?.promoted_coupon && !isEnrolled && (isPreviewMode ? showPromoView : course.promoted_coupon.is_eligible) && (
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold animate-pulse shadow-lg">
                                        <Award className="w-3 h-3" />
                                        <span>
                                            {t('course.special_offer')}: {course.promoted_coupon.type === 'percent'
                                                ? `${t('course.discount')} ${course.promoted_coupon.value}%`
                                                : `${t('course.save')} Rp ${parseInt(course.promoted_coupon.value).toLocaleString('id-ID')}`}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <h1 className="text-3xl font-bold mb-2">{getTrans(course?.title, i18n.language)}</h1>
                            <p className="text-blue-100 max-w-xl mb-4">{getTrans(course?.description, i18n.language)}</p>

                            {/* [NEW] Integrated QR Section (Inline) */}
                            {course?.promoted_coupon && !isEnrolled && (isPreviewMode ? showPromoView : course.promoted_coupon.is_eligible) && course.promoted_coupon.is_qr_coupon && (
                                <div className="mt-6 mb-6 bg-white/10 backdrop-blur-md border border-yellow-400/30 p-4 rounded-xl flex items-center gap-4 max-w-lg">
                                    <div className="bg-white p-2 rounded-lg shadow-sm flex-shrink-0">
                                        <QRCode
                                            value={`${window.location.origin}/claim-exclusive?code=${course.promoted_coupon.code}`}
                                            size={64}
                                        />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-yellow-300 text-sm mb-1">{t('course.scan_qr')} {course.promoted_coupon.code}</h3>
                                        <p className="text-xs text-blue-100 leading-tight">
                                            {t('course.get_discount')}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-6 mt-2">
                                <div className="flex items-center gap-2"><User className="w-4 h-4" /><span className="text-sm">{instructor?.name || 'Instructor'}</span></div>
                                <div className="flex items-center gap-2"><Star className="w-4 h-4 fill-white" /><span className="text-sm">{course?.rating || '4.8'}/5.0</span></div>
                                <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span className="text-sm">{course?.duration_minutes ? Math.round(course.duration_minutes / 60) + ' ' + t('course.hours') : '-'}</span></div>
                            </div>
                        </div>

                        {/* CTA Card */}
                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 min-w-[240px]">
                            {isEnrolled ? (
                                <>
                                    <div className="flex justify-between mb-2 text-sm">
                                        <span className="font-medium text-blue-100">{t('course.progress')}</span>
                                        <span className="font-bold">{progressPercent}%</span>
                                    </div>
                                    <ProgressBar progress={progressPercent} color="bg-emerald-400" />

                                    {/* TOMBOL SMART ACTION (Lanjut / Klaim / Lihat) */}
                                    {isCourseCompleted ? (
                                        userCertificate ? (
                                            userCertificate.is_published ? (
                                                <button
                                                    onClick={() => navigate('/certificate-generator', {
                                                        state: { certificateId: userCertificate.certificate_id }
                                                    })}
                                                    className="w-full mt-4 py-2 bg-white text-emerald-600 font-bold rounded-lg hover:bg-emerald-50 flex items-center justify-center gap-2"
                                                >
                                                    <Award className="w-4 h-4" /> {t('course.view_certificate')}
                                                </button>
                                            ) : (
                                                <button
                                                    disabled
                                                    className="w-full mt-4 py-2 bg-yellow-100/20 text-yellow-100 font-bold rounded-lg cursor-not-allowed flex items-center justify-center gap-2 border border-yellow-200/20"
                                                >
                                                    <Loader2 className="w-4 h-4 animate-spin" /> {t('course.verification_pending')}
                                                </button>
                                            )
                                        ) : (
                                            <button
                                                onClick={handleClaimCertificate}
                                                disabled={isClaiming}
                                                className="w-full mt-4 py-2 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 flex items-center justify-center gap-2 transition-all shadow-lg animate-pulse"
                                            >
                                                {isClaiming ? t('course.processing') : <><Award className="w-4 h-4" /> {t('course.claim_certificate')}</>}
                                            </button>
                                        )
                                    ) : (
                                        <button
                                            onClick={() => {
                                                const firstContent = modules[0]?.contents?.[0];
                                                if (firstContent) navigate(`/courses/${course.id}/lesson/${firstContent.id}`);
                                                else showToast('Belum ada materi tersedia', 'info');
                                            }}
                                            className="w-full mt-4 py-2 bg-white text-blue-700 font-bold rounded-lg hover:bg-blue-50"
                                        >
                                            {t('course.continue_learning')}
                                        </button>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* Price Display - Premium Courses */}
                                    {course.is_premium ? (
                                        <div className="text-center mb-0">
                                            <span className="text-blue-200 text-sm mb-1 block">{t('course.course_price')}</span>

                                            {/* Animated Price Display */}
                                            <div className="relative">
                                                {finalPrice < originalPrice && effectiveCoupon ? (
                                                    <div className="animate-in fade-in zoom-in duration-300">
                                                        {/* Original Price - Strikethrough */}
                                                        <span className="text-lg text-blue-300/70 line-through decoration-2">
                                                            Rp {originalPrice.toLocaleString('id-ID')}
                                                        </span>

                                                        {/* Discounted Price */}
                                                        <div className="text-3xl font-black text-white mt-1 animate-in slide-in-from-bottom-2 duration-300">
                                                            Rp {finalPrice.toLocaleString('id-ID')}
                                                        </div>

                                                        {/* Discount Badge */}
                                                        <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-bold animate-in zoom-in duration-300">
                                                            <Tag className="w-3.5 h-3.5" />
                                                            {effectiveCoupon.type === 'percent'
                                                                ? `-${effectiveCoupon.value}%`
                                                                : `-Rp ${parseInt(effectiveCoupon.value).toLocaleString('id-ID')}`
                                                            }
                                                            <span className="text-green-400/80">
                                                                ({t('course.save')} Rp {(originalPrice - finalPrice).toLocaleString('id-ID')})
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-3xl font-black text-white block pb-3">
                                                        Rp {originalPrice.toLocaleString('id-ID')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center mb-4">
                                            <p className="text-blue-100 text-sm">{t('course.free_for_intern')}</p>
                                        </div>
                                    )}

                                    {/* Coupon Input Section - Only for Premium & Not Enrolled & NOT simulating Promo View */}
                                    {course.is_premium && !isEnrolled && !(isPreviewMode && showPromoView) && (
                                        <div className="mb-4 mt-1 border-t border-white/10 pt-2">
                                            {/* Toggle Button */}
                                            <button
                                                onClick={() => setShowCouponInput(!showCouponInput)}
                                                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-blue-200 hover:text-white transition-colors"
                                            >
                                                <Ticket className="w-4 h-4" />
                                                <span>{t('course.have_coupon')}</span>
                                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showCouponInput ? 'rotate-180' : ''}`} />
                                            </button>

                                            {/* Coupon Input */}
                                            {showCouponInput && (
                                                <div className="mt-3 p-3 bg-white/10 rounded-xl backdrop-blur-sm animate-in slide-in-from-top-2 duration-200">
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={couponCode}
                                                            onChange={(e) => {
                                                                setCouponCode(e.target.value.toUpperCase());
                                                                setCouponError('');
                                                            }}
                                                            placeholder={t('course.enter_coupon')}
                                                            className="flex-1 px-3 py-2 bg-white/90 text-gray-800 rounded-lg text-sm font-mono font-bold placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                            disabled={verifyingCoupon || appliedCoupon}
                                                        />
                                                        {appliedCoupon ? (
                                                            <button
                                                                onClick={() => {
                                                                    setAppliedCoupon(null);
                                                                    setCouponCode('');
                                                                    setCouponError('');
                                                                }}
                                                                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors"
                                                            >
                                                                {t('course.remove')}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={handleApplyCoupon}
                                                                disabled={verifyingCoupon || !couponCode.trim()}
                                                                className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-bold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                            >
                                                                {verifyingCoupon ? (
                                                                    <><Loader2 className="w-4 h-4 animate-spin" /> ...</>
                                                                ) : (
                                                                    t('course.apply')
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Success Message */}
                                                    {appliedCoupon && (
                                                        <div className="mt-2 flex items-center gap-2 text-green-400 text-sm font-medium animate-in fade-in duration-200">
                                                            <CheckCircle className="w-4 h-4" />
                                                            <span>{t('course.coupon_applied')}</span>
                                                        </div>
                                                    )}

                                                    {/* Error Message */}
                                                    {couponError && (
                                                        <div className="mt-2 text-red-400 text-sm font-medium animate-in shake duration-300">
                                                            {couponError}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* PENDING PAYMENT STATE RECOVERY */}
                                    {enrollment && enrollment.payment_status === 'pending' ? (
                                        <button
                                            onClick={() => window.location.href = enrollment.payment_url}
                                            className="w-full py-3 bg-yellow-400 text-yellow-900 font-bold rounded-lg hover:bg-yellow-300 shadow-lg animate-pulse"
                                        >
                                            {t('course.complete_payment')}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleEnrollClick}
                                            className="w-full py-3 bg-white text-blue-700 font-bold rounded-lg hover:bg-blue-50 shadow-lg transform active:scale-95 transition-all"
                                        >
                                            {course.is_premium
                                                ? `${t('course.buy_class')} (Rp ${finalPrice.toLocaleString('id-ID')})`
                                                : t('course.enroll_now')
                                            }
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs & Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex border-b border-gray-200">
                        {['curriculum', 'discussion', 'resources'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                {tab === 'curriculum' ? 'Kurikulum' : tab === 'discussion' ? 'Diskusi' : 'Resource'}
                            </button>
                        ))}
                    </div>
                    {renderTabContent()}
                </div>

                {/* Sidebar Stats */}
                <div className="space-y-6">
                    <Card>
                        <h3 className="font-bold text-gray-900 mb-4">{t('course.course_stats')}</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3"><BookOpen className="w-5 h-5 text-blue-500" /><span className="text-sm font-medium text-gray-600">{t('course.total_modules')}</span></div>
                                <span className="font-bold text-gray-900">{totalModules}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3"><Zap className="w-5 h-5 text-yellow-500" /><span className="text-sm font-medium text-gray-600">{t('course.total_xp')}</span></div>
                                <span className="font-bold text-gray-900">1000 XP</span>
                            </div>
                        </div>
                    </Card>

                    {isEnrolled && (
                        <Card>
                            <h3 className="font-bold text-gray-900 mb-4">{t('course.certificate')}</h3>
                            <div className={`text-center p-4 border-2 border-dashed rounded-xl transition-colors ${userCertificate ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                                <Award className={`w-12 h-12 mx-auto mb-2 ${userCertificate ? 'text-emerald-500' : 'text-gray-300'}`} />
                                <p className="text-sm text-gray-500 mb-3">
                                    {userCertificate
                                        ? t('course.certificate_ready')
                                        : isCourseCompleted
                                            ? t('course.course_completed')
                                            : t('course.complete_all_modules')}
                                </p>

                                {userCertificate ? (
                                    userCertificate.is_published ? (
                                        <button
                                            onClick={() => navigate('/certificate-generator', {
                                                state: { certificateId: userCertificate.certificate_id }
                                            })}
                                            className="text-xs font-bold text-emerald-600 hover:underline"
                                        >
                                            {t('course.view_certificate')} &rarr;
                                        </button>
                                    ) : (
                                        <span className="text-xs font-bold text-yellow-600 flex items-center justify-center gap-1">
                                            <Loader2 className="w-3 h-3 animate-spin" /> {t('course.verification_pending')}
                                        </span>
                                    )
                                ) : isCourseCompleted ? (
                                    <button
                                        onClick={handleClaimCertificate}
                                        disabled={isClaiming}
                                        className="text-xs font-bold text-blue-600 hover:underline"
                                    >
                                        {isClaiming ? t('course.processing') : <>{t('course.claim_now')} &rarr;</>}
                                    </button>
                                ) : (
                                    <ProgressBar progress={progressPercent} />
                                )}
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            {/* Certificate Modal - Only show when explicitly requested */}
            {/* <CertificateModal ... /> (Jika Anda punya modal lain) */}

            {/* Global Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleConfirmAction}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmLabel={confirmModal.confirmLabel}
                variant={confirmModal.variant}
            />
        </div >
    );
};