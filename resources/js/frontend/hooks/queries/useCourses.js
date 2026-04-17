import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseService } from '../../services/courseService';
import { queryKeys } from '../../lib/queryClient';

/**
 * Hook to fetch all courses with smart caching.
 * - Returns cached data instantly (no loading spinner on revisit)
 * - Background refetch if data is stale (>5 min)
 * - Cache persists across navigation
 */
export const useCoursesQuery = (params = {}) => {
    return useQuery({
        queryKey: [...queryKeys.courses, params],
        queryFn: () => courseService.getAllCourses(params),
    });
};

/**
 * Hook to fetch all discussions for instructor's courses.
 * Uses TanStack Query for smart caching - no reload on tab switch.
 */
export const useInstructorDiscussionsQuery = (myCourses) => {
    const courseIds = myCourses.map(c => c.id).sort().join(',');
    
    return useQuery({
        queryKey: queryKeys.instructorDiscussions(courseIds),
        queryFn: async () => {
            if (!myCourses.length) return [];
            
            const allDiscussions = [];
            for (const course of myCourses) {
                try {
                    const res = await courseService.getDiscussions(course.id);
                    const courseDiscussions = (res.data || res).map(d => ({
                        ...d,
                        courseName: course.title
                    }));
                    allDiscussions.push(...courseDiscussions);
                } catch (e) {
                    console.error(`Failed to fetch discussions for course ${course.id}`, e);
                }
            }
            return allDiscussions;
        },
        enabled: myCourses.length > 0,
    });
};

/**
 * Hook to fetch a single course by ID.
 */
export const useCourseQuery = (id) => {
    return useQuery({
        queryKey: queryKeys.course(id),
        queryFn: () => courseService.getCourseById(id),
        enabled: !!id, // Only fetch if ID is provided
    });
};

/**
 * Hook to fetch course modules.
 */
export const useCourseModulesQuery = (courseId) => {
    return useQuery({
        queryKey: queryKeys.courseModules(courseId),
        queryFn: () => courseService.getCourseModules(courseId),
        enabled: !!courseId,
    });
};

/**
 * Mutation hooks for course operations.
 * All mutations automatically invalidate the courses cache on success.
 */
export const useCourseMutations = () => {
    const queryClient = useQueryClient();

    // Invalidate all course-related queries
    const invalidateCourses = () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.courses });
    };

    // Create Course
    const createCourse = useMutation({
        mutationFn: courseService.createCourse,
        onSuccess: () => {
            invalidateCourses();
        },
    });

    // Update Course
    const updateCourse = useMutation({
        mutationFn: ({ id, data }) => courseService.updateCourse(id, data),
        onSuccess: (_, { id }) => {
            invalidateCourses();
            queryClient.invalidateQueries({ queryKey: queryKeys.course(id) });
        },
    });

    // Delete Course
    const deleteCourse = useMutation({
        mutationFn: courseService.deleteCourse,
        onSuccess: () => {
            invalidateCourses();
        },
    });

    // Module CRUD
    const createModule = useMutation({
        mutationFn: ({ courseId, data }) => courseService.createModule(courseId, data),
        onSuccess: () => invalidateCourses(),
    });

    const updateModule = useMutation({
        mutationFn: ({ id, data }) => courseService.updateModule(id, data),
        onSuccess: () => invalidateCourses(),
    });

    const deleteModule = useMutation({
        mutationFn: courseService.deleteModule,
        onSuccess: () => invalidateCourses(),
    });

    // Content CRUD
    const createContent = useMutation({
        mutationFn: ({ moduleId, data }) => courseService.createContent(moduleId, data),
        onSuccess: () => invalidateCourses(),
    });

    const updateContent = useMutation({
        mutationFn: ({ id, data }) => courseService.updateContent(id, data),
        onSuccess: () => invalidateCourses(),
    });

    const deleteContent = useMutation({
        mutationFn: courseService.deleteContent,
        onSuccess: () => invalidateCourses(),
    });

    // Session CRUD
    const createSession = useMutation({
        mutationFn: ({ courseId, data }) => courseService.createSession(courseId, data),
        onSuccess: () => invalidateCourses(),
    });

    const updateSession = useMutation({
        mutationFn: ({ id, data }) => courseService.updateSession(id, data),
        onSuccess: () => invalidateCourses(),
    });

    const deleteSession = useMutation({
        mutationFn: courseService.deleteSession,
        onSuccess: () => invalidateCourses(),
    });

    // Progress update
    const updateProgress = useMutation({
        mutationFn: ({ contentId, data }) => courseService.updateProgress(contentId, data),
        onSuccess: () => {
            invalidateCourses();
            // Also invalidate user query to refresh enrolled_courses progress
            queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
        },
    });

    return {
        createCourse,
        updateCourse,
        deleteCourse,
        createModule,
        updateModule,
        deleteModule,
        createContent,
        updateContent,
        deleteContent,
        createSession,
        updateSession,
        deleteSession,
        updateProgress,
    };
};
