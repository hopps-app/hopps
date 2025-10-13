import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import TextArea from '@/components/ui/Textarea';
import TextField from '@/components/ui/TextField';

export interface Category {
    id: string;
    name: string;
    number?: string | null;
    description?: string | null;
}

export const CategorySchema = z.object({
    id: z.string().uuid().optional(), // new rows have no id yet
    name: z.string().min(1, 'Name ist erforderlich').max(120),
    number: z
        .string()
        .regex(/^\d{0,6}$/, 'Nur Ziffern erlaubt')
        .optional()
        .nullable(),
    description: z.string().max(500).optional().nullable(),
});

type CategoryInput = z.infer<typeof CategorySchema>;

type Props = { onSuccess?: () => void };

function CategoryForm({ onSuccess }: Props) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<CategoryInput>({
        resolver: zodResolver(CategorySchema),
        defaultValues: {},
    });

    function onSubmit(data: CategoryInput) {
        console.log('Form submitted:', data);
        // Handle form submission logic here

        onSuccess?.();
    }

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)} id="category-form" className="mt-4 flex flex-col gap-4">
                <TextField label="Name" {...register('name')} error={errors.name?.message} />
                <TextField label="Number" {...register('number')} error={errors.number?.message} />
                <TextArea label="Description" id="description" {...register('description')} error={errors.description?.message} />
            </form>
        </>
    );
}

export default CategoryForm;
