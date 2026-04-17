import api from './api';

export const gamificationService = {
    // Get All Achievements
    getAchievements: async () => {
        const response = await api.get('/achievements');
        return response.data;
    },

    // Create Achievement
    createAchievement: async (data) => {
        const response = await api.post('/achievements', data);
        return response.data;
    },

    // Update Achievement
    updateAchievement: async (id, data) => {
        const response = await api.put(`/achievements/${id}`, data);
        return response.data;
    },

    // Delete Achievement
    deleteAchievement: async (id) => {
        const response = await api.delete(`/achievements/${id}`);
        return response.data;
    }
};
