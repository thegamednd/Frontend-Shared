import axios from 'axios';
import { useUserStore } from '@shared/stores/user';
import { useNotifications } from '@shared/composables/useNotifications';
import { getImpersonatedUserId } from '@shared/composables/useImpersonation';

// Create axios instance with base configuration
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 30000, // 30 seconds
    headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add authentication token
apiClient.interceptors.request.use(
    async (config) => {
        try {
            const userStore = useUserStore();
            const token = await userStore.getValidToken();
            
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            config.headers['X-Gaming-System-ID'] = import.meta.env.VITE_GAMING_SYSTEM_ID;

            // Impersonation header — set when an admin is acting as another user.
            // Only honored server-side if the caller's JWT belongs to an admin.
            const impersonatedUserId = getImpersonatedUserId();
            if (impersonatedUserId) {
                config.headers['X-Impersonate-User'] = impersonatedUserId;
            }

            return config;
        } catch (error) {
            console.error('Error in request interceptor:', error);
            return config;
        }
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle token expiration
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        const { notifyError, notifyWarning } = useNotifications();
        
        // If we get a 401 and haven't already tried to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                const userStore = useUserStore();
                console.log('Received 401, attempting to refresh token...');
                
                const refreshed = await userStore.refreshSession();
                
                if (refreshed) {
                    // Retry the original request with the new token
                    const token = await userStore.getValidToken();
                    if (token) {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return apiClient(originalRequest);
                    }
                } else {
                    // Token refresh failed
                    notifyError('Your session has expired. Please sign in again.');
                }
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                notifyError('Authentication failed. Please sign in again.');
                return Promise.reject(refreshError);
            }
        } else if (error.response?.status === 401) {
            // Already retried, authentication definitively failed
            notifyError('Authentication failed. Please sign in again.');
        } else if (error.response?.status === 403) {
            notifyWarning('You do not have permission to perform this action.');
        } else if (error.response?.status >= 500) {
            notifyError('Server error occurred. Please try again later.');
        }
        
        return Promise.reject(error);
    }
);

export default apiClient;
