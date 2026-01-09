import React, { useState, useContext } from 'react';
import { View, Pressable, Modal, FlatList } from 'react-native';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { ProfileContext } from '@/contexts/ProfileContext';
import { ServerProfile } from '@/services/profile/profile.types';
import {
    ChevronDown,
    Server,
    Check,
    Plus,
    Pencil,
    Trash2,
} from 'lucide-react-native';

interface ProfileSelectorProps {
    onAddProfile: () => void;
    onEditProfile: (profile: ServerProfile) => void;
}

export function ProfileSelector({
    onAddProfile,
    onEditProfile,
}: ProfileSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const profileContext = useContext(ProfileContext);

    if (!profileContext) return null;

    const { profiles, activeProfile, setActiveProfile, deleteProfile } =
        profileContext;

    const handleSelect = async (profile: ServerProfile) => {
        await setActiveProfile(profile.id);
        setIsOpen(false);
    };

    const handleDelete = async (profile: ServerProfile) => {
        if (profile.isDefault) return;
        await deleteProfile(profile.id);
    };

    return (
        <View className="w-full mb-4">
            <Pressable
                onPress={() => setIsOpen(true)}
                className="flex-row items-center justify-between px-4 py-3 bg-secondary rounded-lg border border-border"
            >
                <View className="flex-row items-center">
                    <Server size={18} color="#525252" />
                    <Text className="ml-2 text-foreground">
                        {activeProfile?.name || 'Select Server'}
                    </Text>
                </View>
                <ChevronDown size={18} color="#525252" />
            </Pressable>

            <Modal
                visible={isOpen}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsOpen(false)}
            >
                <Pressable
                    className="flex-1 bg-black/50 justify-end"
                    onPress={() => setIsOpen(false)}
                >
                    <Pressable
                        className="bg-background rounded-t-2xl p-4"
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Text className="text-lg font-bold mb-4">
                            Select Server
                        </Text>

                        <FlatList
                            data={profiles}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <ProfileListItem
                                    profile={item}
                                    isActive={item.id === activeProfile?.id}
                                    onSelect={() => handleSelect(item)}
                                    onEdit={() => {
                                        setIsOpen(false);
                                        onEditProfile(item);
                                    }}
                                    onDelete={() => handleDelete(item)}
                                />
                            )}
                            style={{ maxHeight: 300 }}
                        />

                        <Button
                            variant="outline"
                            className="mt-4"
                            onPress={() => {
                                setIsOpen(false);
                                onAddProfile();
                            }}
                        >
                            <Plus size={18} color="#525252" />
                            <Text className="ml-2">Add Server</Text>
                        </Button>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

interface ProfileListItemProps {
    profile: ServerProfile;
    isActive: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

function ProfileListItem({
    profile,
    isActive,
    onSelect,
    onEdit,
    onDelete,
}: ProfileListItemProps) {
    return (
        <Pressable
            onPress={onSelect}
            className={`flex-row items-center justify-between p-3 rounded-lg mb-2 ${
                isActive ? 'bg-primary/10' : 'bg-secondary'
            }`}
        >
            <View className="flex-1">
                <View className="flex-row items-center">
                    <Text className="font-semibold">{profile.name}</Text>
                    {profile.isDefault && (
                        <View className="ml-2 px-2 py-0.5 bg-primary/20 rounded">
                            <Text className="text-xs text-primary">
                                Default
                            </Text>
                        </View>
                    )}
                </View>
                <Text className="text-sm text-muted-foreground">
                    {profile.apiUrl}
                </Text>
            </View>

            <View className="flex-row items-center">
                {isActive && <Check size={18} color="#9058c5" />}
                {!profile.isDefault && (
                    <>
                        <Pressable onPress={onEdit} className="p-2 ml-2">
                            <Pencil size={16} color="#525252" />
                        </Pressable>
                        <Pressable onPress={onDelete} className="p-2">
                            <Trash2 size={16} color="#da1e28" />
                        </Pressable>
                    </>
                )}
            </View>
        </Pressable>
    );
}
