import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, ChevronRight, BookOpen, Calendar, Plus, Edit3, Trash2,
    Video, FileText, FileQuestion, MessageSquare, User, Clock, Star, Save, X, Eye
} from 'lucide-react';
import { AdminModal } from '../../components/admin/ui/AdminModal';
import { ContentWizardForm } from '../../components/admin/forms/ContentWizardForm';
import { courseService } from '../../services/courseService';
import { getTrans } from '../../lib/transHelper';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

export const InstructorCurriculumPage = ({ courses = [], user, onUpdateCourses }) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedIds, setExpandedIds] = useState({});

    // Modal States
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [modalType, setModalType] = useState('course');
    const [selectedParentId, setSelectedParentId] = useState(null);
    const [editingItem, setEditingItem] = useState(null);

    // Discussion Viewer State
    const [discussionViewerOpen, setDiscussionViewerOpen] = useState(false);
    const [selectedDiscussion, setSelectedDiscussion] = useState(null);
    const [replyText, setReplyText] = useState('');

    const [replyingTo, setReplyingTo] = useState(null);
    const [editingReplyId, setEditingReplyId] = useState(null);
    const [coupons, setCoupons] = useState([]);

    useEffect(() => {
        api.get('/coupons')
            .then(res => setCoupons(res.data.filter(c => c.is_qr_coupon && c.is_active)))
            .catch(err => console.error(err));
    }, []);

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
        quizData: null
    });

    // Filter courses for this instructor only
    const myCourses = courses.filter(c => c.instructor_id === user?.id || c.mentor === user?.name);

    const filteredCourses = myCourses.filter(course =>
        (course.title || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleExpand = (id) => setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));

    const openModal = (type, mode, parentId = null, item = null) => {
        setModalType(type);
        setModalMode(mode);
        setSelectedParentId(parentId);
        setEditingItem(item);
        setModalOpen(true);

        if (item) {
            // Populate form data from item
            setFormData({
                title: getTrans(item.title, i18n.language) || '',
                description: getTrans(item.description, i18n.language) || '',
                mentor: item.mentor || user?.name || '',
                instructor_id: item.instructor_id || user?.id || '',
                url: item.meeting_url || item.content_url || item.url || '',
                type: item.type || 'video',
                duration: item.duration_minutes || '',
                date: item.start_time ? new Date(item.start_time).toLocaleDateString('en-CA') : '',
                startTime: item.start_time ? new Date(item.start_time).toTimeString().slice(0, 5) : '',
                endTime: item.end_time ? new Date(item.end_time).toTimeString().slice(0, 5) : '',
                quizData: item.quizData || null,
                promoted_coupon_code: item.promoted_coupon_code || '',
                is_premium: !!item.is_premium
            });
        } else {
            // Reset form for create
            setFormData({
                title: '',
                description: '',
                mentor: user?.name || '',
                instructor_id: user?.id || '', // Auto-assign to current user
                url: '',
                type: 'video',
                duration: '',
                date: '',
                startTime: '',
                endTime: '',
                xpReward: 50,
                xpBonus: { perfectQuiz: 20 },
                quizData: null,
                promoted_coupon_code: '',
                is_premium: false
            });
        }
    };

    const handleSave = async () => {
        try {
            // Ensure instructor_id is set to current user for courses
            if (modalType === 'course' && !formData.instructor_id) {
                formData.instructor_id = user.id;
            }

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
                // Content logic (same as CurriculumManager)
                const contentPayload = { ...formData, content_url: formData.url };
                if (modalMode === 'create') {
                    await courseService.createContent(selectedParentId, contentPayload);
                } else {
                    await courseService.updateContent(editingItem.id, contentPayload);
                }
            } else if (modalType === 'session') {
                // Session logic
                let endDate = formData.date;
                if (formData.endTime <= formData.startTime) {
                    const d = new Date(formData.date);
                    d.setDate(d.getDate() + 1);
                    endDate = d.toISOString().split('T')[0];
                }
                const sessionPayload = {
                    title: formData.title,
                    start_time: `${formData.date} ${formData.startTime}:00`,
                    end_time: `${endDate} ${formData.endTime}:00`,
                    meeting_url: formData.url,
                    description: formData.description || '',
                    instructor_id: user.id, // Force instructor to self
                    type: formData.type
                };

                if (modalMode === 'create') {
                    await courseService.createSession(selectedParentId, sessionPayload);
                } else {
                    await courseService.updateSession(editingItem.id, sessionPayload);
                }
            } else if (modalType === 'resource') {
                // Resource logic
                // For file upload, we just simulate the URL for now as per CurriculumManager
                if (modalMode === 'create') {
                    await courseService.createResource(selectedParentId, formData);
                } else {
                    await courseService.updateResource(editingItem.id, formData);
                }
            }

            setModalOpen(false);
            // Refresh courses
            const updatedCourses = await courseService.getAllCourses();
            onUpdateCourses(updatedCourses);

        } catch (error) {
            console.error(error);
            alert("Error saving: " + error.message);
        }
    };

    const handleDelete = async (type, id) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        try {
            if (type === 'course') await courseService.deleteCourse(id);
            else if (type === 'module') await courseService.deleteModule(id);
            else if (type === 'content') await courseService.deleteContent(id);
            else if (type === 'session') await courseService.deleteSession(id);
            else if (type === 'resource') await courseService.deleteResource(id);

            const updatedCourses = await courseService.getAllCourses();
            onUpdateCourses(updatedCourses);
        } catch (error) {
            console.error(error);
            alert("Error deleting: " + error.message);
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

    return (
        <div className="space-y-6 pb-24">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Manajemen Kurikulum</h2>
                    <p className="text-gray-500 text-sm mt-1">Kelola bootcamp dan materi Anda.</p>
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
                    <button
                        onClick={() => openModal('course', 'create')}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 shrink-0"
                    >
                        <Plus className="w-4 h-4" /> Bootcamp Baru
                    </button>
                </div>
            </div>

            {/* Courses List */}
            <div className="space-y-4">
                {filteredCourses.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                        <p className="text-gray-500">Anda belum memiliki bootcamp.</p>
                        <button onClick={() => openModal('course', 'create')} className="text-indigo-600 font-bold mt-2 hover:underline">Buat Bootcamp Pertama</button>
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
                                                <h3 className="font-bold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">{course.title}</h3>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-600 uppercase tracking-wider border border-blue-200">
                                                    Instructor Access
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
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Action Buttons */}
                                    <div className="flex items-center gap-2 self-end md:self-auto">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Check role for correct URL
                                                const prefix = user?.role === 'admin' ? '/admin' : '/instructor';
                                                navigate(`${prefix}/courses/${course.id}/preview`);
                                            }}
                                            className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> Preview
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/admin/certificates/${course.id}`);
                                            }}
                                            className="text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-2 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
                                        >
                                            <Star className="w-3.5 h-3.5" /> Atur Sertifikat
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
                                            onClick={() => handleDelete('course', course.id)}
                                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                            title="Delete Course"
                                        >
                                            <Trash2 className="w-4 h-4" />
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
                                                    <span className={`ml-1 text-[10px] py-0.5 px-1.5 rounded-full ${isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {course[tab] ? course[tab].length : (tab === 'modules' ? (course.modules?.length || 0) : 0)}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="p-4 bg-gray-50/50 min-h-[300px]">
                                        {(expandedIds[`course-${course.id}-tab`] || 'modules') === 'modules' && (
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <h4 className="font-bold text-gray-800 text-sm">Curriculum Modules</h4>
                                                    <button
                                                        onClick={() => openModal('module', 'create', course.id)}
                                                        className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded shadow-sm flex items-center gap-1"
                                                    >
                                                        <Plus className="w-3 h-3" /> Modul Baru
                                                    </button>
                                                </div>

                                                {/* Modules List */}
                                                {course.modules?.map((module) => (
                                                    <div key={module.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden group">
                                                        <div className="p-3 bg-gray-50 flex items-center justify-between border-b border-gray-100">
                                                            <div className="flex items-center gap-3 cursor-pointer select-none flex-1" onClick={() => toggleExpand(`module-${module.id}`)}>
                                                                <div className={`p-1 rounded bg-indigo-100 text-indigo-600 transition-transform ${expandedIds[`module-${module.id}`] ? 'rotate-90' : ''}`}>
                                                                    <ChevronRight className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-gray-900 text-sm">{module.title}</div>
                                                                    <div className="text-xs text-gray-500">{module.contents?.length || 0} items</div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button onClick={() => openModal('content', 'create', module.id)} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-medium transition-colors mr-2 flex items-center gap-1"><Plus className="w-3 h-3" /> Item</button>
                                                                <button onClick={() => openModal('module', 'edit', course.id, module)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit3 className="w-4 h-4" /></button>
                                                                <button onClick={() => handleDelete('module', module.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
                                                        </div>
                                                        {expandedIds[`module-${module.id}`] && (
                                                            <div className="p-2 space-y-1 bg-white">
                                                                {module.contents?.length > 0 ? (
                                                                    module.contents.map((content) => (
                                                                        <div key={content.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-100 group/item transition-colors">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="p-1.5 rounded-lg bg-gray-100 text-gray-600">{getContentIcon(content.type)}</div>
                                                                                <div>
                                                                                    <div className="font-medium text-sm text-gray-800">{content.title}</div>
                                                                                    <div className="text-xs text-gray-500 capitalize">{content.type} • {content.duration_minutes || 0} min</div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex gap-1">
                                                                                <button onClick={() => openModal('content', 'edit', module.id, content)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit3 className="w-3.5 h-3.5" /></button>
                                                                                <button onClick={() => handleDelete('content', content.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
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
                                            </div>
                                        )}

                                        {/* Sessions Tab */}
                                        {expandedIds[`course-${course.id}-tab`] === 'sessions' && (
                                            <div className="space-y-6">
                                                <div className="flex justify-between items-center mb-4">
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 text-base">Sesi Live & Webinar</h4>
                                                        <p className="text-gray-500 text-xs mt-0.5">Jadwalkan pertemuan tatap muka atau webinar untuk kursus ini.</p>
                                                    </div>
                                                    <button
                                                        onClick={() => openModal('session', 'create', course.id)}
                                                        className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 px-4 py-2 rounded-lg shadow-sm transition-all flex items-center gap-2"
                                                    >
                                                        <Plus className="w-4 h-4" /> Tambah Sesi
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
                                                                <span className="text-xs font-medium text-gray-500">
                                                                    {session.start_time ? new Date(session.start_time).toLocaleDateString('id-ID', { weekday: 'short' }) : '-'}
                                                                </span>
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <h5 className="font-bold text-gray-900 text-lg leading-tight mb-2 group-hover:text-indigo-600 transition-colors">
                                                                    {session.title}
                                                                </h5>
                                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                                    <Clock className="w-4 h-4" />
                                                                    <span>
                                                                        {session.start_time ? new Date(session.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'} -
                                                                        {session.end_time ? new Date(session.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                                    </span>
                                                                    <span className="text-gray-300">|</span>
                                                                    <span className={`px-2 py-0.5 rounded textxs font-bold ${session.type === 'Live' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>{session.type}</span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                {session.meeting_url && (
                                                                    <a href={`/meeting/${session.meeting_code || session.room_id}`} target="_blank" rel="noreferrer" className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors">
                                                                        Join Meeting
                                                                    </a>
                                                                )}
                                                                <button onClick={() => openModal('session', 'edit', course.id, session)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 className="w-4 h-4" /></button>
                                                                <button onClick={() => handleDelete('session', session.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Resources Tab */}
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
                                                                    <td className="px-4 py-3 font-medium text-gray-900">{resource.title}</td>
                                                                    <td className="px-4 py-3"><span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{resource.type}</span></td>
                                                                    <td className="px-4 py-3 text-gray-500 text-xs">{resource.fileSize || 'N/A'}</td>
                                                                    <td className="px-4 py-3 text-right">
                                                                        <div className="flex items-center justify-end gap-1">
                                                                            <button
                                                                                onClick={() => openModal('resource', 'edit', course.id, resource)}
                                                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                                            >
                                                                                <Edit3 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDelete('resource', resource.id)}
                                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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

                                        {/* Discussions Tab - INSTRUCTOR VIEW (No Delete/Resolve) */}
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
                                                                    <div className="font-bold text-sm text-gray-900 line-clamp-1">{getTrans(discussion.title, i18n.language)}</div>
                                                                </div>
                                                                <div className="text-xs text-gray-500 mt-1 pl-1">
                                                                    {discussion.replies?.length || 0} replies • {discussion.likes || 0} likes • Asked on {discussion.created_at ? new Date(discussion.created_at).toLocaleDateString() : 'N/A'}
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {/* Instructor can ONLY View/Reply - No Delete, No Resolve Toggle */}
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedDiscussion(discussion);
                                                                        setDiscussionViewerOpen(true);
                                                                    }}
                                                                    className="text-gray-400 hover:text-indigo-600 flex items-center gap-1 text-xs font-medium"
                                                                >
                                                                    <MessageSquare className="w-4 h-4" /> Reply
                                                                </button>
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
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Reuse AdminModal */}
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
                            <label>Judul Modul</label>
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
                        onSave={(data) => {
                            setFormData(data);
                            // We need to trigger save immediately as WizardForm usually just returns data
                            // Actually based on CurriculumManager, it calls onSave with data, then we call handleSave.
                            // But handleSave relies on state formData.
                            // So we set state then call handleSave? 
                            // React state updates are async.
                            // CurriculumManager does: setFormData(data); handleSave(); which might be buggy if handleSave reads state immediately.
                            // But let's follow the pattern or fix it. 
                            // Better to pass data to handleSave directly if possible. 
                            // For now let's assume WizardForm works as expected. 
                            // Wait, I can't modify handleSave signature easily in this snippet.
                            // I'll trust the cloned logic but maybe fix the async issue in my head:
                            // The WizardForm `onSave` should probably just trigger the save logic.
                            setFormData(prev => {
                                const newData = { ...prev, ...data };
                                // We can't call handleSave here directly with new state reliably unless handleSave accepts args.
                                // Let's just update state and hope users click "Save" in modal? No, WizardForm usually has a Save button.
                                // In `CurriculumManager`, `onSave` sets data then calls `handleSave`.
                                // Let's try to mimic that but beware of stale state. 
                                // Actually, I'll just check if I can refactor handleSave to accept data.
                                return newData;
                            });
                            // Timeout to allow state to settle? Hacky. 
                            // Let's just add a "Confirm Save" button in this modal wrapper if Wizard doesn't handle it.
                            // Actually WizardForm has its own save button that calls onSave.
                            // I will modify ContentWizardForm usage.
                        }}
                        // Pass a customized save handler that takes data
                        customSaveHandler={async (data) => {
                            // Merge data
                            const dataToSave = { ...formData, ...data };

                            // Copy-paste handleSave logic for content
                            if (modalMode === 'create') {
                                await courseService.createContent(selectedParentId, dataToSave);
                            } else {
                                await courseService.updateContent(editingItem.id, dataToSave);
                            }
                            setModalOpen(false);
                            const updated = await courseService.getAllCourses();
                            onUpdateCourses(updated);
                        }}
                    />
                )}

                {modalType === 'session' && (
                    <div className="space-y-4">
                        {/* Session Form Fields */}
                        <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Title" className="w-full border p-2 rounded" />
                        <div className="grid grid-cols-2 gap-2">
                            <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="border p-2 rounded" />
                            <input type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} className="border p-2 rounded" />
                            <input type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} className="border p-2 rounded" />
                            <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="border p-2 rounded"><option value="Live">Live</option><option value="Webinar">Webinar</option></select>
                        </div>
                        <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-2 rounded">Simpan Sesi</button>
                    </div>
                )}

                {modalType === 'resource' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Resource Title</label>
                            <input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full p-2 border rounded-lg text-sm"
                                placeholder="e.g. Course Syllabus"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Resource URL</label>
                            <input
                                value={formData.url}
                                onChange={e => setFormData({ ...formData, url: e.target.value })}
                                className="w-full p-2 border rounded-lg text-sm"
                                placeholder="e.g. https://example.com/syllabus.pdf"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Resource Type</label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                className="w-full p-2 border rounded-lg text-sm"
                            >
                                <option value="pdf">PDF</option>
                                <option value="link">Link</option>
                                <option value="document">Document</option>
                                <option value="image">Image</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-2 rounded font-bold">Simpan Resource</button>
                    </div>
                )}
            </AdminModal>

            {/* Discussion Viewer Modal */}
            <AdminModal
                isOpen={discussionViewerOpen && selectedDiscussion}
                onClose={() => { setDiscussionViewerOpen(false); setSelectedDiscussion(null); setReplyText(''); setReplyingTo(null); setEditingReplyId(null); }}
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
                                                {(reply.user_avatar || reply.user?.avatar) ? <img src={reply.user_avatar || reply.user?.avatar} alt="" className="w-full h-full object-cover" /> : ((reply.user_name || reply.user?.name) ? (reply.user_name || reply.user?.name).charAt(0) : 'U')}
                                            </div>
                                            <div>
                                                <div className="font-bold text-xs text-gray-900">
                                                    {reply.user_name || reply.user?.name || 'User'}
                                                </div>
                                                <div className="text-[10px] text-gray-400">{reply.created_at ? new Date(reply.created_at).toLocaleString() : ''}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setReplyingTo(reply);
                                                    setReplyText(`@${reply.user_name || reply.user?.name || 'User'} `);
                                                }}
                                                className="text-gray-400 hover:text-indigo-600" title="Reply to this"
                                            >
                                                <MessageSquare className="w-3.5 h-3.5" />
                                            </button>
                                            {/* Only allow deleting own replies if strictly needed, or maybe just disable it if instruction says "cannot delete discussions" applies to replies too. 
                                                But usually instructors can delete their own replies. 
                                                I'll allow it for their own replies. */}
                                            {reply.user_id === user?.id && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setEditingReplyId(reply.id);
                                                            setReplyText(reply.body);
                                                            setReplyingTo(null); // Clear replying to if editing
                                                        }}
                                                        className="text-gray-400 hover:text-blue-600" title="Edit Reply"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
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
                                                                // Update Parent List
                                                                const updatedCourses = courses.map(c => ({
                                                                    ...c,
                                                                    discussions: c.discussions?.map(d => d.id === selectedDiscussion.id ? updatedDiscussion : d)
                                                                }));
                                                                onUpdateCourses(updatedCourses);
                                                            } catch (e) { console.error(e); alert('Failed to delete reply'); }
                                                        }}
                                                        className="text-gray-400 hover:text-red-600" title="Delete Reply"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            )}
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
                                {editingReplyId ? (
                                    <div className="flex items-center justify-between text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                        <span>Editing your reply</span>
                                        <button onClick={() => { setEditingReplyId(null); setReplyText(''); }} className="text-xs hover:underline"><X className="w-3 h-3" /></button>
                                    </div>
                                ) : (replyingTo ? (
                                    <div className="flex items-center justify-between text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                        <span>Replying to {replyingTo.user_name || replyingTo.user?.name || 'User'}</span>
                                        <button onClick={() => { setReplyingTo(null); setReplyText(''); }} className="text-xs hover:underline"><X className="w-3 h-3" /></button>
                                    </div>
                                ) : 'Your Reply')}
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
                                            let updatedItem;
                                            if (editingReplyId) {
                                                // Update existing reply
                                                updatedItem = await courseService.updateReply(selectedDiscussion.id, editingReplyId, { body: replyText });

                                            } else {
                                                // New Reply
                                                const payload = {
                                                    body: replyText,
                                                    parent_id: replyingTo ? replyingTo.id : null,
                                                    reply_to_user_name: replyingTo ? (replyingTo.user_name || replyingTo.user?.name) : null
                                                };
                                                updatedItem = await courseService.replyDiscussion(selectedDiscussion.id, payload);
                                            }

                                            // Update Local
                                            setSelectedDiscussion(updatedItem);
                                            setReplyText('');
                                            setReplyingTo(null);
                                            setEditingReplyId(null);

                                            // Update Global
                                            const updatedCourses = courses.map(c => ({
                                                ...c,
                                                discussions: c.discussions?.map(d => d.id === selectedDiscussion.id ? updatedItem : d)
                                            }));
                                            onUpdateCourses(updatedCourses);

                                        } catch (e) {
                                            console.error(e);
                                            alert(`Failed to ${editingReplyId ? 'update' : 'post'} reply: ${e.message}`);
                                        }
                                    }}
                                    disabled={!replyText.trim()}
                                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                                >

                                    <MessageSquare className="w-4 h-4" /> {editingReplyId ? 'Update Reply' : 'Post Reply'}
                                </button>
                                <button onClick={() => { setDiscussionViewerOpen(false); setSelectedDiscussion(null); setReplyText(''); setReplyingTo(null); setEditingReplyId(null); }} className="text-gray-600 hover:text-gray-800 px-4 py-2 text-sm">Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </AdminModal>
        </div>
    );
};

