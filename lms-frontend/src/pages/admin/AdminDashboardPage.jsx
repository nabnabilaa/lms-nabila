import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AdminNavbar } from '../../components/layout/AdminNavbar';
import { AdminSidebar } from '../../components/admin/ui/AdminSidebar';
import { useUser } from '../../contexts/UserContext';
import { useUsersQuery } from '../../hooks/queries/useUser';
import { useCoursesQuery } from '../../hooks/queries/useCourses';
import { useAchievementsQuery } from '../../hooks/queries/useAchievements';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next'; // Import
import { getTrans } from '../../lib/transHelper';
import api from '../../services/api';
import { Users, BookOpen, Award, LayoutDashboard } from 'lucide-react';

// Tabs
import { CurriculumManager } from '../../components/admin/CurriculumManager';
import { UserManagement } from '../../components/admin/UserManagement';
import { GamificationTab } from '../../components/admin/GamificationTab';
import { AdminSettingsWrapper } from '../../components/admin/settings/AdminSettingsWrapper';
import { AdminMissionsPage } from './AdminMissionsPage';

export const AdminDashboardPage = () => {
    const { t, i18n } = useTranslation(); // Init
    const location = useLocation();
    const navigate = useNavigate();
    const { user, loading } = useUser();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // TanStack Query - cached data shown instantly, background refetch if stale
    const { data: allUsers = [] } = useUsersQuery();
    const { data: allCourses = [] } = useCoursesQuery();
    const { data: allAchievements = [] } = useAchievementsQuery();

    // Refresh function for CurriculumManager
    // Refresh function for CurriculumManager and others
    const refreshData = () => {
        queryClient.invalidateQueries({ queryKey: ['courses'] });
        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['achievements'] });
    };

    // Stats computed from cached data
    const stats = useMemo(() => ({
        totalStudents: allUsers.filter(u => u.role === 'learner').length,
        totalInstructors: allUsers.filter(u => u.role === 'instructor').length,
        totalCourses: allCourses.length
    }), [allUsers, allCourses]);

    useEffect(() => {
        if (location.state?.initialTab) {
            setActiveTab(location.state.initialTab);
        }
    }, [location]);

    // Fetch admin stats from API (real data)
    const { data: adminStats = {} } = useQuery({
        queryKey: ['adminStats'],
        queryFn: async () => {
            const res = await api.get('/admin/stats');
            return res.data;
        }
    });

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                // Calculate additional stats
                const totalEnrollments = adminStats.total_enrollments || 0;
                const totalModules = allCourses.reduce((sum, c) => sum + (c.modules?.length || 0), 0);
                const suspendedUsers = allUsers.filter(u => u.is_suspended).length;
                const adminAccounts = allUsers.filter(u => u.role === 'admin').length;
                const avgEnrollments = allCourses.length > 0 ? Math.round(totalEnrollments / allCourses.length) : 0;
                const totalContentDays = allCourses.reduce((sum, c) => {
                    const contents = c.modules?.flatMap(m => m.contents || []) || [];
                    return sum + contents.reduce((cs, content) => cs + Math.ceil((content.duration || 0) / 60), 0);
                }, 0);

                // Real monthly enrollment trend from API
                const monthlyTrend = adminStats.monthly_trend || [0, 0, 0, 0, 0, 0];

                // Determine trend direction (compare last 2 months)
                const lastMonth = monthlyTrend[monthlyTrend.length - 1] || 0;
                const prevMonth = monthlyTrend[monthlyTrend.length - 2] || 0;
                const isUpTrend = lastMonth >= prevMonth;
                const trendColor = isUpTrend ? '#22c55e' : '#ef4444'; // green or red
                const trendChange = Math.round(lastMonth - prevMonth);

                // Generate smooth sparkline path (Cubic Bezier)
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

                    // Control point calculation for smooth bezier
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

                // Students per bootcamp (top 3 for vertical bars)
                const studentsPerBootcamp = allCourses
                    .map(c => ({
                        name: (() => { const t = getTrans(c.title, i18n.language) || 'Untitled'; return t.substring(0, 10) + (t.length > 10 ? '...' : ''); })(),
                        count: c.enrollments_count || 0
                    }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 3);

                const maxStudents = Math.max(...studentsPerBootcamp.map(s => s.count), 1);

                return (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Header */}
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{t('admin.dashboard')}</h1>
                            <p className="text-gray-500 text-sm">{t('admin.overview_subtitle')}</p>
                        </div>

                        {/* Top Stats Row - 3 Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Total Siswa - Blue Gradient Card */}
                            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-sm">{t('admin.active_users')}</span>
                                </div>
                                <div className="mt-4">
                                    <p className="text-sm font-medium text-blue-100">{t('admin.total_students')}</p>
                                    <h2 className="text-4xl font-bold mt-2">{stats.totalStudents}</h2>
                                    <p className="text-xs text-blue-200 mt-4 flex items-center gap-1.5">
                                        <span className="px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-bold">{stats.totalStudents}</span>
                                        <span className="opacity-80">{t('admin.active_accounts_now')}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Bootcamp Aktif */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 mb-4">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-medium text-gray-500">{t('admin.active_bootcamps')}</p>
                                <h2 className="text-4xl font-bold text-gray-900 mt-2">{stats.totalCourses}</h2>
                                <p className="text-xs text-gray-400 mt-4">
                                    <span className="text-orange-500 font-bold">{totalModules} {t('admin.modules')}</span>
                                    <span className="ml-1">{t('admin.total_material')}</span>
                                </p>
                            </div>

                            {/* Total Enrollments with Dynamic Sparkline */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isUpTrend ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                    <BookOpen className={`w-6 h-6 ${!isUpTrend ? 'opacity-70' : ''}`} />
                                </div>
                                <p className="text-sm font-medium text-gray-500">{t('admin.total_enrollments')}</p>
                                <h2 className="text-4xl font-bold text-gray-900 mt-2">{totalEnrollments}</h2>
                                <p className="text-xs text-gray-400 mt-4 flex items-center gap-2 relative z-10">
                                    <span className={`px-2 py-1 rounded-md font-bold text-[10px] ${isUpTrend ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {isUpTrend ? '+' : ''}{trendChange}
                                    </span>
                                    <span className="text-gray-400">{t('admin.new_enrollments_month')}</span>
                                </p>
                                {/* Dynamic Sparkline Chart */}
                                <div className="absolute bottom-0 left-0 right-0 h-24 overflow-hidden">
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

                        {/* Second Row - Statistik Sistem & Jumlah Siswa per Bootcamp */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Statistik Sistem */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                                        <LayoutDashboard className="w-4 h-4" />
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-900">{t('admin.system_stats')}</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-4 rounded-xl text-center">
                                        <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-400">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900">{suspendedUsers}</p>
                                        <p className="text-xs text-gray-500 mt-1">{t('admin.suspended_users')}</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl text-center">
                                        <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-400">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900">{adminAccounts}</p>
                                        <p className="text-xs text-gray-500 mt-1">{t('admin.admin_accounts')}</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl text-center">
                                        <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-400">
                                            <BookOpen className="w-5 h-5" />
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900">{avgEnrollments}</p>
                                        <p className="text-xs text-gray-500 mt-1">{t('admin.avg_enrollments')}</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl text-center">
                                        <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-400">
                                            <LayoutDashboard className="w-5 h-5" />
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900">{totalContentDays}</p>
                                        <p className="text-xs text-gray-500 mt-1">{t('admin.total_content_days')}</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl text-center col-span-2">
                                        <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-400">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900">{stats.totalInstructors}</p>
                                        <p className="text-xs text-gray-500 mt-1">{t('admin.total_instructors')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Jumlah Siswa per Bootcamp - Pie Chart */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                                        <Award className="w-4 h-4" />
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-900">{t('admin.students_per_bootcamp')}</h3>
                                </div>
                                {(() => {
                                    const pieColors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
                                    const pieData = allCourses
                                        .map(c => ({
                                            name: getTrans(c.title, i18n.language) || 'Untitled',
                                            count: c.enrollments_count || 0
                                        }))
                                        .filter(d => d.count > 0)
                                        .sort((a, b) => b.count - a.count);

                                    const total = pieData.reduce((sum, d) => sum + d.count, 0);

                                    if (pieData.length === 0 || total === 0) {
                                        return <p className="text-gray-400 text-sm text-center py-8">Belum ada data enrollment</p>;
                                    }

                                    // Generate SVG arcs
                                    const cx = 140, cy = 140, r = 115, ir = 70; // outer radius, inner radius (donut)
                                    let cumulativeAngle = -90; // start from top

                                    const arcs = pieData.map((d, idx) => {
                                        const angle = (d.count / total) * 360;
                                        const startAngle = cumulativeAngle;
                                        const endAngle = cumulativeAngle + angle;
                                        cumulativeAngle = endAngle;

                                        const startRad = (startAngle * Math.PI) / 180;
                                        const endRad = (endAngle * Math.PI) / 180;

                                        const x1 = cx + r * Math.cos(startRad);
                                        const y1 = cy + r * Math.sin(startRad);
                                        const x2 = cx + r * Math.cos(endRad);
                                        const y2 = cy + r * Math.sin(endRad);

                                        const ix1 = cx + ir * Math.cos(endRad);
                                        const iy1 = cy + ir * Math.sin(endRad);
                                        const ix2 = cx + ir * Math.cos(startRad);
                                        const iy2 = cy + ir * Math.sin(startRad);

                                        const largeArc = angle > 180 ? 1 : 0;

                                        const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;

                                        return (
                                            <path
                                                key={idx}
                                                d={path}
                                                fill={pieColors[idx % pieColors.length]}
                                                className="transition-opacity hover:opacity-80 cursor-pointer"
                                            >
                                                <title>{d.name}: {d.count} siswa ({Math.round((d.count / total) * 100)}%)</title>
                                            </path>
                                        );
                                    });

                                    return (
                                        <div className="flex flex-col items-center gap-4">
                                            {/* Donut Chart */}
                                            <div className="relative">
                                                <svg width="280" height="280" viewBox="0 0 280 280">
                                                    {arcs}
                                                </svg>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="text-center">
                                                        <p className="text-3xl font-bold text-gray-900">{total}</p>
                                                        <p className="text-xs text-gray-400">Total</p>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Legend */}
                                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                                                {pieData.map((d, idx) => (
                                                    <div key={idx} className="flex items-center gap-1.5">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pieColors[idx % pieColors.length] }} />
                                                        <span className="text-[11px] text-gray-500 truncate max-w-[100px]" title={d.name}>
                                                            {d.name.length > 12 ? d.name.substring(0, 12) + '...' : d.name}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-700">{d.count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>


                    </div>
                );
            case 'curriculum':
                return (
                    <CurriculumManager
                        courses={allCourses}
                        users={allUsers}
                        onRefresh={refreshData}
                        onCertificateConfig={(courseId) => navigate(`/admin/certificates/builder?courseId=${courseId}`)}
                    />
                );
            case 'users':
                return <UserManagement globalUsers={allUsers} onUpdateUsers={() => queryClient.invalidateQueries({ queryKey: ['users'] })} />;
            case 'gamification':
                return <GamificationTab users={allUsers} achievements={allAchievements} onRefresh={refreshData} />;
            case 'missions':
                return <AdminMissionsPage />;
            case 'settings':
                return <AdminSettingsWrapper currentUser={user} />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-slate-900">
            <AdminNavbar
                user={user}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                onNavigate={(path) => navigate(path.startsWith('/') ? path : `/${path}`)}
            />

            <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 animate-in fade-in zoom-in-95 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                    {/* Sidebar */}
                    <AdminSidebar
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                    />

                    {/* Content Area */}
                    <div className="md:col-span-9 space-y-6">
                        {renderContent()}
                    </div>
                </div>
            </main>
        </div>
    );
};
