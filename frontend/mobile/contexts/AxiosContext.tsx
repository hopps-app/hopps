import React, { createContext, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import { ProfileContext } from './ProfileContext';
import { KeycloakService } from '@/services/auth/keycloak-client';
import createAuthRefreshInterceptor from 'axios-auth-refresh';
import * as SecureStore from 'expo-secure-store';

const AxiosContext = createContext<any | undefined>(undefined);

const { Provider } = AxiosContext;

const AxiosProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const authContext = useContext(AuthContext);
    const profileContext = useContext(ProfileContext);

    const baseURL =
        profileContext?.activeProfile?.apiUrl || 'http://localhost:3000/api';

    const authAxios = useMemo(() => {
        const instance = axios.create({
            baseURL: baseURL,
        });

        instance.interceptors.request.use(
            (config) => {
                if (!config.headers.Authorization) {
                    config.headers.Authorization = authContext
                        ? `Bearer ${authContext.getAccessToken()}`
                        : '';
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        return instance;
    }, [baseURL, authContext]);

    const publicAxios = useMemo(() => {
        return axios.create({
            baseURL: baseURL,
        });
    }, [baseURL]);

    const refreshAuthLogic = (failedRequest: {
        response: { config: { headers: { Authorization: string } } };
    }) => {
        const profile = profileContext?.activeProfile;
        if (!profile) {
            return Promise.reject(new Error('No active profile'));
        }

        const keycloakService = new KeycloakService({
            url: profile.identityUrl,
            realm: profile.realm,
            clientId: profile.clientId,
        });

        const refreshToken = authContext?.authState.refreshToken;
        if (!refreshToken) {
            return Promise.reject(new Error('No refresh token'));
        }

        return keycloakService
            .refreshToken(refreshToken)
            .then(async (tokens) => {
                failedRequest.response.config.headers.Authorization =
                    'Bearer ' + tokens.access_token;

                authContext?.setAuthState({
                    ...authContext.authState,
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                });

                await SecureStore.setItemAsync(
                    'accessToken',
                    tokens.access_token
                );
                await SecureStore.setItemAsync(
                    'refreshToken',
                    tokens.refresh_token
                );

                return Promise.resolve();
            })
            .catch(() => {
                authContext?.setAuthState({
                    accessToken: null,
                    refreshToken: null,
                    authenticated: false,
                });
            });
    };

    useMemo(() => {
        createAuthRefreshInterceptor(authAxios, refreshAuthLogic, {});
    }, [authAxios]);

    return (
        <Provider
            value={{
                authAxios,
                publicAxios,
            }}
        >
            {children}
        </Provider>
    );
};

export { AxiosContext, AxiosProvider };
