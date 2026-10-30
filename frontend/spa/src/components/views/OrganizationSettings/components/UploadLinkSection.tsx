import { Copy, QrCode, RefreshCw, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { uploadLinkUrl, useBommelUploadLink, useRegenerateUploadLink, useRevokeUploadLink } from '@/hooks/queries/useUploadLinks';
import { useToast } from '@/hooks/use-toast';

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
 * Upload link of a bommel: members without a hopps account submit receipts for the bommel through it. Create, copy,
 * show as QR code, regenerate (the old link stops working) and revoke.
 */
export function UploadLinkSection({ bommelId, bommelName }: UploadLinkSectionProps) {
    const { t, i18n } = useTranslation();
    const { showSuccess, showError } = useToast();
    const { data: link, isLoading } = useBommelUploadLink(bommelId);
    const regenerate = useRegenerateUploadLink(bommelId);
    const revoke = useRevokeUploadLink(bommelId);

    const [expiresOn, setExpiresOn] = useState('');
    const [qrOpen, setQrOpen] = useState(false);
    const [confirm, setConfirm] = useState<'regenerate' | 'revoke' | null>(null);

    const url = link?.token ? uploadLinkUrl(link.token) : null;

    // Regenerating keeps a still valid expiry date; a new link takes the date picked in the form.
    const keptExpiry = link?.expiresAt && !link.expired ? link.expiresAt : undefined;

    const create = () =>
        regenerate.mutate(link ? keptExpiry : expiresOn ? endOfDay(expiresOn) : undefined, {
            onSuccess: () => {
                setConfirm(null);
                setExpiresOn('');
                showSuccess(t('organization.structure.uploadLink.created'));
            },
            onError: () => showError(t('organization.structure.uploadLink.error')),
        });

    const remove = () =>
        revoke.mutate(undefined, {
            onSuccess: () => {
                setConfirm(null);
                showSuccess(t('organization.structure.uploadLink.revoked'));
            },
            onError: () => showError(t('organization.structure.uploadLink.error')),
        });

    const copy = async () => {
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            showSuccess(t('organization.structure.uploadLink.copied'));
        } catch {
            showError(t('organization.structure.uploadLink.copyFailed'));
        }
    };

    const fmtDate = (date: Date) => date.toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit', year: 'numeric' });

    return (
        <div className="space-y-3 border-t border-border-soft pt-4">
            <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('organization.structure.uploadLink.title')}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{t('organization.structure.uploadLink.description')}</p>
            </div>

            {isLoading ? null : url && link ? (
                <>
                    <div className="flex items-center gap-2">
                        <input
                            readOnly
                            value={url}
                            aria-label={t('organization.structure.uploadLink.title')}
                            onFocus={(e) => e.currentTarget.select()}
                            className="min-w-0 flex-1 rounded-md border border-border-soft bg-transparent px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300"
                        />
                        <Button variant="outline" size="icon" onClick={copy} aria-label={t('organization.structure.uploadLink.copy')}>
                            <Copy size={14} />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setQrOpen(true)} aria-label={t('organization.structure.uploadLink.showQr')}>
                            <QrCode size={14} />
                        </Button>
                    </div>
                    <p className={`text-xs ${link.expired ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {link.expired
                            ? t('organization.structure.uploadLink.expired')
                            : link.expiresAt
                              ? t('organization.structure.uploadLink.validUntil', { date: fmtDate(link.expiresAt) })
                              : t('organization.structure.uploadLink.noExpiry')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setConfirm('regenerate')}>
                            <RefreshCw size={14} />
                            {t('organization.structure.uploadLink.regenerate')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setConfirm('revoke')}>
                            <Trash2 size={14} />
                            {t('organization.structure.uploadLink.revoke')}
                        </Button>
                    </div>
                </>
            ) : (
                <div className="space-y-2">
                    <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
                        {t('organization.structure.uploadLink.expiresOn')}
                        <input
                            type="date"
                            min={todayIso()}
                            value={expiresOn}
                            onChange={(e) => setExpiresOn(e.target.value)}
                            className="rounded-md border border-border-soft bg-transparent px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                        />
                    </label>
                    <Button className="w-full" variant="secondary" onClick={create} disabled={regenerate.isPending}>
                        {t('organization.structure.uploadLink.create')}
                    </Button>
                </div>
            )}

            <Dialog open={qrOpen} onOpenChange={setQrOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t('organization.structure.uploadLink.qrTitle', { name: bommelName })}</DialogTitle>
                        <DialogDescription>{t('organization.structure.uploadLink.qrDescription')}</DialogDescription>
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
                title={t('organization.structure.uploadLink.regenerateConfirmTitle')}
                description={t('organization.structure.uploadLink.regenerateConfirmText')}
                confirmLabel={t('organization.structure.uploadLink.regenerate')}
                onConfirm={create}
                loading={regenerate.isPending}
            />
            <ConfirmDialog
                open={confirm === 'revoke'}
                onOpenChange={(open) => !open && setConfirm(null)}
                title={t('organization.structure.uploadLink.revokeConfirmTitle')}
                description={t('organization.structure.uploadLink.revokeConfirmText')}
                confirmLabel={t('organization.structure.uploadLink.revoke')}
                onConfirm={remove}
                loading={revoke.isPending}
                destructive
            />
        </div>
    );
}

export default UploadLinkSection;
