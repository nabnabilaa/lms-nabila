// Discussions Moderation Tab for Admin
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, CheckCircle, Pin, Trash2, ThumbsUp, X } from 'lucide-react';
import { Badge } from '../ui';

export const DiscussionsTab = ({ discussions = [], courses = [], users = [], onUpdate }) => {
    const { t } = useTranslation();
    const [filter, setFilter] = useState('all'); // all, solved, unsolved

    const handleToggleSolved = (discussionId) => {
        onUpdate(discussions.map(d =>
            d.id === discussionId ? { ...d, isSolved: !d.isSolved } : d
        ));
    };

    const handleDelete = (discussionId) => {
        if (confirm(t('discussions.confirm_delete'))) {
            onUpdate(discussions.filter(d => d.id !== discussionId));
        }
    };

    const getCourseTitle = (courseId) => {
        const course = courses.find(c => c.id === courseId);
        return course ? course.title : `Course ${courseId}`;
    };

    const getUserName = (userId) => {
        const user = users.find(u => u.id === userId);
        return user ? user.name : 'Unknown User';
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffHours < 1) return t('discussions.just_now');
        if (diffHours < 24) return `${diffHours} ${t('discussions.hours_ago')}`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} ${t('discussions.days_ago')}`;
    };

    const filteredDiscussions = discussions.filter(d => {
        if (filter === 'solved') return d.isSolved;
        if (filter === 'unsolved') return !d.isSolved;
        return true;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{t('discussions.title')}</h2>
                    <p className="text-gray-500 text-sm">{t('discussions.subtitle')}</p>
                </div>
                <div className="flex gap-2">
                    {['all', 'unsolved', 'solved'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${filter === f
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {f === 'all' ? t('discussions.filter_all') : f === 'solved' ? t('discussions.filter_solved') : t('discussions.filter_unsolved')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Discussions List */}
            <div className="space-y-3">
                {filteredDiscussions.length > 0 ? (
                    filteredDiscussions.map((discussion) => (
                        <div key={discussion.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-200 transition-all">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-bold text-gray-900">{discussion.topic}</h3>
                                        {discussion.isSolved && (
                                            <Badge variant="green">Solved</Badge>
                                        )}
                                        {discussion.isPinned && (
                                            <Pin className="w-4 h-4 text-orange-600" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span>{t('discussions.by')} {getUserName(discussion.userId)}</span>
                                        <span>•</span>
                                        <span>{getCourseTitle(discussion.courseId)}</span>
                                        <span>•</span>
                                        <span>{formatDate(discussion.createdAt)}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleToggleSolved(discussion.id)}
                                        className={`p-2 rounded ${discussion.isSolved
                                            ? 'text-green-600 bg-green-50 hover:bg-green-100'
                                            : 'text-gray-400 hover:bg-gray-50'
                                            }`}
                                        title={discussion.isSolved ? 'Mark as unsolved' : 'Mark as solved'}
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(discussion.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                                        title="Delete discussion"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                    <MessageSquare className="w-3.5 h-3.5" /> {discussion.replyCount || 0} {t('discussions.replies')}
                                </span>
                                <span className="flex items-center gap-1">
                                    <ThumbsUp className="w-3.5 h-3.5" /> {discussion.likeCount || 0} {t('discussions.likes')}
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400">{t('discussions.no_discussions')}</p>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-100">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{discussions.length}</div>
                    <div className="text-xs text-gray-600 mt-1">{t('discussions.total_discussions')}</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                        {discussions.filter(d => d.isSolved).length}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{t('discussions.filter_solved')}</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                        {discussions.filter(d => !d.isSolved).length}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{t('discussions.filter_unsolved')}</div>
                </div>
            </div>
        </div>
    );
};
