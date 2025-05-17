import { Bommel } from '@/services/api/types/Bommel.ts';

export type Organization = {
    id: number;
    name: string;
    slug: string;
    address: string | null;
    rootBommel?: Bommel;
};

export type OrganizationConfirmationPayload =
    | {
          firstName: string;
          lastName: string;
      }
    | undefined;

export type RegisterOrganizationPayload = {
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
