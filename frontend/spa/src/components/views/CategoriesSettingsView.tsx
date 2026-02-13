import { Category } from '@hopps/api-client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import CategoryForm from '../Categories/CategoryForm';
import CategoryTable from '../Categories/CategoryTable';
import Button from '../ui/Button';
import Header from '../ui/Header';
import TextField from '../ui/TextField';

import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState/LoadingState';
import BunnyIcon from '@/components/Receipts/BunnyIcon';
import DialogWrapper from '@/components/ui/DialogWrapper';
import { useCategories } from '@/hooks/queries';
import { useSearch } from '@/hooks/use-search';

function CategoriesSettingsView() {
    const { t } = useTranslation();
    const { data: categories = [], isLoading, refetch } = useCategories();
    const [query, setQuery] = useState('');
    const results: Category[] = useSearch(categories, query, ['name']);

    return (
        <div className="flex flex-col gap-4 h-full">
            <Header title={t('categories.title')} />
            <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex flex-col sm:flex-row sm:justify-end items-stretch sm:items-center gap-4 mb-8">
                    <div className="h-11 w-full sm:w-[312px] order-2 sm:order-1">
                        <TextField onValueChange={setQuery} value={query} prependIcon="MagnifyingGlass" placeholder={t('categories.searchInput.placeholder')} />
                    </div>
                    <DialogWrapper
                        trigger={
                            <Button type="button" icon="Plus" className="h-11 min-h-7 w-full sm:w-auto order-1 sm:order-2">
                                {t('categories.addButton')}
                            </Button>
                        }
                        title={t('categories.dialog.creation.title')}
                        description={t('categories.dialog.creation.description')}
                        formId="category-form"
                        onSuccess={refetch}
                        primaryLabel={t('dialogWrapper.save')}
                        secondaryLabel={t('dialogWrapper.cancel')}
                    >
                        {({ onSuccess, setSubmitting }) => <CategoryForm onSuccess={onSuccess} onSubmittingChange={setSubmitting} />}
                    </DialogWrapper>
                </div>
                <div className="flex-1 min-h-0">
                    {isLoading ? (
                        <div className="py-12">
                            <LoadingState size="lg" />
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <BunnyIcon className="mb-4" />
                            <h3 className="text-lg font-medium text-foreground">{t('categories.emptyState.title')}</h3>
                            <p className="text-muted-foreground mt-1 max-w-sm">{t('categories.emptyState.description')}</p>
                        </div>
                    ) : results.length === 0 && query ? (
                        <EmptyState title={t('receipts.filters.noResults')} description={t('categories.emptyState.noSearchResults')} />
                    ) : (
                        <CategoryTable items={results} onActionSuccess={refetch} />
                    )}
                </div>
            </div>
        </div>
    );
}

export default CategoriesSettingsView;
