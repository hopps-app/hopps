import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Confirmation before assuming a member's identity.
 *
 * The warning is not boilerplate: impersonating replaces the administrator's own Keycloak session in this
 * browser, so they are logged out of their admin account and have to sign back in afterwards. That is
 * surprising enough that it has to be said before the click, not discovered after it.
 */
export default function ImpersonateDialog({
    name,
    busy,
    error,
    onConfirm,
    onClose,
}: {
    name: string;
    busy: boolean;
    error: string | null;
    onConfirm: () => void;
    onClose: () => void;
}) {
    const { t } = useTranslation();

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, busy]);

    return (
        <>
            <div className="scrim" onClick={() => !busy && onClose()} />
            <div className="modal p-6" role="dialog" aria-modal="true">
                <h2 className="text-[19px] font-extrabold text-ink">{t('organizations.impersonate.title')}</h2>
                <p className="text-[14px] text-ink-2 mt-2 leading-relaxed">{t('organizations.impersonate.body', { name })}</p>

                <div className="flex items-start gap-2.5 mt-4 rounded-xl p-3" style={{ background: 'var(--warn-bg)', color: 'var(--warn)' }}>
                    <AlertTriangle size={17} className="shrink-0 mt-0.5" />
                    <p className="text-[13px] font-semibold leading-relaxed">{t('organizations.impersonate.warning')}</p>
                </div>

                {error && (
                    <p className="text-[13px] font-semibold mt-3" style={{ color: 'var(--neg-ink)' }}>
                        {error}
                    </p>
                )}

                <div className="flex justify-end gap-2.5 mt-6">
                    <button type="button" className="btn btn--ton" disabled={busy} onClick={onClose}>
                        {t('common.cancel')}
                    </button>
                    <button type="button" className="btn btn--brand" disabled={busy} onClick={onConfirm}>
                        {busy ? t('organizations.impersonate.starting') : t('organizations.impersonate.action')}
                    </button>
                </div>
            </div>
        </>
    );
}
