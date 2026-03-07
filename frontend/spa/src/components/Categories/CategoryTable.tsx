import { Category } from '@hopps/api-client';
import { Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import DialogWrapper from '../ui/DialogWrapper';

import CategoryForm from './CategoryForm';

import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/ApiService.ts';

type TableProps = {
    items: Category[];
    onActionSuccess?: () => void; // pass down to refetch list
};

export default function CategoryTable({ items, onActionSuccess }: TableProps) {
    const { t } = useTranslation();
    const { showSuccess, showError } = useToast();
    const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);

    const sortedItems = [...items].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

    const handleActionSuccess = () => {
        onActionSuccess?.();
        setEditingCategoryId(null); // Reset editing state on any success
    };

    const deletingRef = useRef(false);

    const deleteCategory = async (id: number) => {
        if (deletingRef.current) return;
        deletingRef.current = true;
        try {
            await apiService.orgService.categoryDELETE(id);
            showSuccess(t('categories.form.success.categoryDeleted'));
            handleActionSuccess();
        } catch (e) {
            console.error('Failed to delete category:', e);
            showError(t('categories.form.error.categoryDeleted'));
        } finally {
            deletingRef.current = false;
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
                                className="group rounded-2xl border border-[#E0E0E0] bg-white shadow-sm transition-all duration-200 overflow-hidden hover:border-primary hover:ring-primary cursor-pointer"
                            >
                                {/* Desktop Row */}
                                <div className="hidden md:flex items-center justify-between px-5 py-2.5 hover:bg-[var(--background-tertiary)] transition-colors">
                                    <div className="min-w-0 flex-1">
                                        <span className="font-medium text-sm truncate block">{category.name}</span>
                                        <span className="text-xs text-gray-500 truncate block">
                                            {category.description || <span className="text-gray-400 italic">{t('categories.table.noDescription')}</span>}
                                        </span>
                                    </div>
                                    <div className="flex justify-end shrink-0 ml-4" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                                        <DialogWrapper
                                            trigger={
                                                <button
                                                    type="button"
                                                    className="rounded-lg text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            }
                                            title={t('categories.dialog.deletion.title')}
                                            description={t('categories.dialog.deletion.description_1')}
                                            onSuccess={() => deleteCategory(category.id!)}
                                            primaryLabel={t('dialogWrapper.yes')}
                                            secondaryLabel={t('dialogWrapper.no')}
                                        >
                                            <p className="text-sm text-gray-600">{t('categories.dialog.deletion.description_2')}</p>
                                        </DialogWrapper>
                                    </div>
                                </div>

                                {/* Mobile Card */}
                                <div className="md:hidden p-4 hover:bg-[var(--background-tertiary)] transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <span className="font-medium text-sm truncate block">{category.name}</span>
                                            <span className="text-xs text-gray-500 mt-0.5 block truncate">
                                                {category.description || <span className="text-gray-400 italic">{t('categories.table.noDescription')}</span>}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-end mt-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                                        <DialogWrapper
                                            trigger={
                                                <button
                                                    type="button"
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            }
                                            title={t('categories.dialog.deletion.title')}
                                            description={t('categories.dialog.deletion.description_1')}
                                            onSuccess={() => deleteCategory(category.id!)}
                                            primaryLabel={t('dialogWrapper.yes')}
                                            secondaryLabel={t('dialogWrapper.no')}
                                        >
                                            <p className="text-sm text-gray-600">{t('categories.dialog.deletion.description_2')}</p>
                                        </DialogWrapper>
                                    </div>
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
                        {({ onSuccess, setOpen, setSubmitting }) => {
                            if (editingCategoryId === category.id) {
                                setTimeout(() => setOpen(true), 0);
                            }
                            return <CategoryForm initialData={category} isEdit onSuccess={onSuccess} onSubmittingChange={setSubmitting} />;
                        }}
                    </DialogWrapper>
                </div>
            ))}
        </div>
    );
}
