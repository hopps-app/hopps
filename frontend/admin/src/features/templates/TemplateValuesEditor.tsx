import { Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import { formatNumber } from '@/features/organizations/format';

type TemplateValuesEditorProps = {
    values: string[];
    disabled: boolean;
    onChange: (values: string[]) => void;
};

/** Above this many values a search field appears, so long lists (a whole chart of accounts) stay manageable. */
const SEARCH_THRESHOLD = 8;

/**
 * Value list editor that works like the category group dialog in the SPA: type a value and add it with the button or
 * Enter, remove it with the X. Pasting several lines adds each line as its own value.
 */
export default function TemplateValuesEditor({ values, disabled, onChange }: TemplateValuesEditorProps) {
    const { t } = useTranslation();
    const [input, setInput] = useState('');
    const [query, setQuery] = useState('');

    const add = (raw: string[]) => {
        const next = [...values];
        for (const line of raw) {
            const value = line.trim();
            if (value && !next.includes(value)) next.push(value);
        }
        if (next.length !== values.length) onChange(next);
        setInput('');
    };

    const remove = (value: string) => onChange(values.filter((v) => v !== value));

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? values.filter((v) => v.toLowerCase().includes(q)) : values;
    }, [values, query]);

    return (
        <div>
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <span className="text-[13px] font-semibold text-ink">{t('templates.editor.values')}</span>
                <span className="tnum text-[12px] text-ink-2">
                    {t('templates.editor.valueCount', { count: values.length, formatted: formatNumber(values.length) })}
                </span>
            </div>

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

            {/* Chips as in the category group dialog of the design handoff (design_handoff_erstnutzer, GroupModal). */}
            <div className="flex flex-wrap gap-[7px] max-h-64 overflow-y-auto mt-2.5">
                {visible.map((value) => (
                    <span
                        key={value}
                        className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-surface py-[5px] pl-[11px] pr-2 text-[13px] font-semibold text-ink"
                    >
                        {value}
                        <button
                            type="button"
                            className="grid text-ink-3 hover:text-ink transition-colors"
                            disabled={disabled}
                            aria-label={t('templates.editor.removeValue', { value })}
                            onClick={() => remove(value)}
                        >
                            <X size={13} />
                        </button>
                    </span>
                ))}
                {values.length > 0 && visible.length === 0 && <p className="text-[12px] text-ink-3 py-1">{t('templates.editor.noMatches')}</p>}
            </div>
        </div>
    );
}
