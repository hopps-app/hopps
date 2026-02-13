import { ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BommelCardActionsProps {
    onEdit: () => void;
    onDelete: () => void;
    onAddChild: () => void;
    onMove?: () => void;
    isRoot?: boolean;
}

export function BommelCardActions({ onEdit, onDelete, onAddChild, onMove, isRoot }: BommelCardActionsProps) {
    const { t } = useTranslation();

    return (
        <div className="flex gap-1 justify-center">
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
            {onMove && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onMove();
                    }}
                    className="bg-blue-500/80 text-white border-none rounded p-1 cursor-pointer flex items-center hover:bg-blue-600 transition-colors"
                    title={t('organization.structure.moveBommel')}
                    aria-label={t('organization.structure.moveBommel')}
                >
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </button>
            )}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                }}
                className={`border-none rounded p-1 cursor-pointer flex items-center transition-colors ${isRoot ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'}`}
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
