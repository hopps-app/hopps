type RegisterOrganizationPayload = {
    owner: {
        firstName: string;
        lastName: string;
        email: string;
    };
    newPassword: string;
    organization: {
        profilePicture?: string;
        website?: string;
        address?: {
            number?: string;
            city?: string;
            additionalLine?: string;
            street?: string;
            plz?: string;
        };
        name: string;
        type: 'EINGETRAGENER_VEREIN';
        slug: string;
    };
};

export class OrganizationService {
    constructor(private baseUrl: string) {}

    async registerOrganization(payload: RegisterOrganizationPayload): Promise<void> {
        const url = `${import.meta.env.VITE_ORGANIZATION_SERVICE_URL || this.baseUrl}/organization`;
        await window.fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
    }

    async getBySlug(slug: string) {
        const url = `${import.meta.env.VITE_ORGANIZATION_SERVICE_URL || this.baseUrl}/organization/${slug}`;
        const result = await window.fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        const organisation = await result.json();
        console.log(organisation);

        return organisation;
    }

    createSlug(input: string): string {
        return input
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .trim()
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-'); // Replace multiple hyphens with a single hyphen
    }
}
