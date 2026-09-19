import { Copy, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useToast } from '@/hooks/use-toast';

type SetupLinkDialogProps = {
    /** The set-password link to pass on; the dialog is open while it is set. */
    link: string | null;
    /** Name of the invited person, for the explanation. */
    name: string;
    onClose: () => void;
};

/**
 * Shown right after adding a person whose invitation email could not be sent (an identity provider without a mail
 * server). The admin passes this one-time link on themselves; with it the person sets their own password. The link is
 * only ever in this response, so closing the dialog loses it.
 */
export function SetupLinkDialog({ link, name, onClose }: SetupLinkDialogProps) {
    const { t } = useTranslation();
    const { toast } = useToast();

    const copy = async () => {
        if (!link) return;
        try {
            await navigator.clipboard.writeText(link);
            toast({ title: t('organization.details.users.setupLink.copied'), variant: 'success' });
        } catch {
            toast({ title: t('organization.details.users.setupLink.copyFailed'), variant: 'error' });
        }
    };

    return (
        <Dialog open={link !== null} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-[460px] gap-0 rounded-[18px] border-[#E9E9EE] p-0 dark:border-[#2E2E36] dark:bg-[#1C1C21]">
                <DialogHeader className="flex-row items-center gap-[13px] space-y-0 px-6 pt-6 text-left">
                    <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[12px] bg-[#F3EAFB] text-[#7E3FB4] dark:bg-[#33204A] dark:text-[#C9A6E6]">
                        <KeyRound size={20} aria-hidden="true" />
                    </div>
                    <DialogTitle className="text-[17px] font-extrabold tracking-[-0.01em] text-[#1B1B1F] dark:text-[#F2F2F5]">
                        {t('organization.details.users.setupLink.title')}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-[14px] px-6 py-5">
                    <DialogDescription className="text-[13.5px] text-[#6B6B76] dark:text-[#A0A0AC]">
                        {t('organization.details.users.setupLink.description', { name })}
                    </DialogDescription>
                    <input
                        readOnly
                        value={link ?? ''}
                        aria-label={t('organization.details.users.setupLink.linkLabel')}
                        onFocus={(event) => event.target.select()}
                        className="w-full rounded-[10px] border border-[#E9E9EE] bg-[#F7F7F9] px-3 py-2 font-mono text-[12.5px] text-[#1B1B1F] dark:border-[#2E2E36] dark:bg-[#26262D] dark:text-[#F2F2F5]"
                    />
                </div>

                <div className="flex justify-end gap-2.5 border-t border-[#E9E9EE] px-6 py-4 dark:border-[#2E2E36]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center rounded-full px-4 py-[9px] text-[13.5px] font-bold text-[#6B6B76] transition-colors hover:bg-[#F1F1F4] hover:text-[#1B1B1F] dark:text-[#A0A0AC] dark:hover:bg-[#26262D] dark:hover:text-[#F2F2F5]"
                    >
                        {t('common.close')}
                    </button>
                    <button
                        type="button"
                        onClick={copy}
                        className="inline-flex items-center gap-2 rounded-full bg-[#9955CC] px-5 py-[10px] text-[14px] font-bold text-white shadow-[0_1px_2px_rgba(120,60,180,0.25)] transition-colors hover:bg-[#7E3FB4] dark:shadow-none dark:hover:bg-[#AE73DC]"
                    >
                        <Copy size={16} aria-hidden="true" />
                        {t('organization.details.users.setupLink.copy')}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
