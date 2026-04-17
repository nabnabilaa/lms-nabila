import api from './api';

export const authService = {
    // Login
    login: async (credentials) => {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    },

    // Register
    register: async (userData) => {
        const response = await api.post('/auth/register', userData);
        return response.data;
    },

    // Get current user
    getCurrentUser: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    // Logout
    logout: async () => {
        const response = await api.post('/auth/logout');
        localStorage.removeItem('token');
        return response.data;
    },

    // Get All Users (for Leaderboard)
    getAllUsers: async () => {
        const response = await api.get('/users');
        return response.data;
    },

    // Update Profile
    updateProfile: async (formData) => {
        // Must use FormData for file uploads
        // Explicitly set content type to allow axios to add boundary
        const response = await api.post('/auth/profile', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }
};
