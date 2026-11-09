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
import { Check, CornerDownRight, Plus, Search, X } from 'lucide-react';
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
    useCategoryGroupValuesInfinite,
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

/** Above this many categories a search field helps to find one. */
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

    // Existing values (edit mode) are loaded and searched on the server, page by page as the list scrolls, so the editor
    // stays complete and quick for groups with many categories.
    const { data: serverValues, fetchNextPage, hasNextPage, isFetchingNextPage } = useCategoryGroupValuesInfinite(group?.id, valueQuery, !isCreate && open);

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

    const serverItems = serverValues?.pages.flatMap((page) => page.items ?? []) ?? [];
    const serverTotal = serverValues?.pages[0]?.total ?? 0;
    // A new group is searched here: a match keeps its parent, so it still shows where it belongs
    const pendingQuery = valueQuery.trim().toLowerCase();
    const pendingMatches = (v: PendingCategory) => v.value.toLowerCase().includes(pendingQuery);
    const orderedPending = inTreeOrder(pendingValues).filter(
        (v) => !pendingQuery || pendingMatches(v) || pendingValues.some((c) => c.parent === v.value && pendingMatches(c))
    );
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
    // All categories of the group, whatever the search shows
    const categoryCount = isCreate ? pendingValues.length : valueQuery.trim() ? (group?.valueCount ?? serverTotal) : serverTotal;
    const showSearch = categoryCount > VALUE_SEARCH_THRESHOLD || valueQuery.length > 0;
    const serverItem = (row: CategoryRow) => serverItems.find((item) => item.value === row.value) as CategoryGroupValueResponse;

    return (
        <>
            <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
                {/* Header and footer across the full width; between them the settings on the left and the categories on the
                    right, over the whole height. Only the category list scrolls, so long lists get the room and the buttons
                    stay in view. Below md everything is one column that scrolls as a whole. */}
                <DialogContent className="flex max-h-[90vh] max-w-[1040px] flex-col gap-0 overflow-hidden rounded-[20px] border-none p-0 shadow-[var(--shadow-lg)] md:h-[min(860px,90vh)]">
                    <DialogHeader className="shrink-0 px-7 pr-16 pt-[26px]">
                        <DialogTitle className="text-[21px] font-extrabold leading-tight">{title}</DialogTitle>
                        <DialogDescription className="text-sm text-[var(--muted)]">{subtitle}</DialogDescription>
                    </DialogHeader>

                    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[320px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)] md:overflow-hidden">
                        <div className="flex flex-col gap-4 px-7 pb-5 pt-5 md:overflow-y-auto md:border-r md:border-[var(--border-soft)]">
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

                            <div className="flex flex-col gap-3">
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
                                    <label
                                        htmlFor="category-group-required"
                                        className="flex items-center gap-1.5 text-[14.5px] font-bold text-[var(--font-color)]"
                                    >
                                        {t('categoryGroups.modal.required')}
                                    </label>
                                    <InfoTooltip
                                        content={t('categoryGroups.modal.requiredHint')}
                                        label={t('categoryGroups.modal.requiredHint')}
                                        className="-ml-1.5"
                                    />
                                </div>
                            </div>

                            <Field label={t('categoryGroups.modal.bommel')} info={t('categoryGroups.modal.bommelHint')}>
                                <BommelMultiSelector value={bommelIds} onChange={setBommelIds} />
                            </Field>
                        </div>

                        <section className="flex min-h-[360px] flex-col px-7 pb-4 pt-5 md:min-h-0">
                            {/* Heading with the number of categories, and the search right next to it */}
                            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                                <div className="flex items-center gap-2 text-[14.5px] font-bold text-[var(--font-color)]">
                                    {t('categoryGroups.modal.values')}
                                    {categoryCount > 0 && (
                                        <span className="rounded-full bg-[var(--surface-track)] px-2 py-0.5 text-[12px] font-bold tabular-nums text-[var(--muted)]">
                                            {categoryCount}
                                        </span>
                                    )}
                                </div>
                                {showSearch && (
                                    <div className="relative w-full sm:ml-auto sm:w-64">
                                        <Search
                                            size={15}
                                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]"
                                            aria-hidden="true"
                                        />
                                        <BaseInput
                                            value={valueQuery}
                                            onChange={(e) => setValueQuery(e.target.value)}
                                            placeholder={t('categoryGroups.modal.searchValues')}
                                            aria-label={t('categoryGroups.modal.searchValues')}
                                            className="h-9 pl-9"
                                        />
                                    </div>
                                )}
                            </div>
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

                            <div className="mt-2.5 flex min-h-0 flex-1 flex-col">
                                {valueRows.length > 0 ? (
                                    <CategoryValueList
                                        className="flex-1"
                                        rows={valueRows}
                                        groupId={group?.id}
                                        expandAll={valueQuery.trim().length > 0}
                                        hasMore={!isCreate && hasNextPage}
                                        loadingMore={isFetchingNextPage}
                                        onLoadMore={() => !isFetchingNextPage && fetchNextPage()}
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
                                    <div className="text-[13px] text-[var(--ink-faint)]">
                                        {valueQuery.trim() ? t('categoryGroups.fields.noValues') : t('categoryGroups.modal.noValues')}
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    <div className="flex shrink-0 justify-end gap-2.5 border-t border-[var(--border-soft)] px-7 py-4">
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
