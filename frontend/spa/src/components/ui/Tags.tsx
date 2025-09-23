import { useCallback, useState } from 'react';

import Icon from '@/components/ui/Icon.tsx';
import { BaseInput } from '@/components/ui/shadecn/BaseInput.tsx';
import { Label } from './Label.tsx';
import InputLoader from './InputLoader';

type TagsProps = {
    label?: string;
    value: string[];
    onChange?: (tags: string[]) => void;
    placeholder?: string;
    className?: string;
    loading?: boolean;
};

function Tags({ label, value, onChange, placeholder, className, loading }: TagsProps) {
    const [input, setInput] = useState('');

    const addTag = useCallback(() => {
        const v = input.trim();
        if (!v) return;
        if (v.length > 20) return;
        if (value.length >= 4) return;
        if (value.includes(v)) {
            setInput('');
            return;
        }
        onChange?.([...value, v]);
        setInput('');
    }, [input, value, onChange]);

    const removeTag = useCallback(
        (idx: number) => {
            onChange?.(value.filter((_, i) => i !== idx));
        },
        [value, onChange]
    );

    return (
        <div className={`w-full min-h-32 ${className || ''}`}>
            {label && <Label>{label}</Label>}
            <div className="relative mt-1">
                <BaseInput
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={placeholder || ''}
                    maxLength={20}
                    disabled={value.length >= 4}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag();
                        }
                    }}
                />
                {loading ? (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <InputLoader />
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={addTag}
                        disabled={value.length >= 4 || input.trim().length > 20}
                        className="absolute right-2 top-1/2 -translate-y-1/2 hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Add tag"
                    >
                        <Icon icon="PlusCircled" />
                    </button>
                )}
            </div>

            {value.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {value.map((tag, idx) => (
                        <span key={`${tag}-${idx}`} className="px-4 py-2 rounded-[15px] bg-purple-100 text-xs flex align-baseline">
                            {tag}
                            <button
                                className="ml-2 inline-flex items-center justify-center hover:opacity-80"
                                type="button"
                                onClick={() => removeTag(idx)}
                                aria-label="Remove tag"
                            >
                                <Icon icon="Cross2" size={16} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Tags;
