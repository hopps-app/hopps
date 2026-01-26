import { OrganizationStatistics, BommelStatistics, BommelStatisticsMap } from '../types/Statistics';

export interface IHttpClient {
    fetch(url: string, init?: RequestInit): Promise<Response>;
}

/**
 * Statistics Service for fetching financial statistics.
 * This service provides methods to retrieve aggregated financial data
 * for organizations and bommels.
 */
export class StatisticsService {
    private baseUrl: string;
    private http: IHttpClient;

    constructor(baseUrl: string, http: IHttpClient) {
        this.baseUrl = baseUrl;
        this.http = http;
    }

    /**
     * Get statistics for an organization.
     * @param orgId - The organization ID
     * @param includeDrafts - Whether to include draft transactions (default: false)
     * @returns Organization statistics including totals for income, expenses, receipts, and bommels
     */
    async getOrganizationStatistics(orgId: number, includeDrafts: boolean = false): Promise<OrganizationStatistics> {
        const url = `${this.baseUrl}/statistics/organizations/${orgId}?includeDrafts=${includeDrafts}`;
        const response = await this.http.fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch organization statistics: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Get statistics for a specific bommel.
     * @param bommelId - The bommel ID
     * @param includeDrafts - Whether to include draft transactions (default: false)
     * @param aggregate - Whether to aggregate statistics from child bommels (default: false)
     * @returns Bommel statistics including income, expenses, and balance
     */
    async getBommelStatistics(
        bommelId: number,
        includeDrafts: boolean = false,
        aggregate: boolean = false
    ): Promise<BommelStatistics> {
        const url = `${this.baseUrl}/statistics/bommels/${bommelId}?includeDrafts=${includeDrafts}&aggregate=${aggregate}`;
        const response = await this.http.fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Bommel not found');
            }
            throw new Error(`Failed to fetch bommel statistics: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Get statistics for all bommels in an organization.
     * @param orgId - The organization ID
     * @param includeDrafts - Whether to include draft transactions (default: false)
     * @param aggregate - Whether to aggregate statistics from child bommels (default: false)
     * @returns Map of bommel statistics keyed by bommel ID
     */
    async getAllBommelStatistics(
        orgId: number,
        includeDrafts: boolean = false,
        aggregate: boolean = false
    ): Promise<BommelStatisticsMap> {
        const url = `${this.baseUrl}/statistics/organizations/${orgId}/bommels?includeDrafts=${includeDrafts}&aggregate=${aggregate}`;
        const response = await this.http.fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch all bommel statistics: ${response.status}`);
        }

        return await response.json();
    }
}
