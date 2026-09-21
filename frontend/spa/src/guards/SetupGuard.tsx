import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useInstance } from '@/hooks/use-instance';

interface SetupGuardProps {
    children: ReactNode;
}

/**
 * Wraps the organization registration page. On the hosted SaaS it is always open; on a single-tenant installation it
 * is the one-time initial setup and disappears once the organization exists — the backend refuses the request
 * anyway, this just keeps people from landing on a form that cannot be submitted.
 */
const SetupGuard: React.FC<SetupGuardProps> = ({ children }) => {
    const { tenancy, setupRequired } = useInstance();

    if (tenancy === 'single' && !setupRequired) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default SetupGuard;
