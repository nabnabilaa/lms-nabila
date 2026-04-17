// Courses Page - Browse all courses
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getTrans } from '../lib/transHelper';
import { Search, BookOpen, Clock, Star, Users, ChevronRight, Filter, ArrowLeft } from 'lucide-react';
import { Badge, Card } from '../components/ui';
import { useCoursesQuery } from '../hooks/queries/useCourses';
import { useCurrentUserQuery } from '../hooks/queries/useUser';

export const CoursesPage = ({ onCourseClick }) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Internal State
    const { data: courses = [], isLoading: isLoadingCourses } = useCoursesQuery();
    const { data: currentUser, isLoading: isLoadingUser } = useCurrentUserQuery();
    const isLoading = isLoadingCourses || isLoadingUser;

    const initialSearch = searchParams.get('search') || '';
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [selectedFilter, setSelectedFilter] = useState('all');

    // Admin specific: Filter by instructor
    const [selectedInstructor, setSelectedInstructor] = useState('all');

    const role = currentUser?.role || 'student';
    const isStaff = role === 'admin' || role === 'instructor';

    // Unique Instructors (for Admin Filter & Stats)
    const instructors = [...new Set(courses.map(c => c.instructor?.name).filter(Boolean))];

    // Sync state when URL params change (e.g. from Navbar)
    useEffect(() => {
        const query = searchParams.get('search') || '';
        setSearchQuery(query);
    }, [searchParams]);

    // Update URL when typing (debounced slightly or direct)
    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchQuery(val);
        setSearchParams(prev => {
            if (val) {
                prev.set('search', val);
                return prev;
            } else {
                prev.delete('search');
                return prev;
            }
        }, { replace: true });
    };

    // Define Filters based on Role
    let filters = [];
    if (isStaff) {
        filters = [
            { id: 'all', label: t('courses.filter_all') },
            { id: 'oldest', label: t('courses.filter_oldest') },
            { id: 'newest', label: t('courses.filter_newest') },
        ];
    } else {
        filters = [
            { id: 'all', label: t('courses.filter_all') },
            { id: 'in-progress', label: t('courses.filter_in_progress') },
            { id: 'completed', label: t('courses.filter_completed') },
            { id: 'new', label: t('courses.filter_new') },
        ];
    }

    const filteredCourses = courses.filter(course => {
        // 1. Text Search - Helper for search check
        const title = getTrans(course.title, 'id').toLowerCase() + ' ' + getTrans(course.title, 'en').toLowerCase();
        const desc = (getTrans(course.description, 'id') || '').toLowerCase() + ' ' + (getTrans(course.description, 'en') || '').toLowerCase();

        const matchesSearch = title.includes(searchQuery.toLowerCase()) || desc.includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        // 2. Role-Based Pre-Filter
        // Instructor only sees THEIR OWN courses
        if (role === 'instructor') {
            if (course.instructor?.name !== currentUser?.name) return false;
        }

        // 3. Admin Instructor Filter
        if (role === 'admin' && selectedInstructor !== 'all') {
            if (course.instructor?.name !== selectedInstructor) return false;
        }

        // 4. Student Status Filter
        if (!isStaff) {
            const userEnrollment = course.enrollments && course.enrollments[0];
            if (selectedFilter === 'in-progress') return userEnrollment && userEnrollment.status === 'active';
            if (selectedFilter === 'completed') return userEnrollment && userEnrollment.status === 'completed';
            if (selectedFilter === 'new') {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return new Date(course.created_at) > thirtyDaysAgo;
            }
        }

        return true;
    }).sort((a, b) => {
        // 5. Sorting (Only applies to Staff filters 'newest'/'oldest', but we can apply generic sort)
        if (selectedFilter === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        if (selectedFilter === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
        return 0; // Default order
    });

    // Loading State
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
            {/* Back Button - Students only */}
            {!isStaff && (
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors group mb-2"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                    {t('courses.back_to_dashboard')}
                </button>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('courses.explore')}</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {t('courses.explore_subtitle')}
                    </p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder={t('courses.search_placeholder')}
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm w-full focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 noscroll">
                    <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {filters.map((filter) => (
                        <button
                            key={filter.id}
                            onClick={() => setSelectedFilter(filter.id)}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${selectedFilter === filter.id
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                {/* Admin Only: Instructor Filter */}
                {role === 'admin' && (
                    <div className="relative">
                        <select
                            value={selectedInstructor}
                            onChange={(e) => setSelectedInstructor(e.target.value)}
                            className="pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none shadow-sm appearance-none cursor-pointer"
                        >
                            <option value="all">{t('courses.all_instructors')}</option>
                            {instructors.map((inst, idx) => (
                                <option key={idx} value={inst}>{inst}</option>
                            ))}
                        </select>
                        <ChevronRight className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                    </div>
                )}
            </div>

            {/* Course Grid */}
            {filteredCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map((course) => (
                        <Card
                            key={course.id}
                            onClick={() => {
                                if (onCourseClick) {
                                    onCourseClick(course.id);
                                } else {
                                    navigate(`/courses/${course.id}`);
                                }
                            }}
                            className="group cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden"
                        >
                            {/* Course Image/Thumbnail */}
                            <div className="h-40 bg-gradient-to-br from-blue-500 to-indigo-600 relative overflow-hidden">
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                                <div className="absolute top-3 left-3">
                                    <Badge variant="blue" className="bg-white/20 text-white backdrop-blur-sm">
                                        {course.modules_count || 0} {t('courses.modules')}
                                    </Badge>
                                </div>
                                <div className="absolute bottom-3 right-3">
                                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white group-hover:bg-white/30 transition-colors">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>

                            {/* Course Info */}
                            <div className="p-5">
                                <h3 className="font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                                    {getTrans(course.title, i18n.language)}
                                </h3>
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                                    {getTrans(course.description, i18n.language) || 'Kuasai skill yang dibutuhkan industri dengan mentor berpengalaman.'}
                                </p>

                                {/* Meta Info */}
                                <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <span className="flex items-center gap-1">
                                            <BookOpen className="w-3.5 h-3.5" />
                                            {course.modules_count || 0} {t('courses.modules').toLowerCase()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {course.duration_minutes ? Math.round(course.duration_minutes / 60) + 'h' : '10h'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-yellow-600">
                                        <Star className="w-3.5 h-3.5 fill-yellow-600" />
                                        <span className="font-bold">{course.rating || '4.8'}</span>
                                    </div>
                                </div>

                                {/* Progress Bar (Visible only if enrolled) */}
                                {course.enrollments && course.enrollments.length > 0 && (
                                    <div className="mt-3">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-medium text-blue-600">Progress</span>
                                            <span className="text-gray-600">{course.enrollments[0].progress_percent}%</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                                style={{ width: `${course.enrollments[0].progress_percent}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}

                                {/* Instructor */}
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                        {course.instructor?.name?.charAt(0) || 'T'}
                                    </div>
                                    <span className="text-xs text-gray-600">
                                        {course.instructor?.name || 'Expert Instructor'}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{t('courses.no_courses')}</h3>
                    <p className="text-gray-500">{t('courses.no_courses_desc')}</p>
                </div>
            )}

            {/* Stats Footer */}
            {!isStaff ? (
                // Student View (Default)
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-8 border-t border-gray-100">
                    <div className="text-center p-6 bg-blue-50 rounded-xl">
                        <div className="text-3xl font-bold text-blue-600">{courses.length}</div>
                        <div className="text-sm text-gray-600 mt-1">{t('courses.total_bootcamp')}</div>
                    </div>
                    <div className="text-center p-6 bg-emerald-50 rounded-xl">
                        <div className="text-3xl font-bold text-emerald-600">
                            {courses.filter(c => c.enrollments && c.enrollments.length > 0 && c.enrollments[0].status === 'active').length}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">{t('courses.active_enrolled')}</div>
                    </div>
                    <div className="text-center p-6 bg-orange-50 rounded-xl">
                        <div className="text-3xl font-bold text-orange-600">
                            {[...new Set(courses.map(c => c.instructor?.name).filter(Boolean))].length}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">{t('courses.expert_mentors')}</div>
                    </div>
                </div>
            ) : (
                // Admin & Instructor View
                <div className={`grid grid-cols-1 ${role === 'admin' ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-4 mt-8 pt-8 border-t border-gray-100`}>
                    <div className="text-center p-6 bg-blue-50 rounded-xl">
                        <div className="text-3xl font-bold text-blue-600">
                            {role === 'instructor'
                                ? courses.filter(c => c.instructor?.name === currentUser?.name).length
                                : courses.length}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">{t('courses.total_bootcamp')}</div>
                    </div>

                    {role === 'admin' && (
                        <div className="text-center p-6 bg-orange-50 rounded-xl">
                            <div className="text-3xl font-bold text-orange-600">
                                {[...new Set(courses.map(c => c.instructor?.name).filter(Boolean))].length}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">{t('courses.expert_mentors')}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
