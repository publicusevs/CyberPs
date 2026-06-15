import axios from 'axios';

// Base URL sourced from environment — set VITE_API_URL in frontend/.env
const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? `http://localhost:${__BACKEND_PORT__}/api` : '/api');

const api = axios.create({
    baseURL: BASE_URL,
});

// Request interceptor: attach JWT from localStorage to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: handle token expiry with silent refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Handle network errors (backend down, no internet)
        if (!error.response) {
            return Promise.reject(error);
        }

        if (error.response.status === 403 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                const res = await axios.post(`${BASE_URL}/auth/refresh-token`, { refreshToken });
                if (res.data.success) {
                    // Support both new shape (data.data.token) and old shape (data.token)
                    const newToken = res.data.data ? res.data.data.token : res.data.token;
                    localStorage.setItem('token', newToken);
                    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                    return api(originalRequest);
                }
            } catch (err) {
                localStorage.clear();
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;

export const getAssetUrl = (filePath) => {
    if (!filePath) return '';
    const cleanPath = filePath.replace(/^\//, '');
    const base = import.meta.env.DEV ? `http://localhost:${__BACKEND_PORT__}` : window.location.origin;
    return `${base}/${cleanPath}`;
};

export const getBackendUrl = (path) => {
    if (!path) return '';
    const cleanPath = path.replace(/^\//, '');
    const base = import.meta.env.DEV ? `http://localhost:${__BACKEND_PORT__}` : window.location.origin;
    return `${base}/${cleanPath}`;
};
