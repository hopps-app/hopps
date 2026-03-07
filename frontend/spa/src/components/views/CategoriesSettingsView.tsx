import { Category } from '@hopps/api-client';
import { MagnifyingGlassIcon, Cross2Icon } from '@radix-ui/react-icons';
import { Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import CategoryForm from '../Categories/CategoryForm';
import CategoryTable from '../Categories/CategoryTable';

import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState/LoadingState';
import BunnyIcon from '@/components/Receipts/BunnyIcon';
import DialogWrapper from '@/components/ui/DialogWrapper';
import { BaseInput } from '@/components/ui/shadecn/BaseInput';
import { useCategories } from '@/hooks/queries';
import { usePageTitle } from '@/hooks/use-page-title';
import { useSearch } from '@/hooks/use-search';
import { cn } from '@/lib/utils';

function CategoriesSettingsView() {
    const { t } = useTranslation();
    usePageTitle(t('categories.title'));
    const { data: categories = [], isLoading, refetch } = useCategories();
    const [query, setQuery] = useState('');
    const results: Category[] = useSearch(categories, query, ['name']);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
    }, []);

    const handleSearchClear = useCallback(() => {
        setQuery('');
    }, []);

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-6 mb-3">
                    <div className="relative flex-1 max-w-md">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--grey-700)] pointer-events-none" />
                        <BaseInput
                            value={query}
                            onChange={handleSearchChange}
                            placeholder={t('categories.searchInput.placeholder')}
                            className={cn(
                                'w-full pl-9 pr-8 h-10 text-sm',
                                'rounded-xl border border-[#d1d5db] bg-white',
                                'focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
                                'focus:border-[var(--purple-500)] transition-colors'
                            )}
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={handleSearchClear}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--grey-700)] hover:text-[var(--grey-900)] transition-colors"
                            >
                                <Cross2Icon className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    <DialogWrapper
                        trigger={
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
                            >
                                <Plus className="h-4 w-4" />
                                {t('categories.addButton')}
                            </button>
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
