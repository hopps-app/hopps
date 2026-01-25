import {
    View,
    ScrollView,
    TouchableOpacity,
    Alert,
    useColorScheme,
    ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { useDocuments } from '@/contexts/DocumentContext';
import {
    Document,
    DocumentStatus,
    ExtractionSource,
    getStatusDisplayName,
    getStatusColor,
    formatCurrency,
    formatDate,
    formatFileSize,
    getDisplayName,
} from '@/types/document';

function InfoRow({
    label,
    value,
    isAiGenerated,
}: {
    label: string;
    value?: string | null;
    isAiGenerated?: boolean;
}) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    if (!value) return null;

    return (
        <View className="py-3 border-b" style={{ borderBottomColor: colorScheme === 'dark' ? '#333' : '#e5e5e5' }}>
            <View className="flex-row items-center mb-1">
                <Text className="text-xs text-muted-foreground uppercase tracking-wide">
                    {label}
                </Text>
                {isAiGenerated && (
                    <View
                        className="ml-2 px-1.5 py-0.5 rounded flex-row items-center"
                        style={{ backgroundColor: `${colors.tint}20` }}
                    >
                        <Ionicons name="sparkles" size={10} color={colors.tint} />
                        <Text
                            className="text-xs ml-1"
                            style={{ color: colors.tint, fontSize: 10 }}
                        >
                            KI
                        </Text>
                    </View>
                )}
            </View>
            <Text className="text-base text-foreground">{value}</Text>
        </View>
    );
}

function SectionHeader({ title, icon }: { title: string; icon: keyof typeof Ionicons.glyphMap }) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <View className="flex-row items-center mb-3 mt-6">
            <View
                className="w-8 h-8 rounded-lg items-center justify-center mr-2"
                style={{
                    backgroundColor:
                        colorScheme === 'dark'
                            ? 'rgba(181, 131, 218, 0.2)'
                            : 'rgba(181, 131, 218, 0.1)',
                }}
            >
                <Ionicons name={icon} size={16} color={colors.tint} />
            </View>
            <Text className="text-lg font-semibold text-foreground">{title}</Text>
        </View>
    );
}

export default function DocumentDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { getDocumentById, confirmDocument, deleteDocument: removeDocument } = useDocuments();
    const [document, setDocument] = useState<Document | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);

    useEffect(() => {
        if (id) {
            const doc = getDocumentById(parseInt(id));
            setDocument(doc || null);
        }
    }, [id, getDocumentById]);

    const handleConfirm = useCallback(async () => {
        if (!document) return;

        setIsConfirming(true);
        const updated = await confirmDocument(document.id);

        if (updated) {
            setDocument(updated);
        }
        setIsConfirming(false);

        Alert.alert('Beleg bestätigt', 'Der Beleg wurde erfolgreich bestätigt.');
    }, [document, confirmDocument]);

    const handleDelete = useCallback(() => {
        if (!document) return;

        Alert.alert(
            'Beleg löschen',
            'Möchtest du diesen Beleg wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
            [
                { text: 'Abbrechen', style: 'cancel' },
                {
                    text: 'Löschen',
                    style: 'destructive',
                    onPress: () => {
                        removeDocument(document.id);
                        router.back();
                    },
                },
            ]
        );
    }, [document, removeDocument]);

    if (!document) {
        return (
            <View
                className="flex-1 items-center justify-center"
                style={{ backgroundColor: colors.background }}
            >
                <Text className="text-muted-foreground">Beleg nicht gefunden</Text>
            </View>
        );
    }

    const statusColor = getStatusColor(document.documentStatus);
    const isAiExtracted = document.extractionSource === ExtractionSource.AI;
    const isZugferdExtracted = document.extractionSource === ExtractionSource.ZUGFERD;
    const needsReview = document.documentStatus === DocumentStatus.ANALYZED;
    const isConfirmed = document.documentStatus === DocumentStatus.CONFIRMED;
    const isAnalyzing = document.documentStatus === DocumentStatus.ANALYZING;
    const failed = document.documentStatus === DocumentStatus.FAILED;

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Belegdetails',
                    headerShown: true,
                    headerStyle: {
                        backgroundColor: colors.background,
                    },
                    headerTintColor: colors.text,
                    headerShadowVisible: false,
                }}
            />
            <ScrollView
                className="flex-1"
                style={{ backgroundColor: colors.background }}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                <View className="px-5 pt-4">
                    {/* Status Banner */}
                    <View
                        className="rounded-xl p-4 mb-4"
                        style={{ backgroundColor: `${statusColor}15` }}
                    >
                        <View className="flex-row items-center">
                            <View
                                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                                style={{ backgroundColor: `${statusColor}30` }}
                            >
                                <Ionicons
                                    name={
                                        isConfirmed
                                            ? 'checkmark-circle'
                                            : isAnalyzing
                                              ? 'hourglass'
                                              : needsReview
                                                ? 'eye'
                                                : failed
                                                  ? 'alert-circle'
                                                  : 'cloud-upload'
                                    }
                                    size={20}
                                    color={statusColor}
                                />
                            </View>
                            <View className="flex-1">
                                <Text
                                    className="text-base font-semibold"
                                    style={{ color: statusColor }}
                                >
                                    {getStatusDisplayName(document.documentStatus)}
                                </Text>
                                <Text className="text-sm text-muted-foreground">
                                    {isConfirmed
                                        ? 'Daten wurden überprüft und bestätigt'
                                        : isAnalyzing
                                          ? 'KI analysiert den Beleg...'
                                          : needsReview
                                            ? 'Bitte Daten prüfen und bestätigen'
                                            : failed
                                              ? document.analysisError || 'Analyse fehlgeschlagen'
                                              : 'Warte auf Analyse'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Header Card */}
                    <View
                        className="rounded-xl p-5 mb-4"
                        style={{
                            backgroundColor: colorScheme === 'dark' ? '#1f1f1f' : '#ffffff',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.05,
                            shadowRadius: 8,
                            elevation: 2,
                        }}
                    >
                        <Text className="text-xl font-bold text-foreground mb-1">
                            {getDisplayName(document)}
                        </Text>
                        {document.sender?.name && document.name && (
                            <Text className="text-base text-muted-foreground">
                                {document.sender.name}
                            </Text>
                        )}

                        {document.total > 0 && (
                            <View className="mt-4 pt-4 border-t" style={{ borderTopColor: colorScheme === 'dark' ? '#333' : '#e5e5e5' }}>
                                <Text className="text-sm text-muted-foreground mb-1">
                                    Betrag
                                </Text>
                                <Text className="text-3xl font-bold" style={{ color: colors.tint }}>
                                    {formatCurrency(document.total, document.currencyCode)}
                                </Text>
                                {document.totalTax !== undefined && document.totalTax > 0 && (
                                    <Text className="text-sm text-muted-foreground mt-1">
                                        inkl. {formatCurrency(document.totalTax, document.currencyCode)} MwSt.
                                    </Text>
                                )}
                            </View>
                        )}

                        {/* Tags */}
                        {document.tags && document.tags.length > 0 && (
                            <View className="flex-row flex-wrap mt-4 gap-2">
                                {document.tags.map((tag, index) => (
                                    <View
                                        key={index}
                                        className="px-3 py-1 rounded-full flex-row items-center"
                                        style={{
                                            backgroundColor:
                                                colorScheme === 'dark'
                                                    ? 'rgba(181, 131, 218, 0.2)'
                                                    : 'rgba(181, 131, 218, 0.1)',
                                        }}
                                    >
                                        {tag.source === 'AI' && (
                                            <Ionicons
                                                name="sparkles"
                                                size={12}
                                                color={colors.tint}
                                                style={{ marginRight: 4 }}
                                            />
                                        )}
                                        <Text
                                            className="text-sm"
                                            style={{ color: colors.tint }}
                                        >
                                            {tag.name}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Details Section */}
                    <View
                        className="rounded-xl p-5 mb-4"
                        style={{
                            backgroundColor: colorScheme === 'dark' ? '#1f1f1f' : '#ffffff',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.05,
                            shadowRadius: 8,
                            elevation: 2,
                        }}
                    >
                        <SectionHeader title="Details" icon="information-circle" />

                        <InfoRow
                            label="Belegdatum"
                            value={document.transactionTime ? formatDate(document.transactionTime) : undefined}
                            isAiGenerated={isAiExtracted || isZugferdExtracted}
                        />
                        <InfoRow
                            label="Währung"
                            value={document.currencyCode}
                        />
                        <InfoRow
                            label="Privat bezahlt"
                            value={document.privatelyPaid ? 'Ja' : 'Nein'}
                        />
                        <InfoRow
                            label="Datenquelle"
                            value={
                                document.extractionSource === ExtractionSource.ZUGFERD
                                    ? 'ZUGFeRD (E-Rechnung)'
                                    : document.extractionSource === ExtractionSource.AI
                                      ? 'KI-Analyse'
                                      : document.extractionSource === ExtractionSource.MANUAL
                                        ? 'Manuell erfasst'
                                        : undefined
                            }
                        />
                    </View>

                    {/* Sender Section */}
                    {document.sender && (
                        <View
                            className="rounded-xl p-5 mb-4"
                            style={{
                                backgroundColor: colorScheme === 'dark' ? '#1f1f1f' : '#ffffff',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.05,
                                shadowRadius: 8,
                                elevation: 2,
                            }}
                        >
                            <SectionHeader title="Absender" icon="business" />

                            <InfoRow
                                label="Name"
                                value={document.sender.name}
                                isAiGenerated={isAiExtracted}
                            />
                            <InfoRow
                                label="Adresse"
                                value={
                                    [
                                        document.sender.street,
                                        [document.sender.zipCode, document.sender.city]
                                            .filter(Boolean)
                                            .join(' '),
                                        document.sender.country,
                                    ]
                                        .filter(Boolean)
                                        .join('\n') || undefined
                                }
                                isAiGenerated={isAiExtracted}
                            />
                            <InfoRow
                                label="USt-IdNr."
                                value={document.sender.vatId}
                                isAiGenerated={isAiExtracted}
                            />
                            <InfoRow
                                label="Steuernummer"
                                value={document.sender.taxId}
                                isAiGenerated={isAiExtracted}
                            />
                        </View>
                    )}

                    {/* File Info Section */}
                    <View
                        className="rounded-xl p-5 mb-4"
                        style={{
                            backgroundColor: colorScheme === 'dark' ? '#1f1f1f' : '#ffffff',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.05,
                            shadowRadius: 8,
                            elevation: 2,
                        }}
                    >
                        <SectionHeader title="Datei" icon="document-attach" />

                        <InfoRow label="Dateiname" value={document.fileName} />
                        <InfoRow label="Dateityp" value={document.fileContentType} />
                        <InfoRow label="Größe" value={formatFileSize(document.fileSize)} />
                        <InfoRow label="Hochgeladen am" value={formatDate(document.createdAt)} />
                        <InfoRow label="Hochgeladen von" value={document.uploadedBy} />
                        {document.reviewedBy && (
                            <InfoRow label="Geprüft von" value={document.reviewedBy} />
                        )}
                    </View>

                    {/* Action Buttons */}
                    <View className="gap-3 mt-4">
                        {needsReview && (
                            <Button
                                onPress={handleConfirm}
                                disabled={isConfirming}
                                size="lg"
                                className="w-full"
                            >
                                {isConfirming ? (
                                    <View className="flex-row items-center gap-2">
                                        <ActivityIndicator color="#ffffff" size="small" />
                                        <Text className="text-white font-semibold">
                                            Wird bestätigt...
                                        </Text>
                                    </View>
                                ) : (
                                    <View className="flex-row items-center gap-2">
                                        <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                                        <Text className="text-white font-semibold">
                                            Beleg bestätigen
                                        </Text>
                                    </View>
                                )}
                            </Button>
                        )}

                        <Button
                            variant="destructive"
                            onPress={handleDelete}
                            size="lg"
                            className="w-full"
                        >
                            <View className="flex-row items-center gap-2">
                                <Ionicons name="trash" size={20} color="#ffffff" />
                                <Text className="text-white font-semibold">Beleg löschen</Text>
                            </View>
                        </Button>
                    </View>
                </View>
            </ScrollView>
        </>
    );
}
