import api from './api';

export const contentService = {
  // Get content details
  getContent: async (id) => {
    const response = await api.get(`/contents/${id}`);
    return response.data;
  },

  // Update quiz content
  updateQuiz: async (id, quizData) => {
    const response = await api.put(`/contents/${id}/quiz`, quizData);
    return response.data;
  }
};
