import { useEffect, useState } from 'react';
import { Category } from '@hopps/api-client';

import apiService from '@/services/ApiService.ts';

export function useCategories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCategories = async () => {
        setIsLoading(true);
        try {
            const items = await apiService.orgService.categoryAll();
            setCategories(items);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    return { categories, isLoading, refetch: fetchCategories };
}
