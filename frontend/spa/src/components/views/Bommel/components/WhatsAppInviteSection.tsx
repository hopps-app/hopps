import { Copy, MessageCircle, QrCode, RefreshCw, Trash2, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { endOfDay, todayIso } from './expiryDate';

import { inputCls } from '@/components/Transactions/drawerParts';
import { Eyebrow } from '@/components/Transactions/Eyebrow';
import { fmtDate } from '@/components/Transactions/format';
import { Badge } from '@/components/Transactions/StatusBadge';
import Button from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { HintTooltip } from '@/components/ui/HintTooltip';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import {
    useBommelWhatsAppContacts,
    useBommelWhatsAppInvite,
    useRegenerateWhatsAppInvite,
    useRemoveWhatsAppContact,
    useRevokeWhatsAppInvite,
} from '@/hooks/queries/useWhatsAppInvites';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface WhatsAppInviteSectionProps {
    bommelId: number;
    bommelName: string;
}

/**
 * WhatsApp invite of a bommel: whoever opens the link sends a prepared message with the code to the Hopps chatbot,
 * which connects their phone number to this bommel. From then on, photos and PDFs they send land here as receipts.
 * Below the invite the section lists the connected numbers; each can be removed.
 */
export function WhatsAppInviteSection({ bommelId, bommelName }: WhatsAppInviteSectionProps) {
    const { t } = useTranslation();
    const { showSuccess, showError } = useToast();
    const { data: invite, isLoading } = useBommelWhatsAppInvite(bommelId);
    const { data: contacts } = useBommelWhatsAppContacts(bommelId);
    const regenerate = useRegenerateWhatsAppInvite(bommelId);
    const revoke = useRevokeWhatsAppInvite(bommelId);
    const removeContact = useRemoveWhatsAppContact(bommelId);

    const [expiresOn, setExpiresOn] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [qrOpen, setQrOpen] = useState(false);
    const [confirm, setConfirm] = useState<'regenerate' | 'revoke' | null>(null);
    const [contactToRemove, setContactToRemove] = useState<{ id: number; label: string } | null>(null);

    const joinUrl = invite?.joinUrl ?? null;
    const connected = contacts ?? [];

    // Regenerating keeps a still valid expiry date; a new invite takes the date picked in the dialog.
    const keptExpiry = invite?.expiresAt && !invite.expired ? invite.expiresAt : undefined;

    const create = () =>
        regenerate.mutate(invite ? keptExpiry : expiresOn ? endOfDay(expiresOn) : undefined, {
            onSuccess: () => {
                setConfirm(null);
                setCreateOpen(false);
                setExpiresOn('');
                showSuccess(t('bommel.whatsapp.created'));
            },
            onError: () => showError(t('bommel.whatsapp.error')),
        });

    const remove = () =>
        revoke.mutate(undefined, {
            onSuccess: () => {
                setConfirm(null);
                showSuccess(t('bommel.whatsapp.revoked'));
            },
            onError: () => showError(t('bommel.whatsapp.error')),
        });

    const disconnect = () => {
        if (!contactToRemove) return;
        removeContact.mutate(contactToRemove.id, {
            onSuccess: () => {
                setContactToRemove(null);
                showSuccess(t('bommel.whatsapp.contactRemoved'));
            },
            onError: () => showError(t('bommel.whatsapp.error')),
        });
    };

    // Without a configured WhatsApp number there is no link; the code can still be typed into the chat.
    const copy = async () => {
        const value = joinUrl ?? invite?.code;
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            showSuccess(joinUrl ? t('bommel.whatsapp.copied') : t('bommel.whatsapp.codeCopied'));
        } catch {
            showError(t('bommel.whatsapp.copyFailed'));
        }
    };

    return (
        <section className="mb-[18px]">
            <div className="mb-[11px] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                    <Eyebrow icon={<MessageCircle size={14} />}>{t('bommel.whatsapp.title')}</Eyebrow>
                    {invite && (
                        <InfoTooltip
                            content={
                                <>
                                    {t('bommel.whatsapp.description')}
                                    <span className="mt-1.5 block">{t('bommel.whatsapp.stopHint')}</span>
                                </>
                            }
                            label={t('bommel.whatsapp.description')}
                            size={14}
                        />
                    )}
                </div>
                {invite && (
                    <span title={invite.expired ? t('bommel.whatsapp.expired') : undefined}>
                        <Badge tone={invite.expired ? 'neg' : 'neutral'}>
                            {invite.expired
                                ? t('bommel.whatsapp.expiredBadge')
                                : invite.expiresAt
                                  ? t('bommel.whatsapp.validUntil', { date: fmtDate(invite.expiresAt) })
                                  : t('bommel.whatsapp.noExpiry')}
                        </Badge>
                    </span>
                )}
            </div>

            {isLoading ? (
                <div className="h-[92px] animate-pulse rounded-[14px] bg-[var(--surface-sunken)]" />
            ) : invite ? (
                <div className="flex flex-col gap-3 rounded-[14px] bg-[var(--surface-sunken)] px-[13px] py-3">
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[12.5px] font-semibold text-muted-foreground">{t('bommel.whatsapp.code')}</span>
                        <span className="font-mono text-[14px] font-bold tracking-wider" data-testid="whatsapp-code">
                            {invite.code}
                        </span>
                    </div>
                    {!joinUrl && <p className="text-[12px] leading-snug text-muted-foreground">{t('bommel.whatsapp.notConfigured')}</p>}
                    <div className="flex gap-1.5">
                        <Button className="min-w-0 flex-1 gap-2 px-3" variant="tonal" onClick={copy}>
                            <Copy size={15} />
                            {joinUrl ? t('bommel.whatsapp.copy') : t('bommel.whatsapp.copyCode')}
                        </Button>
                        {joinUrl && (
                            <Button
                                variant="tonal"
                                size="icon"
                                className="h-10 w-9 shrink-0"
                                onClick={() => setQrOpen(true)}
                                aria-label={t('bommel.whatsapp.showQr')}
                            >
                                <QrCode size={16} />
                            </Button>
                        )}
                        <HintTooltip content={t('bommel.whatsapp.regenerate')}>
                            <Button
                                variant="tonal"
                                size="icon"
                                className="h-10 w-9 shrink-0"
                                onClick={() => setConfirm('regenerate')}
                                aria-label={t('bommel.whatsapp.regenerate')}
                            >
                                <RefreshCw size={16} />
                            </Button>
                        </HintTooltip>
                        <HintTooltip content={t('bommel.whatsapp.revoke')}>
                            <Button
                                variant="tonal"
                                size="icon"
                                className="h-10 w-9 shrink-0 text-[var(--negative)]"
                                onClick={() => setConfirm('revoke')}
                                aria-label={t('bommel.whatsapp.revoke')}
                            >
                                <Trash2 size={16} />
                            </Button>
                        </HintTooltip>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-3 rounded-[14px] bg-[var(--surface-sunken)] px-[13px] py-3">
                    <p className="text-[12.5px] font-semibold leading-snug text-muted-foreground">{t('bommel.whatsapp.description')}</p>
                    <Button className="w-full" variant="tonal" onClick={() => setCreateOpen(true)}>
                        {t('bommel.whatsapp.create')}
                    </Button>
                </div>
            )}

            {connected.length > 0 && (
                <div className="mt-3">
                    <p className="mb-1.5 text-[12px] font-bold text-muted-foreground">{t('bommel.whatsapp.connected', { count: connected.length })}</p>
                    <ul className="flex flex-col gap-1">
                        {connected.map((contact) => {
                            const label = contact.displayName || contact.maskedPhoneNumber || '—';
                            return (
                                <li key={contact.id} className="flex items-center gap-2 rounded-[10px] px-2 py-1.5 hover:bg-[var(--surface-sunken)]">
                                    <span className="flex min-w-0 flex-1 flex-col">
                                        <span className="truncate text-[13px] font-semibold">{label}</span>
                                        <span className="truncate text-[11.5px] text-muted-foreground">
                                            {[
                                                contact.displayName ? contact.maskedPhoneNumber : null,
                                                t('bommel.whatsapp.joinedAt', { date: fmtDate(contact.joinedAt) }),
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </span>
                                    </span>
                                    <HintTooltip content={t('bommel.whatsapp.removeContact')}>
                                        <Button
                                            variant="link"
                                            size="icon"
                                            className="h-8 w-8 shrink-0 text-muted-foreground"
                                            onClick={() => setContactToRemove({ id: contact.id as number, label })}
                                            aria-label={t('bommel.whatsapp.removeContact')}
                                        >
                                            <X size={15} />
                                        </Button>
                                    </HintTooltip>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                {/* The date is optional: no field should open focused, or the date picker starts selecting a day. */}
                <DialogContent className="max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>{t('bommel.whatsapp.create')}</DialogTitle>
                        <DialogDescription>{t('bommel.whatsapp.description')}</DialogDescription>
                    </DialogHeader>
                    <label className="flex flex-col gap-1.5 text-[12.5px] font-bold text-muted-foreground">
                        {t('bommel.whatsapp.expiresOn')}
                        <input
                            type="date"
                            min={todayIso()}
                            value={expiresOn}
                            onChange={(e) => setExpiresOn(e.target.value)}
                            className={cn(inputCls, 'font-semibold')}
                        />
                    </label>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={create} disabled={regenerate.isPending}>
                            {t('bommel.whatsapp.create')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={qrOpen} onOpenChange={setQrOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t('bommel.whatsapp.qrTitle', { name: bommelName })}</DialogTitle>
                        <DialogDescription>{t('bommel.whatsapp.qrDescription')}</DialogDescription>
                    </DialogHeader>
                    {joinUrl && (
                        <div className="flex flex-col items-center gap-3">
                            <div className="rounded-lg bg-white p-4">
                                <QRCodeSVG value={joinUrl} size={220} marginSize={0} />
                            </div>
                            <p className="break-all text-center text-xs text-muted-foreground">{joinUrl}</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={confirm === 'regenerate'}
                onOpenChange={(open) => !open && setConfirm(null)}
                title={t('bommel.whatsapp.regenerateConfirmTitle')}
                description={t('bommel.whatsapp.regenerateConfirmText')}
                confirmLabel={t('bommel.whatsapp.regenerate')}
                onConfirm={create}
                loading={regenerate.isPending}
            />
            <ConfirmDialog
                open={confirm === 'revoke'}
                onOpenChange={(open) => !open && setConfirm(null)}
                title={t('bommel.whatsapp.revokeConfirmTitle')}
                description={t('bommel.whatsapp.revokeConfirmText')}
                confirmLabel={t('bommel.whatsapp.revoke')}
                onConfirm={remove}
                loading={revoke.isPending}
                destructive
            />
            <ConfirmDialog
                open={contactToRemove !== null}
                onOpenChange={(open) => !open && setContactToRemove(null)}
                title={t('bommel.whatsapp.removeContactConfirmTitle', { name: contactToRemove?.label ?? '' })}
                description={t('bommel.whatsapp.removeContactConfirmText')}
                confirmLabel={t('bommel.whatsapp.removeContact')}
                onConfirm={disconnect}
                loading={removeContact.isPending}
                destructive
            />
        </section>
    );
}

export default WhatsAppInviteSection;
