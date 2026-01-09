import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
    Document,
    AnalysisStatus,
    DocumentStatus,
} from '@/types/document';
import {
    getDocuments as getMockDocuments,
    getDocumentById as getMockDocumentById,
    addDocument as addMockDocument,
    updateDocument as updateMockDocument,
    deleteDocument as deleteMockDocument,
} from '@/data/mockDocuments';

interface DocumentContextType {
    documents: Document[];
    loading: boolean;
    refreshDocuments: () => void;
    getDocumentById: (id: number) => Document | undefined;
    addDocument: (doc: Omit<Document, 'id' | 'createdAt'>) => Document;
    updateDocument: (id: number, updates: Partial<Document>) => Document | undefined;
    deleteDocument: (id: number) => boolean;
    confirmDocument: (id: number) => Promise<Document | undefined>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: ReactNode }) {
    const [documents, setDocuments] = useState<Document[]>(getMockDocuments());
    const [loading, setLoading] = useState(false);

    const refreshDocuments = useCallback(() => {
        setLoading(true);
        // Simulate network delay
        setTimeout(() => {
            setDocuments(getMockDocuments());
            setLoading(false);
        }, 500);
    }, []);

    const getDocumentById = useCallback((id: number) => {
        return getMockDocumentById(id);
    }, []);

    const addDocument = useCallback((doc: Omit<Document, 'id' | 'createdAt'>) => {
        const newDoc = addMockDocument(doc);
        setDocuments(getMockDocuments());
        return newDoc;
    }, []);

    const updateDocument = useCallback((id: number, updates: Partial<Document>) => {
        const updated = updateMockDocument(id, updates);
        setDocuments(getMockDocuments());
        return updated;
    }, []);

    const deleteDocument = useCallback((id: number) => {
        const result = deleteMockDocument(id);
        setDocuments(getMockDocuments());
        return result;
    }, []);

    const confirmDocument = useCallback(async (id: number) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        const updated = updateMockDocument(id, {
            documentStatus: DocumentStatus.CONFIRMED,
            reviewedBy: 'current_user',
        });
        setDocuments(getMockDocuments());
        return updated;
    }, []);

    return (
        <DocumentContext.Provider
            value={{
                documents,
                loading,
                refreshDocuments,
                getDocumentById,
                addDocument,
                updateDocument,
                deleteDocument,
                confirmDocument,
            }}
        >
            {children}
        </DocumentContext.Provider>
    );
}

export function useDocuments() {
    const context = useContext(DocumentContext);
    if (context === undefined) {
        throw new Error('useDocuments must be used within a DocumentProvider');
    }
    return context;
}
