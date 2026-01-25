import React, {
    createContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import {
    ServerProfile,
    DEFAULT_PROFILE,
} from '@/services/profile/profile.types';

interface ProfileContextType {
    profiles: ServerProfile[];
    activeProfile: ServerProfile | null;
    isLoading: boolean;
    addProfile: (
        profile: Omit<ServerProfile, 'id' | 'isDefault'>
    ) => Promise<void>;
    updateProfile: (
        id: string,
        updates: Partial<ServerProfile>
    ) => Promise<void>;
    deleteProfile: (id: string) => Promise<void>;
    setActiveProfile: (id: string) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

const { Provider } = ProfileContext;

const PROFILES_STORAGE_KEY = 'serverProfiles';
const ACTIVE_PROFILE_KEY = 'activeProfileId';

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
        /[xy]/g,
        function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        }
    );
}

const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [profiles, setProfiles] = useState<ServerProfile[]>([]);
    const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadProfiles = useCallback(async () => {
        try {
            const storedProfiles = await SecureStore.getItemAsync(
                PROFILES_STORAGE_KEY
            );
            const storedActiveId =
                await SecureStore.getItemAsync(ACTIVE_PROFILE_KEY);

            if (storedProfiles) {
                const parsed = JSON.parse(storedProfiles) as ServerProfile[];
                setProfiles(parsed);
                setActiveProfileId(storedActiveId || parsed[0]?.id || null);
            } else {
                const initialProfiles = [DEFAULT_PROFILE];
                await SecureStore.setItemAsync(
                    PROFILES_STORAGE_KEY,
                    JSON.stringify(initialProfiles)
                );
                await SecureStore.setItemAsync(
                    ACTIVE_PROFILE_KEY,
                    DEFAULT_PROFILE.id
                );
                setProfiles(initialProfiles);
                setActiveProfileId(DEFAULT_PROFILE.id);
            }
        } catch (error) {
            console.error('Failed to load profiles:', error);
            setProfiles([DEFAULT_PROFILE]);
            setActiveProfileId(DEFAULT_PROFILE.id);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProfiles();
    }, [loadProfiles]);

    const saveProfiles = async (newProfiles: ServerProfile[]) => {
        await SecureStore.setItemAsync(
            PROFILES_STORAGE_KEY,
            JSON.stringify(newProfiles)
        );
        setProfiles(newProfiles);
    };

    const addProfile = async (
        profileData: Omit<ServerProfile, 'id' | 'isDefault'>
    ) => {
        const newProfile: ServerProfile = {
            ...profileData,
            id: generateUUID(),
            isDefault: false,
        };
        const newProfiles = [...profiles, newProfile];
        await saveProfiles(newProfiles);
    };

    const updateProfile = async (
        id: string,
        updates: Partial<ServerProfile>
    ) => {
        const profile = profiles.find((p) => p.id === id);
        if (profile?.isDefault) {
            throw new Error('Cannot modify the default Hopps Cloud profile');
        }
        const newProfiles = profiles.map((p) =>
            p.id === id
                ? { ...p, ...updates, id: p.id, isDefault: p.isDefault }
                : p
        );
        await saveProfiles(newProfiles);
    };

    const deleteProfile = async (id: string) => {
        const profile = profiles.find((p) => p.id === id);
        if (profile?.isDefault) {
            throw new Error('Cannot delete the default Hopps Cloud profile');
        }
        const newProfiles = profiles.filter((p) => p.id !== id);
        await saveProfiles(newProfiles);

        if (activeProfileId === id) {
            const defaultId =
                profiles.find((p) => p.isDefault)?.id || newProfiles[0]?.id;
            if (defaultId) {
                await setActiveProfile(defaultId);
            }
        }
    };

    const setActiveProfile = async (id: string) => {
        await SecureStore.setItemAsync(ACTIVE_PROFILE_KEY, id);
        setActiveProfileId(id);
    };

    const activeProfile =
        profiles.find((p) => p.id === activeProfileId) || null;

    return (
        <Provider
            value={{
                profiles,
                activeProfile,
                isLoading,
                addProfile,
                updateProfile,
                deleteProfile,
                setActiveProfile,
            }}
        >
            {children}
        </Provider>
    );
};

export { ProfileContext, ProfileProvider };
