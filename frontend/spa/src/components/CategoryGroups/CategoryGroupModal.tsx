import { CategoryGroupCreateRequest, CategoryGroupResponse, CategoryGroupUpdateRequest, ReopenImpactRequest } from '@hopps/api-client';
import { Plus, X } from 'lucide-react';
import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import BommelMultiSelector from './BommelMultiSelector';
import ReopenAffectedTransactionsDialog from './ReopenAffectedTransactionsDialog';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { BaseInput } from '@/components/ui/shadecn/BaseInput';
import Switch from '@/components/ui/Switch';
import {
    useAddCategoryGroupValues,
    useCategoryGroupValues,
    useCreateCategoryGroup,
    useDeleteCategoryGroupValue,
    useUpdateCategoryGroup,
} from '@/hooks/queries/useCategoryGroups';
import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/ApiService';

type CategoryGroupModalProps = {
    open: boolean;
    group?: CategoryGroupResponse;
    onClose: () => void;
    onSaved: () => void;
};

const CategoryGroupModal: FC<CategoryGroupModalProps> = ({ open, group, onClose, onSaved }) => {
    const { t } = useTranslation();
    const { showSuccess, showError } = useToast();
    const isCreate = group == null;

    const [name, setName] = useState('');
    const [required, setRequired] = useState(false);
    const [bommelIds, setBommelIds] = useState<number[]>([]);
    const [pendingValues, setPendingValues] = useState<string[]>([]);
    const [valueInput, setValueInput] = useState('');
    const [valueQuery, setValueQuery] = useState('');
    const [wizardCount, setWizardCount] = useState(0);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const createMutation = useCreateCategoryGroup();
    const updateMutation = useUpdateCategoryGroup();
    const addValuesMutation = useAddCategoryGroupValues();
    const deleteValueMutation = useDeleteCategoryGroupValue();

    // Existing values (edit mode) are loaded/searched from the server so the editor scales to large value sets.
    const { data: serverValues } = useCategoryGroupValues(group?.id, valueQuery, !isCreate && open);

    useEffect(() => {
        if (open) {
            setName(group?.name ?? '');
            setRequired(group?.required ?? false);
            setBommelIds(group?.bommelIds ?? []);
            setPendingValues([]);
            setValueInput('');
            setValueQuery('');
            setWizardOpen(false);
        }
    }, [open, group]);

    const canSave = name.trim().length > 0 && (!isCreate || pendingValues.length > 0);

    const addValue = () => {
        const value = valueInput.trim();
        if (!value) {
            return;
        }
        if (isCreate) {
            if (!pendingValues.includes(value)) {
                setPendingValues((prev) => [...prev, value]);
            }
        } else {
            addValuesMutation.mutate({ id: group.id as number, values: [value] }, { onError: () => showError(t('categoryGroups.toast.error')) });
        }
        setValueInput('');
    };

    const removePendingValue = (value: string) => setPendingValues((prev) => prev.filter((v) => v !== value));

    const doSave = async (reopenAffectedTransactions: boolean) => {
        setSaving(true);
        try {
            if (isCreate) {
                await createMutation.mutateAsync(
                    new CategoryGroupCreateRequest({ name: name.trim(), required, bommelIds, values: pendingValues, reopenAffectedTransactions })
                );
                showSuccess(t('categoryGroups.toast.created'));
            } else {
                await updateMutation.mutateAsync({
                    id: group.id as number,
                    body: new CategoryGroupUpdateRequest({ name: name.trim(), required, bommelIds, reopenAffectedTransactions }),
                });
                showSuccess(t('categoryGroups.toast.updated'));
            }
            setWizardOpen(false);
            onSaved();
            onClose();
        } catch {
            showError(t('categoryGroups.toast.error'));
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        if (!canSave || saving) {
            return;
        }
        // When the group would be mandatory for bommels that already carry confirmed transactions, offer the re-draft wizard first.
        if (required && bommelIds.length > 0) {
            try {
                const impact = await apiService.orgService.reopenImpact(new ReopenImpactRequest({ id: group?.id, required, bommelIds }));
                if ((impact.affectedCount ?? 0) > 0) {
                    setWizardCount(impact.affectedCount as number);
                    setWizardOpen(true);
                    return;
                }
            } catch {
                // if the preview fails, fall through to a normal save
            }
        }
        await doSave(false);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
                <DialogContent className="max-w-[540px]">
                    <DialogHeader>
                        <DialogTitle>{isCreate ? t('categoryGroups.modal.createTitle') : t('categoryGroups.modal.editTitle')}</DialogTitle>
                        <DialogDescription>{t('categoryGroups.modal.subtitle')}</DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-4">
                        {/* Name */}
                        <div className="grid gap-1.5">
                            <label className="text-sm font-medium text-[var(--font-color)]">{t('categoryGroups.modal.name')}</label>
                            <BaseInput
                                autoFocus={isCreate}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('categoryGroups.modal.namePlaceholder')}
                                className="h-10 rounded-xl"
                            />
                        </div>

                        {/* Required */}
                        <div className="flex flex-col gap-1">
                            <Switch checked={required} onCheckedChange={setRequired} label={t('categoryGroups.modal.required')} />
                            <p className="text-xs text-[#6B6B76] ml-11">{t('categoryGroups.modal.requiredHint')}</p>
                        </div>

                        {/* Bommel assignment */}
                        <div className="grid gap-1.5">
                            <label className="text-sm font-medium text-[var(--font-color)]">{t('categoryGroups.modal.bommel')}</label>
                            <BommelMultiSelector value={bommelIds} onChange={setBommelIds} />
                            <p className="text-xs text-[#6B6B76]">{t('categoryGroups.modal.bommelHint')}</p>
                        </div>

                        {/* Values */}
                        <div className="grid gap-1.5">
                            <label className="text-sm font-medium text-[var(--font-color)]">{t('categoryGroups.modal.values')}</label>
                            <div className="flex gap-2">
                                <BaseInput
                                    value={valueInput}
                                    onChange={(e) => setValueInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addValue();
                                        }
                                    }}
                                    placeholder={t('categoryGroups.modal.valuePlaceholder')}
                                    className="h-10 rounded-xl flex-1"
                                />
                                <button
                                    type="button"
                                    onClick={addValue}
                                    className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl bg-[#F3EAFB] text-[#7E3FB4] text-sm font-medium hover:bg-[#ecdcfa] transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                    {t('categoryGroups.modal.addValue')}
                                </button>
                            </div>

                            {/* edit mode: searchable server-backed list; create mode: local chips */}
                            {!isCreate && (
                                <BaseInput
                                    value={valueQuery}
                                    onChange={(e) => setValueQuery(e.target.value)}
                                    placeholder={t('common.search')}
                                    className="h-9 rounded-xl mt-1"
                                />
                            )}

                            <div className="flex flex-col gap-1 max-h-52 overflow-y-auto mt-1">
                                {isCreate
                                    ? pendingValues.map((value) => <ValueRow key={value} label={value} onRemove={() => removePendingValue(value)} />)
                                    : (serverValues?.items ?? []).map((item) => (
                                          <ValueRow
                                              key={item.id}
                                              label={item.value ?? ''}
                                              onRemove={() => deleteValueMutation.mutate({ id: group.id as number, valueId: item.id as number })}
                                          />
                                      ))}
                                {isCreate && pendingValues.length === 0 && <p className="text-xs text-[#9A9AA3] py-1">{t('categoryGroups.modal.noValues')}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-10 px-4 rounded-xl border border-[#d1d5db] text-sm font-medium text-[var(--font-color)] hover:bg-[#F1F1F4] transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="button"
                            disabled={!canSave || saving}
                            onClick={handleSave}
                            className="h-10 px-4 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('common.save')}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            <ReopenAffectedTransactionsDialog
                open={wizardOpen}
                count={wizardCount}
                groupName={name.trim()}
                onReopen={() => doSave(true)}
                onKeep={() => doSave(false)}
                onCancel={() => setWizardOpen(false)}
            />
        </>
    );
};

const ValueRow: FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[#F8F8FA] text-sm text-[var(--font-color)]">
        <span className="truncate">{label}</span>
        <button type="button" onClick={onRemove} className="text-[#9A9AA3] hover:text-[#B12C4C] transition-colors shrink-0" aria-label="remove">
            <X className="h-3.5 w-3.5" />
        </button>
    </div>
);

export default CategoryGroupModal;
