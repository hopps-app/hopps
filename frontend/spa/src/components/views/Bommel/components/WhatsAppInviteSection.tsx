import { ApiException, WhatsAppContactResponse } from '@hopps/api-client';
import { MessageCircle, RefreshCw, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { inputCls } from '@/components/Transactions/drawerParts';
import { Eyebrow } from '@/components/Transactions/Eyebrow';
import { fmtDate } from '@/components/Transactions/format';
import { Badge, BadgeTone } from '@/components/Transactions/StatusBadge';
import Button from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { HintTooltip } from '@/components/ui/HintTooltip';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { useBommelWhatsAppContacts, useInviteWhatsAppContact, useRemoveWhatsAppContact, useResendWhatsAppInvitation } from '@/hooks/queries/useWhatsAppInvites';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface WhatsAppInviteSectionProps {
    bommelId: number;
}

type ContactState = 'invited' | 'expired' | 'active' | 'declined';

function stateOf(contact: WhatsAppContactResponse): ContactState {
    if (contact.status === 'ACTIVE') return 'active';
    if (contact.status === 'DECLINED') return 'declined';
    return contact.invitationExpired ? 'expired' : 'invited';
}

const TONE: Record<ContactState, BadgeTone> = { invited: 'neutral', expired: 'warn', active: 'pos', declined: 'neg' };

/** Maps the API's error status to a message; everything unexpected gets the generic one. */
function errorKey(err: unknown): string {
    if (ApiException.isApiException(err)) {
        switch (err.status) {
            case 400:
                return 'bommel.whatsapp.errorInvalid';
            case 409:
                return 'bommel.whatsapp.errorAlreadyConnected';
            case 429:
                return 'bommel.whatsapp.errorTooMany';
            case 503:
                return 'bommel.whatsapp.errorNotSent';
        }
    }
    return 'bommel.whatsapp.error';
}

/**
 * WhatsApp contacts of a bommel: a member enters a name and a number, hopps sends a WhatsApp invitation, and once the
 * person accepts it, photos and PDFs they send to hopps land here as receipts. The list shows every invited number
 * with its state; invitations can be sent again and contacts removed.
 */
export function WhatsAppInviteSection({ bommelId }: WhatsAppInviteSectionProps) {
    const { t } = useTranslation();
    const { showSuccess, showError } = useToast();
    const { data: contacts, isLoading } = useBommelWhatsAppContacts(bommelId);
    const invite = useInviteWhatsAppContact(bommelId);
    const resend = useResendWhatsAppInvitation(bommelId);
    const remove = useRemoveWhatsAppContact(bommelId);

    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [toRemove, setToRemove] = useState<WhatsAppContactResponse | null>(null);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !phoneNumber.trim()) return;
        invite.mutate(
            { name: name.trim(), phoneNumber: phoneNumber.trim() },
            {
                onSuccess: () => {
                    showSuccess(t('bommel.whatsapp.sent', { name: name.trim() }));
                    setName('');
                    setPhoneNumber('');
                },
                onError: (err) => showError(t(errorKey(err))),
            }
        );
    };

    const sendAgain = (contact: WhatsAppContactResponse) =>
        resend.mutate(contact.id as number, {
            onSuccess: () => showSuccess(t('bommel.whatsapp.sent', { name: contact.name })),
            onError: (err) => showError(t(errorKey(err))),
        });

    const confirmRemove = () => {
        if (!toRemove) return;
        remove.mutate(toRemove.id as number, {
            onSuccess: () => {
                setToRemove(null);
                showSuccess(t('bommel.whatsapp.removed'));
            },
            onError: () => showError(t('bommel.whatsapp.error')),
        });
    };

    return (
        <section className="mb-[18px]">
            <div className="mb-[11px] flex items-center gap-1.5">
                <Eyebrow icon={<MessageCircle size={14} />}>{t('bommel.whatsapp.title')}</Eyebrow>
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
            </div>

            <form onSubmit={submit} className="flex flex-col gap-2 rounded-[14px] bg-[var(--surface-sunken)] px-[13px] py-3">
                <input
                    className={cn(inputCls, 'font-semibold')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('bommel.whatsapp.namePlaceholder')}
                    aria-label={t('bommel.whatsapp.name')}
                    maxLength={255}
                    autoComplete="off"
                />
                <input
                    className={cn(inputCls, 'font-semibold')}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder={t('bommel.whatsapp.phonePlaceholder')}
                    aria-label={t('bommel.whatsapp.phone')}
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                />
                <Button type="submit" variant="tonal" className="w-full" disabled={invite.isPending || !name.trim() || !phoneNumber.trim()}>
                    {t('bommel.whatsapp.invite')}
                </Button>
                <p className="text-[11.5px] leading-snug text-muted-foreground">{t('bommel.whatsapp.inviteHint')}</p>
            </form>

            {isLoading ? (
                <div className="mt-3 h-[48px] animate-pulse rounded-[10px] bg-[var(--surface-sunken)]" />
            ) : (
                (contacts?.length ?? 0) > 0 && (
                    <ul className="mt-3 flex flex-col gap-1">
                        {contacts!.map((contact) => {
                            const state = stateOf(contact);
                            const since =
                                state === 'active'
                                    ? t('bommel.whatsapp.joinedAt', { date: fmtDate(contact.joinedAt) })
                                    : t('bommel.whatsapp.invitedAt', { date: fmtDate(contact.invitedAt) });
                            return (
                                <li key={contact.id} className="flex items-center gap-2 rounded-[10px] px-2 py-1.5 hover:bg-[var(--surface-sunken)]">
                                    <span className="flex min-w-0 flex-1 flex-col">
                                        <span className="flex min-w-0 items-center gap-1.5">
                                            <span className="truncate text-[13px] font-semibold">{contact.name}</span>
                                            <Badge tone={TONE[state]}>{t(`bommel.whatsapp.status.${state}`)}</Badge>
                                        </span>
                                        <span className="truncate text-[11.5px] text-muted-foreground">
                                            {contact.maskedPhoneNumber} · {since}
                                        </span>
                                    </span>
                                    {state !== 'active' && (
                                        <HintTooltip content={t('bommel.whatsapp.resend')}>
                                            <Button
                                                variant="link"
                                                size="icon"
                                                className="h-8 w-8 shrink-0 text-muted-foreground"
                                                onClick={() => sendAgain(contact)}
                                                disabled={resend.isPending}
                                                aria-label={t('bommel.whatsapp.resend')}
                                            >
                                                <RefreshCw size={14} />
                                            </Button>
                                        </HintTooltip>
                                    )}
                                    <HintTooltip content={t('bommel.whatsapp.remove')}>
                                        <Button
                                            variant="link"
                                            size="icon"
                                            className="h-8 w-8 shrink-0 text-muted-foreground"
                                            onClick={() => setToRemove(contact)}
                                            aria-label={t('bommel.whatsapp.remove')}
                                        >
                                            <X size={15} />
                                        </Button>
                                    </HintTooltip>
                                </li>
                            );
                        })}
                    </ul>
                )
            )}

            <ConfirmDialog
                open={toRemove !== null}
                onOpenChange={(open) => !open && setToRemove(null)}
                title={t('bommel.whatsapp.removeConfirmTitle', { name: toRemove?.name ?? '' })}
                description={toRemove?.status === 'ACTIVE' ? t('bommel.whatsapp.removeConfirmActive') : t('bommel.whatsapp.removeConfirmInvited')}
                confirmLabel={t('bommel.whatsapp.remove')}
                onConfirm={confirmRemove}
                loading={remove.isPending}
                destructive
            />
        </section>
    );
}

export default WhatsAppInviteSection;
