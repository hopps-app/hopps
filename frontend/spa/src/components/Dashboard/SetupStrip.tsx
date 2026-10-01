import { ArrowRight, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useSetupSteps } from './useSetupSteps';

import { cn } from '@/lib/utils';
import { useSetupStore } from '@/store/setup/setupStore';

/**
 * First-use strip on top of the dashboard: four steps to a working setup, each a card that leads to its page, with the
 * progress shown large. It disappears once all steps are done. After hiding it, the sidebar entry ("Einrichtung")
 * brings it back. The step cards are white on the purple gradient in both themes, so
 * their colours are fixed values rather than theme tokens (like the open-receipts banner).
 */
export function SetupStrip({ organizationId }: { organizationId: number }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const hidden = useSetupStore((s) => !!s.hiddenFor[organizationId]);
    const hide = useSetupStore((s) => s.hide);
    const { steps, doneCount, complete } = useSetupSteps(organizationId);

    if (!steps || complete || hidden) {
        return null;
    }

    return (
        <section
            aria-labelledby="setup-strip-title"
            className="mb-[18px] rounded-[18px] px-[22px] pb-5 pt-[18px] text-white"
            style={{ background: 'var(--banner-gradient)' }}
        >
            <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                    <h2 id="setup-strip-title" className="text-lg font-extrabold">
                        {t('dashboard.setup.title')}
                    </h2>
                    <p className="mt-0.5 text-sm opacity-90">{t('dashboard.setup.subtitle')}</p>
                </div>
                <div className="shrink-0 text-right">
                    <div className="text-[28px] font-extrabold leading-none tabular-nums">
                        {doneCount}
                        <span className="text-lg opacity-75"> / {steps.length}</span>
                    </div>
                    <div className="mt-1 text-xs font-bold uppercase tracking-[0.06em] opacity-85">{t('dashboard.setup.done')}</div>
                </div>
                <button
                    type="button"
                    onClick={() => hide(organizationId)}
                    aria-label={t('dashboard.setup.dismiss')}
                    title={t('dashboard.setup.dismiss')}
                    className="-mr-1.5 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                >
                    <X size={18} />
                </button>
            </div>

            <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={steps.length}
                aria-valuenow={doneCount}
                aria-label={t('dashboard.setup.progress', { done: doneCount, total: steps.length })}
                className="mt-3.5 h-2 overflow-hidden rounded-full bg-white/25"
            >
                <div className="h-full rounded-full bg-white transition-[width] duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {steps.map((step) => {
                    const Icon = step.done ? Check : step.icon;
                    return (
                        <button
                            key={step.key}
                            type="button"
                            onClick={() => navigate(step.path)}
                            className={cn(
                                'group flex min-w-0 items-center gap-3 rounded-[14px] bg-white px-3.5 py-3 text-left shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.18)]',
                                step.done && 'opacity-75'
                            )}
                        >
                            <span
                                className={cn(
                                    'grid h-9 w-9 shrink-0 place-items-center rounded-[11px]',
                                    step.done ? 'bg-[#E7F4EC] text-[#1F7A50]' : 'bg-[#F3EAFB] text-[#7E3FB4]'
                                )}
                            >
                                <Icon size={18} strokeWidth={step.done ? 2.75 : 2} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-[13.5px] font-extrabold leading-tight text-[#7E3FB4]">
                                    {t(`dashboard.setup.steps.${step.key}.title`)}
                                </span>
                                <span className="mt-0.5 block text-xs leading-snug text-[#6B6B76]">
                                    {step.done ? t('dashboard.setup.stepDone') : t(`dashboard.setup.steps.${step.key}.text`)}
                                </span>
                            </span>
                            {!step.done && <ArrowRight size={17} className="shrink-0 text-[#7E3FB4] transition-transform group-hover:translate-x-0.5" />}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
