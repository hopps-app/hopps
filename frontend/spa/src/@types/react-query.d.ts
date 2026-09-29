import '@tanstack/react-query';

// Typed `meta` for queries and mutations, read by the global handlers in providers/QueryProvider.tsx.
declare module '@tanstack/react-query' {
    interface Register {
        queryMeta: {
            /** Don't show the global error toast for this query. */
            skipGlobalErrorHandler?: boolean;
        };
        mutationMeta: {
            /** i18n key of the error toast title, e.g. "Beleg konnte nicht gespeichert werden". The cause goes below it. */
            errorMessage?: string;
            /** Don't show any error toast; the caller shows the failure itself (e.g. inline). */
            silent?: boolean;
        };
    }
}
