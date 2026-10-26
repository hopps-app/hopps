import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from 'i18next';
import { ReactNode, useState } from 'react';

import { toast } from '@/hooks/use-toast';
import { getUserFriendlyErrorMessage, isNetworkError } from '@/utils/errorUtils';

interface QueryProviderProps {
    children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                queryCache: new QueryCache({
                    onError: (error, query) => {
                        // Only show toast for errors where no specific error handling exists
                        // (i.e., queries that don't have their own onError handler)
                        // We skip the toast if the query has meta.skipGlobalErrorHandler set
                        if (query.meta?.skipGlobalErrorHandler) return;

                        const message = getUserFriendlyErrorMessage(error);
                        console.error('Query error:', error);

                        if (isNetworkError(error)) {
                            toast({
                                title: message,
                                variant: 'error',
                            });
                        }
                        // For non-network query errors, we generally show inline errors
                        // rather than toast, so we don't toast here for all queries
                    },
                }),
                mutationCache: new MutationCache({
                    // One error toast per failed mutation. The hook names the action in `meta.errorMessage` (title), the
                    // cause goes below it; without it the cause is the title. Components don't toast mutation errors.
                    onError: (error, _variables, _context, mutation) => {
                        console.error('Mutation error:', error);
                        // Skip global handler if mutation has its own onError, or handles the failure itself
                        if (mutation.options.onError || mutation.meta?.silent) return;

                        const cause = getUserFriendlyErrorMessage(error);
                        const errorKey = mutation.meta?.errorMessage;
                        toast({
                            title: errorKey ? i18n.t(errorKey) : cause,
                            description: errorKey ? cause : undefined,
                            variant: 'error',
                        });
                    },
                }),
                defaultOptions: {
                    queries: {
                        staleTime: 5 * 60 * 1000, // 5 minutes
                        gcTime: 10 * 60 * 1000, // 10 minutes (garbage collection)
                        retry: (failureCount, error) => {
                            // Don't retry on 4xx errors (client errors)
                            if (error && typeof error === 'object' && 'response' in error) {
                                const response = error.response as { status?: number } | undefined;
                                if (response?.status && response.status >= 400 && response.status < 500) {
                                    return false;
                                }
                            }
                            // Retry up to 1 time for network/server errors
                            return failureCount < 1;
                        },
                        refetchOnWindowFocus: false,
                    },
                    mutations: {
                        retry: 0,
                    },
                },
            })
    );

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export default QueryProvider;
