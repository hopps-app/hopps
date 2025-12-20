import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { MagnifyingGlassIcon, Cross2Icon } from '@radix-ui/react-icons';

import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';
import { BaseInput } from '@/components/ui/shadecn/BaseInput';
import { cn } from '@/lib/utils';

type SearchFilterProps = {
    value: string;
    onChange: (v: string) => void;
    label: string;
};

export const SearchFilter = ({ value, onChange, label }: SearchFilterProps) => {
    const { t } = useTranslation();

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            onChange(e.target.value);
        },
        [onChange]
    );

    const handleClear = useCallback(() => {
        onChange('');
    }, [onChange]);

    return (
        <ReceiptFilterField label={label}>
            <div className="relative w-full max-w-[280px]">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--grey-700)] pointer-events-none" />

                <BaseInput
                    value={value}
                    onChange={handleChange}
                    placeholder={t('receipts.filters.searchPlaceholder')}
                    className={cn(
                        'w-full pl-10 pr-8 py-2 text-sm',
                        'rounded-[var(--radius-l)] border border-[var(--grey-600)] bg-[var(--grey-white)]',
                        'focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
                        'focus:border-[var(--purple-500)] focus:ring-[var(--purple-500)] transition-all'
                    )}
                />

                {value && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-4 text-[var(--purple-500)] hover:text-[var(--purple-700)] transition"
                    >
                        <Cross2Icon className="w-4 h-4" />
                    </button>
                )}
            </div>
        </ReceiptFilterField>
    );
};
