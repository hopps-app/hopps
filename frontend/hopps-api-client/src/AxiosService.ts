import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosRequestHeaders } from 'axios';

export interface AxiosServiceOptions {
    baseURL: string;
    getAccessToken: () => string | Promise<string>;
    getRefreshToken: () => Promise<void>;  // Optionale Refresh-Logik
}

export const createAxiosService = (options: AxiosServiceOptions): AxiosInstance => {
    const api = axios.create({
        baseURL: options.baseURL,
    });

    // Request Interceptor: Access Token hinzufügen
    api.interceptors.request.use(config => {
        const token = options.getAccessToken();
        if (token) {
            config.headers = {
                ...(config.headers || {}),  // Existierende Header beibehalten
                Authorization: token ? `Bearer ${token}` : '',
            } as AxiosRequestHeaders;
        }
        return config;
    });

    // Response Interceptor: Refresh Token bei 401
    api.interceptors.response.use(
        response => response,
        async (error: AxiosError) => {
            if (error.response?.status === 401) {
                try {
                    await options.getRefreshToken();
                    return api.request(error.config as AxiosRequestConfig);
                } catch (refreshError) {
                    return Promise.reject(refreshError);
                }
            }
            return Promise.reject(error);
        }
    );

    return api;
};
