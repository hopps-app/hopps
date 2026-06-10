import { zodResolver } from '@hookform/resolvers/zod';
import { ApiException, BankAccountResponse } from '@hopps/api-client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { LoadingState } from '@/components/common/LoadingState';
import Button from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { BaseInput } from '@/components/ui/shadecn/BaseInput';
import { useCreateBankAccount, useUpdateBankAccount } from '@/hooks/queries/useBankAccounts';
import { cn } from '@/lib/utils';

const ACCT_COLORS = ['#9955CC', '#2E9E6B', '#2A6FDB', '#C8385A', '#B47C18', '#5B5BD6'];

function normalizeIban(iban: string): string {
    return iban.replace(/\s+/g, '').toUpperCase();
}

const IBAN_FORMAT = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

function buildSchema(t: (k: string) => string) {
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
            openingBalance: z.preprocess(
                (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
                z.number().optional()
            ),
            openingBalanceDate: z.string().optional(),
            color: z.string().optional(),
        })
        .superRefine((data, ctx) => {
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
    onSuccess?: () => void;
}

export function BankAccountDrawer({ open, onOpenChange, account, onSuccess }: BankAccountDrawerProps) {
    const { t } = useTranslation();
    const schema = buildSchema(t);
    const isEdit = !!account;

    const createMutation = useCreateBankAccount();
    const updateMutation = useUpdateBankAccount();
    const isLoading = createMutation.isPending || updateMutation.isPending;

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        setError,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { name: '', iban: '', bankName: '', openingBalance: undefined, openingBalanceDate: '', color: ACCT_COLORS[0] },
    });

    useEffect(() => {
        if (open) {
            reset(
                account
                    ? {
                          name: account.name ?? '',
                          iban: account.iban ?? '',
                          bankName: account.bankName ?? '',
                          openingBalance: account.openingBalance ?? undefined,
                          openingBalanceDate: account.openingBalanceDate
                              ? (account.openingBalanceDate instanceof Date
                                    ? account.openingBalanceDate
                                    : new Date(account.openingBalanceDate)
                                ).toISOString().slice(0, 10)
                              : '',
                          color: account.color ?? ACCT_COLORS[0],
                      }
                    : { name: '', iban: '', bankName: '', openingBalance: undefined, openingBalanceDate: '', color: ACCT_COLORS[0] }
            );
        }
    }, [open, account, reset]);

    const onSubmit = async (values: FormValues) => {
        const openingBalanceDate = values.openingBalanceDate ? new Date(values.openingBalanceDate) : undefined;
        const payload = { ...values, currency: 'EUR', openingBalanceDate };
        try {
            if (isEdit && account?.id) {
                await updateMutation.mutateAsync({ id: account.id, data: payload });
            } else {
                await createMutation.mutateAsync(payload);
            }
            onSuccess?.();
        } catch (err) {
            if (ApiException.isApiException(err) && err.status === 409) {
                setError('iban', { message: t('bankAccounts.form.validation.duplicateIban') });
            }
        }
    };

    const selectedColor = watch('color') ?? ACCT_COLORS[0];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
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
                        <BaseInput id="ba-iban" {...register('iban')} placeholder="DE00 0000 0000 0000 0000 00" className="font-mono" />
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
                            {errors.openingBalanceDate && (
                                <p className="text-xs text-destructive">{errors.openingBalanceDate.message}</p>
                            )}
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
            </DialogContent>
        </Dialog>
    );
}
