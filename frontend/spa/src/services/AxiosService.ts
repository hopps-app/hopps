import axios, { AxiosInstance } from 'axios';

import authService from '@/services/auth/auth.service.ts';

export class AxiosService {
    create(baseUrl: string) {
        const axiosInstance: AxiosInstance = axios.create({
            baseURL: baseUrl,
            headers: { 'Content-Type': 'application/json' },
        });

        axiosInstance.interceptors.request.use(
            (config) => {
                const token = authService.getAuthToken();
                if (token) {
                    config.headers['Authorization'] = `Bearer ${token}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        return axiosInstance;
    }
}

const axiosService = new AxiosService();

export default axiosService;
