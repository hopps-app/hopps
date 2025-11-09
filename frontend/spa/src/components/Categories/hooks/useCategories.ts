import { useEffect, useState } from 'react';
import { Category } from '@hopps/api-client';

import apiService from '@/services/ApiService.ts';

export function useCategories() {
    const [categories, setCategories] = useState<Category[]>([]);

    const fetchCategories = async () => {
        try {
            const items = await apiService.orgService.categoryAll();
            setCategories(items);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    return { categories, refetch: fetchCategories };
}
