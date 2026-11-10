import type { AltchaWidgetElement } from 'altcha/types/generic';
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';

declare module 'react' {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace JSX {
        interface IntrinsicElements {
            'altcha-widget': HTMLAttributes<AltchaWidgetElement> & {
                ref?: Ref<AltchaWidgetElement>;
                auto?: string;
                challenge?: string;
                configuration?: string;
                display?: string;
                language?: string;
                type?: string;
            };
        }
    }
}

export interface AltchaHandle {
    /**
     * The payload for the request: the solution from the switch if it is already on, otherwise a freshly solved one.
     * `null` if solving failed.
     */
    solve: () => Promise<string | null>;
    /** Turns the switch off again. Needed after every request, because the server accepts a solution only once. */
    reset: () => void;
}

const CHALLENGE_URL = `${import.meta.env.VITE_API_ORG_URL}/public/altcha/challenge`;

// humanInteractionSignature: otherwise the widget records mouse and scroll behavior, which only ALTCHA Sentinel uses,
// and we do not run it.
const CONFIGURATION = JSON.stringify({ humanInteractionSignature: false });

/** How long a submit waits for the widget to load before it gives up. */
const LOAD_TIMEOUT_MS = 20_000;

// The widget's own translations for the languages hopps offers. Its registry calls French "fr-fr".
const LANGUAGES: Record<string, string> = { de: 'de', en: 'en', fr: 'fr-fr', it: 'it', uk: 'uk' };

type AltchaRegistry = { i18n: Map<string, Record<string, string>> };

let widgetLoaded: Promise<void> | undefined;

/** Loads the widget and its translations once, before the first widget is rendered, so it starts in the right language. */
function loadWidget(): Promise<void> {
    widgetLoaded ??= import('altcha')
        .then(() =>
            Promise.all([import('altcha/i18n/de'), import('altcha/i18n/en'), import('altcha/i18n/fr-fr'), import('altcha/i18n/it'), import('altcha/i18n/uk')])
        )
        .then(() => {
            // German texts in hopps address nobody directly (see locales/__tests__/de-address.test.ts); the widget's own
            // messages say "Sie". The other texts it can show here ("Ich bin kein Roboter", "Überprüft", …) are fine.
            const registry = (globalThis as unknown as { $altcha: AltchaRegistry }).$altcha.i18n;
            registry.set('de', {
                ...registry.get('de'),
                error: 'Überprüfung fehlgeschlagen. Bitte später erneut versuchen.',
                expired: 'Überprüfung abgelaufen. Bitte erneut versuchen.',
            });
        });
    return widgetLoaded;
}

function timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => setTimeout(() => reject(new Error('ALTCHA widget did not load')), ms));
}

/**
 * ALTCHA spam check ("I'm not a robot" switch): a proof of work in the browser, no cookies, no third party. Switching it
 * on solves the challenge right away; if someone submits without doing so, the form solves it on submit instead.
 */
export function AltchaField({ ref }: { ref: Ref<AltchaHandle> }) {
    const { i18n } = useTranslation();
    const language = LANGUAGES[(i18n.resolvedLanguage ?? i18n.language ?? 'de').split('-')[0]] ?? 'en';

    const [loaded, setLoaded] = useState(false);
    const widget = useRef<AltchaWidgetElement | null>(null);
    const payload = useRef<string | null>(null);
    const mounted = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null);
    if (mounted.current == null) {
        let resolve!: () => void;
        mounted.current = { promise: new Promise<void>((r) => (resolve = r)), resolve };
    }

    useEffect(() => {
        let active = true;
        void loadWidget().then(() => active && setLoaded(true));
        return () => {
            active = false;
        };
    }, []);

    // A ref callback instead of useEffect: `load` fires right after mounting and would be over by the time an effect
    // runs.
    const attach = useCallback((element: AltchaWidgetElement | null) => {
        widget.current = element;
        if (!element) return;
        element.addEventListener('load', () => mounted.current?.resolve(), { once: true });
        element.addEventListener('statechange', (event) => {
            const detail = (event as CustomEvent<{ state: string; payload?: string | null }>).detail;
            payload.current = detail.state === 'verified' ? (detail.payload ?? null) : null;
        });
    }, []);

    useImperativeHandle(
        ref,
        () => ({
            solve: async () => {
                try {
                    await Promise.race([mounted.current?.promise, timeout(LOAD_TIMEOUT_MS)]);
                    const element = widget.current;
                    if (!element) return null;
                    // The State enum's values are these strings; the enum itself only exists as a type declaration.
                    const state = element.getState() as string;
                    if (payload.current && state === 'verified') return payload.current;
                    // Expired or failed before: start over from the unchecked switch.
                    if (state !== 'unverified') element.reset();
                    const result = await element.verify();
                    return result?.payload ?? null;
                } catch {
                    return null;
                }
            },
            reset: () => {
                payload.current = null;
                widget.current?.reset();
            },
        }),
        []
    );

    if (!loaded) {
        // Holds the widget's height while it loads, so the buttons below do not jump.
        return <div className="h-[86px]" aria-hidden="true" />;
    }
    return <altcha-widget ref={attach} auto="off" challenge={CHALLENGE_URL} configuration={CONFIGURATION} language={language} type="switch" />;
}
