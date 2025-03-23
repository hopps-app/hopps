import React, {createContext, useContext} from 'react';
import axios from 'axios';
import {AuthContext} from './AuthContext';
import createAuthRefreshInterceptor from 'axios-auth-refresh';
import * as SecureStore from 'expo-secure-store';

const AxiosContext = createContext<any | undefined>(undefined);

const {Provider} = AxiosContext;

const AxiosProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const authContext = useContext(AuthContext);

    const authAxios = axios.create({
        baseURL: 'http://localhost:3000/api',
    });

    const publicAxios = axios.create({
        baseURL: 'http://localhost:3000/api',
    });

    authAxios.interceptors.request.use(
        config => {
            if (!config.headers.Authorization) {
                config.headers.Authorization = authContext ? `Bearer ${authContext.getAccessToken()}` : '';
            }

            return config;
        },
        error => {
            return Promise.reject(error);
        },
    );

    const refreshAuthLogic = (failedRequest: { response: { config: { headers: { Authorization: string } } } }) => {
        const data = {
            refreshToken: authContext?.authState.refreshToken || null,
        };

        const options = {
            method: 'POST',
            data,
            url: 'http://localhost:3001/api/refreshToken',
        };

        return axios(options)
            .then(async tokenRefreshResponse => {
                failedRequest.response.config.headers.Authorization =
                    'Bearer ' + tokenRefreshResponse.data.accessToken;

                authContext?.setAuthState({
                    ...authContext.authState,
                    accessToken: tokenRefreshResponse.data.accessToken,
                });

                await SecureStore.setItemAsync('accessToken', tokenRefreshResponse.data.accessToken);
                await SecureStore.setItemAsync('accessToken', tokenRefreshResponse.data.refreshToken);

                return Promise.resolve();
            })
            .catch(e => {
                authContext?.setAuthState({
                    accessToken: null,
                    refreshToken: null,
                    authenticated: false
                });
            });
    };

    createAuthRefreshInterceptor(authAxios, refreshAuthLogic, {});

    return (
        <Provider
            value={{
                authAxios,
                publicAxios,
            }}>
            {children}
        </Provider>
    );
};

export {AxiosContext, AxiosProvider};