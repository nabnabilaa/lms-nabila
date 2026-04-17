import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Target, Zap, ArrowLeft, CheckCircle2, Clock, Star, Flame, Trophy,
    Lock, ChevronRight, RefreshCw, Calendar,
    Key, BookOpen, Gift, MessageCircle, Video,
    Rocket, Sparkles, Gamepad2, GraduationCap, Lightbulb, Pencil
} from 'lucide-react';
import api from '../services/api';
import { toast } from '../components/ui/Toast';
import { useTranslation } from 'react-i18next';
import { getTrans } from '../lib/transHelper';

const LUCIDE_ICON_MAP = {
    Target, Key, BookOpen, Gift, Flame, MessageCircle, Trophy, Video,
    Rocket, Star, Sparkles, Gamepad2, GraduationCap, Lightbulb, Pencil, Zap,
};

const renderMissionIcon = (iconName, size = 24, className = '') => {
    const IconComponent = LUCIDE_ICON_MAP[iconName];
    if (!IconComponent) return <Target size={size} className={className} />;
    return <IconComponent size={size} className={className} />;
};

export const MissionsPage = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [missions, setMissions] = useState([]);
    const [stats, setStats] = useState({ total_missions: 0, completed: 0, xp_earned_today: 0, completion_rate: 0 });
    const [overallStats, setOverallStats] = useState({ total_completed: 0, total_xp_earned: 0, mission_streak: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [claiming, setClaiming] = useState(null);

    const TYPE_TABS = [
        { key: 'all', label: t('missions.tab_all'), icon: Target },
        { key: 'daily', label: t('missions.tab_daily'), icon: RefreshCw },
        { key: 'weekly', label: t('missions.tab_weekly'), icon: Calendar },
        { key: 'special', label: t('missions.tab_special'), icon: Star },
    ];

    const ACTION_LABELS = {
        login: t('missions.action_login'),
        complete_lesson: t('missions.action_lesson'),
        complete_quiz: t('missions.action_quiz'),
        post_discussion: t('missions.action_discuss'),
        watch_session: t('missions.action_session'),
        manual: t('missions.action_claim'),
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [missionsRes, statsRes] = await Promise.all([
                api.get('/daily-missions/my'),
                api.get('/daily-missions/stats'),
            ]);
            setMissions(missionsRes.data.missions || []);
            setStats(missionsRes.data.stats || {});
            setOverallStats(statsRes.data || {});
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const filtered = activeTab === 'all' ? missions : missions.filter(m => m.type === activeTab);

    const handleClaim = async (mission) => {
        if (mission.is_completed || mission.action_type !== 'manual') return;
        setClaiming(mission.id);
        try {
            const res = await api.post(`/daily-missions/${mission.id}/progress`);
            toast.success(res.data.message);
            fetchData(); // Refresh
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed');
        } finally {
            setClaiming(null);
        }
    };

    const locale = i18n.language === 'en' ? 'en-US' : 'id-ID';

    const getMissionTypeLabel = (type) => {
        if (type === 'daily') return t('missions.daily').toUpperCase();
        if (type === 'weekly') return t('missions.weekly').toUpperCase();
        return t('missions.special').toUpperCase();
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Header */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
                    <div className="flex items-center gap-3 mb-6">
                        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <Target className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">{t('missions.title')}</h1>
                        </div>
                        <button onClick={fetchData} className="ml-auto p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <RefreshCw size={18} />
                        </button>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: t('missions.completed_today'), value: `${stats.completed}/${stats.total_missions}`, icon: CheckCircle2, color: 'bg-green-50 text-green-600' },
                            { label: t('missions.xp_today'), value: `+${stats.xp_earned_today}`, icon: Zap, color: 'bg-amber-50 text-amber-600' },
                            { label: t('missions.total_xp'), value: overallStats.total_xp_earned, icon: Star, color: 'bg-purple-50 text-purple-600' },
                            { label: t('missions.mission_streak'), value: `${overallStats.mission_streak} ${i18n.language === 'en' ? 'days' : 'hari'}`, icon: Flame, color: 'bg-orange-50 text-orange-600' },
                        ].map(stat => (
                            <div key={stat.label} className="bg-white border border-gray-100 shadow-sm rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`p-1.5 rounded-lg ${stat.color}`}>
                                        <stat.icon size={14} />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500">{stat.label}</span>
                                </div>
                                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-500">{t('missions.progress_today')}</span>
                            <span className="text-sm font-bold text-indigo-600">{stats.completion_rate}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3">
                            <div
                                className="bg-indigo-600 rounded-full h-3 transition-all duration-700 ease-out shadow-sm"
                                style={{ width: `${stats.completion_rate}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
                {/* Tabs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-white rounded-xl p-1.5 border border-gray-100 shadow-sm mb-6">
                    {TYPE_TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === tab.key
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <tab.icon size={16} className={activeTab === tab.key ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Missions List */}
                {loading ? (
                    <div className="text-center py-16">
                        <div className="animate-spin w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-4" />
                        <p className="text-gray-400 text-sm">{t('missions.loading')}</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                        <Target className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-400">{t('missions.no_missions')}</h3>
                        <p className="text-sm text-gray-400 mt-1">{t('missions.no_missions_category')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map(mission => {
                            const progress = mission.user_progress || 0;
                            const target = mission.action_target || 1;
                            const pct = Math.round((progress / target) * 100);
                            const isCompleted = mission.is_completed;
                            const isManual = mission.action_type === 'manual';

                            return (
                                <div
                                    key={mission.id}
                                    className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${isCompleted ? 'border-green-200 bg-green-50/30' : 'border-gray-100 hover:border-indigo-200 hover:shadow-md'
                                        }`}
                                >
                                    <div className="p-5">
                                        <div className="flex items-start gap-4">
                                            {/* Icon */}
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isCompleted ? 'bg-green-100' : 'bg-indigo-50'
                                                }`}>
                                                {isCompleted
                                                    ? <CheckCircle2 size={24} className="text-green-500" />
                                                    : renderMissionIcon(mission.icon || 'Target', 24, 'text-indigo-600')
                                                }
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className={`font-bold ${isCompleted ? 'text-green-700 line-through' : 'text-gray-900'}`}>
                                                        {getTrans(mission.title, i18n.language)}
                                                    </h3>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${mission.type === 'daily' ? 'bg-blue-100 text-blue-700' :
                                                        mission.type === 'weekly' ? 'bg-purple-100 text-purple-700' :
                                                            'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {getMissionTypeLabel(mission.type)}
                                                    </span>
                                                </div>

                                                {mission.description && (
                                                    <p className="text-sm text-gray-500 mb-3">{getTrans(mission.description, i18n.language)}</p>
                                                )}

                                                {/* Action Requirement */}
                                                <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {ACTION_LABELS[mission.action_type] || mission.action_type} • {target}x
                                                    </span>
                                                    {mission.expires_at && (
                                                        <span className="flex items-center gap-1">
                                                            📅 {t('missions.until', { date: new Date(mission.expires_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) })}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                                                        <div
                                                            className={`h-2.5 rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-indigo-500'
                                                                }`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-xs font-bold ${isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                                                        {progress}/{target}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Right: XP + Action */}
                                            <div className="flex flex-col items-end gap-3 flex-shrink-0">
                                                <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-lg">
                                                    <Zap size={14} className="text-amber-500" />
                                                    <span className="text-sm font-bold text-amber-600">+{mission.xp_reward} XP</span>
                                                </div>

                                                {isCompleted ? (
                                                    <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                                                        {t('missions.completed')}
                                                    </span>
                                                ) : isManual ? (
                                                    <button
                                                        onClick={() => handleClaim(mission)}
                                                        disabled={claiming === mission.id}
                                                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-sm"
                                                    >
                                                        {claiming === mission.id ? '...' : t('missions.claim')}
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg">
                                                        {t('missions.automatic')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Completed Achievement Banner */}
                {stats.completion_rate === 100 && stats.total_missions > 0 && (
                    <div className="mt-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white text-center">
                        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-90" />
                        <h3 className="text-xl font-bold">{t('missions.all_done_title')}</h3>
                        <p className="text-sm opacity-80 mt-1">{t('missions.all_done_subtitle')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MissionsPage;
