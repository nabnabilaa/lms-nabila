import api from './api';

export const achievementService = {
    // Get all achievements
    getAllAchievements: async () => {
        const response = await api.get('/achievements');
        return response.data;
    },

    // Create a new achievement
    createAchievement: async (data) => {
        // Flatten criteria for backend
        const payload = {
            ...data,
            criteria_type: data.criteria?.type,
            criteria_value: data.criteria?.target || 0
        };
        const response = await api.post('/achievements', payload);
        return response.data;
    },

    // Update an achievement
    updateAchievement: async (id, data) => {
        const payload = {
            ...data,
            criteria_type: data.criteria?.type,
            criteria_value: data.criteria?.target || 0
        };
        const response = await api.put(`/achievements/${id}`, payload);
        return response.data;
    },

    // Delete an achievement
    deleteAchievement: async (id) => {
        const response = await api.delete(`/achievements/${id}`);
        return response.data;
    }
};
