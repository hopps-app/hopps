import type { BankAccountType } from '@hopps/api-client';
import { Banknote, CreditCard, Landmark, Wallet, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';

/** The kinds of account offered when adding one. Those without a type yet are shown, but cannot be picked. */
const ACCOUNT_KINDS: { key: string; type?: BankAccountType; icon: LucideIcon }[] = [
    { key: 'bank', type: 'BANK', icon: Landmark },
    { key: 'pleo', type: 'PLEO', icon: CreditCard },
    { key: 'cash', icon: Banknote },
    { key: 'paypal', icon: Wallet },
];

/** Icon of an account type, as the type picker shows it. */
export function AccountTypeIcon({ type, className, strokeWidth }: { type?: BankAccountType; className?: string; strokeWidth?: number }) {
    return type === 'PLEO' ? <CreditCard className={className} strokeWidth={strokeWidth} /> : <Landmark className={className} strokeWidth={strokeWidth} />;
}

interface AccountTypeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Called with the picked type; the caller then opens the form for it. */
    onSelect: (type: BankAccountType) => void;
}

/** First step of adding an account: what kind of account it is, which decides the form and how it is imported. */
export function AccountTypeDialog({ open, onOpenChange, onSelect }: AccountTypeDialogProps) {
    const { t } = useTranslation();
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('konten.addAccount')}</DialogTitle>
                    <DialogDescription>{t('konten.accountType.subtitle')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 pt-1">
                    {ACCOUNT_KINDS.map(({ key, type, icon: Icon }) => {
                        const available = type !== undefined;
                        return (
                            <button
                                key={key}
                                type="button"
                                disabled={!available}
                                onClick={() => type && onSelect(type)}
                                className={cn(
                                    'flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left transition-colors dark:border-gray-700',
                                    available ? 'hover:border-primary/60 hover:bg-primary/5' : 'cursor-not-allowed opacity-50'
                                )}
                            >
                                <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-[var(--surface-track)] text-primary">
                                    <Icon className="h-5 w-5" />
                                </span>
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="text-sm font-semibold">{t(`konten.accountType.${key}.title`)}</span>
                                    <span className="text-xs text-muted-foreground">{t(`konten.accountType.${key}.text`)}</span>
                                </span>
                                {!available && (
                                    <span className="flex-shrink-0 rounded-full bg-[var(--surface-track)] px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                        {t('konten.accountType.soon')}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
}
