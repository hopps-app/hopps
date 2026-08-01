import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import TextField from '@/components/ui/TextField';

export type NewUserValues = {
    firstName: string;
    lastName: string;
    /** Free text, e.g. "1. Vorsitzende" or "Kassenwart". */
    position: string;
    email: string;
};

type AddUserDialogProps = {
    open: boolean;
    onClose: () => void;
    onSubmit: (values: NewUserValues) => Promise<void>;
};

/**
 * Dialog for giving a person access to the organization in hopps. These are hopps users, not club members — the
 * backend calls the entity Member. Collects the fields that model actually carries; the board function and access
 * level from the design need a backend model first (see issue #751).
 */
export function AddUserDialog({ open, onClose, onSubmit }: AddUserDialogProps) {
    const { t } = useTranslation();

    const schema = useMemo(
        () =>
            z.object({
                firstName: z.string().trim().min(1, t('organization.details.users.add.firstNameRequired')),
                lastName: z.string().trim().min(1, t('organization.details.users.add.lastNameRequired')),
                position: z.string().trim(),
                email: z.string().trim().email(t('organization.details.users.add.emailInvalid')),
            }),
        [t]
    );

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<NewUserValues>({
        resolver: zodResolver(schema),
        defaultValues: { firstName: '', lastName: '', position: '', email: '' },
    });

    // Start from a clean form every time the dialog opens.
    useEffect(() => {
        if (open) reset({ firstName: '', lastName: '', position: '', email: '' });
    }, [open, reset]);

    const submit = handleSubmit(async (values) => {
        await onSubmit(values);
        onClose();
    });

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-[460px] gap-0 rounded-[18px] border-[#E9E9EE] p-0 [&_input::placeholder]:text-[#9A9AA3]">
                <form onSubmit={submit}>
                    <DialogHeader className="flex-row items-center gap-[13px] space-y-0 px-6 pt-6 text-left">
                        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[12px] bg-[#F3EAFB] text-[#7E3FB4]">
                            <UserPlus size={20} aria-hidden="true" />
                        </div>
                        <div className="flex flex-col gap-[3px]">
                            <DialogTitle className="text-[17px] font-extrabold tracking-[-0.01em] text-[#1B1B1F]">
                                {t('organization.details.users.add.title')}
                            </DialogTitle>
                            <DialogDescription className="text-[13.5px] text-[#6B6B76]">{t('organization.details.users.add.subtitle')}</DialogDescription>
                        </div>
                    </DialogHeader>

                    <fieldset disabled={isSubmitting} className="flex flex-col gap-[14px] px-6 py-5">
                        <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
                            <TextField
                                label={t('organization.details.users.add.firstName')}
                                placeholder={t('organization.details.users.add.firstNamePlaceholder')}
                                error={errors.firstName?.message}
                                required
                                {...register('firstName')}
                            />
                            <TextField
                                label={t('organization.details.users.add.lastName')}
                                placeholder={t('organization.details.users.add.lastNamePlaceholder')}
                                error={errors.lastName?.message}
                                required
                                {...register('lastName')}
                            />
                        </div>
                        <TextField
                            label={t('organization.details.users.add.position')}
                            placeholder={t('organization.details.users.add.positionPlaceholder')}
                            error={errors.position?.message}
                            {...register('position')}
                        />
                        <TextField
                            label={t('organization.details.users.email')}
                            placeholder={t('organization.details.placeholder.email')}
                            error={errors.email?.message}
                            required
                            {...register('email')}
                        />
                        <p className="text-[12.5px] leading-snug text-[#6B6B76]">{t('organization.details.users.add.hint')}</p>
                    </fieldset>

                    <div className="flex justify-end gap-2.5 border-t border-[#E9E9EE] px-6 py-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="inline-flex items-center rounded-full px-4 py-[9px] text-[13.5px] font-bold text-[#6B6B76] transition-colors hover:bg-[#F1F1F4] hover:text-[#1B1B1F] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 rounded-full bg-[#9955CC] px-5 py-[10px] text-[14px] font-bold text-white shadow-[0_1px_2px_rgba(120,60,180,0.25)] transition-colors hover:bg-[#7E3FB4] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <UserPlus size={16} aria-hidden="true" />
                            {isSubmitting ? t('common.loading') : t('organization.details.users.add.submit')}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default AddUserDialog;
