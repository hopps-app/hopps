import { CategoryGroupExport, CategoryGroupImportRequest, CategoryGroupResponse, ReopenImpactRequest } from '@hopps/api-client';
import { FileUp } from 'lucide-react';
import { ChangeEvent, FC, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import BommelMultiSelector from './BommelMultiSelector';
import { parseCategoryGroupFile } from './categoryValues';
import ReopenAffectedTransactionsDialog from './ReopenAffectedTransactionsDialog';

import Button from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useImportCategoryGroup } from '@/hooks/queries/useCategoryGroups';
import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/ApiService';

type CategoryGroupImportDialogProps = {
    open: boolean;
    groups: CategoryGroupResponse[];
    onClose: () => void;
    onImported: () => void;
};

/**
 * Imports an export file. A new group needs its bommels, which are specific to each organization. A file the
 * organization already imported extends the existing group instead, so nothing has to be chosen then.
 */
const CategoryGroupImportDialog: FC<CategoryGroupImportDialogProps> = ({ open, groups, onClose, onImported }) => {
    const { t } = useTranslation();
    const { showSuccess, showError } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);
    const importMutation = useImportCategoryGroup();

    const [file, setFile] = useState<CategoryGroupExport | null>(null);
    const [invalid, setInvalid] = useState(false);
    const [bommelIds, setBommelIds] = useState<number[]>([]);
    const [wizardCount, setWizardCount] = useState(0);
    const [wizardOpen, setWizardOpen] = useState(false);

    useEffect(() => {
        if (open) {
            setFile(null);
            setInvalid(false);
            setBommelIds([]);
            setWizardOpen(false);
        }
    }, [open]);

    const existing = file?.sourceKey ? groups.find((g) => g.sourceKey === file.sourceKey) : undefined;
    const canImport = file != null && (existing != null || bommelIds.length > 0) && !importMutation.isPending;

    const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        e.target.value = '';
        if (!selected) {
            return;
        }
        const parsed = parseCategoryGroupFile(await selected.text());
        setFile(parsed);
        setInvalid(parsed == null);
    };

    const doImport = async (reopenAffectedTransactions: boolean) => {
        if (!file) {
            return;
        }
        try {
            const result = await importMutation.mutateAsync(new CategoryGroupImportRequest({ file, bommelIds, reopenAffectedTransactions }));
            showSuccess(result.created ? t('categoryGroups.import.created') : t('categoryGroups.import.extended', { count: result.addedValues ?? 0 }));
            setWizardOpen(false);
            onImported();
            onClose();
        } catch {
            showError(t('categoryGroups.toast.error'));
        }
    };

    const handleImport = async () => {
        if (!canImport) {
            return;
        }
        // Same check as in the group dialog: a new mandatory group can affect bookings that are already confirmed.
        if (!existing && file.required) {
            try {
                const impact = await apiService.orgService.reopenImpact(new ReopenImpactRequest({ required: true, bommelIds }));
                if ((impact.affectedCount ?? 0) > 0) {
                    setWizardCount(impact.affectedCount as number);
                    setWizardOpen(true);
                    return;
                }
            } catch {
                // if the preview fails, fall through to a normal import
            }
        }
        await doImport(false);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
                <DialogContent className="max-h-[86vh] max-w-[520px] gap-0 overflow-y-auto rounded-[20px] border-none px-7 py-[26px] shadow-[var(--shadow-lg)]">
                    <DialogHeader className="pr-10">
                        <DialogTitle className="text-[21px] font-extrabold leading-tight">{t('categoryGroups.import.title')}</DialogTitle>
                        <DialogDescription className="text-sm text-[var(--muted)]">{t('categoryGroups.import.subtitle')}</DialogDescription>
                    </DialogHeader>

                    <div className="mt-5 flex flex-col gap-4">
                        <input
                            ref={inputRef}
                            type="file"
                            accept=".json,application/json"
                            className="hidden"
                            aria-label={t('categoryGroups.import.chooseFile')}
                            onChange={handleFile}
                        />
                        <Button variant="outline" size="sm" className="h-10 self-start" onClick={() => inputRef.current?.click()}>
                            <FileUp />
                            {t('categoryGroups.import.chooseFile')}
                        </Button>

                        {invalid && <p className="text-[13px] font-semibold text-[var(--negative)]">{t('categoryGroups.import.invalidFile')}</p>}

                        {file && (
                            <div className="rounded-xl border border-[var(--border-soft)] px-4 py-3">
                                <div className="text-[14.5px] font-extrabold text-[var(--font-color)]">{file.name}</div>
                                <div className="mt-0.5 text-[13px] text-[var(--muted)]">
                                    {t('categoryGroups.card.valueCount', { count: file.values?.length ?? 0 })}
                                </div>
                            </div>
                        )}

                        {file && existing && (
                            <p className="text-[13.5px] text-[var(--muted)]">{t('categoryGroups.import.extendsExisting', { group: existing.name ?? '' })}</p>
                        )}

                        {file && !existing && (
                            <div>
                                <div className="mb-2 text-[14.5px] font-bold text-[var(--font-color)]">{t('categoryGroups.modal.bommel')}</div>
                                <BommelMultiSelector value={bommelIds} onChange={setBommelIds} />
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end gap-2.5">
                        <Button variant="outline" size="sm" className="h-10" onClick={onClose}>
                            {t('common.cancel')}
                        </Button>
                        <Button size="sm" className="h-10" disabled={!canImport} onClick={handleImport}>
                            {t('categoryGroups.import.submit')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <ReopenAffectedTransactionsDialog
                open={wizardOpen}
                count={wizardCount}
                groupName={file?.name ?? ''}
                onReopen={() => doImport(true)}
                onKeep={() => doImport(false)}
                onCancel={() => setWizardOpen(false)}
            />
        </>
    );
};

export default CategoryGroupImportDialog;
