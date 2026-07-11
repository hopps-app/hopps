import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type DeleteDialogProps = {
    /** The name the user must type verbatim to enable deletion. */
    confirmText: string;
    busy: boolean;
    onConfirm: () => void;
    onClose: () => void;
};

/**
 * Type-to-confirm guard for an irreversible, cascading delete: the Löschen button
 * stays disabled until the user types the Verein's name exactly.
 */
export default function DeleteDialog({ confirmText, busy, onConfirm, onClose }: DeleteDialogProps) {
    const { t } = useTranslation();
    const [typed, setTyped] = useState('');
    const matches = typed.trim() === confirmText;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, busy]);

    return (
        <>
            <div className="scrim" onClick={() => !busy && onClose()} />
            <div className="modal p-6" role="dialog" aria-modal="true">
                <h2 className="text-[19px] font-extrabold text-ink">{t('organizations.delete.title')}</h2>
                <p className="text-[14px] text-ink-2 mt-2 leading-relaxed">{t('organizations.delete.warning')}</p>

                <label className="block text-[13px] font-semibold text-ink mt-5 mb-2">
                    {t('organizations.delete.prompt', { name: confirmText })}
                </label>
                <input
                    className="input"
                    value={typed}
                    autoFocus
                    disabled={busy}
                    placeholder={confirmText}
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && matches && !busy && onConfirm()}
                />

                <div className="flex items-center justify-end gap-2.5 mt-6">
                    <button type="button" className="btn btn--ton" disabled={busy} onClick={onClose}>
                        {t('common.cancel')}
                    </button>
                    <button type="button" className="btn btn--danger-solid" disabled={!matches || busy} onClick={onConfirm}>
                        {busy ? t('organizations.delete.deleting') : t('organizations.delete.confirm')}
                    </button>
                </div>
            </div>
        </>
    );
}
