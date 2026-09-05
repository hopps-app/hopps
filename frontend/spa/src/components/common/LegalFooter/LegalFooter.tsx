import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useLegalConfig } from '@/hooks/use-legal-config';
import type { LegalPageConfig } from '@/services/legal/legalService';

const LINK_CLASS = 'hover:text-foreground transition-colors';

function LegalLink({ config, route, label }: { config: LegalPageConfig; route: string; label: string }) {
    if (config.mode === 'url' && config.url) {
        return (
            <a href={config.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                {label}
            </a>
        );
    }
    return (
        <Link to={route} className={LINK_CLASS}>
            {label}
        </Link>
    );
}

/**
 * Footer linking to the Impressum / Datenschutzerklärung. Both entries are shown
 * only when the operator has configured them (via env URL or a mounted file);
 * otherwise nothing is rendered. See docker/node/server.js for the config source.
 */
export function LegalFooter({ className = '' }: { className?: string }) {
    const { t } = useTranslation();
    const { config, loaded } = useLegalConfig();

    if (!loaded) return null;

    const showImprint = config.imprint.mode !== 'none';
    const showPrivacy = config.privacy.mode !== 'none';
    if (!showImprint && !showPrivacy) return null;

    return (
        <footer className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-4 text-sm text-muted-foreground ${className}`}>
            {showImprint && <LegalLink config={config.imprint} route="/impressum" label={t('legal.imprint')} />}
            {showImprint && showPrivacy && <span aria-hidden="true">·</span>}
            {showPrivacy && <LegalLink config={config.privacy} route="/datenschutz" label={t('legal.privacy')} />}
        </footer>
    );
}

export default LegalFooter;
