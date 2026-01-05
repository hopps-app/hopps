import { useTranslation } from 'react-i18next';

function DashboardView() {
    const { t } = useTranslation();

    return (
        <div className="px-7 py-[2.5rem]">
            <h1 className="text-3xl font-bold mb-6">{t('dashboard.title', 'Dashboard')}</h1>
        </div>
    );
}

export default DashboardView;
