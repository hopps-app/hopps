import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Hook that warns users when navigating away from a page with unsaved changes.
 *
 * Handles two scenarios:
 * 1. Browser tab close / page refresh → beforeunload event
 * 2. In-app navigation (sidebar links, etc.) → click interception on anchor/link elements
 *
 * Note: This app uses BrowserRouter which doesn't support useBlocker/usePrompt.
 * We use a global click listener approach instead.
 *
 * @param isDirty - Whether the form has unsaved changes
 */
export function useUnsavedChangesWarning(isDirty: boolean) {
    const { t } = useTranslation();
    const isDirtyRef = useRef(isDirty);

    // Keep ref in sync
    useEffect(() => {
        isDirtyRef.current = isDirty;
    }, [isDirty]);

    // Handle browser close / refresh via beforeunload
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (isDirtyRef.current) {
                event.preventDefault();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    // Handle in-app navigation by intercepting clicks on links
    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            if (!isDirtyRef.current) return;

            // Find the closest anchor element or element with navigation behavior
            const target = event.target as HTMLElement;
            const anchor = target.closest('a[href]');
            const navItem = target.closest('[class*="cursor-pointer"]');

            // Check if this is a navigation link within the app
            if (anchor) {
                const href = anchor.getAttribute('href');
                if (href && href.startsWith('/') && href !== window.location.pathname) {
                    const message = t('common.unsavedChangesWarning');
                    if (!window.confirm(message)) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                }
            }

            // Check sidebar navigation items (they use onClick, not href)
            if (navItem) {
                const sidebar = navItem.closest('nav, [role="complementary"]');
                if (sidebar) {
                    // This is a sidebar navigation item
                    const message = t('common.unsavedChangesWarning');
                    if (!window.confirm(message)) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                }
            }
        };

        document.addEventListener('click', handleClick, true); // capture phase
        return () => {
            document.removeEventListener('click', handleClick, true);
        };
    }, [t]);

    // Handle browser back/forward buttons
    useEffect(() => {
        const handlePopState = () => {
            if (isDirtyRef.current) {
                const message = t('common.unsavedChangesWarning');
                if (!window.confirm(message)) {
                    // Push current URL back to prevent navigation
                    window.history.pushState(null, '', window.location.href);
                }
            }
        };

        // Push an entry so we can intercept back button
        if (isDirty) {
            window.history.pushState(null, '', window.location.href);
        }

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [isDirty, t]);
}
