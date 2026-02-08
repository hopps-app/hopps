import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

interface QueryProviderProps {
    children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 5 * 60 * 1000, // 5 minutes
                        gcTime: 10 * 60 * 1000, // 10 minutes (garbage collection)
                        retry: 1,
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
