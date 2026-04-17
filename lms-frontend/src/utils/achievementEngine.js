/**
 * Achievement Engine
 * Handles achievement checking and awarding logic
 */

/**
 * Check if user qualifies for any achievements based on their recent activity
 * @param {Object} user - User object with activities and achievements arrays
 * @param {Object} latestActivity - The most recent activity that triggered this check
 * @param {Array} allAchievements - All available achievements from globalAchievements
 * @returns {Array} - Array of newly earned achievements
 */
export const checkAchievements = (user, latestActivity, allAchievements) => {
    const newAwards = [];

    // Get already earned achievement IDs
    const earnedIds = new Set((user.achievements || []).map(a => a.achievementId));

    allAchievements.forEach(achievement => {
        // Skip if already earned or inactive
        if (earnedIds.has(achievement.id) || !achievement.isActive) {
            return;
        }

        // Calculate progress for this achievement
        const progress = calculateProgress(user, achievement, latestActivity);

        // Award if criteria met
        if (progress.completed) {
            newAwards.push({
                achievementId: achievement.id,
                achievement: achievement, // Include full achievement for notification
                earnedAt: new Date().toISOString(),
                xpAwarded: achievement.xpReward,
                progress: progress
            });
        }
    });

    return newAwards;
};

/**
 * Calculate user's progress toward an achievement
 * @param {Object} user - User object with activities array
 * @param {Object} achievement - Achievement object with criteria
 * @param {Object} latestActivity - Latest activity (optional, for optimization)
 * @returns {Object} - Progress object with current, target, completed, percentage
 */
export const calculateProgress = (user, achievement, latestActivity) => {
    const { criteria } = achievement;
    const { type, target, timeLimit, contentType, courseId } = criteria;

    // Calculate cutoff date if time limit exists
    const cutoffDate = timeLimit > 0
        ? new Date(Date.now() - (timeLimit * 24 * 60 * 60 * 1000))
        : new Date(0); // Beginning of time if no limit

    // Filter user activities based on criteria
    const relevantActivities = (user.activities || []).filter(activity => {
        // Time check
        if (new Date(activity.timestamp) < cutoffDate) return false;

        // Course filter
        if (courseId && activity.courseId !== courseId) return false;

        // Type-specific filters
        switch (type) {
            case 'complete_content':
                if (activity.type !== 'complete_content') return false;
                // Content type filter
                if (contentType !== 'any' && activity.metadata?.contentType !== contentType) {
                    return false;
                }
                break;

            case 'complete_quiz':
                if (activity.type !== 'complete_quiz') return false;
                break;

            case 'perfect_score':
                if (activity.type !== 'complete_quiz') return false;
                // Only count perfect scores (100%)
                if (activity.metadata?.score !== 100) return false;
                break;

            case 'login_streak':
                if (activity.type !== 'login') return false;
                break;

            case 'course_completion':
                if (activity.type !== 'complete_course') return false;
                break;

            default:
                return false;
        }

        return true;
    });

    // For streak-based achievements, need special handling
    if (type === 'login_streak') {
        const streak = calculateLoginStreak(relevantActivities);
        return {
            current: streak,
            target: target,
            completed: streak >= target,
            percentage: Math.min(100, (streak / target) * 100)
        };
    }

    // For other achievements, simple count
    const current = relevantActivities.length;

    return {
        current,
        target,
        completed: current >= target,
        percentage: Math.min(100, (current / target) * 100)
    };
};

/**
 * Calculate login streak from activities
 * @param {Array} loginActivities - Array of login activities
 * @returns {number} - Current streak count
 */
const calculateLoginStreak = (loginActivities) => {
    if (loginActivities.length === 0) return 0;

    // Sort by date descending
    const sorted = [...loginActivities].sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const activity of sorted) {
        const activityDate = new Date(activity.timestamp);
        activityDate.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((currentDate - activityDate) / (1000 * 60 * 60 * 24));

        if (daysDiff === streak) {
            streak++;
        } else if (daysDiff > streak) {
            break; // Streak broken
        }
    }

    return streak;
};

/**
 * Get user's progress on all achievements (for UI display)
 * @param {Object} user - User object
 * @param {Array} allAchievements - All achievements
 * @returns {Array} - Array of achievement progress objects
 */
export const getAllAchievementProgress = (user, allAchievements) => {
    const earnedIds = new Set((user.achievements || []).map(a => a.achievementId));

    return allAchievements.map(achievement => {
        const earned = earnedIds.has(achievement.id);
        const progress = earned
            ? { current: achievement.criteria.target, target: achievement.criteria.target, completed: true, percentage: 100 }
            : calculateProgress(user, achievement, null);

        return {
            ...achievement,
            progress,
            earned,
            earnedAt: earned
                ? user.achievements.find(a => a.achievementId === achievement.id)?.earnedAt
                : null
        };
    });
};

/**
 * Log user activity
 * @param {string} type - Activity type (complete_content, complete_quiz, login, etc)
 * @param {Object} metadata - Activity metadata (contentId, courseId, score, etc)
 * @returns {Object} - Activity object ready to be added to user.activities
 */
export const createActivity = (type, metadata = {}) => {
    return {
        id: Date.now(),
        type,
        timestamp: new Date().toISOString(),
        metadata
    };
};
