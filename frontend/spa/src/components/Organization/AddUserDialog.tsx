import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { type AssignableRole, ASSIGNABLE_ROLES, roleSelectItems } from '@/components/Organization/roles';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import Select from '@/components/ui/Select';
import TextField from '@/components/ui/TextField';

export type NewUserValues = {
    firstName: string;
    lastName: string;
    role: AssignableRole;
    email: string;
};

const EMPTY_VALUES: NewUserValues = { firstName: '', lastName: '', role: 'TREASURER', email: '' };

type AddUserDialogProps = {
    open: boolean;
    /** Whether the owner role can be chosen, which only owners may hand out. For anyone else it is shown but locked. */
    canManageOwners?: boolean;
    onClose: () => void;
    onSubmit: (values: NewUserValues) => Promise<void>;
};

/**
 * Dialog for giving a person access to the organization in hopps. These are hopps users, not club members; the
 * backend calls the entity Member. Whoever invites picks the person's role, which decides what they may do (issue #959).
 */
export function AddUserDialog({ open, canManageOwners = false, onClose, onSubmit }: AddUserDialogProps) {
    const { t } = useTranslation();
    const roleItems = useMemo(() => roleSelectItems(t, canManageOwners), [t, canManageOwners]);

    const schema = useMemo(
        () =>
            z.object({
                firstName: z.string().trim().min(1, t('organization.details.users.add.firstNameRequired')),
                lastName: z.string().trim().min(1, t('organization.details.users.add.lastNameRequired')),
                // Only owners may hand out the owner role (the backend refuses it for anyone else as well).
                role: z.enum(ASSIGNABLE_ROLES).refine((role) => role !== 'OWNER' || canManageOwners),
                email: z.string().trim().email(t('organization.details.users.add.emailInvalid')),
            }),
        [t, canManageOwners]
    );

    const {
        register,
        control,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<NewUserValues>({
        resolver: zodResolver(schema),
        defaultValues: EMPTY_VALUES,
    });

    // Start from a clean form every time the dialog opens.
    useEffect(() => {
        if (open) reset(EMPTY_VALUES);
    }, [open, reset]);

    const submit = handleSubmit(async (values) => {
        try {
            await onSubmit(values);
            onClose();
        } catch {
            // The caller surfaces the error; keep the dialog open so the input can be corrected.
        }
    });

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-[460px] gap-0 rounded-[18px] border-[#E9E9EE] p-0 [&_input::placeholder]:text-[#9A9AA3] dark:border-[var(--border-soft)] dark:bg-[var(--background-secondary)] dark:[&_input::placeholder]:text-[#6E6E7A]">
                <form onSubmit={submit}>
                    <DialogHeader className="flex-row items-center gap-[13px] space-y-0 px-6 pt-6 text-left">
                        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[12px] bg-[#F3EAFB] text-[#7E3FB4] dark:bg-[#33204A] dark:text-[#C9A6E6]">
                            <UserPlus size={20} aria-hidden="true" />
                        </div>
                        <div className="flex flex-col gap-[3px]">
                            <DialogTitle className="text-[17px] font-extrabold tracking-[-0.01em] text-[#1B1B1F] dark:text-[#F2F2F5]">
                                {t('organization.details.users.add.title')}
                            </DialogTitle>
                            <DialogDescription className="text-[13.5px] text-[#6B6B76] dark:text-[#A0A0AC]">
                                {t('organization.details.users.add.subtitle')}
                            </DialogDescription>
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
                            label={t('organization.details.users.email')}
                            placeholder={t('organization.details.placeholder.email')}
                            error={errors.email?.message}
                            required
                            {...register('email')}
                        />
                        <Controller
                            control={control}
                            name="role"
                            render={({ field }) => (
                                <div className="flex flex-col gap-2">
                                    <Select
                                        label={t('organization.details.users.add.role')}
                                        value={field.value}
                                        items={roleItems}
                                        onValueChanged={field.onChange}
                                        openDownwards
                                    />
                                    {/* The description of the chosen role, so the list stays short however many roles there are. */}
                                    <p className="text-[13px] leading-snug text-[#6B6B76] dark:text-[#A0A0AC]">
                                        {t(`organization.details.users.roles.${field.value}.description`)}
                                    </p>
                                </div>
                            )}
                        />
                    </fieldset>

                    <div className="flex justify-end gap-2.5 border-t border-[#E9E9EE] px-6 py-4 dark:border-[var(--border-soft)]">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="inline-flex items-center rounded-[var(--btn-radius)] px-4 py-[9px] text-[13.5px] font-bold text-[#6B6B76] transition-colors hover:bg-[#F1F1F4] hover:text-[#1B1B1F] dark:text-[#A0A0AC] dark:hover:bg-[var(--surface-track)] dark:hover:text-[#F2F2F5] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 rounded-[var(--btn-radius)] bg-[#9955CC] px-5 py-[10px] text-[14px] font-bold text-white shadow-[0_1px_2px_rgba(120,60,180,0.25)] transition-colors hover:bg-[#7E3FB4] dark:shadow-none dark:hover:bg-[#AE73DC] disabled:cursor-not-allowed disabled:opacity-50"
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
