// Dashboard Page - Learner (Redesigned to match reference)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, ProgressBar, Skeleton } from '../components/ui';
import {
    BookOpen, Flame, Trophy, ChevronRight, Clock, Star, Award, Shield, Zap, Crown, User, Calendar, Medal, Gift, BarChart3, Target, CheckCircle2,
    Key, MessageCircle, Video, Rocket, Sparkles, Gamepad2, GraduationCap, Lightbulb, Pencil
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getTrans } from '../lib/transHelper';
import { useUser } from '../contexts/UserContext';
import { useCoursesQuery } from '../hooks/queries/useCourses';
import { useUsersQuery } from '../hooks/queries/useUser';
import { useDailyMissionsQuery } from '../hooks/queries/useMissions';

const LUCIDE_ICON_MAP = {
    Target, Key, BookOpen, Gift, Flame, MessageCircle, Trophy, Video,
    Rocket, Star, Sparkles, Gamepad2, GraduationCap, Lightbulb, Pencil, Zap,
};

const renderMissionIcon = (iconName, size = 20, className = '') => {
    const IconComponent = LUCIDE_ICON_MAP[iconName];
    if (!IconComponent) return <Target size={size} className={className} />;
    return <IconComponent size={size} className={className} />;
};

export const DashboardPage = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { user: userData, loading } = useUser();

    // TanStack Query hooks - Data from cache instantly, background refetch if stale
    const { data: allCourses = [], isLoading: coursesLoading } = useCoursesQuery();
    const { data: allUsers = [], isLoading: usersLoading } = useUsersQuery();

    const studentName = userData?.name || 'Student';
    const enrolledCourses = userData?.enrolled_courses || [];

    // Icon Mapping for Levels
    const iconMap = {
        'Award': Award,
        'Shield': Shield,
        'Zap': Zap,
        'Star': Star,
        'Crown': Crown,
        'Trophy': Trophy
    };

    const myCourses = enrolledCourses;
    const firstCourse = myCourses[0];

    // Stats Data (All from Backend now)
    const stats = userData?.stats || {};
    const streak = stats.daily_streak || 0;
    const levelName = userData?.level?.name || 'Novice';
    const xp = userData?.xp_points || 0;

    // Level Styling
    const levelColor = userData?.level?.color_hex || '#10B981';
    const LevelIcon = iconMap[userData?.level?.icon] || Trophy;

    // Level Progress
    const xpToNext = stats.xp_to_next_level || 0;
    const nextLevelName = stats.next_level_name || 'Max Level';

    // Weekly Target
    const weeklyTargetPercent = stats.weekly_target_percent || 0;
    const modulesThisWeek = stats.modules_this_week || 0;

    // Dynamic Progress (Course)
    const progressPercentage = firstCourse?.progress_percent || 0;
    const totalModules = firstCourse?.total_modules || 0;
    const completedModules = firstCourse?.completed_modules || 0;

    // Calculate dynamic leaderboard
    const usersList = Array.isArray(allUsers) ? allUsers : [];
    const leaderboard = usersList
        .filter(u => u.id)
        .sort((a, b) => (b.xp_points || 0) - (a.xp_points || 0))
        .slice(0, 5)
        .map((user, idx) => ({
            rank: idx + 1,
            name: user.name,
            xp: user.xp_points || 0,
            isMe: user.email === userData?.email,
            avatar: user.avatar,
            level: user.level
        }));

    // Get sessions from enrolled courses
    const enrolledIds = new Set(enrolledCourses.map(c => c.id));
    const relevantCourses = allCourses.length > 0
        ? allCourses.filter(c => enrolledIds.has(c.id))
        : enrolledCourses;

    const locale = i18n.language === 'id' ? 'id-ID' : 'en-US';

    const upcomingSessions = relevantCourses
        .flatMap(course => (course.sessions || []).map(s => {
            let startTime = s.startTime;
            let endTime = s.endTime;

            if (s.start_time) {
                startTime = new Date(s.start_time).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
            }
            if (s.end_time) {
                endTime = new Date(s.end_time).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
            }

            return {
                ...s,
                startTime: startTime || '--:--',
                endTime: endTime || '--:--',
                courseName: getTrans(course.title, i18n.language),
                instructor: s.instructor?.user?.name || s.instructor?.name || s.mentor || t('dashboard.teaching_team'),
                type: s.type || 'Live'
            };
        }))
        .sort((a, b) => 0)
        .slice(0, 3);

    // Role Check
    const isInstructor = userData?.role === 'instructor';

    // Daily Missions
    const { data: missionsData, isLoading: missionsLoading } = useDailyMissionsQuery({
        enabled: !isInstructor && !!userData?.id
    });
    const dailyMissions = missionsData?.missions?.slice(0, 3) || [];

    // Quick nav items with translations
    const quickNavItems = [
        { label: t('nav.courses'), icon: BookOpen, path: '/courses', color: 'bg-blue-50 text-blue-600', border: 'hover:border-blue-200' },
        { label: t('nav.schedule'), icon: Calendar, path: '/sessions', color: 'bg-purple-50 text-purple-600', border: 'hover:border-purple-200' },
        { label: t('nav.leaderboard'), icon: BarChart3, path: '/leaderboard', color: 'bg-amber-50 text-amber-600', border: 'hover:border-amber-200' },
        { label: t('nav.certificates'), icon: Medal, path: '/certificates', color: 'bg-green-50 text-green-600', border: 'hover:border-green-200' },
        { label: t('dashboard.coupons'), icon: Gift, path: '/coupons', color: 'bg-pink-50 text-pink-600', border: 'hover:border-pink-200' },
        { label: t('nav.missions'), icon: Target, path: '/missions', color: 'bg-indigo-50 text-indigo-600', border: 'hover:border-indigo-200' },
    ];

    // Mission type labels
    const getMissionTypeLabel = (type) => {
        if (type === 'daily') return t('missions.daily');
        if (type === 'weekly') return t('missions.weekly');
        return t('missions.special');
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            {/* Greeting */}
            <section className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('dashboard.greeting', { name: studentName })} 👋</h1>
                    <p className="text-gray-500 mt-1">
                        {isInstructor
                            ? t('dashboard.instructor_subtitle')
                            : t('dashboard.student_subtitle')}
                    </p>
                </div>
                {!isInstructor && (
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm w-full md:w-80">
                        <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">{t('dashboard.weekly_target')}</span>
                            <span className="text-sm font-bold text-blue-600">85%</span>
                        </div>
                        <ProgressBar progress={85} />
                    </div>
                )}
            </section>

            {/* Quick Navigation */}
            {!isInstructor && (
                <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-8">
                    {quickNavItems.map(item => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm ${item.border} transition-all duration-200 hover:shadow-md group cursor-pointer`}
                        >
                            <div className={`p-2.5 rounded-lg ${item.color}`}>
                                <item.icon className="w-5 h-5" />
                            </div>
                            <span className="font-semibold text-sm text-gray-700 group-hover:text-gray-900">{item.label}</span>
                        </button>
                    ))}
                </section>
            )}

            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {isInstructor ? (
                    // INSTRUCTOR STATS
                    <>
                        <Card>
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-blue-50 rounded-xl">
                                    <BookOpen className="text-blue-600 w-6 h-6" />
                                </div>
                            </div>
                            <h3 className="text-gray-500 text-sm font-medium">{t('dashboard.active_classes')}</h3>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{userData?.stats?.active_classes || 0} {t('dashboard.classes_unit')}</p>
                            <p className="text-xs text-blue-600 mt-2 font-medium">{t('dashboard.currently_ongoing')}</p>
                        </Card>

                        <Card>
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-green-50 rounded-xl">
                                    <User className="text-green-600 w-6 h-6" />
                                </div>
                            </div>
                            <h3 className="text-gray-500 text-sm font-medium">{t('dashboard.total_students')}</h3>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{userData?.stats?.total_students || 0} {t('dashboard.students_unit')}</p>
                            <p className="text-xs text-green-600 mt-2 font-medium">{t('dashboard.actively_learning')}</p>
                        </Card>

                        <Card>
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-purple-50 rounded-xl">
                                    <Clock className="text-purple-600 w-6 h-6" />
                                </div>
                            </div>
                            <h3 className="text-gray-500 text-sm font-medium">{t('dashboard.teaching_hours')}</h3>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{userData?.stats?.teaching_hours || 0} {t('dashboard.hours_unit')}</p>
                            <p className="text-xs text-purple-600 mt-2 font-medium">{t('dashboard.total_this_month')}</p>
                        </Card>
                    </>
                ) : (
                    // STUDENT STATS
                    <>
                        <Card
                            onClick={() => firstCourse && navigate(`/courses/${firstCourse.id}`)}
                            className="group relative overflow-hidden cursor-pointer"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <BookOpen className="text-blue-600 group-hover:text-white w-6 h-6 transition-colors" />
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
                            </div>
                            <h3 className="text-gray-500 text-sm font-medium">{t('dashboard.course_progress')}</h3>
                            <p className="text-xl font-bold text-gray-900 mt-1">
                                {getTrans(firstCourse?.title, i18n.language) || t('dashboard.no_course_started')}
                            </p>
                            {firstCourse && (
                                <div className="mt-4">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-xs text-gray-400">
                                            {t('dashboard.modules_done', { completed: completedModules, total: totalModules })}
                                        </span>
                                        <span className="text-xs font-bold text-blue-600">{progressPercentage}%</span>
                                    </div>
                                    <ProgressBar progress={progressPercentage} />
                                </div>
                            )}
                        </Card>

                        <Card>
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-orange-50 rounded-xl">
                                    <Flame className="text-orange-500 w-6 h-6" />
                                </div>
                            </div>
                            <h3 className="text-gray-500 text-sm font-medium">{t('dashboard.daily_streak')}</h3>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{t('dashboard.streak_days', { count: streak })}</p>
                            <p className="text-xs text-orange-600 mt-2 font-medium">{t('dashboard.streak_motivation')}</p>
                        </Card>

                        <Card className="md:col-span-2 lg:col-span-1">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 rounded-xl" style={{ backgroundColor: `${levelColor}20` }}>
                                    <LevelIcon className="w-6 h-6" style={{ color: levelColor }} />
                                </div>
                            </div>
                            <h3 className="text-gray-500 text-sm font-medium">{t('dashboard.learning_level')}</h3>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{levelName}</p>
                            <p className="text-xs mt-2 font-medium" style={{ color: levelColor }}>
                                {xp} XP • {xpToNext > 0 ? t('dashboard.xp_to_next', { xp: xpToNext, level: nextLevelName }) : t('dashboard.max_level')}
                            </p>
                        </Card>
                    </>
                )}
            </div>

            {/* Daily Missions Widget - Students Only */}
            {!isInstructor && (dailyMissions.length > 0 || missionsLoading) && (
                <section className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-indigo-600" />
                            <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.daily_missions')}</h2>
                        </div>
                        <button onClick={() => navigate('/missions')} className="text-indigo-600 text-sm font-medium hover:underline">
                            {t('dashboard.view_all')} →
                        </button>
                    </div>

                    {missionsLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 animate-pulse">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-200" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-gray-200 rounded w-3/4" />
                                            <div className="h-3 bg-gray-200 rounded w-1/4" />
                                        </div>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full w-full" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {dailyMissions.map(mission => {
                                const progress = mission.user_progress || 0;
                                const target = mission.action_target || 1;
                                const pct = Math.round((progress / target) * 100);
                                const done = mission.is_completed;
                                return (
                                    <div
                                        key={mission.id}
                                        onClick={() => navigate('/missions')}
                                        className={`bg-white p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${done ? 'border-green-200 bg-green-50/50' : 'border-gray-100 hover:border-indigo-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${done ? 'bg-green-100 text-green-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                {done ? <CheckCircle2 size={16} /> : renderMissionIcon(mission.icon || 'Target', 16)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-sm font-bold truncate ${done ? 'text-green-700 line-through' : 'text-gray-900'}`}>
                                                    {getTrans(mission.title, i18n.language)}
                                                </h4>
                                                <span className="text-[10px] text-gray-400">
                                                    {getMissionTypeLabel(mission.type)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-1 rounded-md">
                                                <Zap size={10} className="text-amber-500" />
                                                <span className="text-xs font-bold text-amber-600">+{mission.xp_reward}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                                <div
                                                    className={`h-1.5 rounded-full transition-all ${done ? 'bg-green-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400">{progress}/{target}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
                {/* Upcoming Sessions */}
                <div className={isInstructor ? "col-span-full" : "lg:col-span-7"}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-gray-900">{isInstructor ? t('dashboard.teaching_schedule') : t('dashboard.upcoming_sessions')}</h2>
                        <button
                            onClick={() => navigate('/sessions')}
                            className="text-blue-600 text-sm font-medium hover:underline"
                        >
                            {t('dashboard.view_all')}
                        </button>
                    </div>
                    <div className={isInstructor ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                        {upcomingSessions.length > 0 ? (
                            upcomingSessions.map((session, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => navigate('/sessions', { state: { sessionId: session.id } })}
                                    className={`group bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all flex flex-col md:flex-row items-center gap-4 cursor-pointer`}
                                >
                                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                                        <Clock className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                    </div>

                                    <div className="flex-1 min-w-0 text-center md:text-left">
                                        <h4 className="font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{getTrans(session.title, i18n.language)}</h4>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                            {isInstructor ? session.courseName : session.instructor}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-gray-100 pt-3 md:pt-0 mt-2 md:mt-0">
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t('dashboard.time_label')}</p>
                                            <p className="text-sm font-bold text-gray-700 font-mono">
                                                {session.startTime} - {session.endTime}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Badge variant={session.type === 'Live' ? 'green' : session.type === 'Workshop' ? 'purple' : 'blue'} className="px-3 py-1 text-xs">
                                                {session.type || 'Recorded'}
                                            </Badge>
                                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white text-gray-300 transition-all">
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-100">
                                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-400">{t('dashboard.no_sessions')}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Leaderboard - Only for Students */}
                {!isInstructor && (
                    <div className="lg:col-span-3">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">{t('nav.leaderboard')}</h2>
                        </div>
                        <Card className="p-0 overflow-hidden">
                            <div className="divide-y divide-gray-100">
                                {leaderboard.map((user, idx) => {
                                    const UserLevelIcon = user.level ? iconMap[user.level.icon] : Trophy;
                                    const userLevelColor = user.level?.color_hex || '#9CA3AF';

                                    return (
                                        <div
                                            key={idx}
                                            className={`grid grid-cols-[auto_1fr_auto] gap-4 items-center p-4 hover:bg-gray-50 transition-colors ${user.isMe ? 'bg-blue-50/50' : ''}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className={`w-6 text-sm font-bold text-center ${idx === 0 ? 'text-yellow-500' :
                                                    idx === 1 ? 'text-gray-400' :
                                                        idx === 2 ? 'text-amber-700' : 'text-gray-300'
                                                    }`}>
                                                    #{user.rank}
                                                </span>

                                                <div className="relative">
                                                    {user.avatar ? (
                                                        <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-gray-100" />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-200">
                                                            {user.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    {idx < 3 && (
                                                        <div className="absolute -top-1 -right-1 text-yellow-500">
                                                            <Crown className="w-3 h-3 fill-current" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="min-w-0">
                                                <p className={`text-sm font-medium truncate ${user.isMe ? 'text-blue-700 font-bold' : 'text-gray-900'}`}>
                                                    {user.isMe ? `${user.name} (${t('common.you')})` : user.name}
                                                </p>
                                                <p className="text-xs text-gray-400 truncate">
                                                    {user.xp} XP
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: `${userLevelColor}15` }}>
                                                <UserLevelIcon className="w-5 h-5" style={{ color: userLevelColor }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => navigate('/leaderboard')}
                                className="w-full p-4 text-center text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                                {t('dashboard.view_full_ranking')}
                            </button>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
};
