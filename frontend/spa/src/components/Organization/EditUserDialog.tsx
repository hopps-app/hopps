import { zodResolver } from '@hookform/resolvers/zod';
import type { OrganizationMemberResponse } from '@hopps/api-client';
import { Pencil } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import Button from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import TextField from '@/components/ui/TextField';

export type EditUserValues = {
    firstName: string;
    lastName: string;
    email: string;
};

type EditUserDialogProps = {
    /** The member to correct; the dialog is open while this is set. */
    member: OrganizationMemberResponse | null;
    onClose: () => void;
    onSubmit: (member: OrganizationMemberResponse, values: EditUserValues) => Promise<void>;
};

/**
 * Dialog for correcting a member's name and, while their invitation is pending, their email address. After their first
 * login the email field is read-only.
 */
export function EditUserDialog({ member, onClose, onSubmit }: EditUserDialogProps) {
    // Keeps the last member while the dialog animates closed, so the content does not empty out on the way.
    const [shown, setShown] = useState(member);
    if (member && member !== shown) setShown(member);
    const contentRef = useRef<HTMLDivElement>(null);

    return (
        <Dialog open={member !== null} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent
                ref={contentRef}
                // Focus the first field with the cursor at the end instead of selecting its text.
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    const input = contentRef.current?.querySelector('input');
                    input?.focus();
                    input?.setSelectionRange(input.value.length, input.value.length);
                }}
                className="max-w-[460px] gap-0 rounded-[18px] border-[#E9E9EE] p-0 [&_input::placeholder]:text-[#9A9AA3] dark:border-[var(--border-soft)] dark:bg-[var(--background-secondary)] dark:[&_input::placeholder]:text-[#6E6E7A]"
            >
                {shown && <EditUserForm key={shown.id} member={shown} onClose={onClose} onSubmit={onSubmit} />}
            </DialogContent>
        </Dialog>
    );
}

/** The form, created per member with its details as initial values. */
function EditUserForm({ member, onClose, onSubmit }: { member: OrganizationMemberResponse; onClose: () => void; onSubmit: EditUserDialogProps['onSubmit'] }) {
    const { t } = useTranslation();
    const emailLocked = member.status === 'ACTIVE';

    const schema = useMemo(
        () =>
            z.object({
                firstName: z.string().trim().min(1, t('organization.details.users.add.firstNameRequired')),
                lastName: z.string().trim().min(1, t('organization.details.users.add.lastNameRequired')),
                email: z.string().trim().email(t('organization.details.users.add.emailInvalid')),
            }),
        [t]
    );

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<EditUserValues>({
        resolver: zodResolver(schema),
        defaultValues: { firstName: member.firstName ?? '', lastName: member.lastName ?? '', email: member.email ?? '' },
    });

    const submit = handleSubmit(async (values) => {
        try {
            await onSubmit(member, values);
            onClose();
        } catch {
            // The caller surfaces the error; keep the dialog open so the input can be corrected.
        }
    });

    return (
        <form onSubmit={submit}>
            <DialogHeader className="flex-row items-center gap-[13px] space-y-0 px-6 pt-6 text-left">
                <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[12px] bg-[#F3EAFB] text-[#7E3FB4] dark:bg-[#33204A] dark:text-[#C9A6E6]">
                    <Pencil size={20} aria-hidden="true" />
                </div>
                <div className="flex flex-col gap-[3px]">
                    <DialogTitle className="text-[17px] font-extrabold tracking-[-0.01em] text-[#1B1B1F] dark:text-[#F2F2F5]">
                        {t('organization.details.users.edit.title')}
                    </DialogTitle>
                    <DialogDescription className="text-[13.5px] text-[#6B6B76] dark:text-[#A0A0AC]">
                        {t('organization.details.users.edit.subtitle')}
                    </DialogDescription>
                </div>
            </DialogHeader>

            <fieldset disabled={isSubmitting} className="flex flex-col gap-[14px] px-6 py-5">
                <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
                    <TextField label={t('organization.details.users.add.firstName')} error={errors.firstName?.message} required {...register('firstName')} />
                    <TextField label={t('organization.details.users.add.lastName')} error={errors.lastName?.message} required {...register('lastName')} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <TextField
                        label={t('organization.details.users.email')}
                        error={errors.email?.message}
                        readOnly={emailLocked}
                        required
                        {...register('email')}
                    />
                    <p className="text-[12.5px] leading-snug text-[#6B6B76] dark:text-[#A0A0AC]">
                        {emailLocked ? t('organization.details.users.edit.emailLocked') : t('organization.details.users.edit.emailHint')}
                    </p>
                </div>
            </fieldset>

            <div className="flex justify-end gap-2.5 border-t border-[#E9E9EE] px-6 py-4 dark:border-[var(--border-soft)]">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                    {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? t('common.loading') : t('organization.details.users.edit.submit')}
                </Button>
            </div>
        </form>
    );
}

export default EditUserDialog;
