import { zodResolver } from '@hookform/resolvers/zod';
import { ApiException, BankAccountResponse } from '@hopps/api-client';
import { Archive, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Resolver, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { LoadingState } from '@/components/common/LoadingState';
import Button from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { BaseInput } from '@/components/ui/shadecn/BaseInput';
import { useArchiveBankAccount, useCreateBankAccount, useDeleteBankAccount, useUpdateBankAccount } from '@/hooks/queries/useBankAccounts';
import { useCurrency } from '@/hooks/use-currency';
import { currencyForIban, type CurrencyCode } from '@/lib/currency';
import { caretAfterChars, formatIban, normalizeIban } from '@/lib/iban';
import { cn } from '@/lib/utils';

const ACCT_COLORS = ['#9955CC', '#2E9E6B', '#2A6FDB', '#C8385A', '#B47C18', '#5B5BD6'];

const IBAN_FORMAT = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

/**
 * @param organizationCurrency accounts are kept in it (no conversion yet), so the IBAN has to fit it: CH/LI means CHF,
 *            everything else EUR.
 * @param storedIban the IBAN the account is saved with. The rule only applies to a new or changed IBAN (like in the
 *            backend), so an account created before the rule can still be edited.
 */
function buildSchema(t: (k: string, o?: Record<string, unknown>) => string, organizationCurrency: CurrencyCode, storedIban?: string) {
    return z
        .object({
            name: z.string().min(1, t('bankAccounts.form.validation.nameRequired')),
            iban: z
                .string()
                .min(1, t('bankAccounts.form.validation.ibanRequired'))
                .transform(normalizeIban)
                .refine((v) => v.length >= 15, t('bankAccounts.form.validation.ibanTooShort'))
                .refine((v) => v.length <= 34, t('bankAccounts.form.validation.ibanTooLong'))
                .refine((v) => IBAN_FORMAT.test(v), t('bankAccounts.form.validation.ibanInvalidFormat')),
            bankName: z.string().optional(),
            openingBalance: z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)), z.number().optional()),
            openingBalanceDate: z.string().optional(),
            color: z.string().optional(),
        })
        .superRefine((data, ctx) => {
            const ibanCurrency = currencyForIban(data.iban);
            const unchanged = storedIban !== undefined && normalizeIban(storedIban) === data.iban;
            if (ibanCurrency !== organizationCurrency && !unchanged) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t('bankAccounts.form.validation.ibanOtherCurrency', {
                        country: data.iban.slice(0, 2),
                        ibanCurrency,
                        organizationCurrency,
                    }),
                    path: ['iban'],
                });
            }
            const hasBalance = data.openingBalance !== undefined;
            const hasDate = !!data.openingBalanceDate;
            if (hasBalance && !hasDate) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t('bankAccounts.form.validation.openingBalanceDateRequired'),
                    path: ['openingBalanceDate'],
                });
            }
            if (hasDate && !hasBalance) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t('bankAccounts.form.validation.openingBalanceRequired'),
                    path: ['openingBalance'],
                });
            }
        });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

interface BankAccountDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    account?: BankAccountResponse;
    /** Called after saving, with the saved account (e.g. to select a newly created one). */
    onSuccess?: (account: BankAccountResponse) => void;
    /** Called after the account was deleted or archived. */
    onRemoved?: (accountId: number) => void;
}

export function BankAccountDrawer({ open, onOpenChange, account, onSuccess, onRemoved }: BankAccountDrawerProps) {
    // Accounts are kept in the organization's currency; the backend sets it, the form only checks that the IBAN fits.
    const { currency: organizationCurrency } = useCurrency();
    const { t } = useTranslation();
    const schema = buildSchema(t, organizationCurrency, account?.iban);
    const isEdit = !!account;

    const createMutation = useCreateBankAccount();
    const updateMutation = useUpdateBankAccount();
    const isLoading = createMutation.isPending || updateMutation.isPending;
    const deleteMutation = useDeleteBankAccount();
    const archiveMutation = useArchiveBankAccount();
    // Waiting for the confirmation. An unused account can be deleted for good; one with data can only be archived.
    const [confirmRemove, setConfirmRemove] = useState(false);
    const deletable = account?.deletable === true;
    const removeMutation = deletable ? deleteMutation : archiveMutation;
    const removeLabel = t(deletable ? 'konten.accountActions.delete' : 'konten.accountActions.archive');

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        setError,
        formState: { errors },
    } = useForm<FormValues>({
        // zod's preprocess makes the schema's input type differ from FormValues (its output); cast the resolver to the
        // output type so useForm, handleSubmit and the field helpers all operate on the resolved FormValues.
        resolver: zodResolver(schema) as Resolver<FormValues>,
        defaultValues: {
            name: '',
            iban: '',
            bankName: '',
            openingBalance: undefined,
            openingBalanceDate: '',
            color: ACCT_COLORS[0],
        },
    });

    useEffect(() => {
        if (open) {
            reset(
                account
                    ? {
                          name: account.name ?? '',
                          iban: formatIban(account.iban ?? ''),
                          bankName: account.bankName ?? '',
                          openingBalance: account.openingBalance ?? undefined,
                          openingBalanceDate: account.openingBalanceDate
                              ? (account.openingBalanceDate instanceof Date ? account.openingBalanceDate : new Date(account.openingBalanceDate))
                                    .toISOString()
                                    .slice(0, 10)
                              : '',
                          color: account.color ?? ACCT_COLORS[0],
                      }
                    : {
                          name: '',
                          iban: '',
                          bankName: '',
                          openingBalance: undefined,
                          openingBalanceDate: '',
                          color: ACCT_COLORS[0],
                      }
            );
        }
    }, [open, account, reset]);

    const onSubmit = async (values: FormValues) => {
        const openingBalanceDate = values.openingBalanceDate ? new Date(values.openingBalanceDate) : undefined;
        const payload = { ...values, openingBalanceDate };
        try {
            const saved =
                isEdit && account?.id ? await updateMutation.mutateAsync({ id: account.id, data: payload }) : await createMutation.mutateAsync(payload);
            onSuccess?.(saved);
        } catch (err) {
            if (ApiException.isApiException(err) && err.status === 409) {
                setError('iban', { message: t('bankAccounts.form.validation.duplicateIban') });
            }
        }
    };

    const remove = async () => {
        if (account?.id == null) return;
        try {
            await removeMutation.mutateAsync(account.id);
            setConfirmRemove(false);
            onRemoved?.(account.id);
        } catch {
            // The mutation shows the error; the dialog stays open.
        }
    };

    const selectedColor = watch('color') ?? ACCT_COLORS[0];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                {/* Next to the dialog's close button, away from "Speichern": a rare action that should not compete with it. */}
                {isEdit && (
                    <button
                        type="button"
                        onClick={() => setConfirmRemove(true)}
                        disabled={isLoading}
                        title={removeLabel}
                        aria-label={removeLabel}
                        className="absolute right-[3.25rem] top-3 grid h-10 w-10 place-items-center rounded-[var(--btn-radius)] opacity-70 transition-opacity hover:bg-[var(--surface-track)] hover:opacity-100 disabled:opacity-50"
                    >
                        {deletable ? <Trash2 size={18} className="text-[var(--negative)]" /> : <Archive size={18} />}
                    </button>
                )}

                <DialogHeader>
                    <DialogTitle>{isEdit ? t('bankAccounts.form.editTitle') : t('bankAccounts.form.createTitle')}</DialogTitle>
                    <p className="text-sm text-muted-foreground">{t('konten.form.subtitle')}</p>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-1">
                    {/* Name */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="ba-name">{t('bankAccounts.form.name')}</Label>
                        <BaseInput id="ba-name" {...register('name')} placeholder={t('bankAccounts.form.namePlaceholder')} autoFocus />
                        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                    </div>

                    {/* IBAN */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="ba-iban">{t('bankAccounts.form.iban')}</Label>
                        <BaseInput
                            id="ba-iban"
                            {...register('iban', {
                                // Group in fours while typing or pasting ("CH93 0076 2011 …"); the schema strips the
                                // spaces again before saving. The caret stays behind the character just typed.
                                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                                    const input = e.target;
                                    const charsBeforeCaret = normalizeIban(input.value.slice(0, input.selectionStart ?? input.value.length)).length;
                                    const formatted = formatIban(input.value);
                                    if (formatted !== input.value) {
                                        setValue('iban', formatted);
                                        const caret = caretAfterChars(formatted, charsBeforeCaret);
                                        input.setSelectionRange(caret, caret);
                                    }
                                },
                            })}
                            placeholder="DE00 0000 0000 0000 0000 00"
                            className="font-mono"
                        />
                        {errors.iban && <p className="text-xs text-destructive">{errors.iban.message}</p>}
                    </div>

                    {/* Bank */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="ba-bankName">{t('bankAccounts.form.bankName')}</Label>
                        <BaseInput id="ba-bankName" {...register('bankName')} placeholder={t('konten.form.bankPlaceholder')} />
                    </div>

                    {/* Opening Balance + Date side by side */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="ba-openingBalance">{t('bankAccounts.form.openingBalance')}</Label>
                            <BaseInput
                                id="ba-openingBalance"
                                type="number"
                                step="0.01"
                                {...register('openingBalance')}
                                placeholder="0,00"
                                className="font-mono"
                            />
                            {errors.openingBalance && <p className="text-xs text-destructive">{errors.openingBalance.message}</p>}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="ba-openingBalanceDate">{t('bankAccounts.form.openingBalanceDate')}</Label>
                            <BaseInput id="ba-openingBalanceDate" type="date" {...register('openingBalanceDate')} />
                            {errors.openingBalanceDate && <p className="text-xs text-destructive">{errors.openingBalanceDate.message}</p>}
                        </div>
                    </div>

                    {/* Color swatches */}
                    <div className="grid gap-1.5">
                        <Label>{t('bankAccounts.form.color')}</Label>
                        <div className="flex gap-2.5">
                            {ACCT_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setValue('color', c)}
                                    className={cn(
                                        'w-9 h-9 rounded-xl transition-all',
                                        selectedColor === c ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110' : 'opacity-80 hover:opacity-100'
                                    )}
                                    style={{ background: c }}
                                />
                            ))}
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <LoadingState size="sm" /> : isEdit ? t('common.save') : t('konten.form.create')}
                        </Button>
                    </DialogFooter>
                </form>

                <ConfirmDialog
                    open={confirmRemove}
                    onOpenChange={setConfirmRemove}
                    title={t(deletable ? 'konten.accountActions.deleteTitle' : 'konten.accountActions.archiveTitle')}
                    description={t(deletable ? 'konten.accountActions.deleteText' : 'konten.accountActions.archiveText')}
                    confirmLabel={removeLabel}
                    onConfirm={remove}
                    destructive={deletable}
                    loading={removeMutation.isPending}
                />
            </DialogContent>
        </Dialog>
    );
}
