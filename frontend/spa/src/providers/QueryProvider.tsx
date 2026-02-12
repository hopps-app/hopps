import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
                    onError: (error, _variables, _context, mutation) => {
                        // Skip global handler if mutation has its own onError
                        if (mutation.options.onError) return;

                        const message = getUserFriendlyErrorMessage(error);
                        console.error('Mutation error:', error);

                        toast({
                            title: message,
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
