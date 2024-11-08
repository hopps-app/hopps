import { BommelService } from '@/services/api/BommelService.ts';

export class ApiService {
    public baseUrl: string;

    public bommelService: BommelService;

    constructor() {
        this.baseUrl = process.env.REACT_APP_API_URL || '';

        this.bommelService = new BommelService('');
    }
}

const apiService = new ApiService();
export default apiService;
