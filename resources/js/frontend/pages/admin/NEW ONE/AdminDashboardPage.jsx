import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Users, BookOpen, Award, Bell } from 'lucide-react';
import { AdminNavbar } from '../../components/admin/layout/AdminNavbar'; // Adjust path if needed
import { AdminSidebar } from '../../components/admin/ui/AdminSidebar';
import { Card } from '../../components/ui/Card';
import { showToast } from '../../components/ui/Toast'; // NEW
import api from '../../services/api';

// Sub-components
import { CurriculumManager } from '../../components/admin/CurriculumManager';
import { UserManagement } from '../../components/admin/UserManagement';
import { GamificationTab } from '../../components/admin/GamificationTab';
import { AdminSettingsWrapper } from '../../components/admin/settings/AdminSettingsWrapper'; // Optional if implemented
import { AdminCertificateBuilder } from './AdminCertificateBuilder';

export const AdminDashboardPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');

    // Core Data State
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalCourses: 0,
        totalCertificates: 0,
        pendingApprovals: 0
    });
    const [globalState, setGlobalState] = useState({
        courses: [],
        users: []
    });
    const [achievements, setAchievements] = useState([]); // Mock achievements for now

    // View Mode State
    const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' or 'certificate-builder'
    const [selectedCourseId, setSelectedCourseId] = useState(null);

    const [loading, setLoading] = useState(true);

    // Initial Tab from Navigation State
    useEffect(() => {
        if (location.state?.initialTab) {
            setActiveTab(location.state.initialTab);
        }
    }, [location.state]);

    const handleCertificateConfig = (courseId) => {
        setSelectedCourseId(courseId);
        setViewMode('certificate-builder');
    };

    const handleBackToDashboard = () => {
        setViewMode('dashboard');
        setSelectedCourseId(null);
    };

    const fetchUsers = async () => {
        try {
            const userRes = await api.get('/users');
            setGlobalState(prev => ({ ...prev, users: userRes.data || [] }));
            return userRes.data || [];
        } catch (error) {
            console.error("Failed to fetch users", error);
            return [];
        }
    };

    const fetchAchievements = async () => {
        try {
            const res = await api.get('/achievements');
            setAchievements(res.data || []);
        } catch (error) {
            console.error("Failed to fetch achievements", error);
        }
    };

    const refreshData = async () => {
        await Promise.all([fetchUsers(), fetchAchievements()]);
    };

    const fetchStats = async () => {
        try {
            setLoading(true);
            // Parallel Fetching
            const [users, courseRes] = await Promise.all([
                fetchUsers(),
                api.get('/courses')
            ]);

            // fetchAchievements is called in refreshData, but for initial load:
            await fetchAchievements();

            // Set Courses (Users set in fetchUsers)
            setGlobalState(prev => ({
                ...prev,
                courses: courseRes.data || []
            }));

            // Simple Counts
            setStats({
                totalUsers: users.length,
                totalCourses: (courseRes.data || []).length,
                totalCertificates: 154, // Mock
                pendingApprovals: 3
            });
        } catch (error) {
            console.error("Failed to fetch admin stats", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const onUpdateUsers = (updatedUsers) => {
        setGlobalState(prev => ({ ...prev, users: updatedUsers }));
    };

    const renderContent = () => {
        if (viewMode === 'certificate-builder') {
            const selectedCourse = globalState.courses.find(c => c.id === selectedCourseId);
            return (
                <AdminCertificateBuilder
                    course={selectedCourse}
                    onSave={() => { showToast('Saved!', 'success'); handleBackToDashboard(); }} // Implement actual save later if needed
                    onCancel={handleBackToDashboard}
                    userRole="admin"
                />
            );
        }

        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Card className="bg-white border-l-4 border-l-blue-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Users</p>
                                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalUsers}</h3>
                                    </div>
                                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                                        <Users className="w-6 h-6" />
                                    </div>
                                </div>
                            </Card>
                            <Card className="bg-white border-l-4 border-l-purple-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Courses</p>
                                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalCourses}</h3>
                                    </div>
                                    <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                                        <BookOpen className="w-6 h-6" />
                                    </div>
                                </div>
                            </Card>
                            <Card className="bg-white border-l-4 border-l-emerald-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Certificates Issued</p>
                                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalCertificates}</h3>
                                    </div>
                                    <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                                        <Award className="w-6 h-6" />
                                    </div>
                                </div>
                            </Card>
                            <Card className="bg-white border-l-4 border-l-amber-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Pending Approvals</p>
                                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingApprovals}</h3>
                                    </div>
                                    <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
                                        <Bell className="w-6 h-6" />
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Recent Activity or Charts could go here */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <h3 className="font-bold text-gray-900 mb-4">Recent Registrations</h3>
                                <p className="text-gray-500 text-sm">No recent data available.</p>
                            </Card>
                            <Card>
                                <h3 className="font-bold text-gray-900 mb-4">Popular Courses</h3>
                                <p className="text-gray-500 text-sm">No recent data available.</p>
                            </Card>
                        </div>
                    </div>
                );
            case 'users':
                return <UserManagement globalUsers={globalState.users} onUpdateUsers={onUpdateUsers} />;
            case 'curriculum':
                // Note: CurriculumManager expects globalState with 'courses' and setGlobalState to update them
                return <CurriculumManager globalState={globalState} setGlobalState={setGlobalState} onCertificateConfig={handleCertificateConfig} />;
            case 'gamification':
                return <GamificationTab users={globalState.users} achievements={achievements} onUpdateAchievements={setAchievements} onUpdateUsers={onUpdateUsers} onRefresh={refreshData} />;
            case 'settings':
                return <div className="bg-white p-6 rounded-xl border border-gray-200">Admin Settings Placeholder</div>;
            default:
                return <div>Select a tab</div>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Admin Navbar */}
            <AdminNavbar user={{ name: 'Admin User', role: 'admin' }} onNavigate={navigate} />

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">

                    {/* Sidebar */}
                    <AdminSidebar
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        isOpen={false} // Manage mobile state if needed
                        onClose={() => { }}
                    />

                    {/* Main Content Area */}
                    <div className="md:col-span-9 lg:col-span-9">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-gray-900 capitalize">
                                {activeTab === 'overview' ? 'Dashboard Overview' :
                                    activeTab === 'gamification' ? 'XP & Badges' :
                                        activeTab.replace('-', ' ')}
                            </h1>
                            {activeTab !== 'gamification' && (
                                <p className="text-gray-500">Manage your platform efficiently.</p>
                            )}
                        </div>

                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};
