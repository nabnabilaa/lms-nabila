import api from './api';

export const courseService = {
    // Get all courses (supports search)
    getAllCourses: async (params) => {
        const response = await api.get('/courses', { params });
        return response.data;
    },

    // Get course by ID
    getCourseById: async (id) => {
        const response = await api.get(`/courses/${id}`);
        return response.data;
    },

    // Course modules
    getCourseModules: async (courseId) => {
        const response = await api.get(`/courses/${courseId}/modules`);
        return response.data;
    },

    // Enroll
    enrollCourse: async (courseId, couponCode = null) => {
        const payload = couponCode ? { coupon_code: couponCode } : {};
        const response = await api.post(`/courses/${courseId}/enroll`, payload);
        return response.data;
    },

    // --- CRUD Operations ---

    // Course
    createCourse: async (data) => {
        const formData = new FormData();
        Object.keys(data).forEach(key => {
            if (data[key] !== null) formData.append(key, data[key]);
        });
        const response = await api.post('/courses', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        return response.data;
    },
    updateCourse: async (id, data) => {
        const formData = new FormData();
        Object.keys(data).forEach(key => {
            if (data[key] !== null) formData.append(key, data[key]);
        });
        formData.append('_method', 'PUT'); // Laravel spoofing for multipart PUT
        const response = await api.post(`/courses/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        return response.data;
    },
    deleteCourse: async (id) => {
        const response = await api.delete(`/courses/${id}`);
        return response.data;
    },

    // Module
    createModule: async (courseId, data) => {
        const response = await api.post(`/courses/${courseId}/modules`, data);
        return response.data;
    },
    updateModule: async (id, data) => {
        const response = await api.put(`/modules/${id}`, data);
        return response.data;
    },
    deleteModule: async (id) => {
        const response = await api.delete(`/modules/${id}`);
        return response.data;
    },

    // Content
    createContent: async (moduleId, data) => {
        const response = await api.post(`/modules/${moduleId}/contents`, data);
        return response.data;
    },
    updateContent: async (id, data) => {
        const response = await api.put(`/contents/${id}`, data);
        return response.data;
    },
    deleteContent: async (id) => {
        const response = await api.delete(`/contents/${id}`);
        return response.data;
    },

    // Session
    createSession: async (courseId, data) => {
        const response = await api.post(`/courses/${courseId}/sessions`, data);
        return response.data;
    },
    updateSession: async (id, data) => {
        const response = await api.put(`/sessions/${id}`, data);
        return response.data;
    },
    deleteSession: async (id) => {
        const response = await api.delete(`/sessions/${id}`);
        return response.data;
    },

    // Resource
    createResource: async (courseId, data) => {
        const formData = new FormData();
        Object.keys(data).forEach(key => formData.append(key, data[key]));
        const response = await api.post(`/courses/${courseId}/resources`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        return response.data;
    },
    updateResource: async (id, data) => {
        const response = await api.put(`/resources/${id}`, data);
        return response.data;
    },
    deleteResource: async (id) => {
        const response = await api.delete(`/resources/${id}`);
        return response.data;
    },

    // Update Content Progress (Complete Lesson/Quiz)
    updateProgress: async (contentId, data) => {
        const response = await api.post(`/contents/${contentId}/complete`, data);
        return response.data;
    },

    // Admin: Update Certificate Template
    updateCertificateTemplate: async (id, template) => {
        const response = await api.put(`/courses/${id}/certificate-template`, { template });
        return response.data;
    },

    // Admin: Import Candidates (Bulk with Excel)
    importCandidates: async (id, candidates, mapping) => {
        const response = await api.post(`/courses/${id}/certificates/import`, { candidates, mapping });
        return response.data;
    },

    // Admin: Get Certificate Candidates
    getCertificateCandidates: async (id) => {
        const response = await api.get(`/courses/${id}/certificates-candidates`);
        return response.data;
    },

    // Admin: Publish Certificates
    publishCertificates: async (id) => {
        const response = await api.post(`/courses/${id}/certificates/publish`);
        return response.data;
    },

    // Discussions
    getDiscussions: async (courseId) => {
        const response = await api.get(`/courses/${courseId}/discussions`);
        return response.data;
    },

    createDiscussion: async (courseId, data) => {
        const response = await api.post(`/courses/${courseId}/discussions`, data);
        return response.data;
    },

    updateDiscussion: async (discussionId, data) => {
        const response = await api.put(`/discussions/${discussionId}`, data);
        return response.data;
    },

    replyDiscussion: async (discussionId, data) => {
        const response = await api.post(`/discussions/${discussionId}/reply`, data);
        return response.data;
    },

    updateReply: async (discussionId, replyId, data) => {
        const response = await api.put(`/discussions/${discussionId}/replies/${replyId}`, data);
        return response.data;
    },

    voteDiscussion: async (discussionId) => {
        const response = await api.post(`/discussions/${discussionId}/vote`);
        return response.data;
    },

    deleteDiscussion: async (discussionId) => {
        const response = await api.delete(`/discussions/${discussionId}`);
        return response.data;
    },

    deleteReply: async (discussionId, replyId) => {
        const response = await api.delete(`/discussions/${discussionId}/replies/${replyId}`);
        return response.data;
    }
};
