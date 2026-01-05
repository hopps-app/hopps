import { createApiService, ApiService } from '@hopps/api-client';

import authService from '@/services/auth/auth.service.ts';

const orgBaseUrl = import.meta.env.VITE_API_ORG_URL;

const apiService: ApiService = createApiService({
    orgBaseUrl: orgBaseUrl,
    getAccessToken: () => authService.getAuthToken(),
    refreshToken: () => authService.refreshToken(),
});
export default apiService;
