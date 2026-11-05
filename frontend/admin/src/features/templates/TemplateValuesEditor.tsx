import { CornerDownRight, Eye, EyeOff, FolderInput, Layers, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { TemplateValue } from './types';

import Button from '@/components/ui/Button';
import { formatNumber } from '@/features/organizations/format';

type TemplateValuesEditorProps = {
    values: TemplateValue[];
    disabled: boolean;
    onChange: (values: TemplateValue[]) => void;
};

/** Above this many values a search field appears, so long lists (a whole chart of accounts) stay manageable. */
const SEARCH_THRESHOLD = 8;

const rowButton = 'grid h-7 w-7 place-items-center rounded text-ink-3 hover:text-ink transition-colors';

/** Each top-level value directly followed by its children, as the server stores them. */
function inTreeOrder(values: TemplateValue[]): TemplateValue[] {
    const childrenOf = new Map<string, TemplateValue[]>();
    for (const value of values) {
        if (value.parent) childrenOf.set(value.parent, [...(childrenOf.get(value.parent) ?? []), value]);
    }
    return values.filter((v) => !v.parent).flatMap((v) => [v, ...(childrenOf.get(v.value) ?? [])]);
}

/**
 * Value list editor that works like the category group dialog in the SPA: type a value and add it with the button or
 * Enter. Each value can go under a top-level value, be hidden or removed; a top-level value can be turned into a pure
 * collection of its children. Pasting several lines adds each line as its own value.
 */
export default function TemplateValuesEditor({ values, disabled, onChange }: TemplateValuesEditorProps) {
    const { t } = useTranslation();
    const [input, setInput] = useState('');
    const [query, setQuery] = useState('');
    /** The parent the next added values go under. */
    const [addUnder, setAddUnder] = useState<string | undefined>(undefined);
    /** The value whose parent is being chosen; one select at a time keeps long lists fast. */
    const [moving, setMoving] = useState<string | undefined>(undefined);

    const add = (raw: string[]) => {
        const next = [...values];
        for (const line of raw) {
            const value = line.trim();
            if (value && !next.some((v) => v.value === value)) next.push({ value, parent: addUnder, bookable: true, hidden: false });
        }
        if (next.length !== values.length) onChange(next);
        setInput('');
    };

    const patch = (value: string, change: Partial<TemplateValue>) => onChange(values.map((v) => (v.value === value ? { ...v, ...change } : v)));

    // The children of a removed parent move to the top level, as they do in an organization's group.
    const remove = (value: string) => onChange(values.filter((v) => v.value !== value).map((v) => (v.parent === value ? { ...v, parent: undefined } : v)));

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        const ordered = inTreeOrder(values);
        return q ? ordered.filter((v) => v.value.toLowerCase().includes(q) || v.parent?.toLowerCase().includes(q)) : ordered;
    }, [values, query]);

    const parents = useMemo(() => values.filter((v) => !v.parent), [values]);
    const hasChildren = (value: string) => values.some((v) => v.parent === value);

    return (
        <div>
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <span className="text-[13px] font-semibold text-ink">{t('templates.editor.values')}</span>
                <span className="tnum text-[12px] text-ink-2">
                    {t('templates.editor.valueCount', { count: values.length, formatted: formatNumber(values.length) })}
                </span>
            </div>

            {addUnder && (
                <div className="flex items-center gap-1.5 mb-1.5 text-[12.5px] font-semibold text-ink-2">
                    <CornerDownRight size={14} />
                    {t('templates.editor.addingUnder', { value: addUnder })}
                    <button type="button" className="grid text-ink-3 hover:text-ink" aria-label={t('common.cancel')} onClick={() => setAddUnder(undefined)}>
                        <X size={13} />
                    </button>
                </div>
            )}

            <div className="flex gap-2">
                <input
                    className="input flex-1"
                    value={input}
                    disabled={disabled}
                    placeholder={t('templates.editor.valuePlaceholder')}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            add([input]);
                        }
                    }}
                    onPaste={(e) => {
                        const text = e.clipboardData.getData('text');
                        if (/\r?\n/.test(text.trim())) {
                            e.preventDefault();
                            add(text.split(/\r?\n/));
                        }
                    }}
                />
                <Button variant="secondary" className="h-auto self-stretch px-4" disabled={disabled || input.trim() === ''} onClick={() => add([input])}>
                    <Plus />
                    {t('templates.editor.addValue')}
                </Button>
            </div>

            {values.length > SEARCH_THRESHOLD && (
                <div className="relative mt-3">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
                    <input
                        className="input input--prefix"
                        value={query}
                        placeholder={t('templates.editor.searchValues')}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            )}

            <ul className="flex flex-col gap-0.5 max-h-72 overflow-y-auto mt-2.5">
                {visible.map((item) => {
                    const hidden = item.hidden || values.some((v) => v.value === item.parent && v.hidden);
                    return (
                        <li
                            key={item.value}
                            className="flex items-center gap-1.5 rounded-sm border border-line bg-surface py-1 pl-2.5 pr-1 text-[13px] font-semibold text-ink"
                        >
                            {item.parent && <CornerDownRight size={14} className="ml-1 shrink-0 text-ink-3" />}
                            <span className={`min-w-0 flex-1 truncate ${hidden ? 'opacity-50' : ''}`}>{item.value}</span>
                            {!item.bookable && <span className="shrink-0 text-[11px] font-bold text-ink-2">{t('templates.editor.collection')}</span>}
                            {hidden && <span className="shrink-0 text-[11px] font-bold text-ink-2">{t('templates.editor.hidden')}</span>}

                            {moving === item.value ? (
                                <select
                                    className="input h-7 w-40 py-0 text-[12.5px]"
                                    autoFocus
                                    value={item.parent ?? ''}
                                    aria-label={t('templates.editor.move', { value: item.value })}
                                    onBlur={() => setMoving(undefined)}
                                    onChange={(e) => {
                                        patch(item.value, { parent: e.target.value || undefined });
                                        setMoving(undefined);
                                    }}
                                >
                                    <option value="">{t('templates.editor.topLevel')}</option>
                                    {parents
                                        .filter((p) => p.value !== item.value)
                                        .map((p) => (
                                            <option key={p.value} value={p.value}>
                                                {p.value}
                                            </option>
                                        ))}
                                </select>
                            ) : (
                                <div className="flex shrink-0 items-center">
                                    {!item.parent && (
                                        <button
                                            type="button"
                                            className={rowButton}
                                            disabled={disabled}
                                            aria-label={t('templates.editor.addChild', { value: item.value })}
                                            onClick={() => setAddUnder(item.value)}
                                        >
                                            <Plus size={15} />
                                        </button>
                                    )}
                                    {!item.parent && (
                                        <button
                                            type="button"
                                            className={rowButton}
                                            disabled={disabled}
                                            aria-pressed={!item.bookable}
                                            title={t(item.bookable ? 'templates.editor.makeCollection' : 'templates.editor.makeBookable', {
                                                value: item.value,
                                            })}
                                            aria-label={t(item.bookable ? 'templates.editor.makeCollection' : 'templates.editor.makeBookable', {
                                                value: item.value,
                                            })}
                                            onClick={() => patch(item.value, { bookable: !item.bookable })}
                                        >
                                            <Layers size={15} />
                                        </button>
                                    )}
                                    {!hasChildren(item.value) && (
                                        <button
                                            type="button"
                                            className={rowButton}
                                            disabled={disabled}
                                            title={t('templates.editor.move', { value: item.value })}
                                            aria-label={t('templates.editor.move', { value: item.value })}
                                            onClick={() => setMoving(item.value)}
                                        >
                                            <FolderInput size={15} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className={rowButton}
                                        disabled={disabled}
                                        aria-pressed={item.hidden}
                                        title={t(item.hidden ? 'templates.editor.show' : 'templates.editor.hide', { value: item.value })}
                                        aria-label={t(item.hidden ? 'templates.editor.show' : 'templates.editor.hide', { value: item.value })}
                                        onClick={() => patch(item.value, { hidden: !item.hidden })}
                                    >
                                        {item.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                    <button
                                        type="button"
                                        className={rowButton}
                                        disabled={disabled}
                                        aria-label={t('templates.editor.removeValue', { value: item.value })}
                                        onClick={() => remove(item.value)}
                                    >
                                        <X size={15} />
                                    </button>
                                </div>
                            )}
                        </li>
                    );
                })}
                {values.length > 0 && visible.length === 0 && <p className="text-[12px] text-ink-3 py-1">{t('templates.editor.noMatches')}</p>}
            </ul>
        </div>
    );
}
