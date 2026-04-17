// Resources Library Tab for Admin
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Download, FileText, X, Upload } from 'lucide-react';
import { Badge } from '../ui';
import ConfirmModal from '../ui/ConfirmModal'; // NEW

export const ResourcesTab = ({ resources = [], courses = [], onUpdate }) => {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);
    const [editingResource, setEditingResource] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null }); // NEW
    const [formData, setFormData] = useState({
        title: '',
        courseId: 1,
        moduleId: null,
        type: 'PDF',
        fileSize: '',
        filePath: '',
        downloadCount: 0
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingResource) {
            onUpdate(resources.map(r => r.id === editingResource.id ? { ...formData, id: editingResource.id } : r));
        } else {
            const newResource = { ...formData, id: Date.now() };
            onUpdate([...resources, newResource]);
        }
        resetForm();
    };

    const handleDeleteClick = (id) => {
        setConfirmModal({ isOpen: true, id });
    };

    const handleConfirmDelete = () => {
        if (confirmModal.id) {
            onUpdate(resources.filter(r => r.id !== confirmModal.id));
            setConfirmModal({ isOpen: false, id: null });
        }
    };

    const handleEdit = (resource) => {
        setEditingResource(resource);
        setFormData(resource);
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({ title: '', courseId: 1, moduleId: null, type: 'PDF', fileSize: '', filePath: '', downloadCount: 0 });
        setEditingResource(null);
        setShowModal(false);
    };

    const getCourseTitle = (courseId) => {
        const course = courses.find(c => c.id === courseId);
        return course ? course.title : `Course ${courseId}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{t('resources.title')}</h2>
                    <p className="text-gray-500 text-sm">{t('resources.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                >
                    <Plus className="w-4 h-4" /> {t('resources.add_resource')}
                </button>
            </div>

            {/* Resources Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left p-4 text-sm font-bold text-gray-700">{t('resources.col_title')}</th>
                            <th className="text-left p-4 text-sm font-bold text-gray-700">{t('resources.col_course')}</th>
                            <th className="text-left p-4 text-sm font-bold text-gray-700">{t('resources.col_type')}</th>
                            <th className="text-left p-4 text-sm font-bold text-gray-700">{t('resources.col_size')}</th>
                            <th className="text-left p-4 text-sm font-bold text-gray-700">{t('resources.col_downloads')}</th>
                            <th className="text-right p-4 text-sm font-bold text-gray-700">{t('resources.col_actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {resources.map((resource) => (
                            <tr key={resource.id} className="hover:bg-gray-50">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-blue-600" />
                                        <div>
                                            <div className="font-medium text-gray-900">{resource.title}</div>
                                            <div className="text-xs text-gray-500">Module: {resource.moduleId || 'All'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-sm text-gray-600">{getCourseTitle(resource.courseId)}</td>
                                <td className="p-4">
                                    <Badge variant={resource.type === 'PDF' ? 'blue' : resource.type === 'ZIP' ? 'purple' : 'gray'}>
                                        {resource.type}
                                    </Badge>
                                </td>
                                <td className="p-4 text-sm text-gray-600">{resource.fileSize}</td>
                                <td className="p-4 text-sm text-gray-600">{resource.downloadCount || 0}x</td>
                                <td className="p-4">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => handleEdit(resource)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(resource.id)}
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
                                {editingResource ? t('resources.edit_resource') : t('resources.add_new_resource')}
                            </h3>
                            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('resources.col_title')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                        placeholder="Course Materials PDF"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('resources.col_course')}</label>
                                    <select
                                        value={formData.courseId}
                                        onChange={(e) => setFormData({ ...formData, courseId: parseInt(e.target.value) })}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                    >
                                        {courses.map(c => (
                                            <option key={c.id} value={c.id}>{c.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('resources.module_id')}</label>
                                    <input
                                        type="number"
                                        value={formData.moduleId || ''}
                                        onChange={(e) => setFormData({ ...formData, moduleId: e.target.value ? parseInt(e.target.value) : null })}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                        placeholder="101"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('resources.col_type')}</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                    >
                                        <option value="PDF">PDF</option>
                                        <option value="ZIP">ZIP</option>
                                        <option value="Video">Video</option>
                                        <option value="Link">Link</option>
                                        <option value="Image">Image</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('resources.file_size')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.fileSize}
                                        onChange={(e) => setFormData({ ...formData, fileSize: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                        placeholder="2.4 MB"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('resources.file_path')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.filePath}
                                        onChange={(e) => setFormData({ ...formData, filePath: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                        placeholder="/resources/course-materials.pdf"
                                    />
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
                                    {editingResource ? t('common.update') : t('common.save')}
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
                title={t('resources.delete_title')}
                message={t('resources.delete_message')}
                variant="warning"
                confirmLabel={t('resources.yes_delete')}
                cancelLabel={t('common.cancel')}
            />
        </div>
    );
};
