import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { authService } from './services/authService'
import { Navbar } from './components/layout/Navbar'
import { UserProvider, useUser } from './contexts/UserContext'
import { ToastContainer } from './components/ui/Toast'

// Pages
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { CoursesPage } from './pages/CoursesPage'
import { CourseDetailPage } from './pages/CourseDetailPage'
import { LessonPlayerPage } from './pages/LessonPlayerPage'
import { SessionsPage } from './pages/SessionsPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { CertificatesPage } from './pages/CertificatesPage'
import { CertificateGeneratorPage } from './pages/CertificateGeneratorPage'
import { CertificatePrintPage } from './pages/CertificatePrintPage'
import CouponClaimPage from './pages/CouponClaimPage' // NEW
import { EditProfilePage } from './pages/EditProfilePage'
import { NotificationsPage } from './pages/NotificationsPage'
import { SecuritySettingsPage } from './pages/SecuritySettingsPage'
import { StudentCouponsPage } from './pages/StudentCouponsPage'
import { SuspendedPage } from './pages/SuspendedPage'
import { MissionsPage } from './pages/MissionsPage'

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'

import { AdminCoursesPage } from './pages/admin/AdminCoursesPage'
import { AdminCouponsPage } from './pages/admin/AdminCouponsPage' // NEW
import { AdminCertificateBuilder } from './pages/admin/AdminCertificateBuilder'
import { CertificateReviewPage } from './pages/admin/CertificateReviewPage'
import { QuizBuilderPage } from './pages/admin/QuizBuilderPage'
import { AdminMissionsPage } from './pages/admin/AdminMissionsPage'
import { AdminNotificationsPage } from './pages/admin/AdminNotificationsPage'
import { AdminPreviewLayout } from './components/layout/AdminPreviewLayout'

// Instructor Pages
import { InstructorDashboardPage } from './pages/instructor/InstructorDashboardPage';
import { InstructorCurriculumPage } from './pages/instructor/InstructorCurriculumPage'

// Meeting Room
import MeetingRoomPage from './pages/MeetingRoomPage'

const ProtectedRoute = ({ children, roles = [] }) => {
    const { user, loading } = useUser();
    const navigate = useNavigate();

    if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (roles.length > 0 && !roles.includes(user.role)) {
        // Redirect based on role if unauthorized
        if (user.role === 'admin') return <Navigate to="/admin" replace />;
        else if (user.role === 'instructor') return <Navigate to="/instructor/dashboard" replace />;
        else return <Navigate to="/" replace />;
    }

    return children;
}

const AppContent = () => {
    const { user, login } = useUser();
    const location = useLocation();
    const navigate = useNavigate();
    const isPrintPage = location.pathname.includes('/print');
    const isMeetingPage = location.pathname.startsWith('/meeting');

    const handleNavigate = (path) => {
        navigate(path.startsWith('/') ? path : `/${path}`);
    };

    const isLogin = location.pathname === '/login';
    const isAdminRoute = location.pathname.startsWith('/admin');

    const handleLogin = async (credentials) => {
        const response = await login(credentials);
        if (response.two_factor) {
            return response;
        }
        if (response.token) {
            // Navigation handled by component after successful login, or we can do it here based on refreshed user
            // But login function in UserContext re-fetches user.
            // We'll let the component check user role or redirect.
            // Actually, helper in LoginPage usually handles redirect, but let's be safe.
            const currentUser = await authService.getCurrentUser(); // Double check or rely on context update
            if (currentUser.role === 'admin') navigate('/admin');
            else if (currentUser.role === 'instructor') navigate('/instructor/dashboard');
            else navigate('/');
        }
        return response;
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-slate-900">
            <ToastContainer />
            {!isLogin && !isPrintPage && !isAdminRoute && !isMeetingPage && (
                <Navbar
                    user={user}
                    userRole={user?.role}
                    onNavigate={handleNavigate}
                />
            )}

            {/* Admin Navbar could be conditionally rendered here if not handled by Admin Pages layout */}
            {isAdminRoute && !isLogin && (
                // Assuming AdminPages handle their own Sidebar/Navbar or we use a wrapper.
                null
            )}

            <Routes>
                {/* Public */}
                <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
                <Route path="/suspended" element={<SuspendedPage />} />
                <Route path="/claim-exclusive" element={<ProtectedRoute><CouponClaimPage /></ProtectedRoute>} /> {/* NEW */}

                {/* Learner / Shared Protected */}
                <Route path="/" element={<ProtectedRoute roles={['learner']}><DashboardPage /></ProtectedRoute>} />
                <Route path="/courses" element={<ProtectedRoute roles={['learner', 'instructor']}><CoursesPage /></ProtectedRoute>} />
                <Route path="/courses/:id" element={<ProtectedRoute><CourseDetailPage /></ProtectedRoute>} />
                <Route path="/courses/:courseId/lesson/:contentId" element={<ProtectedRoute><LessonPlayerPage /></ProtectedRoute>} />
                <Route path="/sessions" element={<ProtectedRoute><SessionsPage /></ProtectedRoute>} />
                <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
                <Route path="/certificates" element={<ProtectedRoute><CertificatesPage /></ProtectedRoute>} />
                <Route path="/certificate-generator" element={<ProtectedRoute><CertificateGeneratorPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
                <Route path="/profile/edit" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
                <Route path="/settings/security" element={<ProtectedRoute><SecuritySettingsPage /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                <Route path="/coupons" element={<ProtectedRoute><StudentCouponsPage /></ProtectedRoute>} />
                <Route path="/missions" element={<ProtectedRoute><MissionsPage /></ProtectedRoute>} />

                {/* Meeting Room */}
                <Route path="/meeting" element={<ProtectedRoute><MeetingRoomPage /></ProtectedRoute>} />
                <Route path="/meeting/:roomId" element={<ProtectedRoute><MeetingRoomPage /></ProtectedRoute>} />

                {/* Special Print Route */}
                <Route path="/certificate/print/:id" element={<CertificatePrintPage />} />

                {/* Admin Routes */}
                <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboardPage /></ProtectedRoute>} />
                <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
                <Route path="/admin/courses" element={<ProtectedRoute roles={['admin']}><AdminCoursesPage /></ProtectedRoute>} />
                <Route path="/admin/coupons" element={<ProtectedRoute roles={['admin']}><AdminCouponsPage /></ProtectedRoute>} />
                <Route path="/admin/missions" element={<ProtectedRoute roles={['admin']}><AdminMissionsPage /></ProtectedRoute>} />
                <Route path="/admin/notifications" element={<ProtectedRoute roles={['admin']}><AdminNotificationsPage /></ProtectedRoute>} />

                {/* Admin Preview Modes */}
                <Route path="/admin/courses/:id/preview" element={
                    <ProtectedRoute roles={['admin']}>
                        <AdminPreviewLayout>
                            <CourseDetailPage isPreviewMode={true} />
                        </AdminPreviewLayout>
                    </ProtectedRoute>
                } />
                <Route path="/admin/courses/:id/lesson/:contentId/preview" element={
                    <ProtectedRoute roles={['admin']}>
                        <AdminPreviewLayout>
                            <LessonPlayerPage isPreviewMode={true} />
                        </AdminPreviewLayout>
                    </ProtectedRoute>
                } />

                <Route path="/admin/certificates/builder" element={<ProtectedRoute roles={['admin']}><AdminCertificateBuilder /></ProtectedRoute>} />
                <Route path="/admin/certificates/review/:courseId" element={<ProtectedRoute roles={['admin']}><CertificateReviewPage /></ProtectedRoute>} />
                <Route path="/admin/quizzes/builder/:contentId" element={<ProtectedRoute roles={['admin']}><QuizBuilderPage /></ProtectedRoute>} />

                {/* Instructor Routes */}
                <Route path="/instructor/dashboard" element={
                    <ProtectedRoute roles={['instructor']}>
                        <InstructorDashboardPage />
                    </ProtectedRoute>
                } />
                <Route path="/instructor/courses" element={<ProtectedRoute roles={['instructor']}><CoursesPage /></ProtectedRoute>} />
                <Route path="/instructor/curriculum" element={<ProtectedRoute roles={['instructor']}><InstructorCurriculumPage /></ProtectedRoute>} />

                {/* Instructor Preview Modes */}
                <Route path="/instructor/courses/:id/preview" element={<ProtectedRoute roles={['instructor']}><CourseDetailPage isPreviewMode={true} /></ProtectedRoute>} />
                <Route path="/instructor/courses/:id/lesson/:contentId/preview" element={<ProtectedRoute roles={['instructor']}><LessonPlayerPage isPreviewMode={true} /></ProtectedRoute>} />

                {/* Generic Preview Routes (for direct access testing/fallback) */}
                <Route path="/courses/:id/preview" element={<ProtectedRoute roles={['admin', 'instructor']}><CourseDetailPage isPreviewMode={true} /></ProtectedRoute>} />
                <Route path="/courses/:courseId/lesson/:contentId/preview" element={<ProtectedRoute roles={['admin', 'instructor']}><LessonPlayerPage isPreviewMode={true} /></ProtectedRoute>} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    )
}

function App() {
    return (
        <BrowserRouter>
            <UserProvider>
                <AppContent />
            </UserProvider>
        </BrowserRouter>
    )
}

export default App
