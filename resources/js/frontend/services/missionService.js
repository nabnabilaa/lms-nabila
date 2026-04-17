import api from "./api";

export const missionService = {
    // Get My Daily Missions
    getMyDailyMissions: async () => {
        const response = await api.get("/daily-missions/my");
        // Return the missions array directly or the full response depending on structure
        // DashboardPage was using res.data.missions
        return response.data;
    },

    // Claim Mission Reward
    claimMission: async (missionId) => {
        const response = await api.post(`/daily-missions/${missionId}/claim`);
        return response.data;
    },
};
