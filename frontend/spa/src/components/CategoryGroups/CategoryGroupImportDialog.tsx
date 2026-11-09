import { CategoryGroupExport, CategoryGroupImportRequest, CategoryGroupResponse, ReopenImpactRequest } from '@hopps/api-client';
import { FileJson, FileUp } from 'lucide-react';
import { FC, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';

import BommelMultiSelector from './BommelMultiSelector';
import { parseCategoryGroupFile } from './categoryValues';
import ReopenAffectedTransactionsDialog from './ReopenAffectedTransactionsDialog';

import Button from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { useImportCategoryGroup } from '@/hooks/queries/useCategoryGroups';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import apiService from '@/services/ApiService';

/** Same light purple tile as the icons of the receipt upload */
const ICON_TILE = 'bg-[var(--accent-surface)] dark:bg-[var(--accent-surface-strong)]';

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

    const readFile = async (selected: File | undefined) => {
        if (!selected) {
            return;
        }
        const parsed = parseCategoryGroupFile(await selected.text());
        setFile(parsed);
        setInvalid(parsed == null);
    };

    // Dropped or chosen, like the receipt upload. Anything that is not a single .json file is rejected right away.
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: { 'application/json': ['.json'] },
        multiple: false,
        onDropAccepted: (files) => readFile(files[0]),
        onDropRejected: () => {
            setFile(null);
            setInvalid(true);
        },
    });

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
                        {file ? (
                            // The chosen file; dropping or choosing another one here replaces it
                            <div
                                {...getRootProps()}
                                className={cn(
                                    'flex cursor-pointer items-center gap-3 rounded-[14px] border-2 border-dashed py-2.5 pl-3.5 pr-3 transition-all',
                                    isDragActive
                                        ? 'border-primary bg-[var(--accent-surface)]'
                                        : 'border-border-soft hover:border-[var(--purple-300)] hover:bg-[var(--surface-sunken)]'
                                )}
                            >
                                <input {...getInputProps()} aria-label={t('categoryGroups.import.chooseFile')} />
                                <span className={cn('flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[10px]', ICON_TILE)}>
                                    <FileJson size={17} className="text-purple-700" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    {isDragActive ? (
                                        <span className="block truncate text-[14px] font-bold text-foreground">
                                            {t('categoryGroups.import.dropzoneActive')}
                                        </span>
                                    ) : (
                                        <>
                                            <span className="block truncate text-[14.5px] font-extrabold text-[var(--font-color)]">{file.name}</span>
                                            <span className="block text-[13px] text-[var(--muted)]">
                                                {t('categoryGroups.card.valueCount', { count: file.values?.length ?? 0 })}
                                            </span>
                                        </>
                                    )}
                                </span>
                                <BaseButton type="button" variant="tonal" size="sm" className="font-bold">
                                    {t('categoryGroups.import.replaceFile')}
                                </BaseButton>
                            </div>
                        ) : (
                            <div
                                {...getRootProps()}
                                className={cn(
                                    'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[14px] border-2 border-dashed px-6 py-8 transition-all',
                                    isDragActive
                                        ? 'border-primary bg-[var(--accent-surface)]'
                                        : 'border-border-soft hover:border-[var(--purple-300)] hover:bg-[var(--surface-sunken)]'
                                )}
                            >
                                <input {...getInputProps()} aria-label={t('categoryGroups.import.chooseFile')} />
                                <div
                                    className={cn(
                                        'flex h-14 w-14 items-center justify-center rounded-full',
                                        isDragActive ? 'bg-[var(--accent-surface-strong)]' : ICON_TILE
                                    )}
                                >
                                    <FileUp size={26} className="text-purple-700" />
                                </div>
                                <div className="text-center">
                                    <p className="text-[15px] font-bold text-foreground">
                                        {isDragActive ? t('categoryGroups.import.dropzoneActive') : t('categoryGroups.import.dropzone')}
                                    </p>
                                    <p className="mt-1 text-[13px] text-[var(--ink-faint)]">{t('categoryGroups.import.dropzoneHint')}</p>
                                </div>
                            </div>
                        )}

                        {invalid && <p className="text-[13px] font-semibold text-[var(--negative)]">{t('categoryGroups.import.invalidFile')}</p>}

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
