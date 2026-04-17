import { QueryClient } from "@tanstack/react-query";

/**
 * QueryClient Configuration
 *
 * staleTime: 5 minutes - Data considered "fresh" for 5 min.
 *   Cache served instantly, NO loading spinner on revisit.
 *   Background refetch only if data is older than 5 min.
 *
 * gcTime: 30 minutes - Cache retained for 30 min even after unmount.
 *   Revisiting page shows cached data instantly.
 *
 * refetchOnWindowFocus: false - Don't refetch when user switches tabs.
 *
 * refetchOnMount: 'always' - Always check for fresh data on mount,
 *   but show cache first (stale-while-revalidate).
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
            refetchOnWindowFocus: false,
            refetchOnMount: true, // Check for updates, but show cache first
            refetchOnReconnect: true,
            retry: 1,
            // Show cached data while fetching in background
            placeholderData: (previousData) => previousData,
        },
        mutations: {
            retry: 0,
        },
    },
});

// Query Keys - centralized for easy invalidation
export const queryKeys = {
    // Courses
    courses: ["courses"],
    course: (id) => ["course", id],
    courseModules: (courseId) => ["course", courseId, "modules"],

    // Users
    currentUser: ["currentUser"],
    users: ["users"],
    user: (id) => ["user", id],

    // Achievements
    achievements: ["achievements"],
    levels: ["levels"],

    // Instructor Discussions
    instructorDiscussions: (courseIds) => ["instructorDiscussions", courseIds],

    // Missions
    dailyMissions: ["dailyMissions"],
};
