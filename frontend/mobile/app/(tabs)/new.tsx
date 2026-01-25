import {
    View,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    useColorScheme,
    ActivityIndicator,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useDocuments } from '@/contexts/DocumentContext';
import { AnalysisStatus, DocumentStatus } from '@/types/document';

type SelectedFile = {
    uri: string;
    name: string;
    type: string;
    size?: number;
};

export default function NewDocumentScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { addDocument } = useDocuments();
    const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const pickImageFromGallery = useCallback(async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            Alert.alert(
                'Berechtigung erforderlich',
                'Bitte erlaube den Zugriff auf deine Fotos, um Belege hochzuladen.'
            );
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setSelectedFile({
                uri: asset.uri,
                name: asset.fileName || `foto_${Date.now()}.jpg`,
                type: asset.mimeType || 'image/jpeg',
                size: asset.fileSize,
            });
        }
    }, []);

    const takePhoto = useCallback(async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

        if (!permissionResult.granted) {
            Alert.alert(
                'Berechtigung erforderlich',
                'Bitte erlaube den Zugriff auf die Kamera, um Belege zu fotografieren.'
            );
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setSelectedFile({
                uri: asset.uri,
                name: asset.fileName || `foto_${Date.now()}.jpg`,
                type: asset.mimeType || 'image/jpeg',
                size: asset.fileSize,
            });
        }
    }, []);

    const pickDocument = useCallback(async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'image/*'],
            copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setSelectedFile({
                uri: asset.uri,
                name: asset.name,
                type: asset.mimeType || 'application/pdf',
                size: asset.size,
            });
        }
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedFile(null);
    }, []);

    const uploadDocument = useCallback(async () => {
        if (!selectedFile) return;

        setIsUploading(true);

        // Simulate upload delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Add mock document
        addDocument({
            name: undefined,
            total: 0,
            currencyCode: 'EUR',
            fileName: selectedFile.name,
            fileContentType: selectedFile.type,
            fileSize: selectedFile.size,
            analysisStatus: AnalysisStatus.ANALYZING,
            documentStatus: DocumentStatus.ANALYZING,
            privatelyPaid: false,
            uploadedBy: 'current_user',
        });

        setIsUploading(false);
        setSelectedFile(null);

        // Show success and navigate to home
        Alert.alert(
            'Beleg hochgeladen',
            'Dein Beleg wird jetzt analysiert. Du wirst benachrichtigt, sobald die Analyse abgeschlossen ist.',
            [
                {
                    text: 'OK',
                    onPress: () => router.replace('/'),
                },
            ]
        );
    }, [selectedFile, addDocument]);

    const isImage = selectedFile?.type.startsWith('image/');

    return (
        <ScrollView
            className="flex-1"
            style={{ backgroundColor: colors.background }}
            contentContainerStyle={{ flexGrow: 1 }}
        >
            <View className="flex-1 px-5 pt-16 pb-8">
                {/* Header */}
                <View className="mb-8">
                    <Text className="text-3xl font-bold text-foreground mb-2">
                        Beleg hochladen
                    </Text>
                    <Text className="text-base text-muted-foreground">
                        Fotografiere einen Beleg oder wähle eine Datei aus
                    </Text>
                </View>

                {/* File Selection or Preview */}
                {selectedFile ? (
                    <View className="flex-1">
                        {/* Preview */}
                        <View
                            className="rounded-2xl overflow-hidden mb-6"
                            style={{
                                backgroundColor: colorScheme === 'dark' ? '#1f1f1f' : '#ffffff',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 8,
                                elevation: 4,
                            }}
                        >
                            {isImage ? (
                                <Image
                                    source={{ uri: selectedFile.uri }}
                                    style={{ width: '100%', height: 300 }}
                                    resizeMode="contain"
                                />
                            ) : (
                                <View
                                    className="items-center justify-center py-16"
                                    style={{ height: 300 }}
                                >
                                    <Ionicons
                                        name="document-text"
                                        size={80}
                                        color={colors.tint}
                                    />
                                    <Text className="text-lg font-medium mt-4 text-foreground">
                                        PDF Dokument
                                    </Text>
                                </View>
                            )}

                            {/* File Info */}
                            <View
                                className="p-4 border-t"
                                style={{
                                    borderTopColor: colorScheme === 'dark' ? '#333' : '#e5e5e5',
                                }}
                            >
                                <Text
                                    className="text-base font-medium text-foreground"
                                    numberOfLines={1}
                                >
                                    {selectedFile.name}
                                </Text>
                                {selectedFile.size && (
                                    <Text className="text-sm text-muted-foreground mt-1">
                                        {(selectedFile.size / 1024).toFixed(1)} KB
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View className="gap-3">
                            <Button
                                onPress={uploadDocument}
                                disabled={isUploading}
                                size="lg"
                                className="w-full"
                            >
                                {isUploading ? (
                                    <View className="flex-row items-center gap-2">
                                        <ActivityIndicator color="#ffffff" size="small" />
                                        <Text className="text-white font-semibold">
                                            Wird hochgeladen...
                                        </Text>
                                    </View>
                                ) : (
                                    <View className="flex-row items-center gap-2">
                                        <Ionicons name="cloud-upload" size={20} color="#ffffff" />
                                        <Text className="text-white font-semibold">
                                            Beleg hochladen
                                        </Text>
                                    </View>
                                )}
                            </Button>

                            <Button
                                variant="outline"
                                onPress={clearSelection}
                                disabled={isUploading}
                                size="lg"
                                className="w-full"
                            >
                                <View className="flex-row items-center gap-2">
                                    <Ionicons
                                        name="close"
                                        size={20}
                                        color={colors.text}
                                    />
                                    <Text className="font-semibold">Andere Datei wählen</Text>
                                </View>
                            </Button>
                        </View>
                    </View>
                ) : (
                    <View className="flex-1">
                        {/* Main Options */}
                        <View className="gap-4 mb-8">
                            {/* Camera Option */}
                            <TouchableOpacity
                                onPress={takePhoto}
                                activeOpacity={0.7}
                                className="rounded-2xl p-6"
                                style={{
                                    backgroundColor: colors.tint,
                                    shadowColor: colors.tint,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 6,
                                }}
                            >
                                <View className="flex-row items-center">
                                    <View
                                        className="w-14 h-14 rounded-full items-center justify-center mr-4"
                                        style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                                    >
                                        <Ionicons name="camera" size={28} color="#ffffff" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-lg font-bold text-white">
                                            Foto aufnehmen
                                        </Text>
                                        <Text
                                            className="text-sm mt-1"
                                            style={{ color: 'rgba(255,255,255,0.8)' }}
                                        >
                                            Beleg direkt fotografieren
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={24}
                                        color="rgba(255,255,255,0.8)"
                                    />
                                </View>
                            </TouchableOpacity>

                            {/* Gallery Option */}
                            <TouchableOpacity
                                onPress={pickImageFromGallery}
                                activeOpacity={0.7}
                                className="rounded-2xl p-6"
                                style={{
                                    backgroundColor: colorScheme === 'dark' ? '#1f1f1f' : '#ffffff',
                                    borderWidth: 1,
                                    borderColor: colorScheme === 'dark' ? '#333' : '#e5e5e5',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 8,
                                    elevation: 2,
                                }}
                            >
                                <View className="flex-row items-center">
                                    <View
                                        className="w-14 h-14 rounded-full items-center justify-center mr-4"
                                        style={{
                                            backgroundColor:
                                                colorScheme === 'dark'
                                                    ? 'rgba(181, 131, 218, 0.2)'
                                                    : 'rgba(181, 131, 218, 0.1)',
                                        }}
                                    >
                                        <Ionicons name="images" size={28} color={colors.tint} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-lg font-bold text-foreground">
                                            Aus Galerie wählen
                                        </Text>
                                        <Text className="text-sm text-muted-foreground mt-1">
                                            Vorhandenes Foto auswählen
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={24}
                                        color={colors.icon}
                                    />
                                </View>
                            </TouchableOpacity>

                            {/* PDF Option */}
                            <TouchableOpacity
                                onPress={pickDocument}
                                activeOpacity={0.7}
                                className="rounded-2xl p-6"
                                style={{
                                    backgroundColor: colorScheme === 'dark' ? '#1f1f1f' : '#ffffff',
                                    borderWidth: 1,
                                    borderColor: colorScheme === 'dark' ? '#333' : '#e5e5e5',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 8,
                                    elevation: 2,
                                }}
                            >
                                <View className="flex-row items-center">
                                    <View
                                        className="w-14 h-14 rounded-full items-center justify-center mr-4"
                                        style={{
                                            backgroundColor:
                                                colorScheme === 'dark'
                                                    ? 'rgba(181, 131, 218, 0.2)'
                                                    : 'rgba(181, 131, 218, 0.1)',
                                        }}
                                    >
                                        <Ionicons
                                            name="document-text"
                                            size={28}
                                            color={colors.tint}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-lg font-bold text-foreground">
                                            PDF hochladen
                                        </Text>
                                        <Text className="text-sm text-muted-foreground mt-1">
                                            PDF-Dokument auswählen
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={24}
                                        color={colors.icon}
                                    />
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Info Box */}
                        <View
                            className="rounded-xl p-4 mt-auto"
                            style={{
                                backgroundColor:
                                    colorScheme === 'dark'
                                        ? 'rgba(181, 131, 218, 0.15)'
                                        : 'rgba(181, 131, 218, 0.1)',
                            }}
                        >
                            <View className="flex-row items-start">
                                <Ionicons
                                    name="sparkles"
                                    size={20}
                                    color={colors.tint}
                                    style={{ marginTop: 2 }}
                                />
                                <View className="flex-1 ml-3">
                                    <Text className="text-sm font-semibold text-foreground">
                                        KI-gestützte Analyse
                                    </Text>
                                    <Text className="text-sm text-muted-foreground mt-1">
                                        Nach dem Upload analysiert unsere KI deinen Beleg automatisch
                                        und extrahiert alle wichtigen Informationen.
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}
