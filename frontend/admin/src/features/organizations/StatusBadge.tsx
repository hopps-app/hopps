import { useTranslation } from 'react-i18next';

import { STATUS_TONE, type OrgStatus } from './status';

/** Klar pill badge for a Verein's derived activity status. */
export default function StatusBadge({ status }: { status: OrgStatus }) {
    const { t } = useTranslation();
    return <span className={`badge badge--${STATUS_TONE[status]}`}>{t(`organizations.status.${status}`)}</span>;
}
