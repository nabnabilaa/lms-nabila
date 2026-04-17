import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gamificationService } from '../../services/gamificationService';

export const useAchievementsQuery = () => {
    return useQuery({
        queryKey: ['achievements'],
        queryFn: gamificationService.getAchievements,
    });
};

export const useAchievementMutations = () => {
    const queryClient = useQueryClient();

    const createAchievement = useMutation({
        mutationFn: gamificationService.createAchievement,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['achievements'] });
        },
    });

    const updateAchievement = useMutation({
        mutationFn: ({ id, data }) => gamificationService.updateAchievement(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['achievements'] });
        },
    });

    const deleteAchievement = useMutation({
        mutationFn: gamificationService.deleteAchievement,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['achievements'] });
        },
    });

    return {
        createAchievement,
        updateAchievement,
        deleteAchievement
    };
};
