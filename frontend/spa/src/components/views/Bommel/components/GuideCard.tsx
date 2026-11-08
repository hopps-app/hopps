import { Check, CirclePlus, Move, Network, Plus, Sigma, Trash2, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export const GUIDE_STEPS = ['example', 'add', 'delete', 'move', 'sums', 'own'] as const;
export type GuideStep = (typeof GUIDE_STEPS)[number];

const ICONS: Record<GuideStep, LucideIcon> = { example: Network, add: CirclePlus, delete: Trash2, move: Move, sums: Sigma, own: Plus };

interface GuideCardProps {
    step: GuideStep;
    /** Edit mode is on (last step: first item done). */
    isEditMode: boolean;
    /** The structure has a first bommel below the root (last step: second item done). */
    hasFirstBommel: boolean;
    onStep: (step: GuideStep) => void;
    onStartEditing: () => void;
    /** Leave the guide for good: skipped or finished. */
    onClose: () => void;
}

/**
 * Short walk through the Bommel page, one "Weiter" at a time: the example, adding, deleting, moving, how the amounts add up, then the own
 * structure. The first steps run on the example data; the last one on the real structure. The card stays until the
 * user finishes or skips it, also after the first bommel was created.
 */
export function GuideCard({ step, isEditMode, hasFirstBommel, onStep, onStartEditing, onClose }: GuideCardProps) {
    const { t } = useTranslation();
    const index = GUIDE_STEPS.indexOf(step);
    const Icon = ICONS[step];
    const isLast = index === GUIDE_STEPS.length - 1;

    const checklist = [
        { label: t('bommel.guide.own.step1'), done: isEditMode || hasFirstBommel },
        { label: t('bommel.guide.own.step2'), done: hasFirstBommel },
    ];

    return (
        <section
            aria-label={t('bommel.guide.label')}
            className="flex flex-wrap items-start gap-x-4 gap-y-3 rounded-[var(--r-card)] border border-[var(--border-soft)] bg-[var(--background-secondary)] px-[22px] py-[18px]"
        >
            <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[13px] bg-[var(--accent-surface)] text-purple-700">
                <Icon size={20} aria-hidden="true" />
            </span>
            <div className="min-w-[240px] flex-1">
                <div className="text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-muted-foreground">
                    {t('bommel.guide.progress', { current: index + 1, total: GUIDE_STEPS.length })}
                </div>
                <div className="mt-0.5 text-[15.5px] font-extrabold text-foreground">{t(`bommel.guide.${step}.title`)}</div>
                <p className="mt-0.5 text-[13.5px] font-semibold text-muted-foreground">{t(`bommel.guide.${step}.text`)}</p>
                {isLast && (
                    <ul className="mt-3 flex flex-col gap-2">
                        {checklist.map((item) => (
                            <li key={item.label} className="flex items-start gap-2.5 text-[13.5px] font-semibold text-foreground">
                                <span
                                    className={cn(
                                        'mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full',
                                        item.done ? 'bg-[var(--positive)] text-white' : 'bg-[var(--accent-surface)] text-purple-700'
                                    )}
                                    aria-hidden="true"
                                >
                                    {item.done ? <Check size={12} strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                                </span>
                                <span className={cn(item.done && 'text-muted-foreground line-through')}>{item.label}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 self-center">
                {!(isLast && hasFirstBommel) && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-2 py-1 text-[13px] font-bold text-muted-foreground transition-colors hover:text-foreground"
                    >
                        {t('bommel.guide.skip')}
                    </button>
                )}
                {index > 0 && !(isLast && hasFirstBommel) && (
                    <Button variant="outline" onClick={() => onStep(GUIDE_STEPS[index - 1])}>
                        {t('bommel.guide.back')}
                    </Button>
                )}
                {!isLast && (
                    <Button variant="default" onClick={() => onStep(GUIDE_STEPS[index + 1])}>
                        {t('bommel.guide.next')}
                    </Button>
                )}
                {isLast && !isEditMode && !hasFirstBommel && (
                    <Button variant="default" onClick={onStartEditing}>
                        {t('bommel.guide.own.start')}
                    </Button>
                )}
                {isLast && hasFirstBommel && (
                    <Button variant="default" onClick={onClose}>
                        {t('bommel.guide.finish')}
                    </Button>
                )}
            </div>
        </section>
    );
}

export default GuideCard;
