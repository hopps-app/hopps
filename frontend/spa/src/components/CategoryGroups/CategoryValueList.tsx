import { CheckIcon } from '@radix-ui/react-icons';
import { ChevronRight, CornerDownRight, Eye, EyeOff, FolderInput, Layers, Loader2, Plus, X } from 'lucide-react';
import { FC, ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/Command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadecn/Popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/shadecn/Tooltip';
import { useCategoryGroupValues } from '@/hooks/queries/useCategoryGroups';
import { cn } from '@/lib/utils';

/** One category in the list, whether it is already saved or still part of a new group. */
export type CategoryRow = {
    value: string;
    /** Name of the parent, undefined on the top level. */
    parent?: string;
    bookable: boolean;
    hidden: boolean;
    /** Hidden through its parent. */
    parentHidden: boolean;
    childCount: number;
};

/** A category that can take children. The id is only known for saved categories. */
export type ParentOption = { id?: number; value: string };

type CategoryValueListProps = {
    rows: CategoryRow[];
    /** Candidates for a parent while a new group is built. Saved groups search them on the server instead. */
    parentOptions?: ParentOption[];
    /** The saved group the rows belong to. */
    groupId?: number;
    /** Open every category with subcategories, e.g. while searching, where the matches are what counts. */
    expandAll?: boolean;
    /** More rows exist than are shown; called when the end of the list scrolls into view. */
    hasMore?: boolean;
    loadingMore?: boolean;
    onLoadMore?: () => void;
    className?: string;
    onMove: (row: CategoryRow, parent: ParentOption | null) => void;
    onToggleBookable: (row: CategoryRow) => void;
    onToggleHidden: (row: CategoryRow) => void;
    onAddChild: (row: CategoryRow) => void;
    onRemove: (row: CategoryRow) => void;
};

/** With more rows than this, categories with subcategories start collapsed, so the list opens as an overview. */
const COLLAPSE_ABOVE = 30;

const rowButton =
    'grid h-7 w-7 place-items-center rounded-lg text-[var(--ink-faint)] transition-colors hover:bg-[var(--surface-track)] hover:text-[var(--font-color)]';

/**
 * The categories of a group as a two-level list: each one can be moved, hidden, turned into a collection or removed.
 * Categories with subcategories fold open and closed. The row actions show on hover or keyboard focus (always on touch
 * screens), so a long list stays readable. Fills the height it is given and scrolls on its own.
 */
const CategoryValueList: FC<CategoryValueListProps> = ({
    rows,
    parentOptions,
    groupId,
    expandAll,
    hasMore,
    loadingMore,
    onLoadMore,
    className,
    onMove,
    onToggleBookable,
    onToggleHidden,
    onAddChild,
    onRemove,
}) => {
    const { t } = useTranslation();
    // Only what the user toggled is stored; everything else follows the default for the list's size
    const [toggled, setToggled] = useState<Map<string, boolean>>(() => new Map());
    const startCollapsed = rows.length > COLLAPSE_ABOVE;
    const isOpen = (value: string) => expandAll || (toggled.get(value) ?? !startCollapsed);
    const setOpen = (value: string, open: boolean) => setToggled((prev) => new Map(prev).set(value, open));

    // Load the next page once the end of the list comes into view
    const listRef = useRef<HTMLUListElement>(null);
    const endRef = useRef<HTMLLIElement>(null);
    useEffect(() => {
        const end = endRef.current;
        if (!hasMore || !onLoadMore || !end) return;
        const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && onLoadMore(), {
            root: listRef.current,
            rootMargin: '120px',
        });
        observer.observe(end);
        return () => observer.disconnect();
    }, [hasMore, onLoadMore, rows.length]);

    const visible = rows.filter((row) => row.parent == null || isOpen(row.parent));

    return (
        <ul
            ref={listRef}
            className={cn('flex min-h-0 flex-col gap-0.5 overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--border-soft)] p-1', className)}
        >
            {visible.map((row) => {
                const isChild = row.parent != null;
                const hidden = row.hidden || row.parentHidden;
                const foldable = !isChild && row.childCount > 0;
                const open = foldable && isOpen(row.value);
                return (
                    <li
                        key={row.value}
                        className={cn(
                            'group flex items-center gap-1.5 rounded-lg py-[3px] pr-1 hover:bg-[var(--surface-sunken)] focus-within:bg-[var(--surface-sunken)]',
                            isChild ? 'pl-7' : 'pl-1'
                        )}
                    >
                        {isChild ? (
                            <CornerDownRight size={14} className="shrink-0 text-[var(--ink-faint)]" aria-hidden="true" />
                        ) : foldable ? (
                            <button
                                type="button"
                                className={cn(rowButton, 'h-6 w-6')}
                                aria-expanded={open}
                                aria-label={t(open ? 'categoryGroups.values.collapse' : 'categoryGroups.values.expand', { name: row.value })}
                                onClick={() => setOpen(row.value, !open)}
                            >
                                <ChevronRight size={15} className={cn('transition-transform duration-150', open && 'rotate-90')} />
                            </button>
                        ) : (
                            <span className="w-6 shrink-0" aria-hidden="true" />
                        )}
                        <span
                            className={cn(
                                'min-w-0 flex-1 truncate text-[13.5px] text-[var(--font-color)]',
                                isChild ? 'font-semibold' : 'font-bold',
                                hidden && 'opacity-50'
                            )}
                            title={row.value}
                        >
                            {row.value}
                            {foldable && <span className="ml-1.5 text-[12px] font-semibold text-[var(--ink-faint)]">{row.childCount}</span>}
                        </span>
                        {!row.bookable && <Badge hint={t('categoryGroups.values.collectionHint')}>{t('categoryGroups.values.collection')}</Badge>}
                        {hidden && <Badge hint={t('categoryGroups.values.hiddenHint')}>{t('categoryGroups.values.hidden')}</Badge>}

                        {/* Out of the way until the row is hovered or focused; touch screens have no hover, so there they stay */}
                        <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                            {!isChild && (
                                <button
                                    type="button"
                                    className={rowButton}
                                    aria-label={t('categoryGroups.values.addChild', { name: row.value })}
                                    title={t('categoryGroups.values.addChild', { name: row.value })}
                                    onClick={() => {
                                        // Also without subcategories yet, so the first one is visible once it is added
                                        setOpen(row.value, true);
                                        onAddChild(row);
                                    }}
                                >
                                    <Plus size={15} />
                                </button>
                            )}
                            {!isChild && (
                                <button
                                    type="button"
                                    className={cn(rowButton, !row.bookable && 'text-purple-700')}
                                    aria-pressed={!row.bookable}
                                    aria-label={t(row.bookable ? 'categoryGroups.values.makeCollection' : 'categoryGroups.values.makeBookable', {
                                        name: row.value,
                                    })}
                                    title={t(row.bookable ? 'categoryGroups.values.makeCollection' : 'categoryGroups.values.makeBookable', { name: row.value })}
                                    onClick={() => onToggleBookable(row)}
                                >
                                    <Layers size={15} />
                                </button>
                            )}
                            {row.childCount === 0 && (
                                <ParentPicker row={row} groupId={groupId} options={parentOptions} onPick={(parent) => onMove(row, parent)} />
                            )}
                            <button
                                type="button"
                                className={rowButton}
                                aria-pressed={row.hidden}
                                aria-label={t(row.hidden ? 'categoryGroups.values.show' : 'categoryGroups.values.hide', { name: row.value })}
                                title={t(row.hidden ? 'categoryGroups.values.show' : 'categoryGroups.values.hide', { name: row.value })}
                                onClick={() => onToggleHidden(row)}
                            >
                                {row.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                            <button
                                type="button"
                                className={cn(rowButton, 'hover:text-[var(--negative)]')}
                                aria-label={t('categoryGroups.modal.remove', { name: row.value })}
                                onClick={() => onRemove(row)}
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </li>
                );
            })}
            {hasMore && (
                <li ref={endRef} className="flex items-center justify-center gap-2 py-2 text-[12.5px] font-semibold text-[var(--ink-faint)]">
                    {loadingMore && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                    {t('categoryGroups.values.loadingMore')}
                </li>
            )}
        </ul>
    );
};

const Badge: FC<{ hint: string; children: ReactNode }> = ({ hint, children }) => (
    <TooltipProvider delayDuration={100}>
        <Tooltip>
            <TooltipTrigger asChild>
                <span
                    tabIndex={0}
                    className="shrink-0 cursor-help rounded-[var(--r-sm)] bg-[var(--surface-track)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--muted)]"
                >
                    {children}
                </span>
            </TooltipTrigger>
            {/* Portalled: the list scrolls and would clip it, and it has to sit above the group dialog. */}
            <TooltipContent
                side="top"
                className="z-[120] max-w-[280px] rounded-[10px] bg-[#1B1B1F] px-3.5 py-2.5 text-[12.5px] font-medium leading-snug text-white"
            >
                {hint}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

type ParentPickerProps = {
    row: CategoryRow;
    groupId?: number;
    options?: ParentOption[];
    onPick: (parent: ParentOption | null) => void;
};

/** Popover to move a category under a top-level category or back to the top level. */
const ParentPicker: FC<ParentPickerProps> = ({ row, groupId, options, onPick }) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const { data } = useCategoryGroupValues(groupId, query, open && groupId != null, { topLevel: true });
    const q = query.trim().toLowerCase();
    const candidates: ParentOption[] = (
        groupId != null
            ? (data?.items ?? []).map((item) => ({ id: item.id, value: item.value ?? '' }))
            : (options ?? []).filter((o) => o.value.toLowerCase().includes(q))
    ).filter((o) => o.value !== row.value);

    const pick = (parent: ParentOption | null) => {
        onPick(parent);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen} modal>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={rowButton}
                    aria-label={t('categoryGroups.values.move', { name: row.value })}
                    title={t('categoryGroups.values.move', { name: row.value })}
                >
                    <FolderInput size={15} />
                </button>
            </PopoverTrigger>
            {/* Opens inside the group dialog, so it has to sit above it. */}
            <PopoverContent align="end" sideOffset={4} className="z-[110] w-64 rounded-2xl border-border-soft p-2 shadow-card-hover">
                <Command shouldFilter={false}>
                    <CommandInput placeholder={t('common.search')} className="h-9 py-0" value={query} onValueChange={setQuery} />
                    <CommandList className="max-h-[220px]">
                        <CommandEmpty>{t('categoryGroups.fields.noValues')}</CommandEmpty>
                        <CommandGroup className="p-0">
                            <CommandItem value="__top-level" className="rounded-[10px] px-2.5 py-2 text-sm font-medium" onSelect={() => pick(null)}>
                                <span className="truncate">{t('categoryGroups.values.topLevel')}</span>
                                <CheckIcon className={cn('ml-auto h-4 w-4', row.parent == null ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                            </CommandItem>
                            {candidates.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    className="rounded-[10px] px-2.5 py-2 text-sm font-medium"
                                    onSelect={() => pick(option)}
                                >
                                    <span className="truncate">{option.value}</span>
                                    <CheckIcon
                                        className={cn('ml-auto h-4 w-4', row.parent === option.value ? 'opacity-100' : 'opacity-0')}
                                        aria-hidden="true"
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

export default CategoryValueList;
