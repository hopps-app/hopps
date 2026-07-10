import { useTranslation } from 'react-i18next';

export default function HomeView() {
    const { t } = useTranslation();

    return (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <h1 className="text-2xl font-semibold">{t('home.title')}</h1>
            <p className="text-sm text-grey-800">{t('home.subtitle')}</p>
        </div>
    );
}
