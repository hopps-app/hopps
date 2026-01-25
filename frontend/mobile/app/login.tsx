// app/login.tsx

import React, { useContext, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';
import { Input } from '@/components/Input';
import { Checkbox } from '@/components/Checkbox';
import { Link } from 'expo-router';
import { Button } from '@/components/Button';
import Animated, { BounceInDown, BounceInRight } from 'react-native-reanimated';
import { AuthContext } from '@/contexts/AuthContext';
import { ProfileContext } from '@/contexts/ProfileContext';
import { KeycloakService } from '@/services/auth/keycloak-client';
import { ProfileSelector } from '@/components/ProfileSelector';
import { ProfileFormModal } from '@/components/ProfileFormModal';
import { ServerProfile } from '@/services/profile/profile.types';
import * as SecureStore from 'expo-secure-store';

export default function LoginView() {
    const [checked, setChecked] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showProfileForm, setShowProfileForm] = useState(false);
    const [editingProfile, setEditingProfile] = useState<ServerProfile | null>(
        null
    );

    const authContext = useContext(AuthContext);
    const profileContext = useContext(ProfileContext);

    const getKeycloakService = () => {
        const profile = profileContext?.activeProfile;
        if (!profile) return null;

        return new KeycloakService({
            url: profile.identityUrl,
            realm: profile.realm,
            clientId: profile.clientId,
        });
    };

    async function login() {
        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }

        const keycloakService = getKeycloakService();
        if (!keycloakService) {
            setError('Please select a server profile');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const tokens = await keycloakService.login({
                username: email,
                password: password,
            });

            authContext?.setAuthState({
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                authenticated: true,
            });

            if (checked) {
                await SecureStore.setItemAsync(
                    'accessToken',
                    tokens.access_token
                );
                await SecureStore.setItemAsync(
                    'refreshToken',
                    tokens.refresh_token
                );
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setIsLoading(false);
        }
    }

    const handleAddProfile = () => {
        setEditingProfile(null);
        setShowProfileForm(true);
    };

    const handleEditProfile = (profile: ServerProfile) => {
        setEditingProfile(profile);
        setShowProfileForm(true);
    };

    return (
        <View className="h-full w-full flex items-center justify-center">
            <Animated.Image
                entering={BounceInDown.delay(200)
                    .duration(600)
                    .springify()
                    .damping(3)}
                width={240}
                height={60}
                source={require('@/assets/images/hopps-logo.png')}
            />
            <Text className="pt-5">
                Welcome back! Please enter your valid data
            </Text>
            <View className="p-5 w-full">
                {error && <Text className="text-red-500 mb-4">{error}</Text>}

                <ProfileSelector
                    onAddProfile={handleAddProfile}
                    onEditProfile={handleEditProfile}
                />

                <Animated.Text
                    entering={BounceInRight.delay(400)
                        .duration(600)
                        .springify()}
                    className="pt-6 font-bold text-left w-full text-lg"
                >
                    E-Mail
                </Animated.Text>
                <Input
                    inputMode="email"
                    keyboardType="email-address"
                    className="w-full"
                    value={email}
                    onChangeText={setEmail}
                />

                <Animated.Text
                    entering={BounceInRight.delay(500)
                        .duration(600)
                        .springify()}
                    className="pt-6 font-bold text-left w-full text-lg"
                >
                    Password
                </Animated.Text>
                <Input
                    secureTextEntry={true}
                    className="w-full"
                    value={password}
                    onChangeText={setPassword}
                />

                <View className="pt-6 flex flex-row items-center justify-between">
                    <View className="flex flex-row items-center">
                        <Checkbox
                            checked={checked}
                            onCheckedChange={() => setChecked(!checked)}
                        />
                        <Text className="pl-2">Remember me</Text>
                    </View>

                    <Link className="text-[#9955CC]" href="https://hopps.cloud">
                        Forgot password?
                    </Link>
                </View>

                <Button onPress={login} className="mt-10" disabled={isLoading}>
                    <Text>{isLoading ? 'Logging in...' : 'Login'}</Text>
                </Button>
            </View>

            <ProfileFormModal
                visible={showProfileForm}
                profile={editingProfile}
                onClose={() => setShowProfileForm(false)}
            />
        </View>
    );
}
