import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import TextField from '@/components/ui/TextField.tsx';
import Button from '@/components/ui/Button.tsx';

const schema = z.object({
    organizationName: z.string().min(1, 'Organization name is required'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
});

export function OrganizationRegistrationForm() {
    const { t } = useTranslation();
    const { register, handleSubmit, formState } = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
    });
    const errors = formState.errors;

    function onSubmit(data: any) {
        console.log('submit', data);
    }

    console.log(errors);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="">
            <TextField
                label="Organization name"
                {...register('organizationName')}
                // error={errors.organizationName?.message}
            />
            {errors?.organizationName && <p>{errors.organizationName.message}</p>}
            <TextField
                label="Account First Name"
                {...register('firstName')}
                // error={errors.firstName?.message}
            />
            <TextField
                label="Account Last Name"
                {...register('lastName')}
                // error={errors.lastName?.message}
            />
            <TextField
                label="Account email"
                {...register('email')}
                // error={errors.email?.message}
            />

            <Button type="submit">{t('header.register')}</Button>
        </form>
    );
}
