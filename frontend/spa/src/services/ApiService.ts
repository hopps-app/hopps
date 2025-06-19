// import { BommelService } from '@/services/api/BommelService.ts';
// import { InvoicesService } from '@/services/api/invoicesService';
// import { OrganizationService } from '@/services/api/OrganizationService.ts';
//
// export class ApiService {
//     public orgUrl: string;
//     public finUrl: string;
//
//     public bommel: BommelService;
//     public invoices: InvoicesService;
//     public organization: OrganizationService;
//
//     constructor() {
//         this.orgUrl = import.meta.env.VITE_API_ORG_URL || '';
//         this.finUrl = import.meta.env.VITE_API_FIN_URL || '';
//
//         this.bommel = new BommelService(this.orgUrl);
//         this.invoices = new InvoicesService(this.finUrl);
//         this.organization = new OrganizationService(this.orgUrl);
//     }
// }
//

import { createApiService, ApiService } from '@hopps/api-client';

import authService from '@/services/auth/auth.service.ts';

const apiService: ApiService = createApiService({
    orgBaseUrl: import.meta.env.VITE_API_ORG_URL || '',
    finBaseUrl: import.meta.env.VITE_API_FIN_URL || '',
    getAccessToken: () => authService.getAuthToken(),
    refreshToken: () => authService.refreshToken(),
});
export default apiService;
