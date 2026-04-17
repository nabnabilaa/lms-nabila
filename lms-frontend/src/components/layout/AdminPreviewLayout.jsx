import { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { AdminNavbar } from './AdminNavbar';
import { AdminSidebar } from '../admin/ui/AdminSidebar';
import { useUser } from '../../contexts/UserContext';

export const AdminPreviewLayout = ({ children }) => {
    const { user } = useUser();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleNavigate = (path) => {
        navigate(path.startsWith('/') ? path : `/${path}`);
        setIsSidebarOpen(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <AdminNavbar
                user={user}
                onNavigate={handleNavigate}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            {/* Mobile Sidebar (Hidden on Desktop via onlyMobile prop) */}
            <AdminSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                activeTab="preview" // Dummy tab
                onlyMobile={true}
            />

            <div className="flex-1">
                {children || <Outlet />}
            </div>
        </div>
    );
};
