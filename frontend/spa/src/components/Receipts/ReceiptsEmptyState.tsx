import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import BunnyIcon from './BunnyIcon';
import Button from '@/components/ui/Button';

const ReceiptsEmptyState = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const handleUploadClick = () => {
        navigate('/receipts/new');
    };

    return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="bg-white rounded-[30px] p-8 max-w-2xl w-full flex flex-col items-center">
                <BunnyIcon className="mb-6" />
                <h3 className="text-lg font-semibold text-black mb-2">
                    {t('receipts.emptyState.title')}
                </h3>
                <p className="text-sm text-black text-center mb-6">
                    {t('receipts.emptyState.description')}
                </p>
                <Button onClick={handleUploadClick} icon="Plus" variant="secondary">
                    {t('receipts.emptyState.action')}
                </Button>
            </div>
        </div>
    );
};

export default ReceiptsEmptyState;
