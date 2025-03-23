//AuthContext.js
import React, { createContext, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const AuthContext = createContext<{
    authState: AuthContextProps;
    getAccessToken: () => string | null;
    setAuthState: React.Dispatch<React.SetStateAction<AuthContextProps>>;
    logout: () => Promise<void>;
} | null>(null);

const { Provider } = AuthContext;

interface AuthContextProps {
    accessToken: string | null,
    refreshToken: string | null,
    authenticated: boolean
}

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [authState, setAuthState] = useState<AuthContextProps>({
        accessToken: null,
        refreshToken: null,
        authenticated: false,
    });

    const logout = async () => {
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
            }}>
            {children}
        </Provider>
    );
};

export { AuthContext, AuthProvider };