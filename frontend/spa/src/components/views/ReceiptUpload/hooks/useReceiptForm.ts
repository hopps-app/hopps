import type { AnalysisStatus, DocumentResponse, ExtractionSource, TransactionResponse, TransactionStatus } from '@hopps/api-client';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
    grossAmount: string;
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
    grossAmount: boolean;
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
    grossAmount: false,
    taxAmount: false,
};

export interface FormErrors {
    receiptNumber?: string;
    receiptDate?: string;
    transactionKind?: string;
    contractPartner?: string;
    bommelId?: string;
    area?: string;
    grossAmount?: string;
    taxAmount?: string;
}

export function useReceiptForm() {
    const { t } = useTranslation();
    const [file, setFile] = useState<File | null>(null);
    const [receiptNumber, setReceiptNumber] = useState('');
    const [receiptDate, setReceiptDate] = useState<Date | undefined>(undefined);
    const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
    const [transactionKind, setTransactionKind] = useState<'intake' | 'expense' | ''>('expense');
    const [isUnpaid, setIsUnpaid] = useState(false);
    const [contractPartner, setContractPartner] = useState('');
    const [bommelId, setBommelId] = useState<number | null>(null);
    const [category, setCategory] = useState('');
    const [area, setArea] = useState('');
    const [tags, setTags] = useState<Tag[]>([]);
    const [grossAmount, setGrossAmount] = useState('');
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

    // Transaction status tracking
    const [transactionStatus, setTransactionStatus] = useState<TransactionStatus | null>(null);

    // Form validation errors
    const [formErrors, setFormErrors] = useState<FormErrors>({});

    const clearFieldError = useCallback((field: keyof FormErrors) => {
        setFormErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    }, []);

    const clearAllErrors = useCallback(() => {
        setFormErrors({});
    }, []);

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
            grossAmount: loading,
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
                case 'grossAmount':
                    setGrossAmount(value);
                    setFieldLoading('grossAmount', false);
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

            // Set gross amount (total including tax)
            if (response.total !== undefined && response.total !== null) {
                setGrossAmount(response.total.toFixed(2));
                setFieldLoading('grossAmount', false);
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

    // Apply analysis results only to fields that are currently empty
    // Used when opening a draft that has a completed analysis
    const applyAnalysisResultToEmptyFields = useCallback((response: DocumentResponse, currentValues: Partial<ReceiptFormState>) => {
        let hasAppliedValues = false;

        // Track extraction source
        if (response.extractionSource) {
            setExtractionSource(response.extractionSource);
        }

        // Apply extracted data only to empty form fields
        if (response.name && !currentValues.receiptNumber) {
            setReceiptNumber(response.name);
            hasAppliedValues = true;
        }

        if (response.transactionTime) {
            const date = new Date(response.transactionTime);
            if (!currentValues.receiptDate) {
                setReceiptDate(date);
                hasAppliedValues = true;
            }
            if (!currentValues.dueDate) {
                setDueDate(date);
                hasAppliedValues = true;
            }
        }

        if (response.senderName && !currentValues.contractPartner) {
            setContractPartner(response.senderName);
            hasAppliedValues = true;
        }

        if (response.tags && response.tags.length > 0 && (!currentValues.tags || currentValues.tags.length === 0)) {
            setTags(response.tags);
            hasAppliedValues = true;
        }

        // Set gross amount (total including tax)
        if (response.total !== undefined && response.total !== null && !currentValues.grossAmount) {
            setGrossAmount(response.total.toFixed(2));
            hasAppliedValues = true;
        }

        if (response.totalTax !== undefined && response.totalTax !== null && !currentValues.taxAmount) {
            setTaxAmount(response.totalTax.toFixed(2));
            hasAppliedValues = true;
        }

        return hasAppliedValues;
    }, []);

    // Load existing transaction data into the form
    // Returns the loaded values for comparison with analysis results
    const loadTransaction = useCallback((transaction: TransactionResponse): Partial<ReceiptFormState> => {
        const loadedValues: Partial<ReceiptFormState> = {};

        // Set transaction ID and status
        if (transaction.id) {
            setTransactionId(transaction.id);
        }
        if (transaction.status) {
            setTransactionStatus(transaction.status as TransactionStatus);
        }

        // Set receipt number / name
        if (transaction.name) {
            setReceiptNumber(transaction.name);
            loadedValues.receiptNumber = transaction.name;
        }

        // Set transaction date
        if (transaction.transactionTime) {
            const date = new Date(transaction.transactionTime);
            setReceiptDate(date);
            loadedValues.receiptDate = date;
        }

        // Set due date
        if (transaction.dueDate) {
            const date = new Date(transaction.dueDate);
            setDueDate(date);
            loadedValues.dueDate = date;
        }

        // Transaction kind is no longer derived from document type
        // Set based on total amount sign (negative = expense, positive = income)
        if (transaction.total !== undefined && transaction.total !== null) {
            const kind = transaction.total < 0 ? 'expense' : 'intake';
            setTransactionKind(kind);
            loadedValues.transactionKind = kind;
        }

        // Set unpaid status
        setIsUnpaid(transaction.privatelyPaid ?? false);
        loadedValues.isUnpaid = transaction.privatelyPaid ?? false;

        // Set contract partner
        if (transaction.senderName) {
            setContractPartner(transaction.senderName);
            loadedValues.contractPartner = transaction.senderName;
        }

        // Set bommel ID
        if (transaction.bommelId) {
            setBommelId(transaction.bommelId);
            loadedValues.bommelId = transaction.bommelId;
        }

        // Set category
        if (transaction.categoryId) {
            setCategory(String(transaction.categoryId));
            loadedValues.category = String(transaction.categoryId);
        }

        // Set area
        if (transaction.area) {
            setArea(transaction.area);
            loadedValues.area = transaction.area;
        }

        // Set tags
        if (transaction.tags && transaction.tags.length > 0) {
            setTags(transaction.tags);
            loadedValues.tags = transaction.tags;
        }

        // Set gross amount (total including tax)
        if (transaction.total !== undefined && transaction.total !== null) {
            const grossStr = Math.abs(transaction.total).toFixed(2);
            setGrossAmount(grossStr);
            loadedValues.grossAmount = grossStr;
        }

        // Set tax amount
        if (transaction.totalTax !== undefined && transaction.totalTax !== null) {
            const taxStr = transaction.totalTax.toFixed(2);
            setTaxAmount(taxStr);
            loadedValues.taxAmount = taxStr;
        }

        // Set document ID if available
        if (transaction.documentId) {
            setDocumentId(transaction.documentId);
        }

        return loadedValues;
    }, []);

    // Validate all required fields for final save
    const validate = useCallback((): boolean => {
        const errors: FormErrors = {};

        if (!receiptNumber.trim()) {
            errors.receiptNumber = t('receipts.upload.validation.receiptNumberRequired');
        }
        if (!receiptDate) {
            errors.receiptDate = t('receipts.upload.validation.receiptDateRequired');
        }
        if (!transactionKind) {
            errors.transactionKind = t('receipts.upload.validation.transactionKindRequired');
        }
        if (!contractPartner.trim()) {
            errors.contractPartner = t('receipts.upload.validation.contractPartnerRequired');
        }
        if (!bommelId) {
            errors.bommelId = t('receipts.upload.validation.bommelRequired');
        }
        if (!area) {
            errors.area = t('receipts.upload.validation.areaRequired');
        }
        if (!grossAmount.trim()) {
            errors.grossAmount = t('receipts.upload.validation.grossAmountRequired');
        } else if (isNaN(parseFloat(grossAmount))) {
            errors.grossAmount = t('receipts.upload.validation.grossAmountInvalid');
        }
        if (taxAmount.trim() && isNaN(parseFloat(taxAmount))) {
            errors.taxAmount = t('receipts.upload.validation.taxAmountInvalid');
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [receiptNumber, receiptDate, transactionKind, contractPartner, bommelId, area, grossAmount, taxAmount, t]);

    // Validate minimum fields for saving as draft (less strict)
    const validateDraft = useCallback((): boolean => {
        const errors: FormErrors = {};

        // For drafts, only validate amounts if they're provided but invalid
        if (grossAmount.trim() && isNaN(parseFloat(grossAmount))) {
            errors.grossAmount = t('receipts.upload.validation.grossAmountInvalid');
        }
        if (taxAmount.trim() && isNaN(parseFloat(taxAmount))) {
            errors.taxAmount = t('receipts.upload.validation.taxAmountInvalid');
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [grossAmount, taxAmount, t]);

    const resetForm = useCallback(() => {
        setFile(null);
        setReceiptNumber('');
        setReceiptDate(undefined);
        setDueDate(undefined);
        setTransactionKind('expense');
        setIsUnpaid(false);
        setContractPartner('');
        setBommelId(null);
        setCategory('');
        setArea('');
        setTags([]);
        setGrossAmount('');
        setTaxAmount('');
        // Reset analysis state
        setDocumentId(null);
        setTransactionId(null);
        setAnalysisStatus(null);
        setAnalysisError(null);
        setExtractionSource(null);
        setTransactionStatus(null);
        setAllFieldsLoading(false);
        clearAllErrors();
    }, [setAllFieldsLoading, clearAllErrors]);

    // Track whether the form has unsaved changes
    const isDirty = useMemo(() => {
        return Boolean(
            receiptNumber ||
                receiptDate ||
                dueDate ||
                transactionKind ||
                contractPartner ||
                bommelId ||
                category ||
                area ||
                tags.length > 0 ||
                grossAmount ||
                taxAmount ||
                file
        );
    }, [receiptNumber, receiptDate, dueDate, transactionKind, contractPartner, bommelId, category, area, tags, grossAmount, taxAmount, file]);

    // Check if form has minimum required fields for saving as draft
    const canSaveDraft = useMemo(() => {
        if (isSubmitting) return false;
        // Need either a document (from upload) or transactionId (already saved)
        // OR need enough data to create a manual transaction
        const hasDocument = documentId !== null || transactionId !== null;
        const hasBasicData = Boolean(receiptDate || contractPartner || grossAmount);
        return hasDocument || hasBasicData;
    }, [isSubmitting, documentId, transactionId, receiptDate, contractPartner, grossAmount]);

    // Full validation for final save
    const isValid = useMemo(() => {
        if (isSubmitting) return false;
        return Boolean(receiptNumber && receiptDate && transactionKind && contractPartner && bommelId && area && grossAmount);
    }, [receiptNumber, receiptDate, transactionKind, contractPartner, bommelId, area, grossAmount, isSubmitting]);

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
        grossAmount,
        setGrossAmount,
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

        // Transaction status
        transactionStatus,

        // Validation
        formErrors,
        validate,
        validateDraft,
        clearFieldError,
        clearAllErrors,

        // Actions
        setFieldLoading,
        setAllFieldsLoading,
        handleFieldUpdate,
        applyAnalysisResult,
        applyAnalysisResultToEmptyFields,
        loadTransaction,
        resetForm,
        isValid,
        canSaveDraft,
        isDirty,
    };
}

export default useReceiptForm;
