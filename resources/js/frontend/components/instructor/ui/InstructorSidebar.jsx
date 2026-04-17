import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Users, Award, LogOut, Settings, X, Calendar, MessageSquare, Video } from 'lucide-react';

export const InstructorSidebar = ({ activeTab, setActiveTab, isOpen, onClose }) => {
    const navigate = useNavigate();
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/instructor/dashboard' },
        { id: 'curriculum', label: 'Curriculum', icon: BookOpen, path: '/instructor/curriculum' },
        { id: 'discussions', label: 'Discussions', icon: MessageSquare, path: '/instructor/discussions' },
        { id: 'meeting', label: 'Virtual Meeting', icon: Video, path: '/meeting' },
        { id: 'schedule', label: 'Schedule', icon: Calendar, path: '/instructor/schedule' },
        { id: 'students', label: 'My Students', icon: Users, path: '/instructor/students' },
    ];

    const SidebarContent = ({ showMobileHeader = false }) => (
        <div className="space-y-6">
            {/* Mobile Header */}
            {showMobileHeader && (
                <div className="flex items-center justify-between mb-6">
                    <h2 className="font-bold text-lg text-gray-900">Menu</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Menu Group */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Instructor</h3>
                </div>
                <nav className="flex flex-col p-2 gap-1">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;

                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    if (item.path) {
                                        navigate(item.path);
                                    } else {
                                        if (setActiveTab) setActiveTab(item.id);
                                    }
                                    onClose && onClose();
                                }}
                                className={`relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${isActive
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-r-full" />
                                )}
                                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* System Group */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">System</h3>
                </div>
                <nav className="flex flex-col p-2 gap-1">
                    <button
                        onClick={() => {
                            if (setActiveTab) setActiveTab('settings');
                            navigate('/instructor/settings');
                            onClose && onClose();
                        }}
                        className={`relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings'
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        {activeTab === 'settings' && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-r-full" />
                        )}
                        <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'text-indigo-600' : 'text-gray-400'}`} />
                        Settings
                    </button>
                    <button
                        onClick={() => {
                            localStorage.clear();
                            window.location.href = '/';
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        Logout
                    </button>
                </nav>
            </div>
        </div>
    );

    return (
        <div className="md:col-span-3 lg:col-span-3">
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-200"
                    onClick={onClose}
                />
            )}

            {/* Mobile Drawer */}
            <div className={`
                fixed top-0 left-0 bottom-0 w-64 bg-white z-50 transform transition-transform duration-300 p-4 overflow-y-auto shadow-xl
                md:hidden
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <SidebarContent showMobileHeader={true} />
            </div>

            {/* Desktop Static Sidebar */}
            <div className="hidden md:block sticky top-24">
                <SidebarContent showMobileHeader={false} />
            </div>
        </div>
    );
};
