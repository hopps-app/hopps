import { Check, Network } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface GettingStartedCardProps {
    /** Edit mode is on: the first step is done and the button is not needed. */
    isEditMode: boolean;
    onStartEditing: () => void;
}

/**
 * Shown while the structure only has its root bommel: says what a bommel is and walks through the first steps, with one
 * button that switches to edit mode. It goes away by itself once a first bommel exists.
 */
export function GettingStartedCard({ isEditMode, onStartEditing }: GettingStartedCardProps) {
    const { t } = useTranslation();
    const steps = [t('bommel.gettingStarted.step1'), t('bommel.gettingStarted.step2'), t('bommel.gettingStarted.step3')];

    return (
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3 rounded-[var(--r-card)] border border-[var(--accent-surface-strong)] bg-[var(--accent-surface)] px-[22px] py-[18px]">
            <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[13px] bg-[var(--background-secondary)] text-purple-700">
                <Network size={20} aria-hidden="true" />
            </span>
            <div className="min-w-[240px] flex-1">
                <div className="text-[15.5px] font-extrabold text-foreground">{t('bommel.gettingStarted.title')}</div>
                <p className="mt-0.5 text-[13.5px] font-semibold text-muted-foreground">{t('bommel.gettingStarted.text')}</p>
                <ol className="mt-3 flex flex-col gap-2">
                    {steps.map((step, index) => {
                        const done = index === 0 && isEditMode;
                        return (
                            <li key={step} className="flex items-start gap-2.5 text-[13.5px] font-semibold text-foreground">
                                <span
                                    className={cn(
                                        'mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11.5px] font-extrabold',
                                        done ? 'bg-[var(--positive)] text-white' : 'bg-[var(--background-secondary)] text-purple-700'
                                    )}
                                    aria-hidden="true"
                                >
                                    {done ? <Check size={12} strokeWidth={3} /> : index + 1}
                                </span>
                                <span className={cn(done && 'text-muted-foreground line-through')}>{step}</span>
                            </li>
                        );
                    })}
                </ol>
            </div>
            {!isEditMode && (
                <Button variant="default" onClick={onStartEditing}>
                    {t('bommel.gettingStarted.start')}
                </Button>
            )}
        </div>
    );
}

export default GettingStartedCard;
