import api from './api';

export const certificateService = {
  // Get all certificates for the current user
  getMyCertificates: async () => {
    const response = await api.get('/certificates');
    return response.data;
  },

  // Get specific certificate details by ID (hash or int)
  getCertificateById: async (id) => {
    const response = await api.get(`/certificates/${id}`);
    return response.data;
  },

  // [TAMBAHAN] Claim/Generate Certificate
  claimCertificate: async (courseId) => {
    const response = await api.post('/certificates/generate', { course_id: courseId });
    return response.data;
  },

  // Admin: Update Certificate Override
  updateCertificate: async (id, data) => {
      const response = await api.put(`/certificates/${id}`, data);
      return response.data;
  }
};