// Complete ProfilePage with Achievements System
// Extracted and enhanced from file.html
import { ArrowLeft, Mail, Calendar, MapPin, Award, BookOpen, Clock, Zap, Target, Shield, Flame, Camera, Mic, Play, AlignLeft, CheckCircle, Trophy, BarChart, Users, Star, GraduationCap, ArrowRight, BadgeCheck, Crown, User } from 'lucide-react';
import { Card, Badge, ProgressBar } from '../components/ui';
import { useTranslation } from 'react-i18next';
import { getTrans } from '../lib/transHelper';

export const ProfilePageComplete = ({ onNavigate, studentName = "Fandi Ahmad", userData, isInline = false }) => {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;

    // Icon Mapping
    const iconMap = {
        'Award': Award,
        'Shield': Shield,
        'Zap': Zap,
        'Star': Star,
        'Crown': Crown,
        'Trophy': Trophy
    };
    // ...
    // Determine Display Data
    const displayName = userData?.name || studentName;
    const title = userData?.title || 'Student Learner';

    // Level Data from Relationship
    const levelName = userData?.level?.name || 'Novice';
    const LevelIcon = iconMap[userData?.level?.icon] || Award;
    const levelColor = userData?.level?.color_hex || '#3B82F6';

    const xp = userData?.xp_points || 0;
    const bio = userData?.bio || t('profile.no_bio');
    const avatar = userData?.avatar;

    // Helper for initials
    const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    // Achievement Definitions (Static metadata)
    const achievementDefinitions = [
        {
            id: 1,
            title: "Fast Learner",
            description: { id: "Selesaikan 5 modul dalam 1 hari", en: "Complete 5 modules in 1 day" },
            icon: Zap,
            color: "blue",
            progress: 100 // Default or calculated
        },
        {
            id: 2,
            title: "Course Master",
            description: { id: "Selesaikan 1 kursus penuh", en: "Complete 1 full course" },
            icon: Trophy,
            color: "emerald",
            progress: 80
        },
        {
            id: 3,
            title: "Streak Legend",
            description: { id: "Belajar 30 hari beruntun", en: "Study for 30 consecutive days" },
            icon: Flame,
            color: "orange",
            progress: 23
        },
        {
            id: 4,
            title: "Perfect Score",
            description: { id: "Dapatkan nilai 100 di 1 modul", en: "Get a perfect score in 1 module" },
            icon: Star,
            color: "yellow",
            progress: 0
        },
        {
            id: 5,
            title: "Knowledge Seeker",
            description: { id: "Selesaikan 50 modul pembelajaran", en: "Complete 50 learning modules" },
            icon: BookOpen,
            color: "purple",
            progress: 24
        },
        {
            id: 6,
            title: "Early Bird",
            description: { id: "Mulai belajar sebelum jam 7 pagi", en: "Start studying before 7 AM" },
            icon: Award,
            color: "green",
            progress: 100
        }
    ];

    // ... (achievements logic)

    const achievements = achievementDefinitions.map(def => {
        const unlocked = userData?.achievements?.some(ua => {
            const uaTitle = typeof ua.title === 'string' ? ua.title : getTrans(ua.title, 'en');
            return uaTitle === def.title;
        });
        return {
            ...def,
            unlocked: unlocked,
            // If unlocked, progress is 100%. If not, use placeholder or 0.
            progress: unlocked ? 100 : def.progress
        };
    });

    const isInstructor = userData?.role === 'instructor';
    const isAdmin = userData?.role === 'admin';

    return (
        <div className={isInline ? "space-y-8" : "space-y-8 pb-12"}>
            {/* Back Button */}
            {!isInline && (
                <button
                    onClick={() => onNavigate('dashboard')}
                    className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 group transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    {t('profile.back_to_dashboard')}
                </button>
            )}

            {/* Profile Header Card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
                {/* Decorative Background */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none" />

                {/* Avatar */}
                <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-600 border-4 border-white shadow-md relative z-10 overflow-hidden">
                    {avatar ? (
                        <img
                            src={avatar.includes('http') ? avatar : `http://127.0.0.1:8000/storage/${avatar}`}
                            alt={displayName}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        initials
                    )}
                </div>

                {/* Profile Info */}
                <div className="text-center sm:text-left flex-1 relative z-10">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center justify-center sm:justify-start gap-2">
                        {displayName}
                        {isInstructor && <BadgeCheck className="w-6 h-6 text-blue-500 fill-blue-50" />}
                    </h1>
                    <p className="text-gray-500 font-medium">
                        {isAdmin ? (
                            'Administrator • System Admin'
                        ) : isInstructor ? (
                            <>
                                {title === 'Student Learner' ? 'Instructor' : title}
                                <span className="flex items-center gap-1">
                                    • {t('profile.verified_instructor')}
                                </span>
                            </>
                        ) : (
                            `${title} • ${levelName} ${t('profile.member_label')}`
                        )}
                    </p>
                    {userData?.bio && (
                        <p className="text-gray-400 text-sm mt-2 max-w-xl">{userData.bio}</p>
                    )}

                    <div className="flex items-center justify-center sm:justify-start gap-4 mt-4">
                        <button
                            onClick={() => onNavigate('profile/edit')}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                        >
                            {t('profile.edit_profile')}
                        </button>
                        <button
                            onClick={() => onNavigate('profile/security')}
                            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                            <Shield className="w-4 h-4" /> {t('profile.security')}
                        </button>
                        {!isInstructor && !isAdmin && (
                            <button
                                onClick={() => onNavigate('certificates')}
                                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <Award className="w-4 h-4" /> {t('profile.certificates')}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Cards - HIDDEN FOR ADMINS */}
            {!isAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {isInstructor ? (
                        // INSTRUCTOR STATS CARDS
                        <>
                            <Card className="flex items-center gap-4 hover:border-blue-200 transition-colors group">
                                <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                                    <User className="text-blue-600 w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('profile.total_students')}</p>
                                    <p className="text-2xl font-bold text-gray-900">{userData?.stats?.total_students || 0}</p>
                                </div>
                            </Card>
                            <Card className="flex items-center gap-4 hover:border-emerald-200 transition-colors group">
                                <div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
                                    <BookOpen className="text-emerald-600 w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('profile.total_classes')}</p>
                                    <p className="text-2xl font-bold text-gray-900">{userData?.stats?.total_courses || 0}</p>
                                </div>
                            </Card>
                            <Card className="flex items-center gap-4 hover:border-orange-200 transition-colors group">
                                <div className="p-3 bg-orange-50 rounded-xl group-hover:bg-orange-100 transition-colors">
                                    <Star className="text-orange-500 w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('profile.avg_rating')}</p>
                                    <p className="text-2xl font-bold text-gray-900">{userData?.stats?.average_rating || 0}/5</p>
                                </div>
                            </Card>
                        </>
                    ) : (
                        // STUDENT STATS CARDS
                        <>
                            <Card className="flex items-center gap-4 hover:border-blue-200 transition-colors group">
                                <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                                    <Star className="text-blue-600 w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('profile.total_xp')}</p>
                                    <p className="text-2xl font-bold text-gray-900">{xp.toLocaleString()}</p>
                                </div>
                            </Card>

                            <Card className="flex items-center gap-4 hover:border-emerald-200 transition-colors group">
                                <div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors" style={{ backgroundColor: `${levelColor}20` }}>
                                    <LevelIcon className="w-6 h-6" style={{ color: levelColor }} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('profile.current_level')}</p>
                                    <p className="text-2xl font-bold text-gray-900">{levelName}</p>
                                </div>
                            </Card>

                            <Card className="flex items-center gap-4 hover:border-orange-200 transition-colors group">
                                <div className="p-3 bg-orange-50 rounded-xl group-hover:bg-orange-100 transition-colors">
                                    <Flame className="text-orange-500 w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('profile.day_streak')}</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {userData?.stats?.daily_streak || 0} {t('common.days')}
                                    </p>
                                </div>
                            </Card>
                        </>
                    )}
                </div>
            )}

            {/* Achievements & Badges - HIDDEN FOR INSTRUCTORS AND ADMINS */}
            {!isInstructor && !isAdmin && (
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Award className="w-5 h-5 text-blue-600" />
                        {t('profile.achievements_badges')}
                    </h3>

                    {/* Dynamic badges from API */}
                    {userData?.achievements && userData.achievements.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            {userData.achievements.map((badge) => {
                                const IconComponent = iconMap[badge.icon] || Award;
                                const badgeColor = badge.badge_url || 'blue';

                                const colorMap = {
                                    blue: 'bg-blue-500',
                                    emerald: 'bg-emerald-500',
                                    orange: 'bg-orange-500',
                                    yellow: 'bg-yellow-500',
                                    purple: 'bg-purple-500',
                                    green: 'bg-green-500',
                                };

                                return (
                                    <div
                                        key={badge.id}
                                        className={`p-4 rounded-xl border shadow-sm flex items-center gap-4 group transition-all bg-white border-${badgeColor}-200 hover:shadow-md`}
                                    >
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-${badgeColor}-100 text-${badgeColor}-600 group-hover:scale-110 transition-transform`}>
                                            <IconComponent className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900">
                                                {getTrans(badge.title, lang)}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {getTrans(badge.description, lang)}
                                            </p>
                                            <Badge variant={badgeColor} className="mt-2 inline-block">
                                                {t('profile.unlocked')}
                                            </Badge>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Static achievement definitions (progress-based) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {achievements.filter(a => !a.unlocked).map((achievement) => {
                            const Icon = achievement.icon;

                            const colorMap = {
                                blue: 'bg-blue-500',
                                emerald: 'bg-emerald-500',
                                orange: 'bg-orange-500',
                                yellow: 'bg-yellow-500',
                                purple: 'bg-purple-500',
                                green: 'bg-green-500',
                            };

                            const progressBarColor = colorMap[achievement.color] || 'bg-blue-500';

                            return (
                                <div
                                    key={achievement.id}
                                    className="p-4 rounded-xl border shadow-sm flex items-center gap-4 group transition-all bg-gray-50 border-gray-200 opacity-70 grayscale hover:grayscale-0 hover:opacity-100"
                                >
                                    {/* Icon */}
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-200 text-gray-400 transition-transform">
                                        <Icon className="w-6 h-6" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-500">
                                            {achievement.title}
                                        </h4>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {getTrans(achievement.description, lang)}
                                        </p>

                                        <div className="mt-2">
                                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                <span>{t('profile.locked')}</span>
                                                <span>{achievement.progress}%</span>
                                            </div>
                                            <ProgressBar
                                                progress={achievement.progress}
                                                color={progressBarColor}
                                                height="h-1.5"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Statistics Section - HIDDEN FOR ADMINS */}
            {!isAdmin && (
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                        {isInstructor ? t('profile.teaching_stats') : t('profile.learning_stats')}
                    </h3>
                    <Card>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {isInstructor ? (
                                // INSTRUCTOR STATS
                                <>
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-blue-600">
                                            {userData?.stats?.total_courses || 0}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">{t('profile.classes_done')}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-emerald-600">
                                            {userData?.stats?.average_rating || 0}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">{t('profile.rating')}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-orange-600">
                                            {userData?.stats?.teaching_hours || 0}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">{t('profile.teaching_hours')}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-purple-600">
                                            {userData?.stats?.certificates_issued || 0}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">{t('profile.certs_issued')}</p>
                                    </div>
                                </>
                            ) : (
                                // STUDENT STATS
                                <>
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-blue-600">
                                            {userData?.stats?.modules_completed || 0}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">{t('profile.modules_completed')}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-emerald-600">
                                            {userData?.stats?.average_score || 0}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">{t('profile.avg_score')}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-orange-600">
                                            {userData?.stats?.learning_hours || 0}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">{t('profile.learning_hours')}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-purple-600">
                                            {userData?.stats?.certificates_count || 0}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">{t('profile.certificates')}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

// Placeholder: CertificatesPage
export const CertificatesPage = ({ onNavigate }) => {
    const { t } = useTranslation();
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">{t('certificates.title')}</h1>
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Award className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">{t('certificates.no_certificates')}</h3>
                <p className="text-gray-500 mb-6">{t('certificates.no_certificates_desc')}</p>
                <button
                    onClick={() => onNavigate && onNavigate('certificate-generator')}
                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
                >
                    {t('certificates.view_details')}
                </button>
            </div>
        </div>
    );
};

// Placeholder: LeaderboardPage
export const LeaderboardPage = ({ onNavigate }) => {
    const { t } = useTranslation();
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">{t('nav.leaderboard')}</h1>
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Trophy className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">{t('common.coming_soon')}</h3>
                <p className="text-gray-500">{t('common.feature_in_development')}</p>
            </div>
        </div>
    );
};
