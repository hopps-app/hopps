import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DocumentType } from '@hopps/api-client';

import InvoiceUploadFormDropzone from '@/components/InvoiceUploadForm/InvoiceUploadFormDropzone';
import InvoiceUploadFormBommelSelector from '@/components/InvoiceUploadForm/InvoiceUploadFormBommelSelector';
import Radio from '@/components/ui/Radio';
import Select, { SelectItem } from '@/components/ui/Select';
import TextField from '@/components/ui/TextField';
import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/ApiService';
import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { useStore } from '@/store/store';
import Switch from '@/components/ui/Switch.tsx';
import Tags from '@/components/ui/Tags.tsx';
import Button from '@/components/ui/Button.tsx';
import { DatePicker } from '@/components/ui/shadecn/DatePicker';

type Tag = string;

function ReceiptUploadView() {
    const { t } = useTranslation();
    const { showError, showSuccess } = useToast();

    const { loadBommels } = useBommelsStore();
    const store = useStore();

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

    const [loadingStates, setLoadingStates] = useState({
        receiptNumber: false,
        receiptDate: false,
        dueDate: false,
        contractPartner: false,
        category: false,
        area: false,
        tags: false,
        netAmount: false,
        taxAmount: false,
    });

    useEffect(() => {
        if (!store.organization) return;
        loadBommels(store.organization.id).catch(() => {});
    }, [store.organization]);

    const setFieldLoading = useCallback((field: keyof typeof loadingStates, loading: boolean) => {
        setLoadingStates((prev) => ({ ...prev, [field]: loading }));
    }, []);

    // TODO: Server-sent events integration will be added here
    // This function will handle incoming field updates from the backend
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleFieldUpdate = useCallback(
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

    const onFilesChanged = useCallback(
        async (files: File[]) => {
            const selected = files[0] ?? null;
            setFile(selected);
            if (!selected) return;
            if (isSubmitting) return;

            const mime = selected.type || '';
            const nameLower = selected.name.toLowerCase();
            const isAllowedType =
                mime === 'application/pdf' ||
                mime === 'image/jpeg' ||
                mime === 'image/png' ||
                nameLower.endsWith('.pdf') ||
                nameLower.endsWith('.jpg') ||
                nameLower.endsWith('.jpeg') ||
                nameLower.endsWith('.png');
            if (!isAllowedType) {
                showError('Ungültiger Dateityp');
                return;
            }

            try {
                setIsSubmitting(true);

                if (isAutoRead) {
                    setLoadingStates({
                        receiptNumber: true,
                        receiptDate: true,
                        dueDate: true,
                        contractPartner: true,
                        category: true,
                        area: true,
                        tags: true,
                        netAmount: true,
                        taxAmount: true,
                    });
                }

                await apiService.orgService.documentPOST(
                    {
                        data: selected,
                        fileName: selected.name,
                    },
                    54, // TODO: replace hardcoded bommelId with selected value
                    false,
                    DocumentType.INVOICE
                );
                showSuccess('Beleg erfolgreich hochgeladen');
                setFile(null);
            } catch (e) {
                console.error(e);
                showError('Upload fehlgeschlagen');
                // setLoadingStates({
                //     receiptNumber: false,
                //     receiptDate: false,
                //     dueDate: false,
                //     contractPartner: false,
                //     category: false,
                //     area: false,
                //     tags: false,
                //     netAmount: false,
                //     taxAmount: false,
                // });
            } finally {
                setIsSubmitting(false);
            }
        },
        [isSubmitting, showError, showSuccess, isAutoRead]
    );

    const areaItems: SelectItem[] = [
        { value: 'ideeller-bereich', label: 'Ideeller Bereich' },
        { value: 'zweckbetrieb', label: 'Zweckbetrieb' },
        { value: 'vermoegensverwaltung', label: 'Vermögensverwaltung' },
        { value: 'wirtschaftlicher-gb', label: 'Wirtschaftlicher Geschäftsbetrieb' },
    ];

    const categoryItems: SelectItem[] = [{ value: 'lizenzen-it-infrastruktur', label: 'Lizenzen IT-Infrastruktur' }];

    const radioItems = [
        { value: 'intake', label: 'Einnahme' },
        { value: 'expense', label: 'Ausgabe' },
    ];

    const isValid = useMemo(() => {
        if (isSubmitting) return false;
        return Boolean(file && receiptNumber && receiptDate && transactionKind && contractPartner && bommelId && netAmount && taxAmount);
    }, [file, receiptNumber, receiptDate, transactionKind, contractPartner, bommelId, netAmount, taxAmount, isSubmitting]);

    const onSubmit = async () => {
        if (!isValid) {
            showError(t('common.validationError') || 'Bitte Pflichtfelder ausfüllen');
            return;
        }
        if (!file || !bommelId) return;

        try {
            setIsSubmitting(true);
            await apiService.orgService.documentPOST(
                {
                    data: file,
                    fileName: file.name,
                },
                bommelId,
                false,
                DocumentType.RECEIPT
            );

            showSuccess('Beleg erfolgreich hochgeladen');
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
        } catch (e) {
            console.error(e);
            showError('Upload fehlgeschlagen');
        } finally {
            setIsSubmitting(false);
        }
    };

    const saveDraft = () => {};

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-semibold">Upload</h2>

            <div className="grid grid-cols-1 gap-x-6 gap-y-0 lg:grid-cols-2 items-stretch">
                <div className="flex flex-col">
                    <InvoiceUploadFormDropzone onFilesChanged={onFilesChanged} previewFile={file} />
                </div>

                <div
                    className="min-w-0 min-h-0 border border-grey-700 p-4
                                rounded-[30px]"
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <TextField label="Belegnummer" value={receiptNumber} onValueChange={setReceiptNumber} loading={loadingStates.receiptNumber} />
                        <DatePicker label="Belegdatum" date={receiptDate} onSelect={setReceiptDate} className="w-full" loading={loadingStates.receiptDate} />

                        <Radio
                            items={radioItems}
                            value={transactionKind}
                            onValueChange={(v) => setTransactionKind(v as 'intake' | 'expense')}
                            layout="horizontal"
                        />
                        <Switch checked={isUnpaid} onCheckedChange={() => setIsUnpaid((v) => !v)} label="Unbezahlt" />

                        <TextField label="Vertragspartner" value={contractPartner} onValueChange={setContractPartner} loading={loadingStates.contractPartner} />
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Bommel</label>
                            <InvoiceUploadFormBommelSelector onChange={(id) => setBommelId((id as number) ?? null)} />
                        </div>

                        <DatePicker label="Fälligkeitsdatum" date={dueDate} onSelect={setDueDate} className="w-full" loading={loadingStates.dueDate} />
                        <Select label="Kategorie" value={category} onValueChanged={setCategory} items={categoryItems} />
                        <Select label="Bereich" value={area} onValueChanged={setArea} items={areaItems} className={'col-span-2'} />

                        <div className="col-span-2">
                            <Tags label="Tags" value={tags} onChange={setTags} placeholder="Tag hinzufügen" loading={loadingStates.tags} />
                        </div>

                        <TextField label="Steuerbetrag" value={taxAmount} onValueChange={setTaxAmount} loading={loadingStates.taxAmount} />
                        <TextField label="Nettobetrag" value={netAmount} onValueChange={setNetAmount} loading={loadingStates.netAmount} />
                    </div>
                </div>
                <Switch checked={isAutoRead} onCheckedChange={() => setIsAutoRead((v) => !v)} label="Automatisches Auslesen" />
                <div className="flex justify-end gap-3 mt-6 grid-cols-2">
                    <Button variant="outline" onClick={() => window.history.back()} type="button">
                        Abbrechen
                    </Button>
                    <Button variant="secondary" onClick={saveDraft} type="button">
                        Als Entwurf speichern
                    </Button>
                    <Button onClick={onSubmit} disabled={!isValid} type="button">
                        Speichern
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default ReceiptUploadView;
