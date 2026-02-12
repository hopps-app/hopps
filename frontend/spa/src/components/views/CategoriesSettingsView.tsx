import { Category } from '@hopps/api-client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import CategoryForm from '../Categories/CategoryForm';
import CategoryTable from '../Categories/CategoryTable';
import Button from '../ui/Button';
import Header from '../ui/Header';
import TextField from '../ui/TextField';

import { LoadingState } from '@/components/common/LoadingState/LoadingState';
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
                    ) : (
                        <CategoryTable items={results} onActionSuccess={refetch} />
                    )}
                </div>
            </div>
        </div>
    );
}

export default CategoriesSettingsView;
