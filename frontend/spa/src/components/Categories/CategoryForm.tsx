import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CategoryInput } from '@hopps/api-client';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/hooks/use-toast.ts';
import TextArea from '@/components/ui/Textarea';
import TextField from '@/components/ui/TextField';
import apiService from '@/services/ApiService.ts';

export interface Category {
    id?: number;
    name: string;
    description?: string | null;
}

type Props = {
    initialData?: Category;
    onSuccess?: () => void; // Reset editing state on any success
    isEdit?: boolean;
};

export default function CategoryForm({ onSuccess, initialData, isEdit = false }: Props) {
    const { t } = useTranslation();
    const { showError, showSuccess } = useToast();

    const CategorySchema = z.object({
        id: z.number().optional(),
        name: z.string().min(1, t('categories.form.error.name')).max(120),
        description: z.string().max(500).optional().nullable(),
    });

    type FormFields = z.infer<typeof CategorySchema>;

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormFields>({
        resolver: zodResolver(CategorySchema),
        defaultValues: {
            id: initialData?.id,
            name: initialData?.name,
            description: initialData?.description,
        },
    });

    async function onSubmit(data: FormFields) {
        try {
            if (isEdit && data.id) {
                await apiService.orgService.categoryPUT(data.id, CategoryInput.fromJS(data));
            } else {
                await apiService.orgService.categoryPOST(CategoryInput.fromJS(data));
            }
            showSuccess(t('categories.form.success.categoryCreated'));
            onSuccess?.();
        } catch (error) {
            console.error('Error saving category:', error);
            showError(t('categories.form.error.categoryCreated'));
        }
    }

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)} id="category-form" className="mt-4 flex flex-col gap-4">
                <TextField label={t('categories.form.name')} {...register('name')} error={errors.name?.message} />
                <TextArea label={t('categories.form.description')} {...register('description')} error={errors.description?.message} />
            </form>
        </>
    );
}
