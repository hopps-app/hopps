export interface ServerProfile {
    id: string;
    name: string;
    apiUrl: string;
    identityUrl: string;
    realm: string;
    clientId: string;
    isDefault: boolean;
}

export interface ProfileState {
    profiles: ServerProfile[];
    activeProfileId: string | null;
}

export const DEFAULT_PROFILE: ServerProfile = {
    id: 'hopps-cloud-default',
    name: 'Hopps Cloud',
    apiUrl: 'https://api.hopps.cloud',
    identityUrl: 'https://id.hopps.cloud',
    realm: 'hopps',
    clientId: 'hopps-mobile',
    isDefault: true,
};
