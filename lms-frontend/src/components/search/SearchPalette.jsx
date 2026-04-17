import React, { useState, useEffect, useRef } from 'react';
import { Search, X, BookOpen, ArrowRight, Command, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCoursesQuery } from '../../hooks/queries/useCourses';
import { useCertificatesQuery } from '../../hooks/queries/useCertificates';
import { useTranslation } from 'react-i18next';
import { getTrans } from '../../lib/transHelper';

export const SearchPalette = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);

    // Fetch Data (Enabled only when open or always? Better when open to save bandwidth, but faster if preloaded. Let's rely on cache.)
    const { data: courses = [] } = useCoursesQuery();
    const { data: certificates = [] } = useCertificatesQuery();

    // Derive Sessions from Courses
    const sessions = React.useMemo(() => {
        if (!Array.isArray(courses)) return [];
        return courses.flatMap(course =>
            (course.sessions || []).map(session => ({
                ...session,
                courseTitle: course.title,
                instructorName: session.instructor?.user?.name || 'Instructor'
            }))
        );
    }, [courses]);

    // Filter Logic
    const filteredCourses = React.useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        return courses.filter(course =>
            getTrans(course.title, i18n.language).toLowerCase().includes(q) ||
            getTrans(course.description, i18n.language).toLowerCase().includes(q)
        ).slice(0, 3);
    }, [query, courses, i18n.language]);

    const filteredSessions = React.useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        return sessions.filter(session =>
            getTrans(session.title, i18n.language).toLowerCase().includes(q) ||
            getTrans(session.courseTitle, i18n.language).toLowerCase().includes(q)
        ).slice(0, 3);
    }, [query, sessions, i18n.language]);

    const filteredCertificates = React.useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        return certificates.filter(cert =>
            cert.certificate_id.toLowerCase().includes(q) ||
            getTrans(cert.course?.title, i18n.language).toLowerCase().includes(q)
        ).slice(0, 3);
    }, [query, certificates, i18n.language]);

    const allResults = [
        ...filteredCourses.map(c => ({ ...c, type: 'course' })),
        ...filteredSessions.map(s => ({ ...s, type: 'session' })),
        ...filteredCertificates.map(c => ({ ...c, type: 'certificate' }))
    ];

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Handle Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev < allResults.length - 1 ? prev + 1 : prev));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (allResults[selectedIndex]) {
                    handleSelect(allResults[selectedIndex]);
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, allResults, selectedIndex]);

    const handleSelect = (item) => {
        if (item.type === 'course') {
            navigate(`/courses/${item.id}`);
        } else if (item.type === 'session') {
            // Navigate to Sessions Page with State to open modal
            navigate('/sessions', { state: { sessionId: item.id } });
        } else if (item.type === 'certificate') {
            navigate('/certificate-generator', { state: { certificateId: item.certificate_id } });
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Search Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={t('search.placeholder')}
                        className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 text-base"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                    />
                    <div className="flex items-center gap-2">
                        <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-xs text-gray-500 font-sans">
                            <span className="text-[10px]">ESC</span>
                        </kbd>
                    </div>
                </div>

                {/* Results List */}
                <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
                    {/* Empty State */}
                    {query.trim() === '' && (
                        <div className="px-4 py-8 text-center text-gray-400">
                            <Command className="w-10 h-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">{t('search.type_to_search')}</p>
                        </div>
                    )}

                    {/* No Results */}
                    {query.trim() !== '' && allResults.length === 0 && (
                        <div className="px-4 py-8 text-center text-gray-500">
                            <p className="text-sm">{t('search.no_results')}</p>
                        </div>
                    )}

                    {/* Results */}
                    {allResults.length > 0 && (
                        <div className="space-y-1">
                            {/* Courses Section */}
                            {filteredCourses.length > 0 && (
                                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {t('search.courses')}
                                </div>
                            )}
                            {filteredCourses.map((course, idx) => {
                                // Calculate global index for selection
                                const globalIdx = idx;
                                return (
                                    <ResultItem
                                        key={`course-${course.id}`}
                                        item={course}
                                        icon={BookOpen}
                                        isSelected={selectedIndex === globalIdx}
                                        onClick={() => handleSelect({ ...course, type: 'course' })}
                                    />
                                )
                            })}

                            {/* Sessions Section */}
                            {filteredSessions.length > 0 && (
                                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">
                                    {t('search.live_sessions')}
                                </div>
                            )}
                            {filteredSessions.map((session, idx) => {
                                const globalIdx = filteredCourses.length + idx;
                                return (
                                    <ResultItem
                                        key={`session-${session.id}`}
                                        item={session}
                                        icon={BookOpen} // Or Video/Calendar
                                        title={`${getTrans(session.title, i18n.language)} (${getTrans(session.courseTitle, i18n.language)})`}
                                        isSelected={selectedIndex === globalIdx}
                                        onClick={() => handleSelect({ ...session, type: 'session' })}
                                    />
                                )
                            })}

                            {/* Certificates Section */}
                            {filteredCertificates.length > 0 && (
                                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">
                                    {t('search.certificates')}
                                </div>
                            )}
                            {filteredCertificates.map((cert, idx) => {
                                const globalIdx = filteredCourses.length + filteredSessions.length + idx;
                                return (
                                    <ResultItem
                                        key={`cert-${cert.id}`}
                                        item={cert}
                                        icon={Award}
                                        title={cert.course?.title ? `${t('search.certificate_prefix')}: ${getTrans(cert.course.title, i18n.language)}` : cert.certificate_id}
                                        isSelected={selectedIndex === globalIdx}
                                        onClick={() => handleSelect({ ...cert, type: 'certificate' })}
                                    />
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Tips */}
                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <ArrowRight className="w-3 h-3" /> {t('search.select')}
                        </span>
                        <span className="flex items-center gap-1">
                            <ArrowRight className="w-3 h-3 rotate-90" /> {t('search.navigate')}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ResultItem = ({ item, icon: Icon, isSelected, onClick, title }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-left transition-colors group ${isSelected
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-700 hover:bg-gray-50'
            }`}
    >
        <div className="flex items-center gap-3 overflow-hidden">
            <div className={`p-2 rounded-lg ${isSelected ? 'bg-white shadow-sm' : 'bg-gray-100 group-hover:bg-white group-hover:shadow-sm'}`}>
                <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
            </div>
            <div>
                <h4 className="font-medium truncate">{title || getTrans(item.title, 'id')}</h4>
            </div>
        </div>
        {isSelected && (
            <ArrowRight className="w-4 h-4 text-blue-600 opacity-80" />
        )}
    </button>
);
