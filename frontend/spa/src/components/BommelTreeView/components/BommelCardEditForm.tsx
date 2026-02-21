import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import EmojiField from '@/components/ui/EmojiField';

const BOMMEL_NAME_MAX_LENGTH = 255;

interface BommelCardEditFormProps {
    name: string;
    emoji: string;
    onNameChange: (name: string) => void;
    onEmojiChange: (emoji: string) => void;
    onSave: () => void;
}

export function validateBommelName(name: string): 'required' | 'maxLength' | null {
    if (!name.trim()) {
        return 'required';
    }
    if (name.trim().length > BOMMEL_NAME_MAX_LENGTH) {
        return 'maxLength';
    }
    return null;
}

export function BommelCardEditForm({ name, emoji, onNameChange, onEmojiChange, onSave }: BommelCardEditFormProps) {
    const { t } = useTranslation();
    const [validationError, setValidationError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const validate = (): boolean => {
        const error = validateBommelName(name);
        if (error === 'required') {
            setValidationError(t('organization.structure.validation.nameRequired'));
            return false;
        }
        if (error === 'maxLength') {
            setValidationError(t('organization.structure.validation.nameMaxLength'));
            return false;
        }
        setValidationError(null);
        return true;
    };

    const handleSave = () => {
        if (validate()) {
            onSave();
        }
    };

    const handleNameChange = (newName: string) => {
        onNameChange(newName);
        if (validationError) {
            const error = validateBommelName(newName);
            if (!error) {
                setValidationError(null);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        }
    };

    const handleBlur = (e: React.FocusEvent) => {
        const related = e.relatedTarget as Node | null;
        // Stay in edit mode when focus moves within the form
        if (containerRef.current && related && containerRef.current.contains(related)) {
            return;
        }
        // Delay save to allow portal-based popovers (e.g. emoji picker) to open first.
        // If focus moved into a popover/portal, the active element will be inside it after the timeout.
        setTimeout(() => {
            if (containerRef.current && containerRef.current.contains(document.activeElement)) {
                return;
            }
            // Check if focus is now inside a Radix popover portal (rendered outside our container)
            const activeEl = document.activeElement;
            if (activeEl && activeEl.closest('[data-radix-popper-content-wrapper]')) {
                return;
            }
            handleSave();
        }, 0);
    };

    return (
        <div ref={containerRef} className="flex flex-col gap-0.5 flex-1 min-w-0" onClick={(e) => e.stopPropagation()} onBlur={handleBlur}>
            <div className="flex items-center gap-1 flex-1 min-w-0">
                <div className="w-8 flex-shrink-0">
                    <EmojiField value={emoji} onChange={onEmojiChange} className="py-0 px-0.5 h-6 text-xs" />
                </div>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    maxLength={BOMMEL_NAME_MAX_LENGTH + 1}
                    className={`flex-1 min-w-0 bg-white text-gray-700 text-xs font-semibold px-1.5 py-0.5 rounded border-2 outline-none ${
                        validationError ? 'border-red-500' : 'border-purple-500'
                    }`}
                    aria-label={t('organization.structure.editName')}
                    aria-invalid={!!validationError}
                    aria-describedby={validationError ? 'bommel-name-error' : undefined}
                    aria-required="true"
                />
            </div>
            {validationError && (
                <div id="bommel-name-error" className="text-red-300 text-[10px] font-medium pl-9" role="alert">
                    {validationError}
                </div>
            )}
        </div>
    );
}

export default BommelCardEditForm;
