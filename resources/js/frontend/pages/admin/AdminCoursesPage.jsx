import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminNavbar } from '../../components/layout/AdminNavbar';
import { AdminSidebar } from '../../components/admin/ui/AdminSidebar';
import { useCurrentUserQuery } from '../../hooks/queries/useUser';
import { CoursesPage } from '../CoursesPage';

export const AdminCoursesPage = () => {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Use the shared user query hook
    const { data: user, isLoading: isLoadingUser } = useCurrentUserQuery();

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
                        activeTab="courses"
                        setActiveTab={() => { }} // No-op as navigate handles it
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                    />

                    {/* Content Area */}
                    <div className="md:col-span-9 space-y-6">
                        {isLoadingUser ? (
                            <div className="flex justify-center py-20">
                                <span className="loading loading-spinner loading-lg text-blue-600">Loading...</span>
                            </div>
                        ) : (
                            <CoursesPage
                                onCourseClick={(id) => navigate(`/admin/courses/${id}/preview`, { state: { from: 'admin-explore' } })}
                            />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};
