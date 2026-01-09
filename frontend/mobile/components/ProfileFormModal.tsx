import React, { useState, useEffect, useContext } from 'react';
import {
    View,
    Modal,
    ScrollView,
    Pressable,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Text } from '@/components/Text';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { ProfileContext } from '@/contexts/ProfileContext';
import { ServerProfile } from '@/services/profile/profile.types';
import { X } from 'lucide-react-native';

interface ProfileFormModalProps {
    visible: boolean;
    profile?: ServerProfile | null;
    onClose: () => void;
}

export function ProfileFormModal({
    visible,
    profile,
    onClose,
}: ProfileFormModalProps) {
    const profileContext = useContext(ProfileContext);
    const isEditMode = !!profile;

    const [name, setName] = useState('');
    const [apiUrl, setApiUrl] = useState('');
    const [identityUrl, setIdentityUrl] = useState('');
    const [realm, setRealm] = useState('hopps');
    const [clientId, setClientId] = useState('hopps-mobile');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (profile) {
            setName(profile.name);
            setApiUrl(profile.apiUrl);
            setIdentityUrl(profile.identityUrl);
            setRealm(profile.realm);
            setClientId(profile.clientId);
        } else {
            setName('');
            setApiUrl('');
            setIdentityUrl('');
            setRealm('hopps');
            setClientId('hopps-mobile');
        }
        setError(null);
    }, [profile, visible]);

    const validateUrl = (url: string): boolean => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    const handleSubmit = async () => {
        setError(null);

        if (!name.trim()) {
            setError('Profile name is required');
            return;
        }
        if (!apiUrl.trim() || !validateUrl(apiUrl)) {
            setError(
                'Valid API URL is required (e.g., https://api.example.com)'
            );
            return;
        }
        if (!identityUrl.trim() || !validateUrl(identityUrl)) {
            setError(
                'Valid Identity URL is required (e.g., https://id.example.com)'
            );
            return;
        }
        if (!realm.trim()) {
            setError('Keycloak realm is required');
            return;
        }
        if (!clientId.trim()) {
            setError('Client ID is required');
            return;
        }

        setIsSubmitting(true);

        try {
            const profileData = {
                name: name.trim(),
                apiUrl: apiUrl.trim().replace(/\/$/, ''),
                identityUrl: identityUrl.trim().replace(/\/$/, ''),
                realm: realm.trim(),
                clientId: clientId.trim(),
            };

            if (isEditMode && profile) {
                await profileContext?.updateProfile(profile.id, profileData);
            } else {
                await profileContext?.addProfile(profileData);
            }

            onClose();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Failed to save profile'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-background rounded-t-2xl p-4 max-h-[85%]">
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-lg font-bold">
                                {isEditMode ? 'Edit Server' : 'Add Server'}
                            </Text>
                            <Pressable onPress={onClose} className="p-2">
                                <X size={24} color="#525252" />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {error && (
                                <View className="bg-destructive/10 p-3 rounded-lg mb-4">
                                    <Text className="text-destructive">
                                        {error}
                                    </Text>
                                </View>
                            )}

                            <View className="mb-4">
                                <Text className="font-semibold mb-1">
                                    Server Name
                                </Text>
                                <Input
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="e.g., My Company Server"
                                />
                            </View>

                            <View className="mb-4">
                                <Text className="font-semibold mb-1">
                                    API URL
                                </Text>
                                <Input
                                    value={apiUrl}
                                    onChangeText={setApiUrl}
                                    placeholder="https://api.example.com"
                                    keyboardType="url"
                                    autoCapitalize="none"
                                />
                                <Text className="text-xs text-muted-foreground mt-1">
                                    The base URL for the Hopps API
                                </Text>
                            </View>

                            <View className="mb-4">
                                <Text className="font-semibold mb-1">
                                    Identity Server URL
                                </Text>
                                <Input
                                    value={identityUrl}
                                    onChangeText={setIdentityUrl}
                                    placeholder="https://id.example.com"
                                    keyboardType="url"
                                    autoCapitalize="none"
                                />
                                <Text className="text-xs text-muted-foreground mt-1">
                                    Keycloak server URL for authentication
                                </Text>
                            </View>

                            <View className="mb-4">
                                <Text className="font-semibold mb-1">
                                    Realm
                                </Text>
                                <Input
                                    value={realm}
                                    onChangeText={setRealm}
                                    placeholder="hopps"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View className="mb-6">
                                <Text className="font-semibold mb-1">
                                    Client ID
                                </Text>
                                <Input
                                    value={clientId}
                                    onChangeText={setClientId}
                                    placeholder="hopps-mobile"
                                    autoCapitalize="none"
                                />
                            </View>

                            <Button
                                onPress={handleSubmit}
                                disabled={isSubmitting}
                                className="mb-4"
                            >
                                <Text>
                                    {isSubmitting
                                        ? 'Saving...'
                                        : isEditMode
                                          ? 'Update Server'
                                          : 'Add Server'}
                                </Text>
                            </Button>
                        </ScrollView>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
