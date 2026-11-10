import { ApiException, ValidationResult } from '@hopps/api-client';
import type { Ref } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrganizationRegistrationForm } from '@/components/Forms/OrganizationRegistrationForm/OrganizationRegistrationForm';
import apiService from '@/services/ApiService';
import { useStore } from '@/store/store';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';

const { solve, reset, showError } = vi.hoisted(() => ({ solve: vi.fn(), reset: vi.fn(), showError: vi.fn() }));

// The real widget runs a proof of work in Web Workers, which jsdom has not; the form only needs its handle.
vi.mock('@/components/ui/AltchaField', async () => {
    const { useImperativeHandle } = await import('react');
    return {
        AltchaField: ({ ref }: { ref: Ref<{ solve: () => Promise<string | null>; reset: () => void }> }) => {
            useImperativeHandle(ref, () => ({ solve, reset }), []);
            return null;
        },
    };
});

vi.mock('@/services/ApiService', () => ({
    default: { orgService: { organizationPOST: vi.fn() } },
}));

vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ showError, showSuccess: vi.fn() }),
}));

const SPAM_CHECK_FAILED = 'The security check failed. Please try again.';

async function fillInAndSubmit() {
    await userEvent.type(screen.getByLabelText('Organization name'), 'Turnverein Zug');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await userEvent.type(screen.getByLabelText('First name'), 'Maria');
    await userEvent.type(screen.getByLabelText('Last name'), 'Muster');
    await userEvent.type(screen.getByLabelText('Email address'), 'kassier@tv-zug.ch');
    await userEvent.type(screen.getByLabelText('Password'), 'registerPassword1!');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'registerPassword1!');
    await userEvent.click(screen.getByRole('button', { name: 'Register' }));
}

describe('OrganizationRegistrationForm spam check', () => {
    const onSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        useStore.setState({ instance: { tenancy: 'multi', setupRequired: false, organizationName: null } });
    });

    it('sends the solved challenge along with the registration', async () => {
        solve.mockResolvedValue('solved-payload');
        vi.mocked(apiService.orgService.organizationPOST).mockResolvedValue({ slug: 'turnverein-zug' } as never);
        renderWithProviders(<OrganizationRegistrationForm onSuccess={onSuccess} />);

        await fillInAndSubmit();

        expect(apiService.orgService.organizationPOST).toHaveBeenCalledWith(expect.objectContaining({ altcha: 'solved-payload' }));
        expect(onSuccess).toHaveBeenCalled();
    });

    it('does not register when the challenge cannot be solved', async () => {
        solve.mockResolvedValue(null);
        renderWithProviders(<OrganizationRegistrationForm onSuccess={onSuccess} />);

        await fillInAndSubmit();

        expect(apiService.orgService.organizationPOST).not.toHaveBeenCalled();
        expect(showError).toHaveBeenCalledWith(SPAM_CHECK_FAILED);
        expect(onSuccess).not.toHaveBeenCalled();
    });

    it('explains a challenge the server rejected', async () => {
        solve.mockResolvedValue('solved-payload');
        const body = '{"code":"ALTCHA_FAILED","message":"The spam check failed. Solve a new challenge and try again."}';
        vi.mocked(apiService.orgService.organizationPOST).mockRejectedValue(
            new ApiException('Validation of fields failed', 400, body, {}, ValidationResult.fromJS(JSON.parse(body)))
        );
        renderWithProviders(<OrganizationRegistrationForm onSuccess={onSuccess} />);

        await fillInAndSubmit();

        expect(showError).toHaveBeenCalledWith(SPAM_CHECK_FAILED);
        expect(onSuccess).not.toHaveBeenCalled();
    });

    it('turns the spam check off again after a failed registration, since the server used up the solution', async () => {
        solve.mockResolvedValue('solved-payload');
        vi.mocked(apiService.orgService.organizationPOST).mockRejectedValue(
            new ApiException('Email or slug already exists', 409, '{"conflictingFields":["email"]}', {}, null)
        );
        renderWithProviders(<OrganizationRegistrationForm onSuccess={onSuccess} />);

        await fillInAndSubmit();

        expect(showError).toHaveBeenCalledWith('This email address is already registered');
        expect(reset).toHaveBeenCalled();
    });
});
