import {
    CategoryGroupCreateRequest,
    CategoryGroupResponse,
    CategoryGroupTemplateDetail,
    CategoryGroupUpdateRequest,
    CategoryGroupValueResponse,
    CategoryGroupValueUpdateRequest,
    CategoryValueEntry,
    ReopenImpactRequest,
    ApiException,
} from '@hopps/api-client';
import { Check, CornerDownRight, Plus, X } from 'lucide-react';
import { FC, ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import BommelMultiSelector from './BommelMultiSelector';
import CategoryValueList, { CategoryRow, ParentOption } from './CategoryValueList';
import { inTreeOrder, PendingCategory, withoutCategory } from './categoryValues';
import ReopenAffectedTransactionsDialog from './ReopenAffectedTransactionsDialog';

import Button from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import Select from '@/components/ui/Select';
import { BaseInput } from '@/components/ui/shadecn/BaseInput';
import { BaseSwitch } from '@/components/ui/shadecn/BaseSwitch';
import {
    useAddCategoryGroupValues,
    useCategoryGroupTemplates,
    useCategoryGroupValues,
    useCreateCategoryGroup,
    useDeleteCategoryGroupValue,
    useUpdateCategoryGroup,
    useUpdateCategoryGroupValue,
} from '@/hooks/queries/useCategoryGroups';
import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/ApiService';

type CategoryGroupModalProps = {
    open: boolean;
    /** The group to edit; omit to create a new one. */
    group?: CategoryGroupResponse;
    /** Pre-fills a new group from this template (first-use setup). The bommel choice is then mandatory. */
    template?: CategoryGroupTemplateDetail;
    onClose: () => void;
    onSaved: () => void;
};

/** "No template" entry of the template select; template ids are always positive. */
const NO_TEMPLATE = '0';

/** Above this many values (edit mode) a search field helps find a value among the chips. */
const VALUE_SEARCH_THRESHOLD = 8;

const CategoryGroupModal: FC<CategoryGroupModalProps> = ({ open, group, template, onClose, onSaved }) => {
    const { t } = useTranslation();
    const { showSuccess, showError } = useToast();
    const isCreate = group == null;

    const [name, setName] = useState('');
    const [required, setRequired] = useState(false);
    const [bommelIds, setBommelIds] = useState<number[]>([]);
    const [pendingValues, setPendingValues] = useState<PendingCategory[]>([]);
    /** The parent the next added category goes under; set from a row's plus button. */
    const [addUnder, setAddUnder] = useState<ParentOption | undefined>(undefined);
    const [templateId, setTemplateId] = useState<number | undefined>(undefined);
    const [valueInput, setValueInput] = useState('');
    const [valueQuery, setValueQuery] = useState('');
    const [wizardCount, setWizardCount] = useState(0);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const createMutation = useCreateCategoryGroup();
    const updateMutation = useUpdateCategoryGroup();
    const addValuesMutation = useAddCategoryGroupValues();
    const deleteValueMutation = useDeleteCategoryGroupValue();
    const updateValueMutation = useUpdateCategoryGroupValue();

    // A template passed in from the setup screen fixes the source; otherwise a new group can still start from one.
    const fromSetupTemplate = template != null;
    const { data: templates = [] } = useCategoryGroupTemplates();
    const showTemplateSelect = isCreate && !fromSetupTemplate && templates.length > 0;

    // Existing values (edit mode) are loaded/searched from the server so the editor scales to large value sets.
    const { data: serverValues } = useCategoryGroupValues(group?.id, valueQuery, !isCreate && open);

    const applyTemplate = (tpl: CategoryGroupTemplateDetail | undefined) => {
        setTemplateId(tpl?.id);
        setName(tpl?.name ?? '');
        setRequired(tpl?.required ?? false);
        setPendingValues(
            (tpl?.values ?? []).map((v) => ({ value: v.value ?? '', parent: v.parent ?? undefined, bookable: v.bookable ?? true, hidden: v.hidden ?? false }))
        );
    };

    useEffect(() => {
        if (open) {
            if (template) {
                applyTemplate(template);
            } else {
                setTemplateId(undefined);
                setName(group?.name ?? '');
                setRequired(group?.required ?? false);
                setPendingValues([]);
            }
            setBommelIds(group?.bommelIds ?? []);
            setValueInput('');
            setValueQuery('');
            setAddUnder(undefined);
            setWizardOpen(false);
        }
    }, [open, group, template]);

    const handleTemplateSelect = async (value: string) => {
        if (value === NO_TEMPLATE) {
            applyTemplate(undefined);
            return;
        }
        try {
            applyTemplate(await apiService.orgService.getCategoryGroupTemplate(Number(value)));
        } catch {
            showError(t('categoryGroups.toast.error'));
        }
    };

    // From a template the bommel choice is the one decision left to make, so it is required (as in the design).
    const canSave = name.trim().length > 0 && (templateId == null || bommelIds.length > 0);

    const addValue = () => {
        const value = valueInput.trim();
        if (!value) {
            return;
        }
        if (isCreate) {
            if (!pendingValues.some((v) => v.value === value)) {
                setPendingValues((prev) => [...prev, { value, parent: addUnder?.value, bookable: true, hidden: false }]);
            }
        } else {
            addValuesMutation.mutate(
                { id: group.id as number, values: [value], parentId: addUnder?.id },
                { onError: () => showError(t('categoryGroups.toast.error')) }
            );
        }
        setValueInput('');
    };

    const patchPending = (value: string, patch: Partial<PendingCategory>) =>
        setPendingValues((prev) => prev.map((v) => (v.value === value ? { ...v, ...patch } : v)));

    /** Saves a changed category. A mandatory group refuses to lose its last category that can be chosen. */
    const updateServerValue = (item: CategoryGroupValueResponse, patch: { parentId?: number; bookable?: boolean; hidden?: boolean }) => {
        const body = new CategoryGroupValueUpdateRequest({
            parentId: 'parentId' in patch ? patch.parentId : item.parentId,
            bookable: patch.bookable ?? item.bookable,
            hidden: patch.hidden ?? item.hidden,
        });
        updateValueMutation.mutate(
            { id: group?.id as number, valueId: item.id as number, body },
            {
                onError: (e) =>
                    showError(ApiException.isApiException(e) && e.status === 409 ? t('categoryGroups.toast.lastSelectable') : t('categoryGroups.toast.error')),
            }
        );
    };

    const doSave = async (reopenAffectedTransactions: boolean) => {
        setSaving(true);
        try {
            if (isCreate) {
                await createMutation.mutateAsync(
                    new CategoryGroupCreateRequest({
                        name: name.trim(),
                        required,
                        bommelIds,
                        values: pendingValues.map((v) => new CategoryValueEntry(v)),
                        reopenAffectedTransactions,
                        templateId,
                    })
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

    const title = fromSetupTemplate
        ? t('categoryGroups.modal.templateTitle')
        : isCreate
          ? t('categoryGroups.modal.createTitle')
          : t('categoryGroups.modal.editTitle');
    const subtitle = fromSetupTemplate ? t('categoryGroups.modal.templateSubtitle') : t('categoryGroups.modal.subtitle');

    const serverItems = serverValues?.items ?? [];
    const orderedPending = inTreeOrder(pendingValues);
    const valueRows: CategoryRow[] = isCreate
        ? orderedPending.map((v) => ({ ...v, parentHidden: false, childCount: pendingValues.filter((c) => c.parent === v.value).length }))
        : serverItems.map((item) => ({
              value: item.value ?? '',
              parent: item.parentValue ?? undefined,
              bookable: item.bookable ?? true,
              hidden: item.hidden ?? false,
              parentHidden: item.parentHidden ?? false,
              childCount: item.childCount ?? 0,
          }));
    const serverItem = (row: CategoryRow) => serverItems.find((item) => item.value === row.value) as CategoryGroupValueResponse;

    return (
        <>
            <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
                <DialogContent className="max-h-[86vh] max-w-[620px] gap-0 overflow-y-auto rounded-[20px] border-none px-7 py-[26px] shadow-[var(--shadow-lg)]">
                    <DialogHeader className="pr-10">
                        <DialogTitle className="text-[21px] font-extrabold leading-tight">{title}</DialogTitle>
                        <DialogDescription className="text-sm text-[var(--muted)]">{subtitle}</DialogDescription>
                    </DialogHeader>

                    <div className="mt-5 flex flex-col gap-5">
                        {showTemplateSelect && (
                            <Select
                                label={t('categoryGroups.modal.fromTemplate')}
                                value={templateId != null ? String(templateId) : NO_TEMPLATE}
                                onValueChanged={handleTemplateSelect}
                                items={[
                                    { label: t('categoryGroups.modal.noTemplate'), value: NO_TEMPLATE },
                                    ...templates.map((tpl) => ({ label: tpl.name ?? '', value: String(tpl.id) })),
                                ]}
                            />
                        )}

                        <Field label={t('categoryGroups.modal.name')}>
                            <BaseInput
                                autoFocus={isCreate && !fromSetupTemplate}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('categoryGroups.modal.namePlaceholder')}
                            />
                        </Field>

                        <div className="flex items-center gap-3">
                            <BaseSwitch id="category-group-required" checked={required} onCheckedChange={setRequired} />
                            <label htmlFor="category-group-required" className="flex items-center gap-1.5 text-[14.5px] font-bold text-[var(--font-color)]">
                                {t('categoryGroups.modal.required')}
                            </label>
                            <InfoTooltip content={t('categoryGroups.modal.requiredHint')} label={t('categoryGroups.modal.requiredHint')} className="-ml-1.5" />
                        </div>

                        <Field label={t('categoryGroups.modal.bommel')} info={t('categoryGroups.modal.bommelHint')}>
                            <BommelMultiSelector value={bommelIds} onChange={setBommelIds} />
                        </Field>

                        <Field label={t('categoryGroups.modal.values')}>
                            {addUnder && (
                                <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-purple-700">
                                    <CornerDownRight size={14} aria-hidden="true" />
                                    {t('categoryGroups.values.addingUnder', { name: addUnder.value })}
                                    <button
                                        type="button"
                                        className="grid text-[var(--ink-faint)] hover:text-[var(--negative)]"
                                        aria-label={t('common.cancel')}
                                        onClick={() => setAddUnder(undefined)}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                            <div className="flex gap-2.5">
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
                                    className="flex-1"
                                />
                                <Button variant="tonal" size="sm" className="h-10" onClick={addValue}>
                                    <Plus />
                                    {t('categoryGroups.modal.addValue')}
                                </Button>
                            </div>

                            {!isCreate && (group?.valueCount ?? 0) > VALUE_SEARCH_THRESHOLD && (
                                <BaseInput
                                    value={valueQuery}
                                    onChange={(e) => setValueQuery(e.target.value)}
                                    placeholder={t('common.search')}
                                    className="mt-2.5 h-9"
                                />
                            )}

                            <div className="mt-2.5">
                                {valueRows.length > 0 ? (
                                    <CategoryValueList
                                        rows={valueRows}
                                        groupId={group?.id}
                                        parentOptions={pendingValues.filter((v) => v.parent == null).map((v) => ({ value: v.value }))}
                                        onMove={(row, parent) =>
                                            isCreate
                                                ? patchPending(row.value, { parent: parent?.value })
                                                : updateServerValue(serverItem(row), { parentId: parent?.id })
                                        }
                                        onToggleBookable={(row) =>
                                            isCreate
                                                ? patchPending(row.value, { bookable: !row.bookable })
                                                : updateServerValue(serverItem(row), { bookable: !row.bookable })
                                        }
                                        onToggleHidden={(row) =>
                                            isCreate
                                                ? patchPending(row.value, { hidden: !row.hidden })
                                                : updateServerValue(serverItem(row), { hidden: !row.hidden })
                                        }
                                        onAddChild={(row) => setAddUnder({ id: isCreate ? undefined : serverItem(row).id, value: row.value })}
                                        onRemove={(row) =>
                                            isCreate
                                                ? setPendingValues((prev) => withoutCategory(prev, row.value))
                                                : deleteValueMutation.mutate({ id: group.id as number, valueId: serverItem(row).id as number })
                                        }
                                    />
                                ) : (
                                    <div className="text-[13px] text-[var(--ink-faint)]">{t('categoryGroups.modal.noValues')}</div>
                                )}
                            </div>
                        </Field>
                    </div>

                    <div className="mt-6 flex justify-end gap-2.5">
                        <Button variant="outline" size="sm" className="h-10" onClick={onClose}>
                            {t('common.cancel')}
                        </Button>
                        <Button size="sm" className="h-10" disabled={!canSave || saving} onClick={handleSave}>
                            <Check />
                            {t('common.save')}
                        </Button>
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

/** Field label (with an optional info tooltip) above its control. */
const Field: FC<{ label: string; info?: string; children: ReactNode }> = ({ label, info, children }) => (
    <div>
        <div className="mb-2 flex items-center gap-1.5 text-[14.5px] font-bold text-[var(--font-color)]">
            {label}
            {info && <InfoTooltip content={info} label={info} />}
        </div>
        {children}
    </div>
);

export default CategoryGroupModal;
