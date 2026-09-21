import { X } from 'lucide-react';
import { useRef, useState, type KeyboardEvent } from 'react';

/** Tags of a transaction as removable chips with a field to type new ones: Enter or leaving the field adds one. */
export function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (tags: string[]) => void; placeholder?: string }) {
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    function add() {
        const tag = input.trim();
        if (tag && !value.includes(tag)) onChange([...value, tag]);
        setInput('');
    }

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            e.preventDefault();
            add();
        }
        if (e.key === 'Backspace' && !input && value.length) {
            onChange(value.slice(0, -1));
        }
    }

    return (
        <div
            className="flex cursor-text flex-wrap gap-1.5 rounded-[10px] border border-border-soft bg-[var(--background-secondary)] p-2 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-[var(--accent-surface)]"
            onClick={() => inputRef.current?.focus()}
        >
            {value.map((tag) => (
                <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-[var(--btn-radius)] px-2.5 py-1 text-[12.5px] font-semibold"
                    style={{ background: 'var(--accent-surface)', color: 'var(--purple-700)' }}
                >
                    {tag}
                    <button
                        type="button"
                        aria-label={tag}
                        onClick={() => onChange(value.filter((t) => t !== tag))}
                        className="transition-colors hover:text-[var(--negative)]"
                    >
                        <X size={11} strokeWidth={2.5} />
                    </button>
                </span>
            ))}
            <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={add}
                placeholder={value.length === 0 ? placeholder : ''}
                className="min-w-[120px] flex-1 bg-transparent py-0.5 text-[13.5px] text-foreground outline-none placeholder:text-[var(--ink-faint)]"
            />
        </div>
    );
}
