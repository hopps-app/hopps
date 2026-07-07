import { OrganizationInput } from '@hopps/api-client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import apiService from '@/services/ApiService';
import authService from '@/services/auth/auth.service';
import { useStore } from '@/store/store';
import { getErrorStatus } from '@/utils/errorUtils';

/** Turns an organization name into a URL-safe slug (lowercase, ascii, hyphen-separated). */
function createSlug(input: string): string {
    return input
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '') // strip combining diacritics (ä→a, é→e, …)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function OrganizationErrorView() {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed || submitting) return;

        setSubmitting(true);
        setError(null);
        try {
            const organisation = await apiService.orgService.myPOST(
                OrganizationInput.fromJS({
                    name: trimmed,
                    slug: createSlug(trimmed),
                    type: 'EINGETRAGENER_VEREIN',
                })
            );
            // The organization is now linked to the user — leave the error screen and enter the app.
            useStore.getState().setOrganization(organisation);
            useStore.getState().setOrganizationError(false);
        } catch (err) {
            console.error('Failed to create organization:', err);
            // 409 = the generated slug (i.e. the name) is already taken.
            setError(getErrorStatus(err) === 409 ? t('organization.create.slugConflict') : t('organization.create.error'));
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white shadow-lg rounded-[30px] p-8">
                <div className="mb-6 text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
                        <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('organization.create.title')}</h1>
                    <p className="text-gray-600 text-sm">{t('organization.create.description')}</p>
                </div>

                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="text-left">
                        <label htmlFor="org-name" className="block text-[11px] font-bold uppercase tracking-[0.06em] text-gray-500 mb-1.5">
                            {t('organization.create.nameLabel')}
                        </label>
                        <input
                            id="org-name"
                            type="text"
                            value={name}
                            onChange={(ev) => {
                                setName(ev.target.value);
                                setError(null);
                            }}
                            placeholder={t('organization.create.namePlaceholder')}
                            autoFocus
                            className="w-full rounded-[10px] border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        />
                        {error && <p className="mt-1.5 text-[13px] text-red-600">{error}</p>}
                    </div>

                    <Button type="submit" variant="default" disabled={!name.trim() || submitting} className="w-full">
                        {submitting ? '…' : t('organization.create.submit')}
                    </Button>
                </form>

                <button type="button" onClick={handleLogout} className="mt-4 w-full text-sm text-gray-500 hover:text-gray-800 transition-colors">
                    {t('header.logout')}
                </button>
            </div>
        </div>
    );
}

export default OrganizationErrorView;
