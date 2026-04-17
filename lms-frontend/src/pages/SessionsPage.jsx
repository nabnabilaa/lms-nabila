// Sessions Page - All upcoming sessions
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Clock, Filter, Calendar, Video, User } from 'lucide-react';
import { Badge, Modal } from '../components/ui';
import { useState, useMemo, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useCoursesQuery } from '../hooks/queries/useCourses';
import { useTranslation } from 'react-i18next';

export const SessionsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user: currentUser } = useUser();
    const { t, i18n } = useTranslation();

    // TanStack Query - cached data shown instantly, background refetch if stale
    const { data: courses = [] } = useCoursesQuery();

    const [selectedFilter, setSelectedFilter] = useState(3); // Default to 'All'
    const [selectedSession, setSelectedSession] = useState(null);
    const filterKeys = ['sessions.today', 'sessions.tomorrow', 'sessions.this_week', 'sessions.all'];
    const filters = filterKeys.map(k => t(k));


    // Get enrolled course IDs
    // Check if enrolledCourses is array of IDs or Objects. Assuming IDs based on usual pattern.
    // If currentUser is not loaded yet, default empty.
    // Get enrolled course IDs (Robust handling for IDs or Objects)
    // Note: Backend returns 'enrolled_courses', props might be 'enrolledCourses'
    const rawEnrolled = currentUser?.enrolled_courses || currentUser?.enrolledCourses || [];
    const enrolledCourseIds = new Set(rawEnrolled.map(c => (typeof c === 'object' && c !== null) ? c.id : c));

    // Get sessions from all courses (Matching Dashboard behavior)
    const allSessions = useMemo(() => {
        // Filter courses to only those the user is enrolled in (if currentUser is available)
        // If currentUser is not available (e.g. admin view or public), maybe show all?
        // Assuming Student view: only show enrolled.
        const relevantCourses = currentUser
            ? courses.filter(c => enrolledCourseIds.has(c.id))
            : courses; // Fallback or show all? Let's stick to enrolled if possible, but safe fallback to all if no user context yet (unlikely)

        return relevantCourses.flatMap(course =>
            (course.sessions || []).map(session => {
                // Parse Backend Data
                let dateStr = session.date;
                let startTimeStr = session.startTime;
                let endTimeStr = session.endTime;
                let durationVal = session.duration;

                if (session.start_time) {
                    const start = new Date(session.start_time);
                    const end = new Date(session.end_time);
                    dateStr = start.toISOString().split('T')[0];
                    const locale = i18n.language === 'en' ? 'en-US' : 'id-ID';
                    startTimeStr = start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
                    endTimeStr = end.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

                    // Fallback calc for duration
                    if (!durationVal) {
                        durationVal = Math.round((end - start) / 60000);
                    }
                }

                return {
                    ...session,
                    date: dateStr,
                    startTime: startTimeStr,
                    endTime: endTimeStr,
                    duration: durationVal,
                    type: session.type || 'Live', // Backend type
                    courseName: course.title,
                    courseId: course.id,
                    instructorName: session.instructor?.user?.name || (session.description?.includes('Instructor:') ? session.description.split('Instructor:')[1].trim() : session.mentor || 'Tim Pengajar')
                };
            })
        );
    }, [courses, currentUser, enrolledCourseIds, i18n.language]); // Add dependencies

    // Auto-open session from navigation state (Dashboard deep link)
    useEffect(() => {
        if (location.state?.sessionId && allSessions.length > 0) {
            const sessionToOpen = allSessions.find(s => s.id === location.state.sessionId);
            if (sessionToOpen) {
                setSelectedSession(sessionToOpen);
                // Clear state to prevent reopening on generic re-renders
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [location.state, allSessions, location.pathname, navigate]);

    // Filter logic...
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const filteredSessions = allSessions.filter(session => {
        if (selectedFilter === 0) return session.date === today;
        if (selectedFilter === 1) return session.date === tomorrow;
        if (selectedFilter === 2) {
            const weekFromNow = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
            return session.date >= today && session.date <= weekFromNow;
        }
        return true;
    });

    const getDateLabel = (dateStr) => {
        if (dateStr === today) return t('sessions.get_date_today');
        if (dateStr === tomorrow) return t('sessions.get_date_tomorrow');
        const locale = i18n.language === 'en' ? 'en-US' : 'id-ID';
        return new Date(dateStr).toLocaleDateString(locale, { weekday: 'long' });
    };

    const formatDuration = (mins) => {
        if (!mins) return '-';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h > 0) return `${h} ${t('sessions.hours')} ${m > 0 ? m + ' ' + t('sessions.mins') : ''}`;
        return `${m} ${t('sessions.minutes')}`;
    };

    const locale = i18n.language === 'en' ? 'en-US' : 'id-ID';

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <button
                        onClick={() => navigate('/')}
                        className="text-sm text-gray-500 hover:text-blue-600 mb-2 flex items-center gap-1 group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> {t('common.back_to_dashboard')}
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">{t('sessions.title')}</h1>
                </div>
                <div className="flex flex-wrap gap-2">
                    {filters.map((filter, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedFilter(idx)}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${selectedFilter === idx
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                {filteredSessions.length > 0 ? (
                    filteredSessions.map((session, idx) => {
                        const sessionDate = new Date(session.date);
                        return (
                            <div
                                key={idx}
                                onClick={() => setSelectedSession(session)}
                                className="group bg-white rounded-2xl p-1 border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer flex flex-col sm:flex-row gap-4 relative overflow-hidden"
                            >
                                {/* Left Accent Bar */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${session.type === 'Live' ? 'bg-rose-500' : session.type === 'Workshop' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>

                                {/* Date Box */}
                                <div className="hidden sm:flex flex-col items-center justify-center bg-gray-50 rounded-xl w-24 p-2 ml-2 my-2 shrink-0 border border-gray-100 group-hover:bg-indigo-50/50 group-hover:border-indigo-100 transition-colors">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{sessionDate.toLocaleDateString(locale, { month: 'short' })}</span>
                                    <span className="text-3xl font-black text-gray-800">{sessionDate.getDate()}</span>
                                    <span className="text-xs font-medium text-gray-500">{getDateLabel(session.date)}</span>
                                </div>

                                {/* Mobile Date Header */}
                                <div className="sm:hidden bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 flex justify-between items-center border-b border-gray-100">
                                    <span>{getDateLabel(session.date)}, {sessionDate.toLocaleDateString(locale, { day: 'numeric', month: 'long' })}</span>
                                    <Badge variant={session.type === 'Live' ? 'green' : session.type === 'Workshop' ? 'purple' : 'blue'}>{session.type}</Badge>
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 p-3 sm:py-4 flex flex-col justify-center">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant={session.type === 'Live' ? 'green' : session.type === 'Workshop' ? 'purple' : 'blue'} className="hidden sm:inline-flex text-[10px] px-2 py-0.5">
                                            {session.type}
                                        </Badge>
                                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{session.courseName}</span>
                                    </div>
                                    <h4 className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-2">
                                        {session.title}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                                <User className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="font-medium">{session.instructorName}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-2 py-1 rounded-md text-xs font-bold">
                                            <Clock className="w-3.5 h-3.5" />
                                            {formatDuration(session.duration)}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Time & Action */}
                                <div className="flex items-center justify-between sm:justify-end gap-4 p-4 sm:pl-0 border-t sm:border-t-0 border-gray-100 bg-gray-50/50 sm:bg-transparent rounded-b-xl sm:rounded-none">
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">{t('sessions.time')}</div>
                                        <div className="font-bold text-gray-900 text-lg flex items-center gap-1">
                                            {session.startTime} <span className="text-gray-400 font-light">-</span> {session.endTime}
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                        <Video className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400">{t('sessions.no_sessions')}</p>
                    </div>
                )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-8 border-t border-gray-100">
                <div className="text-center p-6 bg-blue-50 rounded-xl">
                    <div className="text-3xl font-bold text-blue-600">{allSessions.length}</div>
                    <div className="text-sm text-gray-600 mt-1">{t('sessions.total_sessions_week')}</div>
                </div>
                <div className="text-center p-6 bg-green-50 rounded-xl">
                    <div className="text-3xl font-bold text-green-600">
                        {allSessions.filter(s => s.type === 'Live').length}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{t('sessions.live_sessions')}</div>
                </div>
                <div className="text-center p-6 bg-purple-50 rounded-xl">
                    <div className="text-3xl font-bold text-purple-600">
                        {allSessions.filter(s => s.type === 'Workshop').length}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{t('sessions.workshops')}</div>
                </div>
            </div>
            {/* Session Detail Modal */}
            <Modal
                isOpen={!!selectedSession}
                onClose={() => setSelectedSession(null)}
                title={t('sessions.session_detail')}
            >
                {selectedSession && (
                    <div className="space-y-6">
                        {/* Header Section */}
                        <div className={`-mt-4 -mx-6 px-6 py-6 ${selectedSession.type === 'Live' ? 'bg-rose-50' : 'bg-indigo-50'} border-b border-gray-100`}>
                            <div className="flex items-start justify-between mb-3">
                                <Badge variant={selectedSession.type === 'Live' ? 'green' : selectedSession.type === 'Workshop' ? 'purple' : 'blue'}>
                                    {selectedSession.type}
                                </Badge>
                                <span className={`text-xs font-bold uppercase tracking-wider ${selectedSession.type === 'Live' ? 'text-rose-600' : 'text-indigo-600'}`}>
                                    {selectedSession.type === 'Live' ? t('sessions.live_session') : selectedSession.type === 'Workshop' ? t('sessions.workshop_session') : t('sessions.recorded')}
                                </span>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 leading-snug">{selectedSession.title}</h2>
                            <p className="text-gray-600 text-sm mt-1 font-medium">{selectedSession.courseName}</p>
                        </div>

                        {/* Key Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
                                <div className="flex items-center gap-2 text-gray-400 mb-1">
                                    <Calendar className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-wider">{t('sessions.date')}</span>
                                </div>
                                <p className="font-bold text-gray-900 text-sm">
                                    {new Date(selectedSession.date).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                                </p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
                                <div className="flex items-center gap-2 text-gray-400 mb-1">
                                    <Clock className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-wider">{t('sessions.time')}</span>
                                </div>
                                <p className="font-bold text-gray-900 text-sm">{selectedSession.startTime} - {selectedSession.endTime}</p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
                                <div className="flex items-center gap-2 text-gray-400 mb-1">
                                    <Clock className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-wider">{t('sessions.duration')}</span>
                                </div>
                                <p className="font-bold text-gray-900 text-sm">{formatDuration(selectedSession.duration)}</p>
                            </div>
                        </div>

                        {/* Instructor Section */}
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 shadow-sm">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{t('sessions.instructor')}</p>
                                <p className="font-bold text-gray-900 text-base">{selectedSession.instructorName || 'Tim Pengajar'}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{t('sessions.expert_mentor')}</p>
                            </div>
                        </div>

                        {/* Description */}
                        {selectedSession.description && (
                            <div className="bg-white rounded-xl">
                                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> {t('sessions.agenda')}
                                </h4>
                                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line pl-3.5 border-l-2 border-gray-100">
                                    {selectedSession.description.replace(/Instructor: .*/, '').trim() || t('sessions.no_description')}
                                </p>
                            </div>
                        )}

                        {/* Footer / Actions */}
                        <div className="pt-2 flex flex-col sm:flex-row gap-3">
                            {selectedSession.meeting_type === 'internal' && selectedSession.room_id ? (
                                <button
                                    onClick={() => navigate(`/meeting/${selectedSession.meeting_code || selectedSession.room_id}`)}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
                                >
                                    <Video className="w-5 h-5" /> {t('sessions.join_meeting')}
                                </button>
                            ) : selectedSession.meeting_url ? (
                                <a
                                    href={selectedSession.meeting_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
                                >
                                    <Video className="w-5 h-5" /> {t('sessions.join_now')}
                                </a>
                            ) : (
                                <button disabled className="flex-1 px-6 py-3 bg-gray-100 text-gray-400 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                                    <Video className="w-5 h-5" /> {t('sessions.link_unavailable')}
                                </button>
                            )}
                            <button
                                onClick={() => setSelectedSession(null)}
                                className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-bold transition-colors"
                            >
                                {t('sessions.close')}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
