import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BommelCardActionsProps {
    onEdit: () => void;
    onDelete: () => void;
    onAddChild: () => void;
}

export function BommelCardActions({ onEdit, onDelete, onAddChild }: BommelCardActionsProps) {
    const { t } = useTranslation();

    return (
        <div className="flex gap-1 flex-shrink-0">
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onAddChild();
                }}
                className="bg-green-500/80 text-white border-none rounded p-1 cursor-pointer flex items-center hover:bg-green-600 transition-colors"
                title={t('organization.structure.addChild')}
                aria-label={t('organization.structure.addChild')}
            >
                <Plus className="w-3 h-3" aria-hidden="true" />
            </button>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                }}
                className="bg-white/20 text-white border-none rounded p-1 cursor-pointer flex items-center hover:bg-white/30 transition-colors"
                title={t('organization.structure.editName')}
                aria-label={t('organization.structure.editName')}
            >
                <Pencil className="w-3 h-3" aria-hidden="true" />
            </button>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                className="bg-red-500/80 text-white border-none rounded p-1 cursor-pointer flex items-center hover:bg-red-600 transition-colors"
                title={t('organization.structure.deleteBommel')}
                aria-label={t('organization.structure.deleteBommel')}
            >
                <Trash2 className="w-3 h-3" aria-hidden="true" />
            </button>
        </div>
    );
}

export default BommelCardActions;
