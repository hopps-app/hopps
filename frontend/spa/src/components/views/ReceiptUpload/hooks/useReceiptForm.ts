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
    }, []);

    const isValid = useMemo(() => {
        if (isSubmitting) return false;
        return Boolean(file && receiptNumber && receiptDate && transactionKind && contractPartner && bommelId && netAmount && taxAmount);
    }, [file, receiptNumber, receiptDate, transactionKind, contractPartner, bommelId, netAmount, taxAmount, isSubmitting]);

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

        // Actions
        setFieldLoading,
        setAllFieldsLoading,
        handleFieldUpdate,
        resetForm,
        isValid,
    };
}

export default useReceiptForm;
