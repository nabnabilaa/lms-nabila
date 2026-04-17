// Sessions Management Tab for Admin
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Calendar, X } from 'lucide-react';
import { Badge } from '../ui';
import ConfirmModal from '../ui/ConfirmModal'; // NEW

export const SessionsTab = ({ sessions = [], onUpdate }) => {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);
    const [editingSession, setEditingSession] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null }); // NEW
    const [formData, setFormData] = useState({
        title: '',
        courseId: 1,
        instructor: '',
        type: 'Live',
        date: '',
        startTime: '',
        endTime: '',
        meetingLink: '',
        status: 'upcoming'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingSession) {
            // Update existing
            onUpdate(sessions.map(s => s.id === editingSession.id ? { ...formData, id: editingSession.id } : s));
        } else {
            // Create new
            const newSession = { ...formData, id: Date.now() };
            onUpdate([...sessions, newSession]);
        }
        resetForm();
    };

    const handleDeleteClick = (id) => {
        setConfirmModal({ isOpen: true, id });
    };

    const handleConfirmDelete = () => {
        if (confirmModal.id) {
            onUpdate(sessions.filter(s => s.id !== confirmModal.id));
            setConfirmModal({ isOpen: false, id: null });
        }
    };

    const handleEdit = (session) => {
        setEditingSession(session);
        setFormData(session);
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            title: '', courseId: 1, instructor: '', type: 'Live',
            date: '', startTime: '', endTime: '', meetingLink: '', status: 'upcoming'
        });
        setEditingSession(null);
        setShowModal(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{t('sessions.admin_title')}</h2>
                    <p className="text-gray-500 text-sm">{t('sessions.admin_subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                >
                    <Plus className="w-4 h-4" /> {t('sessions.add_session')}
                </button>
            </div>

            {/* Sessions Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left p-4 text-sm font-bold text-gray-700">{t('sessions.col_title')}</th>
                            <th className="text-left p-4 text-sm font-bold text-gray-700">{t('sessions.col_instructor')}</th>
                            <th className="text-left p-4 text-sm font-bold text-gray-700">{t('sessions.col_type')}</th>
                            <th className="text-left p-4 text-sm font-bold text-gray-700">{t('sessions.col_date_time')}</th>
                            <th className="text-left p-4 text-sm font-bold text-gray-700">{t('sessions.col_status')}</th>
                            <th className="text-right p-4 text-sm font-bold text-gray-700">{t('sessions.col_actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sessions.map((session) => (
                            <tr key={session.id} className="hover:bg-gray-50">
                                <td className="p-4">
                                    <div className="font-medium text-gray-900">{session.title}</div>
                                    <div className="text-xs text-gray-500">Course ID: {session.courseId}</div>
                                </td>
                                <td className="p-4 text-sm text-gray-600">{session.instructor}</td>
                                <td className="p-4">
                                    <Badge variant={session.type === 'Live' ? 'green' : session.type === 'Workshop' ? 'purple' : 'blue'}>
                                        {session.type}
                                    </Badge>
                                </td>
                                <td className="p-4">
                                    <div className="text-sm font-medium text-gray-900">{session.date}</div>
                                    <div className="text-xs text-gray-500">{session.startTime} - {session.endTime}</div>
                                </td>
                                <td className="p-4">
                                    <Badge variant={session.status === 'upcoming' ? 'blue' : session.status === 'ongoing' ? 'green' : 'gray'}>
                                        {session.status}
                                    </Badge>
                                </td>
                                <td className="p-4">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => handleEdit(session)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(session.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">
                                {editingSession ? t('sessions.edit_session') : t('sessions.add_new_session')}
                            </h3>
                            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('sessions.session_title')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                        placeholder="Design System Fundamentals"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('sessions.course_id')}</label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.courseId}
                                        onChange={(e) => setFormData({ ...formData, courseId: parseInt(e.target.value) })}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('sessions.col_instructor')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.instructor}
                                        onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                        placeholder="Coach Arya"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('sessions.col_type')}</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                    >
                                        <option value="Live">Live</option>
                                        <option value="Recorded">Recorded</option>
                                        <option value="Workshop">Workshop</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('sessions.date')}</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('sessions.start_time')}</label>
                                    <input
                                        type="time"
                                        required
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('sessions.end_time')}</label>
                                    <input
                                        type="time"
                                        required
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('sessions.meeting_link')}</label>
                                    <input
                                        type="url"
                                        value={formData.meetingLink}
                                        onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                        placeholder="https://meet.google.com/..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('sessions.col_status')}</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                    >
                                        <option value="upcoming">Upcoming</option>
                                        <option value="ongoing">Ongoing</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-bold"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                                >
                                    {editingSession ? t('common.update') : t('common.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleConfirmDelete}
                title={t('sessions.delete_title')}
                message={t('sessions.delete_message')}
                variant="warning"
                confirmLabel={t('sessions.yes_delete')}
                cancelLabel={t('common.cancel')}
            />
        </div>
    );
};
