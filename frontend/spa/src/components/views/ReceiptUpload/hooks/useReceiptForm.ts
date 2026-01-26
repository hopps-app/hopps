import type { AnalysisStatus, DocumentResponse, ExtractionSource } from '@hopps/api-client';
import { useCallback, useMemo, useState } from 'react';

type Tag = string;

export interface ReceiptFormState {
    receiptNumber: string;
    receiptDate: Date | undefined;
    dueDate: Date | undefined;
    transactionKind: 'intake' | 'expense' | '';
    isUnpaid: boolean;
    contractPartner: string;
    bommelId: number | null;
    category: string;
    area: string;
    tags: Tag[];
    netAmount: string;
    taxAmount: string;
}

export interface LoadingStates {
    receiptNumber: boolean;
    receiptDate: boolean;
    dueDate: boolean;
    contractPartner: boolean;
    category: boolean;
    area: boolean;
    tags: boolean;
    netAmount: boolean;
    taxAmount: boolean;
}

const initialLoadingStates: LoadingStates = {
    receiptNumber: false,
    receiptDate: false,
    dueDate: false,
    contractPartner: false,
    category: false,
    area: false,
    tags: false,
    netAmount: false,
    taxAmount: false,
};

export function useReceiptForm() {
    const [file, setFile] = useState<File | null>(null);
    const [receiptNumber, setReceiptNumber] = useState('');
    const [receiptDate, setReceiptDate] = useState<Date | undefined>(undefined);
    const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
    const [transactionKind, setTransactionKind] = useState<'intake' | 'expense' | ''>('');
    const [isUnpaid, setIsUnpaid] = useState(false);
    const [contractPartner, setContractPartner] = useState('');
    const [bommelId, setBommelId] = useState<number | null>(null);
    const [category, setCategory] = useState('');
    const [area, setArea] = useState('');
    const [tags, setTags] = useState<Tag[]>([]);
    const [netAmount, setNetAmount] = useState('');
    const [taxAmount, setTaxAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAutoRead, setIsAutoRead] = useState(true);
    const [loadingStates, setLoadingStates] = useState<LoadingStates>(initialLoadingStates);

    // Document analysis tracking
    const [documentId, setDocumentId] = useState<number | null>(null);
    const [transactionId, setTransactionId] = useState<number | null>(null);
    const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [extractionSource, setExtractionSource] = useState<ExtractionSource | null>(null);

    const setFieldLoading = useCallback((field: keyof LoadingStates, loading: boolean) => {
        setLoadingStates((prev) => ({ ...prev, [field]: loading }));
    }, []);

    const setAllFieldsLoading = useCallback((loading: boolean) => {
        setLoadingStates({
            receiptNumber: loading,
            receiptDate: loading,
            dueDate: loading,
            contractPartner: loading,
            category: loading,
            area: loading,
            tags: loading,
            netAmount: loading,
            taxAmount: loading,
        });
    }, []);

    // Prepared for future SSE integration
    const handleFieldUpdate = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (field: string, value: any) => {
            switch (field) {
                case 'receiptNumber':
                    setReceiptNumber(value);
                    setFieldLoading('receiptNumber', false);
                    break;
                case 'receiptDate':
                    setReceiptDate(value ? new Date(value) : undefined);
                    setFieldLoading('receiptDate', false);
                    break;
                case 'dueDate':
                    setDueDate(value ? new Date(value) : undefined);
                    setFieldLoading('dueDate', false);
                    break;
                case 'contractPartner':
                    setContractPartner(value);
                    setFieldLoading('contractPartner', false);
                    break;
                case 'category':
                    setCategory(value);
                    setFieldLoading('category', false);
                    break;
                case 'area':
                    setArea(value);
                    setFieldLoading('area', false);
                    break;
                case 'tags':
                    setTags(value || []);
                    setFieldLoading('tags', false);
                    break;
                case 'netAmount':
                    setNetAmount(value);
                    setFieldLoading('netAmount', false);
                    break;
                case 'taxAmount':
                    setTaxAmount(value);
                    setFieldLoading('taxAmount', false);
                    break;
            }
        },
        [setFieldLoading]
    );

    const applyAnalysisResult = useCallback(
        (response: DocumentResponse) => {
            // Track extraction source
            if (response.extractionSource) {
                setExtractionSource(response.extractionSource);
            }

            // Apply extracted data to form fields
            if (response.name) {
                setReceiptNumber(response.name);
                setFieldLoading('receiptNumber', false);
            }

            if (response.transactionTime) {
                const date = new Date(response.transactionTime);
                setReceiptDate(date);
                setFieldLoading('receiptDate', false);
                setDueDate(date);
                setFieldLoading('dueDate', false);
            }

            if (response.senderName) {
                setContractPartner(response.senderName);
                setFieldLoading('contractPartner', false);
            }

            if (response.tags && response.tags.length > 0) {
                setTags(response.tags);
            }
            setFieldLoading('tags', false);

            // Calculate net amount from total and tax
            if (response.total !== undefined && response.total !== null) {
                const tax = response.totalTax ?? 0;
                const net = response.total - tax;
                setNetAmount(net.toFixed(2));
                setFieldLoading('netAmount', false);
            }

            if (response.totalTax !== undefined && response.totalTax !== null) {
                setTaxAmount(response.totalTax.toFixed(2));
                setFieldLoading('taxAmount', false);
            }

            // Clear remaining loading states for fields that weren't filled
            if (!response.transactionTime) {
                setFieldLoading('dueDate', false);
            }
            setFieldLoading('category', false);
            setFieldLoading('area', false);
        },
        [setFieldLoading]
    );

    const resetForm = useCallback(() => {
        setFile(null);
        setReceiptNumber('');
        setReceiptDate(undefined);
        setDueDate(undefined);
        setTransactionKind('');
        setIsUnpaid(false);
        setContractPartner('');
        setBommelId(null);
        setCategory('');
        setArea('');
        setTags([]);
        setNetAmount('');
        setTaxAmount('');
        // Reset analysis state
        setDocumentId(null);
        setTransactionId(null);
        setAnalysisStatus(null);
        setAnalysisError(null);
        setExtractionSource(null);
        setAllFieldsLoading(false);
    }, [setAllFieldsLoading]);

    // Check if form has minimum required fields for saving as draft
    const canSaveDraft = useMemo(() => {
        if (isSubmitting) return false;
        // Need either a document (from upload) or transactionId (already saved)
        // OR need enough data to create a manual transaction
        const hasDocument = documentId !== null || transactionId !== null;
        const hasBasicData = Boolean(receiptDate || contractPartner || netAmount);
        return hasDocument || hasBasicData;
    }, [isSubmitting, documentId, transactionId, receiptDate, contractPartner, netAmount]);

    // Full validation for final save (currently always false as save is disabled)
    const isValid = useMemo(() => {
        if (isSubmitting) return false;
        return Boolean(
            receiptDate &&
            transactionKind &&
            contractPartner &&
            bommelId &&
            netAmount &&
            taxAmount
        );
    }, [receiptDate, transactionKind, contractPartner, bommelId, netAmount, taxAmount, isSubmitting]);

    return {
        // File state
        file,
        setFile,

        // Form fields
        receiptNumber,
        setReceiptNumber,
        receiptDate,
        setReceiptDate,
        dueDate,
        setDueDate,
        transactionKind,
        setTransactionKind,
        isUnpaid,
        setIsUnpaid,
        contractPartner,
        setContractPartner,
        bommelId,
        setBommelId,
        category,
        setCategory,
        area,
        setArea,
        tags,
        setTags,
        netAmount,
        setNetAmount,
        taxAmount,
        setTaxAmount,

        // Status
        isSubmitting,
        setIsSubmitting,
        isAutoRead,
        setIsAutoRead,
        loadingStates,

        // Document analysis state
        documentId,
        setDocumentId,
        transactionId,
        setTransactionId,
        analysisStatus,
        setAnalysisStatus,
        analysisError,
        setAnalysisError,
        extractionSource,

        // Actions
        setFieldLoading,
        setAllFieldsLoading,
        handleFieldUpdate,
        applyAnalysisResult,
        resetForm,
        isValid,
        canSaveDraft,
    };
}

export default useReceiptForm;
