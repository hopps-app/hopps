import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BommelTreeItem } from './bommelTree';

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/Command';
import Emoji from '@/components/ui/Emoji';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadecn/Popover';
import { cn } from '@/lib/utils';

export const ALL_BOMMELS = 'all';

/**
 * The chosen bommel is tinted purple and bold; cmdk's own `data-[selected]` marks only the item the
 * keyboard is currently on, and its attribute selector outranks a plain class — so the chosen state
 * has to repeat itself under that variant to stay visible while arrowing past.
 */
const itemClasses = (chosen: boolean) =>
    cn(
        'rounded-[10px] px-2.5 py-2 text-sm',
        chosen ? 'bg-purple-100 font-bold text-purple-700 data-[selected=true]:bg-purple-100 data-[selected=true]:text-purple-700' : 'font-medium'
    );

export type BommelSelection = typeof ALL_BOMMELS | number;

type BommelSelectProps = {
    items: BommelTreeItem[];
    value: BommelSelection;
    onChange: (value: BommelSelection) => void;
    isLoading?: boolean;
    /** Wording for the no-selection entry. Defaults to "all bommels", which suits a filter. */
    emptyLabel?: string;
    /** Extra classes for the trigger, for callers whose surroundings want a different width or weight. */
    triggerClassName?: string;
};

/**
 * Searchable bommel picker. Built on cmdk so arrow keys, Enter, Esc and outside clicks all behave
 * without hand-rolled key handling. Children are indented under their parent, but the indentation is
 * dropped while searching, where hits come from all over the tree and depth would only mislead.
 */
export function BommelSelect({ items, value, onChange, isLoading, emptyLabel, triggerClassName }: BommelSelectProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const selected = value === ALL_BOMMELS ? undefined : items.find((item) => item.id === value);
    const noneLabel = emptyLabel ?? t('dashboard.bommelSelect.all');
    const label = value === ALL_BOMMELS ? noneLabel : (selected?.name ?? noneLabel);
    // Only a caller that supplied its own wording treats the none-entry as "nothing chosen yet"; there the text
    // is a prompt and takes the same weight and colour as the other fields' placeholders. For the filter,
    // "all bommels" is a real selection and keeps the trigger's own weight.
    const showsPlaceholder = value === ALL_BOMMELS && emptyLabel != null;

    const select = (next: BommelSelection) => {
        onChange(next);
        setOpen(false);
        setSearch('');
    };

    return (
        <Popover
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) {
                    setSearch('');
                }
            }}
        >
            <PopoverTrigger asChild>
                <BaseButton
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-label={t('dashboard.bommelSelect.label')}
                    disabled={isLoading}
                    data-testid="dashboard-bommel-filter"
                    className={cn(
                        'h-10 w-full justify-between rounded-[13px] border-border-soft bg-background-secondary px-3 text-sm font-semibold text-foreground sm:w-[200px]',
                        triggerClassName
                    )}
                >
                    <span className="flex min-w-0 items-center gap-2 truncate">
                        {selected?.emoji && <Emoji emoji={selected.emoji} className="text-base" />}
                        <span className={cn('truncate', showsPlaceholder && 'font-normal text-muted-foreground')}>{label}</span>
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
                </BaseButton>
            </PopoverTrigger>
            <PopoverContent align="start" sideOffset={6} className="w-[260px] rounded-2xl border-border-soft p-2 shadow-card-hover">
                {/* The search box is a filled pill rather than the Command default's underline. */}
                <Command className="[&_[cmdk-input-wrapper]]:mb-1.5 [&_[cmdk-input-wrapper]]:h-9 [&_[cmdk-input-wrapper]]:rounded-[10px] [&_[cmdk-input-wrapper]]:border-b-0 [&_[cmdk-input-wrapper]]:bg-hover-effect [&_[cmdk-input-wrapper]]:px-2.5">
                    <CommandInput value={search} onValueChange={setSearch} placeholder={t('dashboard.bommelSelect.search')} className="h-9 py-0" />
                    <CommandList className="max-h-[264px]">
                        <CommandEmpty>{t('dashboard.bommelSelect.empty')}</CommandEmpty>
                        <CommandGroup className="p-0">
                            <CommandItem
                                value={ALL_BOMMELS}
                                keywords={[noneLabel]}
                                onSelect={() => select(ALL_BOMMELS)}
                                className={itemClasses(value === ALL_BOMMELS)}
                            >
                                <span className="w-[18px] shrink-0" aria-hidden="true" />
                                <span className="truncate">{noneLabel}</span>
                                <Check className={cn('ml-auto h-4 w-4', value === ALL_BOMMELS ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                            </CommandItem>
                            {items.map((item) => (
                                <CommandItem
                                    key={item.id}
                                    value={String(item.id)}
                                    keywords={[item.name]}
                                    onSelect={() => select(item.id)}
                                    className={itemClasses(value === item.id)}
                                    style={{ paddingLeft: search ? undefined : 10 + item.depth * 16 }}
                                >
                                    <span className="w-[18px] shrink-0 text-base leading-none">{item.emoji && <Emoji emoji={item.emoji} />}</span>
                                    <span className="truncate">{item.name}</span>
                                    <Check className={cn('ml-auto h-4 w-4', value === item.id ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
