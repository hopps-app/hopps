import { BankAccountResponse } from '@hopps/api-client';
import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/Command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadecn/Popover';
import { cn } from '@/lib/utils';

export function AccountDot({ color }: { color?: string }) {
    return <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color || 'var(--color-primary)' }} />;
}

/**
 * Picks the accounts a list is narrowed to. Nothing selected means all accounts. The popover stays open while toggling,
 * so several accounts can be picked in one go.
 */
export function AccountMultiSelect({
    accounts,
    selected,
    onChange,
    className,
}: {
    accounts: BankAccountResponse[];
    selected: number[];
    onChange: (accountIds: number[]) => void;
    className?: string;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    const only = selected.length === 1 ? accounts.find((a) => a.id === selected[0]) : undefined;
    const toggle = (id: number) => onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button type="button" aria-haspopup="listbox" aria-expanded={open} className={cn('flex items-center gap-2 text-left', className)}>
                    {only && <AccountDot color={only.color} />}
                    <span className="min-w-0 flex-1 truncate">
                        {only?.name ?? (selected.length > 1 ? t('konten.filter.accountsSelected', { count: selected.length }) : t('konten.filter.allAccounts'))}
                    </span>
                    <ChevronDown size={15} className="flex-shrink-0 text-muted-foreground" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" sideOffset={6} className="z-[110] w-[280px] rounded-2xl border-border-soft p-2 shadow-card-hover">
                <Command>
                    <CommandList className="max-h-[264px]">
                        <CommandGroup className="p-0">
                            {accounts.map((account) => {
                                const on = selected.includes(account.id!);
                                return (
                                    <CommandItem
                                        key={account.id}
                                        value={String(account.id)}
                                        onSelect={() => toggle(account.id!)}
                                        className="flex cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[14px]"
                                    >
                                        <AccountDot color={account.color} />
                                        <span className="truncate">{account.name}</span>
                                        <Check className={cn('ml-auto h-4 w-4 flex-shrink-0', on ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
