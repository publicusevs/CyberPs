import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:1433/api',
});

// Add a request interceptor to include the JWT token
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

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response.status === 403 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                const res = await axios.post('http://localhost:1433/api/auth/refresh-token', { refreshToken });
                if (res.data.success) {
                    localStorage.setItem('token', res.data.token);
                    api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
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
