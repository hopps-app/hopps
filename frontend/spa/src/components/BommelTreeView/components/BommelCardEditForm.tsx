import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import EmojiField from '@/components/ui/EmojiField';

const BOMMEL_NAME_MAX_LENGTH = 255;

interface BommelCardEditFormProps {
    name: string;
    emoji: string;
    onNameChange: (name: string) => void;
    onEmojiChange: (emoji: string) => void;
    onSave: () => void;
    onCancel: () => void;
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

export function BommelCardEditForm({ name, emoji, onNameChange, onEmojiChange, onSave, onCancel }: BommelCardEditFormProps) {
    const { t } = useTranslation();
    const [validationError, setValidationError] = useState<string | null>(null);

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
        // Clear validation error when user starts typing valid input
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
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <div className="flex flex-col gap-0.5 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
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
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleSave();
                    }}
                    className="bg-emerald-500 text-white border-none rounded p-0.5 cursor-pointer flex items-center hover:bg-emerald-600 transition-colors flex-shrink-0"
                    title={t('organization.structure.saveName')}
                    aria-label={t('organization.structure.saveName')}
                >
                    <Check className="w-3 h-3" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onCancel();
                    }}
                    className="bg-red-500 text-white border-none rounded p-0.5 cursor-pointer flex items-center hover:bg-red-600 transition-colors flex-shrink-0"
                    title={t('organization.structure.cancelEdit')}
                    aria-label={t('organization.structure.cancelEdit')}
                >
                    <X className="w-3 h-3" aria-hidden="true" />
                </button>
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
