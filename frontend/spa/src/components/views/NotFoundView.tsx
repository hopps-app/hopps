import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import Button from '@/components/ui/Button';

function NotFoundView() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center px-7 py-16 text-center">
            <div className="text-6xl font-bold text-muted-foreground mb-2">404</div>
            <h1 className="text-2xl font-semibold mb-2">{t('notFound.title')}</h1>
            <p className="text-muted-foreground mb-6 max-w-md">{t('notFound.description')}</p>
            <Button variant="default" onClick={() => navigate('/dashboard')}>
                {t('notFound.goHome')}
            </Button>
        </div>
    );
}

export default NotFoundView;
