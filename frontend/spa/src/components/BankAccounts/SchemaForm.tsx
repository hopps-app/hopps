import { AmountStrategy, BankCsvSchemaResponse, BankCsvSchemaTemplateResponse, BankFieldType } from '@hopps/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Resolver, useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { LoadingState } from '@/components/common/LoadingState';
import Button from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { BaseInput } from '@/components/ui/shadecn/BaseInput';
import { BaseSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/shadecn/BaseSelect';
import { useBankSchemaTemplates, useCreateBankSchema, useUpdateBankSchema } from '@/hooks/queries/useBankAccounts';

const AMOUNT_STRATEGIES: AmountStrategy[] = [
    'SIGNED_SINGLE_COLUMN',
    'DEBIT_CREDIT_COLUMNS',
    'AMOUNT_PLUS_TYPE_COLUMN',
];

const BANK_FIELD_TYPES: BankFieldType[] = [
    'BOOKING_DATE',
    'VALUE_DATE',
    'AMOUNT',
    'DEBIT_AMOUNT',
    'CREDIT_AMOUNT',
    'AMOUNT_TYPE_INDICATOR',
    'CURRENCY',
    'PURPOSE',
    'COUNTERPARTY_NAME',
    'COUNTERPARTY_IBAN',
    'COUNTERPARTY_BIC',
    'TRANSACTION_TYPE',
    'BANK_REFERENCE',
    'BALANCE_AFTER',
    'END_TO_END_REFERENCE',
    'MANDATE_REFERENCE',
    'CREDITOR_ID',
];

const ENCODINGS = ['UTF-8', 'ISO-8859-1', 'UTF-16', 'Windows-1252'];

function buildSchema(t: (k: string) => string) {
    return z.object({
        name: z.string().min(1, t('bankSchema.form.validation.nameRequired')),
        bankIdentifier: z.string().optional(),
        delimiter: z.string().optional(),
        quoteChar: z.string().optional(),
        encoding: z.string().optional(),
        skipLines: z.preprocess(
            (v) => (v === '' || v === undefined ? 0 : Number(v)),
            z.number().int().min(0)
        ),
        hasHeader: z.boolean(),
        dateFormat: z.string().optional(),
        decimalSeparator: z.string().optional(),
        thousandSeparator: z.string().optional(),
        amountStrategy: z.enum(['SIGNED_SINGLE_COLUMN', 'DEBIT_CREDIT_COLUMNS', 'AMOUNT_PLUS_TYPE_COLUMN']),
        amountTypePositiveValues: z.string().optional(), // comma separated
        columnMappings: z.array(
            z.object({
                targetField: z.string().min(1),
                sourceColumnIndex: z.preprocess(
                    (v) => (v === '' || v === undefined ? undefined : Number(v)),
                    z.number().int().min(0).optional()
                ),
                sourceColumnName: z.string().optional(),
                transform: z.string().optional(),
            })
        ),
    });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

function schemaResponseToForm(s: BankCsvSchemaResponse | BankCsvSchemaTemplateResponse): Partial<FormValues> {
    // BankCsvSchemaResponse has bankIdentifier; BankCsvSchemaTemplateResponse has bankName
    const bankId = (s as BankCsvSchemaResponse).bankIdentifier ?? (s as BankCsvSchemaTemplateResponse).bankName ?? '';
    return {
        name: s.name ?? '',
        bankIdentifier: bankId,
        delimiter: s.delimiter ?? ',',
        quoteChar: s.quoteChar ?? '"',
        encoding: s.encoding ?? 'UTF-8',
        skipLines: s.skipLines ?? 0,
        hasHeader: s.hasHeader ?? true,
        dateFormat: s.dateFormat ?? '',
        decimalSeparator: s.decimalSeparator ?? '.',
        thousandSeparator: s.thousandSeparator ?? '',
        amountStrategy: (s.amountStrategy as AmountStrategy) ?? 'SIGNED_SINGLE_COLUMN',
        amountTypePositiveValues: s.amountTypePositiveValues?.join(',') ?? '',
        columnMappings: s.columnMappings?.map((m) => ({
            targetField: m.targetField ?? '',
            sourceColumnIndex: m.sourceColumnIndex,
            sourceColumnName: m.sourceColumnName ?? '',
            transform: m.transform ?? '',
        })) ?? [],
    };
}

interface SchemaFormProps {
    schema?: BankCsvSchemaResponse;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function SchemaForm({ schema, onSuccess, onCancel }: SchemaFormProps) {
    const { t } = useTranslation();
    const zodSchema = buildSchema(t);
    const isEdit = !!schema;
    const { data: templates = [] } = useBankSchemaTemplates();
    const [selectedTemplate, setSelectedTemplate] = useState('');

    const createMutation = useCreateBankSchema();
    const updateMutation = useUpdateBankSchema();
    const isLoading = createMutation.isPending || updateMutation.isPending;

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        control,
        formState: { errors },
    } = useForm<FormValues>({
        // zod's preprocess makes the schema's input type differ from FormValues (its output); cast the resolver to the
        // output type so useForm, handleSubmit and the field helpers all operate on the resolved FormValues.
        resolver: zodResolver(zodSchema) as Resolver<FormValues>,
        defaultValues: {
            name: '',
            delimiter: ',',
            quoteChar: '"',
            encoding: 'UTF-8',
            skipLines: 0,
            hasHeader: true,
            dateFormat: 'dd.MM.yyyy',
            decimalSeparator: ',',
            thousandSeparator: '.',
            amountStrategy: 'SIGNED_SINGLE_COLUMN',
            amountTypePositiveValues: '',
            columnMappings: [],
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'columnMappings' });

    useEffect(() => {
        if (schema) {
            reset(schemaResponseToForm(schema) as FormValues);
        }
    }, [schema, reset]);

    const handleTemplateSelect = (templateId: string) => {
        setSelectedTemplate(templateId);
        const tmpl = templates.find((t) => t.templateId === templateId);
        if (tmpl) {
            reset({ ...schemaResponseToForm(tmpl), name: '' } as FormValues);
        }
    };

    const amountStrategyValue = watch('amountStrategy');
    const encodingValue = watch('encoding');

    const onSubmit = async (values: FormValues) => {
        const payload = {
            ...values,
            amountTypePositiveValues: values.amountTypePositiveValues
                ? values.amountTypePositiveValues.split(',').map((v) => v.trim()).filter(Boolean)
                : [],
            columnMappings: values.columnMappings.map((m) => ({
                targetField: m.targetField as BankFieldType,
                sourceColumnIndex: m.sourceColumnIndex,
                sourceColumnName: m.sourceColumnName || undefined,
                transform: m.transform || undefined,
            })),
        };

        if (isEdit && schema?.id) {
            await updateMutation.mutateAsync({ id: schema.id, data: payload });
        } else {
            await createMutation.mutateAsync({
                data: { ...payload, amountStrategy: payload.amountStrategy as AmountStrategy },
                fromTemplate: selectedTemplate || undefined,
            });
        }
        onSuccess?.();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            {/* Template selector (only for new schemas) */}
            {!isEdit && templates.length > 0 && (
                <div className="border rounded-xl p-4 bg-gray-50 dark:bg-gray-900 space-y-2">
                    <label className="text-sm font-semibold">{t('bankSchema.form.startFromTemplate')}</label>
                    <BaseSelect value={selectedTemplate} onValueChange={handleTemplateSelect}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('bankSchema.form.templatePlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                            {templates.map((tmpl) => (
                                <SelectItem key={tmpl.templateId} value={tmpl.templateId ?? ''}>
                                    {tmpl.name}
                                    {tmpl.bankName && (
                                        <span className="text-muted-foreground ml-2">({tmpl.bankName})</span>
                                    )}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </BaseSelect>
                </div>
            )}

            {/* Name */}
            <div className="grid gap-1.5">
                <Label htmlFor="schema-name">
                    {t('bankSchema.form.name')} <span className="text-destructive">*</span>
                </Label>
                <BaseInput id="schema-name" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            {/* Bank Identifier */}
            <div className="grid gap-1.5">
                <Label htmlFor="schema-bankId">{t('bankSchema.form.bankIdentifier')}</Label>
                <BaseInput id="schema-bankId" {...register('bankIdentifier')} placeholder="Sparkasse, DKB..." />
            </div>

            {/* Delimiter / Encoding row */}
            <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                    <Label htmlFor="schema-delimiter">{t('bankSchema.form.delimiter')}</Label>
                    <BaseInput id="schema-delimiter" {...register('delimiter')} placeholder=";" />
                </div>
                <div className="grid gap-1.5">
                    <Label>{t('bankSchema.form.encoding')}</Label>
                    <BaseSelect value={encodingValue ?? 'UTF-8'} onValueChange={(v) => setValue('encoding', v)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ENCODINGS.map((e) => (
                                <SelectItem key={e} value={e}>{e}</SelectItem>
                            ))}
                        </SelectContent>
                    </BaseSelect>
                </div>
            </div>

            {/* Skip Lines / Has Header row */}
            <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                    <Label htmlFor="schema-skipLines">{t('bankSchema.form.skipLines')}</Label>
                    <BaseInput id="schema-skipLines" type="number" min={0} {...register('skipLines')} />
                </div>
                <div className="grid gap-1.5">
                    <Label>{t('bankSchema.form.hasHeader')}</Label>
                    <div className="flex items-center gap-2 pt-3">
                        <input
                            type="checkbox"
                            id="schema-hasHeader"
                            {...register('hasHeader')}
                            className="w-4 h-4 accent-primary"
                        />
                        <label htmlFor="schema-hasHeader" className="text-sm">{t('bankSchema.form.hasHeaderLabel')}</label>
                    </div>
                </div>
            </div>

            {/* Date Format / Decimal Separator row */}
            <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                    <Label htmlFor="schema-dateFormat">{t('bankSchema.form.dateFormat')}</Label>
                    <BaseInput id="schema-dateFormat" {...register('dateFormat')} placeholder="dd.MM.yyyy" />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="schema-decimalSep">{t('bankSchema.form.decimalSeparator')}</Label>
                    <BaseInput id="schema-decimalSep" {...register('decimalSeparator')} placeholder="," />
                </div>
            </div>

            {/* Thousand Separator */}
            <div className="grid gap-1.5">
                <Label htmlFor="schema-thousandSep">{t('bankSchema.form.thousandSeparator')}</Label>
                <BaseInput id="schema-thousandSep" {...register('thousandSeparator')} placeholder="." />
            </div>

            {/* Amount Strategy */}
            <div className="grid gap-1.5">
                <Label>{t('bankSchema.form.amountStrategy')} <span className="text-destructive">*</span></Label>
                <BaseSelect
                    value={amountStrategyValue}
                    onValueChange={(v) => setValue('amountStrategy', v as AmountStrategy)}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {AMOUNT_STRATEGIES.map((s) => (
                            <SelectItem key={s} value={s}>
                                {t(`bankSchema.amountStrategy.${s}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </BaseSelect>
            </div>

            {/* Amount Type Positive Values (only for AMOUNT_PLUS_TYPE_COLUMN) */}
            {amountStrategyValue === 'AMOUNT_PLUS_TYPE_COLUMN' && (
                <div className="grid gap-1.5">
                    <Label htmlFor="schema-amountTypePos">{t('bankSchema.form.amountTypePositiveValues')}</Label>
                    <BaseInput
                        id="schema-amountTypePos"
                        {...register('amountTypePositiveValues')}
                        placeholder="Haben, Credit, +"
                    />
                    <p className="text-xs text-muted-foreground">{t('bankSchema.form.amountTypePositiveValuesHint')}</p>
                </div>
            )}

            {/* Column Mappings */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label>{t('bankSchema.form.columnMappings')}</Label>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ targetField: '', sourceColumnIndex: undefined, sourceColumnName: '', transform: '' })}
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        {t('bankSchema.form.addMapping')}
                    </Button>
                </div>

                {fields.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t('bankSchema.form.noMappings')}</p>
                )}

                {fields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-900 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                                {t('bankSchema.form.mapping')} #{index + 1}
                            </span>
                            <button
                                type="button"
                                onClick={() => remove(index)}
                                className="text-destructive hover:text-destructive/80 transition-colors"
                                aria-label={t('bankSchema.form.removeMapping')}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {/* Target Field */}
                            <div className="grid gap-1">
                                <label className="text-xs font-medium">{t('bankSchema.form.targetField')}</label>
                                <BaseSelect
                                    value={watch(`columnMappings.${index}.targetField`)}
                                    onValueChange={(v) => setValue(`columnMappings.${index}.targetField`, v)}
                                >
                                    <SelectTrigger className="py-2 text-xs">
                                        <SelectValue placeholder={t('bankSchema.form.targetFieldPlaceholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {BANK_FIELD_TYPES.map((f) => (
                                            <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </BaseSelect>
                            </div>

                            {/* Source Column Index */}
                            <div className="grid gap-1">
                                <label className="text-xs font-medium">{t('bankSchema.form.sourceColumnIndex')}</label>
                                <BaseInput
                                    type="number"
                                    min={0}
                                    {...register(`columnMappings.${index}.sourceColumnIndex`)}
                                    className="py-2 text-xs"
                                    placeholder="0"
                                />
                            </div>

                            {/* Source Column Name */}
                            <div className="grid gap-1">
                                <label className="text-xs font-medium">{t('bankSchema.form.sourceColumnName')}</label>
                                <BaseInput
                                    {...register(`columnMappings.${index}.sourceColumnName`)}
                                    className="py-2 text-xs"
                                    placeholder="Buchungsdatum"
                                />
                            </div>

                            {/* Transform */}
                            <div className="grid gap-1">
                                <label className="text-xs font-medium">{t('bankSchema.form.transform')}</label>
                                <BaseInput
                                    {...register(`columnMappings.${index}.transform`)}
                                    className="py-2 text-xs"
                                    placeholder=""
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="flex justify-between pt-2">
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                        {t('common.cancel')}
                    </Button>
                )}
                <Button type="submit" disabled={isLoading} className={!onCancel ? 'w-full' : ''}>
                    {isLoading ? <LoadingState size="sm" /> : t('common.save')}
                </Button>
            </div>
        </form>
    );
}
