import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import LegalFooter from '@/components/common/LegalFooter/LegalFooter';
import { LoadingState } from '@/components/common/LoadingState';
import { useLegalConfig } from '@/hooks/use-legal-config';
import { fetchLegalContent, type LegalPageKey } from '@/services/legal/legalService';

type ViewStatus = 'loading' | 'ready' | 'notConfigured' | 'error';

interface LegalViewProps {
    page: LegalPageKey;
    titleKey: string;
}

/**
 * Renders an operator-configured legal page (Impressum / Datenschutzerklärung).
 * `inline` content is fetched from the hosting server and rendered here; `url`
 * pages are opened externally from the footer, so reaching this view for a `url`
 * page redirects to that URL. When nothing is configured a hint is shown.
 */
export function LegalView({ page, titleKey }: LegalViewProps) {
    const { t } = useTranslation();
    const { config, loaded } = useLegalConfig();
    const pageConfig = config[page];
    const [content, setContent] = useState<string | null>(null);
    const [fetchFailed, setFetchFailed] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (!loaded) return;

        if (pageConfig.mode === 'url' && pageConfig.url) {
            // The page lives elsewhere — send the visitor straight there.
            window.location.replace(pageConfig.url);
            return;
        }
        if (pageConfig.mode !== 'inline') return;

        let active = true;
        fetchLegalContent(page)
            .then((text) => {
                if (active) setContent(text);
            })
            .catch(() => {
                if (active) setFetchFailed(true);
            });
        return () => {
            active = false;
        };
    }, [loaded, page, pageConfig.mode, pageConfig.url]);

    let status: ViewStatus;
    if (!loaded || pageConfig.mode === 'url') {
        status = 'loading'; // still resolving config, or redirecting to the external URL
    } else if (pageConfig.mode !== 'inline') {
        status = 'notConfigured';
    } else if (fetchFailed) {
        status = 'error';
    } else if (content !== null) {
        status = 'ready';
    } else {
        status = 'loading';
    }

    // Operator HTML may be a full document; render it isolated in an iframe.
    // sandbox="allow-same-origin" (WITHOUT allow-scripts) disables any script in
    // the content while still letting us read its height to size the frame.
    const handleIframeLoad = () => {
        const doc = iframeRef.current?.contentDocument;
        if (doc?.body) {
            iframeRef.current!.style.height = `${doc.body.scrollHeight + 32}px`;
        }
    };

    return (
        <div className="flex min-h-screen flex-col">
            <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">
                <div className="mb-8 flex items-center justify-between">
                    <Link to="/">
                        <img src="/logo3.svg" alt="hopps" className="h-8 w-auto" />
                    </Link>
                    <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {t('legal.backHome')}
                    </Link>
                </div>
                <h1 className="mb-8 text-2xl font-semibold">{t(titleKey)}</h1>

                {status === 'loading' && <LoadingState className="py-12" />}

                {status === 'ready' && pageConfig.format === 'html' && content !== null && (
                    <iframe
                        ref={iframeRef}
                        title={t(titleKey)}
                        srcDoc={content}
                        sandbox="allow-same-origin"
                        onLoad={handleIframeLoad}
                        className="w-full border-0"
                    />
                )}

                {status === 'ready' && pageConfig.format !== 'html' && content !== null && (
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">{content}</pre>
                )}

                {status === 'notConfigured' && <p className="text-muted-foreground">{t('legal.notConfigured')}</p>}

                {status === 'error' && <p className="text-muted-foreground">{t('legal.loadError')}</p>}
            </div>
            <LegalFooter />
        </div>
    );
}

export default LegalView;
