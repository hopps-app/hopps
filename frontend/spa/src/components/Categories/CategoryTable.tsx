import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Category } from '@hopps/api-client';

import Icon from '../ui/Icon';
import CategoryForm from './CategoryForm';
import DialogWrapper from '../ui/DialogWrapper';
import apiService from '@/services/ApiService.ts';
import EmptyTable from '../ui/empty-table';
import hoppsIconSrc from '@/assets/hopps-icon.svg';

type TableProps = {
    items: Category[];
    totalCategories: number;
    isLoading?: boolean;
    onActionSuccess?: () => void; // pass down to refetch list
};

export default function CategoryTable({ items, totalCategories, isLoading = false, onActionSuccess }: TableProps) {
    const { t } = useTranslation();
    const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);

    const sortedItems = [...items].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

    const handleActionSuccess = () => {
        onActionSuccess?.();
        setEditingCategoryId(null); // Reset editing state on any success
    };

    const deleteCategory = async (id: number) => {
        try {
            await apiService.orgService.categoryDELETE(id);
            handleActionSuccess();
        } catch (e) {
            console.error('Failed to delete category:', e);
        }
    };

    // Don't show empty state while loading
    if (isLoading) {
        return null;
    }

    // Show empty state only if there are no categories at all
    if (totalCategories === 0) {
        return (
            <div className="flex flex-col gap-3">
                <EmptyTable mainText={t('categories.empty.mainText')} subText={t('categories.empty.subText')} icon={<img src={hoppsIconSrc} />} />
            </div>
        );
    }

    // If there are categories but search returned no results, show empty message
    if (items.length === 0) {
        return (
            <div className="flex flex-col gap-3">
                <EmptyTable mainText={t('categories.notFound.mainText')} icon={<img src={hoppsIconSrc} />} />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {sortedItems.map((category) => (
                <div key={category.id}>
                    <DialogWrapper
                        trigger={
                            <div
                                onDoubleClick={() => setEditingCategoryId(category.id!)}
                                className="
                                  flex items-start justify-between
                                  rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm
                                  transition-all duration-200
                                  hover:border-primary hover:ring-1 hover:ring-primary
                                  cursor-pointer
                                "
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-gray-900">{category.name}</div>
                                    {category.description ? (
                                        <p className="text-sm text-gray-500 break-words">{category.description}</p>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">{t('categories.table.noDescription')}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                                    <DialogWrapper
                                        trigger={
                                            <button type="button" className="rounded-md p-1 text-gray-500 hover:text-destructive">
                                                <Icon icon="Trash" size="md" />
                                            </button>
                                        }
                                        title={t('categories.dialog.deletion.title')}
                                        description={t('categories.dialog.deletion.description')}
                                        onSuccess={() => deleteCategory(category.id!)}
                                        primaryLabel={t('dialogWrapper.yes')}
                                        secondaryLabel={t('dialogWrapper.no')}
                                    >
                                        <p className="text-sm text-gray-600">{t('categories.dialog.deletion.warning')}</p>
                                    </DialogWrapper>
                                </div>
                            </div>
                        }
                        title={t('categories.dialog.update.title')}
                        description={t('categories.dialog.update.description')}
                        formId="category-form"
                        onSuccess={handleActionSuccess}
                        primaryLabel={t('dialogWrapper.save')}
                        secondaryLabel={t('dialogWrapper.cancel')}
                    >
                        {({ onSuccess, setOpen }) => {
                            if (editingCategoryId === category.id) {
                                setTimeout(() => setOpen(true), 0);
                            }
                            return <CategoryForm initialData={category} isEdit onSuccess={onSuccess} />;
                        }}
                    </DialogWrapper>
                </div>
            ))}
        </div>
    );
}
