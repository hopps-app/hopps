import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

/** The mounted forms that report their unsaved changes — read by useGuardedNavigate. */
const dirtyForms = new Set<() => boolean>();

/** True while any mounted form has unsaved changes. */
export function hasUnsavedChanges(): boolean {
    return [...dirtyForms].some((isDirty) => isDirty());
}

/**
 * navigate() that asks before it leaves a form with unsaved changes, and does nothing if the user
 * declines. Needed wherever navigation runs from code instead of a link — the sidebar entries are
 * buttons calling navigate(), which no click interception can recognize as navigation.
 *
 * @returns whether the navigation happened
 */
export function useGuardedNavigate(): (to: string) => boolean {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return useCallback(
        (to: string) => {
            if (hasUnsavedChanges() && !window.confirm(t('common.unsavedChangesWarning'))) return false;
            navigate(to);
            return true;
        },
        [navigate, t]
    );
}

/**
 * Hook that warns users when navigating away from a page with unsaved changes.
 *
 * Handles three scenarios:
 * 1. Browser tab close / page refresh → beforeunload event
 * 2. In-app navigation (sidebar links, etc.) → click interception on anchor/link elements
 * 3. Navigation triggered from code → useGuardedNavigate reads the registration below
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

    // Announce the form for as long as it is mounted, so navigation elsewhere can ask about it
    useEffect(() => {
        const isDirtyNow = () => isDirtyRef.current;
        dirtyForms.add(isDirtyNow);
        return () => {
            dirtyForms.delete(isDirtyNow);
        };
    }, []);

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
