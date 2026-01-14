import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import EmojiField from '@/components/ui/EmojiField';

interface BommelCardEditFormProps {
    name: string;
    emoji: string;
    onNameChange: (name: string) => void;
    onEmojiChange: (emoji: string) => void;
    onSave: () => void;
    onCancel: () => void;
}

export function BommelCardEditForm({ name, emoji, onNameChange, onEmojiChange, onSave, onCancel }: BommelCardEditFormProps) {
    const { t } = useTranslation();

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onSave();
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 flex-shrink-0">
                <EmojiField value={emoji} onChange={onEmojiChange} className="py-0 px-1 h-8 text-sm" />
            </div>
            <input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="flex-1 bg-white text-gray-700 text-sm font-semibold px-2 py-1 rounded border-2 border-purple-500 outline-none"
                aria-label={t('organization.structure.editName')}
            />
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onSave();
                }}
                className="bg-emerald-500 text-white border-none rounded p-1 cursor-pointer flex items-center hover:bg-emerald-600 transition-colors"
                title={t('organization.structure.saveName')}
                aria-label={t('organization.structure.saveName')}
            >
                <Check className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onCancel();
                }}
                className="bg-red-500 text-white border-none rounded p-1 cursor-pointer flex items-center hover:bg-red-600 transition-colors"
                title={t('organization.structure.cancelEdit')}
                aria-label={t('organization.structure.cancelEdit')}
            >
                <X className="w-4 h-4" aria-hidden="true" />
            </button>
        </div>
    );
}

export default BommelCardEditForm;
