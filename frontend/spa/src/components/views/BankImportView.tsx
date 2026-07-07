import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { ImportWizard } from '@/components/BankAccounts/ImportWizard';
import { usePageTitle } from '@/hooks/use-page-title';

export function BankImportView() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const accountId = Number(id);
    const navigate = useNavigate();

    usePageTitle(t('bankImport.title'), 'Upload');

    return (
        <div className="flex flex-col gap-6 max-w-xl">
            <button
                type="button"
                onClick={() => navigate('/bank-accounts')}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
                <ArrowLeft className="w-4 h-4" />
                {t('konten.title')}
            </button>

            <div>
                <h1 className="text-2xl font-extrabold">{t('bankImport.title')}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{t('bankImport.wizard.dropSubtitle')}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                <ImportWizard accountId={accountId} onClose={() => navigate(`/bank-accounts/${accountId}`)} />
            </div>
        </div>
    );
}

export default BankImportView;
