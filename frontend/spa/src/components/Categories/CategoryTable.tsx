import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Icon from '../ui/Icon';
import CategoryForm, { Category } from './CategoryForm';
import DialogWrapper from '../ui/DialogWrapper';
import apiService from '@/services/ApiService.ts';

type TableProps = {
    items: Category[];
    onActionSuccess?: () => void; // pass down to refetch list
};

export default function CategoryTable({ items, onActionSuccess }: TableProps) {
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

    return (
        <div className="flex flex-col gap-3">
            {sortedItems.map((category) => (
                <div key={category.id}>
                    <DialogWrapper
                        trigger={
                            <div
                                onDoubleClick={() => setEditingCategoryId(category.id!)}
                                className="flex items-start justify-between rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm transition-colors hover:border-primary hover:ring-2 hover:ring-primary cursor-pointer"
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
                                        description={t('categories.dialog.deletion.description_1')}
                                        onSuccess={() => deleteCategory(category.id!)}
                                    >
                                        <p className="text-sm text-gray-600">{t('categories.dialog.deletion.description_2')}</p>
                                    </DialogWrapper>
                                </div>
                            </div>
                        }
                        title={t('categories.dialog.update.title')}
                        description={t('categories.dialog.update.description')}
                        formId="category-form"
                        onSuccess={handleActionSuccess}
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
