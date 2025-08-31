import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DocumentType } from '@hopps/api-client';

import InvoiceUploadFormDropzone from '@/components/InvoiceUploadForm/InvoiceUploadFormDropzone';
import InvoiceUploadFormBommelSelector from '@/components/InvoiceUploadForm/InvoiceUploadFormBommelSelector';
import Button from '@/components/ui/Button';
import Radio from '@/components/ui/Radio';
import Select, { SelectItem } from '@/components/ui/Select';
import TextField from '@/components/ui/TextField';
import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/ApiService';
import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { useStore } from '@/store/store';
import Switch from '@/components/ui/Switch.tsx';

type Tag = string;

function ReceiptUploadView() {
    const { t } = useTranslation();
    const { showError, showSuccess } = useToast();

    const { loadBommels } = useBommelsStore();
    const store = useStore();

    const [file, setFile] = useState<File | null>(null);

    const [receiptNumber, setReceiptNumber] = useState('');
    const [receiptDate, setReceiptDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [transactionKind, setTransactionKind] = useState<'intake' | 'expense' | ''>('');
    const [isUnpaid, setIsUnpaid] = useState(false);
    const [contractPartner, setContractPartner] = useState('');
    const [bommelId, setBommelId] = useState<number | null>(null);
    const [category, setCategory] = useState('');
    const [area, setArea] = useState('');
    const [tags, setTags] = useState<Tag[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [netAmount, setNetAmount] = useState('');
    const [taxAmount, setTaxAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!store.organization) return;
        loadBommels(store.organization.id).catch(() => {});
    }, [store.organization]);

    const onFilesChanged = useCallback((files: File[]) => {
        setFile(files[0] ?? null);
    }, []);

    const onAddTag = useCallback(() => {
        const value = tagInput.trim();
        if (!value) return;
        if (!tags.includes(value)) setTags((prev) => [...prev, value]);
        setTagInput('');
    }, [tagInput, tags]);

    const onRemoveTag = (idx: number) => {
        setTags((prev) => prev.filter((_, i) => i !== idx));
    };

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
            setReceiptDate('');
            setDueDate('');
            setTransactionKind('');
            setIsUnpaid(false);
            setContractPartner('');
            setBommelId(null);
            setCategory('');
            setArea('');
            setTags([]);
            setTagInput('');
            setNetAmount('');
            setTaxAmount('');
        } catch (e) {
            console.error(e);
            showError('Upload fehlgeschlagen');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-row gap-6">
            <div className="w-1/2 h-full bg-background-secondary">
                <InvoiceUploadFormDropzone onFilesChanged={onFilesChanged} />
            </div>

            <div
                className="min-w-0 min-h-0 border border-grey-700 p-4
                                rounded-[30px]"
            >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextField label="Belegnummer" value={receiptNumber} onValueChange={setReceiptNumber} />
                    {/*TODO Date Komponente*/}
                    <TextField label="Belegdatum" type="text" value={receiptDate} onValueChange={setReceiptDate} />
                    <Radio
                        items={radioItems}
                        value={transactionKind}
                        onValueChange={(v) => setTransactionKind(v as 'intake' | 'expense')}
                        layout="horizontal"
                    />
                    <Switch checked={isUnpaid} onCheckedChange={() => setIsUnpaid((v) => !v)} label="Unbezahlt" />

                    <TextField label="Vertragspartner" value={contractPartner} onValueChange={setContractPartner} />
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Bommel</label>
                        <InvoiceUploadFormBommelSelector onChange={(id) => setBommelId((id as number) ?? null)} />
                    </div>

                    <TextField label="Fälligkeitsdatum" type="text" value={dueDate} onValueChange={setDueDate} />
                    <Select label="Kategorie" value={category} onValueChanged={setCategory} items={categoryItems} />
                    <Select label="Bereich" value={area} onValueChanged={setArea} items={areaItems} className={'col-span-2'} />

                    <div className="col-span-2">
                        <label className="text-sm font-medium">Tags</label>
                        <div className="flex items-center gap-2 mt-1">
                            <TextField value={tagInput} onValueChange={setTagInput} placeholder="Tag hinzufügen" />
                            <Button type="button" onClick={onAddTag} className="h-10 px-3">
                                +
                            </Button>
                        </div>
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {tags.map((tag, idx) => (
                                    <span key={`${tag}-${idx}`} className="px-2 py-1 rounded-full bg-primary/10 text-xs">
                                        {tag}
                                        <button className="ml-2" type="button" onClick={() => onRemoveTag(idx)}>
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <TextField label="Steuerbetrag" value={taxAmount} onValueChange={setTaxAmount} />
                        <TextField label="Nettobetrag" value={netAmount} onValueChange={setNetAmount} />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="outline" onClick={() => window.history.back()} type="button">
                        Abbrechen
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
