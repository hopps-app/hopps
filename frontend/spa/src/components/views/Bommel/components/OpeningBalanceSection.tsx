import { BommelOpeningBalanceInput } from '@hopps/api-client';
import { Landmark } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/Transactions/Eyebrow';
import { fmtDate } from '@/components/Transactions/format';
import Button from '@/components/ui/Button';
import { BaseInput } from '@/components/ui/shadecn/BaseInput';
import { useCurrency } from '@/hooks/use-currency';
import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/ApiService';

interface OpeningBalanceSectionProps {
    bommelId: number;
    /** Current opening balance of the bommel and its date (yyyy-MM-dd), if set */
    openingBalance?: number;
    openingBalanceDate?: string;
    /** Called after a save or removal, so the page can reload the amounts */
    onSaved: () => void;
}

/** "1.250,50" or "-80" as typed in German or English; null when it is not a number */
function parseAmount(text: string): number | null {
    const trimmed = text.trim().replace(/\s/g, '');
    if (!trimmed) return null;
    // A comma as the last separator is the decimal one ("1.250,50"); otherwise the dot is ("1,250.50")
    const normalized = trimmed.lastIndexOf(',') > trimmed.lastIndexOf('.') ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed.replace(/,/g, '');
    const value = Number(normalized);
    return Number.isFinite(value) ? value : null;
}

/** A yyyy-MM-dd date as a local Date, which the API client turns back into the same yyyy-MM-dd */
function toLocalDate(iso: string): Date {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day);
}

/**
 * The opening balance of a bommel: like that of a bank account, a value on a reference date, to which every
 * transaction after that date is added. Optional; shown as a sentence, edited in place.
 */
export function OpeningBalanceSection({ bommelId, openingBalance, openingBalanceDate, onSaved }: OpeningBalanceSectionProps) {
    const { t, i18n } = useTranslation();
    const { format } = useCurrency();
    const { showError, showSuccess } = useToast();
    const hasBalance = openingBalance != null && !!openingBalanceDate;

    const [editing, setEditing] = useState(false);
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [invalid, setInvalid] = useState(false);

    // Another bommel selected: leave the form
    useEffect(() => setEditing(false), [bommelId]);

    const startEditing = () => {
        setAmount(hasBalance ? openingBalance.toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
        setDate(openingBalanceDate ?? `${new Date().getFullYear() - 1}-12-31`);
        setInvalid(false);
        setEditing(true);
    };

    const save = async (value: number | null, day: string | null) => {
        setSaving(true);
        try {
            await apiService.orgService.openingBalance(
                bommelId,
                new BommelOpeningBalanceInput({ openingBalance: value ?? undefined, openingBalanceDate: day ? toLocalDate(day) : undefined })
            );
            showSuccess(t(value == null ? 'bommel.openingBalance.removed' : 'bommel.openingBalance.saved'));
            setEditing(false);
            onSaved();
        } catch {
            showError(t('bommel.openingBalance.error'));
        } finally {
            setSaving(false);
        }
    };

    const handleSave = () => {
        const value = parseAmount(amount);
        if (value == null || !date) {
            setInvalid(true);
            return;
        }
        save(value, date);
    };

    return (
        <section className="mb-[18px]">
            <Eyebrow icon={<Landmark size={14} />} className="mb-[9px]">
                {t('bommel.openingBalance.title')}
            </Eyebrow>

            {!editing ? (
                <div className="flex items-center gap-3 rounded-[14px] bg-[var(--surface-sunken)] px-[13px] py-2.5">
                    <p className="min-w-0 flex-1 text-[12.5px] font-semibold text-muted-foreground">
                        {hasBalance ? (
                            <>
                                <span className="font-extrabold tabular-nums text-foreground">{format(openingBalance)}</span>{' '}
                                {t('bommel.openingBalance.onDate', { date: fmtDate(openingBalanceDate) })}
                            </>
                        ) : (
                            t('bommel.openingBalance.none')
                        )}
                    </p>
                    <button type="button" onClick={startEditing} className="shrink-0 text-[12.5px] font-bold text-purple-700 hover:underline">
                        {t(hasBalance ? 'bommel.openingBalance.change' : 'bommel.openingBalance.set')}
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-2.5 rounded-[14px] border border-[var(--border-soft)] p-3">
                    <p className="text-[12px] leading-snug text-muted-foreground">{t('bommel.openingBalance.hint')}</p>
                    <div className="grid grid-cols-2 gap-2">
                        <label className="flex flex-col gap-1 text-[12px] font-bold text-foreground">
                            {t('bommel.openingBalance.amount')}
                            <BaseInput
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    setInvalid(false);
                                }}
                                placeholder="0,00"
                                className="h-9"
                                aria-invalid={invalid && parseAmount(amount) == null}
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-[12px] font-bold text-foreground">
                            {t('bommel.openingBalance.date')}
                            <BaseInput
                                type="date"
                                value={date}
                                onChange={(e) => {
                                    setDate(e.target.value);
                                    setInvalid(false);
                                }}
                                className="h-9"
                                aria-invalid={invalid && !date}
                            />
                        </label>
                    </div>
                    {invalid && <p className="text-[12px] font-semibold text-[var(--negative)]">{t('bommel.openingBalance.invalid')}</p>}
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        {hasBalance && (
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => save(null, null)}
                                className="mr-auto text-[12.5px] font-bold text-[var(--negative)] hover:underline disabled:opacity-50"
                            >
                                {t('bommel.openingBalance.remove')}
                            </button>
                        )}
                        <Button variant="outline" size="sm" className="h-8" disabled={saving} onClick={() => setEditing(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button size="sm" className="h-8" disabled={saving} onClick={handleSave}>
                            {t('common.save')}
                        </Button>
                    </div>
                </div>
            )}
        </section>
    );
}

export default OpeningBalanceSection;
