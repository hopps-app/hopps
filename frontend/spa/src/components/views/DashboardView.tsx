import { useTranslation } from 'react-i18next';

function DashboardView() {
    const { t } = useTranslation();

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">{t('dashboard.title', 'Dashboard')}</h1>
        </div>
    );
}

export default DashboardView;
