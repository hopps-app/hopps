import { CategoryGroupResponse } from '@hopps/api-client';
import { Lightbulb, Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import CategoryGroupModal from '@/components/CategoryGroups/CategoryGroupModal';
import { rootBommel } from '@/components/CategoryGroups/helpers';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState/LoadingState';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useCategoryGroups, useCategoryGroupUsage, useDeleteCategoryGroup } from '@/hooks/queries/useCategoryGroups';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/hooks/use-toast';
import { useBommelsStore } from '@/store/bommels/bommelsStore';

function CategoryGroupsView() {
    const { t } = useTranslation();
    usePageTitle(t('categoryGroups.title'));

    const { data: groups = [], isLoading, refetch } = useCategoryGroups();
    const deleteMutation = useDeleteCategoryGroup();
    const { showSuccess, showError } = useToast();
    const allBommels = useBommelsStore((s) => s.allBommels);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<CategoryGroupResponse | undefined>(undefined);
    const [toDelete, setToDelete] = useState<CategoryGroupResponse | undefined>(undefined);
    const { data: deleteUsage, isLoading: usageLoading } = useCategoryGroupUsage(toDelete?.id);
    const linkedCount = deleteUsage?.transactionCount ?? 0;

    const rootId = useMemo(() => rootBommel(allBommels)?.id, [allBommels]);
    const bommelName = (id: number) => allBommels.find((b) => b.id === id)?.name ?? `#${id}`;

    const openCreate = () => {
        setEditing(undefined);
        setModalOpen(true);
    };
    const openEdit = (group: CategoryGroupResponse) => {
        setEditing(group);
        setModalOpen(true);
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

    const renderScope = (group: CategoryGroupResponse) => {
        const ids = group.bommelIds ?? [];
        if (ids.length === 0) {
            return <span className="text-[#9A9AA3]">{t('categoryGroups.card.noBommel')}</span>;
        }
        if (rootId != null && ids.includes(rootId)) {
            return <span className="text-[#7E3FB4] font-medium">{t('categoryGroups.card.allBommel')}</span>;
        }
        return (
            <div className="flex flex-wrap gap-1.5">
                {ids.map((id) => (
                    <span key={id} className="inline-flex items-center px-2.5 py-1 rounded-full text-[12.5px] font-medium bg-[#F3EAFB] text-[#7E3FB4]">
                        {bommelName(id)}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between gap-2 mt-6">
                <p className="text-sm text-[#6B6B76] max-w-2xl">{t('categoryGroups.subtitle')}</p>
                <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
                >
                    <Plus className="h-4 w-4" />
                    {t('categoryGroups.addButton')}
                </button>
            </div>

            <div className="flex items-start gap-2 rounded-2xl bg-[#F3EAFB] text-[#7E3FB4] px-4 py-3 text-sm">
                <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{t('categoryGroups.hint')}</span>
            </div>

            <div className="flex-1 min-h-0">
                {isLoading ? (
                    <div className="py-12">
                        <LoadingState size="lg" />
                    </div>
                ) : groups.length === 0 ? (
                    <EmptyState title={t('categoryGroups.emptyState.title')} description={t('categoryGroups.emptyState.description')} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {groups.map((group) => (
                            <div key={group.id} className="rounded-[18px] border border-[#E9E9EE] bg-white p-5 flex flex-col gap-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span
                                            className="inline-flex items-center justify-center shrink-0"
                                            style={{ width: 42, height: 42, borderRadius: 12, background: '#F3EAFB', color: '#7E3FB4' }}
                                        >
                                            <Tag className="h-5 w-5" />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="font-semibold text-[var(--font-color)] truncate">{group.name}</div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                {group.required ? (
                                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FBF1DD] text-[#B47C18]">
                                                        {t('categoryGroups.required')}
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F1F1F4] text-[#6B6B76]">
                                                        {t('categoryGroups.optional')}
                                                    </span>
                                                )}
                                                <span className="text-[12px] text-[#9A9AA3]">
                                                    {t('categoryGroups.card.valueCount', { count: group.valueCount ?? 0 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => openEdit(group)}
                                            className="p-1.5 rounded-lg text-[#6B6B76] hover:bg-[#F1F1F4] transition-colors"
                                            aria-label={t('common.edit')}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setToDelete(group)}
                                            className="p-1.5 rounded-lg text-[#6B6B76] hover:bg-[#FBEAEF] hover:text-[#B12C4C] transition-colors"
                                            aria-label={t('common.delete')}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="border-t border-[#E9E9EE] pt-3">
                                    <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#9A9AA3] mb-1.5">
                                        {t('categoryGroups.card.appliesTo')}
                                    </div>
                                    {renderScope(group)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <CategoryGroupModal open={modalOpen} group={editing} onClose={() => setModalOpen(false)} onSaved={refetch} />

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

export default CategoryGroupsView;
