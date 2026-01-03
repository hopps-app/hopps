import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { Cross2Icon } from '@radix-ui/react-icons';

import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';
import TextField from '@/components/ui/TextField';

type SearchFilterProps = {
    value: string;
    onChange: (v: string) => void;
    label?: string;
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
            <div className="relative w-full">
                <TextField
                    onChange={handleChange}
                    value={value}
                    prependIcon="MagnifyingGlass"
                    placeholder={t('receipts.filters.searchPlaceholder')}
                    className="h-10"
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
