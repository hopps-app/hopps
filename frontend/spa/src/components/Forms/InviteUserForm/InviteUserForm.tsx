import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import Button from '@/components/ui/Button';
import TextField from '@/components/ui/TextField';
import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/ApiService';
import { useStore } from '@/store/store';

const schema = z.object({
    email: z.string().email('Invalid email address'),
});

type FormFields = z.infer<typeof schema>;

type Props = {
    onSuccess: () => void;
    onCancel: () => void;
};

export function InviteUserForm({ onSuccess, onCancel }: Props) {
    const { t } = useTranslation();
    const { showError, showSuccess } = useToast();
    const organization = useStore((state) => state.organization);

    const { register, handleSubmit, formState } = useForm<FormFields>({
        mode: 'onBlur',
        resolver: zodResolver(schema),
    });
    const errors = formState.errors;

    async function onSubmit(data: FormFields) {
        if (!organization?.slug) return;

        try {
            await apiService.organization.inviteUser(organization.slug, {
                email: data.email,
            });

            showSuccess(t('userManagement.inviteSuccess'));
            onSuccess();
        } catch (e) {
            console.error(e);
            showError(t('userManagement.inviteFailed'));
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <h2 className="text-lg font-semibold">{t('userManagement.inviteUserDialog.inviteUser')}</h2>

            <TextField label={t('userManagement.inviteUserDialog.email')} {...register('email')} error={errors.email?.message} />

            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                    {t('common.cancel')}
                </Button>
                <Button type="submit">{t('userManagement.inviteUserDialog.sendInvitation')}</Button>
            </div>
        </form>
    );
}
