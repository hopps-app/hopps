import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DesktopSidebar from '../desktop-sidebar';

import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';

vi.mock('@/services/auth/auth.service.ts', () => ({
    default: { logout: vi.fn().mockResolvedValue(undefined) },
}));

/** Stands in for a page holding a form with unsaved changes, e.g. the organization details. */
function DirtyForm() {
    useUnsavedChangesWarning(true);
    return null;
}

function CurrentPath() {
    return <span data-testid="path">{useLocation().pathname}</span>;
}

function renderSidebar(withUnsavedChanges: boolean) {
    renderWithProviders(
        <>
            {withUnsavedChanges && <DirtyForm />}
            <DesktopSidebar collapsed={false} onToggle={vi.fn()} />
            <CurrentPath />
        </>
    );
}

describe('DesktopSidebar navigation', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        window.history.replaceState(null, '', '/admin/ngo-details');
    });

    it('asks before leaving a page with unsaved changes and stays put when the user declines', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
        renderSidebar(true);

        await userEvent.click(screen.getByText('Receipts'));

        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('path')).toHaveTextContent('/admin/ngo-details');
    });

    it('navigates once the user confirms', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        renderSidebar(true);

        await userEvent.click(screen.getByText('Receipts'));

        expect(screen.getByTestId('path')).toHaveTextContent('/receipts');
    });

    it('does not ask when there is nothing unsaved', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
        renderSidebar(false);

        await userEvent.click(screen.getByText('Receipts'));

        expect(confirmSpy).not.toHaveBeenCalled();
        expect(screen.getByTestId('path')).toHaveTextContent('/receipts');
    });
});
