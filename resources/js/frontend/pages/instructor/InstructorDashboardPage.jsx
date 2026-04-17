import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, ChevronRight, BookOpen, Calendar, Plus, Edit3, Trash2,
    Video, FileText, FileQuestion, MessageSquare, User, Clock, Star,
    Users, GraduationCap, TrendingUp, AlertCircle, ArrowLeft,
    LayoutDashboard, List, Settings
} from 'lucide-react';
import { useTranslation } from 'react-i18next'; // Import
import { getTrans } from '../../lib/transHelper';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { AdminModal } from '../../components/admin/ui/AdminModal';
import { ContentWizardForm } from '../../components/admin/forms/ContentWizardForm';
import { courseService } from '../../services/courseService';
import { ProfilePageComplete } from '../../pages/OtherPages';
import { CoursesPage } from '../../pages/CoursesPage';
import { EditProfilePage } from '../../pages/EditProfilePage';
import { SecuritySettingsPage } from '../../pages/SecuritySettingsPage';
import api from '../../services/api';
import { toast } from '../../components/ui/Toast';
import { useUser } from '../../contexts/UserContext';
import { useCoursesQuery, useCourseMutations, useInstructorDiscussionsQuery } from '../../hooks/queries/useCourses';

const generateShortId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 9; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${result.slice(0, 3)}-${result.slice(3, 6)}-${result.slice(6, 9)}`;
};

export const InstructorDashboardPage = () => {
    const { t, i18n } = useTranslation(); // Init
    const navigate = useNavigate();
    const { user, loading: userLoading } = useUser();
    const [activeTab, setActiveTab] = useState('overview');
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedIds, setExpandedIds] = useState({});
    const [settingsView, setSettingsView] = useState('overview');

    // Pagination State for Bootcamp Saya
    const [page, setPage] = useState(1);
    const itemsPerPage = 5;
    const queryClient = useQueryClient();

    const [coupons, setCoupons] = useState([]);
    useEffect(() => {
        const fetchCoupons = async () => {
            try {
                const res = await api.get('/coupons');
                setCoupons(res.data.filter(c => c.is_qr_coupon && c.is_active));
            } catch (error) {
                console.error("Failed fetching coupons:", error);
            }
        };
        fetchCoupons();
    }, []);

    // TanStack Query - cached data shown instantly, background refetch if stale
    const { data: courses = [], isLoading: coursesLoading } = useCoursesQuery();
    const mutations = useCourseMutations(); // All CRUD with auto cache invalidation

    const loading = userLoading || coursesLoading;

    // Modal States
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [modalType, setModalType] = useState('course');
    const [selectedParentId, setSelectedParentId] = useState(null);
    const [editingItem, setEditingItem] = useState(null);

    // Discussions State - now using TanStack Query (removed useState)
    // Reply Editing State
    const [editingReplyId, setEditingReplyId] = useState(null);
    const [editReplyBody, setEditReplyBody] = useState('');
    const [expandedDiscussionReplies, setExpandedDiscussionReplies] = useState({}); // Track expanded replies per discussion


    // Refs for reply forms
    const replyFormRefs = useRef({});

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        mentor: '',
        url: '',
        type: 'video',
        duration: '',
        date: '',
        startTime: '',
        endTime: '',
        instructor_id: '',
        xpReward: 50,
        xpBonus: { perfectQuiz: 20 },
        quizData: null,
        meetingType: 'external',
        roomId: '',
        meetingCode: ''
    });

    // Derived Data
    const myCourses = courses.filter(c => c.instructor_id === user?.id || c.mentor === user?.name || c.instructor_id === 'INT001'); // Temporary loose check for dev

    const filteredCourses = myCourses.filter(course =>
        (getTrans(course.title, t('language_code') || 'id') || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    // TanStack Query for Discussions - cached, no reload on tab switch
    const { data: discussions = [], isLoading: discussionsLoading, refetch: refetchDiscussions } = useInstructorDiscussionsQuery(myCourses);

    const toggleExpand = (id) => setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));

    const openModal = (type, mode, parentId = null, item = null) => {
        setModalType(type);
        setModalMode(mode);
        setSelectedParentId(parentId);
        setEditingItem(item);
        setModalOpen(true);

        if (item) {
            setFormData({
                title: getTrans(item.title, i18n.language) || '',
                description: getTrans(item.description, i18n.language) || '',
                mentor: item.mentor || user?.name || '',
                instructor_id: item.instructor_id || user?.id || '',
                promoted_coupon_code: item.promoted_coupon_code || '',
                url: item.content_url || item.meeting_url || item.url || '',
                meetingType: item.meeting_type || 'external',
                roomId: item.room_id || '',
                meetingCode: item.meeting_code || ((item.meeting_type === 'internal' && item.room_id && item.room_id.length <= 15) ? item.room_id : generateShortId()),
                type: item.type || 'video',
                duration: item.duration_minutes || item.duration || '',
                date: item.date || (item.start_time ? new Date(item.start_time).toLocaleDateString('en-CA') : ''),
                startTime: item.startTime || (item.start_time ? new Date(item.start_time).toTimeString().slice(0, 5) : ''),
                endTime: item.endTime || (item.end_time ? new Date(item.end_time).toTimeString().slice(0, 5) : ''),
                xpReward: item.xpReward || 50,
                xpBonus: item.xpBonus || { perfectQuiz: 20 },
                quizData: item.quizData || null,
                body: item.body || '',
                is_premium: !!item.is_premium
            });
        } else {
            setFormData({
                title: '',
                description: '',
                mentor: user?.name || '',
                instructor_id: user?.id || '',
                promoted_coupon_code: '',
                url: '',
                meetingType: 'external',
                roomId: '',
                meetingCode: '',
                type: 'video',
                duration: '',
                date: '',
                startTime: '',
                endTime: '',
                xpReward: 50,
                xpBonus: { perfectQuiz: 20 },
                quizData: null,
                body: '',
                is_premium: false
            });
        }
    };

    const handleSave = async () => {
        try {
            if (modalType === 'course') {
                if (modalMode === 'create') {
                    await courseService.createCourse(formData);
                } else {
                    await courseService.updateCourse(editingItem.id, formData);
                }
            } else if (modalType === 'module') {
                if (modalMode === 'create') {
                    await courseService.createModule(selectedParentId, formData);
                } else {
                    await courseService.updateModule(editingItem.id, formData);
                }
            } else if (modalType === 'content') {
                if (modalMode === 'create') {
                    await courseService.createContent(selectedParentId, formData);
                } else {
                    await courseService.updateContent(editingItem.id, formData);
                }
            } else if (modalType === 'session') {
                let endDate = formData.date;
                if (formData.endTime <= formData.startTime) {
                    const d = new Date(formData.date);
                    d.setDate(d.getDate() + 1);
                    endDate = d.toISOString().split('T')[0];
                }

                // Generate Internal Room ID if needed
                let finalRoomId = formData.roomId;
                let finalMeetingUrl = formData.url;

                if (formData.meetingType === 'internal') {
                    // Always update URL to match the Meeting Code
                    finalMeetingUrl = `${window.location.origin}/meeting/${formData.meetingCode}`;
                }

                const sessionPayload = {
                    title: formData.title,
                    start_time: `${formData.date} ${formData.startTime}:00`,
                    end_time: `${endDate} ${formData.endTime}:00`,
                    meeting_url: formData.meetingType === 'external' ? formData.url : finalMeetingUrl,
                    meeting_type: formData.meetingType,
                    room_id: formData.meetingType === 'internal' ? finalRoomId : null,
                    meeting_code: formData.meetingType === 'internal' ? formData.meetingCode : null,
                    description: formData.description || '',
                    instructor_id: user.id,
                    type: formData.type
                };

                if (modalMode === 'create') {
                    await courseService.createSession(selectedParentId, sessionPayload);
                } else {
                    await courseService.updateSession(editingItem.id, sessionPayload);
                }
            }

            setModalOpen(false);
            // Replaced manual SetCourses with Query Invalidation
            queryClient.invalidateQueries({ queryKey: ['courses'] });

        } catch (error) {
            console.error(error);
            alert("Error saving: " + error.message);
        }
    };

    const handleDelete = async (type, id) => {
        if (!confirm('Apakah Anda yakin ingin menghapus item ini?')) return;
        try {
            if (type === 'module') await courseService.deleteModule(id);
            else if (type === 'content') await courseService.deleteContent(id);
            else if (type === 'session') await courseService.deleteSession(id);

            // Replaced manual SetCourses with Query Invalidation
            queryClient.invalidateQueries({ queryKey: ['courses'] });
        } catch (error) {
            console.error(error);
            alert("Error deleting: " + error.message);
        }
    };

    // Discussion Actions (Reply only, no delete/resolve)
    const handleReplyDiscussion = async (discussionId, content) => {
        try {
            const discussion = discussions.find(d => d.id === discussionId);
            if (!discussion) return;

            // Use direct API to match existing pattern, or switch to courseService if consistent
            await api.post(`/courses/${discussion.course_id}/discussions/${discussionId}/replies`, {
                content
            });
            toast.success('Balasan berhasil dikirim');
            refetchDiscussions();
        } catch (error) {
            console.error('Failed to reply:', error);
            toast.error('Gagal mengirim balasan');
        }
    };

    const handleUpdateReply = async (discussionId, replyId) => {
        try {
            // Try updating with 'content' to match dashboard convention
            await courseService.updateReply(discussionId, replyId, { content: editReplyBody, body: editReplyBody });
            toast.success('Balasan berhasil diupdate');
            setEditingReplyId(null);
            setEditReplyBody('');
            refetchDiscussions();
        } catch (error) {
            console.error('Failed to update reply:', error);
            toast.error('Gagal update balasan');
        }
    };

    const handleDeleteReply = async (discussionId, replyId) => {
        if (!confirm('Hapus balasan ini?')) return;
        try {
            await courseService.deleteReply(discussionId, replyId);
            toast.success('Balasan dihapus');
            refetchDiscussions();
        } catch (error) {
            console.error('Failed to delete reply:', error);
            toast.error('Gagal menghapus balasan');
        }
    };

    const handleReplyToUser = (discussionId, userName) => {
        const ref = replyFormRefs.current[discussionId];
        if (ref) {
            ref.setReplyContent(`@${userName} `);
            ref.focus();
        }
    };

    const getContentIcon = (type) => {
        switch (type) {
            case 'video': return <Video className="w-4 h-4 text-red-500" />;
            case 'quiz': return <FileQuestion className="w-4 h-4 text-purple-500" />;
            case 'ppt': return <FileText className="w-4 h-4 text-blue-500" />;
            default: return <BookOpen className="w-4 h-4 text-gray-500" />;
        }
    };

    // Stats Query
    const { data: stats = {}, isLoading: statsLoading } = useQuery({
        queryKey: ['instructorStats'],
        queryFn: async () => {
            const res = await api.get('/instructor/stats');
            return res.data;
        }
    });

    // Graph Logic (Sparkline)
    const monthlyTrend = stats.monthly_trend || [0, 0, 0, 0, 0, 0];
    const totalEnrollments = stats.total_enrollments || 0;

    // Determine trend direction
    const lastMonth = monthlyTrend[monthlyTrend.length - 1] || 0;
    const prevMonth = monthlyTrend[monthlyTrend.length - 2] || 0;
    const isUpTrend = lastMonth >= prevMonth;
    const trendColor = isUpTrend ? '#22c55e' : '#ef4444';
    const trendChange = Math.round(lastMonth - prevMonth);

    const sparklinePath = (() => {
        if (monthlyTrend.length === 0) return "";
        const allZero = monthlyTrend.every(v => v === 0);
        if (allZero) {
            // Draw a flat line at bottom when no data
            return `M 0,36 L 100,36`;
        }

        // Map points to SVG coordinates
        // x: 2 to 98 (padding so line doesn't clip at edges)
        // y: 35 (bottom) to 8 (top) - giving padding
        const points = monthlyTrend.map((val, idx) => {
            const x = 2 + (idx / (monthlyTrend.length - 1)) * 96;
            const maxVal = Math.max(...monthlyTrend, 1);
            const minVal = Math.min(...monthlyTrend);
            const range = maxVal - minVal || 1;
            const y = 35 - ((val - minVal) / range * 22);
            return [x, y];
        });

        const controlPoint = (current, previous, next, reverse) => {
            const p = previous || current;
            const n = next || current;
            const smoothing = 0.2;
            const oX = n[0] - p[0];
            const oY = n[1] - p[1];
            const len = Math.sqrt(Math.pow(oX, 2) + Math.pow(oY, 2));
            const angle = Math.atan2(oY, oX) + (reverse ? Math.PI : 0);
            const length = len * smoothing;
            const x = current[0] + Math.cos(angle) * length;
            const y = current[1] + Math.sin(angle) * length;
            return [x, y];
        };

        const bezierCommand = (point, i, a) => {
            const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point, false);
            const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true);
            return `C ${cpsX.toFixed(2)},${cpsY.toFixed(2)} ${cpeX.toFixed(2)},${cpeY.toFixed(2)} ${point[0].toFixed(2)},${point[1].toFixed(2)}`;
        };

        return points.reduce((acc, point, i, a) => i === 0
            ? `M ${point[0].toFixed(2)},${point[1].toFixed(2)}`
            : `${acc} ${bezierCommand(point, i, a)}`
            , '');
    })();

    // Pagination Logic
    const paginatedCourses = myCourses.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    const totalPages = Math.ceil(myCourses.length / itemsPerPage);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Note: Navbar is rendered by App.jsx */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">

                {/* Header & Tabs */}
                <div className="mb-8 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{t('instructor.welcome', { name: user?.name || 'Instructor' })}</h1>
                            <p className="text-gray-500">{t('instructor.welcome_subtitle')}</p>
                        </div>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                        {[
                            { id: 'overview', label: t('instructor.overview'), icon: LayoutDashboard },
                            { id: 'curriculum', label: t('instructor.curriculum'), icon: BookOpen },
                            { id: 'discussions', label: t('instructor.discussions'), icon: MessageSquare },
                            { id: 'explore', label: t('instructor.explore_courses'), icon: Search },
                            { id: 'settings', label: t('instructor.settings'), icon: Settings },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div>
                    {/* EXPLORE TAB (Inline) */}
                    {activeTab === 'explore' && (
                        <div className="animate-in fade-in duration-300">
                            <CoursesPage />
                        </div>
                    )}

                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                {/* Active Classes */}
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
                                        <BookOpen className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-500">{t('instructor.active_classes')}</p>
                                    <h2 className="text-4xl font-bold text-gray-900 mt-2">{stats.active_classes || 0}</h2>
                                    <p className="text-xs text-gray-400 mt-4">
                                        <span className="text-indigo-600 font-bold">{stats.teaching_hours || 0} {t('instructor.teaching_hours')}</span>
                                        <span className="ml-1">Total duration</span>
                                    </p>
                                </div>

                                {/* Total Students */}
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-500">{t('instructor.total_students')}</p>
                                    <h2 className="text-4xl font-bold text-gray-900 mt-2">{stats.total_students || 0}</h2>
                                    <p className="text-xs text-blue-600 mt-4 font-medium">
                                        {t('instructor.unique_students')}
                                    </p>
                                </div>

                                {/* Total Enrollments with Graph */}
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isUpTrend ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                        <TrendingUp className={`w-6 h-6 ${!isUpTrend ? 'rotate-180' : ''}`} />
                                    </div>
                                    <p className="text-sm font-medium text-gray-500">Total Enrollments</p>
                                    <h2 className="text-4xl font-bold text-gray-900 mt-2">{totalEnrollments}</h2>
                                    <p className="text-xs text-gray-400 mt-4 flex items-center gap-2 relative z-10">
                                        <span className={`px-2 py-1 rounded-md font-bold text-[10px] ${isUpTrend ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {isUpTrend ? '+' : ''}{trendChange}
                                        </span>
                                        <span className="text-gray-400">Pendaftar Baru (bln ini)</span>
                                    </p>
                                    {/* Sparkline Chart */}
                                    <div className="absolute bottom-0 left-0 right-0 h-24 overflow-hidden pointer-events-none">
                                        <svg className="w-full h-full transform translate-y-3 opacity-90" viewBox="0 0 100 40" preserveAspectRatio="none">
                                            <path
                                                d={sparklinePath}
                                                fill="none"
                                                stroke={trendColor}
                                                strokeWidth="3"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                vectorEffect="non-scaling-stroke"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                <h3 className="font-bold text-gray-900 mb-4">{t('instructor.quick_actions')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <button
                                        onClick={() => setActiveTab('curriculum')}
                                        className="p-4 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-left transition-colors"
                                    >
                                        <BookOpen className="w-5 h-5 text-indigo-600 mb-2" />
                                        <p className="font-medium text-gray-900 text-sm">{t('instructor.manage_curriculum')}</p>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('discussions')}
                                        className="p-4 bg-purple-50 hover:bg-purple-100 rounded-xl text-left transition-colors"
                                    >
                                        <MessageSquare className="w-5 h-5 text-purple-600 mb-2" />
                                        <p className="font-medium text-gray-900 text-sm">{t('instructor.view_discussions')}</p>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('explore')}
                                        className="p-4 bg-blue-50 hover:bg-blue-100 rounded-xl text-left transition-colors"
                                    >
                                        <Search className="w-5 h-5 text-blue-600 mb-2" />
                                        <p className="font-medium text-gray-900 text-sm">{t('instructor.explore_courses')}</p>
                                    </button>
                                </div>
                            </div>

                            {/* My Courses Quick View */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-900">{t('instructor.my_bootcamps')}</h3>
                                    <button
                                        onClick={() => setActiveTab('curriculum')}
                                        className="text-sm text-indigo-600 hover:underline font-medium"
                                    >
                                        {t('instructor.view_all')}
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {paginatedCourses.map(course => (
                                        <div key={course.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="font-medium text-gray-900">{getTrans(course.title, t('language_code') || 'id')}</p>
                                                <p className="text-xs text-gray-500">{course.modules?.length || 0} Modul • {course.sessions?.length || 0} Sesi</p>
                                            </div>
                                            <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full font-medium">
                                                {course.enrollments_count || 0} Siswa
                                            </span>
                                        </div>
                                    ))}

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="flex justify-between items-center pt-2">
                                            <span className="text-xs text-gray-400">
                                                {t('instructor.page')} {page} {t('instructor.of')} {totalPages}
                                            </span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handlePageChange(page - 1)}
                                                    disabled={page === 1}
                                                    className="px-3 py-1 text-xs border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    {t('instructor.prev')}
                                                </button>
                                                <button
                                                    onClick={() => handlePageChange(page + 1)}
                                                    disabled={page === totalPages}
                                                    className="px-3 py-1 text-xs border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    {t('instructor.next')}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CURRICULUM TAB */}
                    {activeTab === 'curriculum' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Manajemen Kurikulum</h2>
                                    <p className="text-gray-500 text-sm mt-1">Kelola modul dan konten bootcamp Anda.</p>
                                </div>
                                <div className="flex gap-3 w-full md:w-auto">
                                    <div className="relative flex-1 md:w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Cari bootcamp saya..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full focus:ring-2 focus:ring-indigo-200 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Courses List */}
                            <div className="space-y-4">
                                {filteredCourses.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                                        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">{t('instructor.no_assigned_bootcamps')}</p>
                                        <p className="text-sm text-gray-400 mt-1">{t('instructor.contact_admin')}</p>
                                    </div>
                                ) : (
                                    filteredCourses.map(course => (
                                        <div key={course.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                            {/* Course Header */}
                                            <div className="p-5 bg-white border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    {/* Left: Course Info */}
                                                    <div className="flex items-start gap-4 cursor-pointer select-none flex-1 group" onClick={() => toggleExpand(`course-${course.id}`)}>
                                                        <div className={`mt-1 p-1 rounded-full transition-transform duration-200 ${expandedIds[`course-${course.id}`] ? 'rotate-90 bg-indigo-50 text-indigo-600' : 'text-gray-400 group-hover:bg-gray-100 group-hover:text-gray-600'}`}>
                                                            <ChevronRight className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h3 className="font-bold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">{getTrans(course.title, t('language_code') || 'id')}</h3>
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-600 uppercase tracking-wider border border-blue-200">
                                                                    Instructor
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                                                <div className="flex items-center gap-1.5">
                                                                    <BookOpen className="w-3.5 h-3.5" />
                                                                    <span>{course.modules?.length || 0} Modul</span>
                                                                </div>
                                                                <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <Calendar className="w-3.5 h-3.5" />
                                                                    <span>{(course.sessions?.length || 0)} Sesi</span>
                                                                </div>
                                                                <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <Users className="w-3.5 h-3.5" />
                                                                    <span>{course.enrollments_count || 0} Siswa</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Right: Action Buttons */}
                                                    <div className="flex items-center gap-2 self-end md:self-auto">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openModal('course', 'edit', null, course);
                                                            }}
                                                            className="text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5 text-gray-400" /> Edit Bootcamp
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openModal('module', 'create', course.id)
                                                            }}
                                                            className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-2 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" /> Module
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Course Body (Tabs & Content) */}
                                            {expandedIds[`course-${course.id}`] && (
                                                <div className="border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                                                    <div className="flex bg-white border-b border-gray-100 px-6 gap-8 overflow-x-auto">
                                                        {['modules', 'sessions', 'resources', 'discussions'].map(tab => {
                                                            const isActive = (expandedIds[`course-${course.id}-tab`] || 'modules') === tab;
                                                            return (
                                                                <button
                                                                    key={tab}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setExpandedIds(prev => ({ ...prev, [`course-${course.id}-tab`]: tab }));
                                                                    }}
                                                                    className={`py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 capitalize whitespace-nowrap
                                                                        ${isActive
                                                                            ? 'border-indigo-600 text-indigo-600'
                                                                            : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
                                                                        }`}
                                                                >
                                                                    {tab === 'modules' && <BookOpen className="w-4 h-4" />}
                                                                    {tab === 'sessions' && <Calendar className="w-4 h-4" />}
                                                                    {tab === 'resources' && <FileText className="w-4 h-4" />}
                                                                    {tab === 'discussions' && <MessageSquare className="w-4 h-4" />}
                                                                    {tab}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="p-4 bg-gray-50/50 min-h-[300px]">
                                                        {(expandedIds[`course-${course.id}-tab`] || 'modules') === 'modules' && (
                                                            <div className="space-y-4">
                                                                {course.modules?.map((module) => (
                                                                    <div key={module.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                                                                        <div className="p-3 bg-gray-50 flex items-center justify-between border-b border-gray-100">
                                                                            <div className="flex items-center gap-3 cursor-pointer select-none flex-1" onClick={() => toggleExpand(`module-${module.id}`)}>
                                                                                <div className={`p-1 rounded bg-indigo-100 text-indigo-600 transition-transform ${expandedIds[`module-${module.id}`] ? 'rotate-90' : ''}`}>
                                                                                    <ChevronRight className="w-4 h-4" />
                                                                                </div>
                                                                                <div className="font-bold text-gray-900 text-sm">{getTrans(module.title, t('language_code') || 'id')}</div>
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                <button onClick={() => openModal('content', 'create', module.id)} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-medium transition-colors mr-2">+ Item</button>
                                                                                <button onClick={() => openModal('module', 'edit', course.id, module)} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit3 className="w-4 h-4" /></button>
                                                                                <button onClick={() => handleDelete('module', module.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                                                            </div>
                                                                        </div>
                                                                        {expandedIds[`module-${module.id}`] && (
                                                                            <div className="p-2 space-y-1 bg-white">
                                                                                {module.contents?.map((content) => (
                                                                                    <div key={content.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-100">
                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className="p-1.5 rounded-lg bg-gray-100 text-gray-600">{getContentIcon(content.type)}</div>
                                                                                            <div className="text-sm text-gray-800">{getTrans(content.title, t('language_code') || 'id')}</div>
                                                                                        </div>
                                                                                        <div className="flex gap-1">
                                                                                            <button onClick={() => openModal('content', 'edit', module.id, content)} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit3 className="w-3.5 h-3.5" /></button>
                                                                                            <button onClick={() => handleDelete('content', content.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Sessions Tab */}
                                                        {expandedIds[`course-${course.id}-tab`] === 'sessions' && (
                                                            <div className="space-y-6 px-2">
                                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                                    <div>
                                                                        <h4 className="font-bold text-lg text-gray-900">Sesi Live & Webinar</h4>
                                                                        <p className="text-gray-500 text-sm mt-1">Jadwalkan pertemuan tatap muka atau webinar untuk kursus ini.</p>
                                                                    </div>
                                                                    <button onClick={() => openModal('session', 'create', course.id)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-md">
                                                                        <Plus className="w-4 h-4" />
                                                                        Tambah Sesi
                                                                    </button>
                                                                </div>

                                                                <div className="space-y-4">
                                                                    {course.sessions?.length === 0 ? (
                                                                        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                                                            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                                                            <p className="text-gray-500 font-medium">Belum ada sesi yang dijadwalkan.</p>
                                                                            <p className="text-xs text-gray-400 mt-1">Buat sesi baru untuk berinteraksi dengan siswa.</p>
                                                                        </div>
                                                                    ) : (
                                                                        course.sessions?.map(session => {
                                                                            const sessionDate = new Date(session.start_time);
                                                                            const endDate = new Date(session.end_time);
                                                                            const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
                                                                            const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

                                                                            return (
                                                                                <div key={session.id} className="bg-white p-2 rounded-2xl border border-gray-100 hover:border-indigo-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-4 group">
                                                                                    {/* Date Box */}
                                                                                    <div className="bg-gray-50/80 rounded-xl p-4 min-w-[90px] flex flex-col items-center justify-center text-center border border-gray-100 group-hover:bg-indigo-50/30 transition-colors">
                                                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{months[sessionDate.getMonth()]}</span>
                                                                                        <span className="text-3xl font-black text-gray-900 leading-none mb-1">{sessionDate.getDate()}</span>
                                                                                        <span className="text-xs font-bold text-gray-500 uppercase">{days[sessionDate.getDay()]}</span>
                                                                                    </div>

                                                                                    {/* Info */}
                                                                                    <div className="flex-1 py-1 flex flex-col justify-center">
                                                                                        <div className="flex flex-wrap items-center gap-3 mb-2">
                                                                                            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-purple-100 text-purple-600 uppercase tracking-wider">
                                                                                                {session.type || 'WORKSHOP'}
                                                                                            </span>
                                                                                            <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                                                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold font-mono">
                                                                                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                                                                <span>
                                                                                                    {sessionDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')} -
                                                                                                    {endDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>
                                                                                        <h4 className="font-bold text-gray-900 text-xl group-hover:text-indigo-600 transition-colors mb-2 leading-tight">
                                                                                            {getTrans(session.title, t('language_code') || 'id')}
                                                                                        </h4>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className="w-5 h-5 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                                                                                                <User className="w-full h-full p-1 text-gray-400" />
                                                                                            </div>
                                                                                            <span className="text-xs font-semibold text-gray-500">
                                                                                                {session.instructor?.user?.name || user?.name || 'Instructor'}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Actions */}
                                                                                    <div className="flex items-center gap-3 pr-2 self-start md:self-center w-full md:w-auto mt-4 md:mt-0 justify-end border-t md:border-t-0 border-gray-50 pt-3 md:pt-0">
                                                                                        {session.meeting_type === 'internal' && (session.meeting_code || session.room_id) ? (
                                                                                            <button
                                                                                                onClick={() => navigate(`/meeting/${session.meeting_code || session.room_id}`)}
                                                                                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-xs font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm"
                                                                                            >
                                                                                                <Video className="w-3.5 h-3.5" />
                                                                                                Start Meeting
                                                                                            </button>
                                                                                        ) : session.meeting_url ? (
                                                                                            <a
                                                                                                href={session.meeting_url}
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                                                                                            >
                                                                                                <Video className="w-3.5 h-3.5" />
                                                                                                Link Meeting
                                                                                            </a>
                                                                                        ) : (
                                                                                            <span className="text-xs text-gray-400 italic px-2">No Link</span>
                                                                                        )}
                                                                                        <div className="flex items-center gap-1 pl-1">
                                                                                            <button onClick={() => openModal('session', 'edit', course.id, session)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Session">
                                                                                                <Edit3 className="w-4 h-4" />
                                                                                            </button>
                                                                                            <button onClick={() => handleDelete('session', session.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Session">
                                                                                                <Trash2 className="w-4 h-4" />
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Resources Tab */}
                                                        {expandedIds[`course-${course.id}-tab`] === 'resources' && (
                                                            <div className="space-y-4">
                                                                <div className="flex justify-between">
                                                                    <h4 className="font-bold">Resources & Files</h4>
                                                                    <button className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded font-medium cursor-not-allowed">Global Resources (Soon)</button>
                                                                </div>
                                                                <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
                                                                    <div className="p-2 bg-white rounded-lg text-blue-600"><FileText className="w-5 h-5" /></div>
                                                                    <div>
                                                                        <h5 className="font-bold text-blue-900 text-sm">Resource Aggregation</h5>
                                                                        <p className="text-xs text-blue-700 mt-1">Berikut adalah semua file dan materi bacaan yang tersebar di modul-modul kursus ini.</p>
                                                                    </div>
                                                                </div>
                                                                {/* Aggregate resources from modules */}
                                                                {course.modules?.flatMap(m => m.contents?.filter(c => c.type === 'file' || c.type === 'article' || c.type === 'ppt')).length === 0 ? (
                                                                    <div className="text-center py-8 text-gray-400">
                                                                        <FileText className="w-8 h-8 mx-auto mb-2" />
                                                                        <p>Tidak ada resource file/artikel</p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="grid grid-cols-1 gap-2">
                                                                        {course.modules?.flatMap(m => m.contents?.filter(c => c.type === 'file' || c.type === 'article' || c.type === 'ppt').map(c => ({ ...c, moduleTitle: getTrans(m.title, i18n.language) }))).map(content => (
                                                                            <div key={content.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="p-1.5 bg-gray-100 rounded text-gray-600"><FileText className="w-4 h-4" /></div>
                                                                                    <div>
                                                                                        <div className="font-bold text-sm text-gray-900">{getTrans(content.title, i18n.language)}</div>
                                                                                        <div className="text-xs text-gray-500">di Modul: {content.moduleTitle}</div>
                                                                                    </div>
                                                                                </div>
                                                                                <button onClick={() => openModal('content', 'edit', null, content)} className="text-xs text-blue-600 hover:underline">Edit</button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}


                                                        {/* Discussions Tab (Per Course) */}
                                                        {expandedIds[`course-${course.id}-tab`] === 'discussions' && (() => {
                                                            const courseDiscussions = discussions.filter(d => d.course_id === course.id);
                                                            return (
                                                                <div className="space-y-3">
                                                                    {courseDiscussions.length === 0 ? (
                                                                        <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-lg">
                                                                            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                                            <p className="text-sm">Belum ada diskusi untuk kursus ini.</p>
                                                                        </div>
                                                                    ) : (
                                                                        courseDiscussions.map(discussion => (
                                                                            <div key={discussion.id} className="bg-white border border-gray-100 rounded-lg p-4">
                                                                                <div className="flex items-center gap-2 mb-1">
                                                                                    <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                                                                                        {discussion.user?.name?.charAt(0) || 'U'}
                                                                                    </div>
                                                                                    <span className="font-bold text-sm text-gray-900">{discussion.user?.name || 'User'}</span>
                                                                                    {discussion.is_resolved && <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold">Solved</span>}
                                                                                </div>
                                                                                <h5 className="font-medium text-sm text-gray-900 ml-9">{getTrans(discussion.title, i18n.language)}</h5>
                                                                                <p className="text-xs text-gray-500 ml-9 mt-0.5">{discussion.replies?.length || 0} balasan • {new Date(discussion.created_at).toLocaleDateString('id-ID')}</p>
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                    <button
                                                                        onClick={() => setActiveTab('discussions')}
                                                                        className="w-full px-4 py-2 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 transition"
                                                                    >
                                                                        Lihat Semua Diskusi &rarr;
                                                                    </button>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* DISCUSSIONS TAB */}
                    {activeTab === 'discussions' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Diskusi Bootcamp</h2>
                                <p className="text-gray-500 text-sm mt-1">Lihat dan balas diskusi dari siswa Anda.</p>
                            </div>

                            {discussionsLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : discussions.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">Belum ada diskusi.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {discussions.map(discussion => (
                                        <div key={discussion.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold shrink-0">
                                                    {discussion.user?.name?.charAt(0) || 'U'}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-gray-900">{discussion.user?.name || 'User'}</span>
                                                        <span className="text-xs text-gray-400">•</span>
                                                        <span className="text-xs text-gray-500">{getTrans(discussion.courseName, i18n.language)}</span>
                                                        {discussion.is_resolved && (
                                                            <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Resolved</span>
                                                        )}
                                                    </div>
                                                    <h4 className="font-medium text-gray-900 mb-2">{getTrans(discussion.title, i18n.language)}</h4>
                                                    <p className="text-sm text-gray-600">{discussion.content}</p>
                                                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                                                        <span>{new Date(discussion.created_at).toLocaleDateString('id-ID')}</span>
                                                        <span>{discussion.replies?.length || 0} balasan</span>
                                                    </div>

                                                    {/* Replies */}
                                                    {discussion.replies?.length > 0 && (
                                                        <div className="mt-2 text-sm">
                                                            {(() => {
                                                                const isExpanded = expandedDiscussionReplies[discussion.id];
                                                                const REPLY_LIMIT = 5;
                                                                const visibleReplies = isExpanded ? discussion.replies : discussion.replies.slice(0, REPLY_LIMIT);
                                                                const remainingCount = discussion.replies.length - visibleReplies.length;

                                                                return (
                                                                    <>
                                                                        {visibleReplies.map((reply, index) => {
                                                                            const replyName = reply.user_name || reply.user?.name || 'User';
                                                                            const replyAvatar = reply.user_avatar || reply.user?.avatar || reply.user?.profile_photo_url;
                                                                            const isCurrentUser = user?.id === reply.user_id;

                                                                            return (
                                                                                <div key={reply.id} className="relative pl-12 py-2 group">
                                                                                    {/* Connection Lines */}
                                                                                    <div
                                                                                        className="absolute left-5 top-0 w-0.5 bg-gray-200"
                                                                                        style={{
                                                                                            height: (index === visibleReplies.length - 1 && remainingCount === 0) ? '24px' : '100%',
                                                                                            display: 'block'
                                                                                        }}
                                                                                    />
                                                                                    <div className="absolute left-5 top-6 w-5 h-0.5 bg-gray-200 rounded-bl-full" />

                                                                                    <div className="flex items-start gap-3">
                                                                                        {replyAvatar ? (
                                                                                            <img
                                                                                                src={replyAvatar}
                                                                                                alt={replyName}
                                                                                                className="w-8 h-8 rounded-full object-cover shrink-0 shadow-sm z-10 border-2 border-white bg-gray-100"
                                                                                            />
                                                                                        ) : (
                                                                                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold shrink-0 shadow-sm z-10 border-2 border-white">
                                                                                                {replyName.charAt(0).toUpperCase()}
                                                                                            </div>
                                                                                        )}

                                                                                        <div className="flex-1 min-w-0">
                                                                                            <div className="flex items-baseline gap-2 mb-1">
                                                                                                <span className="font-semibold text-gray-900 text-sm hover:underline cursor-pointer flex items-center gap-1">
                                                                                                    {replyName}
                                                                                                    {isCurrentUser && <span className="text-gray-500 font-normal text-xs">(Anda)</span>}
                                                                                                </span>
                                                                                                <span className="text-xs text-gray-500">
                                                                                                    {new Date(reply.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                                                                </span>
                                                                                            </div>

                                                                                            {editingReplyId === reply.id ? (
                                                                                                <div className="mt-1">
                                                                                                    <textarea
                                                                                                        value={editReplyBody}
                                                                                                        onChange={(e) => setEditReplyBody(e.target.value)}
                                                                                                        className="w-full p-0 border-b-2 border-gray-300 focus:border-black outline-none bg-transparent resize-y text-sm pb-1"
                                                                                                        rows={2}
                                                                                                        autoFocus
                                                                                                        placeholder="Edit reply..."
                                                                                                    />
                                                                                                    <div className="flex justify-end gap-2 mt-2">
                                                                                                        <button
                                                                                                            onClick={() => setEditingReplyId(null)}
                                                                                                            className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                                                                                        >
                                                                                                            Batal
                                                                                                        </button>
                                                                                                        <button
                                                                                                            onClick={() => handleUpdateReply(discussion.id, reply.id)}
                                                                                                            className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
                                                                                                        >
                                                                                                            Simpan
                                                                                                        </button>
                                                                                                    </div>
                                                                                                </div>
                                                                                            ) : (
                                                                                                <div className="group/content relative">
                                                                                                    <p className="text-gray-800 leading-relaxed text-[15px]">
                                                                                                        {reply.content || reply.body}
                                                                                                    </p>
                                                                                                    <div className="flex items-center gap-4 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                                        <button
                                                                                                            onClick={() => handleReplyToUser(discussion.id, replyName)}
                                                                                                            className="text-gray-500 hover:text-indigo-600 text-xs font-bold flex items-center gap-1"
                                                                                                        >
                                                                                                            Balas
                                                                                                        </button>
                                                                                                        {isCurrentUser && (
                                                                                                            <>
                                                                                                                <button
                                                                                                                    onClick={() => { setEditingReplyId(reply.id); setEditReplyBody(reply.content || reply.body); }}
                                                                                                                    className="text-gray-500 hover:text-gray-800 text-xs font-semibold flex items-center gap-1"
                                                                                                                >
                                                                                                                    Edit
                                                                                                                </button>
                                                                                                                <button
                                                                                                                    onClick={() => handleDeleteReply(discussion.id, reply.id)}
                                                                                                                    className="text-gray-500 hover:text-red-600 text-xs font-semibold flex items-center gap-1"
                                                                                                                >
                                                                                                                    Hapus
                                                                                                                </button>
                                                                                                            </>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}

                                                                        {remainingCount > 0 && (
                                                                            <div className="relative pl-12 py-1">
                                                                                <div className="absolute left-5 top-0 w-0.5 bg-gray-200 h-6" />
                                                                                <div className="absolute left-5 top-6 w-5 h-0.5 bg-gray-200 rounded-bl-full" />
                                                                                <button
                                                                                    onClick={() => setExpandedDiscussionReplies(prev => ({ ...prev, [discussion.id]: true }))}
                                                                                    className="text-indigo-600 font-semibold text-sm hover:bg-indigo-50 px-3 py-1 rounded-full flex items-center gap-2 transition-colors ml-[-8px]"
                                                                                >
                                                                                    <span className="text-xs">⮑</span> Lihat {remainingCount} balasan lainnya
                                                                                </button>
                                                                            </div>
                                                                        )}

                                                                        {isExpanded && discussion.replies.length > REPLY_LIMIT && (
                                                                            <div className="relative pl-12 py-1">
                                                                                <button
                                                                                    onClick={() => setExpandedDiscussionReplies(prev => ({ ...prev, [discussion.id]: false }))}
                                                                                    className="text-gray-500 font-medium text-xs hover:text-gray-700 px-3 py-1 flex items-center gap-2 transition-colors ml-1"
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

                                                    {/* Reply Form - Instructors can reply */}
                                                    <div className="mt-4">
                                                        <ReplyForm
                                                            ref={el => replyFormRefs.current[discussion.id] = el}
                                                            discussionId={discussion.id}
                                                            onReply={handleReplyDiscussion}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* SETTINGS TAB */}
                    {activeTab === 'settings' && (
                        <div className="animate-in fade-in duration-300">
                            {settingsView === 'overview' && (
                                <ProfilePageComplete
                                    userData={user}
                                    isInline={true}
                                    onNavigate={(path) => {
                                        if (path === 'profile/edit') setSettingsView('edit');
                                        else if (path === 'profile/security') setSettingsView('security');
                                    }}
                                />
                            )}

                            {settingsView === 'edit' && (
                                <div>
                                    <button
                                        onClick={() => setSettingsView('overview')}
                                        className="mb-6 text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 group transition-colors"
                                    >
                                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                        Kembali ke Profile
                                    </button>
                                    <EditProfilePage
                                        userData={user}
                                        isInline={true}
                                        onNavigateBack={() => setSettingsView('overview')}
                                    />
                                </div>
                            )}

                            {settingsView === 'security' && (
                                <div>
                                    <button
                                        onClick={() => setSettingsView('overview')}
                                        className="mb-6 text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 group transition-colors"
                                    >
                                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                        Kembali ke Profile
                                    </button>
                                    <SecuritySettingsPage
                                        userData={user}
                                        isInline={true}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Modal */}
                <AdminModal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title={`${modalMode === 'create' ? 'Tambah' : 'Edit'} ${modalType}`}
                    maxWidth={['content'].includes(modalType) ? 'max-w-5xl' : 'max-w-xl'}
                >
                    {modalType === 'course' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Judul Bootcamp</label>
                                <input
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full p-2 border rounded-lg text-sm"
                                    placeholder="e.g. Advanced Laravel"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Deskripsi</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full p-2 border rounded-lg text-sm"
                                    rows="3"
                                />
                            </div>
                            {formData.is_premium && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Kode Kupon Khusus (Opsional)</label>
                                    <select
                                        value={formData.promoted_coupon_code || ''}
                                        onChange={e => setFormData({ ...formData, promoted_coupon_code: e.target.value })}
                                        className="w-full p-2 border rounded-lg text-sm font-bold tracking-wider bg-white"
                                    >
                                        <option value="">-- Tidak Ada --</option>
                                        {coupons.map(c => (
                                            <option key={c.id} value={c.code}>
                                                {c.code} ({c.type === 'percent' ? c.value + '%' : 'Rp ' + c.value.toLocaleString('id-ID')})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-gray-400 mt-1">Kode kupon QR eksklusif untuk kursus ini. (Hanya aktif jika Admin telah mengatur kursus ini sebagai Premium).</p>
                                </div>
                            )}
                            <div className="bg-blue-50 p-3 rounded text-xs text-blue-700">
                                <strong>Note:</strong> You will be automatically assigned as the instructor for this course.
                            </div>
                            <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-2 rounded font-bold">Simpan</button>
                        </div>
                    )}

                    {modalType === 'module' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Judul Modul</label>
                                <input
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full p-2 border rounded-lg text-sm"
                                />
                            </div>
                            <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-2 rounded font-bold">Simpan</button>
                        </div>
                    )}

                    {modalType === 'content' && (
                        <ContentWizardForm
                            initialData={formData}
                            type={modalType}
                            onSave={(data) => setFormData(prev => ({ ...prev, ...data }))}
                            onCancel={() => setModalOpen(false)}
                            customSaveHandler={async (data) => {
                                const dataToSave = { ...formData, ...data };
                                if (modalMode === 'create') {
                                    await courseService.createContent(selectedParentId, dataToSave);
                                } else {
                                    await courseService.updateContent(editingItem.id, dataToSave);
                                }
                                setModalOpen(false);
                                // Replaced manual SetCourses with Query Invalidation
                                queryClient.invalidateQueries({ queryKey: ['courses'] });
                            }}
                        />
                    )}

                    {modalType === 'session' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Judul Sesi</label>
                                <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Weekly Q&A" className="w-full border p-2 rounded-lg text-sm" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Tanggal</label>
                                    <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full border p-2 rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Mulai</label>
                                    <input type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} className="w-full border p-2 rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Selesai</label>
                                    <input type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} className="w-full border p-2 rounded-lg text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Tipe</label>
                                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full border p-2 rounded-lg text-sm">
                                    <option value="Live">Live</option>
                                    <option value="Webinar">Webinar</option>
                                    <option value="Workshop">Workshop</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2">Tipe Meeting</label>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${formData.meetingType === 'external' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <input
                                            type="radio"
                                            name="meetingType"
                                            value="external"
                                            checked={formData.meetingType === 'external'}
                                            onChange={() => setFormData({ ...formData, meetingType: 'external' })}
                                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div>
                                            <div className="text-sm font-bold text-gray-700">Link Eksternal</div>
                                            <div className="text-[10px] text-gray-500">Zoom, GMeet, dll</div>
                                        </div>
                                    </label>
                                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${formData.meetingType === 'internal' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <input
                                            type="radio"
                                            name="meetingType"
                                            value="internal"
                                            checked={formData.meetingType === 'internal'}
                                            onChange={() => {
                                                let newCode = formData.meetingCode;
                                                // Auto-generate if empty
                                                if (!newCode) {
                                                    newCode = generateShortId();
                                                }
                                                setFormData({ ...formData, meetingType: 'internal', meetingCode: newCode });
                                            }}
                                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div>
                                            <div className="text-sm font-bold text-gray-700">Room Internal</div>
                                            <div className="text-[10px] text-gray-500">Generate Otomatis</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Meeting URL Input or Room Info */}
                            {formData.meetingType === 'external' ? (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Meeting Link (External)</label>
                                    <div className="relative">
                                        <Video className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="url"
                                            value={formData.url}
                                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                            className="w-full pl-10 p-2 border rounded-lg text-sm"
                                            placeholder="https://meet.google.com/..."
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg animate-in fade-in slide-in-from-top-2">
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                            <Video className="w-4 h-4 text-indigo-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h5 className="font-bold text-sm text-indigo-900">Virtual Meeting Room</h5>
                                            <p className="text-xs text-indigo-700 mt-1">
                                                Link meeting akan digenerate otomatis oleh sistem setelah Anda menyimpan sesi ini.
                                            </p>

                                            {/* Show current Code */}
                                            {(formData.meetingCode) && (
                                                <div className="mt-3 pt-2 border-t border-indigo-200 flex items-center justify-between">
                                                    <div>
                                                        <span className="text-[10px] uppercase font-bold text-indigo-500 block">Meeting Code</span>
                                                        <span className="font-mono text-sm font-bold text-indigo-900">
                                                            {formData.meetingCode}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, meetingCode: generateShortId() });
                                                        }}
                                                        className="px-2 py-1 bg-white border border-indigo-200 shadow-sm rounded text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                    >
                                                        Ubah Kode
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold">Simpan Sesi</button>
                        </div>
                    )}
                </AdminModal>
            </div>
        </div >
    );
};

// Simple Reply Form Component
const ReplyForm = forwardRef(({ discussionId, onReply }, ref) => {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef(null);

    useImperativeHandle(ref, () => ({
        setReplyContent: (text) => setContent(prev => text + prev), // Append or Prepend? usually replace if pre-filling user
        focus: () => inputRef.current?.focus()
    }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;

        setIsSubmitting(true);
        await onReply(discussionId, content);
        setContent('');
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2">
            <input
                ref={inputRef}
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tulis balasan..."
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
            <button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                id={`reply-btn-${discussionId}`}
            >
                {isSubmitting ? '...' : 'Balas'}
            </button>
        </form>
    );
});
