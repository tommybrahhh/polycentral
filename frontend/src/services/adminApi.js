import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const adminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Platform Fees Management
export const getPlatformFeesTotal = () => {
  return adminApi.get('/api/admin/platform-fees/total');
};

export const getPlatformFeesHistory = () => {
  return adminApi.get('/api/admin/platform-fees/history');
};

export const transferPlatformFees = (userId, amount, reason) => {
  return adminApi.post('/api/admin/platform-fees/transfer', { userId, amount, reason });
};

export const getPlatformFeesRules = () => {
  return adminApi.get('/api/admin/platform-fees/rules');
};

export const updatePlatformFeesRules = (rules) => {
  return adminApi.put('/api/admin/platform-fees/rules', rules);
};

// User Management
export const getAllUsers = (params = {}) => {
  return adminApi.get('/api/admin/users', { params });
};

export const getUserDetails = (userId) => {
  return adminApi.get(`/api/admin/users/${userId}`);
};

export const adjustUserPoints = (userId, points, reason) => {
  return adminApi.put(`/api/admin/users/${userId}/points`, { points, reason });
};

export const updateUserRole = (userId, isAdmin) => {
  return adminApi.put(`/api/admin/users/${userId}/role`, { is_admin: isAdmin });
};

export const suspendUser = (userId, isSuspended) => {
  return adminApi.put(`/api/admin/users/${userId}/suspend`, { is_suspended: isSuspended });
};

export const resetUserClaims = (userId) => {
  return adminApi.post(`/api/admin/users/${userId}/reset-claims`);
};

// Event Management
export const getAllEvents = (params = {}) => {
  return adminApi.get('/api/admin/events', { params });
};

export const createEvent = (eventData) => {
  return adminApi.post('/api/admin/events', eventData);
};

export const updateEvent = (eventId, eventData) => {
  return adminApi.put(`/api/admin/events/${eventId}`, eventData);
};

export const deleteEvent = (eventId) => {
  return adminApi.delete(`/api/admin/events/${eventId}`);
};

export const resolveEvent = (eventId) => {
  return adminApi.post(`/api/admin/events/${eventId}/resolve`);
};

export const resolveEventManual = (eventId, correctAnswer, finalPrice = null) => {
  return adminApi.post(`/api/admin/events/${eventId}/resolve-manual`, {
    correct_answer: correctAnswer,
    final_price: finalPrice
  });
};

export const suspendEvent = (eventId, isSuspended) => {
  return adminApi.post(`/api/admin/events/${eventId}/suspend`, { is_suspended: isSuspended });
};

export const getEventParticipants = (eventId) => {
  return adminApi.get(`/api/admin/events/${eventId}/participants`);
};

export const getEventTemplates = () => {
  return adminApi.get('/api/admin/event-templates');
};

export const createEventTemplate = (templateData) => {
  return adminApi.post('/api/admin/event-templates', templateData);
};

export const updateEventTemplate = (templateId, templateData) => {
  return adminApi.put(`/api/admin/event-templates/${templateId}`, templateData);
};

export const deleteEventTemplate = (templateId) => {
  return adminApi.delete(`/api/admin/event-templates/${templateId}`);
};

// Analytics
export const getPlatformAnalytics = () => {
  return adminApi.get('/api/admin/analytics');
};

export const getAuditLogs = () => {
  return adminApi.get('/api/admin/audit-logs');
};

export default adminApi;