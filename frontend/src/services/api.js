/**
 * Axios API Service
 * Centralized HTTP client with auth interceptors
 * Includes SSE helpers, reservations, QR, and audit endpoints
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('elvora_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('elvora_token');
            localStorage.removeItem('elvora_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ─── Auth API ─────────────────────────────────
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (data) => api.post('/auth/register', data),
    getMe: () => api.get('/auth/me'),
    seedAdmin: () => api.post('/auth/seed'),
};

// ─── Books API ────────────────────────────────
export const booksAPI = {
    getAll: (params) => api.get('/books', { params }),
    getById: (id) => api.get(`/books/${id}`),
    getByBarcode: (barcode) => api.get(`/books/barcode/${barcode}`),
    getByQRToken: (token) => api.get(`/books/qr/${token}`),
    create: (data) => api.post('/books', data),
    update: (id, data) => api.put(`/books/${id}`, data),
    delete: (id) => api.delete(`/books/${id}`),
    // Issue/Return on book resource
    issue: (id, data) => api.post(`/books/${id}/issue`, data),
    return: (id, data) => api.post(`/books/${id}/return`, data),
    // Reservations
    reserve: (id, data) => api.post(`/books/${id}/reserve`, data),
    getReservations: (id) => api.get(`/books/${id}/reservations`),
    // QR Code
    getQR: (id, params) => api.get(`/books/${id}/qr`, { params }),
    rotateQR: (id) => api.post(`/books/${id}/qr/rotate`),
};

// ─── Students API ─────────────────────────────
export const studentsAPI = {
    getAll: (params) => api.get('/students', { params }),
    getById: (id) => api.get(`/students/${id}`),
    getByStudentId: (sid) => api.get(`/students/sid/${sid}`),
    create: (data) => api.post('/students', data),
    update: (id, data) => api.put(`/students/${id}`, data),
    delete: (id) => api.delete(`/students/${id}`),
};

// ─── Transactions API ─────────────────────────
export const transactionsAPI = {
    getAll: (params) => api.get('/transactions', { params }),
    getById: (id) => api.get(`/transactions/${id}`),
    issue: (data) => api.post('/transactions/issue', data),
    return: (id) => api.post(`/transactions/return/${id}`),
    getByStudent: (studentId) => api.get(`/transactions/student/${studentId}`),
    updateOverdue: () => api.post('/transactions/update-overdue'),
};

// ─── Scan API (IoT + QR) ─────────────────────
export const scanAPI = {
    processScan: (data) => api.post('/scan', data),
    fingerprint: (data) => api.post('/scan/fingerprint', data),
};

// ─── Reservations API ─────────────────────────
export const reservationsAPI = {
    getAll: (params) => api.get('/reservations', { params }),
    cancel: (id) => api.delete(`/reservations/${id}`),
};

// ─── Dashboard API ────────────────────────────
export const dashboardAPI = {
    getStats: () => api.get('/dashboard/stats'),
    getCharts: () => api.get('/dashboard/charts'),
};

// ─── Notifications API ────────────────────────
export const notificationsAPI = {
    getAll: (params) => api.get('/notifications', { params }),
    markAsRead: (id) => api.put(`/notifications/${id}/read`),
    markAllAsRead: () => api.put('/notifications/read-all'),
    delete: (id) => api.delete(`/notifications/${id}`),
};

// ─── Audit API ────────────────────────────────
export const auditAPI = {
    getLogs: (params) => api.get('/audit', { params }),
    getActionTypes: () => api.get('/audit/actions'),
    getStats: () => api.get('/audit/stats'),
};

// ─── Health / Metrics ─────────────────────────
export const systemAPI = {
    health: () => api.get('/health'),
    metrics: () => api.get('/metrics'),
};

// ─── SSE Helper ───────────────────────────────
export function connectSSE(channels = ['all'], onEvent) {
    const baseUrl = API_URL.replace('/api', '');
    const url = `${baseUrl}/api/events?channels=${channels.join(',')}`;
    const eventSource = new EventSource(url);

    eventSource.addEventListener('connected', (e) => {
        const data = JSON.parse(e.data);
        if (onEvent) onEvent('connected', data);
    });

    eventSource.addEventListener('book_updated', (e) => {
        const data = JSON.parse(e.data);
        if (onEvent) onEvent('book_updated', data);
    });

    eventSource.addEventListener('transaction', (e) => {
        const data = JSON.parse(e.data);
        if (onEvent) onEvent('transaction', data);
    });

    eventSource.addEventListener('reservation', (e) => {
        const data = JSON.parse(e.data);
        if (onEvent) onEvent('reservation', data);
    });

    eventSource.onerror = () => {
        if (onEvent) onEvent('error', { message: 'SSE connection lost' });
    };

    return eventSource;
}

export default api;
