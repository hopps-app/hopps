// app/login.tsx

import React, { useContext, useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from '@/components/Text';
import { Input } from '@/components/Input';
import { Checkbox } from '@/components/Checkbox';
import { Link } from 'expo-router';
import { Button } from '@/components/Button';
import Animated, { BounceInDown, BounceInRight } from 'react-native-reanimated';
import { AuthContext } from '@/contexts/AuthContext';
import { KeycloakService } from '@/services/auth/keycloak-client';

// Initialize the Keycloak service
const keycloakService = new KeycloakService({
    url: 'https://id.hopps.cloud', // Replace with your Keycloak URL
    realm: 'hopps', // Replace with your realm name
    clientId: 'hopps-mobile', // Replace with your client ID
});

export default function LoginView() {
    const [checked, setChecked] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const authContext = useContext(AuthContext);

    async function login() {
        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const tokens = await keycloakService.login({
                username: email,
                password: password,
            });

            // Update auth context with tokens
            authContext?.setAuthState({
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                authenticated: true,
            });

            // Save to secure storage if "Remember me" is checked
            if (checked) {
                // Here you'd use expo-secure-store or similar to save refresh token
                // await SecureStore.setItemAsync('refreshToken', tokens.refresh_token);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <View className='h-full w-full flex items-center justify-center'>
            <Animated.Image
                entering={BounceInDown.delay(200).duration(600).springify().damping(3)}
                width={240}
                height={60}
                source={require('@/assets/images/hopps-logo.png')}
            />
            <Text className='pt-5'>Welcome back! Please enter your valid data</Text>
            <View className='p-5 w-full'>
                {error && <Text className='text-red-500'>{error}</Text>}

                <Animated.Text entering={BounceInRight.delay(400).duration(600).springify()} className='pt-10 font-bold text-left w-full text-lg'>E-Mail</Animated.Text>
                <Input
                    inputMode='email'
                    keyboardType='email-address'
                    className='w-full'
                    value={email}
                    onChangeText={setEmail}
                />

                <Animated.Text entering={BounceInRight.delay(500).duration(600).springify()} className='pt-10 font-bold text-left w-full text-lg'>Password</Animated.Text>
                <Input
                    secureTextEntry={true}
                    className='w-full'
                    value={password}
                    onChangeText={setPassword}
                />

                <View className="pt-10 flex flex-row items-center justify-between">
                    <View className="flex flex-row items-center">
                        <Checkbox checked={checked} onCheckedChange={() => setChecked(!checked)} />
                        <Text className="pl-2">Remember me</Text>
                    </View>

                    <Link className="text-[#9955CC]" href="https://hopps.cloud">
                        Forgot password?
                    </Link>
                </View>

                <Button
                    onPress={login}
                    className="mt-10"
                    disabled={isLoading}
                >
                    <Text>{isLoading ? 'Logging in...' : 'Login'}</Text>
                </Button>
            </View>
        </View>
    );
}