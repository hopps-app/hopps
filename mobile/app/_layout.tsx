import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useContext, useEffect, useState } from 'react';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/useColorScheme';
import LoginView from '@/app/login';
import { AuthContext, AuthProvider } from '@/contexts/AuthContext';
import { AxiosProvider } from '@/contexts/AxiosContext';
import { Text } from 'react-native';
import Spinner from '@/components/Spinner';
import * as SecureStore from 'expo-secure-store';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function AppContent() {
    const colorScheme = useColorScheme();
    const [status, setStatus] = useState('loading');
    const authContext = useContext(AuthContext);
    const isAuthenticated = authContext?.authState?.authenticated || false;

    const loadJWT = useCallback(async () => {
        try {
            const accessToken = await SecureStore.getItemAsync('accessToken');
            const refreshToken = await SecureStore.getItemAsync('accessToken');

            authContext?.setAuthState({
                accessToken: accessToken,
                refreshToken: refreshToken,
                authenticated: !!accessToken,
            });
            setStatus('success');
        } catch (error) {
            setStatus('error');
            console.log(`Secure Store Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            authContext?.setAuthState({
                accessToken: null,
                refreshToken: null,
                authenticated: false,
            });
        }
    }, []);

    useEffect(() => {
        loadJWT();
    }, [loadJWT]);


    if(status === 'loading') return (
        <Spinner />
    )

    return (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            {
                !isAuthenticated ? (
                    <LoginView />
                ) : (
                    <Stack>
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen name="+not-found" />
                    </Stack>
                )
            }
        </ThemeProvider>
    );
}

export default function RootLayout() {
    const [loaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });

    useEffect(() => {
        if (loaded) {
            SplashScreen.hideAsync();
        }
    }, [loaded]);

    if (!loaded) {
        return null;
    }

    return (
        <AuthProvider>
            <AxiosProvider>
                <AppContent />
            </AxiosProvider>
        </AuthProvider>
    );
}