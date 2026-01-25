// Document types based on the backend Document entity

export enum AnalysisStatus {
    PENDING = 'PENDING',
    ANALYZING = 'ANALYZING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    SKIPPED = 'SKIPPED',
}

export enum DocumentStatus {
    UPLOADED = 'UPLOADED',
    ANALYZING = 'ANALYZING',
    ANALYZED = 'ANALYZED',
    CONFIRMED = 'CONFIRMED',
    FAILED = 'FAILED',
}

export enum ExtractionSource {
    ZUGFERD = 'ZUGFERD',
    AI = 'AI',
    MANUAL = 'MANUAL',
}

export interface TradeParty {
    id?: number;
    name: string;
    country?: string;
    state?: string;
    city?: string;
    zipCode?: string;
    street?: string;
    additionalAddress?: string;
    taxId?: string;
    vatId?: string;
}

export interface DocumentTag {
    id?: number;
    name: string;
    source: 'AI' | 'MANUAL';
}

export interface Document {
    id: number;
    name?: string;
    total: number;
    currencyCode: string;
    totalTax?: number;
    transactionTime?: string;
    fileName?: string;
    fileKey?: string;
    fileContentType?: string;
    fileSize?: number;
    sender?: TradeParty;
    recipient?: TradeParty;
    analysisStatus: AnalysisStatus;
    documentStatus: DocumentStatus;
    extractionSource?: ExtractionSource;
    analysisError?: string;
    privatelyPaid: boolean;
    uploadedBy?: string;
    analyzedBy?: string;
    reviewedBy?: string;
    createdAt: string;
    tags?: DocumentTag[];
}

// Helper functions
export function getStatusDisplayName(status: DocumentStatus): string {
    switch (status) {
        case DocumentStatus.UPLOADED:
            return 'Hochgeladen';
        case DocumentStatus.ANALYZING:
            return 'Wird analysiert';
        case DocumentStatus.ANALYZED:
            return 'Analysiert';
        case DocumentStatus.CONFIRMED:
            return 'Bestätigt';
        case DocumentStatus.FAILED:
            return 'Fehlgeschlagen';
        default:
            return status;
    }
}

export function getStatusColor(status: DocumentStatus): string {
    switch (status) {
        case DocumentStatus.UPLOADED:
            return '#6b7280'; // gray
        case DocumentStatus.ANALYZING:
            return '#f59e0b'; // amber
        case DocumentStatus.ANALYZED:
            return '#3b82f6'; // blue
        case DocumentStatus.CONFIRMED:
            return '#22c55e'; // green
        case DocumentStatus.FAILED:
            return '#ef4444'; // red
        default:
            return '#6b7280';
    }
}

export function formatCurrency(amount: number, currencyCode: string = 'EUR'): string {
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: currencyCode,
    }).format(amount);
}

export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

export function formatFileSize(bytes?: number): string {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getDisplayName(doc: Document): string {
    if (doc.name) return doc.name;
    if (doc.sender?.name) return doc.sender.name;
    return `Beleg #${doc.id}`;
}
