import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Upload, User, Loader2, Trash2, Shield, BookOpen, Users, Star, Award, CheckCircle, Zap, Crown, Flame, Trophy, Clock } from 'lucide-react';
import { authService } from '../services/authService';
import { courseService } from '../services/courseService';
import { toast } from '../components/ui/Toast';
import { ImageCropperModal } from '../components/ui';
import { useUser } from '../contexts/UserContext';
import { useAchievementsQuery } from '../hooks/queries/useAchievements';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useTranslation } from 'react-i18next';

export const EditProfilePage = ({ onNavigateBack, isInline = false }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const { user: currentUser, refreshUser, loading: contextLoading } = useUser();

    // Local loading state for actions
    const [isActionLoading, setIsActionLoading] = useState(false);
    // Combined loading state
    const isLoading = contextLoading || isActionLoading;

    const [userData, setUserData] = useState(null);
    const [courses, setCourses] = useState([]);

    // Fetch all available achievements for "Locked/Unlocked" comparison
    const { data: allAchievements = [] } = useAchievementsQuery();

    // Icon Mapping for Levels (Synced with Dashboard)
    const iconMap = {
        'Award': Award,
        'Shield': Shield,
        'Zap': Zap,
        'Star': Star,
        'Crown': Crown,
        'Trophy': Trophy
    };

    // Stats for Instructor
    const [instructorStats, setInstructorStats] = useState({
        students: 0,
        courses: 0,
        rating: 0,
        certificates: 0,
        hours: 0,
        completed: 0
    });

    // Stats for Student
    const [studentStats, setStudentStats] = useState({
        completed: 0,
        active: 0,
        totalHours: 0,
        avgScore: 0,
        badges: [] // Dynamic badges array
    });

    const isEditMode = location.pathname.includes('/edit');
    const isInstructor = userData?.role === 'instructor';

    // Determining if we should show the Overview or the Form
    const showOverview = !isEditMode && !isInline && userData;

    const [previewUrl, setPreviewUrl] = useState(null);
    const [cropper, setCropper] = useState({ isOpen: false, file: null });

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        actionType: null,
        message: ''
    });

    const [formData, setFormData] = useState({
        name: '',
        heading: '',
        title: '',
        bio: '',
        email: '',
        avatar: null
    });

    // Helper to Generate Badges based on Real DB Data
    const generateBadges = (userAchievements, allAchievements) => {
        if (!allAchievements.length) return [];

        return allAchievements.map(achievement => {
            const owned = userAchievements.find(ua => ua.id === achievement.id);
            const isUnlocked = !!owned;
            const IconComponent = iconMap[achievement.icon] || Trophy;
            const colorName = achievement.badge_url || 'blue';
            const colorClass = `text-${colorName}-500`;

            return {
                name: achievement.title,
                desc: achievement.description,
                target: achievement.criteria_value || 1,
                current: isUnlocked ? (achievement.criteria_value || 1) : 0,
                progress: isUnlocked ? 100 : 0,
                icon: IconComponent,
                color: colorClass,
                isUnlocked: isUnlocked
            };
        });
    };

    // Update local state when context user changes
    useEffect(() => {
        if (currentUser) {
            setUserData(currentUser);
            setFormData({
                name: currentUser.name || '',
                title: currentUser.title || '',
                bio: currentUser.bio || '',
                email: currentUser.email || '',
                avatar: null
            });
            if (currentUser.avatar) {
                setPreviewUrl(currentUser.avatar.includes('http') ? currentUser.avatar : `http://127.0.0.1:8000/storage/${currentUser.avatar}`);
            }

            const backendStats = currentUser.stats || {};

            if (currentUser.role === 'instructor') {
                setInstructorStats({
                    students: backendStats.total_students || 0,
                    courses: backendStats.total_courses || 0,
                    rating: backendStats.average_rating || 0,
                    certificates: backendStats.certificates_issued || 0,
                    hours: backendStats.teaching_hours || 0,
                    completed: backendStats.active_classes || 0
                });
            } else {
                const dynamicBadges = generateBadges(
                    currentUser.achievements || [],
                    allAchievements
                );

                setStudentStats({
                    completed: backendStats.modules_completed || 0,
                    active: backendStats.modules_this_week || 0,
                    totalHours: backendStats.learning_hours || 0,
                    avgScore: backendStats.user_average_score || 0,
                    badges: dynamicBadges
                });
            }
        }
    }, [currentUser, allAchievements]);

    const handleBack = () => {
        if (isInline && onNavigateBack) {
            onNavigateBack();
        } else {
            navigate('/profile');
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.addEventListener('load', () => setCropper({ isOpen: true, file: reader.result }));
            reader.readAsDataURL(file);
            e.target.value = null;
        }
    };

    const handleCropSave = async (croppedBlob) => {
        setIsActionLoading(true);
        try {
            const data = new FormData();
            data.append('avatar', croppedBlob, 'avatar.jpg');
            data.append('name', formData.name);
            data.append('email', formData.email);

            const response = await authService.updateProfile(data);
            toast.success(t('profile.avatar_updated'));
            setPreviewUrl(URL.createObjectURL(croppedBlob));
            setCropper({ isOpen: false, file: null });
            refreshUser();
            setUserData(prev => ({ ...prev, avatar: response.user.avatar }));
        } catch (error) {
            console.error('Avatar upload failed:', error);
            toast.error(t('profile.avatar_failed'));
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('title', formData.title);
            data.append('bio', formData.bio);
            data.append('email', formData.email);

            const response = await authService.updateProfile(data);
            toast.success(t('profile.profile_updated'));
            refreshUser();
            setTimeout(() => navigate('/profile'), 1000);
        } catch (error) {
            toast.error(t('profile.profile_failed'));
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteAvatarClick = () => {
        setConfirmModal({
            isOpen: true,
            actionType: 'delete_avatar',
            message: t('profile.delete_avatar_confirm')
        });
    };

    const handleDeleteAvatar = async () => {
        setIsActionLoading(true);
        try {
            const data = new FormData();
            data.append('delete_avatar', '1');
            data.append('name', formData.name);
            data.append('email', formData.email);
            const response = await authService.updateProfile(data);
            toast.success(t('profile.avatar_deleted'));
            setPreviewUrl(null);
            setFormData(prev => ({ ...prev, avatar: null }));
            refreshUser();
        } catch (error) {
            toast.error(t('profile.avatar_delete_failed'));
        } finally {
            setIsActionLoading(false);
        }

    };

    const handleConfirmAction = () => {
        if (confirmModal.actionType === 'delete_avatar') {
            handleDeleteAvatar();
        }
    };

    // --- STUDENT STATS GETTER ---
    const getStudentStatsDisplay = () => {
        const stats = userData?.stats || {};
        const streak = stats.daily_streak || 0;
        const levelName = userData?.level?.name || 'Novice';
        const levelIconName = userData?.level?.icon || 'Trophy';
        const LevelIcon = iconMap[levelIconName] || Trophy;
        const levelColor = userData?.level?.color_hex || '#3b82f6';
        const xp = userData?.xp_points || 0;

        return { streak, levelName, LevelIcon, levelColor, xp };
    };

    const studentData = getStudentStatsDisplay();

    // RENDER: OVERVIEW (Instructor OR Student)
    if (showOverview) {
        return (
            <div className="max-w-6xl mx-auto py-8 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Back Button for non-inline view */}
                {!isInline && (
                    <button
                        onClick={() => navigate(isInstructor ? '/instructor/dashboard' : '/')}
                        className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 group transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        {t('profile.back_to_dashboard')}
                    </button>
                )}

                {/* 1. Header Card (Shared Structure) */}
                <div className="bg-white rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm border border-gray-100 relative overflow-hidden">
                    {/* Background Deco (Student Only) */}
                    {!isInstructor && <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none"></div>}

                    <div className="relative z-10">
                        <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 shadow-inner ${isInstructor ? 'border-blue-50' : 'border-blue-100'}`}>
                            {previewUrl ? (
                                <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center font-bold text-3xl ${isInstructor ? 'bg-blue-100 text-blue-600' : 'bg-blue-50 text-blue-500'}`}>
                                    {(userData.name || 'User').charAt(0)}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-center md:text-left flex-1 z-10">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{userData.name}</h1>
                            {isInstructor && <CheckCircle className="w-6 h-6 text-blue-500 fill-blue-50" />}
                        </div>
                        <p className="text-gray-500 font-medium mb-6">
                            {isInstructor ? t('profile.verified_instructor') : `${t('profile.student_label')} ${studentData.levelName} ${t('profile.member_label')}`}
                        </p>

                        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                            <button
                                onClick={() => navigate('/profile/edit')}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-200"
                            >
                                {t('profile.edit_profile')}
                            </button>
                            <button
                                onClick={() => navigate('/settings/security')}
                                className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <Shield className="w-4 h-4" />
                                {t('profile.security')}
                            </button>
                            {!isInstructor && (
                                <button
                                    onClick={() => navigate('/certificates')}
                                    className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                                >
                                    <Award className="w-4 h-4" />
                                    {t('profile.certificates')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Main Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {isInstructor ? (
                        <>
                            <StatsCard icon={Users} color="blue" label={t('profile.total_students')} value={instructorStats.students} />
                            <StatsCard icon={BookOpen} color="emerald" label={t('profile.total_classes')} value={instructorStats.courses} />
                            <StatsCard icon={Star} color="orange" label={t('profile.avg_rating')} value={`${instructorStats.rating}/5`} />
                        </>
                    ) : (
                        <>
                            <StatsCard icon={Star} color="blue" label={t('profile.total_xp')} value={studentData.xp.toLocaleString()} />
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
                                <div className="absolute right-0 top-0 p-4 opacity-10">
                                    <studentData.LevelIcon className="w-24 h-24" style={{ color: studentData.levelColor }} />
                                </div>
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center relative z-10" style={{ backgroundColor: `${studentData.levelColor}20` }}>
                                    <studentData.LevelIcon className="w-6 h-6" style={{ color: studentData.levelColor }} />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-sm text-gray-500 font-medium">{t('profile.current_level')}</p>
                                    <h3 className="text-2xl font-bold text-gray-900">{studentData.levelName}</h3>
                                </div>
                            </div>
                            <StatsCard icon={Flame} color="orange" label={t('profile.day_streak')} value={`${studentData.streak} ${i18n.language === 'en' ? 'Days' : 'Hari'}`} />
                        </>
                    )}
                </div>

                {/* 3. Detailed Stats / Badges */}
                {isInstructor ? (
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg mb-4">{t('profile.teaching_stats')}</h3>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-gray-100">
                                <DetailStat label={t('profile.classes_done')} value={instructorStats.completed} color="text-blue-600" />
                                <DetailStat label={t('profile.rating')} value={instructorStats.rating} color="text-emerald-600" />
                                <DetailStat label={t('profile.teaching_hours')} value={instructorStats.hours} color="text-orange-600" />
                                <DetailStat label={t('profile.certs_issued')} value={instructorStats.certificates} color="text-purple-600" noBorder />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Award className="w-5 h-5 text-blue-600" />
                            <h3 className="font-bold text-gray-900 text-lg">{t('profile.achievements_badges')}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {studentStats.badges && studentStats.badges.map((badge, idx) => {
                                const isUnlocked = badge.progress >= 100;

                                return (
                                    <div key={idx} className={`bg-white p-5 rounded-2xl border transition-all ${isUnlocked ? 'border-blue-100 shadow-md ring-1 ring-blue-50' : 'border-gray-100 opacity-80 decoration-slate-900'}`}>
                                        <div className="flex gap-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isUnlocked ? 'bg-blue-50' : 'bg-gray-50 grayscale'}`}>
                                                <badge.icon className={`w-5 h-5 ${isUnlocked ? badge.color : 'text-gray-400'}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h4 className={`font-bold text-sm ${isUnlocked ? 'text-gray-900' : 'text-gray-600'}`}>{badge.name}</h4>
                                                    {!isUnlocked && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{t('profile.locked')}</span>}
                                                </div>
                                                <p className="text-xs text-gray-500 mb-2 truncate">{badge.desc}</p>
                                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${isUnlocked ? 'bg-blue-500' : 'bg-gray-300'}`}
                                                        style={{ width: `${badge.progress}%` }}
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between mt-1">
                                                    <p className="text-[10px] text-gray-400">{badge.current}/{badge.target}</p>
                                                    <p className="text-[10px] text-gray-400">{badge.progress}%</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Student Learning Stats */}
                        <div className="mt-8">
                            <h3 className="font-bold text-gray-900 text-lg mb-4">{t('profile.learning_stats')}</h3>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-gray-100">
                                    <DetailStat label={t('profile.classes_done')} value={studentStats.completed} color="text-blue-600" />
                                    <DetailStat label={t('profile.active_classes')} value={studentStats.active} color="text-emerald-600" />
                                    <DetailStat label={t('profile.learning_hours')} value={studentStats.totalHours} color="text-orange-600" />
                                    <DetailStat label={t('profile.avg_score')} value={studentStats.avgScore} color="text-purple-600" noBorder />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Loading Fallback
    if (!userData && !isEditMode && !isInline) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    // RENDER: EDIT FORM (Only if /edit or inline)
    return (
        <div className={isInline ? "w-full" : "max-w-2xl mx-auto pb-12"}>
            {!isInline && (
                <button
                    onClick={() => navigate('/profile')}
                    className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 group transition-colors mb-6"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    {t('profile.back_to_profile')}
                </button>
            )}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in slide-in-from-right-4 duration-300">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <h1 className="text-xl font-bold text-gray-900">{t('profile.edit_profile')}</h1>
                    <p className="text-sm text-gray-500">{t('profile.edit_subtitle')}</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-10 h-10 text-gray-400" />
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-sm" title={t('profile.upload_photo')}>
                                <Upload className="w-4 h-4" />
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            </label>
                            {previewUrl && (
                                <button type="button" onClick={handleDeleteAvatarClick} className="absolute bottom-0 -left-2 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200 transition-colors shadow-sm">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-gray-500">{t('profile.avatar_hint')}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.full_name')}</label>
                            <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.title_job')}</label>
                            <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.email')}</label>
                            <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed focus:outline-none" readOnly />
                            <p className="text-xs text-gray-400 mt-1">{t('profile.email_readonly')}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.short_bio')}</label>
                            <textarea rows={4} value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none" />
                        </div>
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                        <button type="button" onClick={handleBack} className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition-colors">{t('common.cancel')}</button>
                        <button type="submit" disabled={isLoading} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-sm shadow-blue-200">
                            {isLoading ? (<><Loader2 className="w-4 h-4 animate-spin" />{t('common.saving')}</>) : (<><Save className="w-4 h-4" />{t('profile.save_changes')}</>)}
                        </button>
                    </div>
                </form>
            </div>
            {cropper.isOpen && (<ImageCropperModal imageSrc={cropper.file} onCancel={() => setCropper({ isOpen: false, file: null })} onSave={handleCropSave} isLoading={isLoading} />)}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleConfirmAction}
                message={confirmModal.message}
                variant="danger"
            />
        </div>
    );
};

// Sub-components for cleaner render
const StatsCard = ({ icon: Icon, color, label, value }) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        orange: 'bg-orange-50 text-orange-600',
        purple: 'bg-purple-50 text-purple-600'
    };
    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color] || colorClasses.blue}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">{label}</p>
                <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            </div>
        </div>
    );
};

const DetailStat = ({ label, value, color, noBorder }) => (
    <div className={`space-y-1 ${!noBorder ? 'md:border-r border-gray-100' : ''}`}>
        <h4 className={`text-3xl font-bold ${color}`}>{value}</h4>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
    </div>
);
