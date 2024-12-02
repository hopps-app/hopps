import { BommelService } from '@/services/api/BommelService.ts';
import { InvoicesService } from '@/services/api/invoicesService.ts';

export class ApiService {
    public baseUrl: string;

    public bommel: BommelService;
    public invoices: InvoicesService;

    constructor() {
        this.baseUrl = import.meta.env.VITE_API_URL || '';

        this.bommel = new BommelService(this.baseUrl);
        this.invoices = new InvoicesService(this.baseUrl);
    }
}

const apiService = new ApiService();
export default apiService;
