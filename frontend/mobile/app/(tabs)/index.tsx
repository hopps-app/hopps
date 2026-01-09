import {
    View,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    useColorScheme,
} from 'react-native';
import { useCallback } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Text } from '@/components/Text';
import { useDocuments } from '@/contexts/DocumentContext';
import {
    Document,
    DocumentStatus,
    getStatusDisplayName,
    getStatusColor,
    formatCurrency,
    formatDate,
    getDisplayName,
} from '@/types/document';

function DocumentCard({ document }: { document: Document }) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const statusColor = getStatusColor(document.documentStatus);

    const isAnalyzing = document.documentStatus === DocumentStatus.ANALYZING;
    const needsReview = document.documentStatus === DocumentStatus.ANALYZED;
    const failed = document.documentStatus === DocumentStatus.FAILED;

    const getFileIcon = () => {
        if (document.fileContentType?.startsWith('image/')) {
            return 'image';
        }
        return 'document-text';
    };

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push(`/document/${document.id}`)}
            className="rounded-xl mb-3 overflow-hidden"
            style={{
                backgroundColor: colorScheme === 'dark' ? '#1f1f1f' : '#ffffff',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
            }}
        >
            <View className="flex-row p-4">
                {/* Icon */}
                <View
                    className="w-12 h-12 rounded-lg items-center justify-center mr-3"
                    style={{
                        backgroundColor:
                            colorScheme === 'dark'
                                ? 'rgba(181, 131, 218, 0.2)'
                                : 'rgba(181, 131, 218, 0.1)',
                    }}
                >
                    <Ionicons name={getFileIcon()} size={24} color={colors.tint} />
                </View>

                {/* Content */}
                <View className="flex-1">
                    <Text
                        className="text-base font-semibold text-foreground"
                        numberOfLines={1}
                    >
                        {getDisplayName(document)}
                    </Text>

                    {document.sender?.name && document.name && (
                        <Text
                            className="text-sm text-muted-foreground mt-0.5"
                            numberOfLines={1}
                        >
                            {document.sender.name}
                        </Text>
                    )}

                    <View className="flex-row items-center mt-2">
                        {/* Status Badge */}
                        <View
                            className="px-2 py-0.5 rounded-full mr-2"
                            style={{ backgroundColor: `${statusColor}20` }}
                        >
                            <Text
                                className="text-xs font-medium"
                                style={{ color: statusColor }}
                            >
                                {getStatusDisplayName(document.documentStatus)}
                            </Text>
                        </View>

                        {/* Date */}
                        {document.transactionTime && (
                            <Text className="text-xs text-muted-foreground">
                                {formatDate(document.transactionTime)}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Amount & Arrow */}
                <View className="items-end justify-center ml-2">
                    {document.total > 0 && (
                        <Text className="text-base font-bold text-foreground">
                            {formatCurrency(document.total, document.currencyCode)}
                        </Text>
                    )}
                    <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={colors.icon}
                        style={{ marginTop: 4 }}
                    />
                </View>
            </View>

            {/* Action Banner for special states */}
            {(needsReview || isAnalyzing || failed) && (
                <View
                    className="px-4 py-2 flex-row items-center"
                    style={{
                        backgroundColor: `${statusColor}15`,
                        borderTopWidth: 1,
                        borderTopColor: `${statusColor}30`,
                    }}
                >
                    <Ionicons
                        name={
                            isAnalyzing
                                ? 'hourglass'
                                : needsReview
                                  ? 'eye'
                                  : 'alert-circle'
                        }
                        size={14}
                        color={statusColor}
                    />
                    <Text className="text-xs ml-2" style={{ color: statusColor }}>
                        {isAnalyzing
                            ? 'Wird analysiert...'
                            : needsReview
                              ? 'Prüfung erforderlich'
                              : document.analysisError || 'Analyse fehlgeschlagen'}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

function StatCard({
    title,
    value,
    icon,
    color,
}: {
    title: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
}) {
    const colorScheme = useColorScheme();

    return (
        <View
            className="flex-1 rounded-xl p-4"
            style={{
                backgroundColor: colorScheme === 'dark' ? '#1f1f1f' : '#ffffff',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
            }}
        >
            <View
                className="w-8 h-8 rounded-lg items-center justify-center mb-2"
                style={{ backgroundColor: `${color}20` }}
            >
                <Ionicons name={icon} size={16} color={color} />
            </View>
            <Text className="text-2xl font-bold text-foreground">{value}</Text>
            <Text className="text-xs text-muted-foreground mt-1">{title}</Text>
        </View>
    );
}

export default function HomeScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { documents, loading, refreshDocuments } = useDocuments();

    const onRefresh = useCallback(() => {
        refreshDocuments();
    }, [refreshDocuments]);

    // Calculate stats
    const totalDocuments = documents.length;
    const pendingReview = documents.filter(
        d => d.documentStatus === DocumentStatus.ANALYZED
    ).length;
    const totalAmount = documents
        .filter(d => d.documentStatus === DocumentStatus.CONFIRMED)
        .reduce((sum, d) => sum + d.total, 0);

    return (
        <ScrollView
            className="flex-1"
            style={{ backgroundColor: colors.background }}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={
                <RefreshControl
                    refreshing={loading}
                    onRefresh={onRefresh}
                    tintColor={colors.tint}
                />
            }
        >
            <View className="px-5 pt-16">
                {/* Header */}
                <View className="mb-6">
                    <Text className="text-3xl font-bold text-foreground">Belege</Text>
                    <Text className="text-base text-muted-foreground mt-1">
                        Deine Rechnungen und Quittungen
                    </Text>
                </View>

                {/* Stats */}
                <View className="flex-row gap-3 mb-6">
                    <StatCard
                        title="Gesamt"
                        value={totalDocuments}
                        icon="documents"
                        color={colors.tint}
                    />
                    <StatCard
                        title="Zu prüfen"
                        value={pendingReview}
                        icon="eye"
                        color="#f59e0b"
                    />
                    <StatCard
                        title="Bestätigt"
                        value={formatCurrency(totalAmount)}
                        icon="checkmark-circle"
                        color="#22c55e"
                    />
                </View>

                {/* Pending Review Section */}
                {pendingReview > 0 && (
                    <View
                        className="rounded-xl p-4 mb-6"
                        style={{
                            backgroundColor:
                                colorScheme === 'dark'
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : 'rgba(245, 158, 11, 0.1)',
                        }}
                    >
                        <View className="flex-row items-center">
                            <Ionicons name="notifications" size={20} color="#f59e0b" />
                            <View className="flex-1 ml-3">
                                <Text className="text-sm font-semibold text-foreground">
                                    {pendingReview} {pendingReview === 1 ? 'Beleg wartet' : 'Belege warten'} auf Prüfung
                                </Text>
                                <Text className="text-xs text-muted-foreground mt-0.5">
                                    Die KI hat Daten extrahiert - bitte überprüfen
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Document List */}
                <View className="mb-4">
                    <Text className="text-lg font-semibold text-foreground mb-3">
                        Alle Belege
                    </Text>

                    {documents.length === 0 ? (
                        <View
                            className="items-center py-12 rounded-xl"
                            style={{
                                backgroundColor:
                                    colorScheme === 'dark' ? '#1f1f1f' : '#ffffff',
                            }}
                        >
                            <Ionicons
                                name="documents-outline"
                                size={48}
                                color={colors.icon}
                            />
                            <Text className="text-base text-muted-foreground mt-4">
                                Noch keine Belege vorhanden
                            </Text>
                            <TouchableOpacity
                                onPress={() => router.push('/new')}
                                className="mt-4 px-4 py-2 rounded-lg"
                                style={{ backgroundColor: colors.tint }}
                            >
                                <Text className="text-white font-medium">
                                    Ersten Beleg hochladen
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        documents.map(doc => (
                            <DocumentCard key={doc.id} document={doc} />
                        ))
                    )}
                </View>
            </View>
        </ScrollView>
    );
}
