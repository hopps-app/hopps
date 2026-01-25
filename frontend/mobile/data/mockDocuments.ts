import {
    Document,
    AnalysisStatus,
    DocumentStatus,
    ExtractionSource,
} from '@/types/document';

export const mockDocuments: Document[] = [
    {
        id: 1,
        name: 'Büromaterial Staples',
        total: 89.99,
        currencyCode: 'EUR',
        totalTax: 14.37,
        transactionTime: '2024-01-15T10:30:00Z',
        fileName: 'rechnung_staples_2024.pdf',
        fileContentType: 'application/pdf',
        fileSize: 245760,
        sender: {
            id: 1,
            name: 'Staples Deutschland GmbH',
            street: 'Siemensstraße 5',
            zipCode: '61352',
            city: 'Bad Homburg',
            country: 'Deutschland',
            vatId: 'DE123456789',
        },
        analysisStatus: AnalysisStatus.COMPLETED,
        documentStatus: DocumentStatus.CONFIRMED,
        extractionSource: ExtractionSource.AI,
        privatelyPaid: false,
        uploadedBy: 'maria',
        analyzedBy: 'system',
        reviewedBy: 'maria',
        createdAt: '2024-01-15T10:25:00Z',
        tags: [
            { name: 'Bürobedarf', source: 'AI' },
            { name: 'Rechnung', source: 'AI' },
        ],
    },
    {
        id: 2,
        name: 'REWE Einkauf Vereinsfest',
        total: 156.42,
        currencyCode: 'EUR',
        totalTax: 12.85,
        transactionTime: '2024-01-18T14:22:00Z',
        fileName: 'kassenbon_rewe.jpg',
        fileContentType: 'image/jpeg',
        fileSize: 1048576,
        sender: {
            id: 2,
            name: 'REWE Markt GmbH',
            street: 'Domstraße 20',
            zipCode: '50668',
            city: 'Köln',
            country: 'Deutschland',
        },
        analysisStatus: AnalysisStatus.COMPLETED,
        documentStatus: DocumentStatus.ANALYZED,
        extractionSource: ExtractionSource.AI,
        privatelyPaid: true,
        uploadedBy: 'thomas',
        analyzedBy: 'system',
        createdAt: '2024-01-18T14:20:00Z',
        tags: [
            { name: 'Lebensmittel', source: 'AI' },
            { name: 'Veranstaltung', source: 'MANUAL' },
        ],
    },
    {
        id: 3,
        name: 'Amazon Web Services',
        total: 42.50,
        currencyCode: 'EUR',
        totalTax: 6.79,
        transactionTime: '2024-01-20T00:00:00Z',
        fileName: 'aws_invoice_jan2024.pdf',
        fileContentType: 'application/pdf',
        fileSize: 89432,
        sender: {
            id: 3,
            name: 'Amazon Web Services EMEA SARL',
            street: '38 Avenue John F. Kennedy',
            zipCode: 'L-1855',
            city: 'Luxembourg',
            country: 'Luxemburg',
            vatId: 'LU26888617',
        },
        analysisStatus: AnalysisStatus.COMPLETED,
        documentStatus: DocumentStatus.CONFIRMED,
        extractionSource: ExtractionSource.ZUGFERD,
        privatelyPaid: false,
        uploadedBy: 'maria',
        analyzedBy: 'system',
        reviewedBy: 'maria',
        createdAt: '2024-01-20T08:15:00Z',
        tags: [
            { name: 'IT-Kosten', source: 'MANUAL' },
            { name: 'Cloud', source: 'MANUAL' },
        ],
    },
    {
        id: 4,
        name: 'Telekom Mobilfunk',
        total: 29.99,
        currencyCode: 'EUR',
        totalTax: 4.79,
        transactionTime: '2024-01-22T00:00:00Z',
        fileName: 'telekom_rechnung_012024.pdf',
        fileContentType: 'application/pdf',
        fileSize: 156789,
        sender: {
            id: 4,
            name: 'Telekom Deutschland GmbH',
            street: 'Landgrabenweg 151',
            zipCode: '53227',
            city: 'Bonn',
            country: 'Deutschland',
            vatId: 'DE122265872',
        },
        analysisStatus: AnalysisStatus.COMPLETED,
        documentStatus: DocumentStatus.CONFIRMED,
        extractionSource: ExtractionSource.ZUGFERD,
        privatelyPaid: false,
        uploadedBy: 'maria',
        analyzedBy: 'system',
        reviewedBy: 'maria',
        createdAt: '2024-01-22T10:00:00Z',
        tags: [
            { name: 'Telekommunikation', source: 'AI' },
        ],
    },
    {
        id: 5,
        name: undefined,
        total: 0,
        currencyCode: 'EUR',
        transactionTime: undefined,
        fileName: 'scan_20240125.pdf',
        fileContentType: 'application/pdf',
        fileSize: 2097152,
        analysisStatus: AnalysisStatus.ANALYZING,
        documentStatus: DocumentStatus.ANALYZING,
        privatelyPaid: false,
        uploadedBy: 'thomas',
        createdAt: '2024-01-25T09:45:00Z',
    },
    {
        id: 6,
        name: 'Getränke Lieferung',
        total: 234.80,
        currencyCode: 'EUR',
        totalTax: 16.43,
        transactionTime: '2024-01-24T11:00:00Z',
        fileName: 'getraenke_meyer.pdf',
        fileContentType: 'application/pdf',
        fileSize: 178432,
        sender: {
            id: 5,
            name: 'Getränke Meyer GmbH',
            street: 'Industriestraße 45',
            zipCode: '40764',
            city: 'Langenfeld',
            country: 'Deutschland',
        },
        analysisStatus: AnalysisStatus.COMPLETED,
        documentStatus: DocumentStatus.ANALYZED,
        extractionSource: ExtractionSource.AI,
        privatelyPaid: false,
        uploadedBy: 'thomas',
        analyzedBy: 'system',
        createdAt: '2024-01-24T11:15:00Z',
        tags: [
            { name: 'Getränke', source: 'AI' },
            { name: 'Veranstaltung', source: 'AI' },
        ],
    },
    {
        id: 7,
        name: 'Druckauftrag Flyer',
        total: 189.00,
        currencyCode: 'EUR',
        totalTax: 30.18,
        transactionTime: '2024-01-10T15:30:00Z',
        fileName: 'flyeralarm_rechnung.pdf',
        fileContentType: 'application/pdf',
        fileSize: 312456,
        sender: {
            id: 6,
            name: 'Flyeralarm GmbH',
            street: 'Alfred-Nobel-Straße 18',
            zipCode: '97080',
            city: 'Würzburg',
            country: 'Deutschland',
            vatId: 'DE814372514',
        },
        analysisStatus: AnalysisStatus.COMPLETED,
        documentStatus: DocumentStatus.CONFIRMED,
        extractionSource: ExtractionSource.ZUGFERD,
        privatelyPaid: true,
        uploadedBy: 'maria',
        analyzedBy: 'system',
        reviewedBy: 'maria',
        createdAt: '2024-01-10T15:35:00Z',
        tags: [
            { name: 'Marketing', source: 'MANUAL' },
            { name: 'Druck', source: 'AI' },
        ],
    },
    {
        id: 8,
        name: undefined,
        total: 0,
        currencyCode: 'EUR',
        fileName: 'unreadable_scan.jpg',
        fileContentType: 'image/jpeg',
        fileSize: 3145728,
        analysisStatus: AnalysisStatus.FAILED,
        documentStatus: DocumentStatus.FAILED,
        analysisError: 'Dokument konnte nicht gelesen werden',
        privatelyPaid: false,
        uploadedBy: 'thomas',
        createdAt: '2024-01-23T16:20:00Z',
    },
];

// Simulated document store for the app
let documents = [...mockDocuments];

export function getDocuments(): Document[] {
    return documents.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function getDocumentById(id: number): Document | undefined {
    return documents.find(doc => doc.id === id);
}

export function addDocument(doc: Omit<Document, 'id' | 'createdAt'>): Document {
    const newDoc: Document = {
        ...doc,
        id: Math.max(...documents.map(d => d.id)) + 1,
        createdAt: new Date().toISOString(),
    };
    documents = [newDoc, ...documents];
    return newDoc;
}

export function updateDocument(id: number, updates: Partial<Document>): Document | undefined {
    const index = documents.findIndex(doc => doc.id === id);
    if (index === -1) return undefined;
    documents[index] = { ...documents[index], ...updates };
    return documents[index];
}

export function deleteDocument(id: number): boolean {
    const initialLength = documents.length;
    documents = documents.filter(doc => doc.id !== id);
    return documents.length < initialLength;
}

// Reset to initial mock data (useful for testing)
export function resetDocuments(): void {
    documents = [...mockDocuments];
}
