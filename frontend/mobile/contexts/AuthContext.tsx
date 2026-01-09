//AuthContext.js
import React, { createContext, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { KeycloakService } from '@/services/auth/keycloak-client';

interface KeycloakConfig {
    url: string;
    realm: string;
    clientId: string;
}

const AuthContext = createContext<{
    authState: AuthContextProps;
    getAccessToken: () => string | null;
    setAuthState: React.Dispatch<React.SetStateAction<AuthContextProps>>;
    logout: (keycloakConfig?: KeycloakConfig) => Promise<void>;
} | null>(null);

const { Provider } = AuthContext;

interface AuthContextProps {
    accessToken: string | null;
    refreshToken: string | null;
    authenticated: boolean;
}

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [authState, setAuthState] = useState<AuthContextProps>({
        accessToken: null,
        refreshToken: null,
        authenticated: false,
    });

    const logout = async (keycloakConfig?: KeycloakConfig) => {
        if (keycloakConfig && authState.refreshToken) {
            try {
                const keycloakService = new KeycloakService(keycloakConfig);
                await keycloakService.logout(authState.refreshToken);
            } catch (error) {
                console.warn('Failed to invalidate token on server:', error);
            }
        }

        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');

        setAuthState({
            accessToken: null,
            refreshToken: null,
            authenticated: false,
        });
    };

    const getAccessToken = () => {
        return authState.accessToken;
    };

    return (
        <Provider
            value={{
                authState,
                getAccessToken,
                setAuthState,
                logout,
            }}
        >
            {children}
        </Provider>
    );
};

export { AuthContext, AuthProvider };
