import { useTranslation } from 'react-i18next';

function DashboardView() {
    const { t } = useTranslation();

    return (
        <>
            <h1 className="text-3xl font-bold mb-6">{t('dashboard.title', 'Dashboard')}</h1>
        </>
    );
}

export default DashboardView;
