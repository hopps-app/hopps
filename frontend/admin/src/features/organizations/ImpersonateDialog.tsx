import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Stub for impersonation. The Keycloak `impersonation` role exists, but wiring real
 * impersonation is a security feature (Admin API call, audit trail, scope limits) that
 * doesn't exist yet — so this explains rather than acts.
 */
export default function ImpersonateDialog({ name, onClose }: { name: string; onClose: () => void }) {
    const { t } = useTranslation();

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <>
            <div className="scrim" onClick={onClose} />
            <div className="modal p-6" role="dialog" aria-modal="true">
                <h2 className="text-[19px] font-extrabold text-ink">{t('organizations.impersonate.title')}</h2>
                <p className="text-[14px] text-ink-2 mt-2 leading-relaxed">{t('organizations.impersonate.body', { name })}</p>
                <div className="flex justify-end mt-6">
                    <button type="button" className="btn btn--ton" onClick={onClose}>
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </>
    );
}
