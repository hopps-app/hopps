import { zodResolver } from '@hookform/resolvers/zod';
import { CategoryInput, Category } from '@hopps/api-client';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import TextArea from '@/components/ui/Textarea';
import TextField from '@/components/ui/TextField';
import { useToast } from '@/hooks/use-toast.ts';
import apiService from '@/services/ApiService.ts';

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
        name: z.string().min(1, t('categories.form.error.name')).max(127, t('categories.form.error.nameMaxLength')),
        description: z.string().max(500).optional().nullable(),
    });

    type FormFields = z.infer<typeof CategorySchema>;

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<FormFields>({
        resolver: zodResolver(CategorySchema),
        defaultValues: initialData,
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
        } catch (error: unknown) {
            console.error('Error saving category:', error);
            const httpError = error as { status?: number; response?: string };
            if (
                httpError.status === 409 ||
                httpError.response?.includes('duplicate') ||
                httpError.response?.includes('already exists')
            ) {
                setError('name', {
                    type: 'manual',
                    message: t('categories.form.error.duplicate'),
                });
            } else {
                showError(t('categories.form.error.categoryCreated'));
            }
        }
    }

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)} id="category-form" className="mt-4 flex flex-col gap-4">
                <TextField
                    label={t('categories.form.name')}
                    {...register('name')}
                    error={errors.name?.message}
                    maxLength={127}
                />
                <TextArea label={t('categories.form.description')} {...register('description')} error={errors.description?.message} />
            </form>
        </>
    );
}
