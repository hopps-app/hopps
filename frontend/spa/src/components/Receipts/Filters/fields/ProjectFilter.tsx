import { CheckIcon, ChevronDownIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { X } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList, CommandEmpty } from '@/components/ui/Command';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/shadecn/Popover';
import { useBommels } from '@/hooks/queries';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/store';

type ProjectFilterProps = {
    filters: {
        project?: string | null;
    };
    onChange: (key: 'project', value: string | null) => void;
    label: string;
};

const ProjectFilter = ({ filters, onChange, label }: ProjectFilterProps) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const store = useStore();

    // Fetch bommels from API
    const { data: bommels, isLoading } = useBommels(store.organization?.id);

    // Convert bommels to a flat list with id and name
    const bommelList = useMemo(() => {
        if (!bommels) return [];
        return bommels.map((b) => ({
            id: String(b.id),
            name: b.name ?? '',
        }));
    }, [bommels]);

    const filteredProjects = useMemo(() => {
        if (!search) return bommelList;
        return bommelList.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    }, [search, bommelList]);

    const selectedProject = bommelList.find((p) => p.id === filters.project);

    const handleSelect = useCallback(
        (id: string) => {
            const newValue = filters.project === id ? null : id;
            onChange('project', newValue);
            setOpen(false);
        },
        [filters.project, onChange]
    );

    return (
        <ReceiptFilterField label={label}>
            <div className="flex items-center w-full max-w-[280px]">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <div className={cn('relative flex-1', selectedProject && 'rounded-r-none')}>
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--grey-700)] pointer-events-none" />

                            <BaseButton
                                variant="outline"
                                aria-haspopup="listbox"
                                aria-expanded={open}
                                className={cn(
                                    'w-full h-10 justify-between text-sm font-normal rounded-[var(--radius-l)] border border-[var(--grey-600)] bg-[var(--grey-white)]',
                                    'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none pl-10 pr-3 text-left',
                                    !selectedProject && 'text-[var(--grey-800)]',
                                    selectedProject && 'rounded-r-none border-r-0'
                                )}
                            >
                                {isLoading ? t('common.loading') : selectedProject ? selectedProject.name : t('receipts.filters.searchPlaceholder')}
                                <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </BaseButton>
                        </div>
                    </PopoverTrigger>

                    <PopoverContent
                        align="start"
                        side="bottom"
                        sideOffset={4}
                        className={cn(
                            'w-[var(--radix-popover-trigger-width)] p-0 border border-[var(--grey-600)] bg-[var(--grey-white)] rounded-[var(--radius-l)] shadow-sm'
                        )}
                    >
                        <Command shouldFilter={false}>
                            <CommandInput
                                placeholder={t('receipts.filters.searchPlaceholder')}
                                value={search}
                                onValueChange={setSearch}
                                className="h-9 text-sm"
                            />
                            <CommandList>
                                <CommandEmpty>{t('receipts.filters.noResults')}</CommandEmpty>
                                <CommandGroup>
                                    {filteredProjects.map((p) => (
                                        <CommandItem key={p.id} onSelect={() => handleSelect(p.id)} className="text-sm">
                                            {p.name}
                                            {filters.project === p.id && <CheckIcon className="ml-auto h-4 w-4 text-[var(--purple-500)]" />}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
                {selectedProject && (
                    <button
                        type="button"
                        onClick={() => onChange('project', null)}
                        className="flex items-center h-10 px-2 border border-l-0 border-[var(--grey-600)] bg-[var(--grey-white)] rounded-r-[var(--radius-l)] hover:bg-[var(--grey-100)]"
                    >
                        <X className="h-4 w-4 text-[var(--grey-700)] hover:text-[var(--grey-900)]" />
                    </button>
                )}
            </div>
        </ReceiptFilterField>
    );
};

export default ProjectFilter;
