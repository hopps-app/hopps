import { BankTransactionResponse, TransactionCreateRequest } from '@hopps/api-client';
import { X, Check, ArrowDownRight, ArrowUpRight, Plus } from 'lucide-react';
import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

import InvoiceUploadFormBommelSelector, { getLastBommelId } from '@/components/InvoiceUploadForm/InvoiceUploadFormBommelSelector';
import { useAddBankTransactionMatch } from '@/hooks/queries/useBankAccounts';
import { useCategories } from '@/hooks/queries/useCategories';
import { useCreateTransaction, useConfirmTransaction } from '@/hooks/queries/useTransactions';
import { getTransactionConfirmState } from '@/lib/transactionConfirm';
import { cn } from '@/lib/utils';
import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { useStore } from '@/store/store';

const FONT = '"Hanken Grotesk", "Reddit Sans", sans-serif';

/**
 * Formats a date-only value (the api-client deserializes `bookingDate` to a `Date` at UTC midnight) as the
 * `YYYY-MM-DD` string an `<input type="date">` expects. UTC parts are used so the day never shifts by a timezone.
 */
function toDateInputValue(value: Date | string | undefined): string {
    if (!value) return '';
    const d = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

const AREAS = [
    { value: '', labelKey: 'transactions.filters.allAreas' },
    { value: 'IDEELL', label: 'Ideell' },
    { value: 'ZWECKBETRIEB', label: 'Zweckbetrieb' },
    { value: 'WIRTSCHAFTLICH', label: 'Wirtschaftlicher Geschäftsbetrieb' },
    { value: 'VERMOEGENSVERWALTUNG', label: 'Vermögensverwaltung' },
];

interface Props {
    open: boolean;
    onClose: () => void;
    /**
     * When set, the transaction is created linked to this bank transaction: the form is prefilled from the bank
     * movement, the created transaction is auto-matched to it, and a "save & confirm" action is offered.
     */
    bankTx?: BankTransactionResponse;
    /** Called with the created transaction id after a successful create (+ link/confirm). */
    onCreated?: (transactionId: number | undefined) => void;
}

export function CreateTransactionDrawer({ open, onClose, bankTx, onCreated }: Props) {
    const { t } = useTranslation();
    const createMutation = useCreateTransaction();
    const addMatch = useAddBankTransactionMatch();
    const confirmMutation = useConfirmTransaction();
    const { data: categoriesData } = useCategories();
    const { organization } = useStore();
    const allBommels = useBommelsStore((s) => s.allBommels);
    const loadBommels = useBommelsStore((s) => s.loadBommels);
    const bankMode = !!bankTx;

    // The bommel store is populated on-demand per view; the Konten view doesn't load it, so ensure it's fetched when
    // this drawer opens (otherwise the bommel selector would be empty).
    useEffect(() => {
        if (open && organization?.id && allBommels.length === 0) {
            loadBommels(organization.id);
        }
    }, [open, organization?.id, allBommels.length, loadBommels]);

    // form state
    const [direction, setDirection] = useState<'expense' | 'income'>('expense');
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [senderName, setSenderName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [bommelId, setBommelId] = useState('');
    const [area, setArea] = useState('');
    const [privatelyPaid, setPrivatelyPaid] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [amountError, setAmountError] = useState(false);

    const tagInputRef = useRef<HTMLInputElement>(null);

    // Prefill the form from the bank movement whenever the drawer opens in bank-linked mode (same field mapping as
    // creating a receipt from a bank transaction: purpose → name, amount → total, booking date → date, counterparty).
    useEffect(() => {
        if (!open || !bankTx) return;
        const amt = bankTx.amount ?? 0;
        setDirection(amt < 0 ? 'expense' : 'income');
        setName(bankTx.purpose ?? '');
        setAmount(amt !== 0 ? String(Math.abs(amt)) : '');
        setDate(toDateInputValue(bankTx.bookingDate) || new Date().toISOString().slice(0, 10));
        setSenderName(bankTx.counterpartyName ?? '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, bankTx?.id]);

    // Default the bommel to the one last picked, so several transactions in a row can be assigned to the same bommel
    // without re-selecting it each time. Only fills when nothing is set yet.
    useEffect(() => {
        if (!open || bommelId) return;
        const last = getLastBommelId();
        if (last) setBommelId(String(last));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    function reset() {
        setDirection('expense');
        setName('');
        setAmount('');
        setDate(new Date().toISOString().slice(0, 10));
        setSenderName('');
        setCategoryId('');
        setBommelId('');
        setArea('');
        setPrivatelyPaid(false);
        setTags([]);
        setTagInput('');
        setAmountError(false);
    }

    function handleClose() {
        reset();
        onClose();
    }

    function addTag() {
        const v = tagInput.trim();
        if (v && !tags.includes(v)) setTags((prev) => [...prev, v]);
        setTagInput('');
    }

    function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
        }
        if (e.key === 'Backspace' && !tagInput && tags.length) {
            setTags((prev) => prev.slice(0, -1));
        }
    }

    function buildPayload(): TransactionCreateRequest | null {
        const rawAmount = parseFloat(amount.replace(',', '.'));
        if (!amount || isNaN(rawAmount)) {
            setAmountError(true);
            return null;
        }
        setAmountError(false);

        const signedAmount = direction === 'expense' ? -Math.abs(rawAmount) : Math.abs(rawAmount);

        return new TransactionCreateRequest({
            name: name || undefined,
            total: signedAmount,
            transactionDate: date || undefined,
            senderName: senderName || undefined,
            categoryId: categoryId ? Number(categoryId) : undefined,
            bommelId: bommelId ? Number(bommelId) : undefined,
            area: area || undefined,
            privatelyPaid,
            tags: tags.length ? tags : undefined,
        });
    }

    // Creates the transaction. In bank-linked mode it is additionally matched to the bank transaction and — when
    // `confirm` is true and the criteria are met — confirmed in the same flow.
    async function submit(confirm: boolean) {
        const payload = buildPayload();
        if (!payload) return;

        const created = await createMutation.mutateAsync(payload);
        if (bankTx?.id && created?.id) {
            await addMatch.mutateAsync({ bankTxId: bankTx.id, transactionId: created.id });
            if (confirm) {
                await confirmMutation.mutateAsync(created.id);
            }
        }
        onCreated?.(created?.id);
        handleClose();
    }

    function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        // Enter / primary submit saves a draft; confirming is an explicit secondary action.
        submit(false);
    }

    const parsedAmount = amount ? parseFloat(amount.replace(',', '.')) : null;
    const confirmState = bankMode
        ? getTransactionConfirmState(
              {
                  amount: parsedAmount != null && !Number.isNaN(parsedAmount) ? parsedAmount : null,
                  date: date || null,
                  counterparty: senderName || null,
                  name: name || null,
                  bommelId: bommelId ? Number(bommelId) : null,
              },
              [{ amount: bankTx?.amount }]
          )
        : null;

    const isBusy = createMutation.isPending || addMatch.isPending || confirmMutation.isPending;

    // Shared input style
    const inputCls =
        'w-full rounded-[10px] border border-[#E9E9EE] bg-white px-3 py-2.5 text-[14px] text-[#1B1B1F] placeholder-[#9A9AA3] focus:outline-none focus:ring-2 focus:ring-[#F3EAFB] focus:border-[#9955CC] transition-colors';
    const labelCls = 'block text-[11px] font-bold uppercase tracking-[0.06em] text-[#9A9AA3] mb-1.5';

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn('fixed inset-0 bg-black/25 z-40 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0 pointer-events-none')}
                onClick={handleClose}
            />

            {/* Drawer */}
            <div
                className={cn(
                    'fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-out',
                    open ? 'translate-x-0' : 'translate-x-full'
                )}
                style={{ width: 460, maxWidth: '100vw', background: '#FFFFFF', boxShadow: '0 12px 40px rgba(20,20,40,.16)', fontFamily: FONT }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#E9E9EE]">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#7E3FB4]">
                            {bankMode ? t('konten.createTx.title') : t('transactions.create.title')}
                        </span>
                        <p className="mt-0.5 text-[13px] text-[#6B6B76]">{bankMode ? t('konten.createTx.subtitle') : t('transactions.create.subtitle')}</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-9 h-9 flex items-center justify-center rounded-full border border-[#E9E9EE] text-[#6B6B76] hover:text-[#1B1B1F] hover:border-[#C7A2E3] transition-colors"
                    >
                        <X size={17} />
                    </button>
                </div>

                {/* Scrollable body */}
                <form id="create-tx-form" onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {/* Direction toggle */}
                    <div>
                        <label className={labelCls}>{t('transactions.create.direction')}</label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['expense', 'income'] as const).map((d) => {
                                const active = direction === d;
                                const Icon = d === 'expense' ? ArrowDownRight : ArrowUpRight;
                                const activeColor =
                                    d === 'expense'
                                        ? { bg: '#FBEAEF', border: '#E8A0B2', text: '#B12C4C', iconBg: '#F5C6D2' }
                                        : { bg: '#E7F4EC', border: '#7DC4A0', text: '#1F7A50', iconBg: '#B8E4CA' };
                                return (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => setDirection(d)}
                                        className="flex items-center gap-3 p-3 rounded-[12px] border-2 transition-all text-left"
                                        style={{
                                            borderColor: active ? activeColor.border : '#E9E9EE',
                                            background: active ? activeColor.bg : '#F8F8FA',
                                        }}
                                    >
                                        <span
                                            className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0"
                                            style={{ background: active ? activeColor.iconBg : '#EBEBF0', color: active ? activeColor.text : '#9A9AA3' }}
                                        >
                                            <Icon size={18} strokeWidth={2} />
                                        </span>
                                        <span className="font-bold text-[14px]" style={{ color: active ? activeColor.text : '#6B6B76' }}>
                                            {t(`transactions.create.${d}`)}
                                        </span>
                                        {active && (
                                            <span
                                                className="ml-auto w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                                style={{ background: activeColor.text }}
                                            >
                                                <Check size={11} color="white" strokeWidth={3} />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Amount + Name row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>{t('transactions.create.amount')} *</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B76] font-bold text-[15px] pointer-events-none">€</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={amount}
                                    onChange={(e) => {
                                        setAmount(e.target.value);
                                        setAmountError(false);
                                    }}
                                    placeholder={t('transactions.create.amountPlaceholder')}
                                    className={cn(inputCls, 'pl-7', amountError && 'border-[#E8A0B2] bg-[#FFF5F7]')}
                                />
                            </div>
                            {amountError && <p className="mt-1 text-[12px] text-[#B12C4C]">{t('transactions.create.errorAmount')}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>{t('transactions.create.date')}</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className={labelCls}>{t('transactions.create.name')}</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('transactions.create.namePlaceholder')}
                            className={inputCls}
                        />
                    </div>

                    {/* Sender — labelled by direction: income means the counterparty is the recipient. */}
                    <div>
                        <label className={labelCls}>{direction === 'income' ? t('transactions.create.recipient') : t('transactions.create.issuer')}</label>
                        <input
                            type="text"
                            value={senderName}
                            onChange={(e) => setSenderName(e.target.value)}
                            placeholder={t('transactions.create.senderPlaceholder')}
                            className={inputCls}
                        />
                    </div>

                    {/* Category + Bommel */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>{t('transactions.create.category')}</label>
                            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
                                <option value="">—</option>
                                {(categoriesData as { id?: number; name?: string }[] | undefined)?.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>{t('transactions.create.bommel')}</label>
                            <InvoiceUploadFormBommelSelector value={bommelId ? Number(bommelId) : null} onChange={(id) => setBommelId(id ? String(id) : '')} />
                        </div>
                    </div>

                    {/* Area */}
                    <div>
                        <label className={labelCls}>{t('transactions.create.area')}</label>
                        <select value={area} onChange={(e) => setArea(e.target.value)} className={inputCls}>
                            {AREAS.map((a) => (
                                <option key={a.value} value={a.value}>
                                    {a.label ?? t(a.labelKey!)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Privately paid */}
                    <div>
                        <button
                            type="button"
                            onClick={() => setPrivatelyPaid((v) => !v)}
                            className="w-full flex items-center gap-3 p-3 rounded-[12px] border-2 transition-all text-left"
                            style={{
                                borderColor: privatelyPaid ? '#9955CC' : '#E9E9EE',
                                background: privatelyPaid ? '#F3EAFB' : '#F8F8FA',
                            }}
                        >
                            <span
                                className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0 transition-colors"
                                style={{ background: privatelyPaid ? '#E0C8F5' : '#EBEBF0' }}
                            >
                                {privatelyPaid ? (
                                    <Check size={17} strokeWidth={2.5} color="#7E3FB4" />
                                ) : (
                                    <span className="w-4 h-4 rounded border-2 border-[#C0C0CC]" />
                                )}
                            </span>
                            <div className="min-w-0">
                                {/* Wording depends on direction: an expense was privately advanced/paid, an income was
                                    privately received first (someone collected the money before it reached the org). */}
                                <p className="text-[14px] font-bold" style={{ color: privatelyPaid ? '#7E3FB4' : '#1B1B1F' }}>
                                    {direction === 'income' ? t('transactions.create.privatelyReceived') : t('transactions.create.privatelyPaid')}
                                </p>
                                <p className="text-[12px] text-[#6B6B76] leading-snug">
                                    {direction === 'income' ? t('transactions.create.privatelyReceivedHint') : t('transactions.create.privatelyPaidHint')}
                                </p>
                            </div>
                        </button>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className={labelCls}>{t('transactions.create.tags')}</label>
                        <div
                            className="flex flex-wrap gap-1.5 rounded-[10px] border border-[#E9E9EE] bg-white p-2 cursor-text focus-within:ring-2 focus-within:ring-[#F3EAFB] focus-within:border-[#9955CC] transition-colors"
                            onClick={() => tagInputRef.current?.focus()}
                        >
                            {tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12.5px] font-semibold"
                                    style={{ background: '#F3EAFB', color: '#7E3FB4' }}
                                >
                                    {tag}
                                    <button
                                        type="button"
                                        onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                                        className="hover:text-[#B12C4C] transition-colors"
                                    >
                                        <X size={11} strokeWidth={2.5} />
                                    </button>
                                </span>
                            ))}
                            <input
                                ref={tagInputRef}
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                                onBlur={addTag}
                                placeholder={tags.length === 0 ? t('transactions.create.tagsPlaceholder') : ''}
                                className="flex-1 min-w-[120px] text-[13.5px] text-[#1B1B1F] placeholder-[#9A9AA3] bg-transparent outline-none py-0.5"
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[#E9E9EE] flex items-center gap-2" style={{ background: '#FFFFFF' }}>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-5 py-2.5 rounded-full text-[14px] font-bold border border-[#E0E0E6] text-[#6B6B76] hover:bg-[#F8F8FA] transition-colors"
                    >
                        {t('transactions.create.cancel')}
                    </button>
                    <div className="flex-1" />
                    {bankMode ? (
                        <>
                            {/* Save as draft */}
                            <button
                                type="button"
                                onClick={() => submit(false)}
                                disabled={isBusy}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-bold border border-[#E0E0E6] text-[#6B6B76] hover:bg-[#F8F8FA] transition-colors disabled:opacity-50"
                            >
                                {isBusy ? '…' : t('konten.createTx.saveDraft')}
                            </button>
                            {/* Save & confirm — only when the confirmation criteria are met */}
                            <button
                                type="button"
                                onClick={() => submit(true)}
                                disabled={isBusy || !confirmState?.canConfirm}
                                title={!confirmState?.canConfirm ? t('konten.createTx.confirmBlocked') : undefined}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: 'linear-gradient(100deg,#7E3FB4,#9955CC)' }}
                            >
                                <Check size={15} strokeWidth={2.5} />
                                {isBusy ? '…' : t('konten.createTx.saveConfirm')}
                            </button>
                        </>
                    ) : (
                        <button
                            form="create-tx-form"
                            type="submit"
                            disabled={createMutation.isPending}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            style={{ background: 'linear-gradient(100deg,#7E3FB4,#9955CC)' }}
                        >
                            <Plus size={15} strokeWidth={2.5} />
                            {createMutation.isPending ? '…' : t('transactions.create.save')}
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
