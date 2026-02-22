import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';
import { Checkbox } from '@/components/ui/shadecn/Checkbox';

type TypeFilterProps = {
    filters: {
        income?: boolean;
        expense?: boolean;
    };
    onChange: (key: 'income' | 'expense', value: boolean) => void;
    label: string;
};

const TypeFilter = ({ filters, onChange, label }: TypeFilterProps) => {
    const { t } = useTranslation();

    const handleToggle = useCallback(
        (key: 'income' | 'expense', checked: boolean) => {
            onChange(key, checked);
        },
        [onChange]
    );

    return (
        <ReceiptFilterField label={label}>
            <div className="flex items-center gap-4 h-10 xl:min-w-[350px] ">
                <div className="flex items-center gap-2 flex-1">
                    <Checkbox
                        id="type-income"
                        checked={!!filters.income}
                        onCheckedChange={(checked) => handleToggle('income', !!checked)}
                        className="size-5 rounded-md border border-[#d1d5db] 
                                   bg-[var(--grey-white)] 
                                   data-[state=checked]:bg-[var(--purple-500)] 
                                   data-[state=checked]:border-[var(--purple-500)]
                                   hover:bg-[var(--grey-400)] 
                                   hover:data-[state=checked]:bg-[var(--purple-400)]
                                   transition-colors focus-visible:ring-0 focus-visible:outline-none"
                    />
                    <label htmlFor="type-income" className="text-base font-medium text-[var(--grey-black)] leading-none cursor-pointer select-none">
                        {t('receipts.filters.income')}
                    </label>
                </div>

                <div className="flex items-center gap-2 flex-1">
                    <Checkbox
                        id="type-expense"
                        checked={!!filters.expense}
                        onCheckedChange={(checked) => handleToggle('expense', !!checked)}
                        className="size-5 rounded-md border border-[#d1d5db] 
                                   bg-[var(--grey-white)] 
                                   data-[state=checked]:bg-[var(--purple-500)] 
                                   data-[state=checked]:border-[var(--purple-500)]
                                   hover:bg-[var(--grey-400)] 
                                   hover:data-[state=checked]:bg-[var(--purple-400)]
                                   transition-colors focus-visible:ring-0 focus-visible:outline-none"
                    />
                    <label htmlFor="type-expense" className="text-base font-medium text-[var(--grey-black)] leading-none cursor-pointer select-none">
                        {t('receipts.filters.expense')}
                    </label>
                </div>
            </div>
        </ReceiptFilterField>
    );
};

export default TypeFilter;
