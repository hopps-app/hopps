import { useTranslation } from 'react-i18next';
import { useState, useMemo, useCallback } from 'react';
import { CheckIcon, ChevronDownIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';

import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/shadecn/Popover';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList, CommandEmpty } from '@/components/ui/Command';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';
import { cn } from '@/lib/utils';

type ProjectFilterProps = {
    filters: {
        project?: string | null;
    };
    onChange: (key: 'project', value: string | null) => void;
    label: string;
};

const mockProjects = [
    { id: 'proj1', name: 'Hopps' },
    { id: 'proj2', name: 'Reisekosten' },
    { id: 'proj3', name: 'IT Infrastruktur' },
    { id: 'proj4', name: 'Marketing Q4' },
];

const ProjectFilter = ({ filters, onChange, label }: ProjectFilterProps) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const filteredProjects = useMemo(() => {
        if (!search) return mockProjects;
        return mockProjects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    }, [search]);

    const selectedProject = mockProjects.find((p) => p.id === filters.project);

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
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <div className="relative w-full max-w-[280px]">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--grey-700)] pointer-events-none" />

                        <BaseButton
                            variant="outline"
                            aria-haspopup="listbox"
                            aria-expanded={open}
                            className={cn(
                                'w-full justify-between text-sm font-normal rounded-[var(--radius-l)] border border-[var(--grey-600)] bg-[var(--grey-white)]',
                                'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none pl-10 pr-3 py-2 text-left',
                                !selectedProject && 'text-[var(--grey-800)]'
                            )}
                        >
                            {selectedProject ? selectedProject.name : t('receipts.filters.searchPlaceholder')}
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
                        <CommandInput placeholder={t('receipts.filters.searchPlaceholder')} value={search} onValueChange={setSearch} className="h-9 text-sm" />
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
        </ReceiptFilterField>
    );
};

export default ProjectFilter;
