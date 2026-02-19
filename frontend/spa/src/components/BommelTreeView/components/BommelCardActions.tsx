import { ArrowRight, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BommelCardActionsProps {
    onAddChild: () => void;
    onMove?: () => void;
}

export function BommelCardActions({ onAddChild, onMove }: BommelCardActionsProps) {
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
        </div>
    );
}

export default BommelCardActions;
