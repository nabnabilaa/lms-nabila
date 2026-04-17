import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../../services/authService';
import { queryKeys } from '../../lib/queryClient';

/**
 * Hook to fetch current authenticated user with smart caching.
 * - Returns cached user instantly (no loading on revisit)
 * - Background refetch if stale
 */
export const useCurrentUserQuery = () => {
    return useQuery({
        queryKey: queryKeys.currentUser,
        queryFn: authService.getCurrentUser,
        staleTime: 2 * 60 * 1000, // User data fresh for 2 minutes
        retry: false, // Don't retry auth failures
    });
};

/**
 * Hook to fetch all users (admin).
 */
export const useUsersQuery = () => {
    return useQuery({
        queryKey: queryKeys.users,
        queryFn: authService.getAllUsers,
    });
};

/**
 * User mutations with cache invalidation.
 */
export const useUserMutations = () => {
    const queryClient = useQueryClient();

    // Update profile
    const updateProfile = useMutation({
        mutationFn: authService.updateProfile,
        onSuccess: (data) => {
            // Update cache with new user data
            queryClient.setQueryData(queryKeys.currentUser, data.user);
            queryClient.invalidateQueries({ queryKey: queryKeys.users });
        },
    });

    // Login mutation
    const login = useMutation({
        mutationFn: authService.login,
        onSuccess: (data) => {
            // Set user in cache after login
            queryClient.setQueryData(queryKeys.currentUser, data.user);
        },
    });

    // Logout
    const logout = useMutation({
        mutationFn: authService.logout,
        onSuccess: () => {
            // Clear all cached data on logout
            queryClient.clear();
        },
    });

    return {
        updateProfile,
        login,
        logout,
    };
};
