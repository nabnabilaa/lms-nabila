import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { missionService } from "../../services/missionService";
import { queryKeys } from "../../lib/queryClient";

/**
 * Hook to fetch daily missions with caching.
 */
export const useDailyMissionsQuery = (options = {}) => {
    return useQuery({
        queryKey: queryKeys.dailyMissions,
        queryFn: missionService.getMyDailyMissions,
        staleTime: 5 * 60 * 1000, // 5 minutes fresh
        ...options,
    });
};
