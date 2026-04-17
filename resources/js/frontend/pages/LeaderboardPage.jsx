// Leaderboard Page - Full rankings
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Crown, Search, Award, Shield, Zap, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useUsersQuery } from '../hooks/queries/useUser';

export const LeaderboardPage = () => {
    // Fetch users directly here
    const { data: users = [] } = useUsersQuery();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const currentUserEmail = JSON.parse(localStorage.getItem('currentUser') || '{}')?.email;
    const [filterPeriod, setFilterPeriod] = useState('all_time'); // all_time, weekly, monthly
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [highlightedUserId, setHighlightedUserId] = useState(null);

    // Icon Mapping
    const iconMap = {
        'Award': Award,
        'Shield': Shield,
        'Zap': Zap,
        'Star': Star,
        'Crown': Crown,
        'Trophy': Trophy
    };

    const filterLabels = [
        { label: t('leaderboard.this_week'), value: 'weekly' },
        { label: t('leaderboard.this_month'), value: 'monthly' },
        { label: t('leaderboard.all_time'), value: 'all_time' }
    ];

    // 1. Process Data (Sort & Rank Only - NO FILTERING by search here)
    const leaderboardData = useMemo(() => {
        let processed = users
            .filter(u => u.role !== 'Admin')
            .map(user => {
                let displayXp = user.xp_points;
                if (filterPeriod === 'weekly') {
                    displayXp = user.xp_weekly || 0;
                } else if (filterPeriod === 'monthly') {
                    displayXp = user.xp_monthly || 0;
                }

                return { ...user, displayXp };
            });

        // Sort by XP Descending
        return processed
            .sort((a, b) => b.displayXp - a.displayXp)
            .map((user, idx) => ({
                ...user,
                rank: idx + 1,
                isMe: user.email === currentUserEmail,
            }));
    }, [users, filterPeriod, currentUserEmail]);

    // 2. Separate Top 3 and Rest
    const topThree = leaderboardData.slice(0, 3);
    const restListFull = leaderboardData.slice(3); // Everyone else (Rank 4+)

    // 3. Search Handler (Navigates to page instead of filtering)
    const handleSearch = () => {
        if (!searchQuery.trim()) return;

        const targetUserIndex = restListFull.findIndex(u =>
            u.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (targetUserIndex !== -1) {
            // Found in restList
            const targetUser = restListFull[targetUserIndex];
            const targetPage = Math.floor(targetUserIndex / itemsPerPage) + 1;

            setCurrentPage(targetPage);
            setHighlightedUserId(targetUser.id);

            // Auto scroll to table
            document.getElementById('leaderboard-table')?.scrollIntoView({ behavior: 'smooth' });

            // Remove highlight after 3 seconds
            setTimeout(() => setHighlightedUserId(null), 3000);
        } else {
            // Check if in Top 3
            const inTopThree = topThree.find(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));
            if (inTopThree) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                alert(t('leaderboard.top_three_alert', { name: inTopThree.name, rank: inTopThree.rank }));
            } else {
                alert(t('leaderboard.user_not_found'));
            }
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // 4. Pagination Logic
    const totalPages = Math.ceil(restListFull.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentList = restListFull.slice(startIndex, startIndex + itemsPerPage);

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterPeriod]);

    const locale = i18n.language === 'en' ? 'en-US' : 'id-ID';

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12 p-6 md:p-8 pt-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <button
                        onClick={() => navigate('/')}
                        className="text-sm text-gray-500 hover:text-blue-600 mb-2 flex items-center gap-1 group transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> {t('leaderboard.back_to_dashboard')}
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Trophy className="w-8 h-8 text-yellow-500" />
                        {t('leaderboard.title')}
                    </h1>
                    <p className="text-gray-500 mt-1">{t('leaderboard.subtitle')}</p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
                    {filterLabels.map(({ label, value }) => {
                        const isActive = filterPeriod === value;
                        return (
                            <button
                                key={value}
                                onClick={() => setFilterPeriod(value)}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${isActive
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Podium (Top 3) */}
            {topThree.length > 0 && (
                <div className="grid grid-cols-3 gap-4 items-end max-w-2xl mx-auto mb-12 px-4">
                    {/* 2nd Place */}
                    {topThree[1] && (
                        <div className="flex flex-col items-center">
                            <div className="relative mb-4">
                                <div className="w-20 h-20 rounded-full border-4 border-gray-300 overflow-hidden shadow-lg bg-gray-100">
                                    {topThree[1].avatar ? (
                                        <img src={topThree[1].avatar} alt={topThree[1].name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gray-400">
                                            {topThree[1].name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gray-300 text-gray-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm border border-white">#2</div>
                            </div>
                            <p className="font-bold text-gray-900 text-center truncate w-full">{topThree[1].name}</p>
                            <p className="text-sm text-gray-500">{topThree[1].displayXp} XP</p>
                        </div>
                    )}

                    {/* 1st Place */}
                    {topThree[0] && (
                        <div className="flex flex-col items-center -mt-8">
                            <Crown className="w-10 h-10 text-yellow-500 mb-2 animate-bounce" />
                            <div className="relative mb-4">
                                <div className="w-28 h-28 rounded-full border-4 border-yellow-400 overflow-hidden shadow-xl ring-4 ring-yellow-100 bg-yellow-50">
                                    {topThree[0].avatar ? (
                                        <img src={topThree[0].avatar} alt={topThree[0].name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-yellow-600">
                                            {topThree[0].name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-md border-2 border-white">#1</div>
                            </div>
                            <p className="font-bold text-lg text-gray-900 text-center truncate w-full">{topThree[0].name}</p>
                            <p className="font-bold text-yellow-600">{topThree[0].displayXp} XP</p>
                        </div>
                    )}

                    {/* 3rd Place */}
                    {topThree[2] && (
                        <div className="flex flex-col items-center">
                            <div className="relative mb-4">
                                <div className="w-20 h-20 rounded-full border-4 border-orange-300 overflow-hidden shadow-lg bg-orange-50">
                                    {topThree[2].avatar ? (
                                        <img src={topThree[2].avatar} alt={topThree[2].name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xl font-bold text-orange-400">
                                            {topThree[2].name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-orange-300 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm border border-white">#3</div>
                            </div>
                            <p className="font-bold text-gray-900 text-center truncate w-full">{topThree[2].name}</p>
                            <p className="text-sm text-gray-500">{topThree[2].displayXp} XP</p>
                        </div>
                    )}
                </div>
            )}

            {/* Rest of the List with Pagination */}
            <div id="leaderboard-table" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden scroll-mt-20">
                {/* Search Bar */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex gap-2">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('leaderboard.search_placeholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        {t('leaderboard.search_button')}
                    </button>
                </div>

                <div className="divide-y divide-gray-100">
                    {currentList.length > 0 ? (
                        currentList.map((user) => {
                            const UserLevelIcon = user.level ? iconMap[user.level.icon] : Trophy;
                            const userLevelColor = user.level?.color_hex || '#9CA3AF';
                            const isHighlighted = highlightedUserId === user.id;

                            return (
                                <div
                                    key={user.id}
                                    className={`grid grid-cols-[auto_1fr_auto] gap-4 items-center p-4 transition-all duration-500
                                        ${user.isMe ? 'bg-blue-50/50' : ''}
                                        ${isHighlighted ? 'bg-yellow-100 ring-2 ring-yellow-300' : 'hover:bg-gray-50'}
                                    `}
                                >
                                    {/* Rank */}
                                    <div className="w-8 text-center">
                                        <span className="text-sm font-bold text-gray-500">#{user.rank}</span>
                                    </div>

                                    {/* User Info */}
                                    <div className="flex items-center gap-4 min-w-0">
                                        {user.avatar ? (
                                            <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
                                                {user.name.charAt(0)}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className={`text-sm font-bold truncate ${user.isMe ? 'text-blue-700' : 'text-gray-900'}`}>
                                                    {user.isMe ? `${user.name} (${t('leaderboard.you_suffix')})` : user.name}
                                                </p>
                                                {user.level && (
                                                    <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border opacity-75" style={{ color: userLevelColor, borderColor: userLevelColor }}>
                                                        {user.level.name}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400">{t('leaderboard.member_since')} {new Date(user.created_at || Date.now()).toLocaleDateString(locale)}</p>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center gap-4 text-right">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{user.displayXp} XP</p>
                                            <p className="text-xs text-gray-400 md:hidden">{user.level?.name || 'Novice'}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center hidden sm:flex" style={{ backgroundColor: `${userLevelColor}15` }}>
                                            <UserLevelIcon className="w-5 h-5" style={{ color: userLevelColor }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            {t('leaderboard.no_users')}
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                            {t('leaderboard.page_of', { current: currentPage, total: totalPages })}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-transparent hover:border-gray-200"
                            >
                                <ChevronLeft className="w-4 h-4 text-gray-600" />
                            </button>

                            {/* Simple Page Numbers */}
                            <div className="flex gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let startPage = Math.max(1, currentPage - 2);
                                    if (startPage + 4 > totalPages) {
                                        startPage = Math.max(1, totalPages - 4);
                                    }
                                    const pageNum = startPage + i;

                                    if (pageNum > totalPages) return null;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors ${currentPage === pageNum
                                                ? 'bg-blue-600 text-white'
                                                : 'text-gray-600 hover:bg-white border border-transparent hover:border-gray-200'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-transparent hover:border-gray-200"
                            >
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
