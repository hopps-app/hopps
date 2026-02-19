import { useTranslation } from 'react-i18next';

import { useStore } from '@/store/store';

function WarningBanner({ title, description }: { title: string; description: string }) {
    return (
        <div role="alert" className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
            </svg>
            <div>
                <p className="text-sm font-medium text-yellow-800">{title}</p>
                <p className="text-sm text-yellow-700">{description}</p>
            </div>
        </div>
    );
}

export function ConnectivityBanner() {
    const { t } = useTranslation();
    const { keycloakReachable, backendReachable } = useStore();

    if (keycloakReachable !== false && backendReachable !== false) {
        return null;
    }

    return (
        <div className="w-full max-w-xl mb-4">
            {keycloakReachable === false && <WarningBanner title={t('connectivity.keycloak.title')} description={t('connectivity.keycloak.description')} />}
            {backendReachable === false && <WarningBanner title={t('connectivity.backend.title')} description={t('connectivity.backend.description')} />}
        </div>
    );
}

export default ConnectivityBanner;
