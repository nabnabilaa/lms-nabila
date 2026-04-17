// Full CRUD Curriculum Manager Component
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, ChevronRight, ChevronDown, GraduationCap, Plus, Edit3, Trash2,
    Video, FileText, FileQuestion, BookOpen, Calendar, X, Save, MessageSquare,
    Clock, User, Eye
} from 'lucide-react';
import { useTranslation } from 'react-i18next'; // Import
import { getTrans } from '../../lib/transHelper';
import { AdminModal } from './ui/AdminModal';
import { ContentWizardForm } from './forms/ContentWizardForm';
import { courseService } from '../../services/courseService';
import ConfirmModal from '../ui/ConfirmModal'; // NEW
import api from '../../services/api';
import { useUser } from '../../contexts/UserContext';

const generateShortId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 9; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${result.slice(0, 3)}-${result.slice(3, 6)}-${result.slice(6, 9)}`;
};

export const CurriculumManager = ({ courses = [], users = [], onCertificateConfig, onRefresh }) => {
    const { t, i18n } = useTranslation(); // Init
    const navigate = useNavigate();
    const { user } = useUser();
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedIds, setExpandedIds] = useState({});
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [modalType, setModalType] = useState('course');
    const [selectedParentId, setSelectedParentId] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [instructors, setInstructors] = useState([]); // NEW: Instructors List
    const [coupons, setCoupons] = useState([]);

    useEffect(() => {
        // Fetch instructors and coupons
        Promise.all([
            api.get('/instructors'),
            api.get('/coupons')
        ]).then(([instRes, coupRes]) => {
            setInstructors(instRes.data || instRes);
            setCoupons(coupRes.data.filter(c => c.is_qr_coupon && c.is_active));
        }).catch(err => console.error("Failed to fetch form data", err));
    }, []);

    // Discussion viewer modal
    const [discussionViewerOpen, setDiscussionViewerOpen] = useState(false);
    const [selectedDiscussion, setSelectedDiscussion] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [replyingTo, setReplyingTo] = useState(null); // NEW: Track which reply is being answered

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        actionType: null,
        id: null,
        parentId: null,
        message: '',
        title: '',
        variant: 'danger',
        confirmLabel: t('modal.yes_delete'),
        cancelLabel: t('common.cancel')
    });

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        url: '',
        type: 'video',
        meetingType: 'external',
        duration: '',
        date: '',
        startTime: '',
        endTime: '',
        fileSize: '',
        xpReward: 50,              // NEW: Base XP for completing
        xpBonus: { perfectQuiz: 20 },
        instructor_id: '',
        quizData: null,
        body: '',
        is_premium: false,
        price: 0,
        promoted_coupon_code: ''
    });



    // Check for quiz data returned from quiz builder
    useEffect(() => {
        const quizResult = sessionStorage.getItem('quizBuilderResult');
        if (quizResult) {
            const quizData = JSON.parse(quizResult);
            setFormData(prev => ({ ...prev, quizData }));
            sessionStorage.removeItem('quizBuilderResult');
        }
    }, []);

    const toggleExpand = (id) => setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));

    const openModal = (type, mode, parentId = null, item = null) => {
        setModalType(type);
        setModalMode(mode);
        setSelectedParentId(parentId);
        setEditingItem(item);
        setModalOpen(true);

        if (item) {
            let parsedQuizData = null;
            if (item.type === 'quiz' && item.body) {
                try {
                    parsedQuizData = typeof item.body === 'string' ? JSON.parse(item.body) : item.body;
                } catch (e) {
                    console.error("Failed to parse quiz body", e);
                }
            }

            setFormData({
                title: getTrans(item.title, i18n.language) || '',
                description: getTrans(item.description, i18n.language) || '',
                // Ensure instructor_id handles both object ID and direct ID, and falls back safely
                // Convert to String for proper select comparison
                instructor_id: String(item.instructor_id || ''),
                url: item.meeting_url ? item.meeting_url : (item.url || item.meetingLink || item.filePath || item.content_url || ''), // Prioritize meeting_url
                meetingType: item.meeting_type || 'external',
                type: item.type || 'video',
                duration: item.duration || item.duration_minutes || '',
                date: item.date || (item.start_time ? new Date(item.start_time).toLocaleDateString('en-CA') : ''),
                startTime: item.startTime || (item.start_time ? new Date(item.start_time).toTimeString().slice(0, 5) : ''),
                endTime: item.endTime || (item.end_time ? new Date(item.end_time).toTimeString().slice(0, 5) : ''),
                fileSize: item.fileSize || '',
                xpReward: item.xpReward || 50,
                xpBonus: item.xpBonus || { perfectQuiz: 20 },
                quizData: parsedQuizData || item.quizData || null,
                body: item.body || '',
                is_premium: item.is_premium || false,
                price: item.price || 0,
                promoted_coupon_code: item.promoted_coupon_code || '',
                roomId: item.room_id || '',
                meetingCode: item.meeting_code || ((item.meeting_type === 'internal' && item.room_id && item.room_id.length <= 15) ? item.room_id : generateShortId())
            });
        } else {
            setFormData({ title: '', description: '', url: '', meetingType: 'external', type: 'video', duration: '', date: '', startTime: '', endTime: '', fileSize: '', xpReward: 50, xpBonus: { perfectQuiz: 20 }, instructor_id: '', quizData: null, body: '', is_premium: false, price: 0, promoted_coupon_code: '', roomId: '', meetingCode: '' });
        }
    };

    const refreshData = async () => {
        // Rely on parent invalidation via onRefresh
        if (onRefresh) onRefresh();
    };

    // Show confirmation modal before saving
    const handleSaveClick = () => {
        const actionLabel = modalMode === 'create' ? t('curriculum.action_add') : t('curriculum.action_update');
        const typeLabel = modalType === 'course' ? 'Bootcamp' :
            modalType === 'module' ? t('curriculum.module') :
                modalType === 'content' ? t('curriculum.content') :
                    modalType === 'session' ? t('curriculum.session') :
                        modalType === 'resource' ? 'Resource' : 'Item';

        setConfirmModal({
            isOpen: true,
            actionType: 'save', // Special action type for save
            id: null,
            parentId: null,
            message: `${modalMode === 'create' ? t('curriculum.confirm_add') : t('curriculum.confirm_save')} ${typeLabel}?`,
            title: `${actionLabel} ${typeLabel}`,
            variant: modalMode === 'create' ? 'info' : 'confirm',
            confirmLabel: modalMode === 'create' ? t('curriculum.yes_add') : t('curriculum.yes_save'),
            cancelLabel: t('common.cancel')
        });
    };

    // Actually perform the save after confirmation
    const handleConfirmSave = async () => {
        // Close confirm modal first
        setConfirmModal(prev => ({ ...prev, isOpen: false }));

        try {
            if (modalType === 'course') {
                if (modalMode === 'create') {
                    await import('../../services/courseService').then(m => m.courseService.createCourse(formData));
                } else {
                    await import('../../services/courseService').then(m => m.courseService.updateCourse(editingItem.id, formData));
                }
            } else if (modalType === 'module') {
                if (modalMode === 'create') {
                    await import('../../services/courseService').then(m => m.courseService.createModule(selectedParentId, formData));
                } else {
                    await import('../../services/courseService').then(m => m.courseService.updateModule(editingItem.id, formData));
                }
            } else if (modalType === 'content') {
                if (modalMode === 'create') {
                    const module = courses.find(c => c.modules.some(m => m.id === selectedParentId))
                        .modules.find(m => m.id === selectedParentId);
                    await import('../../services/courseService').then(m => m.courseService.createContent(module.id, formData));
                } else {
                    await import('../../services/courseService').then(m => m.courseService.updateContent(editingItem.id, formData));
                }
            } else if (modalType === 'session') {
                // Combine Date + Time for Backend
                // Calculate End Date (Handle Overnight Sessions)
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
                    instructor_id: formData.instructor_id || null, // Ensure null if empty
                    type: formData.type // Include type manually
                };

                if (modalMode === 'create') {
                    await import('../../services/courseService').then(m => m.courseService.createSession(selectedParentId, sessionPayload));
                } else {
                    await import('../../services/courseService').then(m => m.courseService.updateSession(editingItem.id, sessionPayload));
                }
            } else if (modalType === 'resource') {
                if (modalMode === 'create') {
                    await import('../../services/courseService').then(m => m.courseService.createResource(selectedParentId, formData));
                } else {
                    await import('../../services/courseService').then(m => m.courseService.updateResource(editingItem.id, formData));
                }
            }

            setModalOpen(false);
            await refreshData();
            // Optional: Show success toast
        } catch (error) {
            console.error(error);
            setConfirmModal({
                isOpen: true,
                title: t('curriculum.save_failed'),
                message: `Error saving: ${error.response?.data?.message || error.message}`,
                variant: 'danger',
                confirmLabel: t('common.close'),
                actionType: null // No action, just info
            });
        }
    };

    const handleDeleteClick = (type, id, parentId = null) => {
        let msg = t('curriculum.confirm_delete_item');
        let title = t('curriculum.confirm_delete_title');
        if (type === 'course') {
            msg = t('curriculum.confirm_delete_bootcamp');
            title = t('curriculum.delete_bootcamp');
        } else if (type === 'module') {
            msg = t('curriculum.confirm_delete_module');
            title = t('curriculum.delete_module');
        } else if (type === 'content') {
            title = t('curriculum.delete_content');
        } else if (type === 'session') {
            title = t('curriculum.delete_session');
        } else if (type === 'resource') {
            title = t('curriculum.delete_resource');
        }

        setConfirmModal({
            isOpen: true,
            actionType: type,
            id,
            parentId,
            message: msg,
            title: title,
            variant: 'warning',
            confirmLabel: t('modal.yes_delete'),
            cancelLabel: t('common.cancel')
        });
    };

    const handleConfirmDelete = async () => {
        if (!confirmModal.id) return;

        const { actionType: type, id, parentId } = confirmModal;

        try {
            const { courseService } = await import('../../services/courseService');

            if (type === 'course') {
                await courseService.deleteCourse(id);
            } else if (type === 'module') {
                await courseService.deleteModule(id);
            } else if (type === 'content') {
                await courseService.deleteContent(id);
            } else if (type === 'session') {
                await courseService.deleteSession(id);
            } else if (type === 'resource') {
                await courseService.deleteResource(id);
            }

            // Close modal on success
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            await refreshData();
        } catch (error) {
            console.error(error);
            setConfirmModal({
                isOpen: true,
                title: t('curriculum.delete_failed'),
                message: `Error: ${error.response?.data?.message || error.message}`,
                variant: 'danger',
                confirmLabel: t('common.close'),
                actionType: null
            });
        }
    };

    const filteredCourses = (courses || []).filter(course =>
        (getTrans(course.title, i18n.language) || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.instructor?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getContentIcon = (type) => {
        switch (type) {
            case 'video': return <Video className="w-4 h-4 text-red-500" />;
            case 'quiz': return <FileQuestion className="w-4 h-4 text-purple-500" />;
            case 'ppt': return <FileText className="w-4 h-4 text-blue-500" />;
            default: return <BookOpen className="w-4 h-4 text-gray-500" />;
        }
    };

    return (
        <div className="space-y-6 pb-24">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('curriculum.title')}</h2>
                    <p className="text-gray-500 text-sm mt-1">{t('curriculum.subtitle')}</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder={t('curriculum.search_placeholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full focus:ring-2 focus:ring-indigo-200 outline-none"
                        />
                    </div>
                    <button
                        onClick={() => openModal('course', 'create')}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 shrink-0"
                    >
                        <Plus className="w-4 h-4" /> {t('curriculum.new_bootcamp')}
                    </button>
                </div>
            </div>

            {/* Courses List */}
            <div className="space-y-4">
                {filteredCourses.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                        <p className="text-gray-500">{t('curriculum.no_bootcamp_found')}</p>
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
                                                <h3 className="font-bold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">
                                                    {getTrans(course.title, i18n.language)}
                                                </h3>
                                                {course.level && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 uppercase tracking-wider border border-gray-200">
                                                        {course.level.name || 'Level'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                                <div className="flex items-center gap-1.5">
                                                    <BookOpen className="w-3.5 h-3.5" />
                                                    <span>{course.modules?.length || 0} {t('curriculum.module')}</span>
                                                </div>
                                                <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    <span>{(course.sessions?.length || 0)} {t('curriculum.session')}</span>
                                                </div>
                                                <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5" />
                                                    <span>{course.instructor?.name || 'No instructor'}</span>
                                                </div>
                                                <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                                <div className="flex items-center gap-1.5">
                                                    <GraduationCap className="w-3.5 h-3.5" />
                                                    <span>{course.enrollments_count || 0} {t('curriculum.students')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Action Buttons */}
                                    <div className="flex items-center gap-2 self-end md:self-auto">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/admin/courses/${course.id}/preview`, { state: { from: 'admin-curriculum' } });
                                            }}
                                            className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> Preview
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onCertificateConfig) {
                                                    onCertificateConfig(course.id);
                                                }
                                            }}
                                            className="text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-2 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
                                        >
                                            <BookOpen className="w-3.5 h-3.5" /> {t('curriculum.manage_certificate')}
                                        </button>
                                        <button
                                            onClick={() => openModal('module', 'create', course.id)}
                                            className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-2 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Module
                                        </button>
                                        <div className="h-6 w-px bg-gray-200 mx-1"></div>
                                        <button
                                            onClick={() => openModal('course', 'edit', null, course)}
                                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                            title="Edit Course"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick('course', course.id)}
                                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                            title="Delete Course"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Course Body (Tabs & Content) */}
                            {
                                expandedIds[`course-${course.id}`] && (
                                    <div className="border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                                        {/* Tabs Navigation */}
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
                                                        <span className={`ml-1 text-[10px] py-0.5 px-1.5 rounded-full ${isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'
                                                            }`}>
                                                            {course[tab] ? course[tab].length : (tab === 'modules' ? (course.modules?.length || 0) : 0)}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Tab Content Area */}
                                        <div className="p-4 bg-gray-50/50 min-h-[300px]">
                                            {(expandedIds[`course-${course.id}-tab`] || 'modules') === 'modules' && (
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <h4 className="font-bold text-gray-800 text-sm">Curriculum Modules</h4>
                                                        <button
                                                            onClick={() => openModal('module', 'create', course.id)}
                                                            className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded shadow-sm flex items-center gap-1"
                                                        >
                                                            <Plus className="w-3 h-3" /> New Module
                                                        </button>
                                                    </div>

                                                    {course.modules?.map((module) => (
                                                        <div key={module.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden group">
                                                            <div className="p-3 bg-gray-50 flex items-center justify-between border-b border-gray-100">
                                                                <div className="flex items-center gap-3 cursor-pointer select-none flex-1" onClick={() => toggleExpand(`module-${module.id}`)}>
                                                                    <div className={`p-1 rounded bg-indigo-100 text-indigo-600 transition-transform ${expandedIds[`module-${module.id}`] ? 'rotate-90' : ''}`}>
                                                                        <ChevronRight className="w-4 h-4" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-gray-900 text-sm">{getTrans(module.title, i18n.language)}</div>
                                                                        <div className="text-xs text-gray-500">{module.contents?.length || 0} items</div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => openModal('content', 'create', module.id)}
                                                                        className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-medium transition-colors mr-2 flex items-center gap-1"
                                                                    >
                                                                        <Plus className="w-3 h-3" /> Item
                                                                    </button>
                                                                    <button
                                                                        onClick={() => openModal('module', 'edit', course.id, module)}
                                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                                        title="Edit Module"
                                                                    >
                                                                        <Edit3 className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteClick('module', module.id, course.id)}
                                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                        title="Delete Module"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Module Contents */}
                                                            {expandedIds[`module-${module.id}`] && (
                                                                <div className="p-2 space-y-1 bg-white">
                                                                    {module.contents?.length > 0 ? (
                                                                        module.contents.map((content) => (
                                                                            <div key={content.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-100 group/item transition-colors">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="p-1.5 rounded-lg bg-gray-100 text-gray-600">
                                                                                        {getContentIcon(content.type)}
                                                                                    </div>
                                                                                    <div>
                                                                                        <div className="font-medium text-sm text-gray-800">{getTrans(content.title, i18n.language)}</div>
                                                                                        <div className="text-xs text-gray-500 capitalize">{content.type} • {content.duration_minutes || 0} min</div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex gap-1">
                                                                                    <button
                                                                                        onClick={() => openModal('content', 'edit', module.id, content)}
                                                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                                                        title="Edit Content"
                                                                                    >
                                                                                        <Edit3 className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleDeleteClick('content', content.id, module.id)}
                                                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                                        title="Delete Content"
                                                                                    >
                                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-lg">
                                                                            <p className="text-xs text-gray-400 mb-2">Module is empty</p>
                                                                            <button onClick={() => openModal('content', 'create', module.id)} className="text-xs text-indigo-600 font-medium hover:underline">+ Add Content</button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}

                                                    {(!course.modules || course.modules.length === 0) && (
                                                        <div className="text-center py-10 bg-white border border-dashed border-gray-300 rounded-lg">
                                                            <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                            <p className="text-sm text-gray-500 mb-3">No modules in this course yet.</p>
                                                            <button onClick={() => openModal('module', 'create', course.id)} className="text-sm text-white bg-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-sm">+ Create First Module</button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {expandedIds[`course-${course.id}-tab`] === 'sessions' && (
                                                <div className="space-y-6">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 text-base">{t('curriculum.live_sessions')}</h4>
                                                            <p className="text-gray-500 text-xs mt-0.5">{t('curriculum.live_sessions_desc')}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => openModal('session', 'create', course.id)}
                                                            className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 px-4 py-2 rounded-lg shadow-sm transition-all flex items-center gap-2"
                                                        >
                                                            <Plus className="w-4 h-4" /> {t('curriculum.add_session')}
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-4">
                                                        {(course.sessions || []).map(session => (
                                                            <div key={session.id} className="group bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all flex flex-col md:flex-row gap-6 items-start md:items-center">

                                                                {/* Date Box */}
                                                                <div className="hidden md:flex flex-col items-center justify-center bg-gray-50 rounded-xl w-24 p-2 shrink-0 border border-gray-100 group-hover:bg-indigo-50/50 group-hover:border-indigo-100 transition-colors h-24">
                                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                                                                        {session.start_time ? new Date(session.start_time).toLocaleDateString('id-ID', { month: 'short' }) : 'DATE'}
                                                                    </span>
                                                                    <span className="text-3xl font-black text-gray-800 leading-none mb-1">
                                                                        {session.start_time ? new Date(session.start_time).getDate() : '--'}
                                                                    </span>
                                                                    <span className="text-[10px] font-medium text-gray-500">
                                                                        {session.start_time ? new Date(session.start_time).toLocaleDateString('id-ID', { weekday: 'short' }) : '-'}
                                                                    </span>
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${session.type === 'Live' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                                            session.type === 'Workshop' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                                                                                'bg-blue-50 text-blue-600 border border-blue-100'
                                                                            }`}>
                                                                            {session.type || 'LIVE'}
                                                                        </span>
                                                                        <span className="text-gray-400 text-xs">•</span>
                                                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                                                            <Clock className="w-3.5 h-3.5" />
                                                                            {/* Handle time formatting from start_time/end_time or fallbacks */}
                                                                            {(session.start_time ? new Date(session.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : (session.startTime || '--:--'))}
                                                                            {' - '}
                                                                            {(session.end_time ? new Date(session.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : (session.endTime || '--:--'))}
                                                                        </div>
                                                                    </div>

                                                                    <h5 className="font-bold text-gray-900 text-lg leading-tight mb-2 group-hover:text-indigo-600 transition-colors">
                                                                        {getTrans(session.title, i18n.language)}
                                                                    </h5>

                                                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 text-[10px]">
                                                                                <User className="w-3.5 h-3.5" />
                                                                            </div>
                                                                            <span className="text-xs font-medium truncate max-w-[200px]">
                                                                                {session.instructor?.user?.name || (session.description?.includes('Instructor:') ? session.description.split('Instructor:')[1].trim() : session.mentor || 'Tim Pengajar')}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex flex-row md:flex-col items-center md:items-end gap-2 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-gray-100">
                                                                    {session.meeting_type === 'internal' && session.room_id ? (
                                                                        <button
                                                                            onClick={() => navigate(`/meeting/${session.meeting_code || session.room_id}`)}
                                                                            className="flex-1 md:flex-none text-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                                                                        >
                                                                            <Video className="w-3.5 h-3.5" /> Join Meeting
                                                                        </button>
                                                                    ) : session.meeting_url ? (
                                                                        <a
                                                                            href={session.meeting_url}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="flex-1 md:flex-none text-center bg-white border border-gray-200 hover:border-blue-300 hover:text-blue-600 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                                                                        >
                                                                            <Video className="w-3.5 h-3.5" /> Link Meeting
                                                                        </a>
                                                                    ) : (
                                                                        <span className="flex-1 md:flex-none text-center px-4 py-2 text-xs font-medium text-gray-400 bg-gray-50 rounded-lg border border-gray-100 select-none">
                                                                            No Link
                                                                        </span>
                                                                    )}

                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => openModal('session', 'edit', course.id, session)}
                                                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                                            title="Edit Session"
                                                                        >
                                                                            <Edit3 className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteClick('session', session.id, course.id)}
                                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                            title="Delete Session"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {(!course.sessions || course.sessions.length === 0) && (
                                                        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                                                            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                                                                <Calendar className="w-6 h-6 text-gray-300" />
                                                            </div>
                                                            <p className="text-sm font-medium text-gray-900">{t('curriculum.no_sessions')}</p>
                                                            <p className="text-xs text-gray-500 mt-1">{t('curriculum.no_sessions_hint')}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {expandedIds[`course-${course.id}-tab`] === 'resources' && (
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <h4 className="font-bold text-gray-800 text-sm">Downloadable Resources</h4>
                                                        <button
                                                            onClick={() => openModal('resource', 'create', course.id)}
                                                            className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded shadow-sm flex items-center gap-1"
                                                        >
                                                            <Plus className="w-3 h-3" /> Add Resource
                                                        </button>
                                                    </div>
                                                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                                        <table className="w-full text-sm text-left">
                                                            <thead className="bg-gray-50 text-gray-500 font-medium">
                                                                <tr>
                                                                    <th className="px-4 py-2">Resource Name</th>
                                                                    <th className="px-4 py-2">Type</th>
                                                                    <th className="px-4 py-2">Size</th>
                                                                    <th className="px-4 py-2 text-right">Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {(course.resources || []).map(resource => (
                                                                    <tr key={resource.id} className="hover:bg-blue-50/50 transition-colors">
                                                                        <td className="px-4 py-3 font-medium text-gray-900">{getTrans(resource.title, i18n.language)}</td>
                                                                        <td className="px-4 py-3"><span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{resource.type}</span></td>
                                                                        <td className="px-4 py-3 text-gray-500 text-xs">{resource.fileSize || 'N/A'}</td>
                                                                        <td className="px-4 py-3 text-right">
                                                                            <div className="flex items-center justify-end gap-1">
                                                                                <button
                                                                                    onClick={() => openModal('resource', 'edit', course.id, resource)}
                                                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                                                    title="Edit Resource"
                                                                                >
                                                                                    <Edit3 className="w-3.5 h-3.5" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteClick('resource', resource.id, course.id)}
                                                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                                    title="Delete Resource"
                                                                                >
                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                                {(!course.resources || course.resources.length === 0) && (
                                                                    <tr>
                                                                        <td colSpan="4" className="text-center py-8 text-gray-400 italic">No resources available.</td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                            {expandedIds[`course-${course.id}-tab`] === 'discussions' && (
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <h4 className="font-bold text-gray-800 text-sm">Discussion Moderation</h4>
                                                        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                                                            {(course.discussions || []).filter(d => !d.is_resolved).length} Unsolved
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {(course.discussions || []).map(discussion => (
                                                            <div key={discussion.id} className={`bg-white p-3 rounded-lg border flex items-center justify-between shadow-sm ${discussion.is_resolved ? 'border-l-4 border-l-green-500 border-gray-200' : 'border-l-4 border-l-orange-500 border-gray-200'}`}>
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${discussion.is_resolved ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                                            {discussion.is_resolved ? 'SOLVED' : 'OPEN'}
                                                                        </span>
                                                                        <div className="font-bold text-sm text-gray-900 line-clamp-1">{discussion.title}</div>
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 mt-1 pl-1">
                                                                        {discussion.replies?.length || 0} replies • {discussion.likes || 0} likes • Asked on {discussion.created_at ? new Date(discussion.created_at).toLocaleDateString() : 'N/A'}
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            const updated = globalState.courses.map(c =>
                                                                                c.id === course.id ? { ...c, discussions: c.discussions.map(d => d.id === discussion.id ? { ...d, is_resolved: !d.is_resolved } : d) } : c
                                                                            );
                                                                            setGlobalState({ ...globalState, courses: updated });
                                                                        }}
                                                                        className="text-xs font-medium text-blue-600 hover:underline px-2"
                                                                    >
                                                                        {discussion.is_resolved ? 'Re-open' : 'Mark Solved'}
                                                                    </button>
                                                                    <button onClick={() => { setSelectedDiscussion(discussion); setDiscussionViewerOpen(true); }} className="text-gray-400 hover:text-indigo-600"><MessageSquare className="w-4 h-4" /></button>
                                                                    <button onClick={() => handleDeleteClick('discussion', discussion.id, course.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {(!course.discussions || course.discussions.length === 0) && (
                                                            <div className="text-center py-10 bg-white rounded-lg border border-dashed border-gray-300">
                                                                <p className="text-sm text-gray-500">No discussions yet.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            }
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            <AdminModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={`${modalMode === 'create' ? t('curriculum.action_add') : t('curriculum.action_edit')} ${modalType === 'course' ? 'Bootcamp' :
                    modalType === 'module' ? t('curriculum.module') :
                        modalType === 'day' ? t('curriculum.day') :
                            modalType === 'session' ? t('curriculum.session') :
                                modalType === 'resource' ? 'Resource' : t('curriculum.content')
                    }`}
                maxWidth={['content', 'assignment'].includes(modalType) ? 'max-w-5xl' : 'max-w-xl'}
            >
                <div className="space-y-4">
                    {modalType === 'course' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">{t('curriculum.bootcamp_title')}</label>
                                <input
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full p-2 border rounded-lg text-sm"
                                    placeholder="e.g. Full Stack Web Development"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">{t('curriculum.mentor_label')}</label>
                                <select
                                    value={formData.instructor_id}
                                    onChange={e => {
                                        const selectedInstructor = instructors.find(i => String(i.user_id) === e.target.value);
                                        setFormData({
                                            ...formData,
                                            instructor_id: e.target.value,
                                            mentor: selectedInstructor?.user?.name || ''
                                        });
                                    }}
                                    className="w-full p-2 border rounded-lg text-sm"
                                >
                                    <option value="">-- {t('curriculum.select_instructor')} --</option>
                                    {instructors.map(inst => (
                                        <option key={inst.id} value={String(inst.user_id)}>
                                            {inst.user?.name || inst.name} ({inst.specialization || 'N/A'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">{t('curriculum.description')}</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full p-2 border rounded-lg text-sm bg-white"
                                    rows="3"
                                    placeholder={t('curriculum.description_placeholder')}
                                />
                            </div>

                            {/* PREMIUM TOGGLE */}
                            <div className="flex items-center gap-2 border p-3 rounded-lg bg-gray-50">
                                <input
                                    type="checkbox"
                                    checked={formData.is_premium}
                                    onChange={e => setFormData({ ...formData, is_premium: e.target.checked })}
                                    className="w-4 h-4 text-indigo-600 rounded"
                                    id="premiumToggle"
                                />
                                <label htmlFor="premiumToggle" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                                    {t('curriculum.premium_course')}
                                </label>
                            </div>

                            {formData.is_premium && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">{t('curriculum.price_label')}</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">Rp</span>
                                            <input
                                                type="number"
                                                value={formData.price}
                                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                                className="w-full pl-10 p-2 border rounded-lg text-sm font-bold text-gray-900"
                                                placeholder="100000"
                                                min="0"
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1">{t('curriculum.price_hint')}</p>
                                    </div>

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
                                        <p className="text-[10px] text-gray-400 mt-1">Kode kupon QR eksklusif yang akan dikaitkan dengan kursus ini.</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    {(modalType === 'module' || modalType === 'day') && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">
                                {t('curriculum.title_label')} {modalType === 'module' ? t('curriculum.module') : t('curriculum.day')}
                            </label>
                            <input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full p-2 border rounded-lg text-sm"
                                placeholder={modalType === 'module' ? 'e.g. Backend Engineering' : 'e.g. Hari 1: Introduction'}
                            />
                        </div>
                    )}


                    {/* CONTENT & ASSIGNMENT WIZARD */}
                    {(modalType === 'content' || modalType === 'assignment') && (
                        <ContentWizardForm
                            initialData={formData}
                            type={modalType}
                            onSave={(data) => {
                                setFormData(data);
                                handleSaveClick();
                            }}
                            onCancel={() => setModalOpen(false)}
                        />
                    )}

                    {/* SESSION FORM */}
                    {modalType === 'session' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold mb-1">{t('curriculum.session_title')}</label>
                                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full p-2 border rounded text-sm" placeholder="Introduction to React" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold mb-1">Instructor</label>
                                    <select
                                        value={formData.instructor_id}
                                        onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value })}
                                        className="w-full p-2 border rounded text-sm bg-white"
                                    >
                                        <option value="">{t('curriculum.select_instructor')}</option>
                                        {instructors.map(inst => (
                                            <option key={inst.id} value={inst.id}>
                                                {inst.user.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1">{t('curriculum.type')}</label>
                                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full p-2 border rounded text-sm">
                                        <option value="Live">Live</option>
                                        <option value="Recorded">Recorded</option>
                                        <option value="Workshop">Workshop</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold mb-1">{t('curriculum.date')}</label>
                                    <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1">{t('curriculum.start_time')}</label>
                                    <input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1">{t('curriculum.end_time')}</label>
                                    <input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                </div>
                            </div>
                            {/* Meeting Type Selection */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2">{t('curriculum.meeting_type')}</label>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${formData.meetingType === 'external' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <input
                                            type="radio"
                                            name="meetingType"
                                            value="external"
                                            checked={formData.meetingType === 'external'}
                                            onChange={() => setFormData({ ...formData, meetingType: 'external' })}
                                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div>
                                            <div className="text-sm font-bold text-gray-700">{t('curriculum.external_link')}</div>
                                            <div className="text-[10px] text-gray-500">Zoom, GMeet, etc.</div>
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
                                            <div className="text-sm font-bold text-gray-700">{t('curriculum.internal_room')}</div>
                                            <div className="text-[10px] text-gray-500">{t('curriculum.auto_generate')}</div>
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
                                                {t('curriculum.meeting_auto_hint')}
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
                                                        {t('curriculum.change_code')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* RESOURCE FORM */}
                    {modalType === 'resource' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold mb-1">{t('curriculum.resource_name')}</label>
                                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full p-2 border rounded text-sm" placeholder="Course Materials" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1">{t('curriculum.file_type')}</label>
                                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full p-2 border rounded text-sm">
                                    <option value="PDF">PDF</option>
                                    <option value="ZIP">ZIP</option>
                                    <option value="Video">Video</option>
                                    <option value="Link">Link</option>
                                    <option value="Image">Image</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1">{t('curriculum.upload_file')}</label>
                                <input
                                    type="file"
                                    accept={
                                        formData.type === 'PDF' ? '.pdf' :
                                            formData.type === 'ZIP' ? '.zip,.rar' :
                                                formData.type === 'Video' ? 'video/*' :
                                                    formData.type === 'Image' ? 'image/*' :
                                                        '*'
                                    }
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            // Auto-fill title if empty
                                            if (!formData.title) {
                                                setFormData({ ...formData, title: file.name.replace(/\.[^/.]+$/, '') });
                                            }
                                            // In production: Upload file to server and get URL
                                            // For now: Just store file name
                                            setFormData({
                                                ...formData,
                                                url: `/uploads/${file.name}`,
                                                fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`
                                            });
                                        }
                                    }}
                                    className="w-full p-2 border rounded text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {formData.fileSize || t('curriculum.file_upload_hint')}
                                </p>
                            </div>
                        </>
                    )}

                    {modalType !== 'content' && modalType !== 'assignment' && (
                        <div className="flex justify-end pt-4 gap-2">
                            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">
                                {t('common.cancel')}
                            </button>
                            <button onClick={handleSaveClick} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2">
                                <Save className="w-4 h-4" /> {t('common.save')}
                            </button>
                        </div>
                    )}
                </div>
            </AdminModal >

            {/* Discussion Viewer Modal */}
            < AdminModal
                isOpen={discussionViewerOpen && selectedDiscussion}
                onClose={() => { setDiscussionViewerOpen(false); setSelectedDiscussion(null); setReplyText(''); setReplyingTo(null); }}
                title={selectedDiscussion?.title || 'Discussion'}
                maxWidth="max-w-3xl"
            >
                {selectedDiscussion && (
                    <div className="flex flex-col h-full max-h-[70vh]">
                        <div className="mb-4 pb-4 border-b border-gray-100 flex items-center gap-3 text-sm text-gray-600">
                            <span>{selectedDiscussion.created_at ? new Date(selectedDiscussion.created_at).toLocaleDateString('id-ID') : 'Date N/A'}</span>
                            <span>•</span>
                            <span>{selectedDiscussion.replies?.length || 0} replies</span>
                            {selectedDiscussion.is_resolved && <><span>•</span><span className="text-green-600 font-medium">✓ Solved</span></>}
                        </div>

                        {/* Thread - Scrollable */}
                        <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2">
                            {/* OP */}
                            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-purple-500">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-bold text-sm">
                                        {selectedDiscussion.user?.name ? selectedDiscussion.user.name.charAt(0) : 'U'}
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">{selectedDiscussion.user?.name || 'Unknown User'}</div>
                                        <div className="text-xs text-gray-500">Original Post</div>
                                    </div>
                                </div>
                                <p className="text-gray-700 text-sm whitespace-pre-wrap">{selectedDiscussion.body}</p>
                            </div>

                            {/* Replies */}
                            {(selectedDiscussion.replies || []).map(reply => (
                                <div key={reply.id} className={`p-4 rounded-lg border ${reply.user_id == user?.id ? 'bg-blue-50 border-blue-100 ml-8' : 'bg-white border-gray-200'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 overflow-hidden">
                                                {reply.user_avatar ? <img src={reply.user_avatar} alt="" className="w-full h-full object-cover" /> : (reply.user_name ? reply.user_name.charAt(0) : 'U')}
                                            </div>
                                            <div>
                                                <div className="font-bold text-xs text-gray-900">
                                                    {reply.user_name || 'User'}
                                                </div>
                                                <div className="text-[10px] text-gray-400">{reply.created_at ? new Date(reply.created_at).toLocaleString() : ''}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setReplyingTo(reply);
                                                    setReplyText(`@${reply.user_name || 'User'} `);
                                                }}
                                                className="text-gray-400 hover:text-indigo-600" title="Reply to this"
                                            >
                                                <MessageSquare className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (!confirm('Hapus balasan ini?')) return;
                                                    try {
                                                        await courseService.deleteReply(selectedDiscussion.id, reply.id);
                                                        // Local Update
                                                        const updatedDiscussion = {
                                                            ...selectedDiscussion,
                                                            replies: selectedDiscussion.replies.filter(r => r.id !== reply.id)
                                                        };
                                                        setSelectedDiscussion(updatedDiscussion);
                                                        // Update Parent
                                                        const updatedCourses = globalState.courses.map(c => ({
                                                            ...c,
                                                            discussions: c.discussions?.map(d => d.id === selectedDiscussion.id ? updatedDiscussion : d)
                                                        }));
                                                        setGlobalState({ ...globalState, courses: updatedCourses });
                                                    } catch (e) { console.error(e); alert('Failed to delete reply'); }
                                                }}
                                                className="text-gray-400 hover:text-red-600" title="Delete Reply"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.body}</p>
                                </div>
                            ))}

                            {(!selectedDiscussion.replies || selectedDiscussion.replies.length === 0) && (
                                <div className="text-center py-8 text-gray-400 text-sm"><MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" /><p>No replies yet. Be the first to answer!</p></div>
                            )}
                        </div>

                        {/* Reply Form */}
                        <div className="pt-4 border-t border-gray-100 flex-shrink-0 bg-white">
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                {replyingTo ? (
                                    <div className="flex items-center justify-between text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                        <span>Replying to {replyingTo.user_name || 'User'}</span>
                                        <button onClick={() => { setReplyingTo(null); setReplyText(''); }} className="text-xs hover:underline"><X className="w-3 h-3" /></button>
                                    </div>
                                ) : 'Admin Reply'}
                            </label>
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Type your answer here..."
                                className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-200 outline-none"
                                rows="3"
                            />
                            <div className="flex items-center justify-between mt-3">
                                <button
                                    onClick={async () => {
                                        if (!replyText.trim()) return;
                                        try {
                                            const payload = {
                                                body: replyText,
                                                parent_id: replyingTo ? replyingTo.id : null,
                                                reply_to_user_name: replyingTo ? replyingTo.user_name : null
                                            };
                                            const newReply = await courseService.replyDiscussion(selectedDiscussion.id, payload);

                                            // Update Local
                                            setSelectedDiscussion(newReply);
                                            setReplyText('');
                                            setReplyingTo(null);

                                            // Update Global
                                            const updatedCourses = globalState.courses.map(c => ({
                                                ...c,
                                                discussions: c.discussions?.map(d => d.id === selectedDiscussion.id ? newReply : d)
                                            }));
                                            setGlobalState({ ...globalState, courses: updatedCourses });

                                        } catch (e) {
                                            console.error(e);
                                            alert(`Failed to post reply: ${e.message}`);
                                        }
                                    }}
                                    disabled={!replyText.trim()}
                                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <MessageSquare className="w-4 h-4" /> Post Reply
                                </button>
                                <button onClick={() => { setDiscussionViewerOpen(false); setSelectedDiscussion(null); setReplyText(''); setReplyingTo(null); }} className="text-gray-600 hover:text-gray-800 px-4 py-2 text-sm">Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </AdminModal >

            {/* Confirm Modal for Delete, Save, and Error Messages */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={
                    confirmModal.actionType === 'save'
                        ? handleConfirmSave
                        : confirmModal.actionType
                            ? handleConfirmDelete
                            : () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                }
                message={confirmModal.message}
                title={confirmModal.title || t('curriculum.confirm_title')}
                variant={confirmModal.variant || 'danger'}
                confirmLabel={confirmModal.confirmLabel || t('modal.yes_delete')}
                cancelLabel={confirmModal.cancelLabel || t('common.cancel')}
            />
        </div >
    );
};
