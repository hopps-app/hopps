import { BankAccountResponse } from '@hopps/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { LoadingState } from '@/components/common/LoadingState';
import Button from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { BaseInput } from '@/components/ui/shadecn/BaseInput';
import { BaseSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/shadecn/BaseSelect';
import { useBankSchemas, useCreateBankAccount, useUpdateBankAccount } from '@/hooks/queries/useBankAccounts';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'PLN', 'CZK'];

function buildSchema(t: (k: string) => string) {
    return z.object({
        name: z.string().min(1, t('bankAccounts.form.validation.nameRequired')),
        iban: z.string().optional(),
        bic: z.string().optional(),
        bankName: z.string().optional(),
        accountHolder: z.string().optional(),
        currency: z.string().min(1, t('bankAccounts.form.validation.currencyRequired')),
        openingBalance: z.preprocess(
            (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
            z.number().optional()
        ),
        color: z
            .string()
            .optional()
            .refine((v) => !v || /^#[0-9A-Fa-f]{6}$/.test(v), t('bankAccounts.form.validation.colorInvalid')),
        defaultSchemaId: z.preprocess(
            (v) => (v === '' || v === 'none' || v === undefined || v === null ? undefined : Number(v)),
            z.number().optional()
        ),
        description: z.string().optional(),
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

    const { data: schemas = [] } = useBankSchemas(false);
    const createMutation = useCreateBankAccount();
    const updateMutation = useUpdateBankAccount();

    const isLoading = createMutation.isPending || updateMutation.isPending;

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: '',
            iban: '',
            bic: '',
            bankName: '',
            accountHolder: '',
            currency: 'EUR',
            openingBalance: undefined,
            color: '',
            defaultSchemaId: undefined,
            description: '',
        },
    });

    useEffect(() => {
        if (open) {
            if (account) {
                reset({
                    name: account.name ?? '',
                    iban: account.iban ?? '',
                    bic: account.bic ?? '',
                    bankName: account.bankName ?? '',
                    accountHolder: account.accountHolder ?? '',
                    currency: account.currency ?? 'EUR',
                    openingBalance: account.openingBalance ?? undefined,
                    color: account.color ?? '',
                    defaultSchemaId: account.defaultSchemaId ?? undefined,
                    description: account.description ?? '',
                });
            } else {
                reset({
                    name: '',
                    iban: '',
                    bic: '',
                    bankName: '',
                    accountHolder: '',
                    currency: 'EUR',
                    openingBalance: undefined,
                    color: '',
                    defaultSchemaId: undefined,
                    description: '',
                });
            }
        }
    }, [open, account, reset]);

    const onSubmit = async (values: FormValues) => {
        if (isEdit && account?.id) {
            await updateMutation.mutateAsync({ id: account.id, data: values });
        } else {
            await createMutation.mutateAsync({ name: values.name, iban: values.iban ?? '', ...values });
        }
        onSuccess?.();
    };

    const currencyValue = watch('currency');
    const defaultSchemaIdValue = watch('defaultSchemaId');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? t('bankAccounts.form.editTitle') : t('bankAccounts.form.createTitle')}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                    {/* Name */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="ba-name">
                            {t('bankAccounts.form.name')} <span className="text-destructive">*</span>
                        </Label>
                        <BaseInput
                            id="ba-name"
                            {...register('name')}
                            placeholder={t('bankAccounts.form.namePlaceholder')}
                        />
                        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                    </div>

                    {/* IBAN */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="ba-iban">{t('bankAccounts.form.iban')}</Label>
                        <BaseInput id="ba-iban" {...register('iban')} placeholder="DE89 3704 0044 0532 0130 00" />
                    </div>

                    {/* BIC */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="ba-bic">{t('bankAccounts.form.bic')}</Label>
                        <BaseInput id="ba-bic" {...register('bic')} placeholder="COBADEFFXXX" />
                    </div>

                    {/* Bank Name */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="ba-bankName">{t('bankAccounts.form.bankName')}</Label>
                        <BaseInput id="ba-bankName" {...register('bankName')} />
                    </div>

                    {/* Currency */}
                    <div className="grid gap-1.5">
                        <Label>
                            {t('bankAccounts.form.currency')} <span className="text-destructive">*</span>
                        </Label>
                        <BaseSelect
                            value={currencyValue}
                            onValueChange={(v) => setValue('currency', v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t('bankAccounts.form.currencyPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                {CURRENCIES.map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </BaseSelect>
                        {errors.currency && <p className="text-xs text-destructive">{errors.currency.message}</p>}
                    </div>

                    {/* Opening Balance */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="ba-openingBalance">{t('bankAccounts.form.openingBalance')}</Label>
                        <BaseInput
                            id="ba-openingBalance"
                            type="number"
                            step="0.01"
                            {...register('openingBalance')}
                            placeholder="0.00"
                        />
                    </div>

                    {/* Color */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="ba-color">{t('bankAccounts.form.color')}</Label>
                        <div className="flex items-center gap-2">
                            <BaseInput
                                id="ba-color"
                                {...register('color')}
                                placeholder="#3B82F6"
                                className="flex-1"
                            />
                            <input
                                type="color"
                                value={watch('color') || '#3B82F6'}
                                onChange={(e) => setValue('color', e.target.value)}
                                className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                                title={t('bankAccounts.form.colorPicker')}
                            />
                        </div>
                        {errors.color && <p className="text-xs text-destructive">{errors.color.message}</p>}
                    </div>

                    {/* Default Schema */}
                    <div className="grid gap-1.5">
                        <Label>{t('bankAccounts.form.defaultSchema')}</Label>
                        <BaseSelect
                            value={defaultSchemaIdValue !== undefined ? String(defaultSchemaIdValue) : 'none'}
                            onValueChange={(v) => setValue('defaultSchemaId', v === 'none' ? undefined : Number(v))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t('bankAccounts.form.defaultSchemaPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{t('bankAccounts.form.noSchema')}</SelectItem>
                                {schemas.map((s) => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </BaseSelect>
                    </div>

                    {/* Description */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="ba-description">{t('bankAccounts.form.description')}</Label>
                        <BaseInput id="ba-description" {...register('description')} />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <LoadingState size="sm" /> : t('common.save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
