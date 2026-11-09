import { CategoryGroupResponse } from '@hopps/api-client';
import { FileUp, Lightbulb, Plus } from 'lucide-react';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import CategoryGroupCard from '@/components/CategoryGroups/CategoryGroupCard';
import CategoryGroupImportDialog from '@/components/CategoryGroups/CategoryGroupImportDialog';
import CategoryGroupModal from '@/components/CategoryGroups/CategoryGroupModal';
import CategoryGroupSetup from '@/components/CategoryGroups/CategoryGroupSetup';
import { CategoryGroupsSkeleton } from '@/components/CategoryGroups/CategoryGroupsSkeleton';
import { downloadCategoryGroupFile } from '@/components/CategoryGroups/categoryValues';
import { rootBommel } from '@/components/CategoryGroups/helpers';
import Button from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useCategoryGroups, useCategoryGroupTemplates, useCategoryGroupUsage, useDeleteCategoryGroup } from '@/hooks/queries/useCategoryGroups';
import { useEnsureBommels } from '@/hooks/use-ensure-bommels';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import apiService from '@/services/ApiService';
import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { useStore } from '@/store/store';

function CategoryGroupsView() {
    const { t } = useTranslation();
    useEnsureBommels();
    const { data: groups = [], isLoading, refetch } = useCategoryGroups();
    const { data: templates = [], isLoading: templatesLoading } = useCategoryGroupTemplates();
    // First use: no group yet, so the page offers the templates instead of the overview.
    const isSetup = !isLoading && groups.length === 0;
    usePageTitle(isSetup ? t('categoryGroups.setup.title') : t('categoryGroups.title'));
    const deleteMutation = useDeleteCategoryGroup();
    const { showSuccess, showError } = useToast();
    const allBommels = useBommelsStore((s) => s.allBommels);
    // The assignments show bommel names; load the tree when the page is opened directly.
    const { organization } = useStore();
    const loadBommels = useBommelsStore((s) => s.loadBommels);
    const bommelCount = allBommels.length;
    useEffect(() => {
        if (organization?.id && bommelCount === 0) loadBommels(organization.id);
    }, [organization?.id, bommelCount, loadBommels]);

    const [modalOpen, setModalOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [editing, setEditing] = useState<CategoryGroupResponse | undefined>(undefined);
    const [toDelete, setToDelete] = useState<CategoryGroupResponse | undefined>(undefined);
    const { data: deleteUsage, isLoading: usageLoading } = useCategoryGroupUsage(toDelete?.id);
    const linkedCount = deleteUsage?.transactionCount ?? 0;

    const rootId = useMemo(() => rootBommel(allBommels)?.id, [allBommels]);

    // ?groupId= (a link from the Bommel details): scroll to that group and let it light up. The parameter is dropped
    // once applied, so a reload does not repeat it.
    const [searchParams, setSearchParams] = useSearchParams();
    const linkedGroupId = Number(searchParams.get('groupId')) || null;
    const [highlightedId, setHighlightedId] = useState<number | null>(null);
    useEffect(() => {
        if (!linkedGroupId || isLoading) return;
        searchParams.delete('groupId');
        setSearchParams(searchParams, { replace: true });
        if (!groups.some((g) => g.id === linkedGroupId)) return;
        setHighlightedId(linkedGroupId);
        requestAnimationFrame(() =>
            document.querySelector(`[data-category-group-id="${linkedGroupId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        );
    }, [linkedGroupId, isLoading, groups, searchParams, setSearchParams]);

    const openCreate = () => {
        setEditing(undefined);
        setModalOpen(true);
    };
    const openEdit = (group: CategoryGroupResponse) => {
        setEditing(group);
        setModalOpen(true);
    };

    const handleExport = async (group: CategoryGroupResponse) => {
        try {
            downloadCategoryGroupFile(await apiService.orgService.exportCategoryGroup(group.id as number));
        } catch {
            showError(t('categoryGroups.toast.error'));
        }
    };

    const confirmDelete = async () => {
        if (!toDelete?.id) {
            return;
        }
        try {
            await deleteMutation.mutateAsync(toDelete.id);
            showSuccess(t('categoryGroups.toast.deleted'));
        } catch {
            showError(t('categoryGroups.toast.error'));
        } finally {
            setToDelete(undefined);
        }
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* A skeleton instead of a spinner while it is not yet known whether to show the setup or the overview. */}
            {isLoading || templatesLoading ? (
                <CategoryGroupsSkeleton />
            ) : isSetup ? (
                <>
                    <PageHeader title={t('categoryGroups.setup.title')} />
                    <CategoryGroupSetup templates={templates} onCreated={refetch} onImport={() => setImportOpen(true)} />
                </>
            ) : (
                <>
                    <PageHeader
                        title={t('categoryGroups.title')}
                        action={
                            <div className="flex flex-wrap gap-2.5">
                                <Button variant="outline" size="sm" className="h-10" onClick={() => setImportOpen(true)}>
                                    <FileUp />
                                    {t('categoryGroups.import.button')}
                                </Button>
                                <Button size="sm" className="h-10" onClick={openCreate}>
                                    <Plus />
                                    {t('categoryGroups.addButton')}
                                </Button>
                            </div>
                        }
                    />

                    <div className="flex items-start gap-2.5 rounded-2xl bg-[var(--accent-surface)] px-[18px] py-[13px] text-purple-700">
                        <Lightbulb size={17} className="mt-px shrink-0" />
                        <p className="text-[13.5px] leading-snug">{t('categoryGroups.hint')}</p>
                    </div>

                    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
                        {groups.map((group) => (
                            // A grid of one, so the card still fills the row height
                            <div
                                key={group.id}
                                data-category-group-id={group.id}
                                className={cn('grid rounded-[var(--r-card)]', highlightedId === group.id && 'animate-filter-hint')}
                                onAnimationEnd={() => setHighlightedId(null)}
                            >
                                <CategoryGroupCard
                                    group={group}
                                    rootId={rootId}
                                    onEdit={() => openEdit(group)}
                                    onExport={() => handleExport(group)}
                                    onDelete={() => setToDelete(group)}
                                />
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={openCreate}
                            className="flex min-h-[180px] flex-col items-center justify-center gap-2.5 rounded-[var(--r-card)] border-2 border-dashed border-[#E0E0E6] bg-[var(--surface-sunken)] text-[13.5px] font-bold text-purple-700 transition-colors hover:border-[var(--primary)] hover:bg-[var(--accent-surface)] dark:border-gray-700"
                        >
                            <Plus size={22} />
                            {t('categoryGroups.addButton')}
                        </button>
                    </div>
                </>
            )}

            <CategoryGroupModal open={modalOpen} group={editing} onClose={() => setModalOpen(false)} onSaved={refetch} />
            <CategoryGroupImportDialog open={importOpen} groups={groups} onClose={() => setImportOpen(false)} onImported={refetch} />

            <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(undefined)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('categoryGroups.delete.title')}</DialogTitle>
                        <DialogDescription>
                            {usageLoading
                                ? t('categoryGroups.delete.loading')
                                : linkedCount > 0
                                  ? t('categoryGroups.delete.descriptionLinked', { group: toDelete?.name ?? '', count: linkedCount })
                                  : t('categoryGroups.delete.description', { group: toDelete?.name ?? '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={() => setToDelete(undefined)}
                            className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-xl border border-[#d1d5db] px-4 text-sm font-medium text-[var(--font-color)] transition-colors hover:bg-[#F1F1F4] sm:w-auto"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={confirmDelete}
                            disabled={usageLoading || deleteMutation.isPending}
                            className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-xl bg-[#B12C4C] px-4 text-sm font-medium text-white transition-colors hover:bg-[#9e2743] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                            {t('categoryGroups.delete.confirm')}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/** Page title with an optional subtitle and an optional action on the right, shaped like the Transaktionen header. */
function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
                <h1 className="text-[27px] font-extrabold leading-tight tracking-[-0.02em] text-foreground">{title}</h1>
                {subtitle && <p className="mt-1 text-[14.5px] text-muted-foreground">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

export default CategoryGroupsView;
