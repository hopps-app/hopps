import { Copy, Link2, QrCode, RefreshCw, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { inputCls } from '@/components/Transactions/drawerParts';
import { Eyebrow } from '@/components/Transactions/Eyebrow';
import { fmtDate } from '@/components/Transactions/format';
import { Badge } from '@/components/Transactions/StatusBadge';
import Button from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { HintTooltip } from '@/components/ui/HintTooltip';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { uploadLinkUrl, useBommelUploadLink, useRegenerateUploadLink, useRevokeUploadLink } from '@/hooks/queries/useUploadLinks';
import { useToast } from '@/hooks/use-toast';
import { PUBLIC_UPLOAD_PATH } from '@/lib/publicUpload';
import { cn } from '@/lib/utils';

interface UploadLinkSectionProps {
    bommelId: number;
    bommelName: string;
}

/** End of the picked day in local time, so a link "valid until 31.12." still works on that day. */
function endOfDay(date: string): Date {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59);
}

function todayIso(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Upload link of a bommel: people without a hopps account submit receipts for the bommel through it. Without a link
 * the section is one line and a button; with one it shows the link, how long it is valid, and the regenerate and
 * revoke actions (the old link stops working).
 */
export function UploadLinkSection({ bommelId, bommelName }: UploadLinkSectionProps) {
    const { t } = useTranslation();
    const { showSuccess, showError } = useToast();
    const { data: link, isLoading } = useBommelUploadLink(bommelId);
    const regenerate = useRegenerateUploadLink(bommelId);
    const revoke = useRevokeUploadLink(bommelId);

    const [expiresOn, setExpiresOn] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [qrOpen, setQrOpen] = useState(false);
    const [confirm, setConfirm] = useState<'regenerate' | 'revoke' | null>(null);

    const url = link?.token ? uploadLinkUrl(link.token) : null;

    // Regenerating keeps a still valid expiry date; a new link takes the date picked in the dialog.
    const keptExpiry = link?.expiresAt && !link.expired ? link.expiresAt : undefined;

    const create = () =>
        regenerate.mutate(link ? keptExpiry : expiresOn ? endOfDay(expiresOn) : undefined, {
            onSuccess: () => {
                setConfirm(null);
                setCreateOpen(false);
                setExpiresOn('');
                showSuccess(t('bommel.uploadLink.created'));
            },
            onError: () => showError(t('bommel.uploadLink.error')),
        });

    const remove = () =>
        revoke.mutate(undefined, {
            onSuccess: () => {
                setConfirm(null);
                showSuccess(t('bommel.uploadLink.revoked'));
            },
            onError: () => showError(t('bommel.uploadLink.error')),
        });

    const copy = async () => {
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            showSuccess(t('bommel.uploadLink.copied'));
        } catch {
            showError(t('bommel.uploadLink.copyFailed'));
        }
    };

    return (
        <section className="mb-[18px]">
            <div className="mb-[11px] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                    <Eyebrow icon={<Link2 size={14} />}>{t('bommel.uploadLink.title')}</Eyebrow>
                    {url && <InfoTooltip content={t('bommel.uploadLink.scope')} label={t('bommel.uploadLink.scope')} size={14} />}
                </div>
                {url && link && (
                    <span title={link.expired ? t('bommel.uploadLink.expired') : undefined}>
                        <Badge tone={link.expired ? 'neg' : 'neutral'}>
                            {link.expired
                                ? t('bommel.uploadLink.expiredBadge')
                                : link.expiresAt
                                  ? t('bommel.uploadLink.validUntil', { date: fmtDate(link.expiresAt) })
                                  : t('bommel.uploadLink.noExpiry')}
                        </Badge>
                    </span>
                )}
            </div>

            {isLoading ? (
                <div className="h-[92px] animate-pulse rounded-[14px] bg-[var(--surface-sunken)]" />
            ) : url && link ? (
                <div className="flex flex-col gap-3 rounded-[14px] bg-[var(--surface-sunken)] px-[13px] py-3">
                    {/* Nobody reads a token: a short form is enough to recognise the link, copying does the work. */}
                    <p className="truncate text-[12.5px] font-semibold text-muted-foreground" title={url}>
                        {`${window.location.host}${PUBLIC_UPLOAD_PATH}/…${link.token?.slice(-4)}`}
                    </p>
                    <div className="flex gap-1.5">
                        <Button className="min-w-0 flex-1 gap-2 px-3" variant="tonal" onClick={copy}>
                            <Copy size={15} />
                            {t('bommel.uploadLink.copy')}
                        </Button>
                        <Button
                            variant="tonal"
                            size="icon"
                            className="h-10 w-9 shrink-0"
                            onClick={() => setQrOpen(true)}
                            aria-label={t('bommel.uploadLink.showQr')}
                        >
                            <QrCode size={16} />
                        </Button>
                        <HintTooltip content={t('bommel.uploadLink.regenerate')}>
                            <Button
                                variant="tonal"
                                size="icon"
                                className="h-10 w-9 shrink-0"
                                onClick={() => setConfirm('regenerate')}
                                aria-label={t('bommel.uploadLink.regenerate')}
                            >
                                <RefreshCw size={16} />
                            </Button>
                        </HintTooltip>
                        <HintTooltip content={t('bommel.uploadLink.revoke')}>
                            <Button
                                variant="tonal"
                                size="icon"
                                className="h-10 w-9 shrink-0 text-[var(--negative)]"
                                onClick={() => setConfirm('revoke')}
                                aria-label={t('bommel.uploadLink.revoke')}
                            >
                                <Trash2 size={16} />
                            </Button>
                        </HintTooltip>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-3 rounded-[14px] bg-[var(--surface-sunken)] px-[13px] py-3">
                    <p className="text-[12.5px] font-semibold leading-snug text-muted-foreground">{t('bommel.uploadLink.description')}</p>
                    <Button className="w-full" variant="tonal" onClick={() => setCreateOpen(true)}>
                        {t('bommel.uploadLink.create')}
                    </Button>
                </div>
            )}

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                {/* The date is optional: no field should open focused, or the date picker starts selecting a day. */}
                <DialogContent className="max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>{t('bommel.uploadLink.create')}</DialogTitle>
                        <DialogDescription>{t('bommel.uploadLink.description')}</DialogDescription>
                    </DialogHeader>
                    <label className="flex flex-col gap-1.5 text-[12.5px] font-bold text-muted-foreground">
                        {t('bommel.uploadLink.expiresOn')}
                        <input
                            type="date"
                            min={todayIso()}
                            value={expiresOn}
                            onChange={(e) => setExpiresOn(e.target.value)}
                            className={cn(
                                inputCls,
                                'font-semibold',
                                '[&::-webkit-datetime-edit-day-field:focus]:bg-primary [&::-webkit-datetime-edit-day-field:focus]:text-white [&::-webkit-datetime-edit-month-field:focus]:bg-primary [&::-webkit-datetime-edit-month-field:focus]:text-white [&::-webkit-datetime-edit-year-field:focus]:bg-primary [&::-webkit-datetime-edit-year-field:focus]:text-white'
                            )}
                        />
                    </label>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={create} disabled={regenerate.isPending}>
                            {t('bommel.uploadLink.create')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={qrOpen} onOpenChange={setQrOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t('bommel.uploadLink.qrTitle', { name: bommelName })}</DialogTitle>
                        <DialogDescription>{t('bommel.uploadLink.qrDescription')}</DialogDescription>
                    </DialogHeader>
                    {url && (
                        <div className="flex flex-col items-center gap-3">
                            <div className="rounded-lg bg-white p-4">
                                <QRCodeSVG value={url} size={220} marginSize={0} />
                            </div>
                            <p className="break-all text-center text-xs text-muted-foreground">{url}</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={confirm === 'regenerate'}
                onOpenChange={(open) => !open && setConfirm(null)}
                title={t('bommel.uploadLink.regenerateConfirmTitle')}
                description={t('bommel.uploadLink.regenerateConfirmText')}
                confirmLabel={t('bommel.uploadLink.regenerate')}
                onConfirm={create}
                loading={regenerate.isPending}
            />
            <ConfirmDialog
                open={confirm === 'revoke'}
                onOpenChange={(open) => !open && setConfirm(null)}
                title={t('bommel.uploadLink.revokeConfirmTitle')}
                description={t('bommel.uploadLink.revokeConfirmText')}
                confirmLabel={t('bommel.uploadLink.revoke')}
                onConfirm={remove}
                loading={revoke.isPending}
                destructive
            />
        </section>
    );
}

export default UploadLinkSection;
